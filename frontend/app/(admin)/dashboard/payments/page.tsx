"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Download,
  CheckCircle,
  Clock,
  Banknote,
  Loader2,
  Bell,
  ChevronDown,
  X,
  MessageCircle,
  Mail,
  AlertTriangle,
  Eye,
} from "lucide-react";
import RecordPaymentModal, {
  type Invoice,
} from "@/components/RecordPaymentModal";
import PaymentHistoryPanel from "@/components/PaymentHistoryModal";
import { getAllInvoices, sendReminder } from "@/services/invoiceService";
import API_BASE_URL from "@/lib/config";

// ── API helpers ───────────────────────────────────────────────────────────────

function getToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("access") || localStorage.getItem("access_token") || localStorage.getItem("token")
    : "";
}

// ── Payment summary types ────────────────────────────────────────────────────

interface PaymentModeTotal {
  payment_mode: string;
  total_amount: number;
  count: number;
}

interface InvoiceStatusStat {
  count: number;
  total_grand: number;
  total_paid: number;
  total_balance: number;
}

interface PaymentSummary {
  by_payment_mode: PaymentModeTotal[];
  overall: { total_collected: number; payment_count: number };
  by_invoice_status: Record<string, InvoiceStatusStat> | null;
}

const MODE_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  upi:           "UPI",
  cheque:        "Cheque",
  cash:          "Cash",
  neft:          "NEFT / RTGS",
  other:         "Other",
};

const MODE_COLORS: Record<string, string> = {
  bank_transfer: "#3B82F6",
  upi:           "#8B5CF6",
  cheque:        "#6B7280",
  cash:          "#10B981",
  neft:          "#3B82F6",
  other:         "#9A8F82",
};

async function fetchPaymentSummary(): Promise<PaymentSummary> {
  const res = await fetch(`${API_BASE_URL}/payments/summary/`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Summary fetch failed");
  return res.json();
}

async function exportCSV(invoices: Invoice[]) {
  const headers = [
    "Invoice #",
    "Client",
    "Project",
    "Total",
    "Paid",
    "Balance",
    "Status",
    "Date",
  ];
  const rows = invoices.map((inv) => [
    `INV-${inv.invoice_number}`,
    inv.client_name,
    inv.project_name,
    inv.grand_total,
    inv.amount_paid || "0",
    inv.balance_due || "0",
    inv.status,
    // invoice_date if available
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "payments.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  paid: { label: "Paid", color: "#10B981", bg: "#ECFDF5" },
  // BUG FIX: Backend enum is "partial" not "partially_paid" — keep both for safety
  partial: { label: "Partial", color: "#F59E0B", bg: "#FFFBEB" },
  partially_paid: { label: "Partial", color: "#F59E0B", bg: "#FFFBEB" },
  issued: { label: "Issued", color: "#3B82F6", bg: "#EFF6FF" },
  overdue: { label: "Overdue", color: "#EF4444", bg: "#FEF2F2" },
  draft: { label: "Draft", color: "#9A8F82", bg: "#F5F2ED" },
  cancelled: { label: "Cancelled", color: "#6B7280", bg: "#F3F4F6" },
};

type FilterStatus = "all" | "paid" | "partial" | "issued" | "overdue";

// ── Component ─────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  // Payment summary (category-wise)
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInvoice, setModalInvoice] = useState<Invoice | null>(null);

  // Drawer — payment history
  const [drawerInvoice, setDrawerInvoice] = useState<Invoice | null>(null);

  // Reminder state
  const [reminderLoading, setReminderLoading] = useState<string | null>(null);
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null);
  const [reminderMenu, setReminderMenu] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAllInvoices()
      .then((data) => {
        setInvoices(data);
        // Also refresh the drawer invoice object if one is open
        setDrawerInvoice((prev) => {
          if (!prev) return null;
          const updated = data.find((inv) => inv.id === prev.id);
          return updated ?? prev;
        });
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  const loadSummary = useCallback(() => {
    fetchPaymentSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    load();
    loadSummary();
  }, [load, loadSummary]);

  // Filter invoices — exclude draft and cancelled from Payment Tracker view
  const filtered = invoices.filter((inv) => {
    // Exclude draft/cancelled from payment tracker (they don't have payments)
    if (inv.status === "draft" || inv.status === "cancelled") return false;
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.client_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      inv.project_name?.toLowerCase().includes(search.toLowerCase());
    // normalise "partially_paid" → "partial" for filter comparison
    const normStatus = inv.status === "partially_paid" ? "partial" : inv.status;
    const matchStatus = filterStatus === "all" || normStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  // Summary totals — only active invoices (exclude draft/cancelled)
  const activeInvoices = invoices.filter(
    (inv) => inv.status !== "draft" && inv.status !== "cancelled"
  );
  const totalCollected = activeInvoices.reduce(
    (s, inv) => s + parseFloat(inv.amount_paid || "0"),
    0,
  );
  const totalOutstanding = activeInvoices.reduce(
    (s, inv) => s + Math.max(0, parseFloat(inv.balance_due || "0")),
    0,
  );
  const totalInvoiced = activeInvoices.reduce(
    (s, inv) => s + parseFloat(inv.grand_total),
    0,
  );
  const overdueCount = activeInvoices.filter(
    (inv) => inv.status === "overdue",
  ).length;

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(v);

  function openRecordModal(invoice?: Invoice) {
    setModalInvoice(invoice || null);
    setModalOpen(true);
  }

  async function handleReminder(
    invoice: Invoice,
    channel: "whatsapp" | "email",
  ) {
    setReminderLoading(invoice.id);
    setReminderMenu(null);
    try {
      await sendReminder(invoice.id, channel);
      setReminderSuccess(invoice.id);
      setTimeout(() => setReminderSuccess(null), 2500);
    } catch {
      // could add toast
    } finally {
      setReminderLoading(null);
    }
  }

  // After any payment is recorded / changed, refresh both invoice list and summary
  function handlePaymentChange() {
    load();
    loadSummary();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <Loader2 className="animate-spin text-[#C8922A]" size={32} />
        <p className="text-[#9A8F82] text-sm">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="p-6" onClick={() => setReminderMenu(null)}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1C1C1C]">
            Payment Tracker
          </h1>
          <p className="text-[13px] text-[#9A8F82] mt-0.5">
            All invoices · payment collection · reminders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowSummary(v => !v); }}
            className={`flex items-center gap-2 border text-[13px] font-medium px-4 py-2.5 rounded-lg transition-colors ${showSummary ? "bg-[#FDF3E3] border-[#C8922A] text-[#C8922A]" : "bg-white border-[#EDE8DF] text-[#6B6259] hover:bg-[#FAF8F5]"}`}
          >
            <Banknote size={14} /> Payment Summary
          </button>
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-2 bg-white border border-[#EDE8DF] text-[#6B6259] text-[13px] font-medium px-4 py-2.5 rounded-lg hover:bg-[#FAF8F5] transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => openRecordModal()}
            className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={15} /> Record Payment
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={<CheckCircle size={22} />}
          iconBg="#ECFDF5"
          iconColor="#10B981"
          value={fmt(totalCollected)}
          label="Total Collected"
        />
        <SummaryCard
          icon={<Clock size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          value={fmt(totalOutstanding)}
          label="Outstanding Balance"
        />
        <SummaryCard
          icon={<Banknote size={22} />}
          iconBg="#FDF3E3"
          iconColor="#C8922A"
          value={fmt(totalInvoiced)}
          label="Total Invoiced"
        />
        <SummaryCard
          icon={<AlertTriangle size={22} />}
          iconBg="#FEF2F2"
          iconColor="#EF4444"
          value={String(overdueCount)}
          label="Overdue Invoices"
          highlight={overdueCount > 0}
        />
      </div>

      {/* ── Category-wise Payment Summary Panel ── */}
      {showSummary && summary && (
        <div className="mb-6 bg-white border border-[#EDE8DF] rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EDE8DF] bg-[#FAF8F5]">
            <span className="text-[13px] font-semibold text-[#1C1C1C]">Payment Collection — Category Breakdown</span>
            <button onClick={() => setShowSummary(false)} className="p-1.5 rounded-lg hover:bg-[#EDE8DF] text-[#9A8F82]"><X size={14} /></button>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By payment mode */}
            <div>
              <p className="text-[11px] font-semibold text-[#9A8F82] uppercase tracking-wide mb-3">By Payment Mode</p>
              {summary.by_payment_mode.length === 0 ? (
                <p className="text-[12px] text-[#9A8F82]">No payments recorded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {summary.by_payment_mode.map((m) => {
                    const pct = summary.overall.total_collected > 0
                      ? Math.round((m.total_amount / summary.overall.total_collected) * 100)
                      : 0;
                    const color = MODE_COLORS[m.payment_mode] || "#9A8F82";
                    return (
                      <div key={m.payment_mode}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-medium text-[#1C1C1C]">
                            {MODE_LABELS[m.payment_mode] || m.payment_mode}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#9A8F82]">{m.count} payment{m.count !== 1 ? "s" : ""}</span>
                            <span className="text-[12px] font-bold text-[#1C1C1C]">
                              ₹{m.total_amount.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] text-[#9A8F82]">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#F5F2ED] rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* By invoice status */}
            <div>
              <p className="text-[11px] font-semibold text-[#9A8F82] uppercase tracking-wide mb-3">By Invoice Status</p>
              {!summary.by_invoice_status ? (
                <p className="text-[12px] text-[#9A8F82]">No data available.</p>
              ) : (
                <div className="space-y-2">
                  {(["paid", "partial", "issued", "overdue"] as const).map((s) => {
                    const stat = summary.by_invoice_status![s];
                    if (!stat) return null;
                    const conf = STATUS_CONFIG[s] || STATUS_CONFIG.draft;
                    return (
                      <div key={s} className="flex items-center justify-between py-2 border-b border-[#F5F2ED] last:border-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: conf.color }}
                          />
                          <span className="text-[12px] font-medium text-[#1C1C1C]">{conf.label}</span>
                          <span className="text-[11px] text-[#9A8F82]">({stat.count})</span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-[10px] text-[#9A8F82]">Invoiced</p>
                            <p className="text-[11px] font-semibold text-[#1C1C1C]">₹{stat.total_grand.toLocaleString("en-IN")}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#10B981]">Collected</p>
                            <p className="text-[11px] font-bold text-[#10B981]">₹{stat.total_paid.toLocaleString("en-IN")}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#EF4444]">Balance</p>
                            <p className="text-[11px] font-bold text-[#EF4444]">₹{stat.total_balance.toLocaleString("en-IN")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-[#EDE8DF] rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="text-[#9A8F82]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices, clients..."
            className="bg-transparent text-[13px] outline-none flex-1 placeholder-[#9A8F82]"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 bg-white border border-[#EDE8DF] rounded-lg p-1">
          {(
            [
              "all",
              "overdue",
              "partial",
              "issued",
              "paid",
            ] as FilterStatus[]
          ).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${
                filterStatus === s
                  ? "bg-[#C8922A] text-white"
                  : "text-[#9A8F82] hover:text-[#6B6259] hover:bg-[#FAF8F5]"
              }`}
            >
              {s === "all"
                ? "All"
                : s === "overdue"
                  ? "Overdue"
                  : s === "partial"
                    ? "Partial"
                    : s === "issued"
                      ? "Issued"
                      : "Paid"}
            </button>
          ))}
        </div>

        <p className="text-[12px] text-[#9A8F82] ml-auto">
          {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-[#EDE8DF] overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <div className="w-12 h-12 rounded-full bg-[#FAF8F5] flex items-center justify-center">
              <Banknote size={22} className="text-[#9A8F82]" />
            </div>
            <p className="text-[13px] font-medium text-[#6B6259]">
              No invoices found
            </p>
            <p className="text-[12px] text-[#9A8F82]">
              Try adjusting your search or filter
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EDE8DF] bg-[#FAF8F5]">
                  {[
                    "Invoice #",
                    "Client / Project",
                    "Total",
                    "Paid",
                    "Balance",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[11px] font-semibold text-[#9A8F82] uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const statusConf =
                    STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                  const balance = parseFloat(inv.balance_due || "0");
                  const isOverdue = inv.status === "overdue";
                  const isReminding = reminderLoading === inv.id;
                  const justReminded = reminderSuccess === inv.id;
                  const showMenu = reminderMenu === inv.id;

                  return (
                    <tr
                      key={inv.id}
                      className={`border-b border-[#F5F2ED] last:border-0 transition-colors ${
                        isOverdue
                          ? "bg-[#FFFBEB] hover:bg-[#FEF3C7]"
                          : "hover:bg-[#FAF8F5]"
                      }`}
                    >
                      {/* Invoice # — click to open detail page */}
                      <td className="px-5 py-4">
                        <button
                          // onClick={() => router.push(`/invoices/${inv.id}`)}
                          className="flex items-center gap-1.5 group"
                        >
                          <span className="text-[12px] font-mono font-semibold text-[#6B6259] group-hover:text-[#C8922A] transition-colors">
                            INV-{inv.invoice_number}
                          </span>
                          {/* <ExternalLink
                            size={10}
                            className="text-[#9A8F82] opacity-0 group-hover:opacity-100 transition-opacity"
                          /> */}
                        </button>
                        {isOverdue && (
                          <span className="mt-1 inline-block text-[10px] bg-[#FEF2F2] text-[#EF4444] px-1.5 py-0.5 rounded font-bold">
                            OVERDUE
                          </span>
                        )}
                      </td>

                      {/* Client */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#FDF3E3] text-[#C8922A] text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                            {(inv.client_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-[#1C1C1C] leading-tight">
                              {inv.client_name || "Unknown client"}
                            </p>
                            <p className="text-[11px] text-[#9A8F82]">
                              {inv.project_name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4 text-[13px] font-semibold text-[#1C1C1C] whitespace-nowrap">
                        ₹{parseFloat(inv.grand_total).toLocaleString("en-IN")}
                      </td>

                      {/* Paid */}
                      <td className="px-5 py-4 text-[13px] font-bold text-[#10B981] whitespace-nowrap">
                        ₹
                        {parseFloat(inv.amount_paid || "0").toLocaleString(
                          "en-IN",
                        )}
                      </td>

                      {/* Balance */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {balance > 0 ? (
                          <span className="text-[13px] font-bold text-[#EF4444]">
                            ₹{balance.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-[12px] font-semibold text-[#10B981]">
                            —
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase"
                          style={{
                            color: statusConf.color,
                            backgroundColor: statusConf.bg,
                          }}
                        >
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* View payment history */}
                          <button
                            onClick={() =>
                              setDrawerInvoice(
                                drawerInvoice?.id === inv.id ? null : inv,
                              )
                            }
                            className={`p-1.5 rounded-md transition-colors text-[#9A8F82] ${
                              drawerInvoice?.id === inv.id
                                ? "bg-[#FDF3E3] text-[#C8922A]"
                                : "hover:bg-[#EDE8DF]"
                            }`}
                            title="View payment history"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Record payment — only if not fully paid */}
                          {inv.status !== "paid" &&
                            inv.status !== "cancelled" && (
                              <button
                                onClick={() => openRecordModal(inv)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FDF3E3] hover:bg-[#F0D9B0] text-[#C8922A] text-[11px] font-semibold rounded-lg transition-colors"
                              >
                                <Plus size={11} /> Pay
                              </button>
                            )}

                          {/* Reminder — overdue, partial, or issued */}
                          {(isOverdue ||
                            inv.status === "partial" ||
                            inv.status === "partially_paid" ||
                            inv.status === "issued") && (
                            <div className="relative">
                              {justReminded ? (
                                <span className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-[#10B981]">
                                  <CheckCircle size={11} /> Sent!
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    setReminderMenu(showMenu ? null : inv.id)
                                  }
                                  disabled={isReminding}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
                                    isOverdue
                                      ? "bg-[#FEF2F2] hover:bg-[#FECACA] text-[#EF4444]"
                                      : "bg-[#EDE8DF] hover:bg-[#D4C5A9] text-[#6B6259]"
                                  }`}
                                  title="Send payment reminder"
                                >
                                  {isReminding ? (
                                    <Loader2
                                      size={11}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Bell size={11} />
                                  )}
                                  Remind
                                  <ChevronDown size={9} />
                                </button>
                              )}

                              {/* Reminder dropdown */}
                              {showMenu && !isReminding && (
                                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[#EDE8DF] rounded-xl shadow-xl overflow-hidden min-w-[170px]">
                                  <button
                                    onClick={() =>
                                      handleReminder(inv, "whatsapp")
                                    }
                                    className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-[#FAF8F5] text-left"
                                  >
                                    <MessageCircle
                                      size={14}
                                      className="text-[#25D366]"
                                    />
                                    <span className="text-[13px] font-medium text-[#1C1C1C]">
                                      WhatsApp
                                    </span>
                                  </button>
                                  <div className="border-t border-[#EDE8DF]" />
                                  <button
                                    onClick={() => handleReminder(inv, "email")}
                                    className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-[#FAF8F5] text-left"
                                  >
                                    <Mail
                                      size={14}
                                      className="text-[#6B6259]"
                                    />
                                    <span className="text-[13px] font-medium text-[#1C1C1C]">
                                      Email
                                    </span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Inline Payment History Drawer ── */}
      {drawerInvoice && (
        <div className="mt-4 bg-white border border-[#EDE8DF] rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EDE8DF] bg-[#FAF8F5]">
            <div className="flex items-center gap-2">
              <Banknote size={15} className="text-[#C8922A]" />
              <span className="text-[13px] font-semibold text-[#1C1C1C]">
                Payment History — INV-{drawerInvoice.invoice_number}
              </span>
              <span className="text-[11px] text-[#9A8F82]">
                ({drawerInvoice.client_name})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {drawerInvoice.status !== "paid" &&
                drawerInvoice.status !== "cancelled" && (
                  <button
                    onClick={() => openRecordModal(drawerInvoice)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C8922A] text-white text-[12px] font-semibold rounded-lg hover:bg-[#B07A20] transition-colors"
                  >
                    <Plus size={12} /> Record Payment
                  </button>
                )}
              <button
                onClick={() => setDrawerInvoice(null)}
                className="p-1.5 rounded-lg hover:bg-[#EDE8DF] text-[#9A8F82] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="p-5">
            <PaymentHistoryPanel
              invoiceId={drawerInvoice.id}
              grandTotal={parseFloat(drawerInvoice.grand_total)}
              onPaymentChange={handlePaymentChange}
            />
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      <RecordPaymentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalInvoice(null);
        }}
        onSuccess={() => {
          handlePaymentChange();
          setDrawerInvoice(null);
        }}
        preselectedInvoice={modalInvoice}
      />
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  highlight,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm ${
        highlight ? "border-[#FECACA]" : "border-[#EDE8DF]"
      }`}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div>
        <p
          className="text-[22px] font-bold"
          style={{ color: highlight ? "#EF4444" : "#1C1C1C" }}
        >
          {value}
        </p>
        <p className="text-[12px] text-[#9A8F82]">{label}</p>
      </div>
    </div>
  );
}