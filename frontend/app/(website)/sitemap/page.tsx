import Link from "next/link";
import { getPortfolio, getBlogPosts, getProducts, getOpenJobs } from "@/services/websiteService";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";

export const metadata = { title: "Sitemap — The Design Space" };

export default async function SitemapPage() {
  const [portfolio, blogPosts, products, jobs] = await Promise.all([
    getPortfolio().catch(() => []),
    getBlogPosts().catch(() => []),
    getProducts().catch(() => []),
    getOpenJobs().catch(() => []),
  ]);

  const sections: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: "Main Pages",
      links: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Services", href: "/services" },
        { label: "Portfolio", href: "/portfolio" },
        { label: "Products", href: "/products" },
        { label: "Journal", href: "/blog" },
        { label: "Careers", href: "/careers" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Portfolio Projects",
      links: portfolio.map((p) => ({ label: p.title, href: `/portfolio/${p.id}` })),
    },
    {
      title: "Journal Articles",
      links: blogPosts.map((b) => ({ label: b.title, href: `/blog/${b.slug}` })),
    },
    {
      title: "Open Roles",
      links: jobs.map((j) => ({ label: j.title, href: "/careers" })),
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Copyright & Terms", href: "/copyright" },
      ],
    },
  ].filter((s) => s.links.length > 0);

  return (
    <>
      <section className="pt-40 md:pt-48 pb-16 md:pb-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <SplitText
            text="Sitemap"
            as="h1"
            className="text-4xl md:text-6xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          />
        </div>
      </section>

      <section className="pb-28 md:pb-40">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {sections.map((section, i) => (
            <FadeIn key={section.title} delay={i * 0.05}>
              <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--ds-gold)] mb-4">{section.title}</p>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-sm text-[var(--ds-ink-soft)] hover:text-[var(--ds-gold)] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </FadeIn>
          ))}
        </div>
        {products.length > 0 && (
          <div className="max-w-[1600px] mx-auto px-6 md:px-10 mt-12 text-sm text-[var(--ds-ink-soft)]">
            Plus {products.length} product{products.length === 1 ? "" : "s"} in the{" "}
            <Link href="/products" className="text-[var(--ds-gold)] hover:underline">Products catalog</Link>.
          </div>
        )}
      </section>
    </>
  );
}
