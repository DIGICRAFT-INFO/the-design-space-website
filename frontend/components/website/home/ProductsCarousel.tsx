import Link from "next/link";
import FadeIn from "@/components/website/FadeIn";
import { resolveMediaUrl } from "@/lib/media";
import type { WebProduct } from "@/services/websiteService";

export default function ProductsCarousel({ products }: { products: WebProduct[] }) {
  if (products.length === 0) return null;

  // Duplicate the list so the marquee loop is seamless.
  const track = [...products, ...products];

  return (
    <section className="py-24 md:py-32 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 mb-12 md:mb-16 flex items-end justify-between">
        <FadeIn>
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-3">Curated Objects</p>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Bespoke pieces.
          </h2>
        </FadeIn>
        <Link href="/products" className="hidden sm:inline-flex text-[11px] tracking-[0.14em] uppercase border-b border-[var(--ds-ink)] pb-1 hover:text-[var(--ds-gold)] hover:border-[var(--ds-gold)] transition-colors">
          View All Products
        </Link>
      </div>

      <div className="flex gap-6 ds-marquee-track w-max">
        {track.map((product, i) => (
          <Link
            href="/products"
            key={`${product.id}-${i}`}
            className="w-[280px] shrink-0 group"
          >
            <div className="aspect-[4/5] rounded-sm overflow-hidden bg-[var(--ds-bg-alt)] mb-4">
              <img
                src={resolveMediaUrl(product.item_images?.[0]?.file_url) || "/logo.png"}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                draggable={false}
              />
            </div>
            <p className="text-sm font-medium">{product.title}</p>
            <p className="text-xs text-[var(--ds-ink-soft)]">{product.material_specs}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
