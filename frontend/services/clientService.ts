import API_BASE_URL from "@/lib/config";

const CLIENTS_URL = `${API_BASE_URL}/clients/`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type Client = {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  site_address?: string;
  gstin?: string;
  project_count?: number;
  state?: string;
  city?: string;
  country?: string;
  lead_source?: string;
  lead_source_other?: string;
  client_type?: string;
  client_type_other?: string;
  all_projects_completed?: boolean;
  created_at?: string;
};

export type ClientFormData = {
  full_name: string;
  email: string;
  phone: string;
  billing_address: string;
  site_address: string;
  gstin: string;
  state: string;
  city: string;
  country: string;
  lead_source: string;
  lead_source_other: string;
  client_type: string;
  client_type_other: string;
};

// ─── Helper: Auth headers ─────────────────────────────────────────────────────

// Common key names jo different auth setups mein use hoti hain
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

// ─── Helper: 401 handle karo ──────────────────────────────────────────────────

function handleUnauthorized(status: number) {
  if (status === 401 && typeof window !== "undefined") {
    ["access", "access_token", "token"].forEach((k) => localStorage.removeItem(k));
    window.location.href = "/login";
  }
}

// ─── Helper: Generic authenticated fetch ──────────────────────────────────────

async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });
  handleUnauthorized(res.status);
  return res;
}

// ─── GET: Sare clients lao ────────────────────────────────────────────────────

export async function getAllClients(): Promise<Client[]> {
  const response = await authFetch(CLIENTS_URL);

  if (!response.ok) {
    throw new Error(`Clients fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.results ?? data) as Client[];
}

// ─── GET: Single client lao ───────────────────────────────────────────────────

export async function getClientById(id: string): Promise<Client> {
  const response = await authFetch(`${CLIENTS_URL}${id}/`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Client #${id} fetch failed: ${response.status}`);
  }

  return (await response.json()) as Client;
}

// ─── POST: Naya client banao ──────────────────────────────────────────────────

export async function createClient(data: ClientFormData): Promise<Client> {
  const response = await authFetch(CLIENTS_URL, {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(JSON.stringify(err));
  }

  return (await response.json()) as Client;
}

// ─── PUT: Client update karo ──────────────────────────────────────────────────

export async function updateClient(
  id: string,
  data: ClientFormData
): Promise<Client> {
  const response = await authFetch(`${CLIENTS_URL}${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(JSON.stringify(err));
  }

  return (await response.json()) as Client;
}

// ─── DELETE: Client delete karo ───────────────────────────────────────────────

export async function deleteClient(id: string): Promise<void> {
  const response = await authFetch(`${CLIENTS_URL}${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export async function getProjectsByClient(clientId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}/projects/`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  handleUnauthorized(response.status);

  if (!response.ok) throw new Error(`Projects fetch failed: ${response.status}`);
  const data = await response.json();
  return (data.results ?? data) as any[];
}

  

export async function createProject(
  clientId: string,
  data: Record<string, any>
): Promise<any> {
  const res = await authFetch(`${CLIENTS_URL}${clientId}/projects/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw result;
  return result;
}

export async function updateProject(
  clientId: string,
  projectId: string,
  data: Record<string, any>
): Promise<any> {
  const res = await authFetch(
    `${CLIENTS_URL}${clientId}/projects/${projectId}/`,
    { method: "PUT", body: JSON.stringify(data) }
  );
  const result = await res.json();
  if (!res.ok) throw result;
  return result;
}

export async function deleteProject(
  clientId: string,
  projectId: string
): Promise<void> {
  const res = await authFetch(
    `${CLIENTS_URL}${clientId}/projects/${projectId}/`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(`Delete project failed: ${res.status}`);
}

// ─── Proposals ────────────────────────────────────────────────────────────────

export async function getProposalsByClient(clientId: string): Promise<any[]> {
  const res = await authFetch(
    `${API_BASE_URL}/proposals/?client=${clientId}`
  );
  const data = await res.json();
  return data.results ?? data;
}

export async function getProposalTemplates(): Promise<any[]> {
  const res = await authFetch(`${API_BASE_URL}/proposals/templates/`);
  const data = await res.json();
  return data.results ?? data;
}

export async function createProposalTemplate(
  data: Record<string, any>
): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/proposals/templates/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw result;
  return result;
}

export async function updateProposalTemplate(
  id: string,
  data: Record<string, any>
): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/proposals/templates/${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw result;
  return result;
}

export async function deleteProposalTemplate(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/proposals/templates/${id}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete template failed: ${res.status}`);
}

export async function createProposal(
  data: Record<string, any>
): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/proposals/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw result;
  return result;
}

// ─── Quotations ───────────────────────────────────────────────────────────────

export async function getQuotationsByClient(clientId: string): Promise<any[]> {
  
  const res = await authFetch(
    `${API_BASE_URL}/quotations/?client=${clientId}`
  );
  const data = await res.json();
  return data.results ?? data;
}

export async function getQuotationById(id: string): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/quotations/${id}/`);
  if (!res.ok) throw new Error(`Quotation fetch failed: ${res.status}`);
  return res.json();
}

export async function createQuotation(
  data: Record<string, any>
): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/quotations/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw result;
  return result;
}

export async function deleteQuotation(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/quotations/${id}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete quotation failed: ${res.status}`);
}

export async function sendQuotation(id: string): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/quotations/${id}/send/`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Send failed");
  return res.json();
}

export async function approveQuotation(id: string): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/quotations/${id}/approve/`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Approve failed");
  return res.json();
}

export async function reviseQuotation(id: string): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/quotations/${id}/revise/`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Revise failed");
  return res.json();
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function getInvoicesByClient(clientId: string): Promise<any[]> {
  const res = await authFetch(
    `${API_BASE_URL}/invoices/?client=${clientId}`
  );
  const data = await res.json();
  return data.results ?? data;
}

export async function getInvoiceById(id: string): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/invoices/${id}/`);
  if (!res.ok) throw new Error(`Invoice fetch failed: ${res.status}`);
  return res.json();
}

export async function generateInvoice(
  data: Record<string, any>
): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/invoices/generate/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw result;
  return result;
}

export async function sendInvoice(id: string): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/invoices/${id}/send/`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Send invoice failed");
  return res.json();
}

export async function markInvoicePaid(id: string): Promise<any> {
  const res = await authFetch(`${API_BASE_URL}/invoices/${id}/mark_paid/`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Mark paid failed");
  return res.json();
}

export async function deleteInvoice(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/invoices/${id}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete invoice failed: ${res.status}`);
}