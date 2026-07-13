"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media";
import RevealImage from "@/components/website/RevealImage";
import FadeIn from "@/components/website/FadeIn";
import type { WebBlogPost } from "@/services/websiteService";

export default function BlogGrid({ posts }: { posts: WebBlogPost[] }) {
  const categories = useMemo(() => {
    const set = new Set(posts.map((p) => p.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [posts]);
  const [category, setCategory] = useState("all");

  const filtered = category === "all" ? posts : posts.filter((p) => p.category === category);

  return (
    <div>
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-12 md:mb-16">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-5 py-2.5 rounded-full text-[11px] tracking-[0.14em] uppercase border transition-colors capitalize ${
                category === c ? "border-[var(--ds-gold)] text-[var(--ds-gold)]" : "border-[var(--ds-border)] text-[var(--ds-ink-soft)] hover:text-[var(--ds-ink)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-[var(--ds-ink-soft)]">No articles in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {filtered.map((post, i) => (
            <FadeIn key={post.id} delay={(i % 6) * 0.06}>
              <Link href={`/blog/${post.slug}`} className="block group">
                <RevealImage
                  src={resolveMediaUrl(post.cover_image) || "/logo.png"}
                  alt={post.title}
                  className="aspect-[4/3] rounded-sm mb-5"
                  cursorLabel="Read"
                />
                {post.category && <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--ds-gold)] mb-2">{post.category}</p>}
                <h3 className="text-xl font-light mb-2 group-hover:text-[var(--ds-gold)] transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                  {post.title}
                </h3>
                <p className="text-sm text-[var(--ds-ink-soft)] line-clamp-2 mb-2">{post.excerpt}</p>
                <p className="text-xs text-[var(--ds-ink-soft)]">{post.read_time_minutes} min read</p>
              </Link>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
