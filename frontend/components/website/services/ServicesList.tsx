"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media";
import type { WebServicePackage } from "@/services/websiteService";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function ServicesList({ packages }: { packages: WebServicePackage[] }) {
  const [openId, setOpenId] = useState<string | null>(packages[0]?.id ?? null);

  if (packages.length === 0) {
    return <p className="text-[var(--ds-ink-soft)]">Service packages will appear here once published.</p>;
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_1.1fr] gap-10 lg:gap-16">
      {/* List — accordion on mobile, tab-list on desktop */}
      <div>
        {packages.map((pkg) => {
          const open = openId === pkg.id;
          return (
            <div key={pkg.id} className="border-b border-[var(--ds-border)]">
              <button
                onClick={() => setOpenId(open ? null : pkg.id)}
                className="w-full flex items-center justify-between py-6 text-left"
              >
                <div>
                  <h3 className="text-xl md:text-2xl font-light" style={{ fontFamily: "var(--font-display)" }}>
                    {pkg.package_name}
                  </h3>
                  {pkg.price_estimation && (
                    <p className="text-xs text-[var(--ds-gold)] mt-1 tracking-wide">{pkg.price_estimation}</p>
                  )}
                </div>
                <ChevronDown
                  size={18}
                  className={`shrink-0 transition-transform duration-300 lg:hidden ${open ? "rotate-180" : ""}`}
                />
              </button>

              {/* Mobile accordion body */}
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="overflow-hidden lg:hidden"
                  >
                    <PackageBody pkg={pkg} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Desktop detail panel */}
      <div className="hidden lg:block sticky top-28 self-start">
        <AnimatePresence mode="wait">
          {packages.map(
            (pkg) =>
              openId === pkg.id && (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  {pkg.cover_image && (
                    <div className="aspect-[4/3] rounded-sm overflow-hidden mb-6">
                      <img src={resolveMediaUrl(pkg.cover_image)} alt={pkg.package_name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <PackageBody pkg={pkg} />
                </motion.div>
              )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PackageBody({ pkg }: { pkg: WebServicePackage }) {
  return (
    <div className="pb-8 lg:pb-0">
      <p className="text-sm md:text-base text-[var(--ds-ink-soft)] leading-relaxed mb-4">{pkg.scope_summary}</p>
      {pkg.highlights?.length > 0 && (
        <ul className="space-y-2 mb-6">
          {pkg.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className="mt-2 w-1 h-1 rounded-full bg-[var(--ds-gold)] shrink-0" />
              {h}
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/contact?service=${encodeURIComponent(pkg.package_name)}`}
        className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase border-b border-[var(--ds-ink)] pb-1 hover:text-[var(--ds-gold)] hover:border-[var(--ds-gold)] transition-colors"
      >
        Inquire for details
      </Link>
    </div>
  );
}
