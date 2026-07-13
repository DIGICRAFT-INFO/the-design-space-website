import API_BASE_URL from "@/lib/config";
import type {
  WebHome,
  WebAbout,
  WebServicePackage,
  WebProduct,
  WebSettings,
  TeamMember,
  WebBlogPost,
  WebCareerJob,
  WebPortfolioCategory,
  WebSeoEntry,
} from "@/services/websiteService";

const CMS_URL = `${API_BASE_URL}/web-cms`;

// ─── Auth helpers (mirrors services/portfoliService.ts exactly) ───────────

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

async function req<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...getAuthHeaders(), ...(options.headers || {}) } });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Media upload (used inline by every CMS form) ──────────────────────────

export async function uploadWebsiteImage(file: File): Promise<{ file_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${CMS_URL}/upload/image`, {
    method: "POST",
    headers: getAuthHeadersNoJSON(),
    body: formData,
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Image upload failed");
  }
  return res.json();
}

export async function uploadWebsiteVideo(file: File): Promise<{ file_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${CMS_URL}/upload/video`, {
    method: "POST",
    headers: getAuthHeadersNoJSON(),
    body: formData,
  });
  handleUnauthorized(res.status);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Video upload failed");
  }
  return res.json();
}

// ─── Home ───────────────────────────────────────────────────────────────────

export const getHomeAdmin = () => req<WebHome>(`${CMS_URL}/home`);
export const updateHomeAdmin = (data: Partial<WebHome>) =>
  req<WebHome>(`${CMS_URL}/home`, { method: "PUT", body: JSON.stringify(data) });

// ─── About ──────────────────────────────────────────────────────────────────

export const getAboutAdmin = () => req<WebAbout>(`${CMS_URL}/about`);
export const updateAboutAdmin = (data: Partial<WebAbout>) =>
  req<WebAbout>(`${CMS_URL}/about`, { method: "PUT", body: JSON.stringify(data) });

export const addTeamMember = (data: Partial<TeamMember>) =>
  req<WebAbout>(`${CMS_URL}/about/team`, { method: "POST", body: JSON.stringify(data) });
export const updateTeamMember = (id: string, data: Partial<TeamMember>) =>
  req<WebAbout>(`${CMS_URL}/about/team/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteTeamMember = (id: string) =>
  req<void>(`${CMS_URL}/about/team/${id}`, { method: "DELETE" });

// ─── Services (packages) ───────────────────────────────────────────────────

export const listServicesAdmin = () => req<WebServicePackage[]>(`${CMS_URL}/services`);
export const createService = (data: Partial<WebServicePackage>) =>
  req<WebServicePackage>(`${CMS_URL}/services`, { method: "POST", body: JSON.stringify(data) });
export const updateService = (id: string, data: Partial<WebServicePackage>) =>
  req<WebServicePackage>(`${CMS_URL}/services/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteService = (id: string) => req<void>(`${CMS_URL}/services/${id}`, { method: "DELETE" });

// ─── Products ───────────────────────────────────────────────────────────────

export const listProductsAdmin = () => req<WebProduct[]>(`${CMS_URL}/products`);
export const createProduct = (data: Partial<WebProduct>) =>
  req<WebProduct>(`${CMS_URL}/products`, { method: "POST", body: JSON.stringify(data) });
export const updateProduct = (id: string, data: Partial<WebProduct>) =>
  req<WebProduct>(`${CMS_URL}/products/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteProduct = (id: string) => req<void>(`${CMS_URL}/products/${id}`, { method: "DELETE" });

// ─── Settings ───────────────────────────────────────────────────────────────

export const getSettingsAdmin = () => req<WebSettings>(`${CMS_URL}/settings`);
export const updateSettingsAdmin = (data: Partial<WebSettings>) =>
  req<WebSettings>(`${CMS_URL}/settings`, { method: "PUT", body: JSON.stringify(data) });

// ─── CMS Dashboard Overview ─────────────────────────────────────────────────

export type CmsOverview = {
  stats: { published_portfolio: number; published_blog_posts: number; open_jobs: number; new_leads_7d: number };
  recent_activity: { type: string; label: string; at: string }[];
};
export const getCmsOverview = () => req<CmsOverview>(`${CMS_URL}/overview`);

// ─── Portfolio Categories ───────────────────────────────────────────────────

export const listPortfolioCategoriesAdmin = () => req<WebPortfolioCategory[]>(`${CMS_URL}/portfolio-categories`);
export const createPortfolioCategory = (name: string) =>
  req<WebPortfolioCategory>(`${CMS_URL}/portfolio-categories`, { method: "POST", body: JSON.stringify({ name }) });
export const deletePortfolioCategory = (id: string) =>
  req<void>(`${CMS_URL}/portfolio-categories/${id}`, { method: "DELETE" });

// ─── Blog ───────────────────────────────────────────────────────────────────

export const listBlogAdmin = () => req<WebBlogPost[]>(`${CMS_URL}/blog`);
export const createBlogPost = (data: Partial<WebBlogPost>) =>
  req<WebBlogPost>(`${CMS_URL}/blog`, { method: "POST", body: JSON.stringify(data) });
export const updateBlogPost = (id: string, data: Partial<WebBlogPost>) =>
  req<WebBlogPost>(`${CMS_URL}/blog/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteBlogPost = (id: string) => req<void>(`${CMS_URL}/blog/${id}`, { method: "DELETE" });

// ─── Careers: Jobs ──────────────────────────────────────────────────────────

export const listJobsAdmin = () => req<WebCareerJob[]>(`${CMS_URL}/jobs`);
export const createJob = (data: Partial<WebCareerJob>) =>
  req<WebCareerJob>(`${CMS_URL}/jobs`, { method: "POST", body: JSON.stringify(data) });
export const updateJob = (id: string, data: Partial<WebCareerJob>) =>
  req<WebCareerJob>(`${CMS_URL}/jobs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteJob = (id: string) => req<void>(`${CMS_URL}/jobs/${id}`, { method: "DELETE" });

// ─── Careers: Applicant Tracker ─────────────────────────────────────────────

export type CareerApplicationAdmin = {
  id: string;
  job: string | null;
  job_title_snapshot: string;
  applicant_name: string;
  email: string;
  phone: string;
  cover_note: string;
  resume_url: string;
  resume_filename: string;
  status: "new" | "reviewed" | "archived";
  created_at: string;
};
export const listApplicationsAdmin = () => req<CareerApplicationAdmin[]>(`${CMS_URL}/applications`);
export const updateApplicationStatus = (id: string, status: CareerApplicationAdmin["status"]) =>
  req<CareerApplicationAdmin>(`${CMS_URL}/applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
export const deleteApplication = (id: string) => req<void>(`${CMS_URL}/applications/${id}`, { method: "DELETE" });

// ─── Leads ──────────────────────────────────────────────────────────────────

export type Lead = {
  id: string;
  type: "enquiry" | "application";
  name: string;
  email: string;
  phone: string;
  detail: string;
  status: string;
  resume_url?: string;
  created_at: string;
};
export const listLeads = (type?: "enquiry" | "application") =>
  req<Lead[]>(`${CMS_URL}/leads${type ? `?type=${type}` : ""}`);

// ─── SEO Manager ────────────────────────────────────────────────────────────

export const listSeoAdmin = () => req<WebSeoEntry[]>(`${CMS_URL}/seo`);
export const upsertSeo = (data: { route_path: string; meta_title?: string; meta_description?: string; meta_keywords?: string[] }) =>
  req<WebSeoEntry>(`${CMS_URL}/seo`, { method: "PUT", body: JSON.stringify(data) });
export const deleteSeo = (id: string) => req<void>(`${CMS_URL}/seo/${id}`, { method: "DELETE" });

// ─── Media Library ──────────────────────────────────────────────────────────

export type MediaFile = {
  filename: string;
  folder: string;
  file_url: string;
  size_bytes: number;
  modified_at: string;
  type: "image" | "video" | "pdf" | "other";
};
export const listMedia = () => req<MediaFile[]>(`${CMS_URL}/media`);
export const deleteMedia = (folder: string, filename: string) =>
  req<void>(`${CMS_URL}/media`, { method: "DELETE", body: JSON.stringify({ folder, filename }) });
