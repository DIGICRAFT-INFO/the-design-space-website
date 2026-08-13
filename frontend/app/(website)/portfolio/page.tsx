import { getPortfolio, getPortfolioCategories, getSeoEntries, resolveSeo } from "@/services/websiteService";
import { resolveMediaUrl } from "@/lib/media";
import SplitText from "@/components/website/SplitText";
import PortfolioGrid from "@/components/website/portfolio/PortfolioGrid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  const seo = resolveSeo(await getSeoEntries().catch(() => []), "/portfolio", {
    title: "Portfolio — The Design Space",
    description: "A curated look at residential, commercial, and renovation projects we've shaped.",
  });
  return { title: seo.title, description: seo.description, keywords: seo.keywords };
}

export default async function PortfolioPage() {
  const [rawItems, categories] = await Promise.all([
    getPortfolio().catch(() => []),
    getPortfolioCategories().catch(() => []),
  ]);

  // Resolve all image URLs server-side so client components get absolute URLs
  const items = rawItems.map((item) => ({
    ...item,
    images: (item.images || []).map((img) => ({
      ...img,
      file_url: resolveMediaUrl(img.file_url),
    })),
  }));

  return (
    <>
      <section className="page-hero-pt pb-16 md:pb-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-5">Selected Workspace Index</p>
          <SplitText
            text="A Portfolio of Considered Spaces"
            as="h1"
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light tracking-tight max-w-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          />
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <PortfolioGrid items={items} categories={categories.map((c) => c.name)} />
        </div>
      </section>
    </>
  );
}
