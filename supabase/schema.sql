-- Resellerku by Nusakara
-- Stage 1: Supabase PostgreSQL schema + multi-tenant RLS
-- Apply in a fresh Supabase project using the SQL Editor.
-- This file defines the database only; it does not create Auth users or Storage buckets.

begin;

create schema if not exists private;

create type public.membership_role as enum ('owner', 'reseller');
create type public.reseller_tier as enum ('dropshipper', 'agen', 'distributor');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum (
  'awaiting_payment', 'payment_review', 'paid', 'processing',
  'shipped', 'delivered', 'completed', 'cancelled', 'refunded'
);
create type public.payment_status as enum ('unpaid', 'submitted', 'verified', 'rejected', 'refunded');
create type public.fulfillment_type as enum ('self', 'dropship');
create type public.asset_type as enum ('image', 'video', 'copywriting', 'document');
create type public.asset_status as enum ('draft', 'published', 'archived');
create type public.wallet_transaction_type as enum (
  'commission_pending', 'commission_available', 'payout_hold',
  'payout', 'adjustment', 'refund', 'reversal'
);
create type public.wallet_transaction_status as enum ('pending', 'posted', 'voided');
create type public.payout_status as enum ('requested', 'approved', 'rejected', 'processing', 'paid', 'cancelled');

-- Shared user profile. Authentication credentials remain in Supabase Auth.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  business_email text,
  business_phone text,
  currency_code char(3) not null default 'IDR',
  timezone text not null default 'Asia/Jakarta',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A user may belong to many brands; role and tier are tenant-specific.
create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.membership_role not null,
  reseller_tier public.reseller_tier,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  constraint owner_has_no_reseller_tier check (role <> 'owner' or reseller_tier is null),
  constraint reseller_requires_tier check (role <> 'reseller' or reseller_tier is not null)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sku text,
  name text not null,
  description text,
  image_url text,
  base_price numeric(14,2) not null default 0 check (base_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  status public.product_status not null default 'draft',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sku),
  constraint reserved_not_over_stock check (reserved_quantity <= stock_quantity)
);

create table public.product_tier_prices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  tier public.reseller_tier not null,
  selling_price numeric(14,2) not null check (selling_price >= 0),
  commission_amount numeric(14,2) not null default 0 check (commission_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, tier),
  constraint product_tier_same_tenant unique (tenant_id, product_id, tier)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  order_number text not null,
  reseller_id uuid not null references public.users(id) on delete restrict,
  status public.order_status not null default 'awaiting_payment',
  payment_status public.payment_status not null default 'unpaid',
  fulfillment_type public.fulfillment_type not null default 'self',
  recipient_name text not null,
  recipient_phone text,
  shipping_address jsonb not null default '{}'::jsonb,
  sender_name text,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  shipping_cost numeric(14,2) not null default 0 check (shipping_cost >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  payment_reference text,
  receipt_object_path text,
  receipt_ocr_data jsonb,
  receipt_ocr_status text not null default 'not_started'
    check (receipt_ocr_status in ('not_started','queued','processing','matched','mismatch','failed','manual_review')),
  receipt_verified_by uuid references public.users(id) on delete set null,
  receipt_verified_at timestamptz,
  notes text,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, order_number)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  sku_snapshot text,
  tier_snapshot public.reseller_tier,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  commission_amount numeric(14,2) not null default 0 check (commission_amount >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  asset_type public.asset_type not null,
  status public.asset_status not null default 'draft',
  storage_bucket text,
  storage_path text,
  public_url text,
  copywriting text,
  campaign_name text,
  published_at timestamptz,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_has_content check (
    storage_path is not null or public_url is not null or copywriting is not null
  )
);

-- Wallet balances are maintained by trusted backend transactions, never by client-side updates.
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete restrict,
  pending_balance numeric(14,2) not null default 0 check (pending_balance >= 0),
  available_balance numeric(14,2) not null default 0 check (available_balance >= 0),
  lifetime_earned numeric(14,2) not null default 0 check (lifetime_earned >= 0),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  transaction_type public.wallet_transaction_type not null,
  status public.wallet_transaction_status not null default 'pending',
  amount numeric(14,2) not null check (amount > 0),
  description text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  unique (tenant_id, idempotency_key)
);

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete restrict,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  bank_name text not null,
  bank_account_number text not null,
  bank_account_name text not null,
  status public.payout_status not null default 'requested',
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  paid_at timestamptz,
  rejection_reason text,
  transfer_reference text
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Private authorization helpers. SECURITY DEFINER is isolated in a non-exposed schema,
-- has a fixed search_path, and always scopes results to auth.uid().
create or replace function private.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = p_tenant_id
        and tm.user_id = (select auth.uid())
        and tm.is_active = true
    );
$$;

create or replace function private.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = p_tenant_id
        and tm.user_id = (select auth.uid())
        and tm.role = 'owner'
        and tm.is_active = true
    );
$$;

create or replace function private.current_reseller_tier(p_tenant_id uuid)
returns public.reseller_tier
language sql
stable
security definer
set search_path = ''
as $$
  select tm.reseller_tier
  from public.tenant_memberships tm
  where tm.tenant_id = p_tenant_id
    and tm.user_id = (select auth.uid())
    and tm.role = 'reseller'
    and tm.is_active = true
  limit 1;
$$;

revoke all on function private.is_tenant_member(uuid) from public, anon;
revoke all on function private.is_tenant_owner(uuid) from public, anon;
revoke all on function private.current_reseller_tier(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_tenant_member(uuid) to authenticated;
grant execute on function private.is_tenant_owner(uuid) to authenticated;
grant execute on function private.current_reseller_tier(uuid) to authenticated;

-- updated_at trigger.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger users_set_updated_at before update on public.users
for each row execute function private.set_updated_at();
create trigger tenants_set_updated_at before update on public.tenants
for each row execute function private.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function private.set_updated_at();
create trigger product_tier_prices_set_updated_at before update on public.product_tier_prices
for each row execute function private.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function private.set_updated_at();
create trigger assets_set_updated_at before update on public.assets
for each row execute function private.set_updated_at();
create trigger wallets_set_updated_at before update on public.wallets
for each row execute function private.set_updated_at();

-- Indexes for tenant filters, membership checks, order lists, and financial history.
create index tenant_memberships_user_idx on public.tenant_memberships(user_id, tenant_id);
create index tenant_memberships_tenant_role_idx on public.tenant_memberships(tenant_id, role, is_active);
create index products_tenant_status_idx on public.products(tenant_id, status);
create index product_tier_prices_tenant_product_idx on public.product_tier_prices(tenant_id, product_id);
create index orders_tenant_created_idx on public.orders(tenant_id, placed_at desc);
create index orders_reseller_created_idx on public.orders(tenant_id, reseller_id, placed_at desc);
create index orders_tenant_status_idx on public.orders(tenant_id, status, payment_status);
create index order_items_order_idx on public.order_items(order_id);
create index assets_tenant_status_idx on public.assets(tenant_id, status, published_at desc);
create index wallets_user_idx on public.wallets(user_id, tenant_id);
create index wallet_transactions_wallet_created_idx on public.wallet_transactions(wallet_id, created_at desc);
create index payout_requests_tenant_status_idx on public.payout_requests(tenant_id, status, requested_at desc);
create index audit_logs_tenant_created_idx on public.audit_logs(tenant_id, created_at desc);

-- Enable RLS on every public table.
alter table public.users enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.products enable row level security;
alter table public.product_tier_prices enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.assets enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.payout_requests enable row level security;
alter table public.audit_logs enable row level security;

-- Explicit grants: no anonymous access. RLS remains the row-level authorization layer.
revoke all on public.users, public.tenants, public.tenant_memberships, public.products,
  public.product_tier_prices, public.orders, public.order_items, public.assets,
  public.wallets, public.wallet_transactions, public.payout_requests, public.audit_logs
from anon, authenticated;

grant select, insert, update on public.users to authenticated;
grant select, insert, update on public.tenants to authenticated;
grant select, insert, update, delete on public.tenant_memberships to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_tier_prices to authenticated;
grant select, update on public.orders to authenticated; -- checkout writes are backend-only
grant select on public.order_items to authenticated; -- order item writes are backend-only
grant select, insert, update, delete on public.assets to authenticated;
grant select on public.wallets, public.wallet_transactions to authenticated;
grant select, insert on public.payout_requests to authenticated;
grant select on public.audit_logs to authenticated;

-- USERS: a user can read/update only their own profile.
create policy users_select_self on public.users
for select to authenticated using (id = (select auth.uid()));
create policy users_insert_self on public.users
for insert to authenticated with check (id = (select auth.uid()));
create policy users_update_self on public.users
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- TENANTS: only active members can read; creator can create; creator can update.
create policy tenants_select_member on public.tenants
for select to authenticated using (created_by = (select auth.uid()) or private.is_tenant_member(id));
create policy tenants_insert_creator on public.tenants
for insert to authenticated with check (created_by = (select auth.uid()));
create policy tenants_update_creator on public.tenants
for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

-- MEMBERSHIPS: users see their own membership rows; tenant owners can manage membership.
create policy memberships_select_self_or_owner on public.tenant_memberships
for select to authenticated
using (user_id = (select auth.uid()) or private.is_tenant_owner(tenant_id));
create policy memberships_insert_self_owner_or_tenant_owner on public.tenant_memberships
for insert to authenticated
with check (
  (user_id = (select auth.uid()) and role = 'owner'
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.created_by = (select auth.uid())
    ))
  or private.is_tenant_owner(tenant_id)
);
create policy memberships_update_tenant_owner on public.tenant_memberships
for update to authenticated
using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));
create policy memberships_delete_self_or_tenant_owner on public.tenant_memberships
for delete to authenticated
using (
  (user_id = (select auth.uid()) and role = 'reseller')
  or private.is_tenant_owner(tenant_id)
);

-- PRODUCTS: all active tenant members can read active products; owners manage all products.
create policy products_select_member on public.products
for select to authenticated
using (private.is_tenant_member(tenant_id) and (status = 'active' or private.is_tenant_owner(tenant_id)));
create policy products_insert_owner on public.products
for insert to authenticated with check (private.is_tenant_owner(tenant_id));
create policy products_update_owner on public.products
for update to authenticated
using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));
create policy products_delete_owner on public.products
for delete to authenticated using (private.is_tenant_owner(tenant_id));

-- TIER PRICES: reseller sees only their own tier; owner sees all tiers.
create policy tier_prices_select_member_tier on public.product_tier_prices
for select to authenticated
using (
  private.is_tenant_owner(tenant_id)
  or (private.is_tenant_member(tenant_id)
      and tier = private.current_reseller_tier(tenant_id))
);
create policy tier_prices_insert_owner on public.product_tier_prices
for insert to authenticated with check (private.is_tenant_owner(tenant_id));
create policy tier_prices_update_owner on public.product_tier_prices
for update to authenticated
using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));
create policy tier_prices_delete_owner on public.product_tier_prices
for delete to authenticated using (private.is_tenant_owner(tenant_id));

-- ORDERS: reseller reads own orders; owner reads all tenant orders. Only owner updates status/payment verification.
create policy orders_select_reseller_or_owner on public.orders
for select to authenticated
using (
  private.is_tenant_owner(tenant_id)
  or (reseller_id = (select auth.uid()) and private.is_tenant_member(tenant_id))
);
-- Order creation is backend-only: the Worker validates tier price, stock and totals atomically.
create policy orders_update_owner on public.orders
for update to authenticated
using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

-- ORDER ITEMS: access follows the parent order; tenant_id must match the parent.
create policy order_items_select_via_order on public.order_items
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.tenant_id = order_items.tenant_id
      and (private.is_tenant_owner(o.tenant_id) or o.reseller_id = (select auth.uid()))
  )
);
-- Order item creation is backend-only to prevent client-side price/quantity manipulation.

-- ASSETS: owner manages; tenant resellers can read published assets only.
create policy assets_select_published_or_owner on public.assets
for select to authenticated
using (
  private.is_tenant_owner(tenant_id)
  or (private.is_tenant_member(tenant_id) and status = 'published')
);
create policy assets_insert_owner on public.assets
for insert to authenticated with check (private.is_tenant_owner(tenant_id));
create policy assets_update_owner on public.assets
for update to authenticated
using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));
create policy assets_delete_owner on public.assets
for delete to authenticated using (private.is_tenant_owner(tenant_id));

-- WALLETS: user sees own wallet; owner can see wallets within their tenant. No client writes.
create policy wallets_select_owner_or_self on public.wallets
for select to authenticated
using (user_id = (select auth.uid()) or private.is_tenant_owner(tenant_id));

create policy wallet_transactions_select_owner_or_self on public.wallet_transactions
for select to authenticated
using (user_id = (select auth.uid()) or private.is_tenant_owner(tenant_id));

-- PAYOUTS: reseller requests and views own; owner views and processes all tenant requests.
create policy payouts_select_owner_or_self on public.payout_requests
for select to authenticated
using (user_id = (select auth.uid()) or private.is_tenant_owner(tenant_id));
create policy payouts_insert_self on public.payout_requests
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'requested'
  and private.is_tenant_member(tenant_id)
  and exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = tenant_id
      and tm.user_id = (select auth.uid())
      and tm.role = 'reseller'
      and tm.is_active = true
  )
  and exists (
    select 1 from public.wallets w
    where w.id = payout_requests.wallet_id
      and w.tenant_id = payout_requests.tenant_id
      and w.user_id = (select auth.uid())
  )
);
-- No client UPDATE grant: payout approval/payment is backend-only.

-- AUDIT LOGS: owner-only read. Inserts are reserved for trusted backend operations.
create policy audit_logs_select_owner on public.audit_logs
for select to authenticated using (private.is_tenant_owner(tenant_id));


-- FINAL HARDENING: tenant integrity, onboarding triggers, immutable ledgers.
-- This project is new/empty. These constraints intentionally prevent cross-tenant references.

-- Explicitly restrict schema creation and make exposed-schema table privileges opt-in.
revoke create on schema public from public, anon, authenticated;
grant usage on schema public to authenticated;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Composite keys allow foreign keys to assert tenant ownership, not only object identity.
alter table public.products
  add constraint products_tenant_id_id_key unique (tenant_id, id);
alter table public.orders
  add constraint orders_tenant_id_id_key unique (tenant_id, id);
alter table public.wallets
  add column locked_balance numeric(14,2) not null default 0 check (locked_balance >= 0),
  add constraint wallets_tenant_id_id_user_id_key unique (tenant_id, id, user_id);

-- Replace single-column references with tenant-aware references.
alter table public.product_tier_prices
  drop constraint if exists product_tier_prices_product_id_fkey,
  add constraint product_tier_prices_product_tenant_fk
    foreign key (tenant_id, product_id)
    references public.products (tenant_id, id) on delete cascade;

alter table public.orders
  drop constraint if exists orders_reseller_id_fkey,
  add constraint orders_reseller_membership_fk
    foreign key (tenant_id, reseller_id)
    references public.tenant_memberships (tenant_id, user_id) on delete restrict;

alter table public.order_items
  drop constraint if exists order_items_order_id_fkey,
  drop constraint if exists order_items_product_id_fkey,
  add constraint order_items_order_tenant_fk
    foreign key (tenant_id, order_id)
    references public.orders (tenant_id, id) on delete cascade,
  add constraint order_items_product_tenant_fk
    foreign key (tenant_id, product_id)
    references public.products (tenant_id, id) on delete restrict;

alter table public.wallets
  drop constraint if exists wallets_user_id_fkey,
  add constraint wallets_membership_fk
    foreign key (tenant_id, user_id)
    references public.tenant_memberships (tenant_id, user_id) on delete restrict;

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_wallet_id_fkey,
  drop constraint if exists wallet_transactions_user_id_fkey,
  drop constraint if exists wallet_transactions_order_id_fkey,
  add constraint wallet_transactions_wallet_owner_tenant_fk
    foreign key (tenant_id, wallet_id, user_id)
    references public.wallets (tenant_id, id, user_id) on delete restrict,
  add constraint wallet_transactions_order_tenant_fk
    foreign key (tenant_id, order_id)
    references public.orders (tenant_id, id) on delete restrict,
  add constraint wallet_transactions_posted_at_check
    check (status <> 'posted' or posted_at is not null);

alter table public.payout_requests
  drop constraint if exists payout_requests_user_id_fkey,
  drop constraint if exists payout_requests_wallet_id_fkey,
  add constraint payout_requests_wallet_owner_tenant_fk
    foreign key (tenant_id, wallet_id, user_id)
    references public.wallets (tenant_id, id, user_id) on delete restrict,
  add constraint payout_requests_membership_fk
    foreign key (tenant_id, user_id)
    references public.tenant_memberships (tenant_id, user_id) on delete restrict,
  add constraint payout_requests_paid_at_check
    check (status <> 'paid' or paid_at is not null);

-- Keep wallet balances separated into pending, available and payout-locked funds.
comment on column public.wallets.pending_balance is 'Commission not yet releasable (for example, order not delivered).';
comment on column public.wallets.available_balance is 'Commission confirmed and available for payout.';
comment on column public.wallets.locked_balance is 'Available funds held for payout requests currently being processed.';
comment on column public.wallets.lifetime_earned is 'Lifetime confirmed commission; not a spendable balance.';

-- New Auth users get a profile row. Metadata is used only for display profile fields, never authorization.
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_resellerku on auth.users;
create trigger on_auth_user_created_resellerku
after insert on auth.users
for each row execute function private.handle_new_auth_user();

-- The tenant creator is automatically made its first owner.
create or replace function private.handle_new_tenant_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.tenant_memberships (tenant_id, user_id, role, reseller_tier)
  values (new.id, new.created_by, 'owner', null)
  on conflict (tenant_id, user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_tenant_owner() from public, anon, authenticated;
drop trigger if exists on_tenant_created_assign_owner on public.tenants;
create trigger on_tenant_created_assign_owner
after insert on public.tenants
for each row execute function private.handle_new_tenant_owner();

-- Owner dashboard can view basic profiles of users in the owner's active tenants.
create or replace function private.can_view_user_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.tenant_memberships target
      join public.tenant_memberships actor
        on actor.tenant_id = target.tenant_id
      where target.user_id = p_user_id
        and target.is_active = true
        and actor.user_id = (select auth.uid())
        and actor.role = 'owner'
        and actor.is_active = true
    );
$$;

revoke all on function private.can_view_user_profile(uuid) from public, anon;
grant execute on function private.can_view_user_profile(uuid) to authenticated;

drop policy if exists users_select_self on public.users;
create policy users_select_self_or_tenant_owner on public.users
for select to authenticated
using (id = (select auth.uid()) or private.can_view_user_profile(id));

-- Only an active tenant owner can change tenant business settings.
drop policy if exists tenants_update_creator on public.tenants;
create policy tenants_update_owner on public.tenants
for update to authenticated
using (private.is_tenant_owner(id))
with check (private.is_tenant_owner(id));

-- Prevent changing a business row's tenant_id after creation, even in privileged code.
create or replace function private.prevent_tenant_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'tenant_id is immutable; create a new row in the target tenant'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_tenant_reassignment() from public, anon, authenticated;

create trigger tenant_memberships_prevent_reassignment
before update on public.tenant_memberships
for each row execute function private.prevent_tenant_reassignment();
create trigger products_prevent_reassignment
before update on public.products
for each row execute function private.prevent_tenant_reassignment();
create trigger product_tier_prices_prevent_reassignment
before update on public.product_tier_prices
for each row execute function private.prevent_tenant_reassignment();
create trigger orders_prevent_reassignment
before update on public.orders
for each row execute function private.prevent_tenant_reassignment();
create trigger order_items_prevent_reassignment
before update on public.order_items
for each row execute function private.prevent_tenant_reassignment();
create trigger assets_prevent_reassignment
before update on public.assets
for each row execute function private.prevent_tenant_reassignment();
create trigger wallets_prevent_reassignment
before update on public.wallets
for each row execute function private.prevent_tenant_reassignment();
create trigger wallet_transactions_prevent_reassignment
before update on public.wallet_transactions
for each row execute function private.prevent_tenant_reassignment();
create trigger payout_requests_prevent_reassignment
before update on public.payout_requests
for each row execute function private.prevent_tenant_reassignment();
create trigger audit_logs_prevent_reassignment
before update on public.audit_logs
for each row execute function private.prevent_tenant_reassignment();

-- Membership identity is immutable; the final active owner cannot demote or delete themselves.
create or replace function private.protect_tenant_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
  v_old_was_owner boolean;
  v_new_remains_owner boolean;
begin
  if tg_op = 'UPDATE' then
    if new.tenant_id is distinct from old.tenant_id or new.user_id is distinct from old.user_id then
      raise exception 'tenant membership identity is immutable'
        using errcode = '23514';
    end if;
    v_tenant_id := old.tenant_id;
    v_user_id := old.user_id;
    v_old_was_owner := old.role = 'owner' and old.is_active;
    v_new_remains_owner := new.role = 'owner' and new.is_active;
  else
    v_tenant_id := old.tenant_id;
    v_user_id := old.user_id;
    v_old_was_owner := old.role = 'owner' and old.is_active;
    v_new_remains_owner := false;
  end if;

  if v_old_was_owner and not v_new_remains_owner and not exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = v_tenant_id
      and tm.user_id <> v_user_id
      and tm.role = 'owner'
      and tm.is_active = true
  ) then
    raise exception 'a tenant must retain at least one active owner'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.protect_tenant_membership() from public, anon, authenticated;
create trigger tenant_memberships_protect_owner
before update or delete on public.tenant_memberships
for each row execute function private.protect_tenant_membership();

-- Wallet ledger and audit trail are append-only. Corrections must be new reversal/audit rows.
create or replace function private.reject_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'this table is append-only; record a compensating entry instead'
    using errcode = '55000';
end;
$$;

revoke all on function private.reject_ledger_mutation() from public, anon, authenticated;
create trigger wallet_transactions_append_only
before update or delete on public.wallet_transactions
for each row execute function private.reject_ledger_mutation();
create trigger audit_logs_append_only
before update or delete on public.audit_logs
for each row execute function private.reject_ledger_mutation();

-- Correctly correlate payout policy checks to the outer payout row.
drop policy if exists payouts_insert_self on public.payout_requests;
create policy payouts_insert_self on public.payout_requests
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'requested'
  and private.is_tenant_member(payout_requests.tenant_id)
  and exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = payout_requests.tenant_id
      and tm.user_id = (select auth.uid())
      and tm.role = 'reseller'
      and tm.is_active = true
  )
  and exists (
    select 1 from public.wallets w
    where w.id = payout_requests.wallet_id
      and w.tenant_id = payout_requests.tenant_id
      and w.user_id = (select auth.uid())
  )
);

-- Additional lookup indexes used by owner/reseller screens.
create index order_items_tenant_order_idx on public.order_items(tenant_id, order_id);
create index wallet_transactions_tenant_user_idx on public.wallet_transactions(tenant_id, user_id, created_at desc);
create index payout_requests_tenant_user_idx on public.payout_requests(tenant_id, user_id, requested_at desc);

-- Additional hardening for project-level automatic RLS event trigger.
do $
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$;

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

commit;
