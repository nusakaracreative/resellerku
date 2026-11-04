"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Heart,
  Menu,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Truck,
  X,
  Zap,
  Smartphone,
  Shirt,
  Coffee,
  House,
  Watch,
} from "lucide-react";

type StoreProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  rating: string;
  reviews: number;
  image: string;
  tag: string;
  description: string;
  accent: string;
};

const products: StoreProduct[] = [
  {
    id: "kpk-150",
    name: "Kripik Pedas Kekinian 150 g",
    category: "Makanan",
    price: 20000,
    rating: "4.9",
    reviews: 128,
    image: "https://images.unsplash.com/photo-1621939514649-280e2aa2702f?auto=format&fit=crop&w=900&q=85",
    tag: "Produk demo",
    description: "Camilan renyah dengan rasa pedas yang berani. Produk simulasi Resellerku yang digunakan untuk melihat tampilan katalog dan detail produk.",
    accent: "from-orange-100 to-amber-50",
  },
  {
    id: "audio-01",
    name: "Wireless Headphones Studio",
    category: "Gadget",
    price: 329000,
    oldPrice: 399000,
    rating: "4.8",
    reviews: 86,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",
    tag: "Best pick",
    description: "Headphones wireless dengan tampilan minimal dan bantalan nyaman untuk menemani aktivitas harian. Produk contoh untuk preview.",
    accent: "from-slate-100 to-gray-50",
  },
  {
    id: "bag-02",
    name: "Everyday Leather Tote",
    category: "Fashion",
    price: 289000,
    oldPrice: 349000,
    rating: "4.9",
    reviews: 54,
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=85",
    tag: "New edit",
    description: "Tas berdesain clean dengan ruang yang cukup untuk kebutuhan sehari-hari. Foto dan harga merupakan materi simulasi.",
    accent: "from-stone-100 to-orange-50",
  },
  {
    id: "device-03",
    name: "Smartphone Essential",
    category: "Gadget",
    price: 1899000,
    rating: "4.7",
    reviews: 42,
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85",
    tag: "Popular",
    description: "Perangkat smartphone untuk kebutuhan komunikasi dan hiburan. Produk visual contoh, bukan penawaran stok aktual.",
    accent: "from-blue-100 to-slate-50",
  },
  {
    id: "hoodie-04",
    name: "Essential Oversized Hoodie",
    category: "Fashion",
    price: 249000,
    oldPrice: 299000,
    rating: "4.9",
    reviews: 91,
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",
    tag: "Limited edit",
    description: "Hoodie berpotongan relaxed dengan gaya modern yang mudah dipadukan. Produk contoh untuk menjajal pengalaman belanja.",
    accent: "from-neutral-200 to-stone-100",
  },
  {
    id: "care-05",
    name: "Daily Care Serum",
    category: "Lifestyle",
    price: 119000,
    oldPrice: 149000,
    rating: "4.8",
    reviews: 73,
    image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85",
    tag: "Daily essential",
    description: "Visual produk perawatan diri untuk contoh kategori lifestyle. Detail, komposisi, dan harga aktual belum dihubungkan.",
    accent: "from-rose-100 to-stone-50",
  },
  {
    id: "bottle-06",
    name: "Insulated Daily Bottle",
    category: "Lifestyle",
    price: 129000,
    rating: "4.7",
    reviews: 38,
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85",
    tag: "Everyday",
    description: "Botol minum reusable untuk rutinitas harian. Produk contoh yang belum mewakili stok toko sebenarnya.",
    accent: "from-emerald-100 to-slate-50",
  },
  {
    id: "coffee-07",
    name: "Morning Ritual Coffee Set",
    category: "Makanan",
    price: 99000,
    oldPrice: 125000,
    rating: "4.9",
    reviews: 61,
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85",
    tag: "Curated set",
    description: "Visual set kopi dan perlengkapan minum untuk contoh produk kategori makanan dan minuman.",
    accent: "from-amber-100 to-stone-50",
  },
];

const categories = [
  { name: "Gadget", subtitle: "Tech for daily life", Icon: Smartphone, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=80" },
  { name: "Fashion", subtitle: "Everyday essentials", Icon: Shirt, image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=80" },
  { name: "Makanan", subtitle: "Good things to share", Icon: Coffee, image: "https://images.unsplash.com/photo-1621939514649-280e2aa2702f?auto=format&fit=crop&w=700&q=80" },
  { name: "Lifestyle", subtitle: "Little daily upgrades", Icon: House, image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=700&q=80" },
];

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function ProductImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={(event) => {
        event.currentTarget.style.opacity = "0";
      }}
    />
  );
}

export default function StorePreviewPage() {
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StoreProduct | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sort, setSort] = useState("featured");

  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const categoryMatch = category === "Semua" || product.category === category;
      const queryMatch = !term || (product.name + " " + product.category).toLowerCase().includes(term);
      return categoryMatch && queryMatch;
    });
    if (sort === "low") filtered.sort((a, b) => a.price - b.price);
    if (sort === "high") filtered.sort((a, b) => b.price - a.price);
    return filtered;
  }, [category, query, sort]);

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const cartProducts = products.filter((product) => (cart[product.id] ?? 0) > 0);
  const cartTotal = cartProducts.reduce((sum, product) => sum + product.price * cart[product.id], 0);

  const addToCart = (product: StoreProduct) => {
    setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
    setNotice(product.name + " ditambahkan ke keranjang preview.");
    setSelected(null);
  };

  const scrollToProducts = () => {
    document.getElementById("store-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-[#F5F3EE] text-[#172126] selection:bg-[#FF5722]/20">
      <div className="bg-[#0D2129] px-4 py-2 text-center text-[9px] font-semibold uppercase tracking-[.18em] text-white/75 sm:text-[10px]">
        <span className="text-[#FF8058]">RESELLERKU SELECT</span>
        <span className="mx-2 text-white/25">/</span>
        Pilihan produk dan peluang baru, setiap hari
        <span className="mx-2 hidden text-white/25 sm:inline">/</span>
        <span className="hidden text-white/55 sm:inline">Preview storefront · Simulasi</span>
      </div>

      <header className="sticky top-0 z-40 border-b border-black/[.06] bg-[#F8F7F3]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <button type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 text-[#172126] lg:hidden" aria-label="Buka menu" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X size={19} strokeWidth={1.5} /> : <Menu size={19} strokeWidth={1.5} />}
          </button>
          <a href="#top" className="flex shrink-0 items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF5722] text-lg font-black text-white shadow-lg shadow-orange-900/15">R</span>
            <span>
              <span className="block text-[17px] font-black tracking-[-.04em] text-[#0D2129]">RESELLERKU</span>
              <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[.28em] text-[#65757B]">Curated marketplace</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-[11px] font-semibold text-[#526169] lg:flex">
            <a href="#top" className="text-[#0D2129] transition hover:text-[#FF5722]">Beranda</a>
            <a href="#categories" className="transition hover:text-[#FF5722]">Kategori</a>
            <a href="#store-products" className="transition hover:text-[#FF5722]">Produk pilihan</a>
            <a href="#story" className="transition hover:text-[#FF5722]">Tentang kami</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <label className="hidden h-10 w-52 items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3.5 md:flex">
              <Search size={15} strokeWidth={1.5} className="text-[#738087]" />
              <input value={query} onChange={(event) => { setQuery(event.target.value); scrollToProducts(); }} placeholder="Cari produk..." className="w-full bg-transparent text-[11px] outline-none placeholder:text-[#929B9F]" />
            </label>
            <button type="button" onClick={() => setCartOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-black/[.04]" aria-label="Buka keranjang">
              <ShoppingBag size={19} strokeWidth={1.5} />
              <span className="absolute right-0 top-0 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#FF5722] px-1 text-[9px] font-bold text-white">{cartCount}</span>
            </button>
            <span className="hidden h-9 items-center rounded-full border border-[#FF5722]/20 bg-[#FF5722]/[.06] px-3 text-[9px] font-bold uppercase tracking-wider text-[#D94D22] sm:inline-flex">Preview</span>
          </div>
        </div>
        {mobileMenu && (
          <div className="border-t border-black/[.06] bg-[#F8F7F3] px-5 py-4 lg:hidden">
            <nav className="flex flex-col gap-4 text-sm font-semibold text-[#526169]">
              <a href="#top" onClick={() => setMobileMenu(false)}>Beranda</a>
              <a href="#categories" onClick={() => setMobileMenu(false)}>Kategori</a>
              <a href="#store-products" onClick={() => setMobileMenu(false)}>Produk pilihan</a>
              <a href="#story" onClick={() => setMobileMenu(false)}>Tentang kami</a>
            </nav>
            <label className="mt-4 flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-3.5">
              <Search size={15} strokeWidth={1.5} className="text-[#738087]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk..." className="w-full bg-transparent text-xs outline-none" />
            </label>
          </div>
        )}
      </header>

      <section id="top" className="relative isolate overflow-hidden bg-[#0D2129] text-white">
        <div className="pointer-events-none absolute -right-40 -top-48 h-[560px] w-[560px] rounded-full bg-[#FF5722]/15 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-72 left-[26%] h-[500px] w-[500px] rounded-full bg-[#316070]/30 blur-[110px]" />
        <div className="relative mx-auto grid min-h-[590px] max-w-[1440px] gap-8 px-5 py-14 sm:px-8 md:grid-cols-[.9fr_1.1fr] md:items-center md:py-16 lg:min-h-[660px] lg:px-12">
          <div className="relative z-10 max-w-[590px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FF8058]/25 bg-[#FF5722]/[.08] px-3.5 py-2 text-[9px] font-bold uppercase tracking-[.2em] text-[#FF9A77]">
              <Sparkles size={13} strokeWidth={1.5} /> The Resellerku Edit
            </div>
            <h1 className="max-w-[620px] text-[clamp(2.9rem,6.4vw,5.8rem)] font-black leading-[.94] tracking-[-.065em]">
              Temukan yang tepat<span className="text-[#FF8058]">.</span>
              <span className="mt-2 block font-medium text-white/65">Jalani lebih banyak.</span>
            </h1>
            <p className="mt-7 max-w-[430px] text-sm leading-7 text-white/60 sm:text-[15px]">
              Pilihan produk untuk kebutuhan sehari-hari, dikurasi agar pengalaman berbelanja terasa lebih mudah dan menyenangkan.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button type="button" onClick={scrollToProducts} className="inline-flex h-12 items-center gap-3 rounded-full bg-[#FF5722] px-6 text-[11px] font-bold text-white shadow-[0_12px_34px_rgba(255,87,34,.22)] transition hover:-translate-y-0.5 hover:bg-[#E64A19]">
                Jelajahi koleksi <ArrowRight size={15} strokeWidth={1.5} />
              </button>
              <a href="#story" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-5 text-[11px] font-semibold text-white/75 transition hover:border-white/35 hover:text-white">
                Tentang Resellerku <ArrowUpRight size={14} strokeWidth={1.5} />
              </a>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/10 pt-6">
              <div className="flex items-center gap-2 text-[10px] text-white/60"><ShieldCheck size={16} strokeWidth={1.5} className="text-[#FF8058]" /> Pilihan terkurasi</div>
              <div className="flex items-center gap-2 text-[10px] text-white/60"><PackageCheck size={16} strokeWidth={1.5} className="text-[#FF8058]" /> Katalog terorganisir</div>
              <div className="flex items-center gap-2 text-[10px] text-white/60"><Truck size={16} strokeWidth={1.5} className="text-[#FF8058]" /> Pengalaman praktis</div>
            </div>
          </div>

          <div className="relative mx-auto grid w-full max-w-[650px] grid-cols-[1.08fr_.92fr] gap-3 md:ml-auto">
            <div className="relative min-h-[390px] overflow-hidden rounded-[26px] border border-white/10 bg-[#1B3B46] shadow-2xl shadow-black/35 sm:min-h-[485px]">
              <ProductImage src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1100&q=90" alt="Headphones pilihan" className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 hover:scale-[1.035]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071920]/90 via-[#071920]/5 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#FF9A77]">Gadget / 01</p>
                <p className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">Everyday tech.</p>
                <p className="mt-1 text-[10px] text-white/65">Small details. Better days.</p>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="relative min-h-[185px] overflow-hidden rounded-[26px] border border-white/10 bg-[#243C43] sm:min-h-[235px]">
                <ProductImage src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=85" alt="Smartphone pilihan" className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071920]/80 to-transparent" />
                <div className="absolute bottom-4 left-4"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/60">Gadget / 02</p><p className="mt-1 text-sm font-bold text-white">Stay connected.</p></div>
              </div>
              <div className="relative min-h-[185px] overflow-hidden rounded-[26px] border border-white/10 bg-[#64554C] sm:min-h-[235px]">
                <ProductImage src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=85" alt="Tas lifestyle" className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#151313]/80 to-transparent" />
                <div className="absolute bottom-4 left-4"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/60">Lifestyle / 03</p><p className="mt-1 text-sm font-bold text-white">Carry your day.</p></div>
              </div>
            </div>
            <div className="absolute -bottom-5 right-6 z-10 hidden rounded-full border border-white/15 bg-[#FF5722] px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-white shadow-xl shadow-black/20 sm:block">
              Discover something good <ArrowDownRight size={13} strokeWidth={1.5} className="ml-2 inline" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-black/[.06] bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-black/[.06] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3 py-5 sm:px-5"><ShieldCheck size={19} strokeWidth={1.5} className="text-[#FF5722]" /><div><p className="text-[11px] font-bold text-[#172126]">Curated selection</p><p className="mt-1 text-[10px] text-[#8A9498]">Koleksi terpilih untuk setiap kebutuhan</p></div></div>
          <div className="flex items-center gap-3 py-5 sm:px-7"><PackageCheck size={19} strokeWidth={1.5} className="text-[#FF5722]" /><div><p className="text-[11px] font-bold text-[#172126]">Clear product details</p><p className="mt-1 text-[10px] text-[#8A9498]">Informasi produk yang mudah dipahami</p></div></div>
          <div className="flex items-center gap-3 py-5 sm:px-7"><Truck size={19} strokeWidth={1.5} className="text-[#FF5722]" /><div><p className="text-[11px] font-bold text-[#172126]">Simple shopping flow</p><p className="mt-1 text-[10px] text-[#8A9498]">Pengalaman belanja yang praktis</p></div></div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[.23em] text-[#D9572B]">Find your category</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-.05em] text-[#172126] sm:text-4xl">Shop by category<span className="text-[#FF5722]">.</span></h2>
            <p className="mt-2 text-xs text-[#7A858A]">Temukan pilihan yang sesuai dengan gaya dan kebutuhanmu.</p>
          </div>
          <button type="button" onClick={() => { setCategory("Semua"); scrollToProducts(); }} className="hidden items-center gap-2 text-[10px] font-bold text-[#59676D] transition hover:text-[#FF5722] sm:inline-flex">Semua kategori <ArrowRight size={14} strokeWidth={1.5} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          {categories.map((item, index) => {
            const Icon = item.Icon;
            return (
              <button key={item.name} type="button" onClick={() => { setCategory(item.name); scrollToProducts(); }} className="group relative h-[190px] overflow-hidden rounded-2xl border border-black/[.06] bg-[#E8E5DF] text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:h-[245px]">
                <ProductImage src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101A1E]/85 via-black/5 to-transparent" />
                <span className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-black/15 text-white backdrop-blur-md"><Icon size={17} strokeWidth={1.5} /></span>
                <span className="absolute bottom-4 left-4 right-4 text-white"><span className="block text-base font-bold tracking-tight">{item.name}</span><span className="mt-1 block text-[9px] text-white/65">{item.subtitle}</span><span className="mt-3 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#FFAD90]">Explore <ArrowUpRight size={12} strokeWidth={1.5} /></span></span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="store-products" className="scroll-mt-24 border-y border-black/[.06] bg-[#EEECE6]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.23em] text-[#D9572B]">The current edit</p>
              <h2 className="mt-2 text-3xl font-bold tracking-[-.05em] text-[#172126] sm:text-4xl">Pilihan untukmu<span className="text-[#FF5722]">.</span></h2>
              <p className="mt-2 text-xs text-[#7A858A]">Koleksi pratinjau untuk melihat pengalaman katalog Resellerku.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 sm:hidden">
                <Search size={14} strokeWidth={1.5} className="text-[#7A858A]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk..." className="w-full bg-transparent text-xs outline-none" />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {["Semua", "Gadget", "Fashion", "Makanan", "Lifestyle"].map((item) => (
                  <button key={item} type="button" onClick={() => setCategory(item)} className={"rounded-full border px-4 py-2 text-[10px] font-semibold transition " + (category === item ? "border-[#0D2129] bg-[#0D2129] text-white" : "border-black/10 bg-white/55 text-[#58656B] hover:border-[#FF5722]/40 hover:text-[#D9572B]")}>{item}</button>
                ))}
              </div>
              <label className="flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 text-[10px] text-[#526169]">
                <SlidersHorizontal size={13} strokeWidth={1.5} />
                <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent outline-none">
                  <option value="featured">Pilihan kami</option>
                  <option value="low">Harga terendah</option>
                  <option value="high">Harga tertinggi</option>
                </select>
                <ChevronDown size={12} strokeWidth={1.5} />
              </label>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-b border-black/[.08] pb-3">
            <p className="text-[10px] text-[#7A858A]">{visibleProducts.length} produk ditampilkan</p>
            <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#A0A6A8]">Preview products · IDR</p>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="grid min-h-[250px] place-items-center text-center">
              <div><Search size={26} strokeWidth={1.5} className="mx-auto text-[#A0A6A8]" /><p className="mt-3 text-sm font-semibold text-[#536067]">Produk tidak ditemukan</p><button type="button" onClick={() => { setQuery(""); setCategory("Semua"); }} className="mt-3 text-xs font-bold text-[#D9572B]">Reset pencarian</button></div>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-9">
              {visibleProducts.map((product, index) => (
                <article key={product.id} className="group min-w-0">
                  <div className="relative aspect-[.82] overflow-hidden rounded-2xl bg-gradient-to-br from-stone-100 to-white">
                    <ProductImage src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" />
                    <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/85 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-[#405058] backdrop-blur-md">{product.tag}</span>
                    {product.oldPrice && <span className="absolute right-3 top-3 rounded-full bg-[#FF5722] px-2.5 py-1 text-[8px] font-bold text-white">SALE</span>}
                    <button type="button" onClick={() => setSelected(product)} aria-label={"Lihat " + product.name} className="absolute inset-x-3 bottom-3 flex h-10 translate-y-3 items-center justify-center gap-2 rounded-full bg-white/95 text-[10px] font-bold text-[#172126] opacity-0 shadow-lg backdrop-blur-md transition duration-300 hover:bg-[#FF5722] hover:text-white group-hover:translate-y-0 group-hover:opacity-100 max-sm:hidden">
                      Quick view <ArrowUpRight size={13} strokeWidth={1.5} />
                    </button>
                    <button type="button" onClick={() => addToCart(product)} aria-label={"Tambah " + product.name + " ke keranjang"} className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-[#FF5722] text-white shadow-lg transition hover:scale-105 sm:hidden"><ShoppingBag size={15} strokeWidth={1.5} /></button>
                  </div>
                  <button type="button" onClick={() => setSelected(product)} className="mt-3 block w-full text-left">
                    <span className="block text-[9px] font-bold uppercase tracking-[.15em] text-[#9A7B6D]">{product.category}</span>
                    <span className="mt-1.5 block truncate text-[12px] font-bold text-[#172126] transition group-hover:text-[#D9572B] sm:text-[13px]">{product.name}</span>
                    <span className="mt-1.5 flex items-center gap-1 text-[9px] text-[#879196]"><span className="text-[#D96B37]">★</span> {product.rating} <span className="text-[#B3B8BA]">({product.reviews} ulasan demo)</span></span>
                  </button>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[12px] font-extrabold text-[#172126]">{rupiah(product.price)}</span>
                    {product.oldPrice && <span className="text-[10px] text-[#9BA2A5] line-through">{rupiah(product.oldPrice)}</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="story" className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="relative grid overflow-hidden rounded-[28px] bg-[#0D2129] text-white shadow-2xl shadow-black/10 md:grid-cols-[.82fr_1.18fr]">
          <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 lg:p-14">
            <p className="text-[9px] font-bold uppercase tracking-[.23em] text-[#FF8058]">More than a marketplace</p>
            <h2 className="mt-4 text-3xl font-bold leading-[1.05] tracking-[-.05em] sm:text-4xl">Satu tempat untuk menemukan lebih banyak<span className="text-[#FF8058]">.</span></h2>
            <p className="mt-5 max-w-[390px] text-xs leading-6 text-white/55">Resellerku dirancang untuk menghubungkan katalog, materi produk, dan alur penjualan dalam satu ekosistem. Tampilan ini adalah konsep storefront publiknya.</p>
            <div className="mt-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#FF9A77]">Built for better commerce <ArrowUpRight size={14} strokeWidth={1.5} /></div>
          </div>
          <div className="relative min-h-[300px] md:min-h-[390px]">
            <ProductImage src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=90" alt="Editorial fashion collection" className="absolute inset-0 h-full w-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D2129] via-[#0D2129]/15 to-transparent md:bg-gradient-to-l md:from-transparent md:via-transparent md:to-[#0D2129]/25" />
            <div className="absolute bottom-6 right-6 rounded-2xl border border-white/15 bg-[#0D2129]/70 px-4 py-3 backdrop-blur-xl"><p className="text-[8px] font-bold uppercase tracking-[.18em] text-[#FF9A77]">Resellerku</p><p className="mt-1 text-sm font-bold text-white">Find. Share. Grow.</p></div>
          </div>
        </div>
      </section>

      <footer className="bg-[#0A1B22] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-12">
          <div>
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FF5722] font-black">R</span><span className="text-sm font-black tracking-wide">RESELLERKU</span></div>
            <p className="mt-4 max-w-[260px] text-[10px] leading-6 text-white/45">Pilihan produk, katalog terkurasi, dan pengalaman commerce yang lebih terhubung.</p>
          </div>
          <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#FF8058]">Explore</p><div className="mt-4 flex flex-col gap-3 text-[10px] text-white/55"><a href="#categories" className="hover:text-white">Kategori</a><a href="#store-products" className="hover:text-white">Produk pilihan</a><a href="#story" className="hover:text-white">Tentang kami</a></div></div>
          <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#FF8058]">Support</p><div className="mt-4 flex flex-col gap-3 text-[10px] text-white/55"><span>Informasi produk</span><span>Bantuan pembelian</span><span>Kebijakan layanan</span></div></div>
          <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#FF8058]">Preview notice</p><p className="mt-4 text-[10px] leading-6 text-white/45">Produk, harga, rating, dan keranjang pada halaman ini merupakan data simulasi. Belum ada transaksi atau pembayaran nyata.</p></div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-2 text-[9px] text-white/35 sm:flex-row"><span>© 2026 Resellerku by Nusakara</span><span>Storefront concept preview</span></div></div>
      </footer>

      {notice && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[90] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-[#0D2129]/95 px-4 py-3 text-[11px] font-semibold text-white shadow-2xl backdrop-blur-xl">
          <Check size={15} strokeWidth={1.5} className="text-[#FF8058]" /> <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Tutup pemberitahuan"><X size={14} strokeWidth={1.5} className="text-white/60" /></button>
        </div>
      )}

      {selected && (
        <div role="dialog" aria-modal="true" aria-label={"Detail " + selected.name} onClick={() => setSelected(null)} className="fixed inset-0 z-[80] flex items-center justify-center bg-[#07151A]/75 p-4 backdrop-blur-xl">
          <div onClick={(event) => event.stopPropagation()} className="relative grid max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[26px] border border-black/10 bg-[#F8F7F3] shadow-2xl md:grid-cols-2">
            <button type="button" onClick={() => setSelected(null)} aria-label="Tutup detail produk" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/90 text-[#172126]"><X size={17} strokeWidth={1.5} /></button>
            <div className="relative min-h-[280px] bg-[#EAE6DE] md:min-h-[500px]"><ProductImage src={selected.image} alt={selected.name} className="absolute inset-0 h-full w-full object-cover" /><span className="absolute left-4 top-4 rounded-full bg-[#FF5722] px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider text-white">Preview product</span></div>
            <div className="flex flex-col p-6 sm:p-8">
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#D9572B]">{selected.category}</p>
              <h3 className="mt-3 pr-6 text-2xl font-bold leading-tight tracking-[-.04em] text-[#172126]">{selected.name}</h3>
              <p className="mt-3 text-[10px] text-[#7E898E]">★ {selected.rating} · {selected.reviews} ulasan simulasi</p>
              <div className="mt-5 flex items-center gap-3"><span className="text-xl font-extrabold text-[#172126]">{rupiah(selected.price)}</span>{selected.oldPrice && <span className="text-xs text-[#929A9E] line-through">{rupiah(selected.oldPrice)}</span>}</div>
              <div className="my-6 border-t border-black/10" />
              <p className="text-[11px] leading-6 text-[#667278]">{selected.description}</p>
              <div className="mt-6 rounded-xl border border-[#FF5722]/15 bg-[#FF5722]/[.05] p-3 text-[9px] leading-5 text-[#9B563E]">Ini adalah produk pratinjau. Informasi stok dan harga belum terhubung dengan katalog tenant.</div>
              <div className="mt-auto pt-7"><button type="button" onClick={() => addToCart(selected)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF5722] text-[11px] font-bold text-white shadow-lg shadow-orange-900/15 transition hover:bg-[#E64A19]"><ShoppingBag size={15} strokeWidth={1.5} /> Tambahkan ke keranjang preview</button></div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-[85] bg-[#07151A]/55 backdrop-blur-sm" onClick={() => setCartOpen(false)}>
          <aside onClick={(event) => event.stopPropagation()} className="absolute bottom-0 right-0 top-0 flex w-full max-w-[420px] flex-col bg-[#F8F7F3] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-black/10 pb-5"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#D9572B]">Your selection</p><h3 className="mt-1 text-xl font-bold tracking-tight text-[#172126]">Keranjang preview</h3></div><button type="button" onClick={() => setCartOpen(false)} aria-label="Tutup keranjang" className="grid h-9 w-9 place-items-center rounded-full border border-black/10"><X size={17} strokeWidth={1.5} /></button></div>
            <div className="flex-1 overflow-y-auto py-4">
              {cartProducts.length === 0 ? <div className="grid h-full content-center justify-items-center text-center"><ShoppingBag size={27} strokeWidth={1.5} className="text-[#9AA2A5]" /><p className="mt-4 text-sm font-bold text-[#34434A]">Keranjang masih kosong</p><p className="mt-1 text-[10px] text-[#8A9498]">Tambahkan produk contoh untuk mencoba interaksi.</p></div> : cartProducts.map((product) => (
                <div key={product.id} className="flex gap-3 border-b border-black/[.07] py-4">
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-[#EAE6DE]"><ProductImage src={product.image} alt={product.name} className="h-full w-full object-cover" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-[#172126]">{product.name}</p><p className="mt-1 text-[10px] text-[#778288]">{rupiah(product.price)}</p><div className="mt-3 flex items-center gap-3"><button type="button" onClick={() => setCart((current) => { const next = { ...current }; if (next[product.id] <= 1) delete next[product.id]; else next[product.id] -= 1; return next; })} className="grid h-6 w-6 place-items-center rounded-full border border-black/10 text-sm">−</button><span className="text-[10px] font-bold">{cart[product.id]}</span><button type="button" onClick={() => setCart((current) => ({ ...current, [product.id]: current[product.id] + 1 }))} className="grid h-6 w-6 place-items-center rounded-full border border-black/10 text-sm">+</button></div></div>
                  <span className="shrink-0 text-[10px] font-bold text-[#172126]">{rupiah(product.price * cart[product.id])}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-black/10 pt-5"><div className="flex items-center justify-between text-xs"><span className="text-[#758087]">Subtotal simulasi</span><span className="font-extrabold text-[#172126]">{rupiah(cartTotal)}</span></div><button type="button" disabled className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0D2129] text-[10px] font-bold text-white/50">Checkout belum diaktifkan <ChevronRight size={14} strokeWidth={1.5} /></button><p className="mt-3 text-center text-[9px] leading-5 text-[#929A9E]">Keranjang hanya menyimpan state di browser. Tidak ada pesanan atau pembayaran yang dibuat.</p></div>
          </aside>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 hidden items-center gap-2 rounded-full border border-[#FF5722]/20 bg-white/90 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-[#C64F2A] shadow-xl backdrop-blur-xl sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-[#FF5722]" /> Store preview
      </div>
    </main>
  );
}
