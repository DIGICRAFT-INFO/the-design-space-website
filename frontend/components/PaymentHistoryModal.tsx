"use client";

import React, { useEffect, useState } from "react";
import {
  Banknote, Trash2, Edit3, Check, X, Loader2,
  CreditCard, Landmark, Smartphone, Coins, MoreHorizontal,
  AlertCircle
} from "lucide-react";
import API_BASE_URL from "@/lib/config";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentRecord {
  id: string;
  invoice: string;
  invoice_number?: string;
  client_name?: string;
  amount_paid: string;
  payment_date: string;
  payment_mode: string;
  reference_number: string;
  notes: string;
  created_at: string;
}

interface EditPayload {
  amount_paid: string;
  payment_date: string;
  payment_mode: string;
  reference_number: string;
  notes: string;
}

interface PaymentHistoryPanelProps {
  invoiceId: string;
  grandTotal: number;
  onPaymentChange?: () => void;
}

// ── Token helper ──────────────────────────────────────────────────────────────
// BUG FIX #7: Unified token lookup — original used only "access_token" but
// authService stores token under "access". Check all possible keys.
function getToken(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

// ── API Helpers ───────────────────────────────────────────────────────────────
// BUG FIX #8: All fetch calls used "/api/v1/payments/" (relative, requires
// Next.js proxy) — fixed to use API_BASE_URL from config.

async function fetchPaymentsByInvoice(invoiceId: string): Promise<PaymentRecord[]> {
  const res = await fetch(`${API_BASE_URL}/payments/?invoice=${invoiceId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch payments: ${res.status}`);
  return res.json();
}

// BUG FIX #9: Original only updated "notes" via PATCH. Now sends full edit
// payload so amount, date, mode, reference can all be updated — and
// invoice.update_balance() will be triggered server-side.
async function updatePayment(paymentId: string, payload: Partial<EditPayload>): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/payments/${paymentId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = `Update failed (${res.status})`;
    try { const e = await res.json(); msg = JSON.stringify(e); } catch {}
    throw new Error(msg);
  }
}

async function deletePayment(paymentId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/payments/${paymentId}/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_MODES = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi",           label: "UPI" },
  { value: "cheque",        label: "Cheque" },
  { value: "cash",          label: "Cash" },
  { value: "neft",          label: "NEFT / RTGS" },
  { value: "other",         label: "Other" },
];

const MODE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  bank_transfer: { label: "Bank Transfer", icon: <Landmark size={12} />, color: "#3B82F6" },
  upi:           { label: "UPI",           icon: <Smartphone size={12} />, color: "#8B5CF6" },
  cheque:        { label: "Cheque",        icon: <CreditCard size={12} />, color: "#6B7280" },
  cash:          { label: "Cash",          icon: <Coins size={12} />,      color: "#10B981" },
  neft:          { label: "NEFT / RTGS",   icon: <Landmark size={12} />,  color: "#3B82F6" },
  other:         { label: "Other",         icon: <MoreHorizontal size={12} />, color: "#9A8F82" },
};

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PaymentHistoryPanel({
  invoiceId,
  grandTotal,
  onPaymentChange,
}: PaymentHistoryPanelProps) {
  const [payments, setPayments]       = useState<PaymentRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState("");

  // Edit state — full edit form
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editPayload, setEditPayload] = useState<EditPayload>({
    amount_paid: "", payment_date: "", payment_mode: "bank_transfer",
    reference_number: "", notes: ""
  });
  const [savingId, setSavingId]       = useState<string | null>(null);
  const [saveError, setSaveError]     = useState("");

  // Delete state
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState("");

  const load = () => {
    setLoading(true);
    setFetchError("");
    fetchPaymentsByInvoice(invoiceId)
      .then(data => { setPayments(data); setFetchError(""); })
      .catch(err => { setFetchError(err.message); setPayments([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [invoiceId]);

  const totalPaid   = payments.reduce((s, p) => s + parseFloat(p.amount_paid || "0"), 0);
  const balanceDue  = Math.max(0, grandTotal - totalPaid);
  const paidPercent = grandTotal > 0 ? Math.min(100, (totalPaid / grandTotal) * 100) : 0;

  function startEdit(payment: PaymentRecord) {
    setEditingId(payment.id);
    setSaveError("");
    // Format date for <input type="date"> (YYYY-MM-DD)
    const d = payment.payment_date
      ? new Date(payment.payment_date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    setEditPayload({
      amount_paid:      String(parseFloat(payment.amount_paid || "0")),
      payment_date:     d,
      payment_mode:     payment.payment_mode || "bank_transfer",
      reference_number: payment.reference_number || "",
      notes:            payment.notes || "",
    });
  }

  async function handleSave(paymentId: string) {
    setSavingId(paymentId);
    setSaveError("");
    const amount = parseFloat(editPayload.amount_paid);
    if (!amount || amount <= 0) {
      setSaveError("Amount must be greater than 0.");
      setSavingId(null);
      return;
    }
    try {
      await updatePayment(paymentId, {
        ...editPayload,
        amount_paid: String(amount),
      });
      // Update local state optimistically
      setPayments(prev =>
        prev.map(p =>
          p.id === paymentId
            ? {
                ...p,
                amount_paid:      String(amount),
                payment_date:     editPayload.payment_date,
                payment_mode:     editPayload.payment_mode,
                reference_number: editPayload.reference_number,
                notes:            editPayload.notes,
              }
            : p
        )
      );
      setEditingId(null);
      onPaymentChange?.(); // refresh parent invoice totals
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(paymentId: string) {
    setDeletingId(paymentId);
    setDeleteError("");
    try {
      await deletePayment(paymentId);
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      setConfirmDelete(null);
      onPaymentChange?.();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <Loader2 size={18} className="animate-spin text-[#C8922A]" />
        <span className="text-[13px] text-[#9A8F82]">Loading payment history...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-10 h-10 rounded-full bg-[#FEF2F2] flex items-center justify-center">
          <AlertCircle size={18} className="text-[#EF4444]" />
        </div>
        <p className="text-[13px] font-medium text-[#EF4444]">Failed to load payments</p>
        <p className="text-[11px] text-[#9A8F82] text-center max-w-xs">{fetchError}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-[#FAF8F5] border border-[#EDE8DF] rounded-lg text-[12px] font-medium text-[#6B6259] hover:bg-[#EDE8DF] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white border border-[#EDE8DF] rounded-xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-2 bg-[#F5F2ED]">
          <div
            className="h-2 bg-[#10B981] transition-all duration-700"
            style={{ width: `${paidPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#EDE8DF]">
          <div className="px-5 py-3.5 text-center">
            <p className="text-[11px] text-[#9A8F82] font-medium uppercase tracking-wide mb-0.5">
              Total Invoiced
            </p>
            <p className="text-[16px] font-bold text-[#1C1C1C]">
              ₹{grandTotal.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="px-5 py-3.5 text-center">
            <p className="text-[11px] text-[#10B981] font-medium uppercase tracking-wide mb-0.5">
              Collected
            </p>
            <p className="text-[16px] font-bold text-[#10B981]">
              ₹{totalPaid.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="px-5 py-3.5 text-center">
            <p className="text-[11px] text-[#EF4444] font-medium uppercase tracking-wide mb-0.5">
              Balance Due
            </p>
            <p className={`text-[16px] font-bold ${balanceDue > 0 ? "text-[#EF4444]" : "text-[#10B981]"}`}>
              {balanceDue > 0 ? `₹${balanceDue.toLocaleString("en-IN")}` : "Fully Paid ✓"}
            </p>
          </div>
        </div>
      </div>

      {/* Global errors */}
      {deleteError && (
        <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-4 py-3">
          <AlertCircle size={13} className="text-[#EF4444] flex-shrink-0" />
          <span className="text-[12px] text-[#EF4444]">{deleteError}</span>
          <button onClick={() => setDeleteError("")} className="ml-auto text-[#EF4444] hover:opacity-70">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Payment records */}
      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 bg-[#FAF8F5] rounded-xl border border-dashed border-[#EDE8DF]">
          <div className="w-12 h-12 rounded-full bg-[#EDE8DF] flex items-center justify-center mb-3">
            <Banknote size={22} className="text-[#9A8F82]" />
          </div>
          <p className="text-[13px] font-medium text-[#6B6259]">No payments recorded yet</p>
          <p className="text-[12px] text-[#9A8F82] mt-1">Click "Record Payment" to log a payment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((payment, idx) => {
            const modeConf  = MODE_CONFIG[payment.payment_mode] || MODE_CONFIG.other;
            const isEditing  = editingId  === payment.id;
            const isDeleting = deletingId === payment.id;
            const isConfirm  = confirmDelete === payment.id;

            return (
              <div
                key={payment.id}
                className="bg-white border border-[#EDE8DF] rounded-xl px-5 py-4 hover:border-[#D4C5A9] transition-colors"
              >
                {isEditing ? (
                  /* ── FULL EDIT FORM ── */
                  // BUG FIX #10: Was only editing notes. Now full edit form
                  // with amount, date, mode, reference & notes.
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold text-[#6B6259] uppercase tracking-wide">
                        Edit Payment #{String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Amount + Date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#9A8F82] mb-1 uppercase tracking-wide">Amount (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#9A8F82]">₹</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={editPayload.amount_paid}
                            onChange={e => setEditPayload(p => ({ ...p, amount_paid: e.target.value }))}
                            className="w-full pl-6 pr-3 py-2.5 border border-[#C8922A] rounded-lg text-[13px] font-semibold outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#9A8F82] mb-1 uppercase tracking-wide">Date</label>
                        <input
                          type="date"
                          value={editPayload.payment_date}
                          onChange={e => setEditPayload(p => ({ ...p, payment_date: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-[#EDE8DF] rounded-lg text-[13px] outline-none focus:border-[#C8922A]"
                        />
                      </div>
                    </div>

                    {/* Mode + Reference */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#9A8F82] mb-1 uppercase tracking-wide">Mode</label>
                        <select
                          value={editPayload.payment_mode}
                          onChange={e => setEditPayload(p => ({ ...p, payment_mode: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-[#EDE8DF] rounded-lg text-[13px] outline-none focus:border-[#C8922A] bg-white"
                        >
                          {PAYMENT_MODES.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#9A8F82] mb-1 uppercase tracking-wide">Reference</label>
                        <input
                          type="text"
                          value={editPayload.reference_number}
                          onChange={e => setEditPayload(p => ({ ...p, reference_number: e.target.value }))}
                          placeholder="UTR / Cheque no."
                          className="w-full px-3 py-2.5 border border-[#EDE8DF] rounded-lg text-[13px] outline-none focus:border-[#C8922A]"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#9A8F82] mb-1 uppercase tracking-wide">Notes</label>
                      <textarea
                        value={editPayload.notes}
                        onChange={e => setEditPayload(p => ({ ...p, notes: e.target.value }))}
                        rows={2}
                        placeholder="Add notes..."
                        className="w-full text-[12px] px-3 py-2 border border-[#EDE8DF] rounded-lg outline-none focus:border-[#C8922A] resize-none"
                      />
                    </div>

                    {saveError && (
                      <p className="text-[11px] text-[#EF4444] flex items-center gap-1">
                        <AlertCircle size={11} /> {saveError}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(payment.id)}
                        disabled={savingId === payment.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#C8922A] text-white text-[12px] font-semibold rounded-lg hover:bg-[#B07A20] transition-colors disabled:opacity-60"
                      >
                        {savingId === payment.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                        Save Changes
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setSaveError(""); }}
                        className="px-4 py-2 text-[12px] text-[#6B6259] hover:bg-[#EDE8DF] rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── VIEW MODE ── */
                  <>
                    <div className="flex items-start justify-between gap-4">
                      {/* Left — amount + mode */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${modeConf.color}18`, color: modeConf.color }}
                        >
                          {modeConf.icon}
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-[#1C1C1C]">
                            ₹{parseFloat(payment.amount_paid).toLocaleString("en-IN")}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                              style={{ color: modeConf.color, backgroundColor: `${modeConf.color}18` }}
                            >
                              {modeConf.label}
                            </span>
                            <span className="text-[11px] text-[#9A8F82]">
                              {formatDate(payment.payment_date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right — entry # + actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-[#9A8F82] font-mono">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>

                        {!isConfirm && (
                          <>
                            <button
                              onClick={() => startEdit(payment)}
                              className="p-1.5 rounded-lg hover:bg-[#EDE8DF] text-[#9A8F82] hover:text-[#C8922A] transition-colors"
                              title="Edit payment"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => { setConfirmDelete(payment.id); setDeleteError(""); }}
                              className="p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#9A8F82] hover:text-[#EF4444] transition-colors"
                              title="Delete payment"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}

                        {isConfirm && (
                          <div className="flex items-center gap-1.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-2 py-1">
                            <span className="text-[11px] text-[#EF4444] font-medium">Delete?</span>
                            <button
                              onClick={() => handleDelete(payment.id)}
                              disabled={isDeleting}
                              className="p-1 rounded text-[#EF4444] hover:bg-[#FECACA] transition-colors"
                              title="Confirm delete"
                            >
                              {isDeleting
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Check size={12} />
                              }
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="p-1 rounded text-[#9A8F82] hover:bg-[#EDE8DF] transition-colors"
                              title="Cancel"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reference number */}
                    {payment.reference_number && (
                      <p className="mt-2 text-[11px] text-[#9A8F82] font-mono bg-[#FAF8F5] rounded-lg px-3 py-1.5">
                        Ref: {payment.reference_number}
                      </p>
                    )}

                    {/* Notes */}
                    {payment.notes && (
                      <p className="mt-2 text-[12px] text-[#6B6259] italic">
                        "{payment.notes}"
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
