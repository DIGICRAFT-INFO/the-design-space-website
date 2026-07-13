import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBlogPost, getSeoEntries, resolveSeo } from "@/services/websiteService";
import { resolveMediaUrl } from "@/lib/media";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug).catch(() => null);
  const seo = resolveSeo(await getSeoEntries().catch(() => []), `/blog/${slug}`, {
    title: post ? `${post.title} — The Design Space Journal` : "Journal — The Design Space",
    description: post?.excerpt || "",
  });
  return { title: seo.title, description: seo.description, keywords: seo.keywords };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug).catch(() => null);

  if (!post) notFound();

  return (
    <>
      <section className="pt-40 md:pt-48 pb-10 md:pb-14">
        <div className="max-w-3xl mx-auto px-6 md:px-10">
          {post.category && <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-5">{post.category}</p>}
          <SplitText
            text={post.title}
            as="h1"
            className="text-3xl md:text-5xl font-light tracking-tight mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          />
          <FadeIn className="flex items-center gap-3 text-xs text-[var(--ds-ink-soft)]">
            <span>{post.author_name}</span>
            <span>·</span>
            <span>{post.read_time_minutes} min read</span>
            {post.published_at && (
              <>
                <span>·</span>
                <span>{new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
              </>
            )}
          </FadeIn>
        </div>
      </section>

      {post.cover_image && (
        <section className="max-w-5xl mx-auto px-6 md:px-10 mb-10 md:mb-16">
          <img src={resolveMediaUrl(post.cover_image)} alt={post.title} className="w-full aspect-video object-cover rounded-sm" />
        </section>
      )}

      <section className="max-w-3xl mx-auto px-6 md:px-10 pb-28 md:pb-40">
        <div className="ds-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-[var(--ds-border)]">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[11px] tracking-wide uppercase text-[var(--ds-ink-soft)] border border-[var(--ds-border)] rounded-full px-3 py-1">
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
