import { getAbout, getServices, getSeoEntries, resolveSeo } from "@/services/websiteService";
import { resolveMediaUrl } from "@/lib/media";
import SplitText from "@/components/website/SplitText";
import RevealImage from "@/components/website/RevealImage";
import FadeIn from "@/components/website/FadeIn";
import HeroSlider from "@/components/website/home/HeroSlider";
import ServicesMarquee from "@/components/website/about/ServicesMarquee";

export async function generateMetadata() {
  const seo = resolveSeo(await getSeoEntries().catch(() => []), "/about", {
    title: "About — The Design Space",
    description: "A decade of quiet, considered luxury interiors — meet the studio and the team behind it.",
  });
  return { title: seo.title, description: seo.description, keywords: seo.keywords };
}

export default async function AboutPage() {
  const about = await getAbout().catch(() => null);
  const services = await getServices().catch(() => []);
  const narrative = about?.narrative;
  const gallery = about?.studio_gallery || [];
  const team = (about?.team_members || []).slice().sort((a, b) => a.sort_order - b.sort_order);

  // Resolve and sort about slides
  const aboutSlides = (about?.about_slides ?? [])
    .filter((s) => s.image_url)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ ...s, image_url: resolveMediaUrl(s.image_url) }));

  const useSlider = aboutSlides.length > 0;

  return (
    <>
      {/* ── About Hero: Slider OR static ──────────────────────────────── */}
      {useSlider ? (
        <HeroSlider slides={aboutSlides} autoPlayInterval={5500} />
      ) : (
        /* Static title hero when no slides configured */
        <section className="pt-40 md:pt-48 pb-0">
          <div className="max-w-[1600px] mx-auto px-6 md:px-10">
            <SplitText
              text={narrative?.philosophy_title || "Crafting Quiet Luxury"}
              as="h1"
              className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight mb-0"
              style={{ fontFamily: "var(--font-display)" }}
            />
          </div>
        </section>
      )}

      {/* ── Philosophy / Story ─────────────────────────────────────────── */}
      <section className={`${useSlider ? "pt-14" : "pt-12"} pb-14 md:pb-20`}>
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          {/* When using slider, show the title here in the body section */}
          {useSlider && (
            <FadeIn className="mb-16 md:mb-24">
              <SplitText
                text={narrative?.philosophy_title || "Crafting Quiet Luxury"}
                as="h1"
                className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              />
            </FadeIn>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">
            <FadeIn className="space-y-6 text-base md:text-lg leading-relaxed text-[var(--ds-ink-soft)]">
              <p>
                {narrative?.story_para_one ||
                  "The Design Space was founded on a simple belief: a home should feel considered, not decorated — every material and proportion chosen with intent, nothing added for its own sake."}
              </p>
              <p>
                {narrative?.story_para_two ||
                  "Over a decade, that belief has shaped residences and commercial spaces across the country, each one distinct, none of them loud."}
              </p>
            </FadeIn>
            <RevealImage
              src={resolveMediaUrl(narrative?.hero_image) || "/logo.png"}
              alt="The Design Space studio"
              className="aspect-[4/5] rounded-sm"
              cursorLabel="Our Studio"
            />
          </div>
        </div>
      </section>

      {/* ── Studio Gallery ─────────────────────────────────────────────── */}
      {(gallery.length > 0 || about?.studio_video_url) && (
        <section className="pb-24 md:pb-32">
          <div className="max-w-[1600px] mx-auto px-6 md:px-10">
            <FadeIn>
              <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-10">Inside the Studio</p>
            </FadeIn>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {about?.studio_video_url && (
                <div className="col-span-2 row-span-2 aspect-square rounded-full overflow-hidden">
                  <video src={resolveMediaUrl(about.studio_video_url)} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                </div>
              )}
              {gallery.map((img, i) => (
                <RevealImage
                  key={img.id}
                  src={resolveMediaUrl(img.file_url)}
                  alt={img.caption || "Studio"}
                  delay={i * 0.06}
                  className="aspect-square rounded-sm"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Team ─────────────────────────────────────────────────────────── */}
      <section className="pb-14 md:pb-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <FadeIn>
            <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-3">The People</p>
            <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-12 md:mb-16" style={{ fontFamily: "var(--font-display)" }}>
              An integrated design team.
            </h2>
          </FadeIn>

          {team.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {team.map((member, i) => (
                <FadeIn key={member.id} delay={i * 0.05} className="group">
                  <div className="aspect-[3/4] rounded-sm overflow-hidden bg-[var(--ds-bg-alt)] mb-4">
                    <img
                      src={resolveMediaUrl(member.avatar_url) || "/logo.png"}
                      alt={member.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                    />
                  </div>
                  <p className="text-sm md:text-base font-medium">{member.name}</p>
                  <p className="text-xs md:text-sm text-[var(--ds-ink-soft)]">{member.designation}</p>
                </FadeIn>
              ))}
            </div>
          ) : (
            <p className="text-[var(--ds-ink-soft)]">Team profiles will appear here once published.</p>
          )}
        </div>
      </section>

      {/* ── Services Marquee ─────────────────────────────────────────────── */}
      <ServicesMarquee services={services} />
    </>
  );
}
