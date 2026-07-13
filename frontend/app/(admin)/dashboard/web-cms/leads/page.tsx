"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Phone, FileText } from "lucide-react";
import { listLeads, type Lead } from "@/services/webCmsService";
import { resolveMediaUrl } from "@/lib/media";
import { getErrorMessage } from "@/lib/errors";
import Toast, { type ToastState } from "@/components/webcms/Toast";

const TYPE_LABELS: Record<string, string> = { enquiry: "Contact Enquiry", application: "Job Application" };
const TYPE_COLORS: Record<string, string> = { enquiry: "bg-blue-50 text-blue-700", application: "bg-purple-50 text-purple-700" };

export default function WebCmsLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "enquiry" | "application">("all");
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    setLoading(true);
    listLeads(filter === "all" ? undefined : filter)
      .then(setLeads)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — Leads</h1>
        <p className="text-[13px] text-[#9A8F82]">Every Contact form and Careers application in one feed</p>
      </div>

      <div className="flex gap-2 mb-6">
        {(["all", "enquiry", "application"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[12px] font-semibold capitalize transition-colors ${
              filter === f ? "bg-[#2B2620] text-white" : "bg-white border border-[#EDE8DF] text-[#6B6259] hover:border-[#C8922A]"
            }`}
          >
            {f === "all" ? "All Leads" : TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#9A8F82]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : leads.length === 0 ? (
        <p className="text-[#9A8F82] text-sm">No leads yet.</p>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div key={`${lead.type}-${lead.id}`} className="bg-white border border-[#EDE8DF] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-[14px] font-semibold text-[#2B2620]">{lead.name}</p>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${TYPE_COLORS[lead.type]}`}>
                    {TYPE_LABELS[lead.type]}
                  </span>
                </div>
                <span className="text-[11px] text-[#9A8F82] shrink-0">{new Date(lead.created_at).toLocaleDateString()}</span>
              </div>
              {lead.detail && <p className="text-[13px] text-[#6B6259] mb-3">{lead.detail}</p>}
              <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#9A8F82]">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-[#C8922A]">
                    <Phone size={12} /> {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-[#C8922A]">
                    <Mail size={12} /> {lead.email}
                  </a>
                )}
                {lead.resume_url && (
                  <a href={resolveMediaUrl(lead.resume_url)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[#C8922A]">
                    <FileText size={12} /> Resume
                  </a>
                )}
                <span className="ml-auto text-[11px] capitalize px-2 py-0.5 rounded-full border border-[#EDE8DF]">{lead.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
