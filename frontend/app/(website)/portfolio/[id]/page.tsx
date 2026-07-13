import { notFound } from "next/navigation";
import { getPortfolioItem } from "@/services/websiteService";
import { resolveMediaUrl } from "@/lib/media";
import SplitText from "@/components/website/SplitText";
import RevealImage from "@/components/website/RevealImage";
import FadeIn from "@/components/website/FadeIn";

export default async function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getPortfolioItem(id).catch(() => null);

  if (!project) notFound();

  const [hero, ...rest] = project.images || [];

  return (
    <>
      {/* ── Panoramic hero ──────────────────────────────────────────────── */}
      <section className="relative h-[70vh] md:h-[85vh] w-full overflow-hidden">
        <img src={resolveMediaUrl(hero?.file_url) || "/logo.png"} alt={project.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-[1600px] mx-auto px-6 md:px-10 pb-12 md:pb-16">
          <p className="text-[12px] tracking-[0.3em] uppercase text-[#E6C687] mb-3 capitalize">{project.project_type}</p>
          <SplitText
            text={project.title}
            as="h1"
            className="text-white font-light tracking-tight text-4xl md:text-6xl max-w-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          />
        </div>
      </section>

      {/* ── Metrics + Editorial ─────────────────────────────────────────── */}
      <section className="max-w-[1600px] mx-auto px-6 md:px-10 py-16 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-12 lg:gap-20">
          <div className="lg:sticky lg:top-28 self-start space-y-8">
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-6 lg:gap-8">
              {project.metrics?.location && (
                <Metric label="Location" value={project.metrics.location} />
              )}
              {project.metrics?.area_sqft ? (
                <Metric label="Surface Area" value={`${project.metrics.area_sqft.toLocaleString()} sqft`} />
              ) : null}
              {project.metrics?.scope_duration && (
                <Metric label="Project Cost / Duration" value={project.metrics.scope_duration} />
              )}
            </div>
          </div>

          <FadeIn className="max-w-2xl">
            <p className="text-lg md:text-2xl leading-relaxed" style={{ fontFamily: "var(--font-display)" }}>
              {project.description || "A considered response to the brief — every material and proportion chosen with intent."}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Gallery ─────────────────────────────────────────────────────── */}
      {rest.length > 0 && (
        <section className="max-w-[1600px] mx-auto px-6 md:px-10 pb-24 md:pb-40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {rest.map((img, i) => (
              <RevealImage
                key={img.id}
                src={resolveMediaUrl(img.file_url)}
                alt={img.caption || project.title}
                delay={(i % 4) * 0.06}
                className={`rounded-sm ${i % 3 === 0 ? "md:col-span-2 aspect-video" : "aspect-[4/5]"}`}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-1.5">{label}</p>
      <p className="text-sm md:text-base font-medium">{value}</p>
    </div>
  );
}
