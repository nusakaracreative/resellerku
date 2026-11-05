-- Atomically create a reseller payout request and hold the requested wallet funds.
-- Client roles may read wallet history, but all financial writes flow through this RPC.
begin;

revoke insert, update, delete on public.wallets from anon, authenticated;
revoke insert, update, delete on public.wallet_transactions from anon, authenticated;
revoke insert, update, delete on public.payout_requests from anon, authenticated;

grant select on public.wallets, public.wallet_transactions, public.payout_requests to authenticated;

drop policy if exists payouts_insert_self on public.payout_requests;

create or replace function public.request_reseller_payout(
  p_tenant_id uuid,
  p_wallet_id uuid,
  p_amount numeric,
  p_bank_name text,
  p_bank_account_number text,
  p_bank_account_name text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_available_balance numeric(14,2);
  v_payout_id uuid;
  v_existing_transaction public.wallet_transactions%rowtype;
  v_existing_payout_id uuid;
  v_idempotency_key text;
  v_now timestamptz;
begin
  -- Authentication and basic input validation.
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_tenant_id is null or p_wallet_id is null then
    raise exception 'invalid_payout_request' using errcode = '22023';
  end if;

  if p_amount is null
     or p_amount <= 0
     or p_amount > 999999999999.99
     or p_amount <> pg_catalog.round(p_amount, 2) then
    raise exception 'invalid_payout_amount' using errcode = '22023';
  end if;

  if p_bank_name is null
     or pg_catalog.btrim(p_bank_name) = ''
     or pg_catalog.length(pg_catalog.btrim(p_bank_name)) > 120
     or p_bank_account_number is null
     or pg_catalog.btrim(p_bank_account_number) = ''
     or pg_catalog.length(pg_catalog.btrim(p_bank_account_number)) > 80
     or p_bank_account_name is null
     or pg_catalog.btrim(p_bank_account_name) = ''
     or pg_catalog.length(pg_catalog.btrim(p_bank_account_name)) > 120 then
    raise exception 'invalid_payout_bank_details' using errcode = '22023';
  end if;

  if p_idempotency_key is null
     or pg_catalog.length(pg_catalog.btrim(p_idempotency_key)) < 12
     or pg_catalog.length(pg_catalog.btrim(p_idempotency_key)) > 120 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  v_idempotency_key := pg_catalog.btrim(p_idempotency_key);

  -- Only an active reseller membership may request a payout in this tenant.
  if not exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = v_user_id
      and tm.role = 'reseller'
      and tm.is_active = true
  ) then
    raise exception 'reseller_membership_inactive' using errcode = '42501';
  end if;

  -- Fast idempotent replay path. The existing request must match the complete
  -- financial payload, including the payout destination, not only the amount.
  select wt.*
    into v_existing_transaction
  from public.wallet_transactions wt
  where wt.tenant_id = p_tenant_id
    and wt.idempotency_key = v_idempotency_key;

  if found then
    if v_existing_transaction.transaction_type <> 'payout_hold'
       or v_existing_transaction.status <> 'posted'
       or v_existing_transaction.wallet_id <> p_wallet_id
       or v_existing_transaction.user_id <> v_user_id
       or v_existing_transaction.amount <> p_amount then
      raise exception 'idempotency_key_conflict' using errcode = 'P0001';
    end if;

    select pr.id
      into v_existing_payout_id
    from public.payout_requests pr
    where pr.id::text = v_existing_transaction.metadata ->> 'payout_request_id'
      and pr.tenant_id = p_tenant_id
      and pr.wallet_id = p_wallet_id
      and pr.user_id = v_user_id
      and pr.amount = p_amount
      and pr.bank_name = pg_catalog.btrim(p_bank_name)
      and pr.bank_account_number = pg_catalog.btrim(p_bank_account_number)
      and pr.bank_account_name = pg_catalog.btrim(p_bank_account_name);

    if not found then
      raise exception 'idempotency_key_conflict' using errcode = 'P0001';
    end if;

    return v_existing_payout_id;
  end if;

  -- Everything inside this block is one subtransaction. If a concurrent
  -- request wins the unique idempotency key, all local balance/payout writes
  -- are rolled back before the winning payout is returned.
  begin
    -- Serialize all balance mutations for this wallet.
    select w.available_balance
      into v_available_balance
    from public.wallets w
    where w.id = p_wallet_id
      and w.tenant_id = p_tenant_id
      and w.user_id = v_user_id
    for update;

    if not found then
      raise exception 'wallet_not_found' using errcode = 'P0002';
    end if;

    -- Re-check after acquiring the wallet lock. This handles duplicate calls
    -- that waited for the first request to commit.
    select wt.*
      into v_existing_transaction
    from public.wallet_transactions wt
    where wt.tenant_id = p_tenant_id
      and wt.idempotency_key = v_idempotency_key;

    if found then
      if v_existing_transaction.transaction_type <> 'payout_hold'
         or v_existing_transaction.status <> 'posted'
         or v_existing_transaction.wallet_id <> p_wallet_id
         or v_existing_transaction.user_id <> v_user_id
         or v_existing_transaction.amount <> p_amount then
        raise exception 'idempotency_key_conflict' using errcode = 'P0001';
      end if;

      select pr.id
        into v_existing_payout_id
      from public.payout_requests pr
      where pr.id::text = v_existing_transaction.metadata ->> 'payout_request_id'
        and pr.tenant_id = p_tenant_id
        and pr.wallet_id = p_wallet_id
        and pr.user_id = v_user_id
        and pr.amount = p_amount
        and pr.bank_name = pg_catalog.btrim(p_bank_name)
        and pr.bank_account_number = pg_catalog.btrim(p_bank_account_number)
        and pr.bank_account_name = pg_catalog.btrim(p_bank_account_name);

      if not found then
        raise exception 'idempotency_key_conflict' using errcode = 'P0001';
      end if;

      return v_existing_payout_id;
    end if;

    if v_available_balance < p_amount then
      raise exception 'insufficient_balance' using errcode = 'P0003';
    end if;

    v_now := pg_catalog.clock_timestamp();

    -- Move available funds into the payout hold in the same transaction.
    update public.wallets
    set available_balance = available_balance - p_amount,
        locked_balance = locked_balance + p_amount,
        updated_at = v_now
    where id = p_wallet_id
      and tenant_id = p_tenant_id
      and user_id = v_user_id;

    insert into public.payout_requests (
      tenant_id,
      user_id,
      wallet_id,
      amount,
      bank_name,
      bank_account_number,
      bank_account_name
    ) values (
      p_tenant_id,
      v_user_id,
      p_wallet_id,
      p_amount,
      pg_catalog.btrim(p_bank_name),
      pg_catalog.btrim(p_bank_account_number),
      pg_catalog.btrim(p_bank_account_name)
    )
    returning id into v_payout_id;

    -- posted_at is mandatory for every posted ledger row in this schema.
    insert into public.wallet_transactions (
      tenant_id,
      wallet_id,
      user_id,
      transaction_type,
      status,
      amount,
      description,
      idempotency_key,
      metadata,
      posted_at
    ) values (
      p_tenant_id,
      p_wallet_id,
      v_user_id,
      'payout_hold',
      'posted',
      p_amount,
      'Reseller payout request hold',
      v_idempotency_key,
      pg_catalog.jsonb_build_object('payout_request_id', v_payout_id::text),
      v_now
    );

    insert into public.audit_logs (
      tenant_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      details
    ) values (
      p_tenant_id,
      v_user_id,
      'reseller_payout_requested',
      'payout_request',
      v_payout_id,
      pg_catalog.jsonb_build_object(
        'wallet_id', p_wallet_id,
        'amount', p_amount
      )
    );

  exception
    when unique_violation then
      -- A concurrent call may have used this key against another wallet.
      -- The subtransaction above has rolled back its balance and payout writes.
      select wt.*
        into v_existing_transaction
      from public.wallet_transactions wt
      where wt.tenant_id = p_tenant_id
        and wt.idempotency_key = v_idempotency_key;

      if not found then
        raise;
      end if;

      if v_existing_transaction.transaction_type = 'payout_hold'
         and v_existing_transaction.status = 'posted'
         and v_existing_transaction.wallet_id = p_wallet_id
         and v_existing_transaction.user_id = v_user_id
         and v_existing_transaction.amount = p_amount then

        select pr.id
          into v_existing_payout_id
        from public.payout_requests pr
        where pr.id::text = v_existing_transaction.metadata ->> 'payout_request_id'
          and pr.tenant_id = p_tenant_id
          and pr.wallet_id = p_wallet_id
          and pr.user_id = v_user_id
          and pr.amount = p_amount
          and pr.bank_name = pg_catalog.btrim(p_bank_name)
          and pr.bank_account_number = pg_catalog.btrim(p_bank_account_number)
          and pr.bank_account_name = pg_catalog.btrim(p_bank_account_name);

        if found then
          return v_existing_payout_id;
        end if;
      end if;

      raise exception 'idempotency_key_conflict' using errcode = 'P0001';
  end;

  return v_payout_id;
end;
$function$;

-- A SECURITY DEFINER function in the exposed public schema must not inherit
-- PostgreSQL's default PUBLIC execute grant. Only authenticated callers may
-- invoke it; auth.uid() and the active reseller membership are checked above.
revoke all on function public.request_reseller_payout(
  uuid, uuid, numeric, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.request_reseller_payout(
  uuid, uuid, numeric, text, text, text, text
) to authenticated;

comment on function public.request_reseller_payout(
  uuid, uuid, numeric, text, text, text, text
) is
  'Atomically holds an active reseller wallet balance and creates an idempotent payout request. Client-side direct table writes are revoked.';

commit;
