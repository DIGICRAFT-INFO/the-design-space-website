import API_BASE_URL from "@/lib/config";

const QUOTATIONS_URL = `${API_BASE_URL}/quotations/`;

export function getServiceImageUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('http')) return fileUrl;
  const origin = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
  return `${origin}/${fileUrl.replace(/^\//, '')}`;
}

export type QuotationItem = {
  id?: string;
  description: string;
  category: string;
  quantity: string;
  unit: string;
  rate: string;
  amount?: string;
  sort_order: number;
};

export type Quotation = {
  id: string;
  quote_number: string;
  version: number;
  client_name: string;
  project_name: string;
  project: string;
  grand_total: string;
  subtotal: string;
  discount_type: string;
  discount_value: string;
  discount_amount: string;
  taxable_amount: string;
  cgst_rate: string; sgst_rate: string; igst_rate: string;
  cgst_amount: string; sgst_amount: string; igst_amount: string;
  total_tax: string;
  valid_until: string;
  notes: string;
  status: string;
  items: QuotationItem[];
  created_at?: string;
  [key: string]: any;
};

// Supports "access", "access_token", "token" key names
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access") || localStorage.getItem("access_token") || localStorage.getItem("token");
}

function getAuthHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function handleUnauthorized(status: number) {
  if (status === 401 && typeof window !== "undefined") {
    ["access","access_token","token"].forEach(k => localStorage.removeItem(k));
    window.location.href = "/login";
  }
}

export async function getAllQuotations(): Promise<Quotation[]> {
  const res = await fetch(QUOTATIONS_URL, { headers: getAuthHeaders() });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.results ?? data) as Quotation[];
}

export async function getQuotationById(id: string): Promise<Quotation> {
  const res = await fetch(`${QUOTATIONS_URL}${id}/`, { headers: getAuthHeaders() });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json() as Promise<Quotation>;
}

export async function createQuotation(data: Record<string, any>): Promise<Quotation> {
  // Only send the fields the backend needs to perform the calculation
  const processedData: Record<string, any> = {
    project: data.project,
    discount_type: data.discount_type,
    discount_value: parseFloat(data.discount_value) || 0,
    cgst_rate: parseFloat(data.cgst_rate) || 0,
    sgst_rate: parseFloat(data.sgst_rate) || 0,
    igst_rate: parseFloat(data.igst_rate) || 0,
    notes: data.notes || "",
    items: data.items.map((item: any) => ({
      description: item.description,
      category: item.category || "",
      quantity: parseFloat(item.quantity) || 0,
      unit: item.unit || "",
      rate: parseFloat(item.rate) || 0,
      sort_order: parseInt(item.sort_order) || 1
    }))
  };

  // Only include valid_until if it has a value
  if (data.valid_until) {
    processedData.valid_until = data.valid_until;
  }

  const res = await fetch(QUOTATIONS_URL, { 
    method: "POST", 
    headers: getAuthHeaders(), 
    body: JSON.stringify(processedData) 
  });
  
  if (!res.ok) {
    const errorDetails = await res.json();
    console.error("Backend Validation Error:", errorDetails);
    throw new Error(errorDetails.error || "Failed to create quotation");
  }
  return res.json();
}

export async function updateQuotation(id: string, data: Record<string, any>): Promise<Quotation> {
  const processedData: Record<string, any> = {
    project: data.project,
    discount_type: data.discount_type,
    discount_value: parseFloat(data.discount_value) || 0,
    cgst_rate: parseFloat(data.cgst_rate) || 0,
    sgst_rate: parseFloat(data.sgst_rate) || 0,
    igst_rate: parseFloat(data.igst_rate) || 0,
    notes: data.notes || "",
    items: (data.items || [])
      .filter((item: any) => item.description?.trim() && parseFloat(item.rate) > 0)
      .map((item: any, n: number) => ({
        description: item.description.trim(),
        category: item.category || "",
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || "",
        rate: parseFloat(item.rate),
        sort_order: n + 1,
      })),
  };

  if (data.valid_until) {
    processedData.valid_until = data.valid_until;
  } else {
    processedData.valid_until = null;
  }

  const res = await fetch(`${QUOTATIONS_URL}${id}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(processedData),
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const e = await res.json();
    console.error("Update Quotation Error:", e);
    throw new Error(e.error || e.detail || "Failed to update quotation");
  }
  return res.json() as Promise<Quotation>;
}

export async function deleteQuotation(id: string): Promise<void> {
  const res = await fetch(`${QUOTATIONS_URL}${id}/`, { method: "DELETE", headers: getAuthHeaders() });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

export async function approveQuotation(id: string): Promise<Quotation> {
  const res = await fetch(`${QUOTATIONS_URL}${id}/approve/`, { method: "POST", headers: getAuthHeaders() });
  handleUnauthorized(res.status);
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Approval failed"); }
  return res.json() as Promise<Quotation>;
}

export async function reviseQuotation(id: string): Promise<Quotation> {
  const res = await fetch(`${QUOTATIONS_URL}${id}/revise/`, { method: "POST", headers: getAuthHeaders() });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error("Revision failed");
  return res.json() as Promise<Quotation>;
}

export async function getQuotationVersions(id: string): Promise<Quotation[]> {
  const res = await fetch(`${QUOTATIONS_URL}${id}/versions/`, { headers: getAuthHeaders() });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error("Version fetch failed");
  const data = await res.json();
  return (data.results ?? data) as Quotation[];
}

export type QuotationHistoryChange = {
  field: string;
  old_value: any;
  new_value: any;
};

export type QuotationHistoryEntry = {
  id: string;
  quotation: string;
  version_snapshot: number;
  changes: QuotationHistoryChange[];
  snapshot: Record<string, any>;
  changed_by_name: string;
  created_at: string;
};

export async function getQuotationHistory(id: string): Promise<QuotationHistoryEntry[]> {
  const res = await fetch(`${QUOTATIONS_URL}${id}/history/`, { headers: getAuthHeaders() });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error("History fetch failed");
  const data = await res.json();
  return (data.results ?? data) as QuotationHistoryEntry[];
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export async function downloadQuotationPdf(id: string): Promise<Blob> {
  const url = `${API_BASE_URL}/quotations/${id}/pdf/`;
  console.log("Fetching PDF from:", url); // See exactly what URL is being hit
  
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders({ Accept: "application/pdf" }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("PDF Download Status:", res.status);
    console.error("PDF Download Error Body:", errorText);
    throw new Error(`Server responded with ${res.status}`);
  }

  return await res.blob();
}
// quotationService.ts
export async function sendQuotationEmail(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/notifications/email/quotation/${id}/send/`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error("Email failed");
}

export async function sendQuotationWhatsApp(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/notifications/whatsapp/quotation/${id}/send/`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error("WhatsApp failed");
}
// ─── POST: Copy quotation (creates C1/C2/... clone) ──────────────────────────
export type CopyQuotationPayload = {
  valid_until?: string;
  notes?: string;
  items?: Array<{
    description: string;
    category: string;
    quantity: string;
    unit: string;
    rate: string;
  }>;
};

export async function copyQuotation(id: string, payload: CopyQuotationPayload = {}): Promise<Quotation> {
  const res = await fetch(`${QUOTATIONS_URL}${id}/copy/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json() as Promise<Quotation>;
}