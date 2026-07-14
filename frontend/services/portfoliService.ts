import API_BASE_URL from "@/lib/config";

const PORTFOLIO_URL = `${API_BASE_URL}/portfolio/`;
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

// ─── Helper: resolve a relative /uploads path into a full URL ────────────────

export function resolveImageUrl(fileUrl: string): string {
  if (!fileUrl) return "";
  return fileUrl.startsWith("http") ? fileUrl : `${BACKEND_ORIGIN}${fileUrl}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type PortfolioCategory =
  | "living_room"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "office"
  | "full_home"
  | "other";

export type PortfolioStatus = "draft" | "published";

export type PortfolioImage = {
  id: string;
  file_url: string;
  caption: string;
  file_size: number;
  original_filename: string;
  sort_order: number;
  uploaded_at: string;
};

export type PortfolioDocument = {
  id: string;
  file_url: string;
  title: string;
  file_size: number;
  original_filename: string;
  uploaded_at: string;
};

export type Portfolio = {
  id: string;
  project?: string | { id: string; name: string; client?: { id: string; full_name: string; email?: string; phone?: string } };
  title: string;
  category: PortfolioCategory;
  description: string;
  status: PortfolioStatus;
  images: PortfolioImage[];
  documents: PortfolioDocument[];
  created_at?: string;
  updated_at?: string;
  // ── Public website fields (Portfolio page on thedesignspace.in) ──────────
  project_type?: "residential" | "commercial" | "renovation" | "other";
  project_type_label?: string;
  custom_categories?: string[];
  is_featured?: boolean;
  sort_order?: number;
  metrics?: { location: string; area_sqft: number | null; scope_duration: string };
};

export type CreatePortfolioPayload = {
  title: string;
  description?: string;
  category?: PortfolioCategory;
  project?: string;
  status?: PortfolioStatus;
  project_type?: "residential" | "commercial" | "renovation" | "other";
  custom_categories?: string[];
  is_featured?: boolean;
  sort_order?: number;
  metrics?: { location: string; area_sqft: number | null; scope_duration: string };
};

// ─── Token helper — matches invoiceService exactly ───────────────────────────

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

function getAuthHeadersNoJSON(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(status: number) {
  if (status === 401 && typeof window !== "undefined") {
    ["access", "access_token", "token"].forEach((k) => localStorage.removeItem(k));
    window.location.href = "/login";
  }
}

// ─── GET: All portfolios ──────────────────────────────────────────────────────

export async function getAllPortfolios(params?: {
  status?: string;
  category?: string;
  project?: string;
}): Promise<Portfolio[]> {
  const url = new URL(PORTFOLIO_URL);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.category) url.searchParams.set("category", params.category);
  if (params?.project) url.searchParams.set("project", params.project);

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Portfolios fetch failed: ${res.status}`);
  return res.json() as Promise<Portfolio[]>;
}

// ─── GET: Single portfolio ────────────────────────────────────────────────────

export async function getPortfolioById(id: string): Promise<Portfolio> {
  const res = await fetch(`${PORTFOLIO_URL}${id}/`, { headers: getAuthHeaders() });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Portfolio fetch failed: ${res.status}`);
  return res.json() as Promise<Portfolio>;
}

// ─── POST: Create portfolio ────────────────────────────────────────────────────

export async function createPortfolio(payload: CreatePortfolioPayload): Promise<Portfolio> {
  const res = await fetch(PORTFOLIO_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json() as Promise<Portfolio>;
}

// ─── PUT: Update portfolio ─────────────────────────────────────────────────────

export async function updatePortfolio(id: string, data: Partial<CreatePortfolioPayload>): Promise<Portfolio> {
  const res = await fetch(`${PORTFOLIO_URL}${id}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json()
    .catch(() => ({}));
    throw err;
  }
  return res.json() as Promise<Portfolio>;
}

// ─── DELETE: Portfolio delete ───────────────────────────────────────────────────

export async function deletePortfolio(id: string): Promise<void> {
  const res = await fetch(`${PORTFOLIO_URL}${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

// ─── POST: Upload images (multipart) ───────────────────────────────────────────

export async function uploadPortfolioImages(
  id: string,
  files: File[],
  captions?: string[],
): Promise<Portfolio> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  (captions || []).forEach((c) => formData.append("captions", c));

  const res = await fetch(`${PORTFOLIO_URL}${id}/images/`, {
    method: "POST",
    headers: getAuthHeadersNoJSON(), // don't set Content-Type — browser sets multipart boundary
    body: formData,
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json() as Promise<Portfolio>;
}

// ─── DELETE: Remove a single image ─────────────────────────────────────────────

export async function deletePortfolioImage(id: string, imageId: string): Promise<void> {
  const res = await fetch(`${PORTFOLIO_URL}${id}/images/${imageId}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Image delete failed: ${res.status}`);
}

// ─── POST: Upload PDF documents (multipart) ────────────────────────────────────

export async function uploadPortfolioDocuments(
  id: string,
  files: File[],
  titles?: string[],
): Promise<Portfolio> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  (titles || []).forEach((t) => formData.append("titles", t));

  const res = await fetch(`${PORTFOLIO_URL}${id}/documents/`, {
    method: "POST",
    headers: getAuthHeadersNoJSON(),
    body: formData,
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json() as Promise<Portfolio>;
}

// ─── DELETE: Remove a single document ──────────────────────────────────────────

export async function deletePortfolioDocument(id: string, docId: string): Promise<void> {
  const res = await fetch(`${PORTFOLIO_URL}${id}/documents/${docId}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Document delete failed: ${res.status}`);
}

// ─── GET: Download PDF ──────────────────────────────────────────────────────────

export async function downloadPortfolioPDF(id: string, title: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${PORTFOLIO_URL}${id}/pdf/`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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
  a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── POST: Send to client via email or WhatsApp ───────────────────────────────

export async function sendPortfolio(
  id: string,
  channel: "email" | "whatsapp",
  recipient?: string,
): Promise<{ message: string }> {
  const body: Record<string, string> = { channel };
  if (recipient) {
    if (channel === "email") body.recipient_email = recipient;
    else body.recipient_phone = recipient;
  }

  const res = await fetch(`${PORTFOLIO_URL}${id}/send/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}