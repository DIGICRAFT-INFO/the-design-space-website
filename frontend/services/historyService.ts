// ============================================================
// 📋 HISTORY SERVICE
// Document History / Activity Log ke sare API calls yahan hain.
// ============================================================

import API_BASE_URL from "@/lib/config";

const HISTORY_URL = `${API_BASE_URL}/history/`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type HistoryEntry = {
  id: string;
  doc_number: string;
  type: "Invoice" | "Quotation" | "Payment" | "Client" | "Proposal" | string;
  action: string;
  client: string;
  project: string;
  user: string;
  timestamp: string;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function handleUnauthorized(status: number) {
  if (status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }
}

// ─── GET: Activity history lao ────────────────────────────────────────────────

export async function getActivityHistory(): Promise<HistoryEntry[]> {
  const response = await fetch(HISTORY_URL, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(response.status);
  if (!response.ok) throw new Error(`History fetch failed: ${response.status}`);
  const data = await response.json();
  return (data.results ?? data) as HistoryEntry[];
}
