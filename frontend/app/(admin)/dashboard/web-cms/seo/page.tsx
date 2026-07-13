"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { listSeoAdmin, upsertSeo, deleteSeo } from "@/services/webCmsService";
import type { WebSeoEntry } from "@/services/websiteService";
import { getErrorMessage } from "@/lib/errors";
import Toast, { type ToastState } from "@/components/webcms/Toast";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#EDE8DF] bg-white text-[13px] focus:outline-none focus:border-[#C8922A]";
const labelClass = "text-[12px] font-semibold text-[#6B6259] mb-1.5 block";

const SUGGESTED_ROUTES = ["/", "/about", "/services", "/portfolio", "/products", "/blog", "/careers", "/contact"];

export default function WebCmsSeoPage() {
  const [entries, setEntries] = useState<WebSeoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newRoute, setNewRoute] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  function load() {
    setLoading(true);
    listSeoAdmin()
      .then(setEntries)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function patchLocal(routePath: string, patch: Partial<WebSeoEntry>) {
    setEntries((list) => list.map((e) => (e.route_path === routePath ? { ...e, ...patch } : e)));
  }

  async function handleSaveRow(entry: WebSeoEntry) {
    setSaving(entry.route_path);
    try {
      const updated = await upsertSeo(entry);
      setEntries((list) => list.map((e) => (e.route_path === entry.route_path ? updated : e)));
      setToast({ message: "SEO entry saved", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    } finally {
      setSaving(null);
    }
  }

  async function handleAdd(routePath: string) {
    if (!routePath.trim()) return;
    if (entries.some((e) => e.route_path === routePath)) {
      setToast({ message: "That route already has an SEO entry.", type: "error" });
      return;
    }
    try {
      const created = await upsertSeo({ route_path: routePath });
      setEntries((list) => [...list, created]);
      setNewRoute("");
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this SEO entry?")) return;
    try {
      await deleteSeo(id);
      setEntries((list) => list.filter((e) => e.id !== id));
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9A8F82]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const existingRoutes = new Set(entries.map((e) => e.route_path));
  const missingSuggestions = SUGGESTED_ROUTES.filter((r) => !existingRoutes.has(r));

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — SEO Manager</h1>
        <p className="text-[13px] text-[#9A8F82]">Meta titles, descriptions, and keywords for every route</p>
      </div>

      <div className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <label className={labelClass}>Add a route</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="/portfolio or /blog/my-article-slug"
            value={newRoute}
            onChange={(e) => setNewRoute(e.target.value)}
          />
          <button
            onClick={() => handleAdd(newRoute)}
            className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg shrink-0"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        {missingSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {missingSuggestions.map((r) => (
              <button
                key={r}
                onClick={() => handleAdd(r)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-[#EDE8DF] text-[#9A8F82] hover:border-[#C8922A] hover:text-[#C8922A]"
              >
                + {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-[#9A8F82] text-sm">No SEO entries yet — add one above.</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white border border-[#EDE8DF] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <code className="text-[13px] font-semibold text-[#2B2620]">{entry.route_path}</code>
                <button onClick={() => handleDelete(entry.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mb-3">
                <label className={labelClass}>Meta Title <span className="text-[#9A8F82] font-normal">({entry.meta_title.length}/70)</span></label>
                <input className={inputClass} maxLength={70} value={entry.meta_title} onChange={(e) => patchLocal(entry.route_path, { meta_title: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className={labelClass}>Meta Description <span className="text-[#9A8F82] font-normal">({entry.meta_description.length}/200)</span></label>
                <textarea rows={2} maxLength={200} className={inputClass} value={entry.meta_description} onChange={(e) => patchLocal(entry.route_path, { meta_description: e.target.value })} />
              </div>
              <div className="mb-4">
                <label className={labelClass}>Keywords (comma-separated)</label>
                <input
                  className={inputClass}
                  value={entry.meta_keywords.join(", ")}
                  onChange={(e) => patchLocal(entry.route_path, { meta_keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleSaveRow(entry)}
                  disabled={saving === entry.route_path}
                  className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                >
                  {saving === entry.route_path ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
