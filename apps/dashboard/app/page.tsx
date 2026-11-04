"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Metrics = {
  pendingOrders: number;
  verifiedOrders: number;
  activeResellers: number;
  activeProducts: number;
};

const emptyMetrics: Metrics = {
  pendingOrders: 0,
  verifiedOrders: 0,
  activeResellers: 0,
  activeProducts: 0,
};

const metricCards = [
  { key: "pendingOrders", label: "Pesanan perlu ditinjau", note: "Pesanan pembayaran yang menunggu pemeriksaan", icon: "◷" },
  { key: "verifiedOrders", label: "Pembayaran terverifikasi", note: "Jumlah pesanan dengan pembayaran terkonfirmasi", icon: "↗" },
  { key: "activeResellers", label: "Reseller aktif", note: "Membership reseller aktif pada tenant ini", icon: "◎" },
  { key: "activeProducts", label: "Produk aktif", note: "Tidak termasuk produk data simulasi", icon: "▦" },
] as const;

export default function HomePage() {
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");

      const { data: membership, error: membershipError } = await supabase
        .from("tenant_memberships")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) throw new Error("Tenant Business Owner aktif tidak ditemukan.");

      const tenantId = membership.tenant_id as string;
      const [pendingResult, verifiedResult, resellerResult, productResult] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId).eq("status", "payment_review").eq("payment_status", "submitted"),
        supabase.from("orders").select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId).eq("payment_status", "verified")
          .in("status", ["paid", "processing", "shipped", "delivered", "completed"]),
        supabase.from("tenant_memberships").select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId).eq("role", "reseller").eq("is_active", true),
        supabase.from("products").select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId).eq("status", "active").eq("is_demo_data", false),
      ]);

      const firstError = pendingResult.error ?? verifiedResult.error ?? resellerResult.error ?? productResult.error;
      if (firstError) throw firstError;

      setMetrics({
        pendingOrders: pendingResult.count ?? 0,
        verifiedOrders: verifiedResult.count ?? 0,
        activeResellers: resellerResult.count ?? 0,
        activeProducts: productResult.count ?? 0,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Metrik dashboard tidak dapat dimuat.");
      setMetrics(emptyMetrics);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMetrics(); }, [loadMetrics]);

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#FF8058]">Business overview</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="mt-2 text-sm text-slate-400">Pantau aktivitas operasional tenant Resellerku.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill pill-green">● Data Supabase</span>
          <button type="button" onClick={() => void loadMetrics()} disabled={loading} className="btn-secondary disabled:opacity-50">{loading ? "Memuat…" : "↻ Refresh"}</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[.08] px-4 py-3 text-sm text-rose-200">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <article key={metric.key} className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{metric.label}</span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.05] text-lg text-[#FF8058]">{metric.icon}</span>
            </div>
            <p className="mt-5 text-2xl font-bold tabular-nums">{loading ? "—" : metrics[metric.key].toLocaleString("id-ID")}</p>
            <p className="mt-1 text-[11px] text-slate-500">{metric.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="surface rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div><h2 className="font-bold">Alur operasional</h2><p className="mt-1 text-xs text-slate-500">Titik kendali utama Business Owner</p></div>
            <span className="pill pill-muted">Overview</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[["01","Terima pesanan","Periksa antrean dan identitas reseller"],["02","Validasi pembayaran","Tinjau struk dan konfirmasi settlement bank"],["03","Proses pengiriman","Teruskan pesanan setelah pembayaran valid"]].map(item => (
              <div key={item[0]} className="surface-muted rounded-xl p-4">
                <p className="text-[10px] font-bold tracking-widest text-[#FF8058]">{item[0]}</p>
                <h3 className="mt-4 text-sm font-bold">{item[1]}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{item[2]}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="surface rounded-2xl p-6">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Quick access</p>
          <h2 className="mt-2 text-lg font-bold">Pusat pengelolaan</h2>
          <div className="mt-5 space-y-2">
            <Link href="/orders" className="btn-secondary w-full justify-between">Antrean & verifikasi pesanan <span>→</span></Link>
            <Link href="/catalog" className="btn-secondary w-full justify-between">Kelola katalog produk <span>→</span></Link>
            <Link href="/assets" className="btn-secondary w-full justify-between">Marketing Asset Hub <span>→</span></Link>
          </div>
          <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[.06] p-3 text-[11px] leading-5 text-amber-100/80">Angka metrik berasal dari database tenant aktif. Produk bertanda data simulasi tidak dihitung sebagai produk bisnis riil. Pesanan preview di halaman Pesanan tidak mengubah metrik database.</p>
        </div>
      </section>
    </div>
  );
}
