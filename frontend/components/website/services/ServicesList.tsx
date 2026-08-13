"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { resolveMediaUrl } from "@/lib/media";
import ZoomableImage from "@/components/website/ZoomableImage";
import ServiceInquiryModal from "@/components/website/services/ServiceInquiryModal";
import FadeIn from "@/components/website/FadeIn";
import type { WebServicePackage } from "@/services/websiteService";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const TIER_COLORS: Record<string, string> = {
  residential:  "bg-amber-50   text-amber-700  border-amber-200",
  commercial:   "bg-sky-50     text-sky-700    border-sky-200",
  consultation: "bg-violet-50  text-violet-700 border-violet-200",
  turnkey:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  other:        "bg-[var(--ds-bg-alt)] text-[var(--ds-ink-soft)] border-[var(--ds-border)]",
};

export default function ServicesList({ packages }: { packages: WebServicePackage[] }) {
  const [openId, setOpenId] = useState<string | null>(packages[0]?.id ?? null);
  const [inquiryService, setInquiryService] = useState<{ name: string; id: string } | null>(null);

  if (packages.length === 0) {
    return (
      <p className="text-[var(--ds-ink-soft)]">
        Service packages will appear here once published.
      </p>
    );
  }

  const active = packages.find((p) => p.id === openId) ?? packages[0];

  return (
    <>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_1.15fr] gap-0 lg:gap-14 xl:gap-20">

        {/* ── Left: service list ──────────────────────────────────────── */}
        <div className="divide-y divide-[var(--ds-border)]">
          {packages.map((pkg, idx) => {
            const isOpen = openId === pkg.id;
            const tierClass = TIER_COLORS[pkg.tier_classification] ?? TIER_COLORS.other;
            const tierLabel = pkg.tier_label || pkg.tier_classification;

            return (
              <div key={pkg.id}>
                <button
                  onClick={() => setOpenId(isOpen ? null : pkg.id)}
                  className="w-full flex items-center justify-between py-5 md:py-6 text-left group"
                  aria-expanded={isOpen}
                >
                  {/* Number + name */}
                  <div className="flex items-start gap-4 min-w-0">
                    <span
                      className={`text-[11px] font-bold tabular-nums mt-1 shrink-0 transition-colors ${
                        isOpen ? "text-[var(--ds-gold)]" : "text-[var(--ds-ink-soft)] group-hover:text-[var(--ds-gold)]"
                      }`}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3
                        className={`text-lg md:text-xl lg:text-2xl font-light tracking-tight transition-colors ${
                          isOpen ? "text-[var(--ds-ink)]" : "text-[var(--ds-ink)] group-hover:text-[var(--ds-gold)]"
                        }`}
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {pkg.package_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className={`inline-block text-[9px] font-semibold tracking-[0.12em] uppercase border rounded-full px-2 py-0.5 ${tierClass}`}
                        >
                          {tierLabel}
                        </span>
                        {pkg.price_estimation && (
                          <span className="text-[11px] text-[var(--ds-gold)] tracking-wide">
                            {pkg.price_estimation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Arrow icon */}
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <motion.div
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="hidden lg:flex"
                    >
                      <ArrowRight
                        size={16}
                        className={`transition-colors ${
                          isOpen ? "text-[var(--ds-gold)]" : "text-[var(--ds-ink-soft)] group-hover:text-[var(--ds-gold)]"
                        }`}
                      />
                    </motion.div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="lg:hidden"
                    >
                      <ChevronDown
                        size={16}
                        className="text-[var(--ds-ink-soft)] group-hover:text-[var(--ds-gold)] transition-colors"
                      />
                    </motion.div>
                  </div>
                </button>

                {/* Mobile accordion */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="overflow-hidden lg:hidden"
                    >
                      <PackageDetail
                        pkg={pkg}
                        onInquire={() => setInquiryService({ name: pkg.package_name, id: pkg.id })}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* ── Right: sticky detail panel (desktop only) ─────────────── */}
        <div className="hidden lg:block">
          <div className="sticky top-28 self-start">
            <AnimatePresence mode="wait">
              {packages.map(
                (pkg) =>
                  openId === pkg.id && (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.4, ease: EASE }}
                    >
                      {/* Cover image */}
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-7 shadow-sm">
                        <ZoomableImage
                          src={resolveMediaUrl(pkg.cover_image) || "/logo.png"}
                          alt={pkg.package_name}
                          className="w-full h-full"
                        />
                        {/* Tier badge on image */}
                        {pkg.tier_classification && (
                          <span
                            className={`absolute top-4 left-4 text-[9px] font-bold tracking-[0.14em] uppercase border rounded-full px-2.5 py-1 backdrop-blur-sm ${
                              TIER_COLORS[pkg.tier_classification] ?? TIER_COLORS.other
                            }`}
                          >
                            {pkg.tier_label || pkg.tier_classification}
                          </span>
                        )}
                      </div>

                      <PackageDetail
                        pkg={pkg}
                        onInquire={() => setInquiryService({ name: pkg.package_name, id: pkg.id })}
                      />
                    </motion.div>
                  )
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      {inquiryService && (
        <ServiceInquiryModal
          serviceName={inquiryService.name}
          serviceId={inquiryService.id}
          onClose={() => setInquiryService(null)}
        />
      )}
    </>
  );
}

// ── Package detail (shared between mobile accordion and desktop panel) ──────

function PackageDetail({
  pkg,
  onInquire,
}: {
  pkg: WebServicePackage;
  onInquire: () => void;
}) {
  return (
    <div className="pb-8 lg:pb-0">
      {/* Mobile cover image */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-5 lg:hidden shadow-sm">
        <ZoomableImage
          src={resolveMediaUrl(pkg.cover_image) || "/logo.png"}
          alt={pkg.package_name}
          className="w-full h-full"
        />
      </div>

      {/* Scope summary */}
      {pkg.scope_summary && (
        <p className="text-sm md:text-base text-[var(--ds-ink-soft)] leading-relaxed mb-5">
          {pkg.scope_summary}
        </p>
      )}

      {/* Highlights */}
      {pkg.highlights?.length > 0 && (
        <ul className="space-y-2.5 mb-7">
          {pkg.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[var(--ds-ink)]">
              <span className="mt-[7px] w-1 h-1 rounded-full bg-[var(--ds-gold)] shrink-0" />
              {h}
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <FadeIn>
        <button
          onClick={onInquire}
          className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[var(--ds-ink)] text-[var(--ds-bg)] text-[11px] tracking-[0.14em] uppercase font-semibold hover:bg-[var(--ds-gold)] transition-colors duration-300"
        >
          <Sparkles size={13} className="opacity-80" />
          Inquire for Details
          <ArrowRight
            size={13}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </button>
      </FadeIn>
    </div>
  );
}
