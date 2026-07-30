"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media";
import ZoomableImage from "@/components/website/ZoomableImage";
import FadeIn from "@/components/website/FadeIn";
import type { PublicPortfolioItem } from "@/services/websiteService";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "renovation", label: "Renovation" },
];

export default function PortfolioGrid({ items, categories = [] }: { items: PublicPortfolioItem[]; categories?: string[] }) {
  const [filter, setFilter] = useState("all");
  const [tag, setTag] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      items
        .filter((p) => filter === "all" || p.project_type === filter)
        .filter((p) => !tag || (p.custom_categories || []).includes(tag)),
    [items, filter, tag]
  );

  return (
    <div>
      {/* Type filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[11px] tracking-[0.14em] uppercase border transition-colors ${
              filter === f.value
                ? "border-[var(--ds-gold)] text-[var(--ds-gold)] bg-[var(--ds-gold)]/5"
                : "border-[var(--ds-border)] text-[var(--ds-ink-soft)] hover:text-[var(--ds-ink)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Category tags */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-8 md:mb-14 overflow-x-auto pb-1 -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap scrollbar-none">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setTag(tag === c ? null : c)}
              className={`shrink-0 px-3 md:px-4 py-1.5 rounded-full text-[10px] tracking-[0.1em] uppercase border transition-colors ${
                tag === c
                  ? "border-[var(--ds-ink)] bg-[var(--ds-ink)] text-[var(--ds-bg)]"
                  : "border-[var(--ds-border)] text-[var(--ds-ink-soft)] hover:border-[var(--ds-ink-soft)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[var(--ds-ink-soft)] text-sm">
            {items.length === 0
              ? "Projects will appear here once added from the CMS."
              : "No projects in this category yet."}
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-5 [column-fill:_balance]">
          {filtered.map((item, i) => {
            const gallery = (item.images || []).map((img) => ({
              src: resolveMediaUrl(img.file_url) || "/logo.png",
              alt: item.title,
              caption: img.caption || item.title,
            }));

            return (
              <FadeIn key={item.id} delay={(i % 6) * 0.05} className="mb-4 md:mb-5 break-inside-avoid">
                <div className="group">
                  {/* Image with zoom — double click opens lightbox */}
                  <ZoomableImage
                    src={gallery[0]?.src || "/logo.png"}
                    alt={item.title}
                    gallery={gallery}
                    galleryIndex={0}
                    className={`rounded-lg ${i % 3 === 1 ? "aspect-[3/4]" : "aspect-square"}`}
                  />
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/portfolio/${item.id}`}>
                        <p className="text-sm md:text-base font-medium group-hover:text-[var(--ds-gold)] transition-colors leading-snug truncate">
                          {item.title}
                        </p>
                      </Link>
                      {item.project_type && (
                        <p className="text-[10px] tracking-[0.1em] uppercase text-[var(--ds-ink-soft)] mt-0.5">
                          {item.project_type}
                        </p>
                      )}
                    </div>
                    {item.metrics?.location && (
                      <p className="text-xs text-[var(--ds-ink-soft)] shrink-0 mt-0.5">{item.metrics.location}</p>
                    )}
                  </div>
                  {/* Image count badge */}
                  {gallery.length > 1 && (
                    <p className="text-[10px] text-[var(--ds-ink-soft)] mt-1">{gallery.length} photos · double-click to view</p>
                  )}
                </div>
              </FadeIn>
            );
          })}
        </div>
      )}
    </div>
  );
}
