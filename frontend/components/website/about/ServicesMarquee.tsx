"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { WebServicePackage } from "@/services/websiteService";

const TIER_BG: Record<string, string> = {
  residential: "bg-[#FDF3E3]",
  commercial:  "bg-[#EEF2FF]",
  turnkey:     "bg-[#F0FDF4]",
  consultation:"bg-[#FFF7ED]",
  other:       "bg-[#F5F5F5]",
};

const TIER_DOT: Record<string, string> = {
  residential: "bg-[#C8922A]",
  commercial:  "bg-[#4F46E5]",
  turnkey:     "bg-[#16A34A]",
  consultation:"bg-[#EA580C]",
  other:       "bg-[#9A8F82]",
};

interface Props {
  services: WebServicePackage[];
}

export default function ServicesMarquee({ services }: Props) {
  const prefersReduced = useReducedMotion();

  if (!services || services.length === 0) return null;

  // Duplicate cards so the loop is seamless
  const items = [...services, ...services, ...services];

  return (
    <section className="bg-[#1C1C1C] py-16 md:py-20 overflow-hidden">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 mb-10 flex items-end justify-between">
        <div>
          <span className="inline-block text-[11px] tracking-[0.3em] uppercase text-[#C8922A] mb-3 px-3 py-1 bg-[#C8922A]/10 rounded-full">
            What We Do
          </span>
          <h2
            className="text-2xl md:text-4xl font-light tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Our Services
          </h2>
        </div>
        <Link
          href="/services"
          className="hidden md:inline-flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-white/60 hover:text-[#C8922A] border-b border-white/20 hover:border-[#C8922A] pb-0.5 transition-colors"
        >
          View All Services →
        </Link>
      </div>

      {/* Marquee track */}
      <div className="relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#1C1C1C] to-transparent z-10 pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#1C1C1C] to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex gap-5 w-max"
          animate={prefersReduced ? {} : { x: ["0%", "-33.333%"] }}
          transition={{
            duration: 28,
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop",
          }}
          style={{ willChange: "transform" }}
        >
          {items.map((service, idx) => (
            <Link
              key={`${service.id}-${idx}`}
              href="/services"
              className={`group flex-shrink-0 w-[280px] md:w-[320px] rounded-2xl p-6 border border-white/5 hover:border-[#C8922A]/40 transition-all duration-300 cursor-pointer ${TIER_BG[service.tier_classification] || "bg-[#F5F5F5]"}`}
            >
              {/* Dot + tier */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`w-2 h-2 rounded-full ${TIER_DOT[service.tier_classification] || "bg-[#9A8F82]"}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6259]">
                  {service.tier_label || service.tier_classification}
                </span>
              </div>

              {/* Service name */}
              <h3
                className="text-[18px] font-semibold text-[#1C1C1C] leading-snug mb-3 group-hover:text-[#C8922A] transition-colors"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {service.package_name}
              </h3>

              {/* Summary */}
              {service.scope_summary && (
                <p className="text-[12px] text-[#6B6259] leading-relaxed line-clamp-2">
                  {service.scope_summary}
                </p>
              )}

              {/* Highlights pills */}
              {service.highlights && service.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {service.highlights.slice(0, 3).map((h, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-1 bg-white/60 text-[#6B6259] rounded-full border border-[#EDE8DF]"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}

              {/* Price */}
              {service.price_estimation && (
                <p className="mt-4 text-[11px] font-bold text-[#C8922A] tracking-wider">
                  {service.price_estimation}
                </p>
              )}
            </Link>
          ))}
        </motion.div>
      </div>

      {/* Mobile CTA */}
      <div className="md:hidden mt-8 text-center">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-white/60 hover:text-[#C8922A] border-b border-white/20 hover:border-[#C8922A] pb-0.5 transition-colors"
        >
          View All Services →
        </Link>
      </div>
    </section>
  );
}
