"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, CheckCircle2, AlertCircle,
  CalendarDays, Zap, Plus, Trash2, MinusCircle, PlusCircle,
} from "lucide-react";
import {
  generateInvoice, createDirectInvoice,
  type GenerateInvoicePayload, type InvoiceType,
} from "@/services/invoiceService";
import { getQuotationsByClient, getAllClients, type Client } from "@/services/clientService";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access") || localStorage.getItem("access_token") || localStorage.getItem("token");
}
function getAuthHeaders(): HeadersInit {
  const t = getToken();
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1").replace(/\/+$/, "");
const fmt = (n: any) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Invoice type options ─────────────────────────────────────────────────────
const INVOICE_TYPES: { value: InvoiceType; label: string; desc: string; defaultPct: number; defaultDays: number; defaultLabel: string }[] = [
  { value: "full",      label: "Full (100%)",  desc: "Complete invoice for entire amount",     defaultPct: 100, defaultDays: 15, defaultLabel: "" },
  { value: "advance",   label: "Advance",      desc: "Initial advance payment on booking",     defaultPct: 10,  defaultDays: 7,  defaultLabel: "Advance on Booking" },
  { value: "milestone", label: "Milestone",    desc: "Partial payment for a project phase",    defaultPct: 20,  defaultDays: 15, defaultLabel: "" },
  { value: "final",     label: "Final",        desc: "Final invoice at project handover",       defaultPct: 20,  defaultDays: 7,  defaultLabel: "Final Handover" },
];

const EMPTY_ITEM = () => ({ _key: `${Date.now()}-${Math.random()}`, description: "", category: "", quantity: "1", unit: "sqft", rate: "" });

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GenerateInvoicePage() {
  const router = useRouter();

  // Mode: "from_quotation" | "direct"
  const [mode, setMode] = useState<"from_quotation" | "direct">("from_quotation");

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── From-Quotation mode ────────────────────────────────────────────────────
  const [quotations, setQuotations] = useState<any[]>([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedQDetail, setSelectedQDetail] = useState<any>(null); // full quotation with items
  const [selectedQDetailLoading, setSelectedQDetailLoading] = useState(false);
  const [qForm, setQForm] = useState<{
    quotation_id: string; invoice_type: InvoiceType;
    milestone_label: string; milestone_percentage: number;
    invoice_date: string; due_days: number; notes: string;
  }>({
    quotation_id: "", invoice_type: "full", milestone_label: "",
    milestone_percentage: 100, invoice_date: new Date().toISOString().split("T")[0],
    due_days: 15, notes: "",
  });
  const [qErrors, setQErrors] = useState<Record<string, string>>({});
  // Milestone amount mode: "percent" = % of quotation, "fixed" = manual Rs. amount
  const [qMilestoneMode, setQMilestoneMode] = useState<"percent" | "fixed">("percent");
  const [qFixedAmount, setQFixedAmount]     = useState<string>("");

  // ── Direct mode ────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [dForm, setDForm] = useState<{
    client_id: string; project_id: string; invoice_type: InvoiceType;
    milestone_label: string; milestone_percentage: number;
    invoice_date: string; due_days: number; notes: string;
    cgst_rate: string; sgst_rate: string; igst_rate: string; tax_mode: "cgst_sgst" | "igst" | "none";
    billing_address: string; site_address: string;
  }>({
    client_id: "", project_id: "", invoice_type: "full", milestone_label: "",
    milestone_percentage: 100, invoice_date: new Date().toISOString().split("T")[0],
    due_days: 15, notes: "", cgst_rate: "0", sgst_rate: "0", igst_rate: "0", tax_mode: "none",
    billing_address: "", site_address: "",
  });
  const [dItems, setDItems] = useState([EMPTY_ITEM()]);
  const [dErrors, setDErrors] = useState<Record<string, string>>({});

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!getToken()) { window.location.href = "/login"; return; }
    getAllClients().then(setClients).catch(() => {}).finally(() => setClientsLoading(false));
    // Load all quotations immediately so dropdown is populated
    fetchQuotations("");
  }, []);

  // ── Quotation helpers ──────────────────────────────────────────────────────
  const fetchQuotations = async (clientId: string) => {
    setQuotationsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/quotations/`, { headers: getAuthHeaders() });
      if (res.ok) {
        const d = await res.json();
        const all: any[] = d.results ?? d;
        if (clientId) {
          // F11 fix: removed fallback that showed ALL quotations when client had none.
          // If a client has no quotations, show empty — don't pollute the dropdown.
          const filtered = all.filter(q =>
            q.project?.client?.id === clientId ||
            q.project?.client?._id === clientId ||
            q.client_id === clientId
          );
          setQuotations(filtered);
        } else {
          setQuotations(all);
        }
      }
    } catch {
      setQuotations([]);
    } finally { setQuotationsLoading(false); }
  };

  // Fetch full quotation detail (with items) when user selects a quotation
  const fetchQuotationDetail = async (quotationId: string) => {
    if (!quotationId) { setSelectedQDetail(null); return; }
    setSelectedQDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/quotations/${quotationId}/`, { headers: getAuthHeaders() });
      if (res.ok) { setSelectedQDetail(await res.json()); }
    } catch { setSelectedQDetail(null); }
    finally { setSelectedQDetailLoading(false); }
  };

  const handleQTypeChange = (type: InvoiceType) => {
    const t = INVOICE_TYPES.find(x => x.value === type)!;
    setQForm(f => ({ ...f, invoice_type: type, milestone_percentage: t.defaultPct, due_days: t.defaultDays, milestone_label: t.defaultLabel }));
  };
  const handleDTypeChange = (type: InvoiceType) => {
    const t = INVOICE_TYPES.find(x => x.value === type)!;
    setDForm(f => ({ ...f, invoice_type: type, milestone_percentage: t.defaultPct, due_days: t.defaultDays, milestone_label: t.defaultLabel }));
  };

  // ── Project fetch for direct mode ──────────────────────────────────────────
  const fetchProjects = async (clientId: string) => {
    if (!clientId) { setProjects([]); return; }
    setProjectsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/clients/${clientId}/projects/`, { headers: getAuthHeaders() });
      if (res.ok) { const d = await res.json(); setProjects(d.results ?? d); }
    } catch {} finally { setProjectsLoading(false); }
  };

  // ── Direct items helpers ───────────────────────────────────────────────────
  const addItem = () => setDItems(p => [...p, EMPTY_ITEM()]);
  const removeItem = (key: string) => setDItems(p => p.filter(i => i._key !== key));
  const updateItem = (key: string, field: string, val: string) =>
    setDItems(p => p.map(i => i._key === key ? { ...i, [field]: val } : i));

  // Direct totals
  const dTotals = (() => {
    const sub = dItems.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), 0);
    const cgst = dForm.tax_mode === "cgst_sgst" ? (sub * (parseFloat(dForm.cgst_rate) || 0)) / 100 : 0;
    const sgst = dForm.tax_mode === "cgst_sgst" ? (sub * (parseFloat(dForm.sgst_rate) || 0)) / 100 : 0;
    const igst = dForm.tax_mode === "igst"       ? (sub * (parseFloat(dForm.igst_rate) || 0)) / 100 : 0;
    return { sub, cgst, sgst, igst, grand: sub + cgst + sgst + igst };
  })();

  // ── Due date preview ───────────────────────────────────────────────────────
  const dueDatePreview = (dateStr: string, days: number) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // ── Submit: from quotation ─────────────────────────────────────────────────
  const handleQSubmit = async () => {
    const e: Record<string, string> = {};
    if (!qForm.quotation_id) e.quotation_id = "Please select a quotation";
    // F9: block if quotation is not approved
    if (qForm.quotation_id && selectedQ && selectedQ.status !== "approved") {
      e.quotation_id = `This quotation is "${selectedQ.status}" — only approved quotations can generate invoices. Approve it first.`;
    }
    if (!qForm.invoice_date) e.invoice_date = "Invoice date required";
    if (qForm.invoice_type !== "full" && !qForm.milestone_label) e.milestone_label = "Milestone label required";
    // F10: validate fixed amount doesn't exceed grand total
    if (qMilestoneMode === "fixed" && qGrandTotal > 0) {
      const fixed = parseFloat(qFixedAmount) || 0;
      if (fixed <= 0) e.qFixedAmount = "Fixed amount must be greater than 0";
      else if (fixed > qGrandTotal) e.qFixedAmount = `Amount ₹${fixed.toLocaleString("en-IN")} exceeds quotation total ₹${qGrandTotal.toLocaleString("en-IN")}`;
    }
    setQErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true); setApiError(null);
    try {
      const payload: GenerateInvoicePayload = {
        quotation_id: qForm.quotation_id,
        invoice_type: qForm.invoice_type,
        milestone_label: qForm.invoice_type !== "full" ? qForm.milestone_label : undefined,
        milestone_percentage: effectivePct,
        invoice_date: qForm.invoice_date,
        due_days: qForm.due_days,
        notes: qForm.notes || undefined,
      };
      await generateInvoice(payload);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/invoices"), 1800);
    } catch (err: any) {
      const msgs = typeof err === "object" && err !== null
        ? Object.entries(err).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ")
        : String(err?.detail || err?.message || err);
      setApiError(msgs);
    } finally { setLoading(false); }
  };

  // ── Submit: direct ─────────────────────────────────────────────────────────
  const handleDSubmit = async () => {
    const e: Record<string, string> = {};
    if (!dForm.project_id && !dForm.client_id) e.project_id = "Select a client or project";
    if (!dForm.invoice_date) e.invoice_date = "Invoice date required";
    const validItems = dItems.filter(it => it.description.trim() && parseFloat(it.rate) > 0);
    if (validItems.length === 0) e.items = "Add at least one item with description and rate";
    setDErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true); setApiError(null);
    try {
      await createDirectInvoice({
        project_id: dForm.project_id || undefined,
        client_id: dForm.project_id ? undefined : dForm.client_id,
        invoice_type: dForm.invoice_type,
        milestone_label: dForm.invoice_type !== "full" ? dForm.milestone_label : undefined,
        milestone_percentage: dForm.milestone_percentage,
        invoice_date: dForm.invoice_date,
        due_days: dForm.due_days,
        notes: dForm.notes || undefined,
        billing_address: dForm.billing_address || undefined,
        site_address:    dForm.site_address    || undefined,
        cgst_rate: dForm.tax_mode === "cgst_sgst" ? parseFloat(dForm.cgst_rate) || 0 : 0,
        sgst_rate: dForm.tax_mode === "cgst_sgst" ? parseFloat(dForm.sgst_rate) || 0 : 0,
        igst_rate: dForm.tax_mode === "igst"       ? parseFloat(dForm.igst_rate) || 0 : 0,
        items: validItems.map(it => ({
          description: it.description.trim(),
          category: it.category || "",
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
        })),
      });
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/invoices"), 1800);
    } catch (err: any) {
      setApiError(String(err?.detail || err?.message || "Failed to create invoice"));
    } finally { setLoading(false); }
  };

  // Selected quotation preview
  const selectedQ = quotations.find(q => q.id === qForm.quotation_id);
  const qGrandTotal = selectedQ ? parseFloat(selectedQ.grand_total || "0") : 0;
  const qAmount = qMilestoneMode === "fixed"
    ? (parseFloat(qFixedAmount) || 0)
    : selectedQ ? (qGrandTotal * qForm.milestone_percentage) / 100 : 0;
  // Effective percentage for API (if fixed mode, compute % from grand total)
  const effectivePct = qMilestoneMode === "fixed" && qGrandTotal > 0
    ? Math.round(((parseFloat(qFixedAmount) || 0) / qGrandTotal) * 100 * 100) / 100
    : qForm.milestone_percentage;
  const approvedQs = quotations.filter(q => q.status === "approved");
  const otherQs    = quotations.filter(q => q.status !== "approved");

  return (
    <div className="min-h-screen bg-[#FCFBF9] p-6">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] text-[#9A8F82] hover:text-[#1C1C1C] mb-5 transition-colors">
          <ArrowLeft size={15} /> Back to Invoices
        </button>
        <h1 className="text-[26px] font-bold text-[#1C1C1C]">Generate Invoice</h1>
        <p className="text-[13px] text-[#9A8F82] mt-1">Create a billing request — from an approved quotation or directly</p>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-white border border-[#EDE8DF] rounded-xl p-1 w-fit mb-8 shadow-sm">
        <button
          onClick={() => { setMode("from_quotation"); setApiError(null); setSuccess(false); }}
          className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${mode === "from_quotation" ? "bg-[#C8922A] text-white shadow-sm" : "text-[#6B6259] hover:text-[#1C1C1C]"}`}
        >
          From Quotation
        </button>
        <button
          onClick={() => { setMode("direct"); setApiError(null); setSuccess(false); }}
          className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${mode === "direct" ? "bg-[#C8922A] text-white shadow-sm" : "text-[#6B6259] hover:text-[#1C1C1C]"}`}
        >
          Direct Invoice
        </button>
      </div>

      {success ? (
        <div className="flex flex-col items-center py-20 gap-4">
          <CheckCircle2 size={52} className="text-green-500" />
          <p className="text-[18px] font-bold text-[#1C1C1C]">Invoice Generated!</p>
          <p className="text-[13px] text-[#9A8F82]">Redirecting to invoices…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">

          {/* ── LEFT: Form ── */}
          <div className="lg:col-span-2 space-y-6">

            {apiError && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 text-red-600 text-[13px]">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {/* ════════════════ FROM QUOTATION MODE ════════════════ */}
            {mode === "from_quotation" && (
              <>
                {/* Step 1: Client + Quotation */}
                <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
                  <h3 className="text-[13px] font-bold text-[#1C1C1C] mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">1</span>
                    Select Quotation
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Filter by Client</label>
                      <select value={selectedClientId}
                        onChange={e => { setSelectedClientId(e.target.value); fetchQuotations(e.target.value); setQForm(f => ({ ...f, quotation_id: "" })); setSelectedQDetail(null); }}
                        className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]">
                        <option value="">— All clients —</option>
                        {clientsLoading ? <option disabled>Loading…</option> : clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">
                        Quotation * <span className="text-[10px] font-normal normal-case">(approved shown first)</span>
                      </label>
                      {quotationsLoading ? (
                        <div className="flex items-center gap-2 py-3 text-[13px] text-[#9A8F82]">
                          <Loader2 size={14} className="animate-spin" /> Loading quotations…
                        </div>
                      ) : (
                        <select value={qForm.quotation_id}
                          onChange={e => { setQForm(f => ({ ...f, quotation_id: e.target.value })); fetchQuotationDetail(e.target.value); }}
                          className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none bg-[#FAF8F5] ${qErrors.quotation_id ? "border-red-300" : "border-[#EDE8DF] focus:border-[#C8922A]"}`}>
                          <option value="">— Select quotation —</option>
                          {approvedQs.length > 0 && (
                            <optgroup label="✅ Approved">
                              {approvedQs.map(q => <option key={q.id} value={q.id}>#{q.quote_number} v{q.version} — {q.project_name} ({fmt(q.grand_total)})</option>)}
                            </optgroup>
                          )}
                          {otherQs.length > 0 && (
                            <optgroup label="Other">
                              {otherQs.map(q => <option key={q.id} value={q.id}>#{q.quote_number} v{q.version} — {q.project_name} ({fmt(q.grand_total)}) [{q.status}]</option>)}
                            </optgroup>
                          )}
                        </select>
                      )}
                      {qErrors.quotation_id && <p className="text-[11px] text-red-500 mt-1">{qErrors.quotation_id}</p>}
                      {selectedQ && selectedQ.status !== "approved" && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-amber-700 text-[12px]">
                          <AlertCircle size={14} className="mt-0.5 shrink-0" />
                          Quotation is <strong>{selectedQ.status}</strong> — backend may reject. Approve it first for best results.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 2: Invoice Type */}
                <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
                  <h3 className="text-[13px] font-bold text-[#1C1C1C] mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">2</span>
                    Invoice Type
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {INVOICE_TYPES.map(t => (
                      <button key={t.value} type="button" onClick={() => handleQTypeChange(t.value)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${qForm.invoice_type === t.value ? "border-[#C8922A] bg-[#FDF3E3]" : "border-[#EDE8DF] bg-white hover:border-[#C8922A]/40"}`}>
                        <p className={`text-[13px] font-bold ${qForm.invoice_type === t.value ? "text-[#C8922A]" : "text-[#1C1C1C]"}`}>{t.label}</p>
                        <p className="text-[11px] text-[#9A8F82] mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 3: Milestone (if not full) */}
                {qForm.invoice_type !== "full" && (
                  <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
                    <h3 className="text-[13px] font-bold text-[#1C1C1C] mb-5 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">3</span>
                      Milestone Details
                    </h3>
                    <div className="space-y-4">
                      {/* Label */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Milestone Label *</label>
                        <input value={qForm.milestone_label}
                          onChange={e => setQForm(f => ({ ...f, milestone_label: e.target.value }))}
                          placeholder={qForm.invoice_type === "advance" ? "Advance on Booking" : qForm.invoice_type === "final" ? "Final Handover" : "e.g. Design & Layout Approval"}
                          className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none bg-[#FAF8F5] ${qErrors.milestone_label ? "border-red-300" : "border-[#EDE8DF] focus:border-[#C8922A]"}`} />
                        {qErrors.milestone_label && <p className="text-[11px] text-red-500 mt-1">{qErrors.milestone_label}</p>}
                      </div>

                      {/* Amount mode toggle */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-2">Amount Mode</label>
                        <div className="flex gap-2 mb-3">
                          <button type="button" onClick={() => setQMilestoneMode("percent")}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold border-2 transition-all ${qMilestoneMode === "percent" ? "border-[#C8922A] bg-[#FDF3E3] text-[#C8922A]" : "border-[#EDE8DF] bg-white text-[#6B6259]"}`}>
                            % Percentage
                          </button>
                          <button type="button" onClick={() => setQMilestoneMode("fixed")}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold border-2 transition-all ${qMilestoneMode === "fixed" ? "border-[#C8922A] bg-[#FDF3E3] text-[#C8922A]" : "border-[#EDE8DF] bg-white text-[#6B6259]"}`}>
                            ₹ Fixed Amount
                          </button>
                        </div>

                        {qMilestoneMode === "percent" ? (
                          <div className="grid grid-cols-2 gap-4 items-end">
                            <div>
                              <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Percentage (%)</label>
                              <input type="number" min={1} max={100} value={qForm.milestone_percentage}
                                onChange={e => setQForm(f => ({ ...f, milestone_percentage: Number(e.target.value) }))}
                                className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]" />
                            </div>
                            {selectedQ && (
                              <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#EDE8DF]">
                                <p className="text-[10px] text-[#9A8F82] uppercase font-bold mb-0.5">Invoice Amount</p>
                                <p className="text-[16px] font-bold text-[#C8922A]">{fmt(qAmount)}</p>
                                <p className="text-[10px] text-[#9A8F82]">{qForm.milestone_percentage}% of {fmt(qGrandTotal)}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 items-end">
                            <div>
                              <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Fixed Amount (₹)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82] text-[13px] font-semibold">₹</span>
                                <input type="number" min={0} value={qFixedAmount}
                                  onChange={e => setQFixedAmount(e.target.value)}
                                  placeholder="e.g. 50000"
                                  className={`w-full border rounded-xl pl-7 pr-3 py-2.5 text-[13px] outline-none bg-[#FAF8F5] ${qErrors.qFixedAmount ? "border-red-300" : "border-[#EDE8DF] focus:border-[#C8922A]"}`} />
                              </div>
                              {qErrors.qFixedAmount && <p className="text-[11px] text-red-500 mt-1">{qErrors.qFixedAmount}</p>}
                            </div>
                            {selectedQ && parseFloat(qFixedAmount) > 0 && (
                              <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#EDE8DF]">
                                <p className="text-[10px] text-[#9A8F82] uppercase font-bold mb-0.5">Invoice Amount</p>
                                <p className="text-[16px] font-bold text-[#C8922A]">₹{parseFloat(qFixedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-[#9A8F82]">{effectivePct}% of {fmt(qGrandTotal)}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Dates */}
                <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
                  <h3 className="text-[13px] font-bold text-[#1C1C1C] mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">{qForm.invoice_type !== "full" ? "4" : "3"}</span>
                    Dates & Notes
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Invoice Date *</label>
                      <input type="date" value={qForm.invoice_date} onChange={e => setQForm(f => ({ ...f, invoice_date: e.target.value }))}
                        className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Due In (Days)</label>
                      <input type="number" min={0} value={qForm.due_days} onChange={e => setQForm(f => ({ ...f, due_days: Number(e.target.value) }))}
                        className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]" />
                      {dueDatePreview(qForm.invoice_date, qForm.due_days) && (
                        <p className="text-[11px] text-[#9A8F82] mt-1 flex items-center gap-1">
                          <CalendarDays size={10} /> Due: {dueDatePreview(qForm.invoice_date, qForm.due_days)}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Notes</label>
                      <input value={qForm.notes} onChange={e => setQForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="e.g. Please pay within due date via bank transfer"
                        className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ════════════════ DIRECT INVOICE MODE ════════════════ */}
            {mode === "direct" && (
              <>
                {/* Step 1: Client + Project */}
                <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
                  <h3 className="text-[13px] font-bold text-[#1C1C1C] mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">1</span>
                    Client & Project
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Client *</label>
                      <select value={dForm.client_id}
                        onChange={e => {
                          const cid = e.target.value;
                          const selClient = clients.find(c => c.id === cid);
                          setDForm(f => ({
                            ...f,
                            client_id: cid,
                            project_id: "",
                            billing_address: selClient ? (selClient as any).billing_address || "" : "",
                            site_address:    selClient ? (selClient as any).site_address    || "" : "",
                          }));
                          fetchProjects(cid);
                        }}
                        className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none bg-[#FAF8F5] ${dErrors.project_id ? "border-red-300" : "border-[#EDE8DF] focus:border-[#C8922A]"}`}>
                        <option value="">— Select client —</option>
                        {clientsLoading ? <option disabled>Loading…</option> : clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                      </select>
                      {dErrors.project_id && <p className="text-[11px] text-red-500 mt-1">{dErrors.project_id}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Project</label>
                      <select value={dForm.project_id} onChange={e => setDForm(f => ({ ...f, project_id: e.target.value }))}
                        className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]">
                        <option value="">— Auto-select first project —</option>
                        {projectsLoading ? <option disabled>Loading…</option> : projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Address fields — auto-filled from client, editable */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">
                        Billing Address <span className="font-normal normal-case text-[#C8B89C]">(auto-filled)</span>
                      </label>
                      <input
                        type="text"
                        value={dForm.billing_address}
                        onChange={e => setDForm(f => ({ ...f, billing_address: e.target.value }))}
                        placeholder="e.g. 12, MG Road, Raipur"
                        className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">
                        Site Address <span className="font-normal normal-case text-[#C8B89C]">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={dForm.site_address}
                        onChange={e => setDForm(f => ({ ...f, site_address: e.target.value }))}
                        placeholder="e.g. Bhavna Nagar, Raipur"
                        className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2: Invoice Type */}
                <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
                  <h3 className="text-[13px] font-bold text-[#1C1C1C] mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">2</span>
                    Invoice Type
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {INVOICE_TYPES.map(t => (
                      <button key={t.value} type="button" onClick={() => handleDTypeChange(t.value)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${dForm.invoice_type === t.value ? "border-[#C8922A] bg-[#FDF3E3]" : "border-[#EDE8DF] bg-white hover:border-[#C8922A]/40"}`}>
                        <p className={`text-[13px] font-bold ${dForm.invoice_type === t.value ? "text-[#C8922A]" : "text-[#1C1C1C]"}`}>{t.label}</p>
                        <p className="text-[11px] text-[#9A8F82] mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                  {dForm.invoice_type !== "full" && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Milestone Label</label>
                        <input value={dForm.milestone_label} onChange={e => setDForm(f => ({ ...f, milestone_label: e.target.value }))}
                          placeholder={dForm.invoice_type === "advance" ? "Advance on Booking" : "e.g. Design Approval"}
                          className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Line Items */}
                <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-bold text-[#1C1C1C] flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">3</span>
                      Line Items
                    </h3>
                    <button type="button" onClick={addItem}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:underline">
                      <PlusCircle size={13} /> Add Row
                    </button>
                  </div>
                  {dErrors.items && <p className="text-[11px] text-red-500 mb-3">{dErrors.items}</p>}
                  <div className="overflow-x-auto rounded-xl border border-[#EDE8DF]">
                    <table className="w-full min-w-[620px] text-[12px]">
                      <thead className="bg-[#FAF8F5]">
                        <tr>
                          {["Description", "Category", "Qty", "Unit", "Rate (₹)", "Amount", ""].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5F2ED]">
                        {dItems.map(item => {
                          const amt = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                          return (
                            <tr key={item._key}>
                              <td className="px-2 py-1.5">
                                <input value={item.description} onChange={e => updateItem(item._key, "description", e.target.value)}
                                  placeholder="Interior Design…"
                                  className="w-full min-w-[140px] px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input value={item.category} onChange={e => updateItem(item._key, "category", e.target.value)}
                                  placeholder="Furniture"
                                  className="w-full min-w-[90px] px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="number" value={item.quantity} onChange={e => updateItem(item._key, "quantity", e.target.value)}
                                  className="w-16 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input value={item.unit} onChange={e => updateItem(item._key, "unit", e.target.value)}
                                  placeholder="sqft"
                                  className="w-16 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="number" value={item.rate} onChange={e => updateItem(item._key, "rate", e.target.value)}
                                  placeholder="0"
                                  className="w-24 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]" />
                              </td>
                              <td className="px-3 py-1.5 font-semibold text-[#1C1C1C] whitespace-nowrap">
                                ₹{amt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-1.5">
                                {dItems.length > 1 && (
                                  <button type="button" onClick={() => removeItem(item._key)} className="text-red-400 hover:text-red-600">
                                    <MinusCircle size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Tax mode */}
                  <div className="mt-4">
                    <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-2">Tax Mode</label>
                    <div className="flex gap-2 mb-3">
                      {(["none", "cgst_sgst", "igst"] as const).map(m => (
                        <button key={m} type="button" onClick={() => setDForm(f => ({ ...f, tax_mode: m }))}
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${dForm.tax_mode === m ? "bg-[#C8922A] text-white border-[#C8922A]" : "bg-white border-[#EDE8DF] text-[#6B6259]"}`}>
                          {m === "none" ? "Non-GST" : m === "cgst_sgst" ? "CGST + SGST" : "IGST (Outstation)"}
                        </button>
                      ))}
                    </div>
                    {dForm.tax_mode === "cgst_sgst" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">CGST %</label>
                          <input type="number" min={0} max={28} value={dForm.cgst_rate} onChange={e => setDForm(f => ({ ...f, cgst_rate: e.target.value }))}
                            className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">SGST %</label>
                          <input type="number" min={0} max={28} value={dForm.sgst_rate} onChange={e => setDForm(f => ({ ...f, sgst_rate: e.target.value }))}
                            className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]" />
                        </div>
                      </div>
                    )}
                    {dForm.tax_mode === "igst" && (
                      <div>
                        <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">IGST %</label>
                        <input type="number" min={0} max={28} value={dForm.igst_rate} onChange={e => setDForm(f => ({ ...f, igst_rate: e.target.value }))}
                          className="w-full max-w-[160px] border border-[#EDE8DF] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4: Dates */}
                <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
                  <h3 className="text-[13px] font-bold text-[#1C1C1C] mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">4</span>
                    Dates & Notes
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Invoice Date *</label>
                      <input type="date" value={dForm.invoice_date} onChange={e => setDForm(f => ({ ...f, invoice_date: e.target.value }))}
                        className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Due In (Days)</label>
                      <input type="number" min={0} value={dForm.due_days} onChange={e => setDForm(f => ({ ...f, due_days: Number(e.target.value) }))}
                        className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]" />
                      {dueDatePreview(dForm.invoice_date, dForm.due_days) && (
                        <p className="text-[11px] text-[#9A8F82] mt-1 flex items-center gap-1">
                          <CalendarDays size={10} /> Due: {dueDatePreview(dForm.invoice_date, dForm.due_days)}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">Notes</label>
                      <input value={dForm.notes} onChange={e => setDForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="e.g. Please pay via bank transfer within due date"
                        className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── RIGHT: Preview + Submit ── */}
          <div className="space-y-5">

            {/* ── Quotation Detail Preview (From Quotation mode) ── */}
            {mode === "from_quotation" && selectedQDetail && (
              <div className="bg-white border border-[#EDE8DF] rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-[#FAF8F5] px-4 py-3 border-b border-[#EDE8DF]">
                  <p className="text-[11px] font-black text-[#9A8F82] uppercase tracking-wider">Quotation Preview</p>
                  <p className="text-[13px] font-bold text-[#1C1C1C] mt-0.5">#{selectedQDetail.quote_number} v{selectedQDetail.version}</p>
                </div>
                {/* Client + Project */}
                <div className="px-4 py-3 border-b border-[#F5F2ED] space-y-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#9A8F82]">Client</span>
                    <span className="font-medium text-[#1C1C1C]">{selectedQDetail.client_name || "—"}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#9A8F82]">Project</span>
                    <span className="font-medium text-[#1C1C1C] text-right max-w-[160px]">{selectedQDetail.project_name || "—"}</span>
                  </div>
                  {selectedQDetail.billing_address && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#9A8F82]">Billing Addr</span>
                      <span className="font-medium text-[#1C1C1C] text-right max-w-[160px]">{selectedQDetail.billing_address}</span>
                    </div>
                  )}
                  {selectedQDetail.site_address && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#9A8F82]">Site Addr</span>
                      <span className="font-medium text-[#1C1C1C] text-right max-w-[160px]">{selectedQDetail.site_address}</span>
                    </div>
                  )}
                </div>
                {/* Line Items */}
                {selectedQDetail.items && selectedQDetail.items.length > 0 && (
                  <div className="px-4 py-3 border-b border-[#F5F2ED]">
                    <p className="text-[10px] font-black text-[#9A8F82] uppercase tracking-wider mb-2">Line Items</p>
                    <div className="space-y-1.5">
                      {selectedQDetail.items.map((it: any, i: number) => (
                        <div key={it.id || i} className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-[#1C1C1C] truncate">{it.description}</p>
                            <p className="text-[10px] text-[#9A8F82]">{it.quantity} {it.unit} × {fmt(it.rate)}</p>
                          </div>
                          <span className="text-[12px] font-bold text-[#1C1C1C] whitespace-nowrap">{fmt(it.amount || Number(it.quantity) * Number(it.rate))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Totals */}
                <div className="px-4 py-3 space-y-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#9A8F82]">Subtotal</span>
                    <span className="font-medium">{fmt(selectedQDetail.subtotal)}</span>
                  </div>
                  {parseFloat(selectedQDetail.discount_amount) > 0 && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#9A8F82]">Discount</span>
                      <span className="text-red-500">- {fmt(selectedQDetail.discount_amount)}</span>
                    </div>
                  )}
                  {parseFloat(selectedQDetail.cgst_amount) > 0 && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#9A8F82]">CGST @ {selectedQDetail.cgst_rate}%</span>
                      <span>{fmt(selectedQDetail.cgst_amount)}</span>
                    </div>
                  )}
                  {parseFloat(selectedQDetail.sgst_amount) > 0 && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#9A8F82]">SGST @ {selectedQDetail.sgst_rate}%</span>
                      <span>{fmt(selectedQDetail.sgst_amount)}</span>
                    </div>
                  )}
                  {parseFloat(selectedQDetail.igst_amount) > 0 && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#9A8F82]">IGST @ {selectedQDetail.igst_rate}%</span>
                      <span>{fmt(selectedQDetail.igst_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[14px] pt-2 border-t border-[#EDE8DF] mt-1">
                    <span className="text-[#1C1C1C]">Grand Total</span>
                    <span className="text-[#C8922A]">{fmt(selectedQDetail.grand_total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state for quotation detail */}
            {mode === "from_quotation" && selectedQDetailLoading && (
              <div className="bg-white border border-[#EDE8DF] rounded-2xl p-6 flex items-center justify-center gap-2 text-[13px] text-[#9A8F82]">
                <Loader2 size={14} className="animate-spin text-[#C8922A]" /> Loading quotation details…
              </div>
            )}

            {/* Amount preview card */}
            <div className="bg-[#1C1C1C] text-white p-7 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[11px] text-white/50 uppercase tracking-widest mb-1">Invoice Amount</p>
                <h2 className="text-[30px] font-bold leading-none">
                  {mode === "from_quotation" ? fmt(qAmount) : fmt(dTotals.grand)}
                </h2>
                <div className="mt-5 pt-5 border-t border-white/10 space-y-2">
                  {mode === "from_quotation" && selectedQ && (
                    <>
                      <div className="flex justify-between text-[12px]"><span className="text-white/50">Quotation</span><span>#{selectedQ.quote_number} v{selectedQ.version}</span></div>
                      <div className="flex justify-between text-[12px]"><span className="text-white/50">Project</span><span className="text-right max-w-[140px] truncate">{selectedQ.project_name}</span></div>
                      <div className="flex justify-between text-[12px]"><span className="text-white/50">Client</span><span>{selectedQ.client_name || "—"}</span></div>
                    </>
                  )}
                  {mode === "direct" && (
                    <>
                      <div className="flex justify-between text-[12px]"><span className="text-white/50">Subtotal</span><span>{fmt(dTotals.sub)}</span></div>
                      {dTotals.cgst > 0 && <div className="flex justify-between text-[12px]"><span className="text-white/50">CGST</span><span>{fmt(dTotals.cgst)}</span></div>}
                      {dTotals.sgst > 0 && <div className="flex justify-between text-[12px]"><span className="text-white/50">SGST</span><span>{fmt(dTotals.sgst)}</span></div>}
                      {dTotals.igst > 0 && <div className="flex justify-between text-[12px]"><span className="text-white/50">IGST</span><span>{fmt(dTotals.igst)}</span></div>}
                    </>
                  )}
                  <div className="flex justify-between text-[12px]"><span className="text-white/50">Type</span><span className="capitalize">{mode === "from_quotation" ? qForm.invoice_type : dForm.invoice_type}</span></div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-[#C8922A] rounded-full blur-[70px] opacity-20" />
            </div>

            {/* Generate button */}
            <button
              onClick={mode === "from_quotation" ? handleQSubmit : handleDSubmit}
              disabled={loading || success || (mode === "from_quotation" && !!selectedQ && selectedQ.status !== "approved")}
              className="w-full bg-[#C8922A] hover:bg-[#B07A20] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2.5 text-[14px] transition-all shadow-lg"
            >
              {loading ? <><Loader2 className="animate-spin" size={18} /> Generating…</> :
               success ? <><CheckCircle2 size={18} /> Generated!</> :
               <><Zap size={18} /> Generate Invoice</>}
            </button>

            {/* Tips */}
            <div className="bg-white border border-[#EDE8DF] rounded-xl p-4 space-y-2">
              <p className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">Quick Tips</p>
              {mode === "from_quotation" ? [
                "Only approved quotations generate invoices",
                "Full invoice = 100% of quotation amount",
                "Milestone % is applied to grand total",
              ] : [
                "Direct invoices don't need a quotation",
                "Select a client to auto-pick their first project",
                "Tax is calculated on subtotal of all items",
              ]}
              {(mode === "from_quotation" ? [
                "Only approved quotations generate invoices",
                "Full invoice = 100% of quotation amount",
                "Milestone % is applied to grand total",
              ] : [
                "Direct invoices don't need a quotation",
                "Select a client to auto-pick their first project",
                "Tax is calculated on subtotal of all items",
              ]).map(tip => (
                <div key={tip} className="flex items-start gap-2 text-[12px] text-[#6B6259]">
                  <span className="text-[#C8922A] mt-0.5">•</span><span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
