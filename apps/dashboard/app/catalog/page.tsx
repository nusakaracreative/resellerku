import type { Metadata } from "next";

export const metadata: Metadata = { title: "Katalog" };

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <header><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#FF8058]">Product management</p><h1 className="mt-2 text-3xl font-bold">Katalog Produk</h1><p className="mt-2 text-sm text-slate-400">Kelola harga dasar, harga tier reseller, stok, dan publikasi produk.</p></header>
      <section className="surface rounded-2xl p-8">
        <span className="pill pill-amber">Tahap integrasi berikutnya</span>
        <h2 className="mt-4 text-lg font-bold">Katalog sudah tersedia di database</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Workspace demo memiliki satu produk aktif berlabel data simulasi. Antarmuka pengelolaan katalog akan dihubungkan ke tabel products dan product_tier_prices setelah alur pesanan dan validasi owner stabil.</p>
      </section>
    </div>
  );
}
