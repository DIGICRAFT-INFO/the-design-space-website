import { Suspense } from "react";
import { getSettings, getSeoEntries, resolveSeo } from "@/services/websiteService";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";
import ContactForm from "@/components/website/contact/ContactForm";

export async function generateMetadata() {
  const seo = resolveSeo(await getSeoEntries().catch(() => []), "/contact", {
    title: "Contact — The Design Space",
    description: "Begin your space transformation — get in touch with The Design Space.",
  });
  return { title: seo.title, description: seo.description, keywords: seo.keywords };
}

export default async function ContactPage() {
  const settings = await getSettings().catch(() => null);
  const contact = settings?.contact;

  return (
    <section className="min-h-screen flex flex-col lg:flex-row pt-24 lg:pt-0">
      {/* Left — form */}
      <div className="lg:w-1/2 flex items-center px-6 md:px-10 lg:px-16 py-16 lg:py-0">
        <div className="w-full max-w-xl mx-auto lg:mx-0">
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-5">Get In Touch</p>
          <SplitText
            text="Begin Your Space Transformation"
            as="h1"
            className="text-3xl md:text-5xl font-light tracking-tight mb-10"
            style={{ fontFamily: "var(--font-display)" }}
          />
          <Suspense fallback={<div className="h-64" />}>
            <ContactForm />
          </Suspense>
        </div>
      </div>

      {/* Right — studio info */}
      <div className="lg:w-1/2 relative bg-[var(--ds-bg-alt)] flex items-center">
        {contact?.map_embed_url ? (
          <iframe
            src={contact.map_embed_url}
            className="absolute inset-0 w-full h-full grayscale contrast-125 opacity-80"
            loading="lazy"
            title="Studio location"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--ds-border),transparent_60%)]" />
        )}
        <div className="relative w-full max-w-md mx-auto px-6 md:px-10 py-16 lg:py-0">
          <FadeIn className="bg-[var(--ds-bg)]/90 backdrop-blur-sm border border-[var(--ds-border)] rounded-sm p-8 space-y-6">
            <InfoRow label="Studio Address" value={contact?.office_address || "Address to be added via the CMS."} />
            <InfoRow label="Phone" value={contact?.phone || "—"} />
            <InfoRow label="Email" value={contact?.email || "—"} />
            <InfoRow label="Working Hours" value={contact?.working_hours || "Mon – Sat, 10:00 AM – 7:00 PM"} />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-1.5">{label}</p>
      <p className="text-sm md:text-base">{value}</p>
    </div>
  );
}
