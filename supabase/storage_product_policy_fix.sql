-- Fix product image policy expressions to reference the outer storage object row.
drop policy if exists resellerku_product_images_select on storage.objects;
create policy resellerku_product_images_select
on storage.objects for select to authenticated
using (
  bucket_id = 'product-images'
  and private.is_tenant_member(private.storage_path_tenant_id(objects.name))
  and exists (
    select 1 from public.products p
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
  and private.is_tenant_owner(private.storage_path_tenant_id(objects.name))
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
  and private.is_tenant_owner(private.storage_path_tenant_id(objects.name))
  and exists (
    select 1 from public.products p
    where p.tenant_id = private.storage_path_tenant_id(objects.name)
      and p.id = private.storage_path_product_id(objects.name)
  )
)
with check (
  bucket_id = 'product-images'
  and private.is_tenant_owner(private.storage_path_tenant_id(objects.name))
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
  and private.is_tenant_owner(private.storage_path_tenant_id(objects.name))
  and exists (
    select 1 from public.products p
    where p.tenant_id = private.storage_path_tenant_id(objects.name)
      and p.id = private.storage_path_product_id(objects.name)
  )
);
