-- Resellerku Demo Store product seed.
-- Safe to run more than once. All figures are synthetic demo values.
-- Tenant and product IDs match the internal demo environment.

begin;

insert into public.products (
  id, tenant_id, sku, name, description, base_price,
  weight_grams, is_demo_data, stock_quantity, reserved_quantity,
  status, created_by
)
values (
  '1b17ffcc-e027-49d8-a852-b628f761e076',
  '88e5d45b-248d-475c-8ae6-8faaa356bc07',
  'KPK-150',
  'Kripik Pedas Kekinian 150 g',
  'DATA DEMO — Kemasan pouch 150 gram. Kripik renyah berbumbu pedas kekinian. HPP simulasi Rp7.500/unit. Harga jual tier dan komisi merupakan angka simulasi untuk uji katalog, checkout, dan wallet; bukan penawaran harga komersial.',
  7500,
  150,
  true,
  100,
  0,
  'active',
  '339c5454-20a9-43a0-985c-149284eaff9e'
)
on conflict (id) do update
set
  sku = excluded.sku,
  name = excluded.name,
  description = excluded.description,
  base_price = excluded.base_price,
  weight_grams = excluded.weight_grams,
  is_demo_data = excluded.is_demo_data,
  stock_quantity = excluded.stock_quantity,
  reserved_quantity = excluded.reserved_quantity,
  status = excluded.status,
  updated_at = now();

insert into public.product_tier_prices (
  tenant_id, product_id, tier, selling_price, commission_amount
)
values
  ('88e5d45b-248d-475c-8ae6-8faaa356bc07','1b17ffcc-e027-49d8-a852-b628f761e076','dropshipper',20000,3000),
  ('88e5d45b-248d-475c-8ae6-8faaa356bc07','1b17ffcc-e027-49d8-a852-b628f761e076','agen',19000,3500),
  ('88e5d45b-248d-475c-8ae6-8faaa356bc07','1b17ffcc-e027-49d8-a852-b628f761e076','distributor',18000,4000)
on conflict (product_id, tier) do update
set
  tenant_id = excluded.tenant_id,
  selling_price = excluded.selling_price,
  commission_amount = excluded.commission_amount,
  updated_at = now();

commit;
