-- Stage 1 finance database contract tests.
-- Run only after applying 20261106020000_stage1_finance_engine.sql to a disposable
-- local Supabase database. This file does not apply migrations or create business fixtures.
-- Execution: supabase test db
--
-- Important scope:
-- * These tests verify schema/RPC contract and the database permission boundary.
-- * They do NOT simulate a real checkout, elapsed 48-hour hold, payout settlement,
--   or partial/full return. Those require deterministic tenant/order/shipment/return
--   fixtures and must be added to the CI fixture harness before claiming behavioral QA.
-- * The Stage 1 RPCs are service_role-only. Cross-tenant user attempts are expected
--   to fail at EXECUTE privilege enforcement; Worker tenant/object authorization
--   still requires separate integration tests.

begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(37);

-- Schema contract.
select extensions.ok(
  exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='wallets'
      and column_name='outstanding_adjustment_balance'),
  'wallets has outstanding_adjustment_balance'
);
select extensions.ok(
  exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='order_item_commissions'
      and column_name='commission_status')
  and exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='order_item_commissions'
      and column_name='hold_period_hours_snapshot')
  and exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='order_item_commissions'
      and column_name='reversed_amount'),
  'commission snapshot has lifecycle, hold-period and reversal fields'
);
select extensions.ok(
  exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='wallet_transactions'
      and column_name='entry_direction')
  and exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='wallet_transactions'
      and column_name='balance_bucket')
  and exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='wallet_transactions'
      and column_name='related_transaction_id')
  and exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='wallet_transactions'
      and column_name='order_item_commission_id')
  and exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='wallet_transactions'
      and column_name='payout_request_id')
  and exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='wallet_transactions'
      and column_name='return_request_id')
  and exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='wallet_transactions'
      and column_name='entry_version'),
  'wallet_transactions has Stage 1 ledger metadata and entry_version'
);
select extensions.ok(
  exists(select 1 from pg_constraint
    where conrelid='public.wallet_transactions'::regclass
      and conname='wallet_transactions_entry_version_check'),
  'entry_version enforces legacy v1 NULLs and directional v2 rows'
);
select extensions.ok(
  exists(select 1 from pg_trigger
    where tgrelid='public.wallet_transactions'::regclass
      and tgname='wallet_transactions_append_only_guard' and not tgisinternal),
  'wallet_transactions append-only trigger exists'
);

-- Auto-netting contract: debt is reduced before any residual is credited to available.
select extensions.ok(
  position('least(v_wallet.outstanding_adjustment_balance,c.commission_total)' in
    lower(pg_get_functiondef('public.release_commission_to_available(uuid)'::regprocedure))) > 0,
  'release function caps debt netting at outstanding debt and commission amount'
);
select extensions.ok(
  position('automatic outstanding adjustment repayment' in
    lower(pg_get_functiondef('public.release_commission_to_available(uuid)'::regprocedure))) > 0
  and position('commission became available after debt netting' in
    lower(pg_get_functiondef('public.release_commission_to_available(uuid)'::regprocedure))) > 0,
  'release function writes debt-repayment and residual-available ledger legs'
);

-- Exercise the same database trigger function used by wallet_transactions.
-- A temporary probe avoids depending on business fixtures in the disposable test DB.
create temporary table ledger_append_only_probe(id integer primary key, amount integer not null);
insert into ledger_append_only_probe values (1, 100);
create trigger ledger_append_only_probe_guard
before update or delete on ledger_append_only_probe
for each row execute function public.reject_wallet_transaction_mutation();
select extensions.throws_ok(
  $update pg_temp.ledger_append_only_probe set amount=200 where id=1$,
  '55000', 'wallet_transactions_append_only',
  'append-only trigger function rejects UPDATE'
);
select extensions.throws_ok(
  $delete from pg_temp.ledger_append_only_probe where id=1$,
  '55000', 'wallet_transactions_append_only',
  'append-only trigger function rejects DELETE'
);

-- RPC existence and privilege contract.
select extensions.ok(to_regprocedure('public.release_due_commissions(uuid)') is not null,
  'release_due_commissions(uuid) exists');
select extensions.ok(to_regprocedure('public.create_payout_request(uuid,uuid,numeric,text,text,text,text)') is not null,
  'create_payout_request(...) exists');
select extensions.ok(to_regprocedure('public.approve_payout_request(uuid,text)') is not null,
  'approve_payout_request(uuid,text) exists');
select extensions.ok(to_regprocedure('public.reverse_released_commission(uuid,uuid,integer,text)') is not null,
  'reverse_released_commission(...) exists');
select extensions.ok(to_regprocedure('public.release_commission_to_available(uuid)') is not null,
  'release_commission_to_available(uuid) exists');
select extensions.ok(to_regprocedure('public.unlock_failed_payout(uuid,text,text)') is not null,
  'unlock_failed_payout(...) exists');
select extensions.ok(to_regprocedure('public.reverse_pending_commission(uuid,text)') is not null,
  'reverse_pending_commission(...) exists');

select extensions.ok(not has_function_privilege('authenticated','public.release_due_commissions(uuid)','EXECUTE'),
  'authenticated cannot execute release_due_commissions');
select extensions.ok(not has_function_privilege('authenticated','public.create_payout_request(uuid,uuid,numeric,text,text,text,text)','EXECUTE'),
  'authenticated cannot execute create_payout_request');
select extensions.ok(not has_function_privilege('authenticated','public.approve_payout_request(uuid,text)','EXECUTE'),
  'authenticated cannot execute approve_payout_request');
select extensions.ok(not has_function_privilege('authenticated','public.reverse_released_commission(uuid,uuid,integer,text)','EXECUTE'),
  'authenticated cannot execute reverse_released_commission');
select extensions.ok(not has_function_privilege('authenticated','public.release_commission_to_available(uuid)','EXECUTE'),
  'authenticated cannot execute release_commission_to_available');
select extensions.ok(not has_function_privilege('authenticated','public.unlock_failed_payout(uuid,text,text)','EXECUTE'),
  'authenticated cannot execute unlock_failed_payout');
select extensions.ok(not has_function_privilege('authenticated','public.reverse_pending_commission(uuid,text)','EXECUTE'),
  'authenticated cannot execute reverse_pending_commission');

select extensions.ok(has_function_privilege('service_role','public.release_due_commissions(uuid)','EXECUTE'),
  'service_role can execute release_due_commissions');
select extensions.ok(has_function_privilege('service_role','public.create_payout_request(uuid,uuid,numeric,text,text,text,text)','EXECUTE'),
  'service_role can execute create_payout_request');
select extensions.ok(has_function_privilege('service_role','public.approve_payout_request(uuid,text)','EXECUTE'),
  'service_role can execute approve_payout_request');
select extensions.ok(has_function_privilege('service_role','public.reverse_released_commission(uuid,uuid,integer,text)','EXECUTE'),
  'service_role can execute reverse_released_commission');
select extensions.ok(has_function_privilege('service_role','public.release_commission_to_available(uuid)','EXECUTE'),
  'service_role can execute release_commission_to_available');
select extensions.ok(has_function_privilege('service_role','public.unlock_failed_payout(uuid,text,text)','EXECUTE'),
  'service_role can execute unlock_failed_payout');
select extensions.ok(has_function_privilege('service_role','public.reverse_pending_commission(uuid,text)','EXECUTE'),
  'service_role can execute reverse_pending_commission');

-- Adversarial cross-tenant attempt:
-- Tenant B's authenticated user supplies Tenant A object IDs/tenant context.
-- Since the RPCs are backend-only, every direct call must fail with SQLSTATE 42501
-- before any Tenant A wallet, commission, payout or return object can be touched.
set local role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated","tenant_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}',true);

select extensions.throws_ok(
  $$select public.release_due_commissions('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$,
  '42501', null,
  'Tenant B user cannot invoke Tenant A commission release RPC'
);
select extensions.throws_ok(
  $$select public.create_payout_request(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
    10,'Test Bank','000000','Tenant B','cross-tenant-test-key-0001')$$,
  '42501', null,
  'Tenant B user cannot invoke payout RPC against Tenant A tenant context'
);
select extensions.throws_ok(
  $$select public.approve_payout_request(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'BANK-REF-TEST')$$,
  '42501', null,
  'Tenant B user cannot approve a Tenant A payout'
);
select extensions.throws_ok(
  $$select public.reverse_released_commission(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    1,'cross-tenant-reversal-key-0001')$$,
  '42501', null,
  'Tenant B user cannot reverse a Tenant A commission'
);
select extensions.throws_ok(
  $$select public.release_commission_to_available('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$,
  '42501', null,
  'Tenant B user cannot call commission release helper'
);
select extensions.throws_ok(
  $$select public.unlock_failed_payout(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'FAIL-REF','cross-tenant-unlock-key-0001')$$,
  '42501', null,
  'Tenant B user cannot unlock a Tenant A payout'
);
select extensions.throws_ok(
  $$select public.reverse_pending_commission(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'cross-tenant-pending-key-0001')$$,
  '42501', null,
  'Tenant B user cannot reverse a Tenant A pending commission'
);

reset role;

select * from extensions.finish();
rollback;
