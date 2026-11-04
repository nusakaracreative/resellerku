-- Operational integrity controls: wallets are provisioned by the database;
-- payout and membership deletion are backend-controlled to preserve ledger consistency.

revoke delete on public.tenant_memberships from authenticated;
drop policy if exists memberships_delete_self_or_tenant_owner on public.tenant_memberships;

revoke insert on public.payout_requests from authenticated;
drop policy if exists payouts_insert_self on public.payout_requests;

create or replace function private.handle_reseller_wallet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'reseller' and new.is_active = true then
    insert into public.wallets (tenant_id, user_id)
    values (new.tenant_id, new.user_id)
    on conflict (tenant_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.handle_reseller_wallet() from public, anon, authenticated;
drop trigger if exists tenant_memberships_provision_wallet on public.tenant_memberships;
create trigger tenant_memberships_provision_wallet
after insert or update on public.tenant_memberships
for each row execute function private.handle_reseller_wallet();
