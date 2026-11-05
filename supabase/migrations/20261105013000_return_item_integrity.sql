begin;
create unique index if not exists return_items_one_line_per_order_item_idx on public.return_items(tenant_id,return_request_id,order_item_id);
drop policy if exists return_items_customer_insert on public.return_items;
create policy return_items_customer_insert on public.return_items for insert to authenticated with check (exists (select 1 from public.return_requests r join public.orders o on o.tenant_id=r.tenant_id and o.id=r.order_id join public.order_items oi on oi.tenant_id=o.tenant_id and oi.order_id=o.id where r.tenant_id=return_items.tenant_id and r.id=return_items.return_request_id and r.requested_by=(select auth.uid()) and r.status='requested' and oi.id=return_items.order_item_id and oi.quantity>=return_items.quantity));
commit;