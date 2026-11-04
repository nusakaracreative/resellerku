import Link from "next/link";

const metrics = [
  { label: "Pesanan perlu ditinjau", value: "—", note: "Terhubung setelah data pesanan masuk", icon: "◷" },
  { label: "Omzet terverifikasi", value: "Rp0", note: "Hanya pembayaran yang dikonfirmasi", icon: "↗" },
  { label: "Reseller aktif", value: "1", note: "Tenant demo saat ini", icon: "◎" },
  { label: "Produk aktif", value: "1", note: "Termasuk satu produk simulasi", icon: "▦" },
];

export default function HomePage() {
  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#FF8058]">Business overview</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="mt-2 text-sm text-slate-400">Pantau aktivitas operasional tenant Resellerku.</p>
        </div>
        <span className="pill pill-green w-fit">● Workspace terhubung</span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <article key={metric.label} className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{metric.label}</span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.05] text-lg text-[#FF8058]">{metric.icon}</span>
            </div>
            <p className="mt-5 text-2xl font-bold tabular-nums">{metric.value}</p>
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
          <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[.06] p-3 text-[11px] leading-5 text-amber-100/80">Data demo ditandai terpisah dan tidak boleh dihitung sebagai omzet atau performa bisnis riil.</p>
        </div>
      </section>
    </div>
  );
}
