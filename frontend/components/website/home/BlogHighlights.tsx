import Link from "next/link";
import FadeIn from "@/components/website/FadeIn";
import RevealImage from "@/components/website/RevealImage";
import { resolveMediaUrl } from "@/lib/media";
import type { WebBlogPost } from "@/services/websiteService";

export default function BlogHighlights({ posts }: { posts: WebBlogPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="max-w-[1600px] mx-auto px-6 md:px-10 py-24 md:py-32">
      <div className="flex items-end justify-between mb-12 md:mb-16">
        <FadeIn>
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-3">Journal</p>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Design notes.
          </h2>
        </FadeIn>
        <Link href="/blog" className="hidden sm:inline-flex text-[11px] tracking-[0.14em] uppercase border-b border-[var(--ds-ink)] pb-1 hover:text-[var(--ds-gold)] hover:border-[var(--ds-gold)] transition-colors">
          Read the Journal
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
        {posts.slice(0, 3).map((post, i) => (
          <FadeIn key={post.id} delay={i * 0.08}>
            <Link href={`/blog/${post.slug}`} className="block group">
              <RevealImage
                src={resolveMediaUrl(post.cover_image) || "/logo.png"}
                alt={post.title}
                className="aspect-[4/3] rounded-sm mb-5"
                cursorLabel="Read"
              />
              {post.category && <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--ds-gold)] mb-2">{post.category}</p>}
              <h3 className="text-lg font-light mb-2 group-hover:text-[var(--ds-gold)] transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                {post.title}
              </h3>
              <p className="text-xs text-[var(--ds-ink-soft)]">{post.read_time_minutes} min read</p>
            </Link>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
