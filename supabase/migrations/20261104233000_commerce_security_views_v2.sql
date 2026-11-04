-- Resellerku Commerce Security v2
-- Separate HPP storage from customer/reseller-readable catalogue fields.
begin;

create table if not exists public.product_costs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null,
  base_cost numeric(14,2) not null default 0 check (base_cost >= 0),
  currency_code char(3) not null default 'IDR',
  updated_at timestamptz not null default now(),
  unique (tenant_id, product_id),
  foreign key (tenant_id, product_id) references public.products(tenant_id,id) on delete cascade
);

insert into public.product_costs(tenant_id,product_id,base_cost,currency_code)
select p.tenant_id,p.id,p.base_price,t.currency_code
from public.products p
join public.tenants t on t.id=p.tenant_id
on conflict (tenant_id,product_id) do update
set base_cost=excluded.base_cost, currency_code=excluded.currency_code, updated_at=now();

alter table public.product_costs enable row level security;
drop policy if exists product_costs_owner_manage on public.product_costs;
create policy product_costs_owner_manage on public.product_costs
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop trigger if exists product_costs_prevent_tenant_reassignment on public.product_costs;
create trigger product_costs_prevent_tenant_reassignment
before update on public.product_costs
for each row execute function private.prevent_tenant_reassignment();

create index if not exists product_costs_tenant_product_idx on public.product_costs(tenant_id,product_id);

-- The old products.base_price remains for compatibility with existing trusted code,
-- but no browser role may select it. New Owner code reads product_costs through the view.
revoke all on public.products from anon, authenticated;
grant select (id,tenant_id,sku,name,description,image_url,weight_grams,status,is_demo_data)
  on public.products to anon;
grant select (id,tenant_id,sku,name,description,image_url,weight_grams,status,is_demo_data,
              stock_quantity,reserved_quantity,created_by,created_at,updated_at)
  on public.products to authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists products_public_storefront_read on public.products;
create policy products_public_storefront_read on public.products
for select to anon using (
  status = 'active' and is_demo_data = false
  and exists (
    select 1 from public.storefront_settings s
    where s.tenant_id = products.tenant_id and s.status = 'published'
  )
);

-- Resellers may read only the safe catalogue fields through normal product reads.
-- Existing products_select_member remains tenant-scoped; column grants exclude HPP.
drop view if exists public.owner_product_catalog;
create view public.owner_product_catalog
with (security_barrier = true, security_invoker = true) as
select p.id,p.tenant_id,p.sku,p.name,p.description,p.image_url,
       c.base_cost as base_price,p.stock_quantity,p.reserved_quantity,
       greatest(p.stock_quantity-p.reserved_quantity,0) as available_quantity,
       p.weight_grams,p.status,p.is_demo_data,p.created_at,p.updated_at
from public.products p
join public.product_costs c on c.tenant_id=p.tenant_id and c.product_id=p.id;

revoke all on public.owner_product_catalog from public,anon,authenticated;
grant select on public.owner_product_catalog to authenticated;

alter table public.product_costs enable row level security;
grant select,insert,update,delete on public.product_costs to authenticated;
grant all privileges on public.product_costs to service_role;

-- This table is service-role/webhook only. An explicit deny policy documents that
-- no authenticated browser role may read or write payment webhook payloads.
drop policy if exists payment_webhook_events_deny_clients on public.payment_webhook_events;
create policy payment_webhook_events_deny_clients on public.payment_webhook_events
for all to anon, authenticated using (false) with check (false);

comment on column public.products.base_price is
  'Legacy HPP mirror retained for compatibility. Browser roles have no SELECT privilege; use owner-only product_costs view for owner-side cost management.';
comment on table public.product_costs is
  'Owner-only HPP/base cost storage. Never expose this table or its values to public storefront/reseller clients.';

commit;
