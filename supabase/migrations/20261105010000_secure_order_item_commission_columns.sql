-- Buyers may still read their order lines, but commission values are not
-- exposed by the shared authenticated role. Owner/reseller reads use the
-- restricted order_item_commissions table and its row-level policy.
begin;

revoke select on public.order_items from anon, authenticated;

grant select (
  id,
  tenant_id,
  order_id,
  product_id,
  product_name_snapshot,
  sku_snapshot,
  tier_snapshot,
  quantity,
  unit_price,
  line_total,
  created_at,
  variant_id,
  variant_options_snapshot
) on public.order_items to authenticated;

-- Explicitly retain service-role access for trusted checkout and backend work.
grant all privileges on public.order_items to service_role;

commit;
