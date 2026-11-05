-- Checkout hardening: commission isolation, safe variant handling,
-- scoped promotion discounts, concurrency-safe coupon usage and idempotent retries.
CREATE OR REPLACE FUNCTION public.checkout_storefront_cart(p_public_slug text, p_cart_id uuid, p_address_id uuid, p_shipping_rate_id uuid, p_referral_code text DEFAULT NULL::text, p_coupon_code text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS TABLE(order_id uuid, order_number text, total_amount numeric, payment_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      insert into public.order_item_commissions(
        tenant_id,order_id,order_item_id,reseller_id,commission_per_unit,commission_total,tier_snapshot
      ) values (
        v_tenant_id,v_order_id,v_order_item_id,v_reseller_id,
        (v_item.value->>'commission_amount')::numeric,
        (v_item.value->>'commission_amount')::numeric * (v_item.value->>'quantity')::integer,
        v_tier
      );
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

