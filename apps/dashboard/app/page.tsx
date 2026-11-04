"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  Activity,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Clock3,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  Image,
  Package,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  UserRound,
  Wallet,
  type LucideProps,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Metrics = {
  verifiedRevenue: number;
  pendingOrders: number;
  activeResellers: number;
  activeProducts: number;
};

type ActivityRow = {
  id: number;
  action: string;
  entity_type: string;
  details: Record<string, unknown>;
  created_at: string;
};

type RevenueDay = { label: string; dateLabel: string; value: number; isToday: boolean };

const emptyMetrics: Metrics = {
  verifiedRevenue: 0,
  pendingOrders: 0,
  activeResellers: 0,
  activeProducts: 0,
};

const metricCards: {
  key: keyof Metrics;
  label: string;
  note: string;
  Icon: ComponentType<LucideProps>;
}[] = [
  { key: "verifiedRevenue", label: "Omzet Terverifikasi", note: "Akumulasi transaksi dengan settlement terkonfirmasi", Icon: Banknote },
  { key: "pendingOrders", label: "Pesanan perlu ditinjau", note: "Pembayaran menunggu pemeriksaan", Icon: ClipboardList },
  { key: "activeResellers", label: "Reseller aktif", note: "Membership aktif pada tenant ini", Icon: UserRound },
  { key: "activeProducts", label: "Produk aktif", note: "Tidak termasuk data simulasi", Icon: Package },
];

const revenueValues = [32, 52, 44, 70, 58, 86, 65];

function createRevenueDays(): RevenueDay[] {
  const today = new Date();
  const days = revenueValues.map((value, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index), 12, 0, 0);
    const label = new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" }).format(date).replace(".", "").toUpperCase();
    const dateLabel = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", timeZone: "Asia/Jakarta" }).format(date);
    return { label, dateLabel, value, isToday: index === 6 };
  });
  return days;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function describeActivity(action: string, entityType: string, details: Record<string, unknown>) {
  const key = action.toLowerCase();
  const orderNumber = typeof details.order_number === "string" ? details.order_number : "";
  if (key.includes("payment_settlement_confirmed")) {
    return {
      title: "Settlement dikonfirmasi Owner",
      description: orderNumber ? `Pembayaran pesanan ${orderNumber} dinyatakan diterima` : "Pembayaran dikonfirmasi setelah pemeriksaan settlement",
      Icon: ShieldCheck,
    };
  }
  if (key.includes("receipt_ocr_matched")) {
    return {
      title: "Nominal OCR cocok",
      description: orderNumber ? `Struk pesanan ${orderNumber} berhasil dibaca Gemini` : "Nominal struk cocok dan menunggu konfirmasi Owner",
      Icon: FileCheck2,
    };
  }
  if (key.includes("receipt_ocr")) {
    return {
      title: "Pemeriksaan bukti pembayaran",
      description: orderNumber ? `Bukti transfer pesanan ${orderNumber} memerlukan pemeriksaan` : "Hasil OCR masuk ke antrean pemeriksaan",
      Icon: ClipboardCheck,
    };
  }
  if (key.includes("membership") || key.includes("reseller") || key.includes("member_added") || entityType.toLowerCase().includes("membership")) {
    return { title: "Reseller bergabung", description: "Membership reseller pada tenant diperbarui", Icon: UserPlus };
  }
  if (key.includes("asset")) {
    return { title: "Marketing Asset Hub", description: "Materi kampanye dibuat atau diperbarui", Icon: Image };
  }
  if (key.includes("product") || entityType === "product") {
    return { title: "Katalog produk diperbarui", description: "Informasi produk atau ketersediaannya berubah", Icon: PackageCheck };
  }
  if (key.includes("order") || entityType === "order") {
    return { title: "Aktivitas pesanan", description: orderNumber ? `Pembaruan pada pesanan ${orderNumber}` : "Status transaksi diperbarui", Icon: PackageCheck };
  }
  if (key.includes("wallet") || key.includes("payout")) {
    return { title: "Aktivitas saldo", description: "Perubahan pada ledger atau payout", Icon: Wallet };
  }
  return { title: "Aktivitas sistem", description: "Perubahan tercatat pada workspace", Icon: Activity };
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(date);
}

export default function HomePage() {
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [revenueDays] = useState<RevenueDay[]>(createRevenueDays);
  const [selectedRevenueDay, setSelectedRevenueDay] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activityUnavailable, setActivityUnavailable] = useState(false);

  const loadDashboard = useCallback(async () => {
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
      const sumVerifiedRevenue = async () => {
        let total = 0;
        let offset = 0;
        const pageSize = 500;
        while (true) {
          const { data, error: revenueError } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("tenant_id", tenantId)
            .eq("payment_status", "verified")
            .in("status", ["paid", "processing", "shipped", "delivered", "completed"])
            .order("placed_at", { ascending: false })
            .range(offset, offset + pageSize - 1);
          if (revenueError) throw revenueError;
          const rows = data ?? [];
          total += rows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
          if (rows.length < pageSize) break;
          offset += pageSize;
        }
        return total;
      };

      const [pendingResult, verifiedRevenue, resellerResult, productResult, activityResult] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId).eq("status", "payment_review").eq("payment_status", "submitted"),
        sumVerifiedRevenue(),
        supabase.from("tenant_memberships").select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId).eq("role", "reseller").eq("is_active", true),
        supabase.from("products").select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId).eq("status", "active").eq("is_demo_data", false),
        supabase.from("audit_logs").select("id,action,entity_type,details,created_at")
          .eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(6),
      ]);

      const firstError = pendingResult.error ?? resellerResult.error ?? productResult.error;
      if (firstError) throw firstError;

      setMetrics({
        verifiedRevenue,
        pendingOrders: pendingResult.count ?? 0,
        activeResellers: resellerResult.count ?? 0,
        activeProducts: productResult.count ?? 0,
      });

      if (activityResult.error) {
        setActivities([]);
        setActivityUnavailable(true);
      } else {
        setActivities((activityResult.data ?? []) as ActivityRow[]);
        setActivityUnavailable(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Data dashboard tidak dapat dimuat.");
      setMetrics(emptyMetrics);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#FF8058]">Business overview</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Command Center</h1>
          <p className="mt-2 text-sm text-slate-400">Pantau aktivitas operasional tenant Resellerku.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill pill-green"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.5)]" /> Data Supabase</span>
          <button type="button" onClick={() => void loadDashboard()} disabled={loading} className="btn-secondary disabled:opacity-50">
            <RefreshCw size={15} strokeWidth={1.5} className={loading ? "animate-spin text-[#FF5722]" : "text-gray-400"} />
            {loading ? "Memuat…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[.08] px-4 py-3 text-sm text-rose-200">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.Icon;
          const value = loading ? "—" : metric.key === "verifiedRevenue"
            ? formatRupiah(metrics.verifiedRevenue)
            : metrics[metric.key].toLocaleString("id-ID");
          return (
            <article key={metric.key} className="surface group rounded-2xl border border-white/5 p-5 shadow-xl shadow-black/15 transition duration-200 hover:-translate-y-0.5 hover:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-400">{metric.label}</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/5 bg-white/[.035]">
                  <Icon size={19} strokeWidth={1.5} className="text-[#FF5722] drop-shadow-[0_0_7px_rgba(255,87,34,.2)]" />
                </span>
              </div>
              <p className={`mt-5 font-bold tabular-nums text-white ${metric.key === "verifiedRevenue" ? "text-xl sm:text-2xl" : "text-2xl"}`}>{value}</p>
              <p className="mt-1 text-[11px] text-slate-500">{metric.note}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <article className="surface rounded-2xl border border-white/5 p-5 shadow-xl shadow-black/15 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-white/[.06] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity size={17} strokeWidth={1.5} className="text-[#FF5722]" />
                <h2 className="text-base font-semibold text-white">Log Aktivitas Terkini</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">Jejak perubahan pada workspace ini</p>
            </div>
            <span className="pill pill-muted">Audit trail</span>
          </div>

          <div className="divide-y divide-white/[.055]">
            {loading ? (
              <div className="py-10 text-center text-xs text-slate-500">Memuat aktivitas…</div>
            ) : activities.length > 0 ? activities.map((activity) => {
              const meta = describeActivity(activity.action, activity.entity_type, activity.details ?? {});
              const Icon = meta.Icon;
              return (
                <div key={activity.id} className="flex items-center gap-3 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/5 bg-[#0b2028]/75">
                    <Icon size={17} strokeWidth={1.5} className="text-gray-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">{meta.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{meta.description} · {activity.entity_type.replaceAll("_", " ")}</p>
                  </div>
                  <time className="shrink-0 text-[10px] tabular-nums text-slate-500">{formatActivityTime(activity.created_at)}</time>
                </div>
              );
            }) : (
              <div className="flex min-h-[250px] flex-col items-center justify-center px-5 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/5 bg-white/[.025]">
                  <Clock3 size={21} strokeWidth={1.5} className="text-gray-400" />
                </span>
                <p className="mt-4 text-sm font-semibold text-slate-300">Belum ada aktivitas</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{activityUnavailable ? "Audit trail belum dapat dibaca oleh sesi ini." : "Aktivitas baru akan muncul ketika ada perubahan pesanan, pembayaran, produk, atau aset."}</p>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-white/[.06] pt-4">
            <span className="text-[10px] text-slate-600">Maksimal 6 aktivitas terbaru</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500"><ShieldCheck size={13} strokeWidth={1.5} /> Tenant scoped</span>
          </div>
        </article>

        <article className="surface rounded-2xl border border-white/5 p-5 shadow-xl shadow-black/15 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-white/[.06] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={17} strokeWidth={1.5} className="text-[#FF5722]" />
                <h2 className="text-base font-semibold text-white">Tren Omzet 7 Hari Terakhir</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">Pratinjau visual mingguan · pilih hari untuk detail</p>
            </div>
            <span className="pill pill-amber"><CalendarDays size={12} strokeWidth={1.5} /> Simulasi</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[.05] bg-[#0b2028]/55 px-3 py-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500">{revenueDays[selectedRevenueDay]?.isToday ? "Hari ini" : "Hari dipilih"}</p>
              <p className="mt-1 text-sm font-bold text-white">{revenueDays[selectedRevenueDay]?.dateLabel} · {revenueDays[selectedRevenueDay]?.label}</p>
            </div>
            <p className="text-lg font-bold tabular-nums text-[#FF8058]">{revenueDays[selectedRevenueDay]?.value}%</p>
          </div>

          <div className="mt-5 flex items-end justify-between gap-2" role="group" aria-label="Grafik tren omzet simulasi tujuh hari">
            {revenueDays.map((item, index) => {
              const selected = selectedRevenueDay === index;
              return (
                <button
                  type="button"
                  key={item.dateLabel}
                  onClick={() => setSelectedRevenueDay(index)}
                  aria-pressed={selected}
                  aria-label={`${item.label} ${item.dateLabel}, intensitas simulasi ${item.value} persen`}
                  className={`group flex min-w-0 flex-1 flex-col items-center gap-2.5 rounded-xl px-1 pb-2 pt-2 transition ${selected ? "bg-white/[.035] ring-1 ring-[#FF5722]/25" : "hover:bg-white/[.025]"}`}
                >
                  <span className={`text-[9px] tabular-nums transition ${selected || item.isToday ? "font-bold text-[#FF8058]" : "text-slate-600 group-hover:text-slate-300"}`}>{item.value}%</span>
                  <span className="flex h-36 w-full items-end justify-center rounded-lg border border-white/[.035] bg-[#0b2028]/65 p-1.5">
                    <span
                      className={`w-full max-w-8 rounded-t-md transition-all duration-300 ${item.isToday ? "bg-gradient-to-t from-[#E64A19] to-[#FF855E] shadow-[0_0_20px_rgba(255,87,34,.25)]" : "bg-gradient-to-t from-[#17495A] to-[#398096]/85"} ${selected && !item.isToday ? "brightness-125" : ""}`}
                      style={{ height: `${item.value}%` }}
                    />
                  </span>
                  <span className={`text-[9px] font-semibold tracking-wide ${item.isToday ? "text-[#FF8058]" : selected ? "text-white" : "text-slate-500"}`}>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/10 bg-amber-300/[.045] p-3">
            <Banknote size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-amber-300" />
            <p className="text-[10px] leading-5 text-amber-100/75">Grafik interaktif ini masih simulasi visual, bukan omzet aktual. Omzet terverifikasi di kartu utama dihitung dari nilai pesanan dengan status pembayaran verified.</p>
          </div>
        </article>
      </section>

      <section className="surface rounded-2xl border border-white/5 p-5 shadow-xl shadow-black/15 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Quick access</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Pusat pengelolaan</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link href="/orders" className="btn-secondary justify-between text-xs">Antrean pesanan <ArrowUpRight size={14} strokeWidth={1.5} className="text-gray-400" /></Link>
            <Link href="/catalog" className="btn-secondary justify-between text-xs">Katalog produk <ArrowUpRight size={14} strokeWidth={1.5} className="text-gray-400" /></Link>
            <Link href="/assets" className="btn-secondary justify-between text-xs">Marketing Asset Hub <ArrowUpRight size={14} strokeWidth={1.5} className="text-gray-400" /></Link>
          </div>
        </div>
        <p className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[.045] p-3 text-[10px] leading-5 text-amber-100/75">Angka metrik berasal dari database tenant aktif. Produk bertanda data simulasi tidak dihitung sebagai produk bisnis riil. Grafik tren omzet di atas belum terhubung ke laporan aktual.</p>
      </section>
    </div>
  );
}
