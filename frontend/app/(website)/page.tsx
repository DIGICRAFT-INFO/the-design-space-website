import { getHome, getPortfolio, getServices, getProducts, getBlogPosts, getSettings, getSeoEntries, resolveSeo } from "@/services/websiteService";
import { resolveMediaUrl } from "@/lib/media";
import SplitText from "@/components/website/SplitText";
import RevealImage from "@/components/website/RevealImage";
import FadeIn from "@/components/website/FadeIn";
import MagneticButton from "@/components/website/MagneticButton";
import HeroSlider from "@/components/website/home/HeroSlider";
import ProcessSection from "@/components/website/home/ProcessSection";
import AboutPreview from "@/components/website/home/AboutPreview";
import ServicesQuickGrid from "@/components/website/home/ServicesQuickGrid";
import ProductsCarousel from "@/components/website/home/ProductsCarousel";
import BlogHighlights from "@/components/website/home/BlogHighlights";
// import CareersBanner from "@/components/website/home/CareersBanner";
// import MapSection from "@/components/website/home/MapSection";
import Link from "next/link";

export async function generateMetadata() {
  const seo = resolveSeo(await getSeoEntries().catch(() => []), "/", {
    title: "The Design Space — Luxury Interior Design",
    description: "Bespoke residential and commercial interior design — quiet, considered luxury from first sketch to final styling.",
  });
  return { title: seo.title, description: seo.description, keywords: seo.keywords };
}

export default async function HomePage() {
  const [home, featured, allServices, products, blogPosts, settings] = await Promise.all([
    getHome().catch(() => null),
    getPortfolio(undefined, true).catch(() => []),
    getServices().catch(() => []),
    getProducts().catch(() => []),
    getBlogPosts(undefined, 3).catch(() => []),
    getSettings().catch(() => null),
  ]);

  const visibility = home?.section_visibility;
  const isVisible = (key: keyof NonNullable<typeof visibility>) => visibility?.[key] !== false;
  const featuredServices = allServices.filter((s) => s.is_featured_home).length
    ? allServices.filter((s) => s.is_featured_home)
    : allServices.slice(0, 3);

  const hero = home?.hero;
  const heroSlides = (home?.hero_slides ?? [])
    .filter((s) => s.image_url)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ ...s, image_url: resolveMediaUrl(s.image_url) }));

  // Use slider when CMS slides are configured, otherwise fall back to single hero
  const useSlider = heroSlides.length > 0;
  const gridCards = home?.grid_matrix?.cards?.length
    ? home.grid_matrix.cards
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((c) => ({ id: c.id, title: c.image_title, image: resolveMediaUrl(c.image_url), span: c.grid_span_class }))
    : featured.slice(0, 4).map((p, i) => ({
        id: p.id,
        title: p.title,
        image: resolveMediaUrl(p.images?.[0]?.file_url),
        span: ["lg:col-span-2 lg:row-span-2", "lg:col-span-1", "lg:col-span-1", "lg:col-span-2"][i] || "",
      }));

  return (
    <>
      {/* ── Section A: Hero ─────────────────────────────────────────────── */}
      {isVisible("hero") && (
        useSlider ? (
          <HeroSlider slides={heroSlides} autoPlayInterval={5000} />
        ) : (
        <section className="relative h-[100svh] w-full overflow-hidden flex items-end">
          <div className="absolute inset-0">
            {hero?.video_url ? (
              <video
                className="w-full h-full object-cover aspect-[9/16] md:aspect-auto"
                autoPlay
                muted
                loop
                playsInline
                poster={resolveMediaUrl(hero?.poster_image)}
              >
                <source src={resolveMediaUrl(hero.video_url)} type="video/mp4" />
              </video>
            ) : hero?.poster_image ? (
              <img src={resolveMediaUrl(hero.poster_image)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[var(--ds-bg-alt)]" />
            )}
            <div className="absolute inset-0 bg-black/30" />
          </div>

          <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 md:px-10 pb-16 md:pb-20">
            <FadeIn>
              <p className="text-[12px] tracking-[0.3em] uppercase text-[#E6C687] mb-4">
                {hero?.mini_title || "THE DESIGN SPACE"}
              </p>
            </FadeIn>
            <SplitText
              text={hero?.main_title || "We Design Your Luxury Space"}
              as="h1"
              className="text-white font-light tracking-tight text-5xl lg:text-8xl max-w-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            />
            <FadeIn delay={0.7} className="max-w-xl mt-6 flex flex-col sm:flex-row sm:items-center gap-6">
              <p className="text-base text-white/80 leading-relaxed">
                {hero?.subtitle || "Bespoke interiors for those who see home as an art form."}
              </p>
              <MagneticButton
                as="a"
                href={hero?.cta_link || "/portfolio"}
                data-cursor="View"
                className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 bg-white text-[#1C1C1C] rounded-full text-[11px] tracking-[0.14em] uppercase font-medium"
              >
                {hero?.cta_label || "Explore Spaces"}
              </MagneticButton>
            </FadeIn>
          </div>
        </section>
        )
      )}

      {/* ── Section B: About Preview ─────────────────────────────────────── */}
      {isVisible("about_preview") && home?.about_preview && (
        <AboutPreview
          title={home.about_preview.title}
          body={home.about_preview.body}
          ctaLabel={home.about_preview.cta_label}
          image={home.about_preview.image}
        />
      )}

      {/* ── Section C: Services Quick Grid ──────────────────────────────── */}
      {isVisible("services_grid") && <ServicesQuickGrid packages={featuredServices} />}

      {/* ── Section D: Bento Grid Matrix (Portfolio) ────────────────────── */}
      {isVisible("bento_portfolio") && (
      <section className="max-w-[1600px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <FadeIn>
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-3">
            {home?.grid_matrix?.mini_title || "01 / Selected Architecture"}
          </p>
          <h2
            className="text-3xl md:text-5xl font-light tracking-tight max-w-2xl mb-12"
            style={{ fontFamily: "var(--font-display)" }}
          >
            A curated look at spaces we&rsquo;ve shaped.
          </h2>
        </FadeIn>

        {gridCards.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-2 gap-4 md:gap-6 lg:h-[90vh]">
            {gridCards.map((card, i) => (
              <div key={card.id} className={`relative group aspect-[4/5] lg:aspect-auto rounded-sm overflow-hidden ${card.span}`}>
                <RevealImage
                  src={card.image || "/logo.png"}
                  alt={card.title}
                  delay={i * 0.08}
                  cursorLabel="View"
                  className="absolute inset-0"
                  imgClassName="transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <p className="text-white text-sm tracking-wide">{card.title}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[var(--ds-ink-soft)]">Featured projects will appear here once published.</p>
        )}

        <FadeIn className="mt-12">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-[12px] tracking-[0.14em] uppercase border-b border-[var(--ds-ink)] pb-1 hover:text-[var(--ds-gold)] hover:border-[var(--ds-gold)] transition-colors"
          >
            View Full Portfolio
          </Link>
        </FadeIn>
      </section>
      )}

      {/* ── Section E: Process ───────────────────────────────────────────── */}
      <ProcessSection
        miniTitle={home?.process?.mini_title || "02 / How We Work"}
        steps={home?.process?.steps || []}
      />

      {/* ── Section F: Products Carousel ────────────────────────────────── */}
      {isVisible("products_carousel") && <ProductsCarousel products={products} />}

      {/* ── Section G: Blog Highlights ───────────────────────────────────── */}
      {isVisible("blog_highlights") && <BlogHighlights posts={blogPosts} />}

      {/* ── Section H: Careers Banner ──────────────────────────────────────
      {isVisible("careers_banner") && home?.careers_banner && (
        <CareersBanner
          title={home.careers_banner.title}
          subtitle={home.careers_banner.subtitle}
          ctaLabel={home.careers_banner.cta_label}
        />
      )} */}

      {/* ── Section I: Map ─────────────────────────────────────────────────
      {isVisible("map") && (
        <MapSection mapEmbedUrl={settings?.contact.map_embed_url} address={settings?.contact.office_address} />
      )} */}
    </>
  );
}
