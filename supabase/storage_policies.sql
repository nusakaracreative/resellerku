-- Resellerku Storage RLS policies.
-- Standard paths:
-- product-images:   {tenant_id}/products/{product_id}/{filename}
-- marketing-assets: {tenant_id}/assets/{asset_id}/{filename}
-- brand media:      {tenant_id}/brand/{filename}
-- avatars:          {user_id}/{filename}
--
-- All buckets are private. Never use a public URL for private files.

create or replace function private.storage_path_tenant_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(coalesce(p_name, ''), '/', 1) ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
    else null
  end;
$$;

create or replace function private.storage_path_product_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(coalesce(p_name, ''), '/', 2) = 'products'
      and split_part(p_name, '/', 3) ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 3)::uuid
    else null
  end;
$$;

create or replace function private.storage_path_user_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(coalesce(p_name, ''), '/', 1) ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
    else null
  end;
$$;

revoke all on function private.storage_path_tenant_id(text) from public, anon;
revoke all on function private.storage_path_product_id(text) from public, anon;
revoke all on function private.storage_path_user_id(text) from public, anon;
grant execute on function private.storage_path_tenant_id(text) to authenticated, service_role;
grant execute on function private.storage_path_product_id(text) to authenticated, service_role;
grant execute on function private.storage_path_user_id(text) to authenticated, service_role;

-- PRODUCT IMAGES
drop policy if exists resellerku_product_images_select on storage.objects;
create policy resellerku_product_images_select
on storage.objects for select to authenticated
using (
  bucket_id = 'product-images'
  and private.is_tenant_member(private.storage_path_tenant_id(name))
  and exists (
    select 1
    from public.products p
    where p.tenant_id = private.storage_path_tenant_id(objects.name)
      and p.id = private.storage_path_product_id(objects.name)
      and (p.status = 'active' or private.is_tenant_owner(p.tenant_id))
  )
);

drop policy if exists resellerku_product_images_insert on storage.objects;
create policy resellerku_product_images_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
  and exists (
    select 1 from public.products p
    where p.tenant_id = private.storage_path_tenant_id(objects.name)
      and p.id = private.storage_path_product_id(objects.name)
  )
);

drop policy if exists resellerku_product_images_update on storage.objects;
create policy resellerku_product_images_update
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
  and exists (
    select 1 from public.products p
    where p.tenant_id = private.storage_path_tenant_id(objects.name)
      and p.id = private.storage_path_product_id(objects.name)
  )
)
with check (
  bucket_id = 'product-images'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
  and exists (
    select 1 from public.products p
    where p.tenant_id = private.storage_path_tenant_id(objects.name)
      and p.id = private.storage_path_product_id(objects.name)
  )
);

drop policy if exists resellerku_product_images_delete on storage.objects;
create policy resellerku_product_images_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
  and exists (
    select 1 from public.products p
    where p.tenant_id = private.storage_path_tenant_id(objects.name)
      and p.id = private.storage_path_product_id(objects.name)
  )
);

-- MARKETING ASSETS + BRAND MEDIA
drop policy if exists resellerku_marketing_assets_select on storage.objects;
create policy resellerku_marketing_assets_select
on storage.objects for select to authenticated
using (
  bucket_id = 'marketing-assets'
  and (
    private.is_tenant_owner(private.storage_path_tenant_id(name))
    or (
      private.is_tenant_member(private.storage_path_tenant_id(name))
      and (
        split_part(name, '/', 2) = 'brand'
        or exists (
          select 1
          from public.assets a
          where a.tenant_id = private.storage_path_tenant_id(name)
            and a.storage_bucket = 'marketing-assets'
            and a.storage_path = name
            and a.status = 'published'
        )
      )
    )
  )
);

drop policy if exists resellerku_marketing_assets_insert on storage.objects;
create policy resellerku_marketing_assets_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'marketing-assets'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
  and (
    split_part(name, '/', 2) = 'brand'
    or exists (
      select 1
      from public.assets a
      where a.tenant_id = private.storage_path_tenant_id(name)
        and a.storage_bucket = 'marketing-assets'
        and a.storage_path = name
    )
  )
);

drop policy if exists resellerku_marketing_assets_update on storage.objects;
create policy resellerku_marketing_assets_update
on storage.objects for update to authenticated
using (
  bucket_id = 'marketing-assets'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
)
with check (
  bucket_id = 'marketing-assets'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
);

drop policy if exists resellerku_marketing_assets_delete on storage.objects;
create policy resellerku_marketing_assets_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'marketing-assets'
  and private.is_tenant_owner(private.storage_path_tenant_id(name))
);

-- USER AVATARS
drop policy if exists resellerku_avatars_select on storage.objects;
create policy resellerku_avatars_select
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (
    private.storage_path_user_id(name) = (select auth.uid())
    or private.can_view_user_profile(private.storage_path_user_id(name))
  )
);

drop policy if exists resellerku_avatars_insert on storage.objects;
create policy resellerku_avatars_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and private.storage_path_user_id(name) = (select auth.uid())
);

drop policy if exists resellerku_avatars_update on storage.objects;
create policy resellerku_avatars_update
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and private.storage_path_user_id(name) = (select auth.uid())
)
with check (
  bucket_id = 'avatars'
  and private.storage_path_user_id(name) = (select auth.uid())
);

drop policy if exists resellerku_avatars_delete on storage.objects;
create policy resellerku_avatars_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and private.storage_path_user_id(name) = (select auth.uid())
);
