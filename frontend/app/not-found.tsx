import { Fraunces } from "next/font/google";
import ThemeProvider from "@/components/website/ThemeProvider";
import NotFoundContent from "@/components/website/NotFoundContent";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
});

export const metadata = { title: "Page Not Found — The Design Space" };

export default function RootNotFound() {
  return (
    <ThemeProvider>
      <div className={`${fraunces.variable} bg-[var(--ds-bg)] text-[var(--ds-ink)] min-h-screen`}>
        <NotFoundContent />
      </div>
    </ThemeProvider>
  );
}
