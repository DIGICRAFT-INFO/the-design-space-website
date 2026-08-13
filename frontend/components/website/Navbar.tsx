"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import MagneticButton from "./MagneticButton";

const BASE_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Journal", href: "/blog" },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Navbar({ productsNavLabel }: { productsNavLabel?: string }) {
  // Build nav links — insert Designs/Products link only when label is set
  const NAV_LINKS = productsNavLabel
    ? [
        ...BASE_NAV_LINKS.slice(0, 4),
        { label: productsNavLabel, href: "/products" },
        ...BASE_NAV_LINKS.slice(4),
      ]
    : BASE_NAV_LINKS;
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 25,
    restDelta: 0.001,
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setScrolled(v > 0.01);
  });

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <>
      {/* Scroll progress bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 inset-x-0 h-[2px] bg-[var(--ds-gold)] origin-left z-[60]"
      />

      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
        className={`fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled || menuOpen
            ? "bg-[var(--ds-bg)]/70 backdrop-blur-xl border-b border-[var(--ds-border)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <motion.div
          animate={{ height: scrolled ? 66 : 76 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="max-w-[1600px] mx-auto flex items-center justify-between px-5 md:px-10"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group relative"
            aria-label="The Design Space — Home"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: EASE }}
              whileHover={{ scale: 1.05, rotate: -2 }}
              className="relative flex items-center"
            >
              <img
                src={isDark ? "/tds_white_logo.png" : "/TheDesignSpace_Navbarlogo.png"}
                alt="The Design Space Logo"
                className={`object-contain relative z-10 transition-all duration-300 ${
                  isDark
                    ? "h-16 md:h-20 w-auto"
                    : "h-12 md:h-14 w-auto max-w-[200px] md:max-w-[240px]"
                }`}
              />
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[var(--ds-gold)]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              />
            </motion.div>
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden lg:flex items-center gap-1 relative"
            onMouseLeave={() => setHovered(null)}
          >
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={() => setHovered(link.href)}
                  className={`relative px-4 py-2 text-[12px] tracking-[0.14em] uppercase font-semibold transition-colors z-10 ${
                    active ? "text-[var(--ds-gold)]" : "text-[var(--ds-ink)] hover:text-[var(--ds-gold)]"
                  }`}
                >
                  {(hovered === link.href || (!hovered && active)) && (
                    <motion.span
                      layoutId="nav-hover-bg"
                      className="absolute inset-0 -z-10 rounded-full bg-[var(--ds-ink)]/[0.05]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  {link.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-0 left-4 right-4 h-[1.5px] bg-[var(--ds-gold)]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ThemeToggle className="hidden sm:flex" />
            <MagneticButton
              as="a"
              href="/contact"
              data-cursor="Enquire"
              className="hidden lg:inline-flex items-center gap-1.5 px-5 py-2.5 border border-[var(--ds-ink)] text-[11px] tracking-[0.14em] uppercase font-semibold text-[var(--ds-ink)] hover:bg-[var(--ds-ink)] hover:text-[var(--ds-bg)] transition-colors rounded-full overflow-hidden group"
            >
              <span>Enquire</span>
              <ArrowUpRight
                size={13}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </MagneticButton>

            <motion.button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((v) => !v)}
              whileTap={{ scale: 0.9 }}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full text-[var(--ds-ink)] hover:bg-[var(--ds-ink)]/[0.06] transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={menuOpen ? "close" : "menu"}
                  initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="flex items-center justify-center"
                >
                  {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
              onClick={() => setMenuOpen(false)}
            />

            <motion.div
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className={`fixed inset-x-0 z-40 lg:hidden bg-[var(--ds-bg)]/95 backdrop-blur-xl border-b border-[var(--ds-border)] shadow-xl ${
                scrolled ? "top-[66px]" : "top-[76px]"
              }`}
            >
              <div className="max-w-[1600px] mx-auto px-5 py-4">
                <nav className="grid grid-cols-2 gap-1">
                  {NAV_LINKS.map((link, i) => {
                    const active = pathname === link.href;
                    return (
                      <motion.div
                        key={link.href}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.25, ease: EASE, delay: i * 0.04 }}
                      >
                        <Link
                          href={link.href}
                          className={`group flex items-center gap-2.5 px-3 py-3 rounded-xl text-[13px] font-semibold tracking-wide transition-all ${
                            active
                              ? "bg-[var(--ds-gold)]/10 text-[var(--ds-gold)]"
                              : "text-[var(--ds-ink)] hover:bg-[var(--ds-ink)]/[0.05] hover:text-[var(--ds-gold)]"
                          }`}
                        >
                          <span className={`text-[10px] font-bold tracking-widest tabular-nums ${active ? "opacity-60" : "opacity-30 group-hover:opacity-60"} transition-opacity`}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{link.label}</span>
                          {active && (
                            <motion.span
                              layoutId="mobile-active-dot"
                              className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--ds-gold)]"
                            />
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="mt-3 pt-3 border-t border-[var(--ds-border)] flex items-center justify-between"
                >
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--ds-gold)] text-white text-[11px] tracking-[0.12em] uppercase font-bold rounded-full hover:bg-[var(--ds-gold)]/90 transition-colors"
                  >
                    Enquire <ArrowUpRight size={13} />
                  </Link>
                  <ThemeToggle />
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}