import Link from "next/link";
import FadeIn from "@/components/website/FadeIn";
import RevealImage from "@/components/website/RevealImage";
import { resolveMediaUrl } from "@/lib/media";
import type { WebServicePackage } from "@/services/websiteService";

export default function ServicesQuickGrid({ packages }: { packages: WebServicePackage[] }) {
  if (packages.length === 0) return null;

  return (
    <section className="bg-[var(--ds-bg-alt)] border-y border-[var(--ds-border)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-24 md:py-32">
        <FadeIn>
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-3">What We Do</p>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-12 md:mb-16" style={{ fontFamily: "var(--font-display)" }}>
            Three ways to begin.
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {packages.slice(0, 3).map((pkg, i) => (
            <FadeIn key={pkg.id} delay={i * 0.1}>
              <Link href="/services" className="block group">
                <RevealImage
                  src={resolveMediaUrl(pkg.cover_image) || "/logo.png"}
                  alt={pkg.package_name}
                  className="aspect-[4/3] rounded-sm mb-5"
                  cursorLabel="View"
                />
                <h3 className="text-xl font-light mb-2 group-hover:text-[var(--ds-gold)] transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                  {pkg.package_name}
                </h3>
                <p className="text-sm text-[var(--ds-ink-soft)] line-clamp-2">{pkg.scope_summary}</p>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
