"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ChevronDown, Save } from "lucide-react";
import { listServicesAdmin, createService, updateService, deleteService } from "@/services/webCmsService";
import type { WebServicePackage } from "@/services/websiteService";
import MediaUploadField from "@/components/webcms/MediaUploadField";
import Toast, { type ToastState } from "@/components/webcms/Toast";
import { getErrorMessage } from "@/lib/errors";

const TIERS = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "consultation", label: "Consultation" },
  { value: "turnkey", label: "Turnkey" },
  { value: "other", label: "Other" },
];

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#EDE8DF] bg-white text-[13px] focus:outline-none focus:border-[#C8922A]";
const labelClass = "text-[12px] font-semibold text-[#6B6259] mb-1.5 block";

export default function WebCmsServicesPage() {
  const [services, setServices] = useState<WebServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  function load() {
    setLoading(true);
    listServicesAdmin()
      .then(setServices)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate() {
    try {
      const created = await createService({ package_name: "New Service Package", tier_classification: "other", highlights: [] });
      setServices((s) => [created, ...s]);
      setOpenId(created.id);
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  function patchLocal(id: string, patch: Partial<WebServicePackage>) {
    setServices((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function handleSaveRow(pkg: WebServicePackage) {
    setSaving(pkg.id);
    try {
      const updated = await updateService(pkg.id, pkg);
      setServices((list) => list.map((s) => (s.id === pkg.id ? updated : s)));
      setToast({ message: "Package saved", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this service package?")) return;
    try {
      await deleteService(id);
      setServices((list) => list.filter((s) => s.id !== id));
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

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — Services</h1>
          <p className="text-[13px] text-[#9A8F82]">Design packages shown on the public Services page</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Package
        </button>
      </div>

      {services.length === 0 ? (
        <p className="text-[#9A8F82] text-sm">No service packages yet. Create your first one.</p>
      ) : (
        <div className="space-y-3">
          {services.map((pkg) => {
            const open = openId === pkg.id;
            return (
              <div key={pkg.id} className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenId(open ? null : pkg.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <p className="text-[14px] font-semibold text-[#2B2620]">{pkg.package_name || "Untitled Package"}</p>
                    <p className="text-[11px] text-[#9A8F82] capitalize">
                      {pkg.tier_classification} · {pkg.is_published ? "Published" : "Draft"}
                    </p>
                  </div>
                  <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="px-5 pb-5 border-t border-[#EDE8DF] pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={labelClass}>Package Name</label>
                        <input className={inputClass} value={pkg.package_name} onChange={(e) => patchLocal(pkg.id, { package_name: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelClass}>Tier</label>
                        <select className={inputClass} value={pkg.tier_classification} onChange={(e) => patchLocal(pkg.id, { tier_classification: e.target.value as WebServicePackage["tier_classification"] })}>
                          {TIERS.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        {pkg.tier_classification === "other" && (
                          <input
                            className={`${inputClass} mt-2`}
                            placeholder="Specify tier (optional)"
                            value={pkg.tier_label || ""}
                            onChange={(e) => patchLocal(pkg.id, { tier_label: e.target.value })}
                          />
                        )}
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className={labelClass}>Scope Summary</label>
                      <textarea rows={3} className={inputClass} value={pkg.scope_summary} onChange={(e) => patchLocal(pkg.id, { scope_summary: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={labelClass}>Price Estimation</label>
                        <input className={inputClass} placeholder="Starting ₹1,800/sqft" value={pkg.price_estimation} onChange={(e) => patchLocal(pkg.id, { price_estimation: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelClass}>Highlights (one per line)</label>
                        <textarea
                          rows={1}
                          className={inputClass}
                          value={pkg.highlights.join("\n")}
                          onChange={(e) => patchLocal(pkg.id, { highlights: e.target.value.split("\n") })}
                        />
                      </div>
                    </div>
                    <MediaUploadField label="Cover Image" kind="image" aspect="aspect-video" value={pkg.cover_image} onChange={(url) => patchLocal(pkg.id, { cover_image: url })} />

                    <div className="flex items-center justify-between mt-4">
                      <label className="flex items-center gap-2 text-[12px] text-[#6B6259]">
                        <input type="checkbox" checked={pkg.is_published} onChange={(e) => patchLocal(pkg.id, { is_published: e.target.checked })} />
                        Published on website
                      </label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDelete(pkg.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handleSaveRow(pkg)}
                          disabled={saving === pkg.id}
                          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                        >
                          {saving === pkg.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                        </button>
                      </div>
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
