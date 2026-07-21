import { Suspense } from "react";
import { getSettings, getSeoEntries, resolveSeo } from "@/services/websiteService";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";
import ContactForm from "@/components/website/contact/ContactForm";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

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
    <>
      {/* ── Top: Form + Info ─────────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col lg:flex-row pt-24 lg:pt-0">
        {/* Left — form */}
        <div className="lg:w-1/2 flex items-center px-6 md:px-10 lg:px-16 py-16 lg:py-0">
          <div className="w-full max-w-xl mx-auto lg:mx-0">
            <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-5">
              Get In Touch
            </p>
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

        {/* Right — studio info card over map */}
        <div className="lg:w-1/2 relative min-h-[480px] lg:min-h-0 bg-[var(--ds-bg-alt)] flex items-center">
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
            <FadeIn className="bg-[var(--ds-bg)]/90 backdrop-blur-sm border border-[var(--ds-border)] rounded-2xl p-8 space-y-6 shadow-xl">
              <InfoRow icon={<MapPin size={15} />} label="Studio Address" value={contact?.office_address || "Address to be added via the CMS."} />
              <InfoRow icon={<Phone size={15} />} label="Phone" value={contact?.phone || "—"} />
              <InfoRow icon={<Mail size={15} />} label="Email" value={contact?.email || "—"} />
              <InfoRow icon={<Clock size={15} />} label="Working Hours" value={contact?.working_hours || "Mon – Sat, 10:00 AM – 7:00 PM"} />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Big full-width map section ───────────────────────────────────── */}
      <section className="w-full px-4 md:px-10 pb-16 md:pb-24">
        <FadeIn>
          <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-[var(--ds-border)]"
               style={{ height: "clamp(320px, 50vw, 620px)" }}>

            {contact?.map_embed_url ? (
              <iframe
                src={contact.map_embed_url}
                className="absolute inset-0 w-full h-full"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                title="The Design Space — Studio Location"
              />
            ) : (
              /* Placeholder when no map URL is configured */
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--ds-bg-alt)] gap-4">
                <MapPin size={40} className="text-[var(--ds-gold)] opacity-60" />
                <p className="text-[13px] text-[var(--ds-ink-soft)] font-medium tracking-wide">
                  Map will appear here once configured in Web CMS → Settings
                </p>
              </div>
            )}

            {/* Floating label chip */}
            <div className="absolute bottom-5 left-5 z-10 flex items-center gap-2 bg-[var(--ds-bg)]/90 backdrop-blur-md border border-[var(--ds-border)] rounded-full px-4 py-2 shadow-lg">
              <MapPin size={13} className="text-[var(--ds-gold)]" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-[var(--ds-ink)]">
                {contact?.office_address
                  ? contact.office_address.split(",").slice(-2).join(",").trim()
                  : "The Design Space Studio"}
              </span>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[var(--ds-gold)] shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-1">{label}</p>
        <p className="text-sm md:text-base leading-relaxed">{value}</p>
      </div>
    </div>
  );
}
