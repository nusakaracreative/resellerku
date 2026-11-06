# STATUS RESELLERKU

Diperbarui: 6 November 2026
Branch pekerjaan: `feat/stage1-commission-wallet`
Tahap: Tahap 1 — Commission and Wallet lifecycle (Draft PR; schema dan SQL contract test tersedia, behavioral QA belum lengkap).

## Status bukti

### [ADA DI REPO]
- Migration draft `supabase/migrations/20261106020000_stage1_finance_engine.sql` menambahkan outstanding adjustment balance, lifecycle snapshot commission, metadata ledger nullable untuk kompatibilitas legacy, relasi ledger, dan empat RPC backend-only.
- `checkout_storefront_cart` diperbarui agar snapshot komisi baru dibuat berstatus pending dan dicatat ke pending ledger serta `wallets.pending_balance` dalam transaksi checkout yang sama.
- Constraint ledger menjaga `entry_direction` dan `balance_bucket` selalu NULL bersama-sama untuk baris legacy atau terisi bersama-sama untuk baris baru.
- RPC draft: `release_due_commissions`, `create_payout_request`, `approve_payout_request`, dan `reverse_released_commission`.
- RPC baru dicabut dari PUBLIC/anon/authenticated dan diberikan ke service_role. Worker tetap wajib memvalidasi JWT, tenant/object authorization, dan human reviewer approval.\n- SQL test file `supabase/tests/database/stage1_finance_test.sql` berisi contract checks untuk kolom/constraint/RPC grants serta empat negative cross-tenant direct-RPC attempts oleh role `authenticated`.

### [ASUMSI / BELUM ADA]
- Migration belum dijalankan di Supabase Staging maupun Production.
- SQL test script sudah ditulis dan di-commit, tetapi BELUM dijalankan. Belum ada bukti SQL parse/apply atau hasil pgTAP.\n- Test file saat ini menguji schema/RPC contract dan batas privilege direct RPC; belum mensimulasikan checkout pending, elapsed hold 48 jam, release ke available, payout locked/paid, atau retur parsial/penuh dengan fixture database.\n- Belum ada cross-tenant RLS tests untuk akses tabel langsung, concurrency tests, property/reconciliation tests, atau Worker integration tests.
- Kesesuaian seluruh FK/status shipment, return, dispute, payout dengan database aktif belum dibuktikan melalui query.
- Belum ada bukti bahwa Worker sudah memanggil RPC baru atau menerapkan reviewer authorization.
- Belum ada approval manusia untuk deploy modul uang.

## Keputusan yang diterapkan pada draft
- Hold period snapshot: 48 jam.
- Release menggunakan `shipments.delivered_at + hold_period_hours_snapshot`, dan memblokir return/dispute aktif.
- Legacy commission snapshot tidak otomatis dikreditkan.
- Ledger append-only; koreksi melalui transaksi kompensasi.
- `entry_direction` dan `balance_bucket` nullable untuk legacy, dengan CHECK pasangan NULL/terisi.
- OCR bukan settlement proof; migration ini tidak mengubah settlement flow.

## Risiko / pekerjaan review wajib
1. Review nama status dan kolom shipment/return/dispute terhadap schema Staging.
2. Verifikasi seluruh FK tenant-aware dan tipe status yang digunakan.
3. Tambahkan/selesaikan tes idempotency untuk release, payout request, paid payout, dan partial reversal; uji event ledger parsial.
4. Uji race condition dan rekonsiliasi bahwa saldo setiap bucket sama dengan SUM(credit)-SUM(debit).
5. Verifikasi Worker JWT validation, tenant authorization, dan human approval sebelum RPC payout paid.
6. Review jalur commission zero-value, beberapa shipment per order, beberapa return parsial, dan multi-item return.
7. Pastikan grants, RLS, dan append-only trigger tidak menghalangi trusted backend transaction.

## Lingkup perubahan branch
- `supabase/migrations/20261106020000_stage1_finance_engine.sql`
- `supabase/tests/database/stage1_finance_test.sql`\n- `STATUS.md`

## Instruksi keselamatan
Jangan merge atau apply migration ini ke database aktif sebelum review teknis, Staging tests, adversarial review, security/RLS review, dan persetujuan Owner. Tidak ada operasi Supabase Staging/Production yang dilakukan dalam pekerjaan ini.

## Log perubahan
- 6 Nov 2026: Draft Stage 1 finance engine dibuat pada branch `feat/stage1-commission-wallet`; menunggu review dan pengujian.\n- 6 Nov 2026: SQL contract test dan negative cross-tenant direct-RPC tests ditambahkan; behavioral QA masih memerlukan fixture dan test tambahan.
