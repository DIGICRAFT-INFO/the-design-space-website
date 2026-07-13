import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import ThemeProvider from "@/components/website/ThemeProvider";
import SmoothScroll from "@/components/website/SmoothScroll";
import CustomCursor from "@/components/website/CustomCursor";
import Navbar from "@/components/website/Navbar";
import Footer from "@/components/website/Footer";
import { getSettings } from "@/services/websiteService";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "The Design Space — Luxury Interior Design",
  description:
    "Bespoke residential and commercial interior design — quiet, considered luxury from first sketch to final styling.",
};

export default async function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings().catch(() => null);

  return (
    <ThemeProvider>
      <div
        className={`${fraunces.variable} bg-[var(--ds-bg)] text-[var(--ds-ink)] min-h-screen transition-colors duration-500`}
      >
        <SmoothScroll>
          <CustomCursor />
          <Navbar />
          <main>{children}</main>
          <Footer settings={settings} />
        </SmoothScroll>
      </div>
    </ThemeProvider>
  );
}
