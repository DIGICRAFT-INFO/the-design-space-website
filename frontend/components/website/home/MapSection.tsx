import FadeIn from "@/components/website/FadeIn";

export default function MapSection({ mapEmbedUrl, address }: { mapEmbedUrl?: string; address?: string }) {
  return (
    <section className="relative h-[60vh] w-full overflow-hidden bg-[var(--ds-bg-alt)]">
      {mapEmbedUrl ? (
        <iframe
          src={mapEmbedUrl}
          className="absolute inset-0 w-full h-full grayscale contrast-125 opacity-80"
          loading="lazy"
          title="Studio location"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--ds-border),transparent_70%)]" />
      )}
      <div className="absolute inset-0 flex items-end p-8 md:p-14 pointer-events-none">
        <FadeIn className="bg-[var(--ds-bg)]/90 backdrop-blur-sm border border-[var(--ds-border)] rounded-sm px-6 py-4 pointer-events-auto">
          <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-1">Visit the Studio</p>
          <p className="text-sm">{address || "By appointment only."}</p>
        </FadeIn>
      </div>
    </section>
  );
}
