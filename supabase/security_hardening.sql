-- Additional hardening for project-level automatic RLS event trigger.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- Cover all foreign keys to avoid child-table scans during joins/deletes.
create index if not exists assets_uploaded_by_idx on public.assets(uploaded_by);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index if not exists order_items_product_tenant_idx on public.order_items(tenant_id, product_id);
create index if not exists orders_receipt_verified_by_idx on public.orders(receipt_verified_by);
create index if not exists payout_requests_reviewed_by_idx on public.payout_requests(reviewed_by);
create index if not exists payout_requests_wallet_tenant_user_idx on public.payout_requests(tenant_id, wallet_id, user_id);
create index if not exists products_created_by_idx on public.products(created_by);
create index if not exists tenants_created_by_idx on public.tenants(created_by);
create index if not exists wallet_transactions_order_tenant_idx on public.wallet_transactions(tenant_id, order_id);
create index if not exists wallet_transactions_wallet_tenant_user_idx on public.wallet_transactions(tenant_id, wallet_id, user_id);
