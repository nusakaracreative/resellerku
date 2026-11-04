"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Image as ImageIcon, Maximize2, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OrderItem = {
  id: string; product_name_snapshot: string; sku_snapshot: string | null;
  quantity: number; unit_price: number | string; commission_amount: number | string;
  line_total: number | string; tier_snapshot: string | null;
};
type OrderRow = {
  id: string; tenant_id: string; order_number: string; reseller_id: string;
  status: string; payment_status: string; fulfillment_type: string;
  recipient_name: string; recipient_phone: string | null;
  subtotal: number | string; shipping_cost: number | string;
  discount_amount: number | string; total_amount: number | string;
  receipt_object_path: string | null; receipt_ocr_data: Record<string, unknown> | null;
  receipt_ocr_status: string; notes: string | null; placed_at: string;
  reseller_name: string; reseller_tier: string; items: OrderItem[];
};
type OcrData = { extracted_amount?: number; expected_amount?: number; match_status?: boolean; result?: string; model?: string; processed_at?: string };

const PREVIEW_ORDERS: OrderRow[] = [{
  id: "preview-order-001", tenant_id: "preview-tenant", order_number: "RSK-DEMO-2026-001",
  reseller_id: "preview-reseller", status: "payment_review", payment_status: "submitted",
  fulfillment_type: "dropship", recipient_name: "Pelanggan Simulasi", recipient_phone: "08••••••••••",
  subtotal: 40000, shipping_cost: 12000, discount_amount: 0, total_amount: 52000,
  receipt_object_path: null, receipt_ocr_status: "matched",
  receipt_ocr_data: { extracted_amount: 52000, expected_amount: 52000, match_status: true, result: "matched", model: "Gemini Vision · simulated" },
  notes: "Data simulasi untuk preview UI. Bukan transaksi aktual.", placed_at: new Date().toISOString(),
  reseller_name: "Sobri Demo", reseller_tier: "dropshipper",
  items: [{ id: "preview-item-001", product_name_snapshot: "Kripik Pedas Kekinian 150 g", sku_snapshot: "KPK-150", quantity: 2, unit_price: 20000, commission_amount: 3000, line_total: 40000, tier_snapshot: "dropshipper" }],
}];

const money = (value: unknown) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
const dateTime = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const titleCase = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [settlementConfirmed, setSettlementConfirmed] = useState(false);
  const [approving, setApproving] = useState(false);
  const [notice, setNotice] = useState("");

  const isPreview = process.env.NEXT_PUBLIC_DASHBOARD_PREVIEW === "true";
  const selected = orders.find(order => order.id === selectedId) ?? orders[0] ?? null;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");

      const { data: memberships, error: membershipError } = await supabase
        .from("tenant_memberships").select("tenant_id")
        .eq("user_id", user.id).eq("role", "owner").eq("is_active", true).limit(1);
      if (membershipError) throw membershipError;
      const tenantId = memberships?.[0]?.tenant_id as string | undefined;
      if (!tenantId) throw new Error("Akun ini tidak memiliki tenant Business Owner aktif.");

      const { data: rawOrders, error: orderError } = await supabase
        .from("orders").select("*").eq("tenant_id", tenantId)
        .order("placed_at", { ascending: false }).limit(100);
      if (orderError) throw orderError;

      const rows = rawOrders ?? [];
      if (!rows.length) {
        setOrders(isPreview ? PREVIEW_ORDERS : []);
        setSelectedId(isPreview ? PREVIEW_ORDERS[0].id : "");
        return;
      }

      const resellerIds = [...new Set(rows.map(row => row.reseller_id as string))];
      const orderIds = rows.map(row => row.id as string);
      const [{ data: profiles, error: profileError }, { data: itemRows, error: itemError }, { data: membershipsByUser, error: tierError }] = await Promise.all([
        supabase.from("users").select("id,full_name").in("id", resellerIds),
        supabase.from("order_items").select("id,order_id,product_name_snapshot,sku_snapshot,quantity,unit_price,commission_amount,line_total,tier_snapshot").in("order_id", orderIds),
        supabase.from("tenant_memberships").select("user_id,reseller_tier").eq("tenant_id", tenantId).in("user_id", resellerIds),
      ]);
      if (profileError) throw profileError;
      if (itemError) throw itemError;
      if (tierError) throw tierError;

      const profileMap = new Map((profiles ?? []).map(profile => [profile.id as string, profile.full_name as string | null]));
      const tierMap = new Map((membershipsByUser ?? []).map(member => [member.user_id as string, member.reseller_tier as string]));
      const itemMap = new Map<string, OrderItem[]>();
      for (const item of (itemRows ?? []) as OrderItem[] & { order_id: string }[]) {
        const list = itemMap.get(item.order_id) ?? [];
        list.push(item);
        itemMap.set(item.order_id, list);
      }
      const mapped: OrderRow[] = rows.map(row => ({
        ...row,
        reseller_name: profileMap.get(row.reseller_id as string) ?? "Reseller",
        reseller_tier: tierMap.get(row.reseller_id as string) ?? "—",
        items: itemMap.get(row.id as string) ?? [],
      })) as OrderRow[];
      setOrders(mapped);
      setSelectedId(current => mapped.some(order => order.id === current) ? current : mapped[0]?.id ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat antrean pesanan.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [isPreview]);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  useEffect(() => {
    let cancelled = false;
    const loadReceipt = async () => {
      setReceiptUrl("");
      setReceiptError("");
      if (!selected || !selected.receipt_object_path || selected.id.startsWith("preview-")) return;
      const api = process.env.NEXT_PUBLIC_RESELLERKU_API_URL?.replace(/\/$/, "");
      if (!api) {
        setReceiptError("NEXT_PUBLIC_RESELLERKU_API_URL belum dikonfigurasi.");
        return;
      }
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session?.access_token) throw new Error("Sesi login telah berakhir.");
        const response = await fetch(`${api}/api/orders/${selected.id}/receipt-url`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const payload = await response.json() as { signed_url?: string; error?: string };
        if (!response.ok || !payload.signed_url) throw new Error(payload.error ?? "Gagal membuka bukti transfer.");
        if (!cancelled) setReceiptUrl(payload.signed_url);
      } catch (caught) {
        if (!cancelled) setReceiptError(caught instanceof Error ? caught.message : "Bukti transfer tidak dapat dimuat.");
      }
    };
    void loadReceipt();
    return () => { cancelled = true; };
  }, [selected?.id, selected?.receipt_object_path]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  const visibleOrders = useMemo(() => orders.filter(order => {
    const statusOk = filter === "all" || (filter === "review" ? order.payment_status === "submitted" || order.status === "payment_review" : order.payment_status === "verified");
    const text = `${order.order_number} ${order.reseller_name} ${order.recipient_name}`.toLowerCase();
    return statusOk && text.includes(query.toLowerCase());
  }), [orders, filter, query]);

  const handleApprove = async () => {
    if (!selected || isPreview || !settlementConfirmed) return;
    setApproving(true);
    setNotice("");
    try {
      const api = process.env.NEXT_PUBLIC_RESELLERKU_API_URL?.replace(/\/$/, "");
      if (!api) throw new Error("API Worker belum dikonfigurasi.");
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) throw new Error("Sesi login telah berakhir.");
      const response = await fetch(`${api}/api/orders/${selected.id}/approve-payment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_settlement: true }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Persetujuan pembayaran gagal.");
      setConfirmOpen(false);
      setSettlementConfirmed(false);
      setNotice("Pembayaran dikonfirmasi. Pesanan masuk status processing.");
      await loadOrders();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Persetujuan gagal.");
    } finally {
      setApproving(false);
    }
  };

  const ocr = (selected?.receipt_ocr_data ?? {}) as OcrData;
  const amountMatched = selected?.receipt_ocr_status === "matched" && ocr.match_status === true;
  const pendingReview = selected?.status === "payment_review" && selected?.payment_status === "submitted";

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#FF8058]">Transaction operations</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Manajemen Pesanan</h1><p className="mt-2 text-sm text-slate-400">Periksa bukti pembayaran, hasil OCR, dan tindak lanjut pengiriman.</p></div>
        <div className="flex items-center gap-2"><span className="pill pill-muted"><ClipboardList size={13} strokeWidth={1.5} /> {orders.length} pesanan</span>{isPreview && <span className="pill pill-amber">MODE SIMULASI</span>}<button onClick={() => void loadOrders()} className="btn-secondary"><RefreshCw size={14} strokeWidth={1.5} className={loading ? "animate-spin text-[#FF5722]" : "text-gray-400"} /> Refresh</button></div>
      </header>

      {notice && <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/[.08] px-4 py-3 text-sm text-emerald-200">{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[.08] px-4 py-3 text-sm text-rose-200">{error}</div>}

      <div className="orders-split grid h-[min(820px,calc(100vh-230px))] min-h-[560px] grid-cols-[minmax(300px,35fr)_minmax(0,65fr)] gap-5">
        <section className="surface flex min-h-0 flex-col overflow-hidden rounded-2xl">
          <div className="border-b border-white/[.08] p-4">
            <div className="flex items-center justify-between"><h2 className="font-bold">Antrean verifikasi</h2><span className="text-[11px] text-slate-500">{visibleOrders.length} ditampilkan</span></div>
            <div className="relative mt-4"><Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="field pl-10 text-sm" placeholder="Cari ID atau nama reseller…" value={query} onChange={e => setQuery(e.target.value)} /></div>
            <div className="mt-3 flex gap-2">
              {[["all","Semua"],["review","Perlu ditinjau"],["verified","Terverifikasi"]].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-[10px] font-bold transition ${filter===value ? "bg-[#FF5722] text-white" : "bg-white/[.04] text-slate-400 hover:bg-white/[.08]"}`}>{label}</button>)}
            </div>
          </div>
          <div className="order-queue scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3">
            {loading ? <div className="p-6 text-center text-xs text-slate-500">Memuat data pesanan…</div> : visibleOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-7 text-center"><ClipboardList size={26} strokeWidth={1.5} className="mx-auto text-gray-400" /><p className="mt-3 text-sm font-semibold text-slate-300">Belum ada pesanan</p><p className="mt-1 text-xs leading-5 text-slate-500">Antrean akan muncul otomatis ketika reseller membuat checkout.</p></div>
            ) : visibleOrders.map(order => (
              <button type="button" key={order.id} onClick={() => setSelectedId(order.id)} className={`w-full rounded-xl border p-4 text-left transition ${selected?.id===order.id ? "border-[#FF5722] bg-[#FF5722]/[.08] shadow-[0_0_0_1px_rgba(255,87,34,.16)]" : "border-white/[.06] bg-[#0b2028]/50 hover:border-white/20 hover:bg-white/[.035]"}`}>
                <div className="flex items-start justify-between gap-2"><span className="text-[11px] font-extrabold tracking-wide text-slate-200">{order.order_number}</span><span className={`pill ${order.payment_status==="verified" ? "pill-green" : "pill-amber"}`}>{order.payment_status==="verified" ? "LUNAS" : "REVIEW"}</span></div>
                <p className="mt-3 text-sm font-semibold text-white">{order.reseller_name}</p>
                <div className="mt-1 flex items-center justify-between"><span className="text-[10px] capitalize text-slate-500">{order.reseller_tier} · {dateTime(order.placed_at)}</span><span className="text-xs font-bold tabular-nums text-slate-200">{money(order.total_amount)}</span></div>
              </button>
            ))}
          </div>
          <div className="border-t border-white/[.08] px-4 py-3 text-[10px] text-slate-600">Data dibatasi pada tenant aktif dan 100 pesanan terbaru.</div>
        </section>

        <section className="surface scrollbar-thin min-h-0 min-w-0 overflow-y-auto rounded-2xl p-5 sm:p-6">
          {!selected ? (
            <div className="grid min-h-[590px] place-items-center text-center"><div><ClipboardList size={30} strokeWidth={1.5} className="mx-auto text-gray-400" /><p className="mt-3 font-semibold text-slate-300">Pilih pesanan dari antrean</p><p className="mt-1 text-xs text-slate-500">Detail pesanan dan bukti OCR akan ditampilkan di sini.</p></div></div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[.08] pb-5">
                <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Detail pesanan</p><h2 className="mt-2 text-xl font-extrabold">{selected.order_number}</h2><p className="mt-1 text-xs text-slate-500">{dateTime(selected.placed_at)}</p></div>
                <span className={`pill ${selected.payment_status==="verified" ? "pill-green" : "pill-amber"}`}>{titleCase(selected.status)}</span>
              </div>

              <section>
                <div className="mb-3 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-lg bg-white/[.06] text-[11px] font-bold text-[#FF8058]">01</span><h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Identitas pesanan</h3></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[[ "Reseller", selected.reseller_name ],[ "Level reseller", titleCase(selected.reseller_tier) ],[ "Penerima", selected.recipient_name ]].map(([label,value]) => <div key={label} className="surface-muted rounded-xl p-3"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-100">{value}</p></div>)}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-lg bg-white/[.06] text-[11px] font-bold text-[#FF8058]">02</span><h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Validasi bukti pembayaran · Gemini OCR</h3></div>
                <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                  <div className="surface-muted flex min-h-[420px] items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-[#0a2028]/70 p-4 shadow-lg">
                    {receiptUrl ? (
                      <button type="button" onClick={() => setLightboxOpen(true)} aria-label="Perbesar bukti transfer" className="group relative flex h-[400px] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#071a21] shadow-xl">
                        <img src={receiptUrl} alt="Bukti pembayaran pesanan" className="h-full max-h-[400px] w-full object-contain transition duration-300 group-hover:scale-[1.015]" />
                        <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0D2129]/90 px-3 py-2 text-[10px] font-semibold text-white opacity-0 shadow-lg backdrop-blur-md transition group-hover:opacity-100">
                          <Maximize2 size={13} strokeWidth={1.5} className="text-[#FF5722]" /> Perbesar struk
                        </span>
                      </button>
                    ) : selected.id.startsWith("preview-") ? (
                      <div className="flex h-[400px] w-full max-w-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#102b35]">
                        <ImageIcon size={28} strokeWidth={1.5} className="text-gray-400" />
                        <p className="mt-3 text-xs font-semibold text-slate-300">Preview bukti transfer</p>
                        <p className="mt-1 text-[10px] text-slate-500">Data gambar simulasi · Portrait</p>
                      </div>
                    ) : (
                      <div className="px-4 text-center">
                        <ImageIcon size={26} strokeWidth={1.5} className="mx-auto text-gray-400" />
                        <p className="mt-2 text-xs font-semibold text-slate-400">{receiptError || "Bukti transfer belum tersedia."}</p>
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-white/[.08] bg-[#0b2028]/65 p-4">
                    <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Hasil ekstraksi</p><span className={`pill ${amountMatched ? "pill-green" : "pill-amber"}`}>{amountMatched ? "NOMINAL COCOK" : titleCase(selected.receipt_ocr_status)}</span></div>
                    <p className="mt-5 text-[10px] text-slate-500">Nominal terbaca OCR</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{money(ocr.extracted_amount ?? 0)}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-white/[.07] pt-3 text-xs"><span className="text-slate-500">Total pesanan</span><b>{money(selected.total_amount)}</b></div>
                    <div className="mt-2 flex items-center justify-between text-xs"><span className="text-slate-500">Model</span><span className="text-slate-300">{String(ocr.model ?? "—")}</span></div>
                    {amountMatched ? <p className="mt-4 rounded-lg border border-emerald-400/15 bg-emerald-400/[.07] p-3 text-[11px] leading-5 text-emerald-200">Nominal terbaca sama dengan total pesanan. Ini hanya kecocokan OCR, bukan bukti dana telah masuk ke rekening.</p> : <p className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/[.06] p-3 text-[11px] leading-5 text-amber-100">Perlu pemeriksaan manual. Cocokkan bukti dengan mutasi rekening sebelum menyetujui pembayaran.</p>}
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-lg bg-white/[.06] text-[11px] font-bold text-[#FF8058]">03</span><h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Rincian item</h3></div>
                <div className="overflow-x-auto rounded-xl border border-white/[.08]">
                  <table className="w-full min-w-[470px] text-left text-xs">
                    <thead className="bg-white/[.035] text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Produk</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Harga</th><th className="px-4 py-3 text-right">Subtotal</th></tr></thead>
                    <tbody>{selected.items.map(item => <tr key={item.id} className="border-t border-white/[.06]"><td className="px-4 py-3"><p className="font-semibold text-white">{item.product_name_snapshot}</p><p className="mt-1 text-[10px] text-slate-600">{item.sku_snapshot ?? "—"}</p></td><td className="px-4 py-3 text-right text-slate-300">{item.quantity}</td><td className="px-4 py-3 text-right text-slate-300">{money(item.unit_price)}</td><td className="px-4 py-3 text-right font-semibold text-white tabular-nums">{money(item.line_total)}</td></tr>)}</tbody>
                    {selected.items.length===0 && <tbody><tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">Detail item tidak tersedia.</td></tr></tbody>}
                  </table>
                </div>
                <div className="ml-auto mt-3 max-w-[260px] space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{money(selected.subtotal)}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Ongkir</span><span>{money(selected.shipping_cost)}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Diskon</span><span>− {money(selected.discount_amount)}</span></div>
                  <div className="flex justify-between border-t border-white/[.08] pt-3 text-sm font-bold text-white"><span>Total</span><span className="text-base font-bold tabular-nums text-white">{money(selected.total_amount)}</span></div>
                </div>
              </section>

              <section className="border-t border-white/[.08] pt-5">
                <div className="mb-3 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-lg bg-white/[.06] text-[11px] font-bold text-[#FF8058]">04</span><h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Keputusan owner</h3></div>
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[.06] p-3"><AlertTriangle size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-amber-300" /><p className="text-[11px] leading-5 text-amber-100/90">Persetujuan hanya boleh dilakukan setelah owner memastikan dana benar-benar masuk melalui mutasi rekening atau kanal pembayaran resmi. Hasil OCR tidak pernah otomatis mengesahkan pembayaran.</p></div>
                <button disabled={isPreview || !pendingReview} onClick={() => { setSettlementConfirmed(false); setConfirmOpen(true); }} className="btn-primary w-full py-4 text-xs tracking-[.04em] disabled:cursor-not-allowed disabled:opacity-40">{isPreview ? "AKSI DINONAKTIFKAN · DATA SIMULASI" : pendingReview ? "SETUJUI & PROSES PENGIRIMAN" : "PEMBAYARAN SUDAH DIKONFIRMASI"}</button>
                {!isPreview && pendingReview && <p className="mt-2 text-[10px] leading-5 text-slate-500">Saat ini aksi mengubah status ke Processing. Penerbitan resi dan pemanggilan kurir belum terintegrasi.</p>}
              </section>
            </div>
          )}
        </section>
      </div>

      {lightboxOpen && receiptUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bukti transfer ukuran penuh"
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02090d]/85 p-4 backdrop-blur-xl sm:p-8"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Tutup tampilan bukti transfer"
            className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-[#15303b]/90 text-white shadow-xl transition hover:border-[#FF5722]/40 hover:text-[#FF5722] sm:right-7 sm:top-7"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
          <div className="flex h-full w-full items-center justify-center" onClick={event => event.stopPropagation()}>
            <img
              src={receiptUrl}
              alt="Bukti pembayaran pesanan ukuran penuh"
              className="max-h-[92vh] max-w-[min(92vw,760px)] rounded-xl border border-white/10 bg-[#071a21] object-contain shadow-2xl shadow-black/50"
            />
          </div>
          <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[#102832]/90 px-4 py-2 text-[10px] text-slate-400 backdrop-blur-lg">
            Klik area luar gambar atau tekan Esc untuk menutup
          </p>
        </div>
      )}

      {confirmOpen && selected && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="approval-title" className="surface w-full max-w-lg rounded-2xl p-6">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#FF8058]">Payment settlement check</p>
            <h2 id="approval-title" className="mt-2 text-xl font-bold">Konfirmasi pembayaran</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">Tindakan ini akan mengubah status pembayaran menjadi verified dan status pesanan menjadi processing untuk pesanan <b className="text-white">{selected.order_number}</b>. Tindakan ini belum menerbitkan resi atau memesan kurir.</p>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-xs leading-5 text-amber-100">
              <input type="checkbox" checked={settlementConfirmed} onChange={e => setSettlementConfirmed(e.target.checked)} className="mt-1 accent-[#FF5722]" />
              <span>Saya telah memeriksa rekening/mutasi atau kanal pembayaran resmi dan memastikan dana sebesar <b>{money(selected.total_amount)}</b> benar-benar telah diterima.</span>
            </label>
            <div className="mt-6 flex justify-end gap-2"><button onClick={() => setConfirmOpen(false)} className="btn-secondary">Batal</button><button disabled={!settlementConfirmed || approving} onClick={() => void handleApprove()} className="btn-primary disabled:opacity-40">{approving ? "Memproses…" : "Konfirmasi & Proses"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
