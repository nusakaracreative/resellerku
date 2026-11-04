-- RLS policy optimization for commerce tables.
-- Avoid permissive SELECT policy overlap while preserving public projections
-- for anon and adding tenant-owner access for authenticated users.
begin;

do $$
declare
  r record;
  v_auth_select text;
  v_anon_select text;
  v_write_qual text;
  v_write_check text;
begin
  for r in
    select m.tablename, m.policyname as manage_policy, m.qual as manage_qual,
           m.with_check as manage_check,
           s.policyname as select_policy, s.qual as select_qual,
           s.roles as select_roles
    from pg_policies m
    left join lateral (
      select p.policyname,p.qual,p.roles
      from pg_policies p
      where p.schemaname='public' and p.tablename=m.tablename and p.cmd='SELECT'
        and p.roles @> array['authenticated']::name[]
      order by case when p.roles @> array['anon']::name[] then 1 else 0 end, p.policyname
      limit 1
    ) s on true
    where m.schemaname='public' and m.cmd='ALL'
      and m.roles @> array['authenticated']::name[]
      and m.qual is not null and m.with_check is not null
      and m.tablename in (
        'order_conversations','product_categories','product_category_links','product_media',
        'product_review_media','product_variants','promotion_categories','promotion_products',
        'promotions','reseller_referral_codes','seller_verifications','shipment_events',
        'shipments','shipping_methods','shipping_rates','shipping_zones',
        'storefront_collection_products','storefront_collections','storefront_offers','storefront_settings'
      )
  loop
    v_write_qual := r.manage_qual;
    v_write_check := r.manage_check;

    if r.select_policy is not null then
      v_auth_select := '(' || coalesce(r.select_qual,'false') || ') OR (' || v_write_qual || ')';
      if r.select_roles @> array['anon']::name[] then
        v_anon_select := r.select_qual;
        execute format('drop policy %I on public.%I',r.select_policy,r.tablename);
        execute format('create policy %I on public.%I for select to anon using (%s)',
          left(r.tablename || '_public_read_anon',63),r.tablename,v_anon_select);
      else
        execute format('drop policy %I on public.%I',r.select_policy,r.tablename);
      end if;
    else
      v_auth_select := v_write_qual;
    end if;

    execute format('drop policy %I on public.%I',r.manage_policy,r.tablename);

    execute format('create policy %I on public.%I for select to authenticated using (%s)',
      left(r.tablename || '_authenticated_read',63),r.tablename,v_auth_select);
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)',
      left(r.tablename || '_owner_insert',63),r.tablename,v_write_check);
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
      left(r.tablename || '_owner_update',63),r.tablename,v_write_qual,v_write_check);
    execute format('create policy %I on public.%I for delete to authenticated using (%s)',
      left(r.tablename || '_owner_delete',63),r.tablename,v_write_qual);
  end loop;
end $$;

-- Combine published-review access and reviewer/Owner access into one SELECT policy.
drop policy if exists product_reviews_author_owner_read on public.product_reviews;
drop policy if exists product_reviews_public_read on public.product_reviews;
create policy product_reviews_read_published_author_owner on public.product_reviews
for select to anon, authenticated using (
  (
    status = 'published'
    and exists (
      select 1 from public.storefront_settings s
      where s.tenant_id = product_reviews.tenant_id and s.status = 'published'
    )
  )
  or customer_id = (select auth.uid())
  or private.is_tenant_owner(tenant_id)
);

commit;
