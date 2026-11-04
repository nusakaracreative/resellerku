"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (loginError || !data.user) throw new Error(loginError?.message ?? "Login gagal.");

      const { data: membership, error: membershipError } = await supabase
        .from("tenant_memberships").select("id")
        .eq("user_id", data.user.id).eq("role", "owner").eq("is_active", true).limit(1).maybeSingle();

      if (membershipError || !membership) {
        await supabase.auth.signOut();
        throw new Error("Akun ini tidak memiliki akses Business Owner.");
      }

      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tidak dapat masuk. Periksa koneksi dan kredensial.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="surface w-full max-w-[430px] rounded-[26px] p-7 sm:p-9">
        <Link href="/" className="mb-9 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FF5722] text-xl font-black">R</span>
          <span><b className="block tracking-wide">RESELLERKU</b><small className="text-[10px] uppercase tracking-[.2em] text-slate-500">by Nusakara</small></span>
        </Link>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#FF8058]"><ShieldCheck size={13} strokeWidth={1.5} /> Owner access</p>
        <h1 className="text-2xl font-bold tracking-tight">Masuk ke Command Center</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Gunakan akun Business Owner yang terdaftar pada tenant Resellerku.</p>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-xs font-semibold text-slate-300">Email<div className="relative mt-2"><Mail size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input autoComplete="email" type="email" required className="field pl-10" placeholder="owner@brand.com" value={email} onChange={e => setEmail(e.target.value)} /></div></label>
          <label className="block text-xs font-semibold text-slate-300">Password<div className="relative mt-2"><LockKeyhole size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input autoComplete="current-password" type="password" required className="field pl-10" placeholder="Masukkan password" value={password} onChange={e => setPassword(e.target.value)} /></div></label>
          <button disabled={busy} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Memverifikasi…" : <>Masuk ke Dashboard <ArrowRight size={15} strokeWidth={1.5} /></>}</button>
        </form>
        <p className="mt-7 border-t border-white/[.08] pt-5 text-center text-[11px] text-slate-600">Akses terbatas untuk pemilik bisnis dan administrator tenant.</p>
      </div>
    </main>
  );
}
