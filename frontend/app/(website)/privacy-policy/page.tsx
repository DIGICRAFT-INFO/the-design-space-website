import ReactMarkdown from "react-markdown";
import { getSettings } from "@/services/websiteService";
import SplitText from "@/components/website/SplitText";

export const metadata = { title: "Privacy Policy — The Design Space" };

export default async function PrivacyPolicyPage() {
  const settings = await getSettings().catch(() => null);
  const content = settings?.legal.privacy_policy;

  return (
    <section className="pt-40 md:pt-48 pb-28 md:pb-40">
      <div className="max-w-3xl mx-auto px-6 md:px-10">
        <SplitText
          text="Privacy Policy"
          as="h1"
          className="text-4xl md:text-6xl font-light tracking-tight mb-12"
          style={{ fontFamily: "var(--font-display)" }}
        />
        <div className="ds-prose">
          {content ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <p className="text-[var(--ds-ink-soft)]">Our privacy policy will appear here once published.</p>
          )}
        </div>
      </div>
    </section>
  );
}
