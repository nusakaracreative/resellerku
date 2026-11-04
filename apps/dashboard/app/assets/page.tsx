"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Copy, Download, FileText, Image as ImageIcon, Plus, Upload, Video, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Asset = {
  id: string; title: string; description: string | null; asset_type: "image" | "video" | "copywriting" | "document";
  status: "draft" | "published" | "archived"; storage_bucket: string | null;
  storage_path: string | null; copywriting: string | null; campaign_name: string | null;
  published_at: string | null; created_at: string; signedUrl?: string;
};
type AssetType = Asset["asset_type"];

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf"]);
const formatDate = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [title, setTitle] = useState("");
  const [campaign, setCampaign] = useState("");
  const [description, setDescription] = useState("");
  const [copywriting, setCopywriting] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("image");
  const [file, setFile] = useState<File | null>(null);
  const [publishNow, setPublishNow] = useState(true);
  const [notice, setNotice] = useState("");

  const loadAssets = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sesi login tidak ditemukan.");
      const { data: membership, error: membershipError } = await supabase.from("tenant_memberships")
        .select("tenant_id").eq("user_id", user.id).eq("role", "owner").eq("is_active", true).limit(1).maybeSingle();
      if (membershipError || !membership) throw new Error("Tenant Business Owner aktif tidak ditemukan.");
      setTenantId(membership.tenant_id as string); setUserId(user.id);
      const { data, error: assetError } = await supabase.from("assets").select("*")
        .eq("tenant_id", membership.tenant_id).order("created_at", { ascending: false }).limit(100);
      if (assetError) throw assetError;
      const hydrated = await Promise.all((data ?? []).map(async row => {
        const asset = row as Asset;
        if (!asset.storage_bucket || !asset.storage_path) return asset;
        const { data: signed } = await supabase.storage.from(asset.storage_bucket).createSignedUrl(asset.storage_path, 900);
        return { ...asset, signedUrl: signed?.signedUrl };
      }));
      setAssets(hydrated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat Asset Hub.");
      setAssets([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadAssets(); }, [loadAssets]);

  const groups = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const asset of assets) {
      const key = asset.campaign_name?.trim() || "Tanpa paket kampanye";
      map.set(key, [...(map.get(key) ?? []), asset]);
    }
    return [...map.entries()];
  }, [assets]);

  const resetForm = () => {
    setTitle(""); setCampaign(""); setDescription(""); setCopywriting(""); setAssetType("image"); setFile(null); setPublishNow(true);
  };

  const saveAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tenantId || !userId) { setError("Tenant belum tervalidasi. Refresh halaman."); return; }
    if (!file && !copywriting.trim()) { setError("Unggah file atau isi teks copywriting."); return; }
    if (file && !ACCEPTED.has(file.type)) { setError("Format file tidak didukung. Gunakan JPG, PNG, WebP, MP4, WebM, atau PDF."); return; }
    if (file && file.size > 25 * 1024 * 1024) { setError("Ukuran file maksimum 25 MB."); return; }
    setSaving(true); setError(""); setNotice("");
    const supabase = createClient();
    const assetId = crypto.randomUUID();
    const safeName = file?.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-100) ?? "";
    const path = file ? `${tenantId}/assets/${assetId}/${safeName}` : null;
    const finalType: AssetType = file ? (file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document") : "copywriting";

    try {
      const { error: insertError } = await supabase.from("assets").insert({
        id: assetId, tenant_id: tenantId, title: title.trim(), description: description.trim() || null,
        campaign_name: campaign.trim() || null, asset_type: finalType, status: "draft",
        storage_bucket: file ? "marketing-assets" : null, storage_path: path,
        copywriting: copywriting.trim() || null, uploaded_by: userId,
      });
      if (insertError) throw insertError;

      if (file && path) {
        const { error: uploadError } = await supabase.storage.from("marketing-assets").upload(path, file, {
          contentType: file.type, upsert: false, cacheControl: "3600",
        });
        if (uploadError) {
          await supabase.from("assets").delete().eq("id", assetId).eq("tenant_id", tenantId);
          throw new Error(`Upload gagal: ${uploadError.message}`);
        }
      }

      if (publishNow) {
        const { error: publishError } = await supabase.from("assets").update({
          status: "published", published_at: new Date().toISOString(),
        }).eq("id", assetId).eq("tenant_id", tenantId);
        if (publishError) throw publishError;
      }

      setNotice(publishNow ? "Aset berhasil diunggah dan dipublikasikan." : "Aset disimpan sebagai draft.");
      setModalOpen(false); resetForm(); await loadAssets();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Aset tidak dapat disimpan.");
    } finally { setSaving(false); }
  };

  const copyText = async (asset: Asset) => {
    if (!asset.copywriting) return;
    try {
      await navigator.clipboard.writeText(asset.copywriting);
      setCopiedId(asset.id);
      window.setTimeout(() => setCopiedId(current => current === asset.id ? "" : current), 1800);
    } catch { setError("Browser tidak mengizinkan akses clipboard."); }
  };

  const statusPill = (status: Asset["status"]) => status === "published" ? "pill-green" : status === "draft" ? "pill-amber" : "pill-muted";

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#FF8058]">Reseller enablement</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Marketing Asset Hub</h1><p className="mt-2 text-sm text-slate-400">Kelola materi promosi, video kampanye, dan copywriting untuk jaringan reseller.</p></div>
        <button onClick={() => { setError(""); setModalOpen(true); }} className="btn-primary"><Plus size={16} strokeWidth={1.5} /> Unggah Aset Baru</button>
      </header>

      {notice && <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/[.08] px-4 py-3 text-sm text-emerald-200">{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[.08] px-4 py-3 text-sm text-rose-200">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-3">
        {[["Total aset",assets.length],["Dipublikasikan",assets.filter(a=>a.status==="published").length],["Draft",assets.filter(a=>a.status==="draft").length]].map(([label,value]) => <div key={label} className="surface rounded-2xl p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold tabular-nums">{value}</p></div>)}
      </section>

      {loading ? <div className="surface rounded-2xl p-10 text-center text-sm text-slate-500">Memuat library aset…</div> : groups.length === 0 ? (
        <div className="surface rounded-2xl border-dashed p-12 text-center"><ImageIcon size={30} strokeWidth={1.5} className="mx-auto text-gray-400" /><h2 className="mt-4 font-bold">Library kampanye masih kosong</h2><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">Unggah foto, video, dokumen, atau copywriting. Beberapa materi dengan nama kampanye yang sama akan tampil sebagai satu bundle.</p><button onClick={() => setModalOpen(true)} className="btn-secondary mt-5">Mulai unggah aset</button></div>
      ) : groups.map(([groupName, groupAssets]) => (
        <section key={groupName} className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/[.08] pb-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Campaign bundle</p><h2 className="mt-1 text-lg font-bold">{groupName}</h2></div><span className="pill pill-muted">{groupAssets.length} materi</span></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groupAssets.map(asset => (
              <article key={asset.id} className="surface overflow-hidden rounded-2xl">
                <div className="relative grid h-48 place-items-center overflow-hidden bg-[#0a2029]">
                  {asset.signedUrl && asset.asset_type==="image" ? <img src={asset.signedUrl} alt={asset.title} className="h-full w-full object-cover" /> :
                   asset.signedUrl && asset.asset_type==="video" ? <video src={asset.signedUrl} controls preload="metadata" className="h-full w-full object-contain" /> :
                   <div className="text-center">{asset.asset_type==="copywriting" ? <FileText size={30} strokeWidth={1.5} className="mx-auto text-[#FF5722]" /> : asset.asset_type==="document" ? <FileText size={30} strokeWidth={1.5} className="mx-auto text-gray-400" /> : <Video size={30} strokeWidth={1.5} className="mx-auto text-gray-400" />}<p className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">{asset.asset_type}</p></div>}
                  <span className={`absolute right-3 top-3 pill ${statusPill(asset.status)}`}>{asset.status}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold">{asset.title}</h3>
                  {asset.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{asset.description}</p>}
                  <p className="mt-3 text-[10px] text-slate-600">{formatDate(asset.created_at)} · {asset.campaign_name || "Tanpa kampanye"}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {asset.copywriting && <button onClick={() => void copyText(asset)} className="btn-secondary flex-1 text-xs">{copiedId===asset.id ? <><Check size={13} strokeWidth={1.5} className="text-emerald-400" /> Tersalin</> : <><Copy size={13} strokeWidth={1.5} className="text-gray-400" /> Copy teks</>}</button>}
                    {asset.signedUrl && <a href={asset.signedUrl} download target="_blank" rel="noreferrer" className="btn-secondary flex-1 text-center text-xs"><Download size={13} strokeWidth={1.5} className="text-gray-400" /> Download</a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {modalOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-black/75 p-4 backdrop-blur-xl">
        <div role="dialog" aria-modal="true" aria-labelledby="asset-modal-title" className="surface my-0 flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/5 shadow-xl shadow-black/40">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[.06] bg-[#15303b] px-6 py-5 sm:px-7">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#FF8058]">Asset upload</p><h2 id="asset-modal-title" className="mt-2 text-xl font-bold">Tambah materi kampanye</h2><p className="mt-1 text-[11px] text-slate-500">Siapkan materi untuk jaringan reseller.</p></div>
            <button type="button" aria-label="Tutup modal" onClick={() => { if (!saving) { setModalOpen(false); resetForm(); } }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/5 bg-white/[.035] text-gray-400 shadow-lg transition hover:border-[#FF5722]/30 hover:text-[#FF5722]" disabled={saving}><X size={18} strokeWidth={1.5} /></button>
          </div>
          <form onSubmit={saveAsset} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 sm:px-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-300">Judul aset<input required maxLength={120} className="field mt-2" placeholder="Contoh: Promo November" value={title} onChange={e=>setTitle(e.target.value)} /></label>
                <label className="block text-xs font-semibold text-slate-300">Nama kampanye / bundle<input maxLength={100} className="field mt-2" placeholder="Contoh: Payday November" value={campaign} onChange={e=>setCampaign(e.target.value)} /></label>
              </div>
              <label className="block text-xs font-semibold text-slate-300">Deskripsi singkat<textarea rows={2} maxLength={500} className="field mt-2" placeholder="Keterangan untuk tim reseller" value={description} onChange={e=>setDescription(e.target.value)} /></label>
              <label className="block text-xs font-semibold text-slate-300">File materi <span className="font-normal text-slate-500">(opsional jika hanya menyimpan copywriting)</span><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf" className="field mt-2 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs" onChange={e=>setFile(e.target.files?.[0] ?? null)} />{file && <span className="mt-1 block text-[10px] text-slate-500">{file.name} · {(file.size/1024/1024).toFixed(2)} MB</span>}</label>
              <label className="block text-xs font-semibold text-slate-300">Copywriting<textarea rows={5} maxLength={12000} className="field mt-2" placeholder="Caption, CTA, hashtag, atau instruksi publikasi…" value={copywriting} onChange={e=>setCopywriting(e.target.value)} /></label>
              <label className="flex items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.025] p-3 text-xs text-slate-300"><input type="checkbox" checked={publishNow} onChange={e=>setPublishNow(e.target.checked)} className="accent-[#FF5722]" />Publikasikan setelah upload berhasil (reseller dapat melihat materi)</label>
              <p className="text-[10px] leading-5 text-slate-600">Maksimum 25 MB. Format: JPG, PNG, WebP, MP4, WebM, PDF. File disimpan di private Supabase Storage.</p>
            </div>
            <div className="sticky bottom-0 z-10 flex shrink-0 justify-end gap-2 border-t border-gray-800 bg-[#15303b] px-6 py-4 shadow-[0_-10px_30px_rgba(0,0,0,.28)] sm:px-7">
              <button type="button" onClick={() => { if (!saving) { setModalOpen(false); resetForm(); } }} className="btn-secondary" disabled={saving}>Batal</button>
              <button type="submit" disabled={saving} className="btn-primary min-w-36 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Menyimpan…" : <><Upload size={15} strokeWidth={1.5} /> Simpan aset</>}</button>
            </div>
          </form>
        </div>
      </div>}
    </div>
  );
}
