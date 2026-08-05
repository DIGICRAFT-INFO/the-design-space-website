import Link from "next/link";
import { FaInstagram, FaLinkedinIn, FaFacebookF, FaYoutube } from "react-icons/fa";
import type { WebSettings } from "@/services/websiteService";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "PROJECTS", href: "/products" },
  { label: "Contact", href: "/contact" },
];

const MORE_LINKS = [
  { label: "Journal", href: "/blog" },
  { label: "Careers", href: "/careers" },
  { label: "Sitemap", href: "/sitemap" },
];

export default function Footer({ settings }: { settings?: WebSettings | null }) {
  const contact = settings?.contact;
  const social = settings?.social_links;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--ds-bg-alt)] border-t border-[var(--ds-border)] text-[var(--ds-ink)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-14 md:py-16 grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            {/* Light theme logo */}
            <img
              src="/TheDesignSpace_Navbarlogo.png"
              alt="The Design Space Logo"
              className="block dark:hidden h-12 md:h-14 w-[120px] md:w-[160px] object-contain"
            />
            {/* Dark theme logo */}
            <img
              src="/tds_white_logo.png"
              alt="The Design Space Logo"
              className="hidden dark:block h-12 md:h-14 w-[120px] md:w-[160px] object-contain"
            />
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-[var(--ds-ink-soft)]">
            {settings?.footer_text ||
              "Bespoke interior design for residences and commercial spaces that favour quiet, considered luxury over noise."}
          </p>
          <div className="flex items-center gap-4 mt-5">
            {social?.instagram && (
              <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-[var(--ds-gold)] transition-colors">
                <FaInstagram size={16} />
              </a>
            )}
            {social?.linkedin && (
              <a href={social.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover:text-[var(--ds-gold)] transition-colors">
                <FaLinkedinIn size={16} />
              </a>
            )}
            {social?.facebook && (
              <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-[var(--ds-gold)] transition-colors">
                <FaFacebookF size={16} />
              </a>
            )}
            {(social as any)?.youtube && (
              <a href={(social as any).youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="hover:text-[var(--ds-gold)] transition-colors">
                <FaYoutube size={16} />
              </a>
            )}
          </div>
        </div>

        <div className="col-span-1">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-3 md:mb-4">Navigate</p>
          <ul className="space-y-2">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm hover:text-[var(--ds-gold)] transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-1">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-3 md:mb-4">More</p>
          <ul className="space-y-2">
            {MORE_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm hover:text-[var(--ds-gold)] transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-2 md:col-span-1">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-3 md:mb-4">Studio</p>
          <ul className="space-y-2 text-sm text-[var(--ds-ink-soft)]">
            {contact?.office_address && <li className="leading-relaxed">{contact.office_address}</li>}
            {contact?.phone && (
              <li>
                <a href={`tel:${contact.phone}`} className="hover:text-[var(--ds-gold)] transition-colors">
                  {contact.phone}
                </a>
              </li>
            )}
            {contact?.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="hover:text-[var(--ds-gold)] transition-colors break-all">
                  {contact.email}
                </a>
              </li>
            )}
            {contact?.working_hours && <li>{contact.working_hours}</li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--ds-border)]">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-4 md:py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] tracking-[0.08em] text-[var(--ds-ink-soft)]">
          <span>© {year} The Design Space. All rights reserved.</span>
          <div className="flex items-center gap-4 md:gap-5">
            <Link href="/privacy-policy" className="hover:text-[var(--ds-gold)] transition-colors">Privacy Policy</Link>
            <Link href="/copyright" className="hover:text-[var(--ds-gold)] transition-colors">Copyright & Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
