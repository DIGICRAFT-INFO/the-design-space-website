"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  X,
  Printer,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Trash2,
  Send,
  Banknote,
  Eye,
  Search,
  AlertCircle,
  IndianRupee,
  BadgeCheck,
  Clock,
  FileStack,
  Bell,
  ChevronDown,
  Copy,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import {
  getAllInvoices,
  deleteInvoice,
  sendInvoice,
  markInvoicePaid,
  downloadInvoicePDF,
  downloadInvoiceCSV,
  sendInvoiceEmail,
  sendInvoiceWhatsApp,
  getInvoiceById,
  copyInvoice,
  type Invoice,
} from "@/services/invoiceService";
import RecordPaymentModal from "@/components/RecordPaymentModal";
import PaymentHistoryPanel from "@/components/PaymentHistoryModal";

// ─── Token helper ─────────────────────────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

// ─── Status / Type config ─────────────────────────────────────────────────────
const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Draft", color: "#6B7280", bg: "#F3F4F6" },
  issued: { label: "Issued", color: "#3B82F6", bg: "#EFF6FF" },
  partial: { label: "Partial", color: "#F59E0B", bg: "#FFFBEB" },
  partially_paid: { label: "Partial", color: "#F59E0B", bg: "#FFFBEB" },
  paid: { label: "Paid", color: "#10B981", bg: "#ECFDF5" },
  overdue: { label: "Overdue", color: "#EF4444", bg: "#FEF2F2" },
  cancelled: { label: "Cancelled", color: "#9CA3AF", bg: "#F9FAFB" },
};

const typeConfig: Record<string, { label: string; color: string; bg: string }> =
  {
    full: { label: "Full", color: "#6366F1", bg: "#EEF2FF" },
    advance: { label: "Advance", color: "#06B6D4", bg: "#ECFEFF" },
    milestone: { label: "Milestone", color: "#8B5CF6", bg: "#F5F3FF" },
    final: { label: "Final", color: "#0D9488", bg: "#F0FDFA" },
  };

const fmt = (n: any) =>
  "₹" +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = { success: "#10B981", error: "#EF4444", info: "#C8922A" }[type];
  return (
    <div
      className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-[13px] font-semibold"
      style={{ backgroundColor: bg }}
    >
      {message}
      <button onClick={onClose}>
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function InvoiceDetailPanel({
  inv,
  onClose,
  onRefresh,
}: {
  inv: Invoice;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [reminderMenu, setReminderMenu] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState<
    "whatsapp" | "email" | null
  >(null);

  function token() {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      ""
    );
  }

  async function sendReminder(channel: "whatsapp" | "email") {
    setReminderLoading(true);
    setReminderMenu(false);
    try {
      const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1").replace(/\/+$/, "");
      const endpoint =
        channel === "whatsapp"
          ? `${API_BASE_URL}/notifications/whatsapp/reminder/${inv.id}/`
          : `${API_BASE_URL}/notifications/email/reminder/${inv.id}/`;
      await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      setReminderSuccess(channel);
      setTimeout(() => setReminderSuccess(null), 3000);
    } catch {
      /* silently fail */
    } finally {
      setReminderLoading(false);
    }
  }

  const canPay = !["paid", "cancelled"].includes(inv.status);
  const canRemind = ["overdue", "partial", "partially_paid", "issued"].includes(
    inv.status,
  );
  const isOverdue = inv.status === "overdue";

  const invoiceForModal = {
    id: inv.id,
    invoice_number: inv.invoice_number,
    client_name: inv.client_name,
    project_name: inv.project_name,
    grand_total: inv.grand_total,
    amount_paid: inv.amount_paid,
    balance_due: inv.balance_due,
    status: inv.status,
  };

  return (
    <div
      className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm overflow-hidden"
      onClick={() => setReminderMenu(false)}
    >
      {/* ── Panel header ── */}
      <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#EDE8DF] flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[13px] font-bold text-[#1C1C1C]">
            Invoice #{inv.invoice_number}
          </h3>
          <p className="text-[11px] text-[#9A8F82]">
            {inv.project_name} — {inv.client_name}
          </p>
        </div>

        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Send Reminder */}
          {canRemind && (
            <div className="relative">
              {reminderSuccess ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ECFDF5] border border-[#6EE7B7] text-[#10B981] text-[12px] font-semibold rounded-lg">
                  ✓ {reminderSuccess === "whatsapp" ? "WhatsApp" : "Email"}{" "}
                  sent!
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setReminderMenu((v) => !v)}
                    disabled={reminderLoading}
                    className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      isOverdue
                        ? "bg-[#FEF2F2] border-[#FECACA] text-[#EF4444] hover:bg-[#FECACA]"
                        : "bg-white border-[#EDE8DF] text-[#6B6259] hover:bg-[#FAF8F5]"
                    }`}
                  >
                    {reminderLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Bell size={12} />
                    )}
                    Remind
                    <ChevronDown size={10} />
                  </button>

                  {reminderMenu && (
                    <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-[#EDE8DF] rounded-xl shadow-xl overflow-hidden min-w-[175px]">
                      <button
                        onClick={() => sendReminder("whatsapp")}
                        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-[#FAF8F5] text-left transition-colors"
                      >
                        <MessageCircle size={14} className="text-[#25D366]" />
                        <div>
                          <p className="text-[12px] font-semibold text-[#1C1C1C]">
                            WhatsApp
                          </p>
                          <p className="text-[10px] text-[#9A8F82]">
                            WA Business API
                          </p>
                        </div>
                      </button>
                      <div className="border-t border-[#EDE8DF]" />
                      <button
                        onClick={() => sendReminder("email")}
                        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-[#FAF8F5] text-left transition-colors"
                      >
                        <Mail size={14} className="text-[#6B6259]" />
                        <div>
                          <p className="text-[12px] font-semibold text-[#1C1C1C]">
                            Email
                          </p>
                          <p className="text-[10px] text-[#9A8F82]">
                            Gmail SMTP
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Record Payment */}
          {canPay && (
            <button
              onClick={() => setPayModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold rounded-lg transition-colors"
            >
              <Plus size={12} /> Record Payment
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="text-[#9A8F82] hover:text-red-500 ml-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Meta grid */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-[#FAF8F5] rounded-xl border border-[#EDE8DF] text-[12px]">
          {(
            [
              [
                "Invoice Type",
                <span
                  key="t"
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                  style={{
                    color: typeConfig[inv.invoice_type]?.color,
                    backgroundColor: typeConfig[inv.invoice_type]?.bg,
                  }}
                >
                  {inv.invoice_type}
                </span>,
              ],
              [
                "Status",
                <span
                  key="s"
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                  style={{
                    color: statusConfig[inv.status]?.color,
                    backgroundColor: statusConfig[inv.status]?.bg,
                  }}
                >
                  {inv.status}
                </span>,
              ],
              [
                "Invoice Date",
                inv.invoice_date
                  ? new Date(inv.invoice_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—",
              ],
              [
                "Due Date",
                inv.due_date
                  ? new Date(inv.due_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—",
              ],
              ...(inv.milestone_label
                ? [["Milestone", inv.milestone_label]]
                : []),
              ...(parseFloat(inv.milestone_percentage) > 0
                ? [["Milestone %", `${inv.milestone_percentage}%`]]
                : []),
            ] as [string, React.ReactNode][]
          ).map(([label, val]) => (
            <div key={String(label)}>
              <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                {label}
              </p>
              <div className="font-medium text-[#1C1C1C]">{val}</div>
            </div>
          ))}
        </div>

        {/* Line items */}
        {inv.items && inv.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#EDE8DF]">
                  {["#", "Description", "Qty", "Unit", "Rate", "Amount"].map(
                    (h) => (
                      <th
                        key={h}
                        className="pb-2 pr-4 text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F2ED]">
                {inv.items.map((it: any, n: number) => (
                  <tr key={it.id || n}>
                    <td className="py-2 pr-4 text-[#9A8F82]">{n + 1}</td>
                    <td className="py-2 pr-4 font-medium text-[#1C1C1C]">
                      {it.description}
                    </td>
                    <td className="py-2 pr-4 text-[#1C1C1C]">{it.quantity}</td>
                    <td className="py-2 pr-4 text-[#6B6259]">{it.unit}</td>
                    <td className="py-2 pr-4 text-[#1C1C1C]">{fmt(it.rate)}</td>
                    <td className="py-2 font-bold text-[#1C1C1C]">
                      {fmt(it.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="ml-auto w-72 space-y-1.5 pt-4 border-t border-[#EDE8DF] text-[13px]">
          {(
            [
              ["Subtotal", fmt(inv.subtotal)],
              parseFloat(inv.cgst_amount) > 0 && ["CGST", fmt(inv.cgst_amount)],
              parseFloat(inv.sgst_amount) > 0 && ["SGST", fmt(inv.sgst_amount)],
              parseFloat(inv.igst_amount) > 0 && ["IGST", fmt(inv.igst_amount)],
              parseFloat(inv.total_tax) > 0 && [
                "Total Tax",
                fmt(inv.total_tax),
              ],
            ] as any[]
          )
            .filter(Boolean)
            .map(([label, val]: any) => (
              <div key={label} className="flex justify-between text-[#6B6259]">
                <span>{label}</span>
                <span className="font-medium text-[#1C1C1C]">{val}</span>
              </div>
            ))}
          <div className="flex justify-between font-bold text-[15px] pt-2 border-t border-[#EDE8DF]">
            <span>Grand Total</span>
            <span className="text-[#C8922A]">{fmt(inv.grand_total)}</span>
          </div>
          {parseFloat(inv.amount_paid) > 0 && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Amount Paid</span>
              <span>{fmt(inv.amount_paid)}</span>
            </div>
          )}
          {parseFloat(inv.balance_due) > 0 && (
            <div className="flex justify-between text-amber-600 font-bold">
              <span>Balance Due</span>
              <span>{fmt(inv.balance_due)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {inv.notes && (
          <div className="bg-[#FAF8F5] rounded-lg px-4 py-3 text-[13px] text-[#6B6259] border border-[#EDE8DF]">
            <span className="font-bold text-[#9A8F82] uppercase text-[10px] block mb-1 tracking-wide">
              Notes
            </span>
            {inv.notes}
          </div>
        )}

        {/* Payment History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-bold text-[#6B6259] uppercase tracking-wide">
              Payment History
            </p>
            {canPay && (
              <button
                onClick={() => setPayModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FDF3E3] hover:bg-[#F0D9B0] text-[#C8922A] text-[11px] font-semibold rounded-lg transition-colors"
              >
                <Plus size={11} /> Record Payment
              </button>
            )}
          </div>
          <PaymentHistoryPanel
            invoiceId={inv.id}
            grandTotal={parseFloat(inv.grand_total || "0")}
            onPaymentChange={onRefresh}
          />
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onSuccess={onRefresh}
        preselectedInvoice={invoiceForModal}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Copy Modal State ────────────────────────────────────────────────────────
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceInvoice, setCopySourceInvoice] = useState<any>(null);
  const [copySubmitting, setCopySubmitting] = useState(false);
  const [copyForm, setCopyForm] = useState<{
    invoice_date: string;
    due_date: string;
    notes: string;
    items: Array<{ _key: string; description: string; category: string; quantity: string; unit: string; rate: string }>;
  }>({ invoice_date: "", due_date: "", notes: "", items: [] });

  const showToast = (message: string, type: "success" | "error" | "info") =>
    setToast({ message, type });

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await getAllInvoices();
      setInvoices(data);
    } catch (err: any) {
      if (err.message?.includes("401")) {
        ["access", "access_token", "token"].forEach((k) =>
          localStorage.removeItem(k),
        );
        window.location.href = "/login";
      } else {
        showToast("Failed to load invoices", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setViewingInvoice(null);
    try {
      const inv = await getInvoiceById(id);
      setViewingInvoice(inv);
    } catch {
      showToast("Failed to load invoice detail", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSend = async (id: string) => {
    setActionId(`send_${id}`);
    try {
      await sendInvoice(id);
      showToast("Marked as Issued!", "success");
      fetchInvoices();
      if (viewingInvoice?.id === id) openDetail(id);
    } catch {
      showToast("Failed", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!confirm("Mark this invoice as Paid?")) return;
    setActionId(`paid_${id}`);
    try {
      await markInvoicePaid(id);
      showToast("Marked as Paid!", "success");
      fetchInvoices();
      if (viewingInvoice?.id === id) openDetail(id);
    } catch {
      showToast("Failed", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice permanently?")) return;
    try {
      await deleteInvoice(id);
      showToast("Deleted", "info");
      if (viewingInvoice?.id === id) setViewingInvoice(null);
      fetchInvoices();
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const handlePDF = async (id: string, num: string) => {
    setActionId(`pdf_${id}`);
    try {
      await downloadInvoicePDF(id, num);
      showToast("PDF downloaded!", "success");
    } catch (err: any) {
      showToast(err.message || "PDF failed", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleCSV = async (id: string) => {
    setActionId(`csv_${id}`);
    try {
      const inv = await getInvoiceById(id);
      downloadInvoiceCSV(inv);
      showToast("CSV downloaded!", "success");
    } catch {
      showToast("CSV failed", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleEmail = async (id: string) => {
    setActionId(`email_${id}`);
    try {
      await sendInvoiceEmail(id);
      showToast("Email sent!", "success");
    } catch {
      showToast("Email failed", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleWhatsApp = async (id: string) => {
    setActionId(`wa_${id}`);
    try {
      await sendInvoiceWhatsApp(id);
      showToast("WhatsApp sent!", "success");
    } catch {
      showToast("WhatsApp failed", "error");
    } finally {
      setActionId(null);
    }
  };

  // ── Copy Modal Handlers ────────────────────────────────────────────────────
  const openCopyModal = async (inv: Invoice) => {
    const full = await getInvoiceById(inv.id);
    setCopySourceInvoice(full);
    const today = new Date().toISOString().split("T")[0];
    const due = new Date();
    due.setDate(due.getDate() + 15);
    setCopyForm({
      invoice_date: today,
      due_date: due.toISOString().split("T")[0],
      notes: (full as any).notes || "",
      items: ((full as any).items || []).map((it: any, i: number) => ({
        _key: `item_${i}_${Date.now()}`,
        description: it.description || "",
        category: it.category || "",
        quantity: String(it.quantity || "1"),
        unit: it.unit || "",
        rate: String(it.rate || "0"),
      })),
    });
    setIsCopyModalOpen(true);
  };

  const updateCopyItem = (key: string, field: string, value: string) => {
    setCopyForm(prev => ({
      ...prev,
      items: prev.items.map(it => it._key === key ? { ...it, [field]: value } : it),
    }));
  };

  const addCopyItem = () => {
    setCopyForm(prev => ({
      ...prev,
      items: [...prev.items, { _key: `new_${Date.now()}`, description: "", category: "", quantity: "1", unit: "", rate: "0" }],
    }));
  };

  const removeCopyItem = (key: string) => {
    setCopyForm(prev => ({
      ...prev,
      items: prev.items.filter(it => it._key !== key),
    }));
  };

  const submitCopyInvoice = async () => {
    if (!copySourceInvoice?.id) return;
    setCopySubmitting(true);
    try {
      const newInv = await copyInvoice(copySourceInvoice.id, {
        invoice_date: copyForm.invoice_date,
        due_date: copyForm.due_date,
        notes: copyForm.notes,
        items: copyForm.items.map(it => ({
          description: it.description,
          category: it.category,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
        })),
      });
      setIsCopyModalOpen(false);
      setCopySourceInvoice(null);
      await fetchInvoices();
      showToast("Invoice copied successfully!", "success");
      if (newInv?.id) openDetail(newInv.id);
    } catch (e: any) {
      showToast(e?.message || "Copy failed", "error");
    } finally {
      setCopySubmitting(false);
    }
  };

  const handleRowClick = (inv: Invoice) => {
    const cid = (inv as any).client_id || (inv as any).client;
    if (cid) router.push(`/dashboard/clients/${cid}`);
    else openDetail(inv.id);
  };

  const stats = {
    total: invoices.reduce((s, i) => s + parseFloat(i.grand_total || "0"), 0),
    paid: invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + parseFloat(i.grand_total || "0"), 0),
    pending: invoices
      .filter((i) =>
        ["draft", "issued", "partial", "partially_paid"].includes(i.status),
      )
      .reduce(
        (s, i) => s + parseFloat(i.balance_due || i.grand_total || "0"),
        0,
      ),
    overdue: invoices.filter((i) => i.status === "overdue").length,
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.client_name?.toLowerCase().includes(q) ||
      inv.project_name?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 min-h-screen bg-[#FCFBF9]">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#1C1C1C]">Invoices</h1>
          <p className="text-[13px] text-[#9A8F82] mt-0.5">
            Track billing, payments & outstanding amounts
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/invoices/generate")}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <Plus size={16} /> Generate Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Invoiced",
            value: fmt(stats.total),
            icon: <IndianRupee size={14} />,
            color: "text-[#C8922A]",
            bg: "bg-[#FDF3E3]",
          },
          {
            label: "Amount Received",
            value: fmt(stats.paid),
            icon: <BadgeCheck size={14} />,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Balance Pending",
            value: fmt(stats.pending),
            icon: <Clock size={14} />,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Overdue Count",
            value: String(stats.overdue),
            icon: <AlertCircle size={14} />,
            color: "text-red-500",
            bg: "bg-red-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-[#EDE8DF] rounded-xl p-4 shadow-sm"
          >
            <div
              className={`inline-flex p-2 ${s.bg} rounded-lg ${s.color} mb-2`}
            >
              {s.icon}
            </div>
            <p className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">
              {s.label}
            </p>
            <p className={`text-[16px] font-bold ${s.color} mt-0.5`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]"
          />
          <input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#EDE8DF] rounded-xl text-[13px] outline-none focus:border-[#C8922A]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] cursor-pointer"
        >
          <option value="">All Status</option>
          {Object.entries(statusConfig).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden shadow-sm mb-5">
        <table className="w-full text-left">
          <thead className="bg-[#FAF8F5] border-b border-[#EDE8DF]">
            <tr>
              {[
                "Invoice #",
                "Client / Project",
                "Type",
                "Date",
                "Due Date",
                "Grand Total",
                "Status",
                "Actions",
              ].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-4 text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider ${i >= 5 ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2ED]">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-20 text-center">
                  <Loader2
                    className="animate-spin inline text-[#C8922A]"
                    size={24}
                  />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileStack size={28} className="text-[#C8C0B5]" />
                    <p className="text-[#9A8F82] text-[13px] font-medium">
                      No invoices found.
                    </p>
                    <p className="text-[#9A8F82] text-[12px]">
                      Generate one from an approved quotation.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const st = statusConfig[inv.status] || statusConfig.draft;
                const tt = typeConfig[inv.invoice_type] || typeConfig.full;
                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-[#FAF8F5] transition-colors"
                  >
                    <td className="px-4 py-4">
                      <button
                        onClick={() => openDetail(inv.id)}
                        className="flex items-center gap-1.5 group"
                      >
                        <span className="text-[13px] font-bold text-[#C8922A] group-hover:underline">
                          #{inv.invoice_number}
                        </span>
                        <Eye
                          size={11}
                          className="text-[#9A8F82] opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleRowClick(inv)}
                        className="text-left group"
                      >
                        <p className="text-[13px] font-semibold text-[#1C1C1C] group-hover:text-[#C8922A] transition-colors">
                          {inv.client_name}
                        </p>
                        <p className="text-[11px] text-[#9A8F82]">
                          {inv.project_name}
                        </p>
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={{ color: tt.color, backgroundColor: tt.bg }}
                      >
                        {inv.invoice_type}
                      </span>
                      {inv.milestone_label && (
                        <p className="text-[10px] text-[#9A8F82] mt-0.5 truncate max-w-[100px]">
                          {inv.milestone_label}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[12px] text-[#6B6259]">
                      {inv.invoice_date
                        ? new Date(inv.invoice_date).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-[12px] text-[#6B6259]">
                      {inv.due_date
                        ? new Date(inv.due_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-[13px] font-bold text-[#1C1C1C]">
                        {fmt(inv.grand_total)}
                      </p>
                      {parseFloat(inv.balance_due) > 0 &&
                        parseFloat(inv.balance_due) !==
                          parseFloat(inv.grand_total) && (
                          <p className="text-[10px] text-amber-600 font-medium">
                            Bal: {fmt(inv.balance_due)}
                          </p>
                        )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase"
                        style={{ color: st.color, backgroundColor: st.bg }}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status === "draft" && (
                          <button
                            onClick={() => handleSend(inv.id)}
                            title="Mark Issued"
                            disabled={actionId === `send_${inv.id}`}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                          >
                            {actionId === `send_${inv.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Send size={13} />
                            )}
                          </button>
                        )}
                        {["issued", "partial", "partially_paid"].includes(
                          inv.status,
                        ) && (
                          <button
                            onClick={() => handleMarkPaid(inv.id)}
                            title="Mark Paid"
                            disabled={actionId === `paid_${inv.id}`}
                            className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 disabled:opacity-50"
                          >
                            {actionId === `paid_${inv.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Banknote size={13} />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handlePDF(inv.id, inv.invoice_number)}
                          title="Download PDF"
                          disabled={actionId === `pdf_${inv.id}`}
                          className="p-1.5 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                        >
                          {actionId === `pdf_${inv.id}` ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Printer size={13} />
                          )}
                        </button>
                        <button
                          onClick={() => handleCSV(inv.id)}
                          title="Download CSV"
                          disabled={actionId === `csv_${inv.id}`}
                          className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 disabled:opacity-50"
                        >
                          {actionId === `csv_${inv.id}` ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <FileSpreadsheet size={13} />
                          )}
                        </button>
                        <button
                          onClick={() => handleEmail(inv.id)}
                          title="Send Email"
                          disabled={actionId === `email_${inv.id}`}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                        >
                          {actionId === `email_${inv.id}` ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Mail size={13} />
                          )}
                        </button>
                        <button
                          onClick={() => handleWhatsApp(inv.id)}
                          title="WhatsApp"
                          disabled={actionId === `wa_${inv.id}`}
                          className="p-1.5 rounded-md hover:bg-[#ECFDF5] disabled:opacity-50"
                          style={{ background: "#f0fdf4", color: "#16a34a" }}
                        >
                          {actionId === `wa_${inv.id}` ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <MessageCircle size={13} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          title="Delete"
                          className="p-1.5 bg-red-50 text-red-500 rounded-md hover:bg-red-100"
                        >
                          <Trash2 size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openCopyModal(inv); }}
                          title="Copy & Edit Invoice"
                          className="p-1.5 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {detailLoading && (
        <div className="bg-white rounded-2xl border border-[#EDE8DF] p-12 text-center shadow-sm">
          <Loader2 className="animate-spin inline text-[#C8922A]" size={28} />
        </div>
      )}
      {!detailLoading && viewingInvoice && (
        <InvoiceDetailPanel
          inv={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onRefresh={() => {
            fetchInvoices();
            openDetail(viewingInvoice.id);
          }}
        />
      )}

      {/* ════════════════════════════════════════════════════════
          COPY MODAL: Copy & Edit Invoice
      ════════════════════════════════════════════════════════ */}
      {isCopyModalOpen && copySourceInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EDE8DF] w-full max-w-3xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE8DF] bg-[#FAF8F5] rounded-t-2xl">
              <div>
                <h2 className="text-[15px] font-bold text-[#1C1C1C]">Copy Invoice</h2>
                <p className="text-[11px] text-[#9A8F82] mt-0.5">
                  Source: <span className="font-semibold text-[#C8922A]">{copySourceInvoice.invoice_number}</span>
                  {" "}→ will create <span className="font-semibold text-[#C8922A]">{copySourceInvoice.invoice_number}-C1</span> (or next suffix)
                </p>
              </div>
              <button onClick={() => setIsCopyModalOpen(false)} className="text-[#9A8F82] hover:text-red-500">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Meta fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">Client</label>
                  <div className="px-3 py-2 bg-[#FAF8F5] border border-[#EDE8DF] rounded-lg text-[13px] text-[#6B6259]">
                    {copySourceInvoice.client_name || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">Invoice Type</label>
                  <div className="px-3 py-2 bg-[#FAF8F5] border border-[#EDE8DF] rounded-lg text-[13px] text-[#6B6259] capitalize">
                    {copySourceInvoice.invoice_type || "full"}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={copyForm.invoice_date}
                    onChange={(e) => setCopyForm(p => ({ ...p, invoice_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">Due Date</label>
                  <input
                    type="date"
                    value={copyForm.due_date}
                    onChange={(e) => setCopyForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={copyForm.notes}
                  onChange={(e) => setCopyForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A] resize-none"
                  placeholder="Payment terms, remarks..."
                />
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">Line Items</label>
                  <button
                    onClick={addCopyItem}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#C8922A] hover:underline"
                  >
                    <PlusCircle size={13} /> Add Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#EDE8DF]">
                  <table className="w-full min-w-[700px] text-[12px]">
                    <thead className="bg-[#FAF8F5]">
                      <tr>
                        {["Description", "Category", "Qty", "Unit", "Rate (₹)", "Amount (₹)", ""].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5F2ED]">
                      {copyForm.items.map((item) => {
                        const amt = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                        return (
                          <tr key={item._key}>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.description}
                                onChange={(e) => updateCopyItem(item._key, "description", e.target.value)}
                                placeholder="e.g. Interior Design"
                                className="w-full min-w-[140px] px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.category}
                                onChange={(e) => updateCopyItem(item._key, "category", e.target.value)}
                                placeholder="Furniture"
                                className="w-full min-w-[100px] px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateCopyItem(item._key, "quantity", e.target.value)}
                                className="w-16 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.unit}
                                onChange={(e) => updateCopyItem(item._key, "unit", e.target.value)}
                                placeholder="sqft"
                                className="w-16 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => updateCopyItem(item._key, "rate", e.target.value)}
                                className="w-24 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-3 py-1.5 font-semibold text-[#1C1C1C] whitespace-nowrap">
                              ₹{amt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                onClick={() => removeCopyItem(item._key)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <MinusCircle size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Grand total preview */}
                <div className="flex justify-end mt-3 pr-2">
                  <div className="text-[13px] font-bold text-[#1C1C1C]">
                    Grand Total: ₹
                    {copyForm.items
                      .reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), 0)
                      .toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#EDE8DF] flex justify-end gap-3 bg-[#FAF8F5] rounded-b-2xl">
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#EDE8DF] text-[13px] font-semibold text-[#6B6259] hover:bg-[#F5F2ED]"
              >
                Cancel
              </button>
              <button
                onClick={submitCopyInvoice}
                disabled={copySubmitting}
                className="px-5 py-2 rounded-lg bg-[#C8922A] text-white text-[13px] font-bold hover:bg-[#B07A20] disabled:opacity-60 flex items-center gap-2"
              >
                {copySubmitting ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                Create Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}