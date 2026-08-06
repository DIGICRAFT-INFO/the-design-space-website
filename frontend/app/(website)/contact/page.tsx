import { Suspense } from "react";
import { getSettings, getSeoEntries, resolveSeo } from "@/services/websiteService";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";
import ContactForm from "@/components/website/contact/ContactForm";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const HARDCODED_EMBED =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1426.5138909160262!2d81.66040807035371!3d21.223761201202386!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a28dd353fee3629%3A0xf1c1546164b2c99b!2sThe%20Design%20Space!5e0!3m2!1sen!2sin!4v1785923958664!5m2!1sen!2sin";
  const rawMapUrl = contact?.map_embed_url || "";
  const mapEmbedUrl = rawMapUrl.includes("/maps/embed")
    ? rawMapUrl
    : HARDCODED_EMBED;

  return (
    <>
      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <section className="pt-32 md:pt-40 pb-10 md:pb-14 px-6 md:px-10 max-w-[1600px] mx-auto">
        <p className="text-[11px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-4">
          Get In Touch
        </p>
        <SplitText
          text="Begin Your Space Transformation"
          as="h1"
          className="text-3xl sm:text-4xl md:text-6xl font-light tracking-tight max-w-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        />
      </section>

      {/* ── Main grid: Form left, Info right ─────────────────────────────── */}
      <section className="px-6 md:px-10 pb-12 md:pb-20 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* Form */}
          <div>
            <Suspense fallback={<div className="h-64" />}>
              <ContactForm />
            </Suspense>
          </div>

          {/* Info card */}
          <FadeIn>
            <div className="bg-[var(--ds-bg-alt)] border border-[var(--ds-border)] rounded-2xl p-6 md:p-8 space-y-5">
              <InfoRow icon={<MapPin size={15} />} label="Studio Address"
                value={contact?.office_address || "Raipur, Chhattisgarh 492001"} />
              <InfoRow icon={<Phone size={15} />} label="Phone"
                value={contact?.phone || "—"} href={contact?.phone ? `tel:${contact.phone}` : undefined} />
              <InfoRow icon={<Mail size={15} />} label="Email"
                value={contact?.email || "—"} href={contact?.email ? `mailto:${contact.email}` : undefined} />
              <InfoRow icon={<Clock size={15} />} label="Working Hours"
                value={contact?.working_hours || "Mon – Sat, 10:00 AM – 7:00 PM"} />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Full-width map ────────────────────────────────────────────────── */}
      <section className="px-4 md:px-10 pb-20 md:pb-32">
        <FadeIn>
          <div
            className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-[var(--ds-border)]"
            style={{ height: "clamp(280px, 55vw, 600px)" }}
          >
            <iframe
              src={mapEmbedUrl}
              className="absolute inset-0 w-full h-full"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title="The Design Space — Studio Location"
            />
            {/* Floating chip */}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-[var(--ds-bg)]/90 backdrop-blur-md border border-[var(--ds-border)] rounded-full px-3 py-1.5 shadow-md">
              <MapPin size={12} className="text-[var(--ds-gold)] shrink-0" />
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--ds-ink)] truncate max-w-[180px]">
                {contact?.office_address
                  ? contact.office_address.split(",").slice(-2).join(",").trim()
                  : "The Design Space, Raipur"}
              </span>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}

function InfoRow({
  icon, label, value, href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[var(--ds-gold)] shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-0.5">{label}</p>
        <p className="text-sm md:text-base leading-relaxed text-[var(--ds-ink)]">{value}</p>
      </div>
    </div>
  );
  return href ? (
    <a href={href} className="block hover:opacity-70 transition-opacity">{content}</a>
  ) : (
    <div>{content}</div>
  );
}
