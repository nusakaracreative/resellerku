# Resellerku Commerce Blueprint
**Version:** 1.0  
**Status:** Product direction approved; feature scope to be implemented in controlled phases  
**Date:** 4 November 2026  
**Owner:** NUSAKARA

---

## 1. Product direction

Resellerku is not intended to be a generic marketplace clone. Its target is a **Commerce Operating System with a premium public storefront and an integrated reseller network**.

The four benchmark platforms define the capability bar:

- **Shopee:** fast product discovery, practical cart and checkout, voucher eligibility, shipping promotions, and useful buyer reviews.
- **Tokopedia / TikTok Shop by Tokopedia:** accurate product and offer information, fulfilment discipline, creator/affiliate distribution, and structured transaction support.
- **Amazon:** deep product detail pages, clear variations and offers, robust order history, delivery tracking, returns, and contextual support.
- **Eldorado.gg:** seller verification, transparent reputation signals, order-specific communication, buyer confirmation, and evidence-based dispute resolution.

The product must combine those principles while retaining Resellerku's own visual identity: premium editorial commerce, warm neutral storefront surfaces, deep teal brand elements, and Atomic Orange action accents. The approved storefront visual direction is **LOCKED**. Feature scope and workflow details remain open for refinement.

### 1.1 Three connected experiences

1. **Public Storefront** — the customer-facing shopping experience for a tenant's brand and catalog.
2. **Reseller Workspace** — authenticated reseller access to assigned tier pricing, shareable product links, customer orders, commissions, wallet, and marketing assets.
3. **Business Owner Command Center** — catalog, inventory, order operations, pricing, reseller management, campaigns, settlement, support, and analytics.

A public customer must not see owner-only HPP, internal commission calculations, private reseller data, or another reseller's tier prices.

### 1.2 Marketplace vs. tenant storefront

**First commercial release:** one branded storefront per tenant, distributed through the tenant's own channels and reseller referral links. Do not build a single public multi-vendor marketplace directory in the first release. A cross-tenant discovery marketplace can be evaluated later after tenant isolation, storefront ownership, seller verification, and dispute operations are mature.

---

## 2. Benchmark findings translated into product requirements

### 2.1 Shopee — low-friction shopping

Observed benchmark patterns:
- Product selection supports variants, immediate purchase or adding items to a cart.
- Checkout surfaces shipping choice, eligible vouchers/coins, payment method, and final order creation.
- Voucher eligibility is explicit; the Shopee help material describes store, free-shipping, and platform voucher categories with eligibility conditions.
- Product reviews can include ratings, photos, and videos, and are tied to completed orders.
- Return/refund requests include evidence and a resolution workflow.

**Resellerku requirements:**
- Persistent cart with product/variant quantities.
- Checkout summary with a transparent breakdown: subtotal, shipping, discounts, fees (if any), and final payable amount.
- Voucher eligibility feedback before payment, not a silent discount.
- Shipping promotion and store/product discount rules.
- Verified-purchase reviews with photo/video evidence.
- Return/refund request tied to the original order and relevant policy window.

### 2.2 Tokopedia / TikTok Shop by Tokopedia — catalog quality and distribution

Current official seller terms describe Tokopedia and Shop as integrated commerce platforms for participating sellers. They cover listing products, accurate product details, order processing, shipping arrangements, and affiliate/creator promotion functionality. The Indonesian Ministry of Trade's June 2026 notice also highlights real consumer complaint areas: products inconsistent with descriptions/orders, returns/refunds, payment issues, delivery problems, and account access.

**Resellerku requirements:**
- Product information completeness checks before publication.
- Order fulfilment deadlines and status visibility.
- Shareable product links with reseller attribution.
- Optional creator/reseller campaign and commission plans.
- A customer help path for order, payment, delivery, account, and product-quality issues.
- A controlled resolution center rather than informal support handled only outside the platform.

### 2.3 Amazon — rich product information and post-purchase service

Official Amazon materials describe product detail pages with title, imagery, bullet points, description, variations, customer reviews, and seller offers. Buyer tools include order history, package tracking, cancellation/editing where eligible, invoices, returns, replacements, and order-related customer support. Amazon also provides promotional mechanisms such as coupons and time-limited deals.

**Resellerku requirements:**
- Detailed product page with gallery, key benefits, specifications, variants, seller/store identity, availability, delivery estimate, reviews, and related products.
- Clear distinction between product facts and seller-specific offer information.
- Order history with an event timeline and tracking number.
- Self-service cancellation, return, replacement, and refund requests according to policy and order state.
- Coupons and scheduled promotions with stock and time limits.

### 2.4 Eldorado.gg — trust and dispute handling

Current Eldorado help materials describe seller identity verification, feedback score, review count, online status, and seller shop reviews. Its order workflow provides order-specific chat, buyer delivery checks, review confirmation, and evidence-backed disputes. The exact protection periods and payment-holding mechanism are Eldorado-specific and must **not** be copied blindly.

**Resellerku requirements:**
- Verified seller/reseller status with transparent criteria.
- Reputation based on completed transactions, with review count and rating.
- Order-specific conversation and evidence attachments.
- Delivery confirmation and issue-reporting path.
- Disputes with deadlines, required evidence, status history, and owner/admin decision trail.
- Clear buyer/seller rules and an auditable resolution record.

**Financial/legal boundary:** do not represent Resellerku as an escrow or custodial-payment service without a separately reviewed licensed payment-provider design and legal assessment. Use the existing payment-provider/bank settlement flow. Reseller commission may remain in the existing pending wallet ledger until fulfilment and the defined return/dispute conditions are cleared; this is an internal commission-release rule, not custody of buyer funds.

---

## 3. Core customer journeys

### 3.1 New customer
1. Open a tenant storefront from a direct link, campaign, or reseller referral.
2. Discover products from the homepage, categories, search, featured collections, or promotion.
3. Open product detail, inspect images, specifications, variations, price, availability, estimated shipping, seller details, and reviews.
4. Select variant and quantity; add to cart or buy now.
5. Sign in or verify customer identity; select/add shipping address.
6. Select available delivery service and eligible promotion/voucher.
7. Select payment method and review the complete final amount.
8. Create the order and receive a unique order number.
9. Complete payment and see a clear payment state.
10. Follow fulfilment and shipment status from the order page.
11. Confirm receipt when appropriate, or report an issue with evidence.
12. Submit a verified-purchase review after completion.

### 3.2 Customer coming through a reseller
1. Open a product/store link containing a signed or opaque reseller referral identifier.
2. Reseller attribution is validated server-side and stored with the cart/session/order.
3. The public customer sees the approved retail offer, not the reseller's commission or HPP.
4. The order stores the reseller attribution and the exact price/commission snapshot used at checkout.
5. The reseller can see their attributed order and commission state in the Reseller Workspace.
6. Commission is released only according to the tenant's fulfilment, completion, return, and dispute rules.

### 3.3 Returning customer
1. Sign in and view profile, address book, saved items, and previous orders.
2. Reorder eligible items or revisit recently viewed products.
3. Track shipment, download invoice, contact support, or open a return/refund case.
4. Review completed purchases and view the user's own review history.

---

## 4. Functional specification

### 4.1 Storefront home
- Configurable logo, store name, announcement strip, navigation, and footer per tenant.
- Editorial hero with CTA and campaign destination.
- Campaign/seasonal banners controlled by schedule.
- Category and subcategory navigation.
- Featured, best-selling, new-arrival, and curated collections.
- Product cards with image, name, price, compare-at price when valid, rating/review count, availability, and promotion label.
- Recently viewed and relevant recommendations.
- Search entry point with autocomplete.
- Trust information: verified store/seller indicators, delivery/return policy, contact/help access.
- Responsive layout with mobile-first navigation and accessible controls.

### 4.2 Search and discovery
- Search by product name, SKU where appropriate, category, brand, and product keywords.
- Autocomplete with product/category suggestions.
- Search result count and clear no-result state.
- Filters: category, price range, availability, brand, rating, and relevant product attributes.
- Sorting: relevance, newest, popularity, price low-high, price high-low, and rating.
- Preserve search/filter state when navigating back from product detail.

### 4.3 Product catalog and detail
- Multiple images, thumbnails, zoom, and optional product video.
- Product title, short benefits, long description, structured specifications, SKU, brand, category, and tags.
- Variant model for attributes such as size, color, model, package, or capacity; each sellable combination has its own SKU and stock.
- Stock availability and low-stock state; do not expose internal reserved stock.
- Price display resolved according to customer context and valid offer.
- Delivery estimator using destination and packaged weight/dimensions.
- Store/reseller identity and trust signals.
- Verified-purchase reviews, media, rating distribution, and review filters.
- Related products and complementary recommendations.
- Product Q&A may be added after first release; unanswered questions must never be displayed as answered.

### 4.4 Pricing and reseller economics
- Keep HPP/base cost private to Owner/admin.
- Public customer sees only the approved customer-facing/retail price for the active offer.
- A reseller session sees only the tier price and commission applicable to that reseller's active tenant membership.
- A referral checkout snapshots reseller ID, tier, selling price, commission amount, campaign, and attribution source so later price edits do not rewrite historical orders.
- Owner can configure direct-store price, tier selling price, commission, minimum advertised price if needed, and effective dates.
- Price resolver runs server-side; client-supplied prices and commissions are never trusted.
- Explain reseller margin/commission inside the authenticated reseller workspace, never on the public buyer page unless the tenant deliberately chooses a compliant disclosure.

### 4.5 Cart
- Persistent cart for signed-in customer; anonymous cart may be a later phase.
- Variant-level line items, quantity controls, price snapshot refresh, remove/save-for-later, and stock validation.
- Group items by tenant/store if multi-store carts are ever supported; first release should keep one tenant/store per checkout.
- Promotion eligibility and estimated shipping visible before checkout.
- Revalidate all prices, stock, coupon eligibility, and referral attribution on the server when checkout starts.

### 4.6 Checkout and payment
- Customer identity and verified contact.
- Address book with recipient, phone, province/city/district/postal code, street/address details, and delivery notes.
- Shipping options with service, fee, and estimate; do not invent ETA or cost if carrier quote is unavailable.
- Coupon/voucher code with eligibility explanation, stacking rules, minimum spend, product/store scope, usage caps, and expiry.
- Payment methods are controlled by configured providers and tenant policy.
- Complete order summary and final payable amount before submission.
- Order creation and stock reservation must be atomic/idempotent to prevent duplicate orders and overselling.
- Payment confirmation is server/provider-driven. OCR is supporting evidence only and must never auto-verify a payment.
- Support manual bank transfer proof as an initial method; gateway/QRIS/VA and COD require their own provider and operational integration.

### 4.7 Orders, delivery, and after-sales
- Customer order list grouped by status.
- Order detail with status timeline, items, price snapshots, address, payment, shipment, tracking, invoice, and communication.
- Cancellation eligibility based on order/payment/fulfilment state.
- Shipment tracking events and exception state.
- Delivery confirmation action with a safe, explicit confirmation step.
- Return/refund/replacement request with selectable reason, per-item quantity, evidence upload, conversation, deadlines, and resolution status.
- Case history and audit trail visible to authorised buyer, reseller, owner, and support roles only.
- Do not auto-complete or release commission solely because a carrier says delivered; use the published tenant policy and applicable evidence/confirmation process.

### 4.8 Reviews and reputation
- Reviews only from eligible completed/received purchases.
- Separate product quality from fulfilment/service feedback so seller delivery issues do not distort product quality.
- Star rating, text, images/video, date, verified-purchase label, and owner response.
- Review moderation and abuse reporting.
- Seller/reseller profile signals: verified identity status (only after a real verification process), completed order count, fulfilment rate, response rate, rating, and review count.
- Never fabricate ratings, reviews, badges, or seller statistics for production products.

### 4.9 Reseller capabilities
- Reseller's assigned tier and product eligibility.
- Share product/store links with attribution and optional campaign tag.
- Copyable product description/caption/media from Asset Hub.
- View own attributed orders and current order state.
- Commission breakdown: estimated, pending, available, reversed/adjusted, and paid.
- Wallet and payout request using existing backend-controlled ledger.
- Reseller performance: clicks/visits where consent and tracking design allow, orders, conversion, GMV, and commission.
- No ability to edit owner-controlled stock, HPP, or other reseller memberships.

### 4.10 Owner commerce operations
- Product CRUD, bulk import/export, categories, variants, attributes, gallery/media, SKU, stock, price, tier price, and publish scheduling.
- Inventory adjustment history and reserved/available stock.
- Storefront branding, home sections, navigation, banners, category ordering, footer, policy pages, and SEO metadata.
- Promotion/voucher setup with preview, eligibility tests, usage limits, and campaign dates.
- Order fulfilment board, shipping label/booking integration, tracking events, and exceptions.
- Customer support and dispute queue with evidence viewer and decision logging.
- Reseller verification, tier assignment, performance, commission, and payout control.
- Reports with date range, export, and explicit separation of actual business data vs. demo data.

---

## 5. Priority and release plan

### P0 — Commercial foundation
Must work end-to-end before the storefront is described as commercially usable.

1. Store identity and tenant-scoped public storefront routing.
2. Product catalog management: categories, gallery/media, variants, SKU, specifications, weight, dimensions, availability, and publication state.
3. Secure price resolver that separates public price, reseller tier price/commission, and Owner-only HPP.
4. Search, category, filter, sort, and complete product detail page.
5. Persistent cart and server-validated checkout.
6. Address book and shipping quote/service selection (manual configuration acceptable only if clearly labelled).
7. Order creation, stock reservation, payment submission/confirmation, and duplicate prevention.
8. Customer order history, invoice, fulfilment state, and shipment tracking reference.
9. Owner operational controls and audit trail.
10. Reseller referral attribution and commission snapshot.
11. Clear terms, privacy, shipping, return/refund, and customer support entry points.

### P1 — Trust, retention, and merchandising
1. Verified-purchase reviews with photos/videos and moderation.
2. Wishlist and recently viewed.
3. Store coupons, product discounts, shipping promotions, and campaign schedules.
4. Product recommendations and curated collections.
5. Order chat and structured return/refund/dispute center with evidence.
6. Seller/reseller verification and reputation dashboard.
7. Reseller performance analytics and better share tools.
8. Customer notification preferences and transactional email/in-app notifications.

### P2 — Scale and marketplace sophistication
1. Multi-tenant discovery marketplace.
2. Advanced recommendation/personalisation.
3. Loyalty points, store credit, and referral rewards after financial rules are defined.
4. Multi-store/multi-seller cart and checkout.
5. External marketplace/channel integrations where APIs, contracts, and fees permit.
6. Advanced campaign/affiliate attribution and creator reporting.
7. Automated shipping labels, returns pickup, and richer carrier event handling.

---

## 6. Current database assessment and required additions

### 6.1 Existing foundation confirmed in repository
The current schema already contains:
- `users`, `tenants`, and `tenant_memberships` (roles are currently Owner and Reseller; reseller tiers are Dropshipper, Agen, Distributor).
- `products` with SKU, description, single `image_url`, HPP/base price, quantity stock, reserved quantity, status, packaged weight, and a demo-data flag.
- `product_tier_prices` with tier selling price and per-unit commission.
- `orders` and `order_items` with order/payment states, address JSON, payment/receipt/OCR fields, and historical item/price/commission snapshots.
- `assets`, `wallets`, `wallet_transactions`, `payout_requests`, and `audit_logs`.

### 6.2 Structural gaps identified
The current schema does not yet provide dedicated entities for:
- Storefront configuration, public store slug/custom domain, home sections, and SEO.
- Product categories/subcategories and structured product attributes.
- Product media gallery and video assets.
- Product variants/variant combinations and per-variant stock/SKU.
- Customer address book.
- Persistent carts and cart line items.
- Wishlist/favorites and recently viewed.
- Coupons, promotions, promotion rules, and redemption records.
- Shipping options, shipment records, carrier tracking events, and return shipments.
- Payment-provider transactions, webhook/idempotency records, refunds, and payment reconciliation.
- Product reviews, review media, seller reputation, and verification evidence.
- Customer support conversations, order chat, return/refund/dispute cases, and case evidence.
- Storefront sessions/analytics and reseller referral attribution.

**Important schema constraint:** current `orders.reseller_id` is NOT NULL. That supports reseller-attributed orders but does not model a direct owner-storefront order with no reseller. Before launch, decide and implement a deliberate sales-channel model (for example `direct_store` vs `reseller_referral`), make reseller attribution nullable only with appropriate checks/foreign keys, and store a durable referral/membership snapshot. Do not work around this by inventing a fake reseller account.

### 6.3 Proposed schema workstreams (design first; migration after review)
1. **Catalog:** categories, product_media, product_attributes, product_variants, variant_inventory.
2. **Storefront:** tenant_storefront_settings, collections, navigation_items, campaign_banners, SEO fields.
3. **Customer:** customer_addresses, carts, cart_items, wishlist_items.
4. **Promotion:** promotions, coupons, coupon_rules, coupon_redemptions.
5. **Commerce:** sales_channel/referral attribution, payment_transactions, payment_events, shipments, shipment_events, inventory_movements.
6. **Trust/support:** product_reviews, review_media, seller_verification, conversations, messages, return_requests, dispute_cases, dispute_evidence.
7. **Audit/analytics:** immutable event history and privacy-aware storefront analytics.

Every new tenant-owned table must have tenant-aware foreign keys, indexes for its access paths, RLS policies, and a documented backend write boundary. Financial tables remain backend-controlled and append-only where applicable.

---

## 7. Security, finance, and trust rules

1. Never expose `products.base_price` (HPP), service-role credentials, private storage paths, payout bank details, or other reseller tier prices to public browser queries.
2. Public catalog reads must use a carefully designed safe projection or backend endpoint. Do not solve storefront access by making all tenant tables public.
3. Price, coupon, commission, stock, shipping fee, and order total are revalidated server-side. Browser totals are display estimates only.
4. Use idempotency keys for order creation, payment events, stock reservation/release, commission posting, and payout processing.
5. A matching receipt OCR result is not proof of settled funds. Payment confirmation remains provider/bank-ledger or explicit Owner confirmation.
6. Keep pending and available commissions in the existing trusted wallet ledger. Reversals/refunds must create auditable ledger entries; never edit historical wallet transactions.
7. Do not introduce escrow language or hold buyer funds directly without licensed provider capability and legal review.
8. Only completed/eligible purchases can create product reviews.
9. Trust badges must be evidence-based. Do not display "verified" unless the verification operation has actually succeeded.
10. Return/refund windows, customer rights, and seller responsibilities must be explicit and reviewed against Indonesian rules before production.
11. Uploaded evidence and customer documents stay in private storage with signed, authorised access.
12. Keep buyer, reseller, and Owner views separated by role and tenant; test cross-tenant isolation at every new endpoint.

---

## 8. Design and UX acceptance criteria

The approved preview's visual direction remains the design baseline:
- Premium editorial hero and strong product imagery.
- Warm neutral shopping surfaces balanced with Resellerku deep teal and Atomic Orange accents.
- Confident typography, generous whitespace, refined product cards, rounded geometry, subtle shadows, and restrained iconography.
- Desktop layouts may use multi-column grids; mobile experience must prioritise thumb reach, legible product data, fixed/accessible cart actions, and simple checkout steps.

Every feature must include:
- Loading, empty, success, validation, and error states.
- Clear labels for simulated data; no sample content in production reports.
- Accessible labels, keyboard support, visible focus, and adequate text contrast.
- Responsive validation at 320, 360, 390, 430, 768, and 1366 CSS-pixel viewports.
- No dead buttons, fake links, or actions that imply a transaction occurred when they did not.
- Analytics events that do not leak personal or payment data.

---

## 9. Definition of ready for commercial pilot

The storefront is not ready for a commercial pilot until all of the following pass:
- A real product with gallery, category, variants, stock, and tier prices can be created and published by Owner.
- Public visitors can discover a product and see only the correct public offer.
- A reseller referral produces correct, non-spoofable attribution.
- Cart and checkout recalculate all values on the server.
- A purchase creates one order exactly once and reserves inventory correctly.
- Payment confirmation is independently verified; OCR cannot approve payment.
- Owner can fulfil an order and record a real shipment/tracking reference.
- Customer can see order status, invoice, and contact support.
- Returns/disputes and evidence can be submitted and reviewed.
- Eligible reviews are verified-purchase only.
- Reseller commission moves through pending/available/payout states correctly and can be reversed on valid refund events.
- RLS and endpoint tests prove no cross-tenant, cross-role, HPP, or private-file exposure.
- No demo data is included in financial reports or public production catalog.
- All actions, emails, policy text, support contacts, and shipping/payment capabilities are real and configured.

---

## 10. Benchmark reference sources

### Shopee Indonesia
- [Checkout flow: variants, shipping option, voucher, payment, and order creation](https://help.shopee.co.id/portal/4/article/71961)
- [Voucher selection and eligibility at checkout](https://help.shopee.co.id/portal/4/article/73183-)
- [Free-shipping voucher and automatic free-shipping patterns](https://help.shopee.co.id/portal/4/article/73218)
- [Verified-order product review, rating dimensions, photo/video reviews](https://help.shopee.co.id/portal/4/article/73047)
- [Return/refund policy](https://help.shopee.co.id/portal/4/article/73503-Kebijakan-Pengembalian-Barang/)

### Tokopedia / TikTok Shop by Tokopedia
- [Official Indonesia seller terms covering Tokopedia/Shop integration, listing accuracy, fulfilment, and affiliate features](https://seller-id.tiktok.com/university/article/agreement?identity=1&knowledge_id=10001020)
- [Indonesia Ministry of Trade: consumer complaint categories and consumer protection guidance, 23 June 2026](https://www.kemendag.go.id/berita/siaran-pers/fasilitasi-penyelesaian-pengaduan-konsumen-terhadap-tokopedia-dan-tiktok-shop-kemendag-perkuat-perlindungan-konsumen-digital)

### Amazon
- [Product detail page and offer structure](https://sellercentral.amazon.com/help/hub/reference/external/51?locale=en-EN)
- [Product listing, variations, promotions, and coupons](https://sell.amazon.com/sell)
- [Order support, returns, invoices, and tracking from Your Orders](https://digprjsurvey.amazon.com/csad/help/node/GSD587LKW72HKU2V)
- [Package tracking and delivery updates](https://digprjsurvey.amazon.com/csad/help/node/GENAFPTNLHV7ZACW)
- [Return and replacement flow](https://digprjsurvey.amazon.com/csad/help/node/G6E3B2E8QPHQ88KF)

### Eldorado.gg
- [Seller verification and TradeShield/buyer protection overview](https://support.eldorado.gg/en/articles/17098994-good-to-know-before-you-buy)
- [Receive an order, order chat, review, and dispute paths](https://support.eldorado.gg/en/articles/8408993-receive-your-order)
- [Evidence-based order dispute workflow](https://support.eldorado.gg/en/articles/8409016-order-dispute-how-does-it-work)
- [Refund and return policy](https://support.eldorado.gg/en/articles/8409020-refund-and-return-policy)

---

## 11. Implementation order

1. **Schema & commerce domain design:** settle direct vs reseller-attributed order model, public price resolver, variant and inventory model, customer identity/address, and provider boundaries.
2. **Owner catalog operations:** implement full product/category/variant/media/stock/tier-price management.
3. **Public storefront integration:** replace static preview data with safe, tenant-scoped public product data; implement search, category, filters, detail, and SEO.
4. **Cart and checkout:** persistent cart, addresses, shipping, vouchers, order creation, and payment flow.
5. **Order fulfilment:** Owner queue, shipment tracking, customer order page, and invoices.
6. **Trust & after-sales:** reviews, reputation, chat, returns, and dispute evidence.
7. **Reseller growth:** referral attribution, reseller mini-store/share links, commission views, and campaign analytics.
8. **Commercial pilot QA:** security/RLS, financial integrity, browser/device matrix, accessibility, load limits, policy copy, and operational rehearsal.

**Implementation rule:** build and validate each workstream against the acceptance criteria before moving to the next. The current `/store-preview` remains a non-transactional design preview until the real commerce data and server-side workflows replace its simulated catalogue and cart.
