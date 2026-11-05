-- Stage 1 finance engine (DRAFT): wallet lifecycle and checkout pending ledger.
-- Generated for review only. Do NOT apply before SQL review, Staging tests and human approval.
begin;

alter table public.wallets
  add column if not exists outstanding_adjustment_balance numeric(14,2) not null default 0
    check (outstanding_adjustment_balance >= 0);

alter table public.order_item_commissions
  add column if not exists commission_status text not null default 'legacy',
  add column if not exists hold_period_hours_snapshot integer,
  add column if not exists released_at timestamptz,
  add column if not exists reversed_amount numeric(14,2) not null default 0
    check (reversed_amount >= 0),
  add column if not exists return_request_id uuid;

alter table public.order_item_commissions
  add constraint order_item_commissions_status_check
    check (commission_status in ('legacy','pending','available','partially_reversed','reversed')),
  add constraint order_item_commissions_hold_period_check
    check (hold_period_hours_snapshot is null or hold_period_hours_snapshot between 0 and 720),
  add constraint order_item_commissions_reversed_amount_check
    check (reversed_amount <= commission_total);

alter table public.order_item_commissions
  add constraint order_item_commissions_return_request_tenant_fk
    foreign key (tenant_id,return_request_id)
    references public.return_requests(tenant_id,id) on delete restrict;

alter table public.wallet_transactions
  add column if not exists entry_direction text,
  add column if not exists balance_bucket text,
  add column if not exists related_transaction_id uuid,
  add column if not exists order_item_commission_id uuid,
  add column if not exists payout_request_id uuid,
  add column if not exists return_request_id uuid;

alter table public.wallet_transactions
  add constraint wallet_transactions_direction_check
    check (entry_direction is null or entry_direction in ('credit','debit')),
  add constraint wallet_transactions_bucket_check
    check (balance_bucket is null or balance_bucket in ('pending','available','locked','outstanding_adjustment')),
  add constraint wallet_transactions_direction_bucket_pair_check
    check ((entry_direction is null and balance_bucket is null) or
           (entry_direction is not null and balance_bucket is not null)),
  add constraint wallet_transactions_related_transaction_fk
    foreign key (related_transaction_id) references public.wallet_transactions(id) on delete restrict,
  add constraint wallet_transactions_commission_tenant_fk
    foreign key (tenant_id,order_item_commission_id)
    references public.order_item_commissions(tenant_id,id) on delete restrict,
  add constraint wallet_transactions_payout_request_fk
    foreign key (payout_request_id) references public.payout_requests(id) on delete restrict,
  add constraint wallet_transactions_return_request_fk
    foreign key (tenant_id,return_request_id)
    references public.return_requests(tenant_id,id) on delete restrict;

create unique index if not exists payout_requests_tenant_transfer_reference_uidx
  on public.payout_requests(tenant_id,transfer_reference)
  where transfer_reference is not null;

comment on column public.wallet_transactions.entry_direction is
  'NULL only for legacy rows; new Stage 1 entries use credit/debit with positive amount.';
comment on column public.wallet_transactions.balance_bucket is
  'NULL only for legacy rows; identifies the wallet balance bucket affected.';
comment on column public.wallets.outstanding_adjustment_balance is
  'Outstanding reseller adjustment debt; blocks payout until settled.';

-- Existing ledger rows remain NULL/NULL. New checkout rows always populate both fields.
create or replace function public.checkout_storefront_cart(
  p_public_slug text,p_cart_id uuid,p_address_id uuid,p_shipping_rate_id uuid,
  p_referral_code text default null,p_coupon_code text default null,p_idempotency_key text default null
)
returns table(order_id uuid,order_number text,total_amount numeric,payment_status text)
language plpgsql security definer set search_path=''
as $function$
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
  v_discountable_subtotal numeric(14,2) := 0;
  v_total_weight integer := 0;
  v_total numeric(14,2) := 0;
  v_line_price numeric(14,2);
  v_line_commission numeric(14,2);
  v_line_total numeric(14,2);
  v_quantity integer;
  v_order_item_id uuid;
  v_wallet_id uuid;
  v_commission_id uuid;
  v_commission_total numeric(14,2);
  v_product record;
  v_variant record;
  v_variant_weight integer;
  v_variant_sku text;
  v_variant_options jsonb;
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
  if not found then
    -- A concurrent retry may have converted this cart after the initial
    -- idempotency lookup. Return its committed order rather than a false error.
    select o.id, o.order_number, o.total_amount, o.payment_status
      into order_id, order_number, total_amount, payment_status
    from public.orders o
    where o.tenant_id = v_tenant_id and o.customer_id = v_user_id
      and o.checkout_idempotency_key = p_idempotency_key
    limit 1;
    if order_id is not null then return next; return; end if;
    raise exception 'active_cart_not_found' using errcode = 'P0002';
  end if;

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
      v_variant_weight := v_variant.weight_grams;
      v_variant_sku := v_variant.sku;
      v_variant_options := v_variant.option_values;
    else
      v_variant_weight := null;
      v_variant_sku := null;
      v_variant_options := '{}'::jsonb;
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
    v_total_weight := v_total_weight + coalesce(v_variant_weight, v_product.weight_grams, 0) * v_quantity;

    v_snapshot := v_snapshot || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'variant_id', v_item.variant_id,
      'product_name', v_product.name,
      'sku', coalesce(v_variant_sku, v_product.sku),
      'variant_options', coalesce(v_variant_options, '{}'::jsonb),
      'quantity', v_quantity,
      'unit_price', v_line_price,
      'commission_amount', v_line_commission,
      'line_total', v_line_total,
      'weight_grams', coalesce(v_variant_weight, v_product.weight_grams, 0)
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
    limit 1
    for update of p;
    if not found then raise exception 'coupon_not_eligible' using errcode = '22023'; end if;

    -- Restrict product/category discounts to eligible line items. The minimum
    -- spend test remains based on the full cart subtotal.
    if v_promotion.scope = 'product' then
      select coalesce(sum((entry.value->>'line_total')::numeric),0)
        into v_discountable_subtotal
      from jsonb_array_elements(v_snapshot) as entry(value)
      where exists (
        select 1 from public.promotion_products pp
        where pp.tenant_id = v_tenant_id and pp.promotion_id = v_promotion.id
          and pp.product_id = (entry.value->>'product_id')::uuid
      );
    elsif v_promotion.scope = 'category' then
      select coalesce(sum((entry.value->>'line_total')::numeric),0)
        into v_discountable_subtotal
      from jsonb_array_elements(v_snapshot) as entry(value)
      where exists (
        select 1
        from public.product_category_links pcl
        join public.promotion_categories pc
          on pc.tenant_id = pcl.tenant_id and pc.category_id = pcl.category_id
        where pcl.tenant_id = v_tenant_id and pcl.product_id = (entry.value->>'product_id')::uuid
          and pc.promotion_id = v_promotion.id
      );
    else
      v_discountable_subtotal := v_subtotal;
    end if;
    if v_promotion.discount_type <> 'free_shipping' and v_discountable_subtotal <= 0 then
      raise exception 'coupon_not_applicable_to_cart' using errcode = '22023';
    end if;

    if v_promotion.discount_type = 'percentage' then
      v_discount := round(v_discountable_subtotal * v_promotion.discount_value / 100, 2);
    elsif v_promotion.discount_type = 'fixed_amount' then
      v_discount := least(v_discountable_subtotal, v_promotion.discount_value);
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
    )
    returning id into v_order_item_id;

    if v_reseller_id is not null then
      v_commission_total := (v_item.value->>'commission_amount')::numeric
                            * (v_item.value->>'quantity')::integer;
      insert into public.order_item_commissions(
        tenant_id,order_id,order_item_id,reseller_id,commission_per_unit,commission_total,
        tier_snapshot,commission_status,hold_period_hours_snapshot
      ) values (
        v_tenant_id,v_order_id,v_order_item_id,v_reseller_id,
        (v_item.value->>'commission_amount')::numeric,v_commission_total,
        v_tier,'pending',48
      ) returning id into v_commission_id;

      select w.id into v_wallet_id
      from public.wallets w
      where w.tenant_id=v_tenant_id and w.user_id=v_reseller_id
      for update;
      if v_wallet_id is null then
        insert into public.wallets(tenant_id,user_id)
        values(v_tenant_id,v_reseller_id)
        on conflict(tenant_id,user_id) do nothing;
        select w.id into v_wallet_id from public.wallets w
        where w.tenant_id=v_tenant_id and w.user_id=v_reseller_id for update;
      end if;
      if v_wallet_id is null then raise exception 'reseller_wallet_unavailable' using errcode='P0001'; end if;

      if v_commission_total > 0 then
        insert into public.wallet_transactions(
          tenant_id,wallet_id,user_id,order_id,transaction_type,status,amount,
          description,idempotency_key,entry_direction,balance_bucket,order_item_commission_id,posted_at
        ) values (
          v_tenant_id,v_wallet_id,v_reseller_id,v_order_id,'commission_pending','posted',
          v_commission_total,'Pending commission from checkout',
          'commission-pending:'||v_commission_id::text,'credit','pending',v_commission_id,v_now
        );
        update public.wallets
        set pending_balance=pending_balance+v_commission_total,
            updated_at=v_now
        where id=v_wallet_id and tenant_id=v_tenant_id and user_id=v_reseller_id;
      end if;
    end if;

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
$function$

-- Backend-only: release commissions only after trusted delivery + 48h and no active return/dispute.
create or replace function public.release_due_commissions(p_tenant_id uuid default null)
returns integer
language plpgsql security definer set search_path=''
as $$
declare r record; v_wallet_id uuid; v_count integer:=0; v_key text;
begin
  for r in
    select c.*, s.delivered_at
    from public.order_item_commissions c
    join public.orders o on o.tenant_id=c.tenant_id and o.id=c.order_id
    join lateral (
      select sh.delivered_at from public.shipments sh
      where sh.tenant_id=c.tenant_id and sh.order_id=c.order_id and sh.delivered_at is not null
      order by sh.delivered_at desc limit 1
    ) s on true
    where c.commission_status='pending'
      and (p_tenant_id is null or c.tenant_id=p_tenant_id)
      and s.delivered_at + make_interval(hours=>coalesce(c.hold_period_hours_snapshot,48)) <= now()
      and not exists (
        select 1 from public.return_requests rr
        where rr.tenant_id=c.tenant_id and rr.order_id=c.order_id
          and rr.status in ('requested','under_review','approved','awaiting_return','return_received')
      )
      and not exists (
        select 1 from public.dispute_cases dc
        where dc.tenant_id=c.tenant_id and dc.order_id=c.order_id
          and dc.status not in ('resolved','closed','rejected')
      )
    order by c.created_at
    for update of c skip locked
  loop
    select w.id into v_wallet_id from public.wallets w
    where w.tenant_id=r.tenant_id and w.user_id=r.reseller_id for update;
    if v_wallet_id is null then raise exception 'wallet_missing_for_commission:%',r.id; end if;
    v_key:='commission-release:'||r.id::text;
    if exists(select 1 from public.wallet_transactions where tenant_id=r.tenant_id and idempotency_key like v_key||':%') then
      if (select count(*) from public.wallet_transactions where tenant_id=r.tenant_id and idempotency_key like v_key||':%') <> 2 then
        raise exception 'partial_release_ledger_event:%',r.id;
      end if;
    else
      insert into public.wallet_transactions(tenant_id,wallet_id,user_id,order_id,transaction_type,status,amount,description,idempotency_key,entry_direction,balance_bucket,order_item_commission_id,posted_at)
      values
      (r.tenant_id,v_wallet_id,r.reseller_id,r.order_id,'commission_pending','posted',r.commission_total,'Release pending commission','commission-release:'||r.id||':pending','debit','pending',r.id,now()),
      (r.tenant_id,v_wallet_id,r.reseller_id,r.order_id,'commission_available','posted',r.commission_total,'Commission became available','commission-release:'||r.id||':available','credit','available',r.id,now());
      update public.wallets set pending_balance=pending_balance-r.commission_total,
        available_balance=available_balance+r.commission_total,updated_at=now()
      where id=v_wallet_id and pending_balance>=r.commission_total;
      if not found then raise exception 'pending_balance_mismatch:%',r.id; end if;
    end if;
    update public.order_item_commissions set commission_status='available',released_at=coalesce(released_at,now())
    where id=r.id and tenant_id=r.tenant_id;
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $$;

-- Backend-only payout request; funds move available -> locked in one transaction.
create or replace function public.create_payout_request(
  p_tenant_id uuid,p_user_id uuid,p_amount numeric,p_bank_name text,
  p_bank_account_number text,p_bank_account_name text,p_idempotency_key text
)
returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_wallet public.wallets%rowtype; v_payout_id uuid;
begin
  if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2)
     or length(trim(coalesce(p_idempotency_key,'')))<12 then
    raise exception 'invalid_payout_request' using errcode='22023';
  end if;
  select * into v_wallet from public.wallets
  where tenant_id=p_tenant_id and user_id=p_user_id for update;
  if not found then raise exception 'wallet_not_found'; end if;
  if v_wallet.outstanding_adjustment_balance>0 then raise exception 'outstanding_adjustment_blocks_payout'; end if;
  if v_wallet.available_balance<p_amount then raise exception 'insufficient_available_balance'; end if;
  insert into public.payout_requests(tenant_id,user_id,wallet_id,amount,bank_name,bank_account_number,bank_account_name,status)
  values(p_tenant_id,p_user_id,v_wallet.id,p_amount,p_bank_name,p_bank_account_number,p_bank_account_name,'requested')
  returning id into v_payout_id;
  insert into public.wallet_transactions(tenant_id,wallet_id,user_id,transaction_type,status,amount,description,idempotency_key,entry_direction,balance_bucket,payout_request_id,posted_at)
  values
  (p_tenant_id,v_wallet.id,p_user_id,'payout_hold','posted',p_amount,'Payout funds locked',p_idempotency_key||':available','debit','available',v_payout_id,now()),
  (p_tenant_id,v_wallet.id,p_user_id,'payout_hold','posted',p_amount,'Payout funds locked',p_idempotency_key||':locked','credit','locked',v_payout_id,now());
  update public.wallets set available_balance=available_balance-p_amount,
    locked_balance=locked_balance+p_amount,updated_at=now() where id=v_wallet.id;
  return v_payout_id;
end; $$;

-- Backend-only; Worker must enforce reviewer identity and human approval before calling.
create or replace function public.approve_payout_request(p_payout_request_id uuid,p_bank_transaction_reference text)
returns void
language plpgsql security definer set search_path=''
as $$
declare p public.payout_requests%rowtype;
begin
  if length(trim(coalesce(p_bank_transaction_reference,'')))<4 then
    raise exception 'bank_transaction_reference_required' using errcode='22023';
  end if;
  select * into p from public.payout_requests where id=p_payout_request_id for update;
  if not found then raise exception 'payout_request_not_found'; end if;
  if p.status='paid' then
    if p.transfer_reference=p_bank_transaction_reference then return; end if;
    raise exception 'payout_already_paid_with_different_reference';
  end if;
  if p.status not in ('requested','approved','processing') then raise exception 'payout_status_not_payable'; end if;
  perform 1 from public.wallets where id=p.wallet_id and tenant_id=p.tenant_id for update;
  insert into public.wallet_transactions(tenant_id,wallet_id,user_id,transaction_type,status,amount,description,idempotency_key,entry_direction,balance_bucket,payout_request_id,posted_at)
  values(p.tenant_id,p.wallet_id,p.user_id,'payout','posted',p.amount,'Payout settled','payout-paid:'||p.id,'debit','locked',p.id,now());
  update public.wallets set locked_balance=locked_balance-p.amount,updated_at=now()
  where id=p.wallet_id and tenant_id=p.tenant_id and locked_balance>=p.amount;
  if not found then raise exception 'locked_balance_mismatch'; end if;
  update public.payout_requests set status='paid',transfer_reference=p_bank_transaction_reference,paid_at=now(),
    reviewed_at=coalesce(reviewed_at,now()) where id=p.id;
end; $$;

-- Backend-only partial/full commission reversal after an approved/resolved return.
create or replace function public.reverse_released_commission(
  p_commission_id uuid,p_return_request_id uuid,p_returned_quantity integer,p_idempotency_key text
)
returns numeric
language plpgsql security definer set search_path=''
as $$
declare c public.order_item_commissions%rowtype; rr public.return_requests%rowtype;
  w public.wallets%rowtype; v_reverse numeric(14,2); v_available_debit numeric(14,2);
  v_debt_credit numeric(14,2); v_wallet_id uuid;
begin
  if p_returned_quantity is null or p_returned_quantity<=0 or length(trim(coalesce(p_idempotency_key,'')))<12 then
    raise exception 'invalid_reversal_request' using errcode='22023';
  end if;
  select * into c from public.order_item_commissions where id=p_commission_id for update;
  if not found then raise exception 'commission_not_found'; end if;
  select * into rr from public.return_requests
  where id=p_return_request_id and tenant_id=c.tenant_id and order_id=c.order_id for update;
  if not found or rr.status not in ('approved','resolved') then raise exception 'return_not_approved'; end if;
  if exists(select 1 from public.wallet_transactions where tenant_id=c.tenant_id and idempotency_key like p_idempotency_key||':%') then
    if (select coalesce(sum(amount),0) from public.wallet_transactions where tenant_id=c.tenant_id and idempotency_key like p_idempotency_key||':%') <>
       (select coalesce(sum(amount),0) from public.wallet_transactions where tenant_id=c.tenant_id and order_item_commission_id=c.id and return_request_id=p_return_request_id and idempotency_key like p_idempotency_key||':%') then
      raise exception 'incomplete_reversal_ledger_event';
    end if;
    return 0;
  end if;
  if p_returned_quantity>(select coalesce(sum(ri.quantity),0) from public.return_items ri
      where ri.tenant_id=c.tenant_id and ri.return_request_id=rr.id and ri.order_item_id=c.order_item_id) then
    raise exception 'returned_quantity_exceeds_approved_items';
  end if;
  if c.commission_status not in ('available','partially_reversed') then raise exception 'commission_not_released'; end if;
  v_reverse:=round(c.commission_per_unit*p_returned_quantity,2);
  if v_reverse<=0 or c.reversed_amount+v_reverse>c.commission_total then raise exception 'invalid_reversal_amount'; end if;
  select * into w from public.wallets where tenant_id=c.tenant_id and user_id=c.reseller_id for update;
  if not found then raise exception 'wallet_not_found'; end if;
  v_available_debit:=least(w.available_balance,v_reverse);
  v_debt_credit:=v_reverse-v_available_debit;
  if v_available_debit>0 then
    insert into public.wallet_transactions(tenant_id,wallet_id,user_id,order_id,transaction_type,status,amount,description,idempotency_key,entry_direction,balance_bucket,order_item_commission_id,return_request_id,posted_at)
    values(c.tenant_id,w.id,c.reseller_id,c.order_id,'reversal','posted',v_available_debit,'Returned commission reversal',p_idempotency_key||':available','debit','available',c.id,rr.id,now());
  end if;
  if v_debt_credit>0 then
    insert into public.wallet_transactions(tenant_id,wallet_id,user_id,order_id,transaction_type,status,amount,description,idempotency_key,entry_direction,balance_bucket,order_item_commission_id,return_request_id,posted_at)
    values(c.tenant_id,w.id,c.reseller_id,c.order_id,'reversal','posted',v_debt_credit,'Outstanding adjustment from returned commission',p_idempotency_key||':debt','credit','outstanding_adjustment',c.id,rr.id,now());
  end if;
  update public.wallets set available_balance=available_balance-v_available_debit,
    outstanding_adjustment_balance=outstanding_adjustment_balance+v_debt_credit,updated_at=now()
  where id=w.id and available_balance>=v_available_debit;
  if not found then raise exception 'wallet_balance_mismatch'; end if;
  update public.order_item_commissions set reversed_amount=reversed_amount+v_reverse,
    commission_status=case when reversed_amount+v_reverse>=commission_total then 'reversed' else 'partially_reversed' end,
    return_request_id=rr.id where id=c.id and tenant_id=c.tenant_id;
  return v_reverse;
end; $$;

-- All Stage 1 RPCs are callable only by service_role. Worker remains responsible
-- for JWT validation, tenant/object authorization and reviewer approval.
revoke all on function public.release_due_commissions(uuid) from public,anon,authenticated;
revoke all on function public.create_payout_request(uuid,uuid,numeric,text,text,text,text) from public,anon,authenticated;
revoke all on function public.approve_payout_request(uuid,text) from public,anon,authenticated;
revoke all on function public.reverse_released_commission(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.release_due_commissions(uuid) to service_role;
grant execute on function public.create_payout_request(uuid,uuid,numeric,text,text,text,text) to service_role;
grant execute on function public.approve_payout_request(uuid,text) to service_role;
grant execute on function public.reverse_released_commission(uuid,uuid,integer,text) to service_role;

commit;
