"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";
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
  const [hovered, setHovered] = useState<string | null>(null);

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
              className="relative"
            >
              <img
                src="/TheDesignSpace_Navbarlogo.png"
                alt="The Design Space Logo"
                className="h-12 md:h-14 w-auto object-contain relative z-10 transition-transform duration-300"
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
          <motion.div
            initial={{ clipPath: "circle(0% at calc(100% - 40px) 38px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 40px) 38px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 40px) 38px)" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="fixed inset-0 z-40 bg-[var(--ds-bg)] flex flex-col justify-center px-8 lg:hidden"
          >
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link, i) => {
                const active = pathname === link.href;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 30, opacity: 0 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.06 }}
                    className="overflow-hidden"
                  >
                    <Link
                      href={link.href}
                      className={`group flex items-baseline gap-3 py-3 text-4xl sm:text-5xl font-semibold tracking-tight transition-colors ${
                        active ? "text-[var(--ds-gold)]" : "text-[var(--ds-ink)]"
                      }`}
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      <span className="text-xs font-sans font-semibold tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="group-hover:translate-x-2 transition-transform duration-300 inline-block">
                        {link.label}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.15 + NAV_LINKS.length * 0.06 }}
              className="mt-10 flex items-center gap-4"
            >
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--ds-ink)] text-[11px] tracking-[0.14em] uppercase font-semibold text-[var(--ds-ink)] rounded-full"
              >
                Enquire <ArrowUpRight size={14} />
              </Link>
              <ThemeToggle />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { motion, AnimatePresence } from "framer-motion";
// import { Menu, X } from "lucide-react";
// import ThemeToggle from "./ThemeToggle";
// import MagneticButton from "./MagneticButton";

// const NAV_LINKS = [
//   { label: "Home", href: "/" },
//   { label: "About", href: "/about" },
//   { label: "Services", href: "/services" },
//   { label: "Portfolio", href: "/portfolio" },
//   { label: "Products", href: "/products" },
//   { label: "Contact", href: "/contact" },
// ];

// const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// export default function Navbar() {
//   const pathname = usePathname();
//   const [scrolled, setScrolled] = useState(false);
//   const [menuOpen, setMenuOpen] = useState(false);

//   useEffect(() => {
//     const onScroll = () => setScrolled(window.scrollY > 40);
//     onScroll();
//     window.addEventListener("scroll", onScroll, { passive: true });
//     return () => window.removeEventListener("scroll", onScroll);
//   }, []);

//   useEffect(() => setMenuOpen(false), [pathname]);

//   useEffect(() => {
//     document.documentElement.style.overflow = menuOpen ? "hidden" : "";
//   }, [menuOpen]);

//   return (
//     <>
//       <motion.header
//         initial={{ y: -100 }}
//         animate={{ y: 0 }}
//         transition={{ duration: 0.8, ease: EASE }}
//         className={`fixed top-0 inset-x-0 z-50 transition-colors duration-500 ${
//           scrolled || menuOpen
//             ? "bg-[var(--ds-bg)]/80 backdrop-blur-md border-b border-[var(--ds-border)]"
//             : "bg-transparent border-b border-transparent"
//         }`}
//       >
//         <div className="max-w-[1600px] mx-auto flex items-center justify-between px-5 md:px-10 h-[76px]">
//           <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="The Design Space — Home">
//             <img src="/logo2.png" alt="The Design Space Logo" className="h-14 w-auto object-contain" />
//           </Link>

//           <nav className="hidden lg:flex items-center gap-9">
//             {NAV_LINKS.map((link) => {
//               const active = pathname === link.href;
//               return (
//                 <Link
//                   key={link.href}
//                   href={link.href}
//                   className={`relative text-[12px] tracking-[0.14em] uppercase font-medium transition-colors ${
//                     active ? "text-[var(--ds-gold)]" : "text-[var(--ds-ink)] hover:text-[var(--ds-gold)]"
//                   }`}
//                 >
//                   {link.label}
//                   {active && (
//                     <motion.span
//                       layoutId="nav-underline"
//                       className="absolute -bottom-1.5 left-0 right-0 h-[1px] bg-[var(--ds-gold)]"
//                     />
//                   )}
//                 </Link>
//               );
//             })}
//           </nav>

//           <div className="flex items-center gap-3">
//             <ThemeToggle className="hidden sm:flex" />
//             <MagneticButton
//               as="a"
//               href="/contact"
//               data-cursor="Enquire"
//               className="hidden lg:inline-flex items-center px-5 py-2.5 border border-[var(--ds-ink)] text-[11px] tracking-[0.14em] uppercase font-medium text-[var(--ds-ink)] hover:bg-[var(--ds-ink)] hover:text-[var(--ds-bg)] transition-colors rounded-full"
//             >
//               Enquire
//             </MagneticButton>
//             <button
//               type="button"
//               aria-label="Toggle menu"
//               onClick={() => setMenuOpen((v) => !v)}
//               className="lg:hidden flex items-center justify-center w-9 h-9 text-[var(--ds-ink)]"
//             >
//               {menuOpen ? <X size={22} /> : <Menu size={22} />}
//             </button>
//           </div>
//         </div>
//       </motion.header>

//       <AnimatePresence>
//         {menuOpen && (
//           <motion.div
//             initial={{ clipPath: "inset(0 0 100% 0)" }}
//             animate={{ clipPath: "inset(0 0 0% 0)" }}
//             exit={{ clipPath: "inset(0 0 100% 0)" }}
//             transition={{ duration: 0.6, ease: EASE }}
//             className="fixed inset-0 z-40 bg-[var(--ds-bg)] flex flex-col justify-center px-8 lg:hidden"
//           >
//             <nav className="flex flex-col gap-2">
//               {NAV_LINKS.map((link, i) => (
//                 <motion.div
//                   key={link.href}
//                   initial={{ y: 40, opacity: 0 }}
//                   animate={{ y: 0, opacity: 1 }}
//                   transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.06 }}
//                 >
//                   <Link
//                     href={link.href}
//                     className="block py-3 text-4xl font-light tracking-tight text-[var(--ds-ink)]"
//                     style={{ fontFamily: "var(--font-display)" }}
//                   >
//                     {link.label}
//                   </Link>
//                 </motion.div>
//               ))}
//             </nav>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </>
//   );
// }
