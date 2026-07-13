import API_BASE_URL from "@/lib/config";

const INVOICES_URL = `${API_BASE_URL}/invoices/`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "issued" | "partial" | "paid" | "overdue" | "cancelled";
export type InvoiceType   = "full" | "advance" | "milestone" | "final";

export type InvoiceItem = {
  id?: string;
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  amount?: string;
};

export type Invoice = {
  id: string;
  project: string;
  project_name: string;
  client_name: string;
  client_id?: string;
  quotation?: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  milestone_label: string;
  milestone_percentage: string;
  subtotal: string;
  taxable_amount: string;
  cgst_rate?: string;
  sgst_rate?: string;
  igst_rate?: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  total_tax: string;
  grand_total: string;
  amount_paid: string;
  balance_due: string;
  notes: string;
  items?: InvoiceItem[];
  created_at?: string;
  updated_at?: string;
};

// Generate endpoint payload
export type GenerateInvoicePayload = {
  quotation_id: string;
  invoice_type: InvoiceType;
  milestone_label?: string;
  milestone_percentage: number;
  invoice_date: string;
  due_days: number;
  notes?: string;
};

// ─── Token helper — matches quotation/clientService exactly ──────────────────

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

function handleUnauthorized(status: number) {
  if (status === 401 && typeof window !== "undefined") {
    ["access", "access_token", "token"].forEach((k) => localStorage.removeItem(k));
    window.location.href = "/login";
  }
}

// ─── GET: All invoices ────────────────────────────────────────────────────────

export async function getAllInvoices(params?: {
  status?: string;
  client?: string;
  search?: string;
}): Promise<Invoice[]> {
  const url = new URL(INVOICES_URL);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.client) url.searchParams.set("client", params.client);
  if (params?.search) url.searchParams.set("search", params.search);

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Invoices fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.results ?? data) as Invoice[];
}

// ─── GET: Single invoice ──────────────────────────────────────────────────────

export async function getInvoiceById(id: string): Promise<Invoice> {
  const res = await fetch(`${INVOICES_URL}${id}/`, { headers: getAuthHeaders() });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Invoice fetch failed: ${res.status}`);
  return res.json() as Promise<Invoice>;
}

// ─── POST: Generate invoice from quotation (main endpoint) ───────────────────

export async function generateInvoice(payload: GenerateInvoicePayload): Promise<Invoice> {
  const res = await fetch(`${API_BASE_URL}/invoices/generate/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json() as Promise<Invoice>;
}

// ─── PATCH: Update invoice fields ─────────────────────────────────────────────

export async function updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
  const res = await fetch(`${INVOICES_URL}${id}/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json() as Promise<Invoice>;
}

// ─── DELETE: Invoice delete ───────────────────────────────────────────────────

export async function deleteInvoice(id: string): Promise<void> {
  const res = await fetch(`${INVOICES_URL}${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

// ─── POST: Mark as sent ───────────────────────────────────────────────────────

export async function sendInvoice(id: string): Promise<Invoice> {
  // BUG FIX: Use dedicated POST /:pk/send/ endpoint which validates draft→issued transition
  const res = await fetch(`${INVOICES_URL}${id}/send/`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json() as Promise<Invoice>;
}

// ─── POST: Mark as paid ───────────────────────────────────────────────────────

export async function markInvoicePaid(id: string): Promise<Invoice> {
  // BUG FIX: Use dedicated POST /:pk/mark_paid/ endpoint
  const res = await fetch(`${INVOICES_URL}${id}/mark_paid/`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json() as Promise<Invoice>;
}

// ─── GET: Download PDF (auth header required) ────────────────────────────────

export async function downloadInvoicePDF(id: string, invoiceNumber: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/invoices/${id}/pdf/`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  if (res.status === 401) {
    handleUnauthorized(401);
    return;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PDF failed (${res.status}): ${text.slice(0, 120)}`);
  }

  const blob = await res.blob();
  if (blob.size === 0) throw new Error("Empty PDF received");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Client-side CSV export ───────────────────────────────────────────────────

export function downloadInvoiceCSV(inv: Invoice): void {
  const rows = [
    ["INVOICE"],
    [],
    ["Invoice Number", inv.invoice_number],
    ["Invoice Type", inv.invoice_type],
    ["Client", inv.client_name],
    ["Project", inv.project_name],
    ["Invoice Date", inv.invoice_date],
    ["Due Date", inv.due_date],
    ["Status", inv.status],
    inv.milestone_label ? ["Milestone", inv.milestone_label, `${inv.milestone_percentage}%`] : [],
    [],
    ["LINE ITEMS"],
    ["#", "Description", "Qty", "Unit", "Rate (Rs)", "Amount (Rs)"],
    ...(inv.items || []).map((it, i) => [i + 1, it.description, it.quantity, it.unit, it.rate, it.amount]),
    [],
    ["Subtotal", "", "", "", "", inv.subtotal],
    ...(parseFloat(inv.cgst_amount || "0") > 0 ? [["CGST", "", "", "", "", inv.cgst_amount]] : []),
    ...(parseFloat(inv.sgst_amount || "0") > 0 ? [["SGST", "", "", "", "", inv.sgst_amount]] : []),
    ...(parseFloat(inv.igst_amount || "0") > 0 ? [["IGST", "", "", "", "", inv.igst_amount]] : []),
    ["Total Tax", "", "", "", "", inv.total_tax],
    ["Grand Total", "", "", "", "", inv.grand_total],
    ["Amount Paid", "", "", "", "", inv.amount_paid],
    ["Balance Due", "", "", "", "", inv.balance_due],
  ].filter((r) => r.length > 0);

  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.invoice_number}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── POST: Send email ─────────────────────────────────────────────────────────

export async function sendInvoiceEmail(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/notifications/email/invoice/${id}/send/`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error("Email failed");
}

// ─── POST: Send WhatsApp ──────────────────────────────────────────────────────

export async function sendInvoiceWhatsApp(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/notifications/whatsapp/invoice/${id}/send/`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error("WhatsApp failed");
}

export async function sendReminder(invoiceId: string, channel: "whatsapp" | "email"): Promise<void> {
  const endpoint =
    channel === "whatsapp"
      ? `${API_BASE_URL}/notifications/whatsapp/reminder/${invoiceId}/`
      : `${API_BASE_URL}/notifications/email/reminder/${invoiceId}/`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Reminder failed");
}
// ─── POST: Copy invoice (creates C1/C2/... clone) ─────────────────────────────
export type CopyInvoicePayload = {
  invoice_date?: string;
  due_date?: string;
  notes?: string;
  items?: Array<{
    description: string;
    category: string;
    quantity: string;
    unit: string;
    rate: string;
  }>;
};

export async function copyInvoice(id: string, payload: CopyInvoicePayload = {}): Promise<Invoice> {
  const res = await fetch(`${INVOICES_URL}${id}/copy/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json() as Promise<Invoice>;
}

// ─── PATCH: Update invoice + replace all items ────────────────────────────────
export type FullInvoiceUpdatePayload = {
  invoice_type?: string;
  invoice_date?: string;
  due_date?: string;
  notes?: string;
  items?: Array<{
    id?: string;
    description: string;
    category: string;
    quantity: string;
    unit: string;
    rate: string;
    amount?: string;
  }>;
};

export async function updateInvoiceFull(id: string, data: FullInvoiceUpdatePayload): Promise<Invoice> {
  const res = await fetch(`${INVOICES_URL}${id}/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json() as Promise<Invoice>;
}
