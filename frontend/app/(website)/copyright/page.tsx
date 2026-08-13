import ReactMarkdown from "react-markdown";
import { getSettings } from "@/services/websiteService";
import SplitText from "@/components/website/SplitText";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Copyright & Terms — The Design Space" };

export default async function CopyrightPage() {
  const settings = await getSettings().catch(() => null);
  const content = settings?.legal.copyright_terms;

  return (
    <section className="page-hero-pt pb-16 md:pb-24">
      <div className="max-w-3xl mx-auto px-6 md:px-10">
        <SplitText
          text="Copyright & Terms"
          as="h1"
          className="text-4xl md:text-6xl font-light tracking-tight mb-12"
          style={{ fontFamily: "var(--font-display)" }}
        />
        <div className="ds-prose">
          {content ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <p className="text-[var(--ds-ink-soft)]">Our terms will appear here once published.</p>
          )}
        </div>
      </div>
    </section>
  );
}
