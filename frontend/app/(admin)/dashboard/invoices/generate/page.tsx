// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Zap, ChevronLeft, Eye, Download, CheckCircle2 } from "lucide-react";

// const milestones = [
//   { label: "Advance on Booking", percentage: 10 },
//   { label: "After Layout Approval", percentage: 20 },
//   { label: "Before 3D Handover", percentage: 25 },
//   { label: "Final Handover", percentage: 5 },
// ];

// export default function GenerateInvoicePage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [success, setSuccess] = useState(false);

//   // Form State
//   const [formData, setFormData] = useState({
//     project: "4aa33d3c-7d68-4a1b-aae1-49e9c5e5bed6", // Replace with dynamic selection logic
//     quotation: "6813b175-06d4-43a6-b92f-98ee62c34693",
//     invoice_type: "advance",
//     invoice_date: new Date().toISOString().split('T')[0],
//     due_date: "",
//     milestone_label: milestones[0].label,
//     milestone_percentage: milestones[0].percentage,
//     notes: "Please pay within 7 days."
//   });

//   const handleGenerate = async () => {
//     setLoading(true);
//     try {
//       const response = await fetch("https://interior-firm-pro2.onrender.com/api/v1//invoices/", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           ...formData,
//           invoice_number: Math.floor(Math.random() * 1000).toString(), // Backend usually handles this
//           grand_total: "15000.00", // Example calc: (ProjectTotal * percentage) / 100
//         }),
//       });

//       if (response.ok) {
//         setSuccess(true);
//         setTimeout(() => router.push("/invoices"), 2000);
//       }
//     } catch (err) {
//       console.error("Failed to generate invoice", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-6 max-w-5xl mx-auto">
//       <button onClick={() => router.back()} className="flex items-center gap-1 text-[13px] text-[#9A8F82] mb-4 hover:text-[#1C1C1C]">
//         <ChevronLeft size={14} /> Back to Invoices
//       </button>

//       <div className="flex items-center justify-between mb-8">
//         <div>
//           <h1 className="text-[24px] font-bold text-[#1C1C1C]">Generate Invoice</h1>
//           <p className="text-[14px] text-[#9A8F82]">Create a new billing request from an approved quote</p>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//         <div className="space-y-6">
//           <section className="bg-white p-6 rounded-xl border border-[#EDE8DF]">
//             <h3 className="text-[14px] font-bold mb-4">Invoice Details</h3>
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-[11px] font-bold text-[#9A8F82] uppercase mb-1.5">Invoice Type</label>
//                 <select
//                   className="w-full border border-[#EDE8DF] rounded-lg p-2.5 text-[13px] outline-none focus:border-[#C8922A]"
//                   onChange={(e) => setFormData({...formData, invoice_type: e.target.value})}
//                 >
//                   <option value="advance">Advance Payment</option>
//                   <option value="running_bill">Running Bill</option>
//                   <option value="final">Final Settlement</option>
//                 </select>
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-[11px] font-bold text-[#9A8F82] uppercase mb-1.5">Date</label>
//                   <input type="date" value={formData.invoice_date} className="w-full border border-[#EDE8DF] rounded-lg p-2.5 text-[13px]" />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] font-bold text-[#9A8F82] uppercase mb-1.5">Due Date</label>
//                   <input type="date" onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="w-full border border-[#EDE8DF] rounded-lg p-2.5 text-[13px]" />
//                 </div>
//               </div>
//             </div>
//           </section>

//           <section className="bg-white p-6 rounded-xl border border-[#EDE8DF]">
//             <h3 className="text-[14px] font-bold mb-4">Select Milestone</h3>
//             <div className="grid gap-3">
//               {milestones.map((m) => (
//                 <button
//                   key={m.label}
//                   onClick={() => setFormData({...formData, milestone_label: m.label, milestone_percentage: m.percentage})}
//                   className={`flex items-center justify-between p-4 rounded-xl border transition-all ${formData.milestone_label === m.label ? 'border-[#C8922A] bg-[#FDF3E3]' : 'border-[#EDE8DF] hover:bg-[#FAF8F5]'}`}
//                 >
//                   <span className="text-[13px] font-medium">{m.label}</span>
//                   <span className="text-[13px] font-bold text-[#C8922A]">{m.percentage}%</span>
//                 </button>
//               ))}
//             </div>
//           </section>
//         </div>

//         <div className="space-y-6">
//           <div className="bg-[#1C1C1C] text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
//             <div className="relative z-10">
//               <p className="text-[11px] text-white/50 uppercase tracking-widest mb-1">Preview Amount</p>
//               <h2 className="text-[32px] font-bold">₹15,000.00</h2>
//               <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
//                 <div className="flex justify-between text-[13px]">
//                   <span className="text-white/50">Milestone</span>
//                   <span>{formData.milestone_label}</span>
//                 </div>
//                 <div className="flex justify-between text-[13px]">
//                   <span className="text-white/50">Type</span>
//                   <span className="capitalize">{formData.invoice_type}</span>
//                 </div>
//               </div>
//             </div>
//             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#C8922A] rounded-full blur-[80px] opacity-20"></div>
//           </div>

//           <button
//             disabled={loading || success}
//             onClick={handleGenerate}
//             className="w-full bg-[#C8922A] hover:bg-[#B07A20] disabled:bg-[#EDE8DF] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#C8922A]/20"
//           >
//             {loading ? "Processing..." : success ? <><CheckCircle2 size={18}/> Generated!</> : <><Zap size={18}/> Generate & Save Invoice</>}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  CalendarDays,
  FileText,
  Zap,
} from "lucide-react";
import {
  generateInvoice,
  type GenerateInvoicePayload,
  type InvoiceType,
} from "@/services/invoiceService";
import {
  getQuotationsByClient,
  getAllClients,
  type Client,
} from "@/services/clientService";

// ─── Token helper ─────────────────────────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1").replace(/\/+$/, "");

// ─── Fmt ──────────────────────────────────────────────────────────────────────
const fmt = (n: any) =>
  "₹" +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Invoice type options ─────────────────────────────────────────────────────
const INVOICE_TYPES: {
  value: InvoiceType;
  label: string;
  desc: string;
  defaultPct: number;
  defaultDays: number;
  defaultLabel: string;
}[] = [
  {
    value: "full",
    label: "Full (100%)",
    desc: "Complete invoice for entire amount",
    defaultPct: 100,
    defaultDays: 15,
    defaultLabel: "",
  },
  {
    value: "advance",
    label: "Advance",
    desc: "Initial advance payment on booking",
    defaultPct: 10,
    defaultDays: 7,
    defaultLabel: "Advance on Booking",
  },
  {
    value: "milestone",
    label: "Milestone",
    desc: "Partial payment for a project phase",
    defaultPct: 20,
    defaultDays: 15,
    defaultLabel: "",
  },
  {
    value: "final",
    label: "Final",
    desc: "Final invoice at project handover",
    defaultPct: 20,
    defaultDays: 7,
    defaultLabel: "Final Handover",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GenerateInvoicePage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [quotationsLoading, setQuotationsLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);

  const [form, setForm] = useState<{
    quotation_id: string;
    invoice_type: InvoiceType;
    milestone_label: string;
    milestone_percentage: number;
    invoice_date: string;
    due_days: number;
    notes: string;
  }>({
    quotation_id: "",
    invoice_type: "full",
    milestone_label: "",
    milestone_percentage: 100,
    invoice_date: new Date().toISOString().split("T")[0],
    due_days: 15,
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Selected quotation preview
  const selectedQuotation = quotations.find((q) => q.id === form.quotation_id);

  // Computed invoice amount
  const invoiceAmount = selectedQuotation
    ? (parseFloat(selectedQuotation.grand_total || "0") *
        form.milestone_percentage) /
      100
    : 0;

  // Auth check
  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await getAllClients();
      setClients(data);
    } catch {
      /* ignore */
    } finally {
      setClientsLoading(false);
    }
  };

  const fetchQuotations = async (clientId: string) => {
    if (!clientId) {
      setQuotations([]);
      return;
    }
    setQuotationsLoading(true);
    try {
      const data = await getQuotationsByClient(clientId);
      setQuotations(data);
    } catch {
      // Fallback: fetch all quotations and filter
      try {
        const res = await fetch(`${API_BASE}/quotations/`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const d = await res.json();
          setQuotations(d.results ?? d);
        }
      } catch {
        /* ignore */
      }
    } finally {
      setQuotationsLoading(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setForm((f) => ({ ...f, quotation_id: "" }));
    fetchQuotations(clientId);
  };

  const handleTypeChange = (type: InvoiceType) => {
    const t = INVOICE_TYPES.find((x) => x.value === type)!;
    setForm((f) => ({
      ...f,
      invoice_type: type,
      milestone_percentage: t.defaultPct,
      due_days: t.defaultDays,
      milestone_label: t.defaultLabel,
    }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.quotation_id) e.quotation_id = "Please select a quotation";
    if (!form.invoice_date) e.invoice_date = "Invoice date required";
    if (form.invoice_type !== "full" && !form.milestone_label)
      e.milestone_label = "Milestone label required";
    if (form.milestone_percentage < 1 || form.milestone_percentage > 100)
      e.milestone_percentage = "Must be 1–100%";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGenerate = async () => {
    setApiError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const payload: GenerateInvoicePayload = {
        quotation_id: form.quotation_id,
        invoice_type: form.invoice_type,
        milestone_label:
          form.invoice_type !== "full" ? form.milestone_label : undefined,
        milestone_percentage: form.milestone_percentage,
        invoice_date: form.invoice_date,
        due_days: form.due_days,
        notes: form.notes || undefined,
      };
      await generateInvoice(payload);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/invoices"), 1800);
    } catch (err: any) {
      // Parse Django error response
      if (typeof err === "object" && err !== null) {
        const msgs = Object.entries(err)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
        setApiError(msgs);
      } else {
        setApiError(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const approvedQuotations = quotations.filter((q) => q.status === "approved");
  const allQuotations = quotations; // show all but highlight approved

  // ── Due date preview ────────────────────────────────────────────────────────
  const dueDatePreview = (() => {
    if (!form.invoice_date) return null;
    const d = new Date(form.invoice_date);
    d.setDate(d.getDate() + form.due_days);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  })();

  return (
    <div className="min-h-screen bg-[#FCFBF9] p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] text-[#9A8F82] hover:text-[#1C1C1C] mb-5 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Invoices
        </button>
        <h1 className="text-[26px] font-bold text-[#1C1C1C]">
          Generate Invoice
        </h1>
        <p className="text-[13px] text-[#9A8F82] mt-1">
          Create a billing request from an approved quotation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
        {/* LEFT: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* API Error */}
          {apiError && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 text-red-600 text-[13px]">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Step 1: Client & Quotation */}
          <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
            <h3 className="text-[13px] font-bold text-[#1C1C1C] mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              Select Client & Quotation
            </h3>

            <div className="space-y-4">
              {/* Client select */}
              <div>
                <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">
                  Client
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5] cursor-pointer"
                >
                  <option value="">— All clients —</option>
                  {clientsLoading ? (
                    <option disabled>Loading...</option>
                  ) : (
                    clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Quotation select */}
              <div>
                <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">
                  Quotation *{" "}
                  <span className="text-[10px] font-normal text-[#9A8F82] normal-case">
                    (approved ones shown first)
                  </span>
                </label>
                {quotationsLoading ? (
                  <div className="flex items-center gap-2 py-3 text-[13px] text-[#9A8F82]">
                    <Loader2 size={14} className="animate-spin" /> Loading
                    quotations...
                  </div>
                ) : (
                  <select
                    value={form.quotation_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, quotation_id: e.target.value }))
                    }
                    className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none bg-[#FAF8F5] cursor-pointer ${errors.quotation_id ? "border-red-300" : "border-[#EDE8DF] focus:border-[#C8922A]"}`}
                  >
                    <option value="">— Select quotation —</option>
                    {approvedQuotations.length > 0 && (
                      <optgroup label="✅ Approved">
                        {approvedQuotations.map((q) => (
                          <option key={q.id} value={q.id}>
                            #{q.quote_number} v{q.version} — {q.project_name} (
                            {fmt(q.grand_total)})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {allQuotations.filter((q) => q.status !== "approved")
                      .length > 0 && (
                      <optgroup label="Other">
                        {allQuotations
                          .filter((q) => q.status !== "approved")
                          .map((q) => (
                            <option key={q.id} value={q.id}>
                              #{q.quote_number} v{q.version} — {q.project_name}{" "}
                              ({fmt(q.grand_total)}) [{q.status}]
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                )}
                {errors.quotation_id && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.quotation_id}
                  </p>
                )}
                {!selectedClientId &&
                  !quotationsLoading &&
                  allQuotations.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> Select a client above to filter
                      quotations, or leave blank to see all
                    </p>
                  )}
              </div>
            </div>
          </div>

          {/* Step 2: Invoice Type */}
          <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
            <h3 className="text-[13px] font-bold text-[#1C1C1C] mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              Invoice Type
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {INVOICE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    form.invoice_type === t.value
                      ? "border-[#C8922A] bg-[#FDF3E3]"
                      : "border-[#EDE8DF] bg-white hover:border-[#C8922A]/40"
                  }`}
                >
                  <p
                    className={`text-[13px] font-bold ${form.invoice_type === t.value ? "text-[#C8922A]" : "text-[#1C1C1C]"}`}
                  >
                    {t.label}
                  </p>
                  <p className="text-[11px] text-[#9A8F82] mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Milestone details (hidden for full) */}
          {form.invoice_type !== "full" && (
            <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
              <h3 className="text-[13px] font-bold text-[#1C1C1C] mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">
                  3
                </span>
                Milestone Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">
                    Milestone Label *
                  </label>
                  <input
                    value={form.milestone_label}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        milestone_label: e.target.value,
                      }))
                    }
                    placeholder={
                      form.invoice_type === "advance"
                        ? "Advance on Booking"
                        : form.invoice_type === "final"
                          ? "Final Handover"
                          : "e.g. Design & Layout Approval"
                    }
                    className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none bg-[#FAF8F5] ${errors.milestone_label ? "border-red-300" : "border-[#EDE8DF] focus:border-[#C8922A]"}`}
                  />
                  {errors.milestone_label && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.milestone_label}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">
                    Percentage (%) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.milestone_percentage}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        milestone_percentage: Number(e.target.value),
                      }))
                    }
                    className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none bg-[#FAF8F5] ${errors.milestone_percentage ? "border-red-300" : "border-[#EDE8DF] focus:border-[#C8922A]"}`}
                  />
                  {errors.milestone_percentage && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.milestone_percentage}
                    </p>
                  )}
                  <p className="text-[11px] text-[#9A8F82] mt-1">
                    % of quotation grand total to invoice
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Dates */}
          <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
            <h3 className="text-[13px] font-bold text-[#1C1C1C] mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[11px] font-bold flex items-center justify-center">
                {form.invoice_type !== "full" ? "4" : "3"}
              </span>
              Dates & Notes
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, invoice_date: e.target.value }))
                  }
                  className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none bg-[#FAF8F5] ${errors.invoice_date ? "border-red-300" : "border-[#EDE8DF] focus:border-[#C8922A]"}`}
                />
                {errors.invoice_date && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.invoice_date}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">
                  Due In (Days)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.due_days}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, due_days: Number(e.target.value) }))
                  }
                  className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]"
                />
                {dueDatePreview && (
                  <p className="text-[11px] text-[#9A8F82] mt-1 flex items-center gap-1">
                    <CalendarDays size={10} /> Due: {dueDatePreview}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wide mb-1.5">
                  Notes
                </label>
                <input
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="e.g. Please pay within due date via bank transfer"
                  className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Preview + Generate */}
        <div className="space-y-5">
          {/* Amount preview card */}
          <div className="bg-[#1C1C1C] text-white p-7 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[11px] text-white/50 uppercase tracking-widest mb-1">
                Invoice Amount
              </p>
              <h2 className="text-[30px] font-bold leading-none">
                {fmt(invoiceAmount)}
              </h2>
              {selectedQuotation && (
                <p className="text-[12px] text-white/50 mt-1">
                  {form.milestone_percentage}% of{" "}
                  {fmt(selectedQuotation.grand_total)}
                </p>
              )}

              <div className="mt-5 pt-5 border-t border-white/10 space-y-2.5">
                {selectedQuotation && (
                  <>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/50">Quotation</span>
                      <span>
                        #{selectedQuotation.quote_number} v
                        {selectedQuotation.version}
                      </span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/50">Project</span>
                      <span className="text-right max-w-[140px] truncate">
                        {selectedQuotation.project_name}
                      </span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/50">Client</span>
                      <span>{selectedQuotation.client_name}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-[12px]">
                  <span className="text-white/50">Type</span>
                  <span className="capitalize">{form.invoice_type}</span>
                </div>
                {form.milestone_label && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/50">Milestone</span>
                    <span className="text-right max-w-[140px] truncate">
                      {form.milestone_label}
                    </span>
                  </div>
                )}
                {dueDatePreview && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/50">Due Date</span>
                    <span>{dueDatePreview}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-[#C8922A] rounded-full blur-[70px] opacity-20" />
          </div>

          {/* Quotation not approved warning */}
          {selectedQuotation && selectedQuotation.status !== "approved" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-700 text-[12px]">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Quotation not approved</p>
                <p className="text-amber-600 mt-0.5">
                  This quotation is <strong>{selectedQuotation.status}</strong>.
                  Backend may reject invoice generation. Approve the quotation
                  first.
                </p>
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || success}
            className="w-full bg-[#C8922A] hover:bg-[#B07A20] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2.5 text-[14px] transition-all shadow-lg shadow-[#C8922A]/20"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Generating...
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={18} /> Invoice Generated!
              </>
            ) : (
              <>
                <Zap size={18} /> Generate Invoice
              </>
            )}
          </button>

          {success && (
            <p className="text-center text-[13px] text-[#9A8F82]">
              Redirecting to invoices...
            </p>
          )}

          {/* Quick tips */}
          <div className="bg-white border border-[#EDE8DF] rounded-xl p-4 space-y-2.5">
            <p className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">
              Quick Tips
            </p>
            {[
              "Only approved quotations can generate invoices",
              "Full invoice = 100% of quotation amount",
              "Milestone % is applied to grand total",
              "Due date = Invoice date + Due days",
            ].map((tip) => (
              <div
                key={tip}
                className="flex items-start gap-2 text-[12px] text-[#6B6259]"
              >
                <span className="text-[#C8922A] mt-0.5">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
