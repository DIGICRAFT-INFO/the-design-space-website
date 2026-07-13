import { getProducts, getSeoEntries, resolveSeo } from "@/services/websiteService";
import SplitText from "@/components/website/SplitText";
import ProductsGrid from "@/components/website/products/ProductsGrid";

export async function generateMetadata() {
  const seo = resolveSeo(await getSeoEntries().catch(() => []), "/products", {
    title: "Products — The Design Space",
    description: "Bespoke artifacts and custom furniture, from seating to lighting to kitchen modules.",
  });
  return { title: seo.title, description: seo.description, keywords: seo.keywords };
}

export default async function ProductsPage() {
  const products = await getProducts().catch(() => []);

  return (
    <>
      <section className="pt-40 md:pt-48 pb-16 md:pb-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-5">Curated Objects</p>
          <SplitText
            text="Bespoke Artifacts & Custom Furniture"
            as="h1"
            className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight max-w-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          />
        </div>
      </section>

      <section className="pb-28 md:pb-40">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <ProductsGrid products={products} />
        </div>
      </section>
    </>
  );
}
