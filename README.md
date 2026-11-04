# Resellerku API — Stage 2

Cloudflare Worker for authenticated receipt OCR, private Supabase Storage and Gemini Vision.

## Configure
1. Replace SUPABASE_URL and ALLOWED_ORIGINS in wrangler.toml.
2. Apply supabase/receipts_storage.sql in the Supabase SQL Editor.
3. Run npm install.
4. Set Cloudflare secrets:
   - npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   - npx wrangler secret put GEMINI_API_KEY
5. Copy .dev.vars.example to .dev.vars for local development and enter the real secrets.
6. Run npm run dev; deploy with npm run deploy.

## Endpoints
- GET /health
- POST /api/verify-receipt

The OCR route requires Authorization: Bearer <supabase_access_token>.
Send exactly one image source with order_id:
- receipt_image_url: private/signed Storage URL from this Supabase project.
- receipt_object_path: TENANT_UUID/ORDER_UUID/file.jpg
- receipt_image_base64: Base64 or image data URL, plus optional mime_type.

Only JPEG, PNG and WebP are accepted. Maximum image size defaults to 6 MB.
Base64 uploads are saved under tenant_id/order_id in the private receipts bucket.

## Payment-control rule
Gemini reads the amount displayed in the image; it cannot prove bank settlement and screenshots can be fabricated.
- OCR amount match: receipt_ocr_status = matched; order remains payment_review and payment_status remains submitted.
- Amount mismatch: receipt_ocr_status = mismatch.
- Unreadable image: receipt_ocr_status = manual_review.

The owner must confirm actual settlement before setting payment_status = verified and releasing fulfillment. OCR is not bank confirmation.

## Security
- Authenticates the caller with Supabase Auth and checks active tenant membership.
- A reseller can submit receipts only for their own orders.
- Storage URLs are restricted to the configured Supabase project and receipts bucket.
- Object paths must be under tenant_id/order_id.
- Never expose service-role or Gemini API keys in browser code.
- Stage 1 schema does not define orders.status = verified/manual_check; it uses payment_review and receipt_ocr_status.

## Continuous validation
The worker-ci GitHub Actions workflow runs TypeScript validation on relevant pushes and pull requests.


## Supabase Storage layout

All four buckets are private. Do not expose their object URLs as public URLs.

| Bucket | Purpose | Limit | Access |
| --- | --- | ---: | --- |
| \`receipts\` | Payment receipt evidence | 6 MB | Trusted Worker only |
| \`product-images\` | Catalog product images | 8 MB | Active tenant members read; tenant owner writes |
| \`marketing-assets\` | Campaign images, video, PDF and brand media | 25 MB | Owner manages; members read brand media and published assets |
| \`avatars\` | User profile pictures | 2 MB | User manages own avatar; tenant owner may view member avatars |

Object path conventions:
- Product image: \`{tenant_id}/products/{product_id}/{filename}\`
- Marketing asset: \`{tenant_id}/assets/{asset_id}/{filename}\`
- Brand media/logo: \`{tenant_id}/brand/{filename}\`
- Avatar: \`{user_id}/{filename}\`
- Receipt: \`{tenant_id}/{order_id}/{filename}\`

Upload a marketing asset by first creating its \`public.assets\` row with \`storage_bucket = 'marketing-assets'\` and its exact \`storage_path\`; upload the file to that path; then set its status to \`published\` only when it is ready for resellers. Resellers can read only published asset files.

Apply the Storage SQL files in this order when recreating the project:
1. \`supabase/receipts_storage.sql\`
2. \`supabase/media_buckets.sql\`
3. \`supabase/storage_policies.sql\`
4. \`supabase/storage_product_policy_fix.sql\`

\`supabase/storage_policies.sql\` and its qualification fix define tenant-scoped Storage RLS policies. Keep \`receipts\` without client-facing policies; the receipt Worker accesses it with the service-role key.
