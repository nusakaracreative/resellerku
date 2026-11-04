"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Home,
  ClipboardList,
  Package,
  Images,
  Menu,
  X,
  LogOut,
  Building2,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { href: "/", label: "Beranda", Icon: Home },
  { href: "/orders", label: "Pesanan", Icon: ClipboardList },
  { href: "/catalog", label: "Katalog", Icon: Package },
  { href: "/assets", label: "Asset Hub", Icon: Images },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(pathname !== "/login");
  const [allowed, setAllowed] = useState(pathname === "/login");
  const [email, setEmail] = useState("");
  const [tenantName, setTenantName] = useState("Workspace");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/login") {
      setBusy(false);
      setAllowed(true);
      return;
    }

    setBusy(true);
    setAllowed(false);
    let alive = true;
    const checkAccess = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.replace("/login");
          return;
        }

        const { data: memberships, error: memberError } = await supabase
          .from("tenant_memberships")
          .select("tenant_id")
          .eq("user_id", user.id)
          .eq("role", "owner")
          .eq("is_active", true)
          .limit(2);

        if (memberError || !memberships?.length) {
          router.replace("/login?reason=owner-only");
          return;
        }

        const tenantId = memberships[0].tenant_id as string;
        const [{ data: tenant }, { count: pending }, { count: totalOrders }] = await Promise.all([
          supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
          supabase.from("orders").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId).in("status", ["awaiting_payment", "payment_review"]),
          supabase.from("orders").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId),
        ]);

        if (alive) {
          const previewOnly = process.env.NEXT_PUBLIC_DASHBOARD_PREVIEW === "true" && (totalOrders ?? 0) === 0;
          setEmail(user.email ?? "");
          setTenantName(tenant?.name ?? "Workspace");
          setPendingCount((pending ?? 0) > 0 ? (pending ?? 0) : previewOnly ? 1 : 0);
          setAllowed(true);
        }
      } catch {
        if (alive) router.replace("/login");
      } finally {
        if (alive) setBusy(false);
      }
    };
    void checkAccess();
    return () => { alive = false; };
  }, [pathname, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  if (pathname === "/login") return <>{children}</>;
  if (busy || !allowed) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="surface rounded-2xl px-8 py-7 text-center shadow-lg">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#FF5722]" />
          <p className="text-sm text-slate-300">Memverifikasi akses Business Owner…</p>
        </div>
      </main>
    );
  }

  return (
    <div className="dashboard-grid min-h-screen">
      <button
        type="button"
        aria-label={mobileOpen ? "Tutup navigasi" : "Buka navigasi"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-xl border border-white/5 bg-[#15303b] text-gray-300 shadow-lg backdrop-blur-xl transition hover:border-white/10 hover:text-white lg:hidden"
      >
        {mobileOpen ? <X size={19} strokeWidth={1.5} /> : <Menu size={19} strokeWidth={1.5} />}
      </button>
      {mobileOpen && <button aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-white/[.06] bg-[#0b1d24]/95 px-4 py-5 shadow-2xl shadow-black/20 backdrop-blur-2xl transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Link href="/" className="mb-9 flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF5722] text-lg font-black text-white shadow-lg shadow-orange-950/30">R</span>
          <span>
            <span className="block text-[16px] font-extrabold tracking-wide text-white">RESELLERKU</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[.22em] text-slate-500">by Nusakara</span>
          </span>
        </Link>

        <div className="mb-5 px-2">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Workspace</p>
          <div className="rounded-xl border border-white/5 bg-[#15303b]/60 px-3 py-3 shadow-lg shadow-black/10">
            <div className="flex items-center gap-2">
              <Building2 size={15} strokeWidth={1.5} className="shrink-0 text-gray-400" />
              <p className="truncate text-sm font-semibold text-slate-200">{tenantName}</p>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400">
              <ShieldCheck size={12} strokeWidth={1.5} />
              Business Owner
            </div>
            {process.env.NEXT_PUBLIC_DASHBOARD_PREVIEW === "true" && <p className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-amber-300"><Eye size={11} strokeWidth={1.5} /> Preview · data simulasi</p>}
          </div>
        </div>

        <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Menu Utama</p>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.Icon;
            return (
              <Link key={item.href} href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center justify-between rounded-xl border px-3 py-3 transition-all duration-200 ${active ? "border-[#FF5722]/25 bg-[#FF5722]/[.09] text-white shadow-lg shadow-orange-950/10" : "border-transparent text-slate-400 hover:border-white/5 hover:bg-white/[.035] hover:text-white"}`}>
                <span className="flex items-center gap-3">
                  <Icon
                    size={18}
                    strokeWidth={1.5}
                    className={`transition-colors ${active ? "text-[#FF5722] drop-shadow-[0_0_7px_rgba(255,87,34,0.3)]" : "text-gray-400 group-hover:text-[#FF5722]"}`}
                  />
                  <span className="text-[13px] font-semibold">{item.label}</span>
                </span>
                {item.href === "/orders" && pendingCount !== null && (
                  <span className="rounded-full border border-[#FF5722]/20 bg-[#FF5722] px-2 py-0.5 text-[10px] font-extrabold text-white shadow-[0_0_12px_rgba(255,87,34,0.18)]">{pendingCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/[.06] pt-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/5 bg-[#234653] text-xs font-bold text-white">{(email[0] ?? "O").toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">{email || "Owner"}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Akun terverifikasi</p>
            </div>
          </div>
          <button onClick={signOut} className="group mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-500 transition hover:bg-white/[.04] hover:text-white">
            <LogOut size={15} strokeWidth={1.5} className="text-gray-400 transition-colors group-hover:text-[#FF5722]" />
            Keluar dari dashboard
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[250px]">
        <div className="mx-auto max-w-[1680px] px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
