-- Isolate reseller commission snapshots from customer-readable order lines.
begin;

alter table public.order_items
  add constraint order_items_tenant_id_id_key unique (tenant_id,id);

create table if not exists public.order_item_commissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  order_id uuid not null,
  order_item_id uuid not null,
  reseller_id uuid not null,
  commission_per_unit numeric(14,2) not null check (commission_per_unit >= 0),
  commission_total numeric(14,2) not null check (commission_total >= 0),
  tier_snapshot public.reseller_tier,
  currency_code char(3) not null default 'IDR',
  created_at timestamptz not null default now(),
  unique (tenant_id,order_item_id),
  foreign key (tenant_id,order_id) references public.orders(tenant_id,id) on delete restrict,
  foreign key (tenant_id,order_item_id) references public.order_items(tenant_id,id) on delete restrict,
  foreign key (tenant_id,reseller_id) references public.tenant_memberships(tenant_id,user_id) on delete restrict
);

create index if not exists order_item_commissions_reseller_idx
  on public.order_item_commissions(tenant_id,reseller_id,created_at desc);
create index if not exists order_item_commissions_order_idx
  on public.order_item_commissions(tenant_id,order_id);

insert into public.order_item_commissions(
  tenant_id,order_id,order_item_id,reseller_id,commission_per_unit,commission_total,tier_snapshot
)
select oi.tenant_id,oi.order_id,oi.id,o.reseller_id,oi.commission_amount,
       oi.commission_amount * oi.quantity,oi.tier_snapshot
from public.order_items oi
join public.orders o on o.tenant_id=oi.tenant_id and o.id=oi.order_id
where o.reseller_id is not null
on conflict (tenant_id,order_item_id) do nothing;

alter table public.order_item_commissions enable row level security;

drop policy if exists order_item_commissions_owner_reseller_read on public.order_item_commissions;
create policy order_item_commissions_owner_reseller_read
on public.order_item_commissions
for select to authenticated
using (
  private.is_tenant_owner(tenant_id)
  or (
    reseller_id = (select auth.uid())
    and private.is_tenant_member(tenant_id)
  )
);

revoke all on public.order_item_commissions from public,anon,authenticated;
grant select on public.order_item_commissions to authenticated;
grant all privileges on public.order_item_commissions to service_role;

comment on table public.order_item_commissions is
  'Private per-order-item reseller commission snapshot; visible to tenant Owner and the attributed reseller only. Never expose to buyer-facing order detail.';

commit;
