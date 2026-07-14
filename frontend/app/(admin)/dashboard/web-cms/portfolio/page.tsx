"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronDown, Save, ExternalLink, Star, Plus, X } from "lucide-react";
import { getAllPortfolios, updatePortfolio, resolveImageUrl, type Portfolio } from "@/services/portfoliService";
import { listPortfolioCategoriesAdmin, createPortfolioCategory, deletePortfolioCategory } from "@/services/webCmsService";
import type { WebPortfolioCategory } from "@/services/websiteService";
import Toast, { type ToastState } from "@/components/webcms/Toast";
import { getErrorMessage } from "@/lib/errors";

const PROJECT_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "renovation", label: "Renovation" },
  { value: "other", label: "Other" },
];

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#EDE8DF] bg-white text-[13px] focus:outline-none focus:border-[#C8922A]";
const labelClass = "text-[12px] font-semibold text-[#6B6259] mb-1.5 block";

export default function WebCmsPortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [categories, setCategories] = useState<WebPortfolioCategory[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  function loadCategories() {
    listPortfolioCategoriesAdmin()
      .then(setCategories)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }));
  }
  useEffect(loadCategories, []);

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    try {
      const created = await createPortfolioCategory(newCategory.trim());
      setCategories((c) => [...c, created]);
      setNewCategory("");
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      await deletePortfolioCategory(id);
      setCategories((c) => c.filter((cat) => cat.id !== id));
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  function toggleCategoryOnPortfolio(p: Portfolio, name: string) {
    const current = p.custom_categories || [];
    const next = current.includes(name) ? current.filter((c) => c !== name) : [...current, name];
    patchLocal(p.id, { custom_categories: next });
  }

  function load() {
    setLoading(true);
    getAllPortfolios()
      .then(setPortfolios)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function patchLocal(id: string, patch: Partial<Portfolio>) {
    setPortfolios((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function handleSaveRow(p: Portfolio) {
    setSaving(p.id);
    try {
      const updated = await updatePortfolio(p.id, {
        status: p.status,
        project_type: p.project_type,
        project_type_label: p.project_type_label || "",
        is_featured: p.is_featured,
        sort_order: p.sort_order,
        metrics: p.metrics,
        custom_categories: p.custom_categories,
      });
      setPortfolios((list) => list.map((x) => (x.id === p.id ? updated : x)));
      setToast({ message: "Portfolio entry updated", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9A8F82]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — Portfolio</h1>
          <p className="text-[13px] text-[#9A8F82]">
            Controls what shows on the public Portfolio page. Only <span className="font-semibold">Published</span> projects are visible.
          </p>
        </div>
        <Link
          href="/dashboard/portfolio"
          className="flex items-center gap-2 border border-[#EDE8DF] hover:border-[#C8922A] text-[#2B2620] text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          Manage Images & Documents <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
      <p className="text-[11px] text-[#9A8F82] mb-6">
        Titles, descriptions, images and PDFs are managed on the existing Portfolio screen — this page only controls how a project appears on the website.
      </p>

      <div className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <h2 className="text-[14px] font-bold text-[#2B2620] mb-1">Categories</h2>
        <p className="text-[11px] text-[#9A8F82] mb-3">Free-form tags (e.g. &ldquo;Modular Kitchens&rdquo;, &ldquo;Luxury Villas&rdquo;) — assign them to projects below.</p>
        <div className="flex gap-2 mb-3">
          <input
            className={inputClass}
            placeholder="Add a category…"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
          />
          <button onClick={handleAddCategory} className="flex items-center gap-1.5 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold px-4 py-2 rounded-lg shrink-0">
            <Plus size={13} /> Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#EDE8DF] rounded-full pl-3 pr-1.5 py-1 text-[12px]">
              {c.name}
              <button onClick={() => handleDeleteCategory(c.id)} className="w-4 h-4 rounded-full hover:bg-red-100 flex items-center justify-center text-[#9A8F82] hover:text-red-500">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {portfolios.length === 0 ? (
        <p className="text-[#9A8F82] text-sm">
          No portfolio entries yet. Create one from{" "}
          <Link href="/dashboard/portfolio" className="text-[#C8922A] underline">
            Portfolio
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-3">
          {portfolios.map((p) => {
            const open = openId === p.id;
            return (
              <div key={p.id} className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
                <button onClick={() => setOpenId(open ? null : p.id)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#FAF8F5] shrink-0">
                    {p.images?.[0] && <img src={resolveImageUrl(p.images[0].file_url)} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#2B2620] truncate flex items-center gap-1.5">
                      {p.title}
                      {p.is_featured && <Star size={12} className="text-[#C8922A] fill-[#C8922A]" />}
                    </p>
                    <p className="text-[11px] text-[#9A8F82] capitalize">
                      {p.status} · {p.project_type || "other"}
                    </p>
                  </div>
                  <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="px-5 pb-5 border-t border-[#EDE8DF] pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className={labelClass}>Website Status</label>
                        <select className={inputClass} value={p.status} onChange={(e) => patchLocal(p.id, { status: e.target.value as "draft" | "published" })}>
                          <option value="draft">Draft (hidden)</option>
                          <option value="published">Published (live)</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Project Type (public filter)</label>
                        <select className={inputClass} value={p.project_type || "other"} onChange={(e) => patchLocal(p.id, { project_type: e.target.value as "residential" | "commercial" | "renovation" | "other" })}>
                          {PROJECT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        {(p.project_type === "other" || !p.project_type) && (
                          <input
                            className={`${inputClass} mt-2`}
                            placeholder="Specify type (optional)"
                            value={p.project_type_label || ""}
                            onChange={(e) => patchLocal(p.id, { project_type_label: e.target.value })}
                          />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Sort Order</label>
                        <input type="number" className={inputClass} value={p.sort_order ?? 0} onChange={(e) => patchLocal(p.id, { sort_order: Number(e.target.value) })} />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-[12px] text-[#6B6259] mb-4">
                      <input type="checkbox" checked={!!p.is_featured} onChange={(e) => patchLocal(p.id, { is_featured: e.target.checked })} />
                      Feature on Home page bento grid
                    </label>

                    {categories.length > 0 && (
                      <div className="mb-4">
                        <label className={labelClass}>Categories</label>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((c) => {
                            const active = (p.custom_categories || []).includes(c.name);
                            return (
                              <button
                                key={c.id}
                                onClick={() => toggleCategoryOnPortfolio(p, c.name)}
                                className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
                                  active ? "border-[#C8922A] bg-[#FDF3E3] text-[#C8922A]" : "border-[#EDE8DF] text-[#9A8F82]"
                                }`}
                              >
                                {c.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <p className={labelClass}>Case Study Metrics</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <input
                        className={inputClass}
                        placeholder="Location"
                        value={p.metrics?.location || ""}
                        onChange={(e) => patchLocal(p.id, { metrics: { location: e.target.value, area_sqft: p.metrics?.area_sqft ?? null, scope_duration: p.metrics?.scope_duration || "" } })}
                      />
                      <input
                        type="number"
                        className={inputClass}
                        placeholder="Area (sqft)"
                        value={p.metrics?.area_sqft ?? ""}
                        onChange={(e) =>
                          patchLocal(p.id, {
                            metrics: { location: p.metrics?.location || "", area_sqft: e.target.value ? Number(e.target.value) : null, scope_duration: p.metrics?.scope_duration || "" },
                          })
                        }
                      />
                      <input
                        className={inputClass}
                        placeholder="Cost / Duration"
                        value={p.metrics?.scope_duration || ""}
                        onChange={(e) => patchLocal(p.id, { metrics: { location: p.metrics?.location || "", area_sqft: p.metrics?.area_sqft ?? null, scope_duration: e.target.value } })}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSaveRow(p)}
                        disabled={saving === p.id}
                        className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                      >
                        {saving === p.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
