"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Save, Eye, Code } from "lucide-react";
import { getSettingsAdmin, updateSettingsAdmin } from "@/services/webCmsService";
import type { WebSettings } from "@/services/websiteService";
import { getErrorMessage } from "@/lib/errors";
import Toast, { type ToastState } from "@/components/webcms/Toast";

const textareaClass =
  "w-full px-3.5 py-3 rounded-lg border border-[#EDE8DF] bg-white text-[13px] font-mono focus:outline-none focus:border-[#C8922A]";

export default function WebCmsLegalPage() {
  const [data, setData] = useState<WebSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ privacy: boolean; copyright: boolean }>({ privacy: false, copyright: false });
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
      const updated = await updateSettingsAdmin({ legal: data.legal });
      setData(updated);
      setToast({ message: "Legal text updated", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
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
          <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — Legal</h1>
          <p className="text-[13px] text-[#9A8F82]">Privacy Policy and Copyright/Terms pages (Markdown supported)</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </button>
      </div>

      <LegalEditor
        title="Privacy Policy"
        value={data.legal.privacy_policy}
        onChange={(v) => setData({ ...data, legal: { ...data.legal, privacy_policy: v } })}
        showPreview={preview.privacy}
        onTogglePreview={() => setPreview((p) => ({ ...p, privacy: !p.privacy }))}
      />

      <LegalEditor
        title="Copyright & Terms"
        value={data.legal.copyright_terms}
        onChange={(v) => setData({ ...data, legal: { ...data.legal, copyright_terms: v } })}
        showPreview={preview.copyright}
        onTogglePreview={() => setPreview((p) => ({ ...p, copyright: !p.copyright }))}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function LegalEditor({
  title,
  value,
  onChange,
  showPreview,
  onTogglePreview,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  showPreview: boolean;
  onTogglePreview: () => void;
}) {
  return (
    <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-bold text-[#2B2620]">{title}</h2>
        <button onClick={onTogglePreview} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B6259] hover:text-[#C8922A]">
          {showPreview ? <Code size={13} /> : <Eye size={13} />} {showPreview ? "Edit" : "Preview"}
        </button>
      </div>
      {showPreview ? (
        <div className="ds-prose border border-[#EDE8DF] rounded-lg p-4 min-h-[220px] bg-[#FAF8F5]">
          <ReactMarkdown>{value || "*Nothing to preview yet.*"}</ReactMarkdown>
        </div>
      ) : (
        <textarea rows={10} className={textareaClass} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </section>
  );
}
