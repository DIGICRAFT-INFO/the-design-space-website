"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Mail, Phone, FileText, ImageIcon, Trash2,
  ChevronDown, ChevronUp, RefreshCw, CheckSquare, Square,
  Eye, StickyNote, Save, X, Paperclip,
} from "lucide-react";
import {
  listLeads, type Lead,
  listServiceInquiries, updateServiceInquiry, deleteServiceInquiry,
  bulkDeleteServiceInquiries, type ServiceInquiry,
} from "@/services/webCmsService";
import { resolveMediaUrl } from "@/lib/media";
import { getErrorMessage } from "@/lib/errors";
import Toast, { type ToastState } from "@/components/webcms/Toast";

// ─── Constants ───────────────────────────────────────────────────────────────

const LEAD_TYPE_LABELS: Record<string, string> = {
  enquiry: "Contact Enquiry",
  application: "Job Application",
};
const LEAD_TYPE_COLORS: Record<string, string> = {
  enquiry: "bg-blue-50 text-blue-700",
  application: "bg-purple-50 text-purple-700",
};

const INQUIRY_STATUS_OPTIONS = [
  { value: "new",         label: "New",         color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "reviewed",    label: "Reviewed",    color: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "in_progress", label: "In Progress", color: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "resolved",    label: "Resolved",    color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "archived",    label: "Archived",    color: "bg-gray-50 text-gray-500 border-gray-200" },
];

function statusStyle(val: string) {
  return INQUIRY_STATUS_OPTIONS.find((s) => s.value === val)?.color
    ?? "bg-gray-50 text-gray-500 border-gray-200";
}

const TABS = [
  { key: "service_inquiry", label: "Service Inquiries" },
  { key: "enquiry",         label: "Contact Enquiry" },
  { key: "application",     label: "Job Application" },
  { key: "all",             label: "All Leads" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WebCmsLeadsPage() {
  const [tab, setTab] = useState<TabKey>("service_inquiry");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [inquiries, setInquiries] = useState<ServiceInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  // Service inquiry state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editStatus, setEditStatus] = useState<ServiceInquiry["status"]>("new");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  function loadInquiries() {
    setLoading(true);
    listServiceInquiries(statusFilter === "all" ? undefined : statusFilter)
      .then(setInquiries)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }

  function loadLeads(filter: "enquiry" | "application" | "all") {
    setLoading(true);
    listLeads(filter === "all" ? undefined : filter)
      .then(setLeads)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setSelected(new Set());
    setExpandedId(null);
    if (tab === "service_inquiry") {
      loadInquiries();
    } else {
      loadLeads(tab === "all" ? "all" : tab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, statusFilter]);

  // ── Service inquiry helpers ────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === inquiries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(inquiries.map((i) => i.id)));
    }
  }

  function startEdit(inq: ServiceInquiry) {
    setEditingId(inq.id);
    setEditNote(inq.admin_note || "");
    setEditStatus(inq.status);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const updated = await updateServiceInquiry(id, { status: editStatus, admin_note: editNote });
      setInquiries((prev) => prev.map((i) => (i.id === id ? updated : i)));
      setEditingId(null);
      setToast({ message: "Inquiry updated", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this inquiry? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteServiceInquiry(id);
      setInquiries((prev) => prev.filter((i) => i.id !== id));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      setToast({ message: "Inquiry deleted", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected inquiry(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await bulkDeleteServiceInquiries(Array.from(selected));
      setInquiries((prev) => prev.filter((i) => !selected.has(i.id)));
      setSelected(new Set());
      setToast({ message: `${selected.size} inquiries deleted`, type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    } finally {
      setBulkDeleting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — Leads</h1>
          <p className="text-[13px] text-[#9A8F82]">Service inquiries, contact forms, and career applications</p>
        </div>
        <button
          onClick={() => tab === "service_inquiry" ? loadInquiries() : loadLeads(tab === "all" ? "all" : tab)}
          className="flex items-center gap-1.5 text-[12px] text-[#9A8F82] hover:text-[#C8922A] transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-colors ${
              tab === t.key
                ? "bg-[#2B2620] text-white"
                : "bg-white border border-[#EDE8DF] text-[#6B6259] hover:border-[#C8922A]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Service Inquiries ─────────────────────────────────────────────── */}
      {tab === "service_inquiry" && (
        <>
          {/* Status filter + bulk actions */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#EDE8DF] text-[12px] text-[#6B6259] bg-white focus:outline-none focus:border-[#C8922A]"
            >
              <option value="all">All Statuses</option>
              {INQUIRY_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {selected.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[12px] font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {bulkDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Delete {selected.size} selected
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-[#9A8F82]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : inquiries.length === 0 ? (
            <div className="text-center py-16 text-[#9A8F82]">
              <Paperclip size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No service inquiries yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Select-all row */}
              <div className="flex items-center gap-2 px-1 mb-1">
                <button onClick={toggleAll} className="text-[#9A8F82] hover:text-[#C8922A] transition-colors">
                  {selected.size === inquiries.length && inquiries.length > 0
                    ? <CheckSquare size={16} className="text-[#C8922A]" />
                    : <Square size={16} />}
                </button>
                <span className="text-[11px] text-[#9A8F82]">
                  {selected.size > 0 ? `${selected.size} selected` : "Select all"}
                </span>
              </div>

              {inquiries.map((inq) => {
                const isExpanded = expandedId === inq.id;
                const isEditing = editingId === inq.id;
                const isDeleting = deletingId === inq.id;

                return (
                  <div
                    key={inq.id}
                    className={`bg-white border rounded-2xl overflow-hidden transition-shadow ${
                      selected.has(inq.id) ? "border-[#C8922A] shadow-sm" : "border-[#EDE8DF]"
                    }`}
                  >
                    {/* Card header */}
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSelect(inq.id)}
                          className="mt-0.5 text-[#9A8F82] hover:text-[#C8922A] transition-colors shrink-0"
                        >
                          {selected.has(inq.id)
                            ? <CheckSquare size={16} className="text-[#C8922A]" />
                            : <Square size={16} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-2 flex-wrap mb-1.5">
                            <div>
                              <p className="text-[14px] font-bold text-[#2B2620]">{inq.name}</p>
                              <p className="text-[12px] text-[#C8922A] font-medium mt-0.5">{inq.service_name}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${statusStyle(inq.status)}`}>
                                {INQUIRY_STATUS_OPTIONS.find((s) => s.value === inq.status)?.label ?? inq.status}
                              </span>
                              <span className="text-[11px] text-[#9A8F82]">
                                {new Date(inq.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>

                          {/* Subject */}
                          {inq.subject && (
                            <p className="text-[13px] font-medium text-[#2B2620] mb-1">{inq.subject}</p>
                          )}

                          {/* Contact info */}
                          <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#9A8F82] mt-2">
                            <a href={`tel:${inq.phone}`} className="flex items-center gap-1.5 hover:text-[#C8922A]">
                              <Phone size={12} /> {inq.phone}
                            </a>
                            {inq.email && (
                              <a href={`mailto:${inq.email}`} className="flex items-center gap-1.5 hover:text-[#C8922A]">
                                <Mail size={12} /> {inq.email}
                              </a>
                            )}
                            {inq.attachments?.length > 0 && (
                              <span className="flex items-center gap-1.5 text-[#9A8F82]">
                                <Paperclip size={12} /> {inq.attachments.length} attachment{inq.attachments.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-4 ml-7">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : inq.id)}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B6259] hover:text-[#2B2620] transition-colors px-3 py-1.5 rounded-lg border border-[#EDE8DF] hover:border-[#C8922A]"
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <Eye size={13} />}
                          {isExpanded ? "Collapse" : "View Details"}
                        </button>
                        <button
                          onClick={() => { startEdit(inq); setExpandedId(inq.id); }}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B6259] hover:text-[#C8922A] transition-colors px-3 py-1.5 rounded-lg border border-[#EDE8DF] hover:border-[#C8922A]"
                        >
                          <StickyNote size={13} /> Edit / Note
                        </button>
                        <button
                          onClick={() => handleDelete(inq.id)}
                          disabled={isDeleting}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg border border-[#EDE8DF] hover:border-red-200 ml-auto disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-[#EDE8DF] bg-[#FAF8F5] px-5 py-4 space-y-4">

                        {/* Description */}
                        {inq.description && (
                          <div>
                            <p className="text-[10px] tracking-[0.15em] uppercase text-[#9A8F82] mb-1.5">Description</p>
                            <p className="text-[13px] text-[#2B2620] leading-relaxed whitespace-pre-wrap">{inq.description}</p>
                          </div>
                        )}

                        {/* Attachments */}
                        {inq.attachments?.length > 0 && (
                          <div>
                            <p className="text-[10px] tracking-[0.15em] uppercase text-[#9A8F82] mb-2">Attachments</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {inq.attachments.map((att) => {
                                const isImg = att.mime_type?.startsWith("image/");
                                const isPdf = att.mime_type === "application/pdf";
                                const url = resolveMediaUrl(att.file_url);
                                return (
                                  <a
                                    key={att.id}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group border border-[#EDE8DF] rounded-xl overflow-hidden hover:border-[#C8922A] transition-colors bg-white"
                                  >
                                    {isImg ? (
                                      <img
                                        src={url}
                                        alt={att.original_filename}
                                        className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    ) : (
                                      <div className="w-full aspect-square flex flex-col items-center justify-center gap-1 bg-[#FAF8F5]">
                                        {isPdf
                                          ? <FileText size={28} className="text-red-400" />
                                          : <ImageIcon size={28} className="text-blue-400" />}
                                      </div>
                                    )}
                                    <div className="px-2 py-1.5">
                                      <p className="text-[10px] text-[#6B6259] truncate">{att.original_filename || "File"}</p>
                                      {att.file_size > 0 && (
                                        <p className="text-[9px] text-[#9A8F82]">{(att.file_size / 1024).toFixed(0)} KB</p>
                                      )}
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Edit form */}
                        {isEditing ? (
                          <div className="space-y-3 pt-2 border-t border-[#EDE8DF]">
                            <p className="text-[10px] tracking-[0.15em] uppercase text-[#9A8F82]">Update Status & Note</p>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as ServiceInquiry["status"])}
                              className="w-full px-3 py-2 rounded-lg border border-[#EDE8DF] text-[13px] text-[#2B2620] bg-white focus:outline-none focus:border-[#C8922A]"
                            >
                              {INQUIRY_STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                            <textarea
                              rows={3}
                              placeholder="Internal admin note (not visible to client)…"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-[#EDE8DF] text-[13px] text-[#2B2620] bg-white focus:outline-none focus:border-[#C8922A] resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(inq.id)}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C8922A] text-white text-[12px] font-semibold disabled:opacity-60 hover:bg-[#B07A20] transition-colors"
                              >
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#EDE8DF] text-[12px] text-[#6B6259] hover:border-[#C8922A] transition-colors"
                              >
                                <X size={13} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : inq.admin_note ? (
                          <div className="pt-2 border-t border-[#EDE8DF]">
                            <p className="text-[10px] tracking-[0.15em] uppercase text-[#9A8F82] mb-1">Admin Note</p>
                            <p className="text-[13px] text-[#2B2620] whitespace-pre-wrap">{inq.admin_note}</p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Contact/Application Leads ─────────────────────────────────────── */}
      {tab !== "service_inquiry" && (
        <>
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
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${LEAD_TYPE_COLORS[lead.type]}`}>
                        {LEAD_TYPE_LABELS[lead.type]}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#9A8F82] shrink-0">
                      {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
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
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
