import API_BASE_URL from "@/lib/config";

const PUBLIC_URL = `${API_BASE_URL}/public`;

// ─── Types ──────────────────────────────────────────────────────────────────

export type BentoCard = {
  id: string;
  image_title: string;
  image_url: string;
  grid_span_class: string;
  sort_order: number;
};

export type ProcessStep = {
  id: string;
  stage: string;
  title: string;
  body: string;
  associated_image: string;
  sort_order: number;
};

export type HeroSlide = {
  id: string;
  mini_title: string;
  main_title: string;
  subtitle: string;
  cta_label: string;
  cta_link: string;
  image_url: string;
  sort_order: number;
};

export type WebHome = {
  id: string;
  hero: {
    mini_title: string;
    main_title: string;
    subtitle: string;
    cta_label: string;
    cta_link: string;
    video_url: string;
    poster_image: string;
  };
  hero_slides: HeroSlide[];
  grid_matrix: { mini_title: string; cards: BentoCard[] };
  process: { mini_title: string; steps: ProcessStep[] };
  about_preview: { title: string; body: string; cta_label: string; image: string };
  careers_banner: { title: string; subtitle: string; cta_label: string };
  section_visibility: {
    hero: boolean;
    about_preview: boolean;
    services_grid: boolean;
    bento_portfolio: boolean;
    products_carousel: boolean;
    blog_highlights: boolean;
    careers_banner: boolean;
    map: boolean;
  };
};

export type TeamMember = {
  id: string;
  name: string;
  designation: string;
  avatar_url: string;
  sort_order: number;
};

export type WebAbout = {
  id: string;
  narrative: {
    philosophy_title: string;
    story_para_one: string;
    story_para_two: string;
    hero_image: string;
  };
  about_slides: HeroSlide[];
  studio_gallery: { id: string; file_url: string; caption: string; sort_order: number }[];
  studio_video_url: string;
  team_members: TeamMember[];
};

export type WebServicePackage = {
  id: string;
  package_name: string;
  scope_summary: string;
  tier_classification: "residential" | "commercial" | "consultation" | "turnkey" | "other";
  tier_label?: string;
  price_estimation: string;
  cover_image: string;
  highlights: string[];
  is_published: boolean;
  is_featured_home: boolean;
  sort_order: number;
  published_date?: string | null;
};

export type WebProduct = {
  id: string;
  title: string;
  material_specs: string;
  dimensions: string;
  category_tag: "seating" | "lighting" | "kitchen_modules" | "decor" | "other";
  category_label?: string;
  description: string;
  item_images: { id: string; file_url: string; sort_order: number }[];
  is_in_stock: boolean;
  is_published: boolean;
  published_date?: string | null;
};

export type PublicPortfolioItem = {
  id: string;
  title: string;
  description: string;
  project_type: "residential" | "commercial" | "renovation" | "other";
  custom_categories: string[];
  is_featured: boolean;
  sort_order: number;
  metrics: { location: string; area_sqft: number | null; scope_duration: string };
  images: { id: string; file_url: string; caption: string }[];
  created_at: string;
};

export type WebSettings = {
  id: string;
  contact: {
    office_address: string;
    phone: string;
    email: string;
    working_hours: string;
    map_embed_url: string;
  };
  social_links: { instagram: string; pinterest: string; linkedin: string; facebook: string };
  footer_text: string;
  seo_default_title: string;
  seo_default_description: string;
  legal: { privacy_policy: string; copyright_terms: string };
};

// ─── Blog ───────────────────────────────────────────────────────────────────

export type WebBlogPost = {
  id: string;
  title: string;
  slug: string;
  cover_image: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author_name: string;
  read_time_minutes: number;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
};

// ─── Careers ────────────────────────────────────────────────────────────────

export type WebCareerJob = {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: "full_time" | "part_time" | "contract" | "internship";
  description: string;
  requirements: string[];
  status: "open" | "closed";
};

// ─── Portfolio categories ───────────────────────────────────────────────────

export type WebPortfolioCategory = { id: string; name: string; sort_order: number };

// ─── SEO ────────────────────────────────────────────────────────────────────

export type WebSeoEntry = {
  id: string;
  route_path: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
};

// ─── Fetch helpers ──────────────────────────────────────────────────────────

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const getHome = () => getJSON<WebHome>(`${PUBLIC_URL}/home`);
export const getAbout = () => getJSON<WebAbout>(`${PUBLIC_URL}/about`);
export const getSettings = () => getJSON<WebSettings>(`${PUBLIC_URL}/settings`);

export const getServices = (tier?: string) =>
  getJSON<WebServicePackage[]>(`${PUBLIC_URL}/services${tier && tier !== "all" ? `?tier=${tier}` : ""}`);

export const getProducts = (category?: string) =>
  getJSON<WebProduct[]>(`${PUBLIC_URL}/products${category && category !== "all" ? `?category=${category}` : ""}`);

export const getProduct = (id: string) => getJSON<WebProduct>(`${PUBLIC_URL}/products/${id}`);

export const getPortfolio = (projectType?: string, featuredOnly?: boolean) => {
  const params = new URLSearchParams();
  if (projectType && projectType !== "all") params.set("project_type", projectType);
  if (featuredOnly) params.set("featured", "true");
  const qs = params.toString();
  return getJSON<PublicPortfolioItem[]>(`${PUBLIC_URL}/portfolio${qs ? `?${qs}` : ""}`);
};

export const getPortfolioItem = (id: string) => getJSON<PublicPortfolioItem>(`${PUBLIC_URL}/portfolio/${id}`);

export type EnquiryPayload = {
  name: string;
  phone: string;
  email?: string;
  budget_range?: string;
  message?: string;
};

export async function submitEnquiry(payload: EnquiryPayload): Promise<{ message: string }> {
  const res = await fetch(`${PUBLIC_URL}/enquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

// ─── Blog ───────────────────────────────────────────────────────────────────

export const getBlogPosts = (category?: string, limit?: number) => {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return getJSON<WebBlogPost[]>(`${PUBLIC_URL}/blog${qs ? `?${qs}` : ""}`);
};

export const getBlogPost = (slug: string) => getJSON<WebBlogPost>(`${PUBLIC_URL}/blog/${slug}`);

// ─── Careers ────────────────────────────────────────────────────────────────

export const getOpenJobs = () => getJSON<WebCareerJob[]>(`${PUBLIC_URL}/careers`);

export async function submitJobApplication(formData: FormData): Promise<{ message: string }> {
  const res = await fetch(`${PUBLIC_URL}/careers/apply`, { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

// ─── Portfolio categories ───────────────────────────────────────────────────

export const getPortfolioCategories = () => getJSON<WebPortfolioCategory[]>(`${PUBLIC_URL}/portfolio-categories`);

// ─── SEO ────────────────────────────────────────────────────────────────────

export const getSeoEntries = () => getJSON<WebSeoEntry[]>(`${PUBLIC_URL}/seo`);

/** Finds the SEO entry for `routePath` among bulk-fetched entries, falling
 *  back to the given defaults when the CMS hasn't set one yet. */
export function resolveSeo(
  entries: WebSeoEntry[],
  routePath: string,
  fallback: { title: string; description?: string }
): { title: string; description: string; keywords: string[] } {
  const match = entries.find((e) => e.route_path === routePath);
  return {
    title: match?.meta_title || fallback.title,
    description: match?.meta_description || fallback.description || "",
    keywords: match?.meta_keywords || [],
  };
}
