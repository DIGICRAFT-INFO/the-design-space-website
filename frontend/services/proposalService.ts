import API_BASE_URL from "@/lib/config";

const PROPOSALS_URL = `${API_BASE_URL}/proposals/`;

export type Proposal = {
  id: string;
  project: string;
  project_name?: string;

  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;

  template?: string;
  template_name?: string;

  prop_number?: string;
  title: string;
  content?: string;
  status: string;

  valid_until?: string;
  notes?: string;
  services?: string[];  // array of MasterService IDs
  created_at?: string;
  updated_at?: string;
};

export type ProposalFormData = {
  project: string;
  title: string;

  // manual content OR template
  content?: string;
  use_template?: string;

  status?: string;
  valid_until?: string;
  notes?: string;
  services?: string[];  // service IDs for showcase in PDF
};

export type ProposalTemplate = {
  id: string;
  name: string;
  description?: string;
  content: string;
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function handleUnauthorized(status: number) {
  if (status === 401 && typeof window !== "undefined") {
    ["access", "access_token", "token", "refresh", "refresh_token"].forEach((k) =>
      localStorage.removeItem(k)
    );
    window.location.href = "/login";
  }
}

async function safeJson(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function getAllProposals(): Promise<Proposal[]> {
  const res = await fetch(PROPOSALS_URL, { method: "GET", headers: authHeaders() });
  handleUnauthorized(res.status);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.detail || `Proposals fetch failed: ${res.status}`);
  return (data?.results ?? data) as Proposal[];
}

// proposalService.ts

export async function getProposalById(id: string): Promise<Proposal> {
  const res = await fetch(`${PROPOSALS_URL}${id}/`, {
    method: "GET",
    headers: authHeaders(),
  });

  handleUnauthorized(res.status);

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.detail || `Proposal fetch failed: ${res.status}`);
  }

  return data as Proposal;
}
export async function getProposalTemplates(): Promise<ProposalTemplate[]> {
  const res = await fetch(`${PROPOSALS_URL}templates/`, { method: "GET", headers: authHeaders() });
  handleUnauthorized(res.status);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.detail || `Templates fetch failed: ${res.status}`);
  return (data?.results ?? data) as ProposalTemplate[];
}

export async function createProposal(data: ProposalFormData): Promise<Proposal> {
  const res = await fetch(PROPOSALS_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  handleUnauthorized(res.status);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json as Proposal;
}

export async function updateProposal(id: string, data: Partial<ProposalFormData>): Promise<Proposal> {
  const res = await fetch(`${PROPOSALS_URL}${id}/`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  handleUnauthorized(res.status);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json as Proposal;
}

export async function updateProposalStatus(id: string, statusValue: string): Promise<Proposal> {
  const res = await fetch(`${PROPOSALS_URL}${id}/status/`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status: statusValue }),
  });
  handleUnauthorized(res.status);
  const json = await safeJson(res);
  if (!res.ok) throw new Error(json?.detail || JSON.stringify(json));
  return json as Proposal;
}

export async function deleteProposal(id: string): Promise<void> {
  const res = await fetch(`${PROPOSALS_URL}${id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  handleUnauthorized(res.status);
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

export async function downloadProposalPdf(id: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${PROPOSALS_URL}${id}/pdf/`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/pdf",
    },
    cache: "no-store",
  });
  handleUnauthorized(res.status);

  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.detail || `PDF failed: ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("pdf")) {
    const t = await res.text().catch(() => "");
    throw new Error(`Not a PDF response. content-type=${ct}. Body=${t.slice(0, 200)}`);
  }

  return res.blob();
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

// ✅ backend email send (quotation jaisa)
export async function sendProposalEmail(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/notifications/email/proposal/${id}/send/`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (res.status === 401 && typeof window !== "undefined") {
    ["access", "access_token", "token", "refresh", "refresh_token"].forEach((k) =>
      localStorage.removeItem(k)
    );
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(`Email failed (${res.status}): ${msg}`);
  }
}

// ✅ backend whatsapp send (quotation jaisa)
export async function sendProposalWhatsApp(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/notifications/whatsapp/proposal/${id}/send/`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (res.status === 401 && typeof window !== "undefined") {
    ["access", "access_token", "token", "refresh", "refresh_token"].forEach((k) =>
      localStorage.removeItem(k)
    );
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(`WhatsApp failed (${res.status}): ${msg}`);
  }
}