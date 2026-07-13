// ============================================================
// ⚙️ SETTINGS SERVICE
// GST, Bank, Brand, Numbering, Milestones ke sare API calls yahan.
// ============================================================

import API_BASE_URL from "@/lib/config";

const SETTINGS_URL = `${API_BASE_URL}/settings`;
const MILESTONES_URL = `${SETTINGS_URL}/milestones`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type GSTData = {
  gst_enabled?: boolean; 
  firm_gstin?: string;
  place_of_supply?: string;
  default_cgst?: number;
  default_sgst?: number;
  default_igst?: number;
  sac_code?: string;
};

export type Milestone = {
  id?: string;
  label: string;
  percentage: number;
};

export type AllSettings = {
  gst: GSTData;
  bank: Record<string, any>;
  brand: Record<string, any>;
  numbering: Record<string, any>;
  milestones: Milestone[];
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token")
      : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function handleUnauthorized(status: number) {
  if (status === 401 && typeof window !== "undefined") {
    localStorage.clear();
    window.location.href = "/login";
  }
}

// ─── GET: Sab settings ek saath lao ──────────────────────────────────────────

export async function getAllSettings(): Promise<AllSettings> {
  const endpoints = ["tax", "bank", "brand", "numbering", "milestones"];

  const responses = await Promise.all(
    endpoints.map((ep) =>
      fetch(`${SETTINGS_URL}/${ep}/`, {
        method: "GET",
        headers: getAuthHeaders(),
      })
    )
  );

  responses.forEach((res) => handleUnauthorized(res.status));

  const [gst, bank, brand, numbering, milestonesRaw] = await Promise.all(
    responses.map((res) => res.json())
  );

  return {
    gst,
    bank,
    brand,
    numbering,
    milestones: milestonesRaw.results ?? milestonesRaw,
  };
}

// ─── Generic: Koi bhi settings endpoint save karo ────────────────────────────

export async function saveSettings(endpoint: string, data: Record<string, any>): Promise<void> {
  const response = await fetch(`${SETTINGS_URL}/${endpoint}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  handleUnauthorized(response.status);
  if (!response.ok) throw new Error(`Failed to save ${endpoint} settings`);
}

// ─── Milestones: stored as separate documents, so "save" means          ────
// ─── reconciling the local list against the server (create/update/delete) ──

export async function saveMilestones(milestones: Milestone[]): Promise<Milestone[]> {
  // 1. Find out what currently exists on the server so we know what to delete.
  const existingRes = await fetch(`${MILESTONES_URL}/`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  handleUnauthorized(existingRes.status);
  if (!existingRes.ok) throw new Error("Failed to load existing milestones");
  const existingRaw = await existingRes.json();
  const existing: Milestone[] = existingRaw.results ?? existingRaw;
  const existingIds = new Set(existing.map((m) => m.id));
  const keptIds = new Set(milestones.filter((m) => m.id).map((m) => m.id));

  // 2. Delete milestones that were removed locally.
  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  await Promise.all(
    toDelete.map((id) =>
      fetch(`${MILESTONES_URL}/${id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      }).then((res) => {
        handleUnauthorized(res.status);
        if (!res.ok && res.status !== 404) {
          throw new Error(`Failed to delete milestone ${id}`);
        }
      })
    )
  );

  // 3. Create new milestones (no id yet) and update existing ones.
  const saved = await Promise.all(
    milestones.map(async (m, index) => {
      const payload = { label: m.label, percentage: m.percentage, sort_order: index };

      if (!m.id) {
        const res = await fetch(`${MILESTONES_URL}/`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        handleUnauthorized(res.status);
        if (!res.ok) throw new Error("Failed to create milestone");
        return res.json();
      }

      const res = await fetch(`${MILESTONES_URL}/${m.id}/`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      handleUnauthorized(res.status);
      if (!res.ok) throw new Error(`Failed to update milestone ${m.id}`);
      return res.json();
    })
  );

  return saved;
}