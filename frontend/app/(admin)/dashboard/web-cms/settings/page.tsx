"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { getSettingsAdmin, updateSettingsAdmin } from "@/services/webCmsService";
import type { WebSettings } from "@/services/websiteService";
import Toast, { type ToastState } from "@/components/webcms/Toast";
import { getErrorMessage } from "@/lib/errors";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#EDE8DF] bg-white text-[13px] focus:outline-none focus:border-[#C8922A]";
const labelClass = "text-[12px] font-semibold text-[#6B6259] mb-1.5 block";

export default function WebCmsSettingsPage() {
  const [data, setData] = useState<WebSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    getSettingsAdmin()
      .then(setData)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const updated = await updateSettingsAdmin({
        contact: data.contact,
        social_links: data.social_links,
        footer_text: data.footer_text,
        seo_default_title: data.seo_default_title,
        seo_default_description: data.seo_default_description,
      });
      setData(updated);
      setToast({ message: "Settings updated", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e, "Save failed"), type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9A8F82]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — Site Settings</h1>
          <p className="text-[13px] text-[#9A8F82]">Contact info, socials, and footer — used across the whole website</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </button>
      </div>

      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <h2 className="text-[14px] font-bold text-[#2B2620] mb-4">Contact Info (Contact page + footer)</h2>
        <div className="mb-4">
          <label className={labelClass}>Office Address</label>
          <textarea rows={2} className={inputClass} value={data.contact.office_address} onChange={(e) => setData({ ...data, contact: { ...data.contact, office_address: e.target.value } })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Phone</label>
            <input className={inputClass} value={data.contact.phone} onChange={(e) => setData({ ...data, contact: { ...data.contact, phone: e.target.value } })} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} value={data.contact.email} onChange={(e) => setData({ ...data, contact: { ...data.contact, email: e.target.value } })} />
          </div>
        </div>
        <div className="mb-4">
          <label className={labelClass}>Working Hours</label>
          <input className={inputClass} value={data.contact.working_hours} onChange={(e) => setData({ ...data, contact: { ...data.contact, working_hours: e.target.value } })} />
        </div>
        <div>
          <label className={labelClass}>Google Maps Embed URL (optional)</label>
          <input className={inputClass} placeholder="https://www.google.com/maps/embed?..." value={data.contact.map_embed_url} onChange={(e) => setData({ ...data, contact: { ...data.contact, map_embed_url: e.target.value } })} />
        </div>
      </section>

      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <h2 className="text-[14px] font-bold text-[#2B2620] mb-4">Social Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Instagram</label>
            <input className={inputClass} value={data.social_links.instagram} onChange={(e) => setData({ ...data, social_links: { ...data.social_links, instagram: e.target.value } })} />
          </div>
          <div>
            <label className={labelClass}>LinkedIn</label>
            <input className={inputClass} value={data.social_links.linkedin} onChange={(e) => setData({ ...data, social_links: { ...data.social_links, linkedin: e.target.value } })} />
          </div>
          <div>
            <label className={labelClass}>Facebook</label>
            <input className={inputClass} value={data.social_links.facebook} onChange={(e) => setData({ ...data, social_links: { ...data.social_links, facebook: e.target.value } })} />
          </div>
          <div>
            <label className={labelClass}>Pinterest</label>
            <input className={inputClass} value={data.social_links.pinterest} onChange={(e) => setData({ ...data, social_links: { ...data.social_links, pinterest: e.target.value } })} />
          </div>
        </div>
      </section>

      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5">
        <h2 className="text-[14px] font-bold text-[#2B2620] mb-4">Footer &amp; SEO</h2>
        <div className="mb-4">
          <label className={labelClass}>Footer Description</label>
          <textarea rows={2} className={inputClass} value={data.footer_text} onChange={(e) => setData({ ...data, footer_text: e.target.value })} />
        </div>
        <div className="mb-4">
          <label className={labelClass}>Default SEO Title</label>
          <input className={inputClass} value={data.seo_default_title} onChange={(e) => setData({ ...data, seo_default_title: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Default SEO Description</label>
          <textarea rows={2} className={inputClass} value={data.seo_default_description} onChange={(e) => setData({ ...data, seo_default_description: e.target.value })} />
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
