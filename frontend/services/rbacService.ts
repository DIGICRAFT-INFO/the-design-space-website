import API_BASE_URL from "@/lib/config";

const RBAC_URL = `${API_BASE_URL}/rbac`;

// ─── All page keys ────────────────────────────────────────────────────────────
export const ALL_PAGE_KEYS = [
  "dashboard",
  "clients",
  "services",
  "projects",
  "proposals",
  "quotations",
  "invoices",
  "portfolio",
  "payments",
  "pending_users",
  "enquiries",
  "history",
  "notifications",
  "web_cms_overview",
  "web_cms_home",
  "web_cms_about",
  "web_cms_services",
  "web_cms_products",
  "web_cms_portfolio",
  "web_cms_blog",
  "web_cms_careers",
  "web_cms_leads",
  "web_cms_seo",
  "web_cms_media",
  "web_cms_legal",
  "web_cms_settings",
] as const;

export type PageKey = (typeof ALL_PAGE_KEYS)[number];

export const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: "Dashboard",
  clients: "Clients",
  services: "Services",
  projects: "Projects",
  proposals: "Proposals",
  quotations: "Quotations",
  invoices: "Invoices",
  portfolio: "Portfolio",
  payments: "Payments",
  pending_users: "Pending Users",
  enquiries: "Enquiries",
  history: "History",
  notifications: "Notifications",
  web_cms_overview: "CMS — Overview",
  web_cms_home: "CMS — Home",
  web_cms_about: "CMS — About",
  web_cms_services: "CMS — Services",
  web_cms_products: "CMS — Products",
  web_cms_portfolio: "CMS — Portfolio",
  web_cms_blog: "CMS — Blog",
  web_cms_careers: "CMS — Careers",
  web_cms_leads: "CMS — Leads",
  web_cms_seo: "CMS — SEO Manager",
  web_cms_media: "CMS — Media Library",
  web_cms_legal: "CMS — Legal",
  web_cms_settings: "CMS — Site Settings",
};

export const PAGE_GROUPS = [
  {
    label: "CRM Dashboard",
    keys: [
      "dashboard", "clients", "services", "projects", "proposals",
      "quotations", "invoices", "portfolio", "payments", "pending_users",
      "enquiries", "history", "notifications",
    ] as PageKey[],
  },
  {
    label: "Website Interactive CMS",
    keys: [
      "web_cms_overview", "web_cms_home", "web_cms_about", "web_cms_services",
      "web_cms_products", "web_cms_portfolio", "web_cms_blog", "web_cms_careers",
      "web_cms_leads", "web_cms_seo", "web_cms_media", "web_cms_legal", "web_cms_settings",
    ] as PageKey[],
  },
];

// ─── Managed user type ────────────────────────────────────────────────────────
export type ManagedUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  page_access: PageKey[];
  access_granted_by: string | null;
  access_granted_at: string | null;
  created_at: string;
};

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function getHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function req<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401 && typeof window !== "undefined") {
    ["access", "access_token", "token"].forEach((k) => localStorage.removeItem(k));
    window.location.href = "/login";
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const listManagedUsers = () =>
  req<ManagedUser[]>(`${RBAC_URL}/users/`);

export const getManagedUser = (id: string) =>
  req<ManagedUser>(`${RBAC_URL}/users/${id}/`);

export const createManagedUser = (data: {
  email: string;
  full_name: string;
  password: string;
  role: string;
  page_access: PageKey[];
}) => req<ManagedUser>(`${RBAC_URL}/users/`, { method: "POST", body: JSON.stringify(data) });

export const updateManagedUser = (
  id: string,
  data: Partial<{ email: string; full_name: string; role: string; page_access: PageKey[]; new_password: string }>
) => req<ManagedUser>(`${RBAC_URL}/users/${id}/`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteManagedUser = (id: string) =>
  req<void>(`${RBAC_URL}/users/${id}/`, { method: "DELETE" });

export const grantAccess = (id: string, data: { page_access: PageKey[]; role?: string }) =>
  req<{ detail: string; user: ManagedUser }>(`${RBAC_URL}/users/${id}/grant/`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const revokeAccess = (id: string) =>
  req<{ detail: string }>(`${RBAC_URL}/users/${id}/revoke/`, { method: "POST" });

export const updatePageAccess = (id: string, page_access: PageKey[]) =>
  req<ManagedUser>(`${RBAC_URL}/users/${id}/page-access/`, {
    method: "PATCH",
    body: JSON.stringify({ page_access }),
  });

export const getMyAccess = () =>
  req<{ id: string; email: string; full_name: string; role: string; is_active: boolean; page_access: PageKey[] }>(
    `${RBAC_URL}/my-access/`
  );
