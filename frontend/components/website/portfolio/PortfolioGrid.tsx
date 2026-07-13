"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media";
import RevealImage from "@/components/website/RevealImage";
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
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-5 py-2.5 rounded-full text-[11px] tracking-[0.14em] uppercase border transition-colors ${
              filter === f.value
                ? "border-[var(--ds-gold)] text-[var(--ds-gold)]"
                : "border-[var(--ds-border)] text-[var(--ds-ink-soft)] hover:text-[var(--ds-ink)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-12 md:mb-16">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setTag(tag === c ? null : c)}
              className={`px-4 py-1.5 rounded-full text-[10px] tracking-[0.1em] uppercase border transition-colors ${
                tag === c ? "border-[var(--ds-ink)] bg-[var(--ds-ink)] text-[var(--ds-bg)]" : "border-[var(--ds-border)] text-[var(--ds-ink-soft)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-[var(--ds-ink-soft)]">No projects in this category yet.</p>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-5 md:gap-6 [column-fill:_balance]">
          {filtered.map((item, i) => (
            <FadeIn key={item.id} delay={(i % 6) * 0.05} className="mb-5 md:mb-6 break-inside-avoid">
              <Link href={`/portfolio/${item.id}`} className="block group">
                <RevealImage
                  src={resolveMediaUrl(item.images?.[0]?.file_url) || "/logo.png"}
                  alt={item.title}
                  className={`rounded-sm ${i % 3 === 1 ? "aspect-[3/4]" : "aspect-square"}`}
                  cursorLabel="View Project"
                />
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <p className="text-sm md:text-base font-medium group-hover:text-[var(--ds-gold)] transition-colors">
                    {item.title}
                  </p>
                  {item.metrics?.location && (
                    <p className="text-xs text-[var(--ds-ink-soft)] shrink-0">{item.metrics.location}</p>
                  )}
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
