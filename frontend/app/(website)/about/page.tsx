import { getAbout, getServices, getSeoEntries, resolveSeo } from "@/services/websiteService";
import { resolveMediaUrl } from "@/lib/media";
import SplitText from "@/components/website/SplitText";
import RevealImage from "@/components/website/RevealImage";
import FadeIn from "@/components/website/FadeIn";
import HeroSlider from "@/components/website/home/HeroSlider";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import ServicesMarquee from "@/components/website/about/ServicesMarquee";
import WhoWeAreSection from "@/components/website/about/WhoWeAreSection";
import MissionVisionSection from "@/components/website/about/MissionVisionSection";
import ValuesSection from "@/components/website/about/ValuesSection";
import IndustriesSection from "@/components/website/about/IndustriesSection";

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
  const gallery = (about?.studio_gallery || []).map((img) => ({
    ...img,
    file_url: resolveMediaUrl(img.file_url),
  }));

  // Sort all team members — resolve avatar URLs server-side
  const allTeam = (about?.team_members || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({ ...m, avatar_url: resolveMediaUrl(m.avatar_url) }));
  const founder = allTeam.find((m) => m.is_founder) ?? null;
  const nonFounderTeam = allTeam.filter((m) => !m.is_founder);

  // New sections data — resolve all image URLs server-side before passing to client components
  const whoWeAre = {
    ...(about?.who_we_are ?? { title: "", body: "", background_image: "", slider_images: [] }),
    background_image: resolveMediaUrl(about?.who_we_are?.background_image),
    slider_images: (about?.who_we_are?.slider_images ?? []).map((img) => ({
      ...img,
      image_url: resolveMediaUrl(img.image_url),
    })),
  };
  const mission = {
    ...(about?.mission ?? { title: "", body: "", slider_images: [] }),
    slider_images: (about?.mission?.slider_images ?? []).map((img) => ({
      ...img,
      image_url: resolveMediaUrl(img.image_url),
    })),
  };
  const vision = {
    ...(about?.vision ?? { title: "", body: "", slider_images: [] }),
    slider_images: (about?.vision?.slider_images ?? []).map((img) => ({
      ...img,
      image_url: resolveMediaUrl(img.image_url),
    })),
  };
  const values = about?.values ?? [];
  const industries = about?.industries ?? [];

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
        <section className="page-hero-pt pb-0">
          <div className="max-w-[1600px] mx-auto px-6 md:px-10">
            <SplitText
              text={narrative?.philosophy_title || "Crafting Quiet Luxury"}
              as="h1"
              className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light tracking-tight mb-0"
              style={{ fontFamily: "var(--font-display)" }}
            />
          </div>
        </section>
      )}

      {/* ── Philosophy / Story ─────────────────────────────────────────── */}
      <section className={`${useSlider ? "pt-14" : "pt-12"} pb-14 md:pb-20`}>
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          {useSlider && (
            <FadeIn className="mb-12 md:mb-20">
              <SplitText
                text={narrative?.philosophy_title || "Crafting Quiet Luxury"}
                as="h1"
                className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light tracking-tight"
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
        <section className="pb-20 md:pb-32">
          <div className="max-w-[1600px] mx-auto px-6 md:px-10">
            <FadeIn>
              <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-8 md:mb-10">Inside the Studio</p>
            </FadeIn>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {about?.studio_video_url && (
                <div className="col-span-2 row-span-2 aspect-square rounded-2xl overflow-hidden">
                  <video src={resolveMediaUrl(about.studio_video_url)} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                </div>
              )}
              {gallery.map((img, i) => (
                <RevealImage
                  key={img.id}
                  src={img.file_url}
                  alt={img.caption || "Studio"}
                  delay={i * 0.06}
                  className="aspect-square rounded-xl"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Who We Are ───────────────────────────────────────────────── */}
      {whoWeAre.title && whoWeAre.body && <WhoWeAreSection data={whoWeAre} />}

      {/* ── Our Mission ──────────────────────────────────────────────── */}
      {mission.title && mission.body && <MissionVisionSection data={mission} variant="mission" />}

      {/* ── Our Vision ───────────────────────────────────────────────── */}
      {vision.title && vision.body && <MissionVisionSection data={vision} variant="vision" />}

      {/* ── What We Stand For ────────────────────────────────────────── */}
      {values.length > 0 && <ValuesSection values={values} />}

      {/* ── Industries (always rendered; empty-state when no published) ── */}
      <IndustriesSection industries={industries} />

      {/* ── Founder + Team — combined compact section ─────────────────── */}
      {allTeam.length > 0 && (
        <section className="py-16 md:py-24 bg-[var(--ds-bg-alt)] border-t border-[var(--ds-border)]">
          <div className="max-w-[1600px] mx-auto px-6 md:px-10">
            <FadeIn className="mb-10 md:mb-14">
              <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-2">The People</p>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-[var(--ds-ink)]" style={{ fontFamily: "var(--font-display)" }}>
                Meet the team.
              </h2>
            </FadeIn>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 md:gap-7">
              {allTeam.map((member, i) => (
                <FadeIn key={member.id} delay={i * 0.05} className="group">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--ds-bg)] mb-3 relative">
                    <img
                      src={member.avatar_url || "/logo.png"}
                      alt={member.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                    />
                    {member.is_founder && (
                      <span className="absolute top-2 left-2 text-[9px] tracking-[0.15em] uppercase bg-[var(--ds-gold)] text-white px-2 py-0.5 rounded-full">
                        Founder
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[var(--ds-ink)]">{member.name}</p>
                  <p className="text-xs text-[var(--ds-ink-soft)]">{member.designation}</p>
                  {member.is_founder && (member.social_instagram || member.social_linkedin) && (
                    <div className="flex gap-3 mt-1.5">
                      {member.social_instagram && (
                        <a href={member.social_instagram} target="_blank" rel="noreferrer" className="text-[var(--ds-ink-soft)] hover:text-[var(--ds-gold)] transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                        </a>
                      )}
                      {member.social_linkedin && (
                        <a href={member.social_linkedin} target="_blank" rel="noreferrer" className="text-[var(--ds-ink-soft)] hover:text-[var(--ds-gold)] transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                        </a>
                      )}
                    </div>
                  )}
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Services Marquee ─────────────────────────────────────────── */}
      <ServicesMarquee services={services} />
    </>
  );
}
