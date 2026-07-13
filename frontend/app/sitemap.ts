import type { MetadataRoute } from "next";
import { getPortfolio, getBlogPosts } from "@/services/websiteService";

const SITE_URL = "https://thedesignspace.in";

const STATIC_ROUTES = ["", "/about", "/services", "/portfolio", "/products", "/blog", "/careers", "/contact", "/sitemap", "/privacy-policy", "/copyright"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [portfolio, blogPosts] = await Promise.all([
    getPortfolio().catch(() => []),
    getBlogPosts().catch(() => []),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));

  const portfolioEntries: MetadataRoute.Sitemap = portfolio.map((p) => ({
    url: `${SITE_URL}/portfolio/${p.id}`,
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((b) => ({
    url: `${SITE_URL}/blog/${b.slug}`,
    lastModified: b.published_at ? new Date(b.published_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...portfolioEntries, ...blogEntries];
}
