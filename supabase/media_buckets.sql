-- Resellerku media storage buckets.
-- All buckets are private. Public delivery is intentionally disabled.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values
  (
    'product-images',
    'product-images',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'marketing-assets',
    'marketing-assets',
    false,
    26214400,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf']
  ),
  (
    'avatars',
    'avatars',
    false,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
