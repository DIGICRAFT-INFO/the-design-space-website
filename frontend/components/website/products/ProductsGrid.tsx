"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media";
import RevealImage from "@/components/website/RevealImage";
import FadeIn from "@/components/website/FadeIn";
import type { WebProduct } from "@/services/websiteService";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "seating", label: "Seating" },
  { value: "lighting", label: "Light Fixtures" },
  { value: "kitchen_modules", label: "Kitchen Modules" },
  { value: "decor", label: "Decor" },
];

export default function ProductsGrid({ products }: { products: WebProduct[] }) {
  const [category, setCategory] = useState("all");

  const filtered = useMemo(
    () => (category === "all" ? products : products.filter((p) => p.category_tag === category)),
    [products, category]
  );

  return (
    <div className="lg:flex lg:gap-16">
      {/* Filter — horizontal swipe strip on mobile, fixed sidebar on desktop */}
      <aside className="lg:w-52 shrink-0 mb-8 lg:mb-0">
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-6 px-6 lg:mx-0 lg:px-0 lg:sticky lg:top-28">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`shrink-0 text-left px-4 py-2.5 rounded-full lg:rounded-none text-[12px] tracking-[0.1em] uppercase border-b lg:border-b lg:border-l-0 transition-colors whitespace-nowrap ${
                category === c.value
                  ? "border-[var(--ds-gold)] text-[var(--ds-gold)] bg-[var(--ds-gold)]/5 lg:bg-transparent"
                  : "border-[var(--ds-border)] text-[var(--ds-ink-soft)] hover:text-[var(--ds-ink)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Grid */}
      <div className="flex-1">
        {filtered.length === 0 ? (
          <p className="text-[var(--ds-ink-soft)]">No products in this category yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-8 md:gap-10">
            {filtered.map((product, i) => (
              <FadeIn key={product.id} delay={(i % 3) * 0.08}>
                <RevealImage
                  src={resolveMediaUrl(product.item_images?.[0]?.file_url) || "/logo.png"}
                  alt={product.title}
                  className="aspect-[4/5] rounded-sm mb-4"
                  cursorLabel="View"
                />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-medium">{product.title}</h3>
                    {product.dimensions && <p className="text-xs text-[var(--ds-ink-soft)] mt-1">{product.dimensions}</p>}
                    {product.material_specs && <p className="text-xs text-[var(--ds-ink-soft)]">{product.material_specs}</p>}
                  </div>
                  {!product.is_in_stock && (
                    <span className="shrink-0 text-[10px] tracking-wide uppercase text-[var(--ds-ink-soft)] border border-[var(--ds-border)] rounded-full px-2 py-0.5">
                      Made to order
                    </span>
                  )}
                </div>
                <Link
                  href={`/contact?product=${encodeURIComponent(product.title)}`}
                  className="inline-block mt-3 text-[11px] tracking-[0.14em] uppercase border-b border-[var(--ds-ink)] pb-0.5 hover:text-[var(--ds-gold)] hover:border-[var(--ds-gold)] transition-colors"
                >
                  Inquire about Product
                </Link>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
