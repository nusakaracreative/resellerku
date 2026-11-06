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

select plan(20);

-- Schema contract.
select ok(
  exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='wallets'
      and column_name='outstanding_adjustment_balance'),
  'wallets has outstanding_adjustment_balance'
);
select ok(
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
select ok(
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
      and column_name='return_request_id'),
  'wallet_transactions has Stage 1 ledger metadata columns'
);
select ok(
  exists(select 1 from pg_constraint
    where conrelid='public.wallet_transactions'::regclass
      and conname='wallet_transactions_direction_bucket_pair_check'),
  'legacy-compatible ledger NULL-pair CHECK exists'
);

-- RPC existence and privilege contract.
select ok(to_regprocedure('public.release_due_commissions(uuid)') is not null,
  'release_due_commissions(uuid) exists');
select ok(to_regprocedure('public.create_payout_request(uuid,uuid,numeric,text,text,text,text)') is not null,
  'create_payout_request(...) exists');
select ok(to_regprocedure('public.approve_payout_request(uuid,text)') is not null,
  'approve_payout_request(uuid,text) exists');
select ok(to_regprocedure('public.reverse_released_commission(uuid,uuid,integer,text)') is not null,
  'reverse_released_commission(...) exists');

select ok(not has_function_privilege('authenticated','public.release_due_commissions(uuid)','EXECUTE'),
  'authenticated cannot execute release_due_commissions');
select ok(not has_function_privilege('authenticated','public.create_payout_request(uuid,uuid,numeric,text,text,text,text)','EXECUTE'),
  'authenticated cannot execute create_payout_request');
select ok(not has_function_privilege('authenticated','public.approve_payout_request(uuid,text)','EXECUTE'),
  'authenticated cannot execute approve_payout_request');
select ok(not has_function_privilege('authenticated','public.reverse_released_commission(uuid,uuid,integer,text)','EXECUTE'),
  'authenticated cannot execute reverse_released_commission');

select ok(has_function_privilege('service_role','public.release_due_commissions(uuid)','EXECUTE'),
  'service_role can execute release_due_commissions');
select ok(has_function_privilege('service_role','public.create_payout_request(uuid,uuid,numeric,text,text,text,text)','EXECUTE'),
  'service_role can execute create_payout_request');
select ok(has_function_privilege('service_role','public.approve_payout_request(uuid,text)','EXECUTE'),
  'service_role can execute approve_payout_request');
select ok(has_function_privilege('service_role','public.reverse_released_commission(uuid,uuid,integer,text)','EXECUTE'),
  'service_role can execute reverse_released_commission');

-- Adversarial cross-tenant attempt:
-- Tenant B's authenticated user supplies Tenant A object IDs/tenant context.
-- Since the RPCs are backend-only, every direct call must fail with SQLSTATE 42501
-- before any Tenant A wallet, commission, payout or return object can be touched.
set local role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated","tenant_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}',true);

select throws_ok(
  $$select public.release_due_commissions('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$,
  '42501', null,
  'Tenant B user cannot invoke Tenant A commission release RPC'
);
select throws_ok(
  $$select public.create_payout_request(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
    10,'Test Bank','000000','Tenant B','cross-tenant-test-key-0001')$$,
  '42501', null,
  'Tenant B user cannot invoke payout RPC against Tenant A tenant context'
);
select throws_ok(
  $$select public.approve_payout_request(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'BANK-REF-TEST')$$,
  '42501', null,
  'Tenant B user cannot approve a Tenant A payout'
);
select throws_ok(
  $$select public.reverse_released_commission(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    1,'cross-tenant-reversal-key-0001')$$,
  '42501', null,
  'Tenant B user cannot reverse a Tenant A commission'
);

reset role;

select * from finish();
rollback;
