import type { Metadata } from "next";
import { ArrowUpRight, PackageOpen, Sparkles } from "lucide-react";

export const metadata: Metadata = { title: "Katalog" };

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <header><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#FF8058]">Product management</p><h1 className="mt-2 text-3xl font-bold">Katalog Produk</h1><p className="mt-2 text-sm text-slate-400">Kelola harga dasar, harga tier reseller, stok, dan publikasi produk.</p></header>
      <section className="surface rounded-2xl border border-white/5 p-8 shadow-xl shadow-black/15">
        <span className="pill pill-amber"><Sparkles size={12} strokeWidth={1.5} /> Tahap integrasi berikutnya</span>
        <div className="mt-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-white/5 bg-white/[.035]"><PackageOpen size={21} strokeWidth={1.5} className="text-[#FF5722]" /></span><h2 className="text-lg font-bold">Katalog sudah tersedia di database</h2></div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Workspace demo memiliki satu produk aktif berlabel data simulasi. Antarmuka pengelolaan katalog akan dihubungkan ke tabel products dan product_tier_prices setelah alur pesanan dan validasi owner stabil.</p>
      </section>
    </div>
  );
}
