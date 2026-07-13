"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import MagneticButton from "./MagneticButton";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Products", href: "/products" },
  { label: "Contact", href: "/contact" },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        className={`fixed top-0 inset-x-0 z-50 transition-colors duration-500 ${
          scrolled || menuOpen
            ? "bg-[var(--ds-bg)]/80 backdrop-blur-md border-b border-[var(--ds-border)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-[1600px] mx-auto flex items-center justify-between px-5 md:px-10 h-[76px]">
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="The Design Space — Home">
            <img src="/logo2.png" alt="The Design Space Logo" className="h-14 w-auto object-contain" />
          </Link>

          <nav className="hidden lg:flex items-center gap-9">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-[12px] tracking-[0.14em] uppercase font-medium transition-colors ${
                    active ? "text-[var(--ds-gold)]" : "text-[var(--ds-ink)] hover:text-[var(--ds-gold)]"
                  }`}
                >
                  {link.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-1.5 left-0 right-0 h-[1px] bg-[var(--ds-gold)]"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle className="hidden sm:flex" />
            <MagneticButton
              as="a"
              href="/contact"
              data-cursor="Enquire"
              className="hidden lg:inline-flex items-center px-5 py-2.5 border border-[var(--ds-ink)] text-[11px] tracking-[0.14em] uppercase font-medium text-[var(--ds-ink)] hover:bg-[var(--ds-ink)] hover:text-[var(--ds-bg)] transition-colors rounded-full"
            >
              Enquire
            </MagneticButton>
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden flex items-center justify-center w-9 h-9 text-[var(--ds-ink)]"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="fixed inset-0 z-40 bg-[var(--ds-bg)] flex flex-col justify-center px-8 lg:hidden"
          >
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.06 }}
                >
                  <Link
                    href={link.href}
                    className="block py-3 text-4xl font-light tracking-tight text-[var(--ds-ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
