-- Product catalog fields needed for shipping calculations and clearly marked demo records.
alter table public.products
  add column if not exists weight_grams integer not null default 0
    check (weight_grams >= 0),
  add column if not exists is_demo_data boolean not null default false;

comment on column public.products.base_price is
  'Base unit cost / HPP in tenant currency. This field is not the tier selling price.';
comment on column public.products.weight_grams is
  'Gross packaged unit weight in grams, used by shipping calculations.';
comment on column public.products.is_demo_data is
  'True for synthetic demonstration records; exclude from real financial/business reporting.';
comment on column public.product_tier_prices.selling_price is
  'Suggested retail selling price per unit for this reseller tier.';
comment on column public.product_tier_prices.commission_amount is
  'Reseller commission per unit, released only after the order meets the commission release rules.';
