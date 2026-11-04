"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ClipboardList,
  LoaderCircle,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OrderHit = {
  id: string;
  order_number: string;
  reseller_id: string;
  recipient_name: string;
  total_amount: number | string;
  status: string;
  payment_status: string;
  isPreview?: boolean;
};

type ResellerHit = {
  id: string;
  full_name: string;
};

type Props = { tenantId: string };

const money = (value: number | string) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value ?? 0));

const statusLabel = (paymentStatus: string) =>
  paymentStatus === "verified" ? "Terverifikasi" : paymentStatus === "submitted" ? "Menunggu review" : paymentStatus.replaceAll("_", " ");

export function UniversalSearch({ tenantId }: Props) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderHit[]>([]);
  const [resellers, setResellers] = useState<ResellerHit[]>([]);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    const handleOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", handleShortcut);
    document.addEventListener("mousedown", handleOutside);
    return () => {
      window.removeEventListener("keydown", handleShortcut);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  useEffect(() => {
    const term = value.trim();
    if (!open || term.length < 2 || !tenantId) {
      setOrders([]);
      setResellers([]);
      setSearchError("");
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setSearchError("");
    const timer = window.setTimeout(async () => {
      try {
        const supabase = createClient();
        const [orderResult, membershipResult] = await Promise.all([
          supabase.from("orders")
            .select("id,order_number,reseller_id,recipient_name,total_amount,status,payment_status")
            .eq("tenant_id", tenantId)
            .ilike("order_number", `%${term}%`)
            .order("placed_at", { ascending: false })
            .limit(6),
          supabase.from("tenant_memberships")
            .select("user_id")
            .eq("tenant_id", tenantId)
            .eq("role", "reseller")
            .eq("is_active", true)
            .limit(1000),
        ]);
        if (orderResult.error) throw orderResult.error;
        if (membershipResult.error) throw membershipResult.error;

        const exactOrderId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(term);
        let exactOrder: OrderHit[] = [];
        if (exactOrderId) {
          const { data, error } = await supabase.from("orders")
            .select("id,order_number,reseller_id,recipient_name,total_amount,status,payment_status")
            .eq("tenant_id", tenantId)
            .eq("id", term)
            .limit(1);
          if (error) throw error;
          exactOrder = (data ?? []) as OrderHit[];
        }

        const resellerIds = [...new Set((membershipResult.data ?? []).map(row => row.user_id as string))];
        let resellerMatches: ResellerHit[] = [];
        if (resellerIds.length) {
          const { data, error } = await supabase.from("users")
            .select("id,full_name")
            .in("id", resellerIds)
            .ilike("full_name", `%${term}%`)
            .limit(5);
          if (error) throw error;
          resellerMatches = (data ?? []).filter(row => Boolean(row.full_name)) as ResellerHit[];
        }

        const databaseOrders = [...exactOrder, ...(orderResult.data ?? []).filter(row => !exactOrder.some(exact => exact.id === row.id))] as OrderHit[];
        const previewEnabled = process.env.NEXT_PUBLIC_DASHBOARD_PREVIEW === "true";
        const previewOrderText = "RSK-DEMO-2026-001 sobri demo pelanggan simulasi";
        const previewOrderMatches = previewEnabled && previewOrderText.includes(term.toLowerCase());
        const previewOrders: OrderHit[] = previewOrderMatches ? [{
          id: "preview-order-001",
          order_number: "RSK-DEMO-2026-001",
          reseller_id: "preview-reseller",
          recipient_name: "Pelanggan Simulasi",
          total_amount: 52000,
          status: "payment_review",
          payment_status: "submitted",
          isPreview: true,
        }] : [];
        const previewResellers: ResellerHit[] = previewEnabled && "sobri demo".includes(term.toLowerCase())
          ? [{ id: "preview-reseller", full_name: "Sobri Demo" }]
          : [];

        if (alive) {
          setOrders([...databaseOrders, ...previewOrders.filter(row => !databaseOrders.some(item => item.order_number === row.order_number))]);
          setResellers([...resellerMatches, ...previewResellers.filter(row => !resellerMatches.some(item => item.id === row.id))]);
        }
      } catch (caught) {
        if (alive) {
          setOrders([]);
          setResellers([]);
          setSearchError(caught instanceof Error ? caught.message : "Pencarian tidak dapat dilakukan.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }, 220);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [value, open, tenantId]);

  const openOrdersSearch = (term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    window.dispatchEvent(new CustomEvent("resellerku:orders-search", { detail: cleaned }));
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/orders?search=${encodeURIComponent(cleaned)}`);
  };

  const hasResults = orders.length > 0 || resellers.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-[580px]">
      <div className={`flex h-11 items-center gap-3 rounded-xl border bg-[#102832]/85 px-3.5 shadow-xl shadow-black/10 backdrop-blur-xl transition ${open ? "border-[#FF5722]/45 shadow-[0_0_0_3px_rgba(255,87,34,.08)]" : "border-white/5 hover:border-white/10"}`}>
        <Search size={17} strokeWidth={1.5} className={open ? "shrink-0 text-[#FF5722] drop-shadow-[0_0_7px_rgba(255,87,34,.25)]" : "shrink-0 text-gray-400"} />
        <input
          ref={inputRef}
          value={value}
          onChange={event => setValue(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Cari ID pesanan atau nama reseller…"
          aria-label="Pencarian global pesanan dan reseller"
          aria-expanded={open}
          aria-controls="universal-search-results"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
        />
        {value ? (
          <button type="button" onClick={() => { setValue(""); inputRef.current?.focus(); }} aria-label="Hapus pencarian" className="grid h-7 w-7 place-items-center rounded-lg text-gray-400 transition hover:bg-white/5 hover:text-white">
            <X size={14} strokeWidth={1.5} />
          </button>
        ) : (
          <kbd className="hidden rounded-md border border-white/10 bg-white/[.035] px-2 py-1 text-[10px] font-medium text-slate-500 sm:inline-flex">Ctrl K</kbd>
        )}
      </div>

      {open && (
        <div id="universal-search-results" role="listbox" className="absolute left-0 right-0 top-[calc(100%+10px)] z-[70] overflow-hidden rounded-2xl border border-white/10 bg-[#0D2129]/[.98] shadow-2xl shadow-black/45 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Universal Search</p>
            <span className="text-[10px] text-slate-600">Tenant aktif · Owner</span>
          </div>
          {value.trim().length < 2 ? (
            <div className="flex items-center gap-3 px-4 py-5 text-xs text-slate-500">
              <Search size={16} strokeWidth={1.5} className="text-gray-400" />
              Ketik minimal 2 karakter untuk mencari pesanan atau reseller.
            </div>
          ) : loading ? (
            <div className="flex items-center gap-3 px-4 py-5 text-xs text-slate-400">
              <LoaderCircle size={16} strokeWidth={1.5} className="animate-spin text-[#FF5722]" />
              Mencari data tenant…
            </div>
          ) : searchError ? (
            <p role="alert" className="px-4 py-5 text-xs text-rose-300">{searchError}</p>
          ) : !hasResults ? (
            <p className="px-4 py-6 text-center text-xs text-slate-500">Tidak ada pesanan atau reseller yang cocok.</p>
          ) : (
            <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
              {orders.length > 0 && (
                <div>
                  <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-[.18em] text-slate-600">Pesanan</p>
                  {orders.map(order => (
                    <button
                      type="button"
                      key={order.id}
                      role="option"
                      aria-selected="false"
                      onClick={() => openOrdersSearch(order.order_number)}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[.045]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/5 bg-white/[.035]">
                        <ClipboardList size={16} strokeWidth={1.5} className="text-gray-400 transition group-hover:text-[#FF5722]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-100">{order.order_number}</span>
                        <span className="mt-1 block truncate text-[10px] text-slate-500">{order.recipient_name} · {money(order.total_amount)}</span>
                      </span>
                      <span className="hidden shrink-0 text-[9px] text-slate-500 sm:block">{order.isPreview ? "SIMULASI" : statusLabel(order.payment_status)}</span>
                      <ArrowUpRight size={14} strokeWidth={1.5} className="shrink-0 text-gray-500 transition group-hover:text-[#FF5722]" />
                    </button>
                  ))}
                </div>
              )}
              {resellers.length > 0 && (
                <div className={orders.length ? "mt-2 border-t border-white/[.06] pt-1" : ""}>
                  <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-[.18em] text-slate-600">Reseller</p>
                  {resellers.map(reseller => (
                    <button
                      type="button"
                      key={reseller.id}
                      role="option"
                      aria-selected="false"
                      onClick={() => openOrdersSearch(reseller.full_name)}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[.045]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/5 bg-white/[.035]">
                        <UserRound size={16} strokeWidth={1.5} className="text-gray-400 transition group-hover:text-[#FF5722]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-100">{reseller.full_name}</span>
                        <span className="mt-1 block text-[10px] text-slate-500">Cari seluruh pesanan reseller ini</span>
                      </span>
                      <ArrowUpRight size={14} strokeWidth={1.5} className="shrink-0 text-gray-500 transition group-hover:text-[#FF5722]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="border-t border-white/[.06] px-4 py-2.5 text-[9px] text-slate-600">Hasil dibatasi pada tenant aktif dan hanya menampilkan reseller yang terdaftar di tenant ini.</div>
        </div>
      )}
    </div>
  );
}
