"use client";

import React, { useState, useEffect } from "react";
import {
  X, CreditCard, Calendar, Hash, FileText,
  CheckCircle, Loader2, ChevronDown
} from "lucide-react";
import API_BASE_URL from "@/lib/config";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  project_name: string;
  grand_total: string;
  amount_paid: string;
  balance_due: string;
  status: string;
}

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedInvoice?: Invoice | null;
}

const PAYMENT_MODES = [
  { value: "bank_transfer", label: "Bank Transfer / NEFT / RTGS" },
  { value: "upi",           label: "UPI" },
  { value: "cheque",        label: "Cheque" },
  { value: "cash",          label: "Cash" },
  { value: "neft",          label: "NEFT / RTGS" },
  { value: "other",         label: "Other" },
];

const REF_PLACEHOLDER: Record<string, string> = {
  bank_transfer: "UTR number",
  upi:           "UPI transaction ID",
  cheque:        "Cheque number",
  neft:          "UTR / Reference number",
  cash:          "Receipt number (optional)",
  other:         "Reference number",
};

// ── Token helper ──────────────────────────────────────────────────────────────
// BUG FIX #3: Unified token helper — checks all storage keys to avoid
// silent auth failures when different parts of the app use different keys.
function getToken(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

// ── API helpers ───────────────────────────────────────────────────────────────
// BUG FIX #4: Was using hardcoded relative path "/api/v1/invoices/" which
// requires a Next.js proxy config that doesn't exist in next.config.ts.
// Fixed to use API_BASE_URL from @/lib/config (points to http://localhost:5000/api/v1).
//
// BUG FIX #5: Invoice status filter used "partially_paid" but the backend
// enum is "partial". Fixed all three status values to match backend enums.
async function fetchAllInvoices(): Promise<Invoice[]> {
  const res = await fetch(
    `${API_BASE_URL}/invoices/?status=issued&status=partial&status=overdue`,
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );
  if (!res.ok) throw new Error(`Failed to fetch invoices: ${res.status}`);
  const data = await res.json();
  return (data.results ?? data) as Invoice[];
}

// BUG FIX #6: Was using hardcoded "/api/v1/payments/" without proxy.
async function recordPayment(payload: object): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/payments/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let err: unknown;
    try { err = await res.json(); } catch { err = { error: `HTTP ${res.status}` }; }
    throw new Error(JSON.stringify(err));
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecordPaymentModal({
  open,
  onClose,
  onSuccess,
  preselectedInvoice,
}: RecordPaymentModalProps) {
  const [invoices, setInvoices]     = useState<Invoice[]>([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState("");

  // form state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [amount, setAmount]       = useState("");
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode]           = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes]         = useState("");
  const [showDropdown, setShowDropdown]   = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");

  // Load unpaid invoices when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingInv(true);
    fetchAllInvoices()
      .then(setInvoices)
      .catch((err) => {
        console.error("Invoice fetch failed:", err);
        setInvoices([]);
      })
      .finally(() => setLoadingInv(false));
  }, [open]);

  // Preselect invoice when opened from a table row
  useEffect(() => {
    if (preselectedInvoice && open) {
      setSelectedInvoice(preselectedInvoice);
      const bal = parseFloat(preselectedInvoice.balance_due || "0");
      setAmount(bal > 0 ? bal.toFixed(2) : "");
    }
  }, [preselectedInvoice, open]);

  // Reset all form state on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSelectedInvoice(null);
        setAmount("");
        setDate(new Date().toISOString().slice(0, 10));
        setMode("bank_transfer");
        setReference("");
        setNotes("");
        setError("");
        setSuccess(false);
        setInvoiceSearch("");
        setShowDropdown(false);
      }, 300);
    }
  }, [open]);

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    (inv.client_name ?? "").toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  const balanceDue = selectedInvoice
    ? parseFloat(selectedInvoice.balance_due || selectedInvoice.grand_total || "0")
    : 0;

  const amountNum  = parseFloat(amount || "0");
  const isOverpaying = amountNum > balanceDue && balanceDue > 0;

  async function handleSubmit() {
    setError("");

    // Validations
    if (!selectedInvoice) { setError("Please select an invoice."); return; }
    if (!amount || amountNum <= 0) { setError("Enter a valid amount greater than 0."); return; }
    if (!date) { setError("Please select a payment date."); return; }

    setSubmitting(true);
    try {
      await recordPayment({
        invoice:          selectedInvoice.id,
        amount_paid:      amountNum,          // send as number, not string
        payment_date:     date,
        payment_mode:     mode,
        reference_number: reference.trim(),
        notes:            notes.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to record payment";
      try {
        const parsed = JSON.parse(msg);
        // Handle both { error: "..." } and { field: ["..."] } shapes
        const text = typeof parsed === "object"
          ? Object.values(parsed).flat().join(" ")
          : String(parsed);
        setError(text);
      } catch {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE8DF] bg-[#FAF8F5]">
          <div>
            <h2 className="text-[16px] font-bold text-[#1C1C1C]">Record Payment</h2>
            <p className="text-[12px] text-[#9A8F82] mt-0.5">Log a client payment against an invoice</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#EDE8DF] text-[#9A8F82] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-16 h-16 rounded-full bg-[#ECFDF5] flex items-center justify-center">
              <CheckCircle size={32} className="text-[#10B981]" />
            </div>
            <p className="text-[15px] font-semibold text-[#1C1C1C]">Payment Recorded!</p>
            <p className="text-[13px] text-[#9A8F82]">Invoice status has been updated automatically.</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">

            {/* Invoice Selector */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase tracking-wide">
                Invoice *
              </label>
              {preselectedInvoice ? (
                // Locked — opened from a row
                <div className="flex items-center gap-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#FDF3E3] text-[#C8922A] text-[11px] font-bold flex items-center justify-center">
                    {(selectedInvoice?.client_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1C1C1C]">
                      INV-{selectedInvoice?.invoice_number}
                    </p>
                    <p className="text-[11px] text-[#9A8F82] truncate">
                      {selectedInvoice?.client_name} · {selectedInvoice?.project_name}
                    </p>
                  </div>
                  <p className="text-[13px] font-bold text-[#EF4444] whitespace-nowrap">
                    ₹{parseFloat(selectedInvoice?.balance_due || "0").toLocaleString("en-IN")} due
                  </p>
                </div>
              ) : (
                // Dropdown selector
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDropdown(v => !v)}
                    className="w-full flex items-center justify-between bg-white border border-[#EDE8DF] rounded-xl px-4 py-3 text-left hover:border-[#C8922A] transition-colors"
                  >
                    {selectedInvoice ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#FDF3E3] text-[#C8922A] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {(selectedInvoice.client_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[13px] font-medium text-[#1C1C1C]">INV-{selectedInvoice.invoice_number}</span>
                          <span className="text-[11px] text-[#9A8F82] ml-2">{selectedInvoice.client_name}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[13px] text-[#9A8F82]">
                        {loadingInv ? "Loading invoices..." : "Select invoice..."}
                      </span>
                    )}
                    <ChevronDown size={14} className="text-[#9A8F82] flex-shrink-0" />
                  </button>

                  {showDropdown && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#EDE8DF] rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-[#EDE8DF]">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search invoice or client..."
                          value={invoiceSearch}
                          onChange={e => setInvoiceSearch(e.target.value)}
                          className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#EDE8DF] outline-none focus:border-[#C8922A]"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {loadingInv ? (
                          <div className="flex items-center justify-center gap-2 py-6">
                            <Loader2 size={16} className="animate-spin text-[#C8922A]" />
                            <span className="text-[12px] text-[#9A8F82]">Loading invoices...</span>
                          </div>
                        ) : filteredInvoices.length === 0 ? (
                          <p className="text-[12px] text-[#9A8F82] text-center py-4">
                            No unpaid invoices found
                          </p>
                        ) : (
                          filteredInvoices.map(inv => (
                            <button
                              key={inv.id}
                              type="button"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                const bal = parseFloat(inv.balance_due || inv.grand_total || "0");
                                setAmount(bal > 0 ? bal.toFixed(2) : "");
                                setShowDropdown(false);
                                setInvoiceSearch("");
                              }}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#FAF8F5] transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-[#FDF3E3] text-[#C8922A] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                  {(inv.client_name || "?").charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[12px] font-semibold text-[#1C1C1C]">INV-{inv.invoice_number}</p>
                                  <p className="text-[11px] text-[#9A8F82] truncate">{inv.client_name} · {inv.project_name}</p>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-[#EF4444] flex-shrink-0 ml-2">
                                ₹{parseFloat(inv.balance_due || inv.grand_total).toLocaleString("en-IN")} due
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Balance summary if invoice selected */}
            {selectedInvoice && (
              <div className="bg-[#FDF3E3] border border-[#F0D9B0] rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] text-[#C8922A] font-semibold uppercase tracking-wide">Total</p>
                    <p className="text-[13px] font-bold text-[#1C1C1C]">
                      ₹{parseFloat(selectedInvoice.grand_total).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#10B981] font-semibold uppercase tracking-wide">Paid</p>
                    <p className="text-[13px] font-bold text-[#10B981]">
                      ₹{parseFloat(selectedInvoice.amount_paid || "0").toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#EF4444] font-semibold uppercase tracking-wide">Balance</p>
                    <p className="text-[13px] font-bold text-[#EF4444]">
                      ₹{balanceDue.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase tracking-wide">
                Amount Received (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-[#9A8F82]">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-7 pr-4 py-3 border rounded-xl text-[14px] font-semibold outline-none transition-colors ${
                    isOverpaying
                      ? "border-[#F59E0B] bg-[#FFFBEB]"
                      : "border-[#EDE8DF] focus:border-[#C8922A]"
                  }`}
                />
              </div>
              {isOverpaying && (
                <p className="text-[11px] text-[#F59E0B] mt-1">
                  ⚠ Amount exceeds balance due of ₹{balanceDue.toLocaleString("en-IN")}
                </p>
              )}
            </div>

            {/* Date + Mode row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase tracking-wide">
                  <Calendar size={11} className="inline mr-1" />Payment Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-3 border border-[#EDE8DF] rounded-xl text-[13px] outline-none focus:border-[#C8922A] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase tracking-wide">
                  <CreditCard size={11} className="inline mr-1" />Mode *
                </label>
                <select
                  value={mode}
                  onChange={e => setMode(e.target.value)}
                  className="w-full px-3 py-3 border border-[#EDE8DF] rounded-xl text-[13px] outline-none focus:border-[#C8922A] transition-colors bg-white"
                >
                  {PAYMENT_MODES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reference */}
            {mode !== "cash" && (
              <div>
                <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase tracking-wide">
                  <Hash size={11} className="inline mr-1" />Reference Number
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder={REF_PLACEHOLDER[mode] || "Reference number"}
                  className="w-full px-4 py-3 border border-[#EDE8DF] rounded-xl text-[13px] outline-none focus:border-[#C8922A] transition-colors"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase tracking-wide">
                <FileText size={11} className="inline mr-1" />Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Advance payment received, balance to be cleared next week"
                rows={2}
                className="w-full px-4 py-3 border border-[#EDE8DF] rounded-xl text-[13px] outline-none focus:border-[#C8922A] transition-colors resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 text-[12px] text-[#EF4444]">
                ⚠ {error}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#EDE8DF] bg-[#FAF8F5]">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-[13px] font-medium text-[#6B6259] hover:bg-[#EDE8DF] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#C8922A] hover:bg-[#B07A20] disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-colors"
            >
              {submitting ? (
                <><Loader2 size={14} className="animate-spin" /> Recording...</>
              ) : (
                "Record Payment"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
