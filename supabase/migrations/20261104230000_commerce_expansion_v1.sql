-- Resellerku Commerce Expansion v1
-- Additive, tenant-scoped schema for storefront, carts, checkout, fulfilment,
-- customer service, trust/reviews and reseller referral attribution.
-- Existing products, orders, wallets, assets and audit history are preserved.

begin;

-- ---------------------------------------------------------------------------
-- Storefront settings and catalogue structure
-- ---------------------------------------------------------------------------

create table if not exists public.storefront_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  public_slug text not null unique,
  status text not null default 'draft' check (status in ('draft','published','paused')),
  display_name text not null,
  tagline text,
  announcement text,
  logo_path text,
  hero_image_path text,
  hero_title text,
  hero_body text,
  hero_cta_label text,
  hero_cta_url text,
  support_email text,
  support_phone text,
  shipping_policy text,
  return_policy text,
  privacy_policy text,
  terms_of_service text,
  seo_title text,
  seo_description text,
  theme_config jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint storefront_slug_format check (public_slug ~ '^[a-z0-9][a-z0-9-]{2,59}$')
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  parent_id uuid,
  slug text not null,
  name text not null,
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, slug),
  foreign key (tenant_id, parent_id)
    references public.product_categories(tenant_id, id) on delete restrict,
  check (parent_id is null or parent_id <> id)
);

create table if not exists public.product_category_links (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null,
  category_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, product_id, category_id),
  foreign key (tenant_id, product_id)
    references public.products(tenant_id, id) on delete cascade,
  foreign key (tenant_id, category_id)
    references public.product_categories(tenant_id, id) on delete cascade
);

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null,
  media_type text not null check (media_type in ('image','video')),
  storage_bucket text not null default 'storefront-media',
  storage_path text not null,
  alt_text text,
  caption text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, product_id)
    references public.products(tenant_id, id) on delete cascade,
  unique (tenant_id, storage_bucket, storage_path)
);

create unique index if not exists product_media_one_cover_idx
  on public.product_media(tenant_id, product_id) where is_cover = true;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null,
  sku text not null,
  barcode text,
  option_values jsonb not null default '{}'::jsonb,
  image_path text,
  weight_grams integer,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, product_id, id),
  unique (tenant_id, sku),
  foreign key (tenant_id, product_id)
    references public.products(tenant_id, id) on delete cascade,
  check (reserved_quantity <= stock_quantity),
  check (weight_grams is null or weight_grams >= 0)
);

-- Public direct-store price is kept separate from private HPP and reseller tier prices.
create table if not exists public.storefront_offers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null,
  regular_price numeric(14,2) not null check (regular_price >= 0),
  sale_price numeric(14,2),
  currency_code char(3) not null default 'IDR',
  effective_from timestamptz,
  effective_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, product_id),
  foreign key (tenant_id, product_id)
    references public.products(tenant_id, id) on delete cascade,
  check (sale_price is null or (sale_price >= 0 and sale_price <= regular_price)),
  check (effective_until is null or effective_from is null or effective_until > effective_from)
);

create table if not exists public.storefront_collections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  cover_path text,
  section_type text not null default 'curated'
    check (section_type in ('featured','new_arrivals','best_sellers','curated','campaign')),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, slug)
);

create table if not exists public.storefront_collection_products (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  collection_id uuid not null,
  product_id uuid not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (tenant_id, collection_id, product_id),
  foreign key (tenant_id, collection_id)
    references public.storefront_collections(tenant_id, id) on delete cascade,
  foreign key (tenant_id, product_id)
    references public.products(tenant_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Customer identity, address book, persistent carts and wishlist
-- ---------------------------------------------------------------------------

create table if not exists public.storefront_customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  display_name text,
  email text,
  phone text,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, user_id)
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null default 'Rumah',
  recipient_name text not null,
  phone text not null,
  province_code text,
  province_name text,
  city_code text,
  city_name text,
  district_code text,
  district_name text,
  subdistrict_name text,
  postal_code text,
  address_line text not null,
  delivery_notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, customer_id)
    references public.storefront_customers(tenant_id, id) on delete cascade,
  check (length(trim(recipient_name)) > 0 and length(trim(phone)) > 0),
  check (length(trim(address_line)) > 0)
);

create unique index if not exists customer_addresses_one_default_idx
  on public.customer_addresses(tenant_id, user_id) where is_default = true;

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active','converted','abandoned','expired')),
  currency_code char(3) not null default 'IDR',
  reseller_referral_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  converted_order_id uuid,
  unique (tenant_id, id),
  foreign key (tenant_id, customer_id)
    references public.storefront_customers(tenant_id, id) on delete cascade
);

create unique index if not exists carts_one_active_per_customer_idx
  on public.carts(tenant_id, user_id) where status = 'active';

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cart_id uuid not null,
  product_id uuid not null,
  variant_id uuid,
  quantity integer not null check (quantity > 0 and quantity <= 999),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, cart_id) references public.carts(tenant_id, id) on delete cascade,
  foreign key (tenant_id, product_id) references public.products(tenant_id, id) on delete restrict,
  foreign key (tenant_id, product_id, variant_id)
    references public.product_variants(tenant_id, product_id, id) on delete restrict,
  unique nulls not distinct (cart_id, product_id, variant_id)
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id) on delete cascade,
  unique (tenant_id, user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Promotion and voucher rules
-- ---------------------------------------------------------------------------

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text,
  name text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage','fixed_amount','free_shipping')),
  discount_value numeric(14,2) not null default 0 check (discount_value >= 0),
  max_discount numeric(14,2),
  minimum_subtotal numeric(14,2) not null default 0 check (minimum_subtotal >= 0),
  scope text not null default 'order' check (scope in ('order','product','category')),
  usage_limit_total integer,
  usage_limit_per_customer integer,
  usage_count integer not null default 0 check (usage_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_stackable boolean not null default false,
  is_active boolean not null default true,
  is_published boolean not null default false,
  eligible_tiers public.reseller_tier[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (code is null or code = upper(code)),
  check (max_discount is null or max_discount >= 0),
  check (usage_limit_total is null or usage_limit_total > 0),
  check (usage_limit_per_customer is null or usage_limit_per_customer > 0),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (discount_type <> 'percentage' or discount_value <= 100)
);

create unique index if not exists promotions_code_per_tenant_idx
  on public.promotions(tenant_id, code) where code is not null;

create table if not exists public.promotion_products (
  tenant_id uuid not null,
  promotion_id uuid not null,
  product_id uuid not null,
  primary key (tenant_id, promotion_id, product_id),
  foreign key (tenant_id, promotion_id) references public.promotions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, product_id) references public.products(tenant_id, id) on delete cascade
);

create table if not exists public.promotion_categories (
  tenant_id uuid not null,
  promotion_id uuid not null,
  category_id uuid not null,
  primary key (tenant_id, promotion_id, category_id),
  foreign key (tenant_id, promotion_id) references public.promotions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, category_id) references public.product_categories(tenant_id, id) on delete cascade
);

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  promotion_id uuid not null,
  order_id uuid,
  customer_id uuid not null references public.users(id) on delete restrict,
  discount_amount numeric(14,2) not null check (discount_amount >= 0),
  redeemed_at timestamptz not null default now(),
  unique (tenant_id, promotion_id, order_id),
  foreign key (tenant_id, promotion_id) references public.promotions(tenant_id, id) on delete restrict
);

-- ---------------------------------------------------------------------------
-- Shipping catalogue, rate cards, shipments and carrier events
-- ---------------------------------------------------------------------------

create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  province_codes text[] not null default '{}',
  city_codes text[] not null default '{}',
  postal_prefixes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table if not exists public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider_code text not null default 'manual',
  service_code text not null,
  name text not null,
  description text,
  fulfillment_type public.fulfillment_type not null default 'self',
  min_delivery_days integer,
  max_delivery_days integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, provider_code, service_code),
  check (min_delivery_days is null or min_delivery_days >= 0),
  check (max_delivery_days is null or min_delivery_days is null or max_delivery_days >= min_delivery_days)
);

create table if not exists public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  shipping_zone_id uuid not null,
  shipping_method_id uuid not null,
  base_fee numeric(14,2) not null default 0 check (base_fee >= 0),
  fee_per_kg numeric(14,2) not null default 0 check (fee_per_kg >= 0),
  minimum_fee numeric(14,2) not null default 0 check (minimum_fee >= 0),
  maximum_fee numeric(14,2),
  free_shipping_minimum numeric(14,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, shipping_zone_id, shipping_method_id),
  foreign key (tenant_id, shipping_zone_id) references public.shipping_zones(tenant_id, id) on delete cascade,
  foreign key (tenant_id, shipping_method_id) references public.shipping_methods(tenant_id, id) on delete cascade,
  check (maximum_fee is null or maximum_fee >= minimum_fee)
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  order_id uuid not null,
  shipping_method_id uuid,
  shipment_number text not null,
  provider_code text,
  service_code text,
  tracking_number text,
  status text not null default 'pending'
    check (status in ('pending','ready_to_ship','picked_up','in_transit','out_for_delivery','delivered','failed','returned','cancelled')),
  shipping_label_bucket text,
  shipping_label_path text,
  shipped_at timestamptz,
  estimated_delivery_at timestamptz,
  delivered_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, shipment_number),
  foreign key (tenant_id, order_id) references public.orders(tenant_id, id) on delete restrict,
  foreign key (tenant_id, shipping_method_id) references public.shipping_methods(tenant_id, id) on delete restrict
);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  shipment_id uuid not null,
  event_code text not null,
  event_label text not null,
  description text,
  location text,
  occurred_at timestamptz not null,
  provider_event_id text,
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, shipment_id) references public.shipments(tenant_id, id) on delete cascade,
  unique (tenant_id, provider_event_id)
);

-- ---------------------------------------------------------------------------
-- Reseller referral attribution and order/customer snapshots
-- ---------------------------------------------------------------------------

create table if not exists public.reseller_referral_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reseller_id uuid not null,
  code text not null,
  label text,
  status text not null default 'active' check (status in ('active','paused','revoked')),
  starts_at timestamptz,
  ends_at timestamptz,
  click_count bigint not null default 0 check (click_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code),
  foreign key (tenant_id, reseller_id)
    references public.tenant_memberships(tenant_id, user_id) on delete cascade,
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

alter table public.orders alter column reseller_id drop not null;
alter table public.orders
  add column if not exists customer_id uuid references public.users(id) on delete restrict,
  add column if not exists reseller_membership_id uuid,
  add column if not exists referral_code_id uuid,
  add column if not exists referral_code_snapshot text,
  add column if not exists sales_channel text not null default 'reseller_referral',
  add column if not exists customer_address_id uuid,
  add column if not exists shipping_rate_id uuid,
  add column if not exists checkout_idempotency_key text;

alter table public.orders
  drop constraint if exists orders_reseller_membership_tenant_fk,
  add constraint orders_reseller_membership_tenant_fk
    foreign key (tenant_id, reseller_id)
    references public.tenant_memberships(tenant_id, user_id) on delete restrict,
  add constraint orders_referral_tenant_fk
    foreign key (tenant_id, referral_code_id)
    references public.reseller_referral_codes(tenant_id, id) on delete restrict,
  add constraint orders_reseller_membership_id_tenant_fk
    foreign key (tenant_id, reseller_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete restrict,
  add constraint orders_customer_address_tenant_fk
    foreign key (tenant_id, customer_address_id)
    references public.customer_addresses(tenant_id, id) on delete restrict,
  add constraint orders_shipping_rate_tenant_fk
    foreign key (tenant_id, shipping_rate_id)
    references public.shipping_rates(tenant_id, id) on delete restrict,
  add constraint orders_sales_channel_check
    check (sales_channel in ('direct_store','reseller_referral','owner_manual')),
  add constraint orders_channel_attribution_check
    check (
      (sales_channel = 'direct_store' and reseller_id is null and referral_code_id is null)
      or (sales_channel = 'reseller_referral' and reseller_id is not null)
      or sales_channel = 'owner_manual'
    );

create unique index if not exists orders_checkout_idempotency_idx
  on public.orders(tenant_id, customer_id, checkout_idempotency_key)
  where checkout_idempotency_key is not null;

alter table public.order_items
  add column if not exists variant_id uuid,
  add column if not exists variant_options_snapshot jsonb not null default '{}'::jsonb,
  add constraint order_items_variant_tenant_fk
    foreign key (tenant_id, product_id, variant_id)
    references public.product_variants(tenant_id, product_id, id) on delete restrict;

-- ---------------------------------------------------------------------------
-- Payments and inventory ledger
-- ---------------------------------------------------------------------------

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  order_id uuid not null,
  provider_code text not null,
  payment_method text not null,
  provider_reference text,
  idempotency_key text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency_code char(3) not null default 'IDR',
  status text not null default 'pending'
    check (status in ('pending','requires_action','succeeded','failed','cancelled','refunded','expired')),
  checkout_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, idempotency_key),
  foreign key (tenant_id, order_id) references public.orders(tenant_id, id) on delete restrict
);

create unique index if not exists payment_transactions_provider_reference_idx
  on public.payment_transactions(provider_code, provider_reference)
  where provider_reference is not null;

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  provider_code text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean not null default false,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz not null default now(),
  unique (provider_code, provider_event_id)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  product_id uuid not null,
  variant_id uuid,
  order_id uuid,
  movement_type text not null
    check (movement_type in ('opening','adjustment','reserved','sale','reservation_release','return_restock','damage','transfer_in','transfer_out')),
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text,
  reference_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id) on delete restrict,
  foreign key (tenant_id, product_id, variant_id)
    references public.product_variants(tenant_id, product_id, id) on delete restrict,
  foreign key (tenant_id, order_id) references public.orders(tenant_id, id) on delete restrict,
  unique (tenant_id, reference_key)
);

-- ---------------------------------------------------------------------------
-- Verified-purchase reviews and reputation
-- ---------------------------------------------------------------------------

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null,
  order_id uuid not null,
  order_item_id uuid not null,
  customer_id uuid not null references public.users(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  reviewer_display_name text,
  is_verified_purchase boolean not null default true,
  status text not null default 'pending' check (status in ('pending','published','rejected','hidden')),
  owner_response text,
  owner_responded_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, order_item_id),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id) on delete restrict,
  foreign key (tenant_id, order_id) references public.orders(tenant_id, id) on delete restrict,
  foreign key (order_item_id) references public.order_items(id) on delete restrict
);

create table if not exists public.product_review_media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  review_id uuid not null,
  media_type text not null check (media_type in ('image','video')),
  storage_bucket text not null default 'commerce-evidence',
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, review_id) references public.product_reviews(tenant_id, id) on delete cascade,
  unique (tenant_id, storage_bucket, storage_path)
);

-- ---------------------------------------------------------------------------
-- Order communication, returns, disputes and evidence
-- ---------------------------------------------------------------------------

create table if not exists public.order_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid not null,
  status text not null default 'open' check (status in ('open','closed','archived')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, order_id),
  foreign key (tenant_id, order_id) references public.orders(tenant_id, id) on delete cascade
);

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null,
  sender_id uuid not null references public.users(id) on delete restrict,
  body text not null,
  attachment_bucket text,
  attachment_path text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, conversation_id)
    references public.order_conversations(tenant_id, id) on delete cascade,
  check (length(trim(body)) > 0 or attachment_path is not null)
);

create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  order_id uuid not null,
  requested_by uuid not null references public.users(id) on delete restrict,
  reason_code text not null,
  reason_detail text,
  resolution_type text check (resolution_type in ('refund','replacement','exchange','store_credit')),
  status text not null default 'requested'
    check (status in ('requested','under_review','approved','rejected','awaiting_return','return_received','resolved','cancelled')),
  requested_at timestamptz not null default now(),
  decision_deadline timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  resolved_at timestamptz,
  resolution_note text,
  refund_amount numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, order_id) references public.orders(tenant_id, id) on delete restrict,
  check (refund_amount is null or refund_amount >= 0)
);

create table if not exists public.return_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  return_request_id uuid not null,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  condition_report text,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, return_request_id) references public.return_requests(tenant_id, id) on delete cascade
);

create table if not exists public.dispute_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  order_id uuid not null,
  opened_by uuid not null references public.users(id) on delete restrict,
  issue_type text not null,
  description text not null,
  status text not null default 'open'
    check (status in ('open','awaiting_response','under_review','resolved_buyer','resolved_seller','closed','rejected')),
  assigned_to uuid references public.users(id) on delete set null,
  decision text,
  decision_reason text,
  decided_by uuid references public.users(id) on delete set null,
  decided_at timestamptz,
  response_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, order_id) references public.orders(tenant_id, id) on delete restrict
);

create table if not exists public.case_evidence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  return_request_id uuid,
  dispute_case_id uuid,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  storage_bucket text not null default 'commerce-evidence',
  storage_path text not null,
  file_name text,
  mime_type text,
  file_size_bytes bigint,
  caption text,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, return_request_id) references public.return_requests(tenant_id, id) on delete cascade,
  foreign key (tenant_id, dispute_case_id) references public.dispute_cases(tenant_id, id) on delete cascade,
  check ((return_request_id is not null)::integer + (dispute_case_id is not null)::integer = 1),
  check (file_size_bytes is null or file_size_bytes between 1 and 26214400),
  unique (tenant_id, storage_path)
);

create table if not exists public.seller_verifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subject_type text not null check (subject_type in ('store','reseller')),
  subject_user_id uuid references public.users(id) on delete restrict,
  verification_type text not null,
  status text not null default 'not_submitted'
    check (status in ('not_submitted','submitted','under_review','verified','rejected','expired')),
  legal_name text,
  business_name text,
  reviewer_notes text,
  submitted_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  evidence_bucket text,
  evidence_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check ((subject_type = 'store' and subject_user_id is null) or (subject_type = 'reseller' and subject_user_id is not null))
);

-- ---------------------------------------------------------------------------
-- Indexes and tenant integrity
-- ---------------------------------------------------------------------------

create index if not exists product_categories_tenant_parent_sort_idx on public.product_categories(tenant_id, parent_id, sort_order);
create index if not exists product_category_links_product_idx on public.product_category_links(tenant_id, product_id);
create index if not exists product_media_product_sort_idx on public.product_media(tenant_id, product_id, sort_order);
create index if not exists product_variants_product_active_idx on public.product_variants(tenant_id, product_id, is_active);
create index if not exists storefront_offers_active_idx on public.storefront_offers(tenant_id, is_active, effective_from, effective_until);
create index if not exists collections_published_sort_idx on public.storefront_collections(tenant_id, is_published, sort_order);
create index if not exists customer_addresses_user_idx on public.customer_addresses(tenant_id, user_id, created_at desc);
create index if not exists carts_user_status_idx on public.carts(tenant_id, user_id, status);
create index if not exists cart_items_cart_idx on public.cart_items(tenant_id, cart_id);
create index if not exists promotions_active_window_idx on public.promotions(tenant_id, is_active, starts_at, ends_at);
create index if not exists shipping_rates_zone_method_idx on public.shipping_rates(tenant_id, shipping_zone_id, shipping_method_id);
create index if not exists shipments_order_idx on public.shipments(tenant_id, order_id, created_at desc);
create index if not exists shipment_events_shipment_time_idx on public.shipment_events(tenant_id, shipment_id, occurred_at desc);
create index if not exists referral_codes_reseller_idx on public.reseller_referral_codes(tenant_id, reseller_id, status);
create index if not exists payment_transactions_order_idx on public.payment_transactions(tenant_id, order_id, created_at desc);
create index if not exists inventory_movements_product_time_idx on public.inventory_movements(tenant_id, product_id, created_at desc);
create index if not exists reviews_product_published_idx on public.product_reviews(tenant_id, product_id, status, published_at desc);
create index if not exists conversations_order_idx on public.order_conversations(tenant_id, order_id);
create index if not exists messages_conversation_time_idx on public.order_messages(tenant_id, conversation_id, created_at);
create index if not exists returns_order_idx on public.return_requests(tenant_id, order_id, requested_at desc);
create index if not exists disputes_order_idx on public.dispute_cases(tenant_id, order_id, created_at desc);
create index if not exists seller_verifications_subject_idx on public.seller_verifications(tenant_id, subject_type, subject_user_id, status);

-- Prevent a tenant-owned row from being moved to another tenant after creation.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'storefront_settings','product_categories','product_category_links','product_media',
    'product_variants','storefront_offers','storefront_collections','storefront_collection_products',
    'storefront_customers','customer_addresses','carts','cart_items','wishlist_items',
    'promotions','promotion_products','promotion_categories','promotion_redemptions',
    'shipping_zones','shipping_methods','shipping_rates','shipments','shipment_events',
    'reseller_referral_codes','payment_transactions','payment_webhook_events','inventory_movements',
    'product_reviews','product_review_media','order_conversations','order_messages',
    'return_requests','return_items','dispute_cases','case_evidence','seller_verifications'
  ] loop
    execute format('drop trigger if exists %I on public.%I', v_table || '_prevent_tenant_reassignment', v_table);
    execute format('create trigger %I before update on public.%I for each row execute function private.prevent_tenant_reassignment()',
      v_table || '_prevent_tenant_reassignment', v_table);
  end loop;
end $$;

-- Immutable ledgers/events: corrections are compensating events, never edits.
drop trigger if exists inventory_movements_append_only on public.inventory_movements;
create trigger inventory_movements_append_only
before update or delete on public.inventory_movements
for each row execute function private.reject_ledger_mutation();

drop trigger if exists payment_webhook_events_append_only on public.payment_webhook_events;
create trigger payment_webhook_events_append_only
before update or delete on public.payment_webhook_events
for each row execute function private.reject_ledger_mutation();

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

alter table public.storefront_settings enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_category_links enable row level security;
alter table public.product_media enable row level security;
alter table public.product_variants enable row level security;
alter table public.storefront_offers enable row level security;
alter table public.storefront_collections enable row level security;
alter table public.storefront_collection_products enable row level security;
alter table public.storefront_customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_products enable row level security;
alter table public.promotion_categories enable row level security;
alter table public.promotion_redemptions enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.reseller_referral_codes enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.product_reviews enable row level security;
alter table public.product_review_media enable row level security;
alter table public.order_conversations enable row level security;
alter table public.order_messages enable row level security;
alter table public.return_requests enable row level security;
alter table public.return_items enable row level security;
alter table public.dispute_cases enable row level security;
alter table public.case_evidence enable row level security;
alter table public.seller_verifications enable row level security;

-- Public storefront configuration exposes only publishable brand content.
drop policy if exists storefront_settings_public_read on public.storefront_settings;
create policy storefront_settings_public_read on public.storefront_settings
for select to anon, authenticated using (status = 'published');
drop policy if exists storefront_settings_owner_manage on public.storefront_settings;
create policy storefront_settings_owner_manage on public.storefront_settings
for all to authenticated
using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists product_categories_public_read on public.product_categories;
create policy product_categories_public_read on public.product_categories
for select to anon, authenticated
using (is_active and is_published and exists (
  select 1 from public.storefront_settings s where s.tenant_id = product_categories.tenant_id and s.status = 'published'
));
drop policy if exists product_categories_owner_manage on public.product_categories;
create policy product_categories_owner_manage on public.product_categories
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists product_category_links_public_read on public.product_category_links;
create policy product_category_links_public_read on public.product_category_links
for select to anon, authenticated
using (exists (
  select 1 from public.products p join public.storefront_settings s on s.tenant_id = p.tenant_id
  where p.tenant_id = product_category_links.tenant_id and p.id = product_category_links.product_id
    and p.status = 'active' and p.is_demo_data = false and s.status = 'published'
) and exists (
  select 1 from public.product_categories c
  where c.tenant_id = product_category_links.tenant_id and c.id = product_category_links.category_id
    and c.is_active and c.is_published
));
drop policy if exists product_category_links_owner_manage on public.product_category_links;
create policy product_category_links_owner_manage on public.product_category_links
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists product_media_public_read on public.product_media;
create policy product_media_public_read on public.product_media
for select to anon, authenticated using (
  is_published and exists (
    select 1 from public.products p join public.storefront_settings s on s.tenant_id = p.tenant_id
    where p.tenant_id = product_media.tenant_id and p.id = product_media.product_id
      and p.status = 'active' and p.is_demo_data = false and s.status = 'published'
  )
);
drop policy if exists product_media_owner_manage on public.product_media;
create policy product_media_owner_manage on public.product_media
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.products p join public.storefront_settings s on s.tenant_id = p.tenant_id
    where p.tenant_id = product_variants.tenant_id and p.id = product_variants.product_id
      and p.status = 'active' and p.is_demo_data = false and s.status = 'published'
  )
);
drop policy if exists product_variants_owner_manage on public.product_variants;
create policy product_variants_owner_manage on public.product_variants
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists storefront_offers_public_read on public.storefront_offers;
create policy storefront_offers_public_read on public.storefront_offers
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.products p join public.storefront_settings s on s.tenant_id = p.tenant_id
    where p.tenant_id = storefront_offers.tenant_id and p.id = storefront_offers.product_id
      and p.status = 'active' and p.is_demo_data = false and s.status = 'published'
  ) and (effective_from is null or effective_from <= now())
    and (effective_until is null or effective_until > now())
);
drop policy if exists storefront_offers_owner_manage on public.storefront_offers;
create policy storefront_offers_owner_manage on public.storefront_offers
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists storefront_collections_public_read on public.storefront_collections;
create policy storefront_collections_public_read on public.storefront_collections
for select to anon, authenticated using (
  is_published and exists (select 1 from public.storefront_settings s where s.tenant_id = storefront_collections.tenant_id and s.status = 'published')
  and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
);
drop policy if exists storefront_collections_owner_manage on public.storefront_collections;
create policy storefront_collections_owner_manage on public.storefront_collections
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists storefront_collection_products_public_read on public.storefront_collection_products;
create policy storefront_collection_products_public_read on public.storefront_collection_products
for select to anon, authenticated using (
  exists (select 1 from public.storefront_collections c where c.tenant_id = storefront_collection_products.tenant_id and c.id = storefront_collection_products.collection_id and c.is_published)
);
drop policy if exists storefront_collection_products_owner_manage on public.storefront_collection_products;
create policy storefront_collection_products_owner_manage on public.storefront_collection_products
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

-- Customer data is self-only; Owner does not receive an unrestricted address-book read.
drop policy if exists storefront_customers_self_read on public.storefront_customers;
create policy storefront_customers_self_read on public.storefront_customers
for select to authenticated using (user_id = (select auth.uid()) or private.is_tenant_owner(tenant_id));
drop policy if exists storefront_customers_self_insert on public.storefront_customers;
create policy storefront_customers_self_insert on public.storefront_customers
for insert to authenticated with check (user_id = (select auth.uid()) and exists (
  select 1 from public.storefront_settings s where s.tenant_id = storefront_customers.tenant_id and s.status = 'published'
));
drop policy if exists storefront_customers_self_update on public.storefront_customers;
create policy storefront_customers_self_update on public.storefront_customers
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists customer_addresses_self_manage on public.customer_addresses;
create policy customer_addresses_self_manage on public.customer_addresses
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.storefront_customers c
  where c.tenant_id = customer_addresses.tenant_id and c.id = customer_addresses.customer_id and c.user_id = (select auth.uid())
));

drop policy if exists carts_self_manage on public.carts;
create policy carts_self_manage on public.carts
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.storefront_customers c
  where c.tenant_id = carts.tenant_id and c.id = carts.customer_id and c.user_id = (select auth.uid())
));

drop policy if exists cart_items_self_manage on public.cart_items;
create policy cart_items_self_manage on public.cart_items
for all to authenticated using (exists (
  select 1 from public.carts c where c.tenant_id = cart_items.tenant_id and c.id = cart_items.cart_id and c.user_id = (select auth.uid()) and c.status = 'active'
)) with check (exists (
  select 1 from public.carts c where c.tenant_id = cart_items.tenant_id and c.id = cart_items.cart_id and c.user_id = (select auth.uid()) and c.status = 'active'
));

drop policy if exists wishlist_self_manage on public.wishlist_items;
create policy wishlist_self_manage on public.wishlist_items
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Promotions are public only when published and in their active time window.
drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read on public.promotions
for select to anon, authenticated using (
  is_active and is_published
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
  and exists (select 1 from public.storefront_settings s where s.tenant_id = promotions.tenant_id and s.status = 'published')
);
drop policy if exists promotions_owner_manage on public.promotions;
create policy promotions_owner_manage on public.promotions
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists promotion_products_public_read on public.promotion_products;
create policy promotion_products_public_read on public.promotion_products
for select to anon, authenticated using (exists (
  select 1 from public.promotions p where p.tenant_id = promotion_products.tenant_id and p.id = promotion_products.promotion_id and p.is_active and p.is_published
));
drop policy if exists promotion_products_owner_manage on public.promotion_products;
create policy promotion_products_owner_manage on public.promotion_products
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists promotion_categories_public_read on public.promotion_categories;
create policy promotion_categories_public_read on public.promotion_categories
for select to anon, authenticated using (exists (
  select 1 from public.promotions p where p.tenant_id = promotion_categories.tenant_id and p.id = promotion_categories.promotion_id and p.is_active and p.is_published
));
drop policy if exists promotion_categories_owner_manage on public.promotion_categories;
create policy promotion_categories_owner_manage on public.promotion_categories
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists promotion_redemptions_self_owner_read on public.promotion_redemptions;
create policy promotion_redemptions_self_owner_read on public.promotion_redemptions
for select to authenticated using (customer_id = (select auth.uid()) or private.is_tenant_owner(tenant_id));

-- Shipping options/rates can be shown publicly; only Owner configures rate cards.
drop policy if exists shipping_zones_public_read on public.shipping_zones;
create policy shipping_zones_public_read on public.shipping_zones
for select to anon, authenticated using (is_active and exists (
  select 1 from public.storefront_settings s where s.tenant_id = shipping_zones.tenant_id and s.status = 'published'
));
drop policy if exists shipping_zones_owner_manage on public.shipping_zones;
create policy shipping_zones_owner_manage on public.shipping_zones
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists shipping_methods_public_read on public.shipping_methods;
create policy shipping_methods_public_read on public.shipping_methods
for select to anon, authenticated using (is_active and exists (
  select 1 from public.storefront_settings s where s.tenant_id = shipping_methods.tenant_id and s.status = 'published'
));
drop policy if exists shipping_methods_owner_manage on public.shipping_methods;
create policy shipping_methods_owner_manage on public.shipping_methods
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists shipping_rates_public_read on public.shipping_rates;
create policy shipping_rates_public_read on public.shipping_rates
for select to anon, authenticated using (is_active and exists (
  select 1 from public.storefront_settings s where s.tenant_id = shipping_rates.tenant_id and s.status = 'published'
));
drop policy if exists shipping_rates_owner_manage on public.shipping_rates;
create policy shipping_rates_owner_manage on public.shipping_rates
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

-- Buyer, assigned reseller and Owner may see shipment status; only Owner writes shipment operations.
drop policy if exists shipments_participants_read on public.shipments;
create policy shipments_participants_read on public.shipments
for select to authenticated using (
  private.is_tenant_owner(tenant_id) or exists (
    select 1 from public.orders o
    where o.tenant_id = shipments.tenant_id and o.id = shipments.order_id
      and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
  )
);
drop policy if exists shipments_owner_manage on public.shipments;
create policy shipments_owner_manage on public.shipments
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists shipment_events_participants_read on public.shipment_events;
create policy shipment_events_participants_read on public.shipment_events
for select to authenticated using (
  private.is_tenant_owner(tenant_id) or exists (
    select 1 from public.shipments sh join public.orders o on o.tenant_id = sh.tenant_id and o.id = sh.order_id
    where sh.tenant_id = shipment_events.tenant_id and sh.id = shipment_events.shipment_id
      and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
  )
);
drop policy if exists shipment_events_owner_manage on public.shipment_events;
create policy shipment_events_owner_manage on public.shipment_events
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

-- Referral codes are visible to their reseller and Owner only.
drop policy if exists referral_codes_self_owner_read on public.reseller_referral_codes;
create policy referral_codes_self_owner_read on public.reseller_referral_codes
for select to authenticated using (reseller_id = (select auth.uid()) or private.is_tenant_owner(tenant_id));
drop policy if exists referral_codes_owner_manage on public.reseller_referral_codes;
create policy referral_codes_owner_manage on public.reseller_referral_codes
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

-- Payment intent details only go to the buyer, attributed reseller, or Owner.
drop policy if exists payment_transactions_participant_read on public.payment_transactions;
create policy payment_transactions_participant_read on public.payment_transactions
for select to authenticated using (
  private.is_tenant_owner(tenant_id) or exists (
    select 1 from public.orders o where o.tenant_id = payment_transactions.tenant_id and o.id = payment_transactions.order_id
      and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
  )
);

drop policy if exists inventory_movements_owner_read on public.inventory_movements;
create policy inventory_movements_owner_read on public.inventory_movements
for select to authenticated using (private.is_tenant_owner(tenant_id));

-- Reviews are public only after moderation; authors can read their own pending review.
drop policy if exists product_reviews_public_read on public.product_reviews;
create policy product_reviews_public_read on public.product_reviews
for select to anon, authenticated using (
  status = 'published' and exists (
    select 1 from public.storefront_settings s where s.tenant_id = product_reviews.tenant_id and s.status = 'published'
  )
);
drop policy if exists product_reviews_author_owner_read on public.product_reviews;
create policy product_reviews_author_owner_read on public.product_reviews
for select to authenticated using (customer_id = (select auth.uid()) or private.is_tenant_owner(tenant_id));
drop policy if exists product_reviews_verified_insert on public.product_reviews;
create policy product_reviews_verified_insert on public.product_reviews
for insert to authenticated with check (
  customer_id = (select auth.uid())
  and is_verified_purchase = true
  and exists (
    select 1 from public.orders o
    join public.order_items oi on oi.tenant_id = o.tenant_id and oi.order_id = o.id
    where o.tenant_id = product_reviews.tenant_id and o.id = product_reviews.order_id
      and oi.id = product_reviews.order_item_id and oi.product_id = product_reviews.product_id
      and o.customer_id = (select auth.uid())
      and o.payment_status = 'verified'
      and o.status in ('delivered','completed')
  )
);
drop policy if exists product_reviews_owner_update on public.product_reviews;
create policy product_reviews_owner_update on public.product_reviews
for update to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists product_review_media_public_read on public.product_review_media;
create policy product_review_media_public_read on public.product_review_media
for select to anon, authenticated using (exists (
  select 1 from public.product_reviews r where r.tenant_id = product_review_media.tenant_id and r.id = product_review_media.review_id and r.status = 'published'
));
drop policy if exists product_review_media_author_owner_manage on public.product_review_media;
create policy product_review_media_author_owner_manage on public.product_review_media
for all to authenticated using (private.is_tenant_owner(tenant_id) or exists (
  select 1 from public.product_reviews r where r.tenant_id = product_review_media.tenant_id and r.id = product_review_media.review_id and r.customer_id = (select auth.uid())
)) with check (private.is_tenant_owner(tenant_id) or exists (
  select 1 from public.product_reviews r where r.tenant_id = product_review_media.tenant_id and r.id = product_review_media.review_id and r.customer_id = (select auth.uid())
));

-- Order chat is available only to parties on that exact order.
drop policy if exists order_conversations_participant_read on public.order_conversations;
create policy order_conversations_participant_read on public.order_conversations
for select to authenticated using (
  private.is_tenant_owner(tenant_id) or exists (
    select 1 from public.orders o where o.tenant_id = order_conversations.tenant_id and o.id = order_conversations.order_id
      and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
  )
);
drop policy if exists order_conversations_owner_manage on public.order_conversations;
create policy order_conversations_owner_manage on public.order_conversations
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists order_messages_participant_read on public.order_messages;
create policy order_messages_participant_read on public.order_messages
for select to authenticated using (
  private.is_tenant_owner(tenant_id) or exists (
    select 1 from public.order_conversations c join public.orders o on o.tenant_id = c.tenant_id and o.id = c.order_id
    where c.tenant_id = order_messages.tenant_id and c.id = order_messages.conversation_id
      and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
  )
);
drop policy if exists order_messages_participant_insert on public.order_messages;
create policy order_messages_participant_insert on public.order_messages
for insert to authenticated with check (
  sender_id = (select auth.uid()) and exists (
    select 1 from public.order_conversations c join public.orders o on o.tenant_id = c.tenant_id and o.id = c.order_id
    where c.tenant_id = order_messages.tenant_id and c.id = order_messages.conversation_id
      and c.status = 'open'
      and (private.is_tenant_owner(o.tenant_id) or o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
  )
);

-- Returns/disputes: customers and attributed resellers can open; Owner reviews.
drop policy if exists return_requests_participant_read on public.return_requests;
create policy return_requests_participant_read on public.return_requests
for select to authenticated using (
  private.is_tenant_owner(tenant_id) or requested_by = (select auth.uid()) or exists (
    select 1 from public.orders o where o.tenant_id = return_requests.tenant_id and o.id = return_requests.order_id
      and o.reseller_id = (select auth.uid())
  )
);
drop policy if exists return_requests_customer_insert on public.return_requests;
create policy return_requests_customer_insert on public.return_requests
for insert to authenticated with check (
  requested_by = (select auth.uid()) and exists (
    select 1 from public.orders o where o.tenant_id = return_requests.tenant_id and o.id = return_requests.order_id
      and o.customer_id = (select auth.uid()) and o.payment_status = 'verified'
      and o.status in ('delivered','completed')
  )
);
drop policy if exists return_requests_owner_update on public.return_requests;
create policy return_requests_owner_update on public.return_requests
for update to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists return_items_participant_read on public.return_items;
create policy return_items_participant_read on public.return_items
for select to authenticated using (exists (
  select 1 from public.return_requests r where r.tenant_id = return_items.tenant_id and r.id = return_items.return_request_id
    and (private.is_tenant_owner(r.tenant_id) or r.requested_by = (select auth.uid()))
));
drop policy if exists return_items_customer_insert on public.return_items;
create policy return_items_customer_insert on public.return_items
for insert to authenticated with check (exists (
  select 1 from public.return_requests r where r.tenant_id = return_items.tenant_id and r.id = return_items.return_request_id
    and r.requested_by = (select auth.uid()) and r.status = 'requested'
));

drop policy if exists dispute_cases_participant_read on public.dispute_cases;
create policy dispute_cases_participant_read on public.dispute_cases
for select to authenticated using (
  private.is_tenant_owner(tenant_id) or opened_by = (select auth.uid()) or exists (
    select 1 from public.orders o where o.tenant_id = dispute_cases.tenant_id and o.id = dispute_cases.order_id
      and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
  )
);
drop policy if exists dispute_cases_customer_reseller_insert on public.dispute_cases;
create policy dispute_cases_customer_reseller_insert on public.dispute_cases
for insert to authenticated with check (
  opened_by = (select auth.uid()) and exists (
    select 1 from public.orders o where o.tenant_id = dispute_cases.tenant_id and o.id = dispute_cases.order_id
      and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
      and o.payment_status in ('verified','submitted')
  )
);
drop policy if exists dispute_cases_owner_update on public.dispute_cases;
create policy dispute_cases_owner_update on public.dispute_cases
for update to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

drop policy if exists case_evidence_participant_read on public.case_evidence;
create policy case_evidence_participant_read on public.case_evidence
for select to authenticated using (
  private.is_tenant_owner(tenant_id) or uploaded_by = (select auth.uid())
  or exists (
    select 1 from public.dispute_cases d join public.orders o on o.tenant_id = d.tenant_id and o.id = d.order_id
    where d.tenant_id = case_evidence.tenant_id and d.id = case_evidence.dispute_case_id
      and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
  )
  or exists (
    select 1 from public.return_requests r join public.orders o on o.tenant_id = r.tenant_id and o.id = r.order_id
    where r.tenant_id = case_evidence.tenant_id and r.id = case_evidence.return_request_id
      and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
  )
);
drop policy if exists case_evidence_participant_insert on public.case_evidence;
create policy case_evidence_participant_insert on public.case_evidence
for insert to authenticated with check (
  uploaded_by = (select auth.uid())
  and (
    private.is_tenant_owner(tenant_id)
    or exists (
      select 1 from public.dispute_cases d join public.orders o on o.tenant_id = d.tenant_id and o.id = d.order_id
      where d.tenant_id = case_evidence.tenant_id and d.id = case_evidence.dispute_case_id
        and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
    )
    or exists (
      select 1 from public.return_requests r join public.orders o on o.tenant_id = r.tenant_id and o.id = r.order_id
      where r.tenant_id = case_evidence.tenant_id and r.id = case_evidence.return_request_id
        and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
    )
  )
);

-- Verification data/evidence is Owner-only; never expose identity evidence publicly.
drop policy if exists seller_verifications_owner_read on public.seller_verifications;
create policy seller_verifications_owner_read on public.seller_verifications
for select to authenticated using (private.is_tenant_owner(tenant_id));
drop policy if exists seller_verifications_owner_manage on public.seller_verifications;
create policy seller_verifications_owner_manage on public.seller_verifications
for all to authenticated using (private.is_tenant_owner(tenant_id))
with check (private.is_tenant_owner(tenant_id));

-- Extend existing order access to the purchaser and purchaser's item detail.
drop policy if exists orders_select_reseller_or_owner on public.orders;
create policy orders_select_reseller_owner_or_customer on public.orders
for select to authenticated using (
  private.is_tenant_owner(tenant_id)
  or (reseller_id = (select auth.uid()) and private.is_tenant_member(tenant_id))
  or customer_id = (select auth.uid())
);

drop policy if exists order_items_select_via_order on public.order_items;
create policy order_items_select_via_order on public.order_items
for select to authenticated using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.tenant_id = order_items.tenant_id
      and (
        private.is_tenant_owner(o.tenant_id)
        or (o.reseller_id = (select auth.uid()) and private.is_tenant_member(o.tenant_id))
        or o.customer_id = (select auth.uid())
      )
  )
);

-- ---------------------------------------------------------------------------
-- Safe public projections. Public roles receive only columns required by the
-- storefront; HPP and reseller commission are intentionally excluded.
-- ---------------------------------------------------------------------------

drop view if exists public.storefront_catalog_products;
create view public.storefront_catalog_products
with (security_barrier = true, security_invoker = true) as
select
  p.id, p.tenant_id, s.public_slug, p.sku, p.name, p.description,
  p.image_url, p.weight_grams, p.status,
  coalesce(o.sale_price, o.regular_price) as current_price,
  o.regular_price as compare_at_price,
  o.currency_code,
  o.effective_until as offer_ends_at
from public.products p
join public.storefront_settings s on s.tenant_id = p.tenant_id and s.status = 'published'
left join public.storefront_offers o
  on o.tenant_id = p.tenant_id and o.product_id = p.id and o.is_active
  and (o.effective_from is null or o.effective_from <= now())
  and (o.effective_until is null or o.effective_until > now())
where p.status = 'active' and p.is_demo_data = false;

drop view if exists public.storefront_catalog_categories;
create view public.storefront_catalog_categories
with (security_barrier = true, security_invoker = true) as
select c.id, c.tenant_id, s.public_slug, c.parent_id, c.slug, c.name, c.description, c.image_path, c.sort_order
from public.product_categories c
join public.storefront_settings s on s.tenant_id = c.tenant_id and s.status = 'published'
where c.is_active and c.is_published;

drop view if exists public.storefront_catalog_media;
create view public.storefront_catalog_media
with (security_barrier = true, security_invoker = true) as
select m.id, m.tenant_id, s.public_slug, m.product_id, m.media_type, m.storage_bucket, m.storage_path,
       m.alt_text, m.caption, m.sort_order, m.is_cover
from public.product_media m
join public.storefront_settings s on s.tenant_id = m.tenant_id and s.status = 'published'
join public.products p on p.tenant_id = m.tenant_id and p.id = m.product_id
where m.is_published and p.status = 'active' and p.is_demo_data = false;

drop view if exists public.storefront_catalog_variants;
create view public.storefront_catalog_variants
with (security_barrier = true, security_invoker = true) as
select v.id, v.tenant_id, s.public_slug, v.product_id, v.sku, v.option_values, v.image_path,
       v.weight_grams, greatest(v.stock_quantity - v.reserved_quantity, 0) as available_quantity
from public.product_variants v
join public.storefront_settings s on s.tenant_id = v.tenant_id and s.status = 'published'
join public.products p on p.tenant_id = v.tenant_id and p.id = v.product_id
where v.is_active and p.status = 'active' and p.is_demo_data = false;

drop view if exists public.storefront_catalog_collections;
create view public.storefront_catalog_collections
with (security_barrier = true, security_invoker = true) as
select c.id, c.tenant_id, s.public_slug, c.slug, c.title, c.description, c.cover_path, c.section_type, c.sort_order
from public.storefront_collections c
join public.storefront_settings s on s.tenant_id = c.tenant_id and s.status = 'published'
where c.is_published and (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at > now());

drop view if exists public.owner_product_catalog;
create view public.owner_product_catalog
with (security_barrier = true, security_invoker = false) as
select p.id, p.tenant_id, p.sku, p.name, p.description, p.image_url, p.base_price,
       p.stock_quantity, p.reserved_quantity, greatest(p.stock_quantity - p.reserved_quantity, 0) as available_quantity,
       p.weight_grams, p.status, p.is_demo_data, p.created_at, p.updated_at
from public.products p
where private.is_tenant_owner(p.tenant_id);

revoke all on public.storefront_catalog_products, public.storefront_catalog_categories,
  public.storefront_catalog_media, public.storefront_catalog_variants,
  public.storefront_catalog_collections, public.owner_product_catalog
from public, anon, authenticated;
grant select on public.storefront_catalog_products, public.storefront_catalog_categories,
  public.storefront_catalog_media, public.storefront_catalog_variants,
  public.storefront_catalog_collections to anon, authenticated;
grant select on public.owner_product_catalog to authenticated;

-- Explicit public API grants; new public tables are no longer auto-exposed by default.
grant select (id, tenant_id, sku, name, description, image_url, weight_grams, status)
  on public.products to anon, authenticated;
grant select (id, tenant_id, is_demo_data)
  on public.products to anon;
grant select (id, tenant_id, parent_id, slug, name, description, image_path, sort_order, is_active, is_published)
  on public.product_categories to anon, authenticated;
grant select (id, tenant_id, product_id, media_type, storage_bucket, storage_path, alt_text, caption, sort_order, is_cover, is_published)
  on public.product_media to anon, authenticated;
grant select (id, tenant_id, product_id, sku, option_values, image_path, weight_grams, stock_quantity, reserved_quantity, is_active, sort_order)
  on public.product_variants to anon, authenticated;
grant select (id, tenant_id, product_id, regular_price, sale_price, currency_code, effective_from, effective_until, is_active)
  on public.storefront_offers to anon, authenticated;

grant select on public.storefront_settings, public.storefront_collections,
  public.storefront_collection_products, public.promotions, public.promotion_products,
  public.promotion_categories, public.shipping_zones, public.shipping_methods,
  public.shipping_rates, public.product_reviews, public.product_review_media
to anon, authenticated;

grant select, insert, update, delete on public.storefront_settings,
  public.product_categories, public.product_category_links, public.product_media,
  public.product_variants, public.storefront_offers, public.storefront_collections,
  public.storefront_collection_products, public.storefront_customers,
  public.customer_addresses, public.carts, public.cart_items, public.wishlist_items,
  public.promotions, public.promotion_products, public.promotion_categories,
  public.shipping_zones, public.shipping_methods, public.shipping_rates,
  public.order_conversations, public.order_messages, public.return_requests,
  public.return_items, public.dispute_cases, public.case_evidence,
  public.seller_verifications, public.reseller_referral_codes
to authenticated;

grant select on public.promotion_redemptions, public.shipments, public.shipment_events,
  public.payment_transactions, public.inventory_movements, public.dispute_cases,
  public.return_requests, public.return_items, public.case_evidence,
  public.reseller_referral_codes
to authenticated;

-- Do not allow browser clients to write financial/payment/inventory ledgers or
-- webhook events. Trusted service_role retains backend privileges.
revoke insert, update, delete on public.payment_transactions, public.payment_webhook_events,
  public.inventory_movements, public.payment_webhook_events
from anon, authenticated;
grant all privileges on public.storefront_settings, public.product_categories, public.product_category_links,
  public.product_media, public.product_variants, public.storefront_offers, public.storefront_collections,
  public.storefront_collection_products, public.storefront_customers, public.customer_addresses,
  public.carts, public.cart_items, public.wishlist_items, public.promotions, public.promotion_products,
  public.promotion_categories, public.promotion_redemptions, public.shipping_zones,
  public.shipping_methods, public.shipping_rates, public.shipments, public.shipment_events,
  public.reseller_referral_codes, public.payment_transactions, public.payment_webhook_events,
  public.inventory_movements, public.product_reviews, public.product_review_media,
  public.order_conversations, public.order_messages, public.return_requests, public.return_items,
  public.dispute_cases, public.case_evidence, public.seller_verifications
to service_role;

-- ---------------------------------------------------------------------------
-- Atomic checkout and stock lifecycle
-- ---------------------------------------------------------------------------

create or replace function public.checkout_storefront_cart(
  p_public_slug text,
  p_cart_id uuid,
  p_address_id uuid,
  p_shipping_rate_id uuid,
  p_referral_code text default null,
  p_coupon_code text default null,
  p_idempotency_key text default null
)
returns table (order_id uuid, order_number text, total_amount numeric, payment_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_store_status text;
  v_customer_id uuid;
  v_cart public.carts%rowtype;
  v_address public.customer_addresses%rowtype;
  v_rate public.shipping_rates%rowtype;
  v_method public.shipping_methods%rowtype;
  v_referral public.reseller_referral_codes%rowtype;
  v_tier public.reseller_tier;
  v_reseller_id uuid;
  v_promotion public.promotions%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(14,2) := 0;
  v_shipping numeric(14,2) := 0;
  v_discount numeric(14,2) := 0;
  v_total_weight integer := 0;
  v_total numeric(14,2) := 0;
  v_line_price numeric(14,2);
  v_line_commission numeric(14,2);
  v_line_total numeric(14,2);
  v_quantity integer;
  v_product record;
  v_variant record;
  v_item record;
  v_snapshot jsonb := '[]'::jsonb;
  v_coupon text := nullif(upper(trim(coalesce(p_coupon_code,''))), '');
  v_referral_code text := nullif(upper(trim(coalesce(p_referral_code,''))), '');
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 12 or length(p_idempotency_key) > 120 then
    raise exception 'valid_idempotency_key_required' using errcode = '22023';
  end if;

  select s.tenant_id, s.status into v_tenant_id, v_store_status
  from public.storefront_settings s
  where s.public_slug = lower(trim(p_public_slug))
  limit 1;
  if v_tenant_id is null or v_store_status <> 'published' then
    raise exception 'storefront_not_available' using errcode = 'P0002';
  end if;

  select o.id, o.order_number, o.total_amount, o.payment_status
    into order_id, order_number, total_amount, payment_status
  from public.orders o
  where o.tenant_id = v_tenant_id and o.customer_id = v_user_id
    and o.checkout_idempotency_key = p_idempotency_key
  limit 1;
  if order_id is not null then return next; return; end if;

  select c.* into v_cart from public.carts c
  where c.id = p_cart_id and c.tenant_id = v_tenant_id and c.user_id = v_user_id and c.status = 'active'
  for update;
  if not found then raise exception 'active_cart_not_found' using errcode = 'P0002'; end if;

  select c.id into v_customer_id from public.storefront_customers c
  where c.tenant_id = v_tenant_id and c.user_id = v_user_id;
  if v_customer_id is null then
    insert into public.storefront_customers(tenant_id,user_id,display_name,email,phone)
    select v_tenant_id, u.id, u.full_name, au.email, u.phone
    from public.users u join auth.users au on au.id = u.id
    where u.id = v_user_id
    returning id into v_customer_id;
  end if;
  if v_customer_id is null then raise exception 'customer_profile_required' using errcode = 'P0002'; end if;

  select a.* into v_address from public.customer_addresses a
  where a.id = p_address_id and a.tenant_id = v_tenant_id
    and a.customer_id = v_customer_id and a.user_id = v_user_id;
  if not found then raise exception 'shipping_address_not_found' using errcode = 'P0002'; end if;

  select r.* into v_rate from public.shipping_rates r
  where r.id = p_shipping_rate_id and r.tenant_id = v_tenant_id and r.is_active;
  if not found then raise exception 'shipping_rate_not_available' using errcode = 'P0002'; end if;

  select m.* into v_method from public.shipping_methods m
  where m.id = v_rate.shipping_method_id and m.tenant_id = v_tenant_id and m.is_active;
  if not found then raise exception 'shipping_method_not_available' using errcode = 'P0002'; end if;

  if not exists (
    select 1 from public.shipping_zones z
    where z.id = v_rate.shipping_zone_id and z.tenant_id = v_tenant_id and z.is_active
      and (
        (v_address.province_code is not null and v_address.province_code = any(z.province_codes))
        or (v_address.city_code is not null and v_address.city_code = any(z.city_codes))
        or (v_address.postal_code is not null and exists (
          select 1 from unnest(z.postal_prefixes) as prefix where v_address.postal_code like prefix || '%'
        ))
      )
  ) then
    raise exception 'shipping_not_available_for_address' using errcode = 'P0002';
  end if;

  if v_referral_code is not null then
    select rc.* into v_referral
    from public.reseller_referral_codes rc
    join public.tenant_memberships tm on tm.tenant_id = rc.tenant_id and tm.user_id = rc.reseller_id
    where rc.tenant_id = v_tenant_id and rc.code = v_referral_code
      and rc.status = 'active' and tm.role = 'reseller' and tm.is_active
      and (rc.starts_at is null or rc.starts_at <= v_now)
      and (rc.ends_at is null or rc.ends_at > v_now);
    if not found then raise exception 'referral_code_invalid' using errcode = '22023'; end if;
    v_reseller_id := v_referral.reseller_id;
    select tm.reseller_tier into v_tier from public.tenant_memberships tm
    where tm.tenant_id = v_tenant_id and tm.user_id = v_reseller_id and tm.role = 'reseller' and tm.is_active;
    if v_tier is null then raise exception 'reseller_membership_inactive' using errcode = '22023'; end if;
  end if;

  for v_item in
    select ci.* from public.cart_items ci
    where ci.tenant_id = v_tenant_id and ci.cart_id = v_cart.id
    order by ci.created_at, ci.id
  loop
    select p.id, p.sku, p.name, p.description, p.weight_grams, p.stock_quantity, p.reserved_quantity,
           p.status, p.is_demo_data
      into v_product
    from public.products p
    where p.tenant_id = v_tenant_id and p.id = v_item.product_id
    for update;
    if not found or v_product.status <> 'active' or v_product.is_demo_data then
      raise exception 'product_not_available:%', v_item.product_id using errcode = 'P0002';
    end if;

    v_quantity := v_item.quantity;
    if v_product.stock_quantity - v_product.reserved_quantity < v_quantity then
      raise exception 'insufficient_stock:%', v_product.name using errcode = 'P0001';
    end if;

    if v_item.variant_id is not null then
      select pv.id, pv.sku, pv.option_values, pv.weight_grams, pv.stock_quantity, pv.reserved_quantity, pv.is_active
        into v_variant
      from public.product_variants pv
      where pv.tenant_id = v_tenant_id and pv.product_id = v_product.id and pv.id = v_item.variant_id
      for update;
      if not found or not v_variant.is_active then
        raise exception 'product_variant_not_available:%', v_product.name using errcode = 'P0002';
      end if;
      if v_variant.stock_quantity - v_variant.reserved_quantity < v_quantity then
        raise exception 'insufficient_variant_stock:%', v_variant.sku using errcode = 'P0001';
      end if;
    else
      v_variant := null;
    end if;

    if v_reseller_id is not null then
      select tp.selling_price, tp.commission_amount
        into v_line_price, v_line_commission
      from public.product_tier_prices tp
      where tp.tenant_id = v_tenant_id and tp.product_id = v_product.id and tp.tier = v_tier;
      if v_line_price is null then raise exception 'reseller_price_missing:%', v_product.name using errcode = 'P0002'; end if;
    else
      select coalesce(o.sale_price, o.regular_price), 0
        into v_line_price, v_line_commission
      from public.storefront_offers o
      where o.tenant_id = v_tenant_id and o.product_id = v_product.id and o.is_active
        and (o.effective_from is null or o.effective_from <= v_now)
        and (o.effective_until is null or o.effective_until > v_now);
      if v_line_price is null then raise exception 'direct_store_offer_missing:%', v_product.name using errcode = 'P0002'; end if;
    end if;

    v_line_total := v_line_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_total_weight := v_total_weight + coalesce(v_variant.weight_grams, v_product.weight_grams, 0) * v_quantity;

    v_snapshot := v_snapshot || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'variant_id', v_item.variant_id,
      'product_name', v_product.name,
      'sku', coalesce(v_variant.sku, v_product.sku),
      'variant_options', coalesce(v_variant.option_values, '{}'::jsonb),
      'quantity', v_quantity,
      'unit_price', v_line_price,
      'commission_amount', v_line_commission,
      'line_total', v_line_total,
      'weight_grams', coalesce(v_variant.weight_grams, v_product.weight_grams, 0)
    ));
  end loop;

  if jsonb_array_length(v_snapshot) = 0 then raise exception 'cart_is_empty' using errcode = 'P0002'; end if;

  v_shipping := greatest(v_rate.minimum_fee, v_rate.base_fee + (ceil(v_total_weight::numeric / 1000) * v_rate.fee_per_kg));
  if v_rate.maximum_fee is not null then v_shipping := least(v_shipping, v_rate.maximum_fee); end if;
  if v_rate.free_shipping_minimum is not null and v_subtotal >= v_rate.free_shipping_minimum then v_shipping := 0; end if;

  if v_coupon is not null then
    select p.* into v_promotion
    from public.promotions p
    where p.tenant_id = v_tenant_id and p.code = v_coupon
      and p.is_active and p.is_published
      and (p.starts_at is null or p.starts_at <= v_now)
      and (p.ends_at is null or p.ends_at > v_now)
      and v_subtotal >= p.minimum_subtotal
      and (p.usage_limit_total is null or p.usage_count < p.usage_limit_total)
      and (p.eligible_tiers is null or v_tier = any(p.eligible_tiers))
      and (p.usage_limit_per_customer is null or (
        select count(*) from public.promotion_redemptions pr
        where pr.tenant_id = v_tenant_id and pr.promotion_id = p.id and pr.customer_id = v_user_id
      ) < p.usage_limit_per_customer)
    limit 1;
    if not found then raise exception 'coupon_not_eligible' using errcode = '22023'; end if;

    if v_promotion.discount_type = 'percentage' then
      v_discount := round(v_subtotal * v_promotion.discount_value / 100, 2);
    elsif v_promotion.discount_type = 'fixed_amount' then
      v_discount := least(v_subtotal, v_promotion.discount_value);
    elsif v_promotion.discount_type = 'free_shipping' then
      v_discount := v_shipping;
    end if;
    if v_promotion.max_discount is not null then v_discount := least(v_discount, v_promotion.max_discount); end if;
  end if;

  v_total := greatest(0, v_subtotal + v_shipping - v_discount);
  v_order_number := 'RK-' || to_char(v_now at time zone 'Asia/Jakarta', 'YYYYMMDD') || '-' ||
                    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders(
    tenant_id, order_number, reseller_id, status, payment_status, fulfillment_type,
    recipient_name, recipient_phone, shipping_address, subtotal, shipping_cost, discount_amount,
    total_amount, customer_id, reseller_membership_id, referral_code_id, referral_code_snapshot,
    sales_channel, customer_address_id, shipping_rate_id, checkout_idempotency_key, notes
  ) values (
    v_tenant_id, v_order_number, v_reseller_id, 'awaiting_payment', 'unpaid',
    case when v_reseller_id is null then 'self'::public.fulfillment_type else 'dropship'::public.fulfillment_type end,
    v_address.recipient_name, v_address.phone,
    jsonb_build_object(
      'recipient_name', v_address.recipient_name, 'phone', v_address.phone,
      'province_code', v_address.province_code, 'province_name', v_address.province_name,
      'city_code', v_address.city_code, 'city_name', v_address.city_name,
      'district_code', v_address.district_code, 'district_name', v_address.district_name,
      'subdistrict_name', v_address.subdistrict_name, 'postal_code', v_address.postal_code,
      'address_line', v_address.address_line, 'delivery_notes', v_address.delivery_notes
    ),
    v_subtotal, v_shipping, v_discount, v_total, v_user_id,
    case when v_reseller_id is null then null else (select tm.id from public.tenant_memberships tm where tm.tenant_id=v_tenant_id and tm.user_id=v_reseller_id) end,
    v_referral.id, v_referral_code,
    case when v_reseller_id is null then 'direct_store' else 'reseller_referral' end,
    v_address.id, v_rate.id, p_idempotency_key, 'Checkout storefront'
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(v_snapshot)
  loop
    insert into public.order_items(
      tenant_id, order_id, product_id, product_name_snapshot, sku_snapshot,
      tier_snapshot, quantity, unit_price, commission_amount, line_total,
      variant_id, variant_options_snapshot
    ) values (
      v_tenant_id, v_order_id, (v_item.value->>'product_id')::uuid,
      v_item.value->>'product_name', v_item.value->>'sku',
      v_tier, (v_item.value->>'quantity')::integer, (v_item.value->>'unit_price')::numeric,
      (v_item.value->>'commission_amount')::numeric, (v_item.value->>'line_total')::numeric,
      nullif(v_item.value->>'variant_id','')::uuid, coalesce(v_item.value->'variant_options','{}'::jsonb)
    );

    update public.products p
    set reserved_quantity = p.reserved_quantity + (v_item.value->>'quantity')::integer,
        updated_at = now()
    where p.tenant_id = v_tenant_id and p.id = (v_item.value->>'product_id')::uuid
      and p.stock_quantity - p.reserved_quantity >= (v_item.value->>'quantity')::integer;
    if not found then raise exception 'stock_changed_during_checkout' using errcode = 'P0001'; end if;

    if nullif(v_item.value->>'variant_id','') is not null then
      update public.product_variants pv
      set reserved_quantity = pv.reserved_quantity + (v_item.value->>'quantity')::integer,
          updated_at = now()
      where pv.tenant_id = v_tenant_id and pv.id = (v_item.value->>'variant_id')::uuid
        and pv.stock_quantity - pv.reserved_quantity >= (v_item.value->>'quantity')::integer;
      if not found then raise exception 'variant_stock_changed_during_checkout' using errcode = 'P0001'; end if;
    end if;

    insert into public.inventory_movements(
      tenant_id, product_id, variant_id, order_id, movement_type, quantity_delta, reason, reference_key, metadata, created_by
    ) values (
      v_tenant_id, (v_item.value->>'product_id')::uuid,
      nullif(v_item.value->>'variant_id','')::uuid, v_order_id, 'reserved',
      (v_item.value->>'quantity')::integer, 'Checkout stock reservation',
      'reserve:' || v_order_id::text || ':' || (v_item.value->>'product_id') || ':' || coalesce(v_item.value->>'variant_id','product'),
      jsonb_build_object('order_item_product_name', v_item.value->>'product_name'),
      v_user_id
    );
  end loop;

  if v_promotion.id is not null then
    insert into public.promotion_redemptions(tenant_id,promotion_id,order_id,customer_id,discount_amount)
    values (v_tenant_id,v_promotion.id,v_order_id,v_user_id,v_discount);
    update public.promotions set usage_count = usage_count + 1, updated_at = now()
    where tenant_id = v_tenant_id and id = v_promotion.id;
  end if;

  update public.carts set status = 'converted', converted_order_id = v_order_id, updated_at = now()
  where id = v_cart.id and tenant_id = v_tenant_id;

  insert into public.audit_logs(tenant_id,actor_id,action,entity_type,entity_id,details)
  values (v_tenant_id,v_user_id,'storefront_checkout_created','order',v_order_id,
    jsonb_build_object('order_number',v_order_number,'sales_channel',case when v_reseller_id is null then 'direct_store' else 'reseller_referral' end,'item_count',jsonb_array_length(v_snapshot)));

  order_id := v_order_id;
  order_number := v_order_number;
  total_amount := v_total;
  payment_status := 'unpaid';
  return next;
end;
$$;

revoke all on function public.checkout_storefront_cart(text,uuid,uuid,uuid,text,text,text) from public, anon;
grant execute on function public.checkout_storefront_cart(text,uuid,uuid,uuid,text,text,text) to authenticated;

-- Convert reserved units to sold stock only after a trusted payment verification.
create or replace function private.sync_storefront_inventory_on_order_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_movement_type text;
begin
  if new.payment_status = 'verified' and old.payment_status is distinct from 'verified' then
    v_movement_type := 'sale';
  elsif old.payment_status <> 'verified'
    and (new.payment_status in ('rejected','refunded') or new.status = 'cancelled')
    and (old.payment_status is distinct from new.payment_status or old.status is distinct from new.status) then
    v_movement_type := 'reservation_release';
  else
    return new;
  end if;

  for r in
    select im.product_id, im.variant_id, sum(im.quantity_delta)::integer as qty
    from public.inventory_movements im
    where im.tenant_id = new.tenant_id and im.order_id = new.id and im.movement_type = 'reserved'
      and not exists (
        select 1 from public.inventory_movements done
        where done.tenant_id = im.tenant_id and done.order_id = im.order_id
          and done.product_id = im.product_id and done.variant_id is not distinct from im.variant_id
          and done.movement_type in ('sale','reservation_release')
      )
    group by im.product_id, im.variant_id
  loop
    if v_movement_type = 'sale' then
      update public.products set stock_quantity = stock_quantity - r.qty,
        reserved_quantity = greatest(0,reserved_quantity-r.qty), updated_at = now()
      where tenant_id = new.tenant_id and id = r.product_id and stock_quantity >= r.qty and reserved_quantity >= r.qty;
      if not found then raise exception 'reserved_inventory_commit_failed for product %', r.product_id; end if;

      if r.variant_id is not null then
        update public.product_variants set stock_quantity = stock_quantity - r.qty,
          reserved_quantity = greatest(0,reserved_quantity-r.qty), updated_at = now()
        where tenant_id = new.tenant_id and id = r.variant_id
          and stock_quantity >= r.qty and reserved_quantity >= r.qty;
        if not found then raise exception 'reserved_variant_commit_failed for variant %', r.variant_id; end if;
      end if;
    else
      update public.products set reserved_quantity = greatest(0,reserved_quantity-r.qty), updated_at = now()
      where tenant_id = new.tenant_id and id = r.product_id and reserved_quantity >= r.qty;
      if not found then raise exception 'reservation_release_failed for product %', r.product_id; end if;
      if r.variant_id is not null then
        update public.product_variants set reserved_quantity = greatest(0,reserved_quantity-r.qty), updated_at = now()
        where tenant_id = new.tenant_id and id = r.variant_id and reserved_quantity >= r.qty;
        if not found then raise exception 'variant_reservation_release_failed for variant %', r.variant_id; end if;
      end if;
    end if;

    insert into public.inventory_movements(
      tenant_id,product_id,variant_id,order_id,movement_type,quantity_delta,reason,reference_key,metadata
    ) values (
      new.tenant_id,r.product_id,r.variant_id,new.id,v_movement_type,
      case when v_movement_type = 'sale' then -r.qty else -r.qty end,
      case when v_movement_type = 'sale' then 'Payment verified; reserved stock committed' else 'Payment rejected/refunded or order cancelled; stock released' end,
      v_movement_type || ':' || new.id::text || ':' || r.product_id::text || ':' || coalesce(r.variant_id::text,'product'),
      jsonb_build_object('order_number',new.order_number)
    );
  end loop;
  return new;
end;
$$;

revoke all on function private.sync_storefront_inventory_on_order_transition() from public, anon, authenticated;
drop trigger if exists orders_sync_storefront_inventory on public.orders;
create trigger orders_sync_storefront_inventory
after update of payment_status, status on public.orders
for each row execute function private.sync_storefront_inventory_on_order_transition();

-- ---------------------------------------------------------------------------
-- Storage buckets: public catalogue media is isolated from private evidence.
-- ---------------------------------------------------------------------------

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('storefront-media','storefront-media',true,26214400,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
  ('commerce-evidence','commerce-evidence',false,26214400,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists resellerku_storefront_media_insert on storage.objects;
create policy resellerku_storefront_media_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'storefront-media'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
  and split_part(name,'/',2) = 'products'
  and exists (
    select 1 from public.products p
    where p.tenant_id = private.storage_path_tenant_id(objects.name)
      and p.id = private.storage_path_product_id(objects.name)
  )
);

drop policy if exists resellerku_storefront_media_update on storage.objects;
create policy resellerku_storefront_media_update on storage.objects
for update to authenticated using (
  bucket_id = 'storefront-media'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
) with check (
  bucket_id = 'storefront-media'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
);

drop policy if exists resellerku_storefront_media_delete on storage.objects;
create policy resellerku_storefront_media_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'storefront-media'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
);

drop policy if exists resellerku_commerce_evidence_insert on storage.objects;
create policy resellerku_commerce_evidence_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'commerce-evidence'
  and exists (
    select 1 from public.case_evidence e
    where e.tenant_id = private.storage_path_tenant_id(objects.name)
      and e.storage_bucket = 'commerce-evidence'
      and e.storage_path = objects.name
      and e.uploaded_by = (select auth.uid())
  )
);

drop policy if exists resellerku_commerce_evidence_select on storage.objects;
create policy resellerku_commerce_evidence_select on storage.objects
for select to authenticated using (
  bucket_id = 'commerce-evidence'
  and exists (
    select 1 from public.case_evidence e
    where e.storage_bucket = 'commerce-evidence'
      and e.storage_path = objects.name
      and (
        private.is_tenant_owner(e.tenant_id)
        or e.uploaded_by = (select auth.uid())
        or exists (
          select 1 from public.dispute_cases d join public.orders o on o.tenant_id = d.tenant_id and o.id = d.order_id
          where d.tenant_id = e.tenant_id and d.id = e.dispute_case_id
            and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
        )
        or exists (
          select 1 from public.return_requests r join public.orders o on o.tenant_id = r.tenant_id and o.id = r.order_id
          where r.tenant_id = e.tenant_id and r.id = e.return_request_id
            and (o.customer_id = (select auth.uid()) or o.reseller_id = (select auth.uid()))
        )
      )
  )
);

drop policy if exists resellerku_commerce_evidence_delete on storage.objects;
create policy resellerku_commerce_evidence_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'commerce-evidence'
  and (private.is_tenant_owner(private.storage_path_tenant_id(name)) or owner = (select auth.uid())::text)
);

-- Storage uploads are performed by authenticated Owner or a pre-registered case-evidence author.
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.objects to anon;

commit;
