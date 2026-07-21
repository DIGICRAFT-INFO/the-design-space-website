"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save, Images, GripVertical } from "lucide-react";
import { getHomeAdmin, updateHomeAdmin } from "@/services/webCmsService";
import type { WebHome, BentoCard, ProcessStep, HeroSlide } from "@/services/websiteService";
import MediaUploadField from "@/components/webcms/MediaUploadField";
import Toast, { type ToastState } from "@/components/webcms/Toast";
import { getErrorMessage } from "@/lib/errors";

const SPAN_OPTIONS = [
  { value: "lg:col-span-2 lg:row-span-2", label: "Large (2×2)" },
  { value: "lg:col-span-1 lg:row-span-1", label: "Standard (1×1)" },
  { value: "lg:col-span-2 lg:row-span-1", label: "Wide (2×1)" },
  { value: "lg:col-span-1 lg:row-span-2", label: "Tall (1×2)" },
];

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#EDE8DF] bg-white text-[13px] focus:outline-none focus:border-[#C8922A]";
const labelClass = "text-[12px] font-semibold text-[#6B6259] mb-1.5 block";

let uid = 0;
const nextId = () => `new-${Date.now()}-${uid++}`;

export default function WebCmsHomePage() {
  const [data, setData] = useState<WebHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    getHomeAdmin()
      .then(setData)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const updated = await updateHomeAdmin({
        hero: data.hero,
        hero_slides: data.hero_slides,
        grid_matrix: data.grid_matrix,
        process: data.process,
        about_preview: data.about_preview,
        careers_banner: data.careers_banner,
        section_visibility: data.section_visibility,
      });
      setData(updated);
      setToast({ message: "Home page updated", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e, "Save failed"), type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9A8F82]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const cards = data.grid_matrix?.cards || [];
  const steps = data.process?.steps || [];

  function updateCard(id: string, patch: Partial<BentoCard>) {
    setData((d) =>
      d ? { ...d, grid_matrix: { ...d.grid_matrix, cards: d.grid_matrix.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) } } : d
    );
  }
  function addCard() {
    setData((d) =>
      d
        ? {
            ...d,
            grid_matrix: {
              ...d.grid_matrix,
              cards: [
                ...d.grid_matrix.cards,
                { id: nextId(), image_title: "", image_url: "", grid_span_class: SPAN_OPTIONS[1].value, sort_order: d.grid_matrix.cards.length },
              ],
            },
          }
        : d
    );
  }
  function removeCard(id: string) {
    setData((d) => (d ? { ...d, grid_matrix: { ...d.grid_matrix, cards: d.grid_matrix.cards.filter((c) => c.id !== id) } } : d));
  }

  function updateStep(id: string, patch: Partial<ProcessStep>) {
    setData((d) => (d ? { ...d, process: { ...d.process, steps: d.process.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) } } : d));
  }
  function addStep() {
    setData((d) =>
      d
        ? {
            ...d,
            process: {
              ...d.process,
              steps: [
                ...d.process.steps,
                { id: nextId(), stage: String(d.process.steps.length + 1).padStart(2, "0"), title: "", body: "", associated_image: "", sort_order: d.process.steps.length },
              ],
            },
          }
        : d
    );
  }
  function removeStep(id: string) {
    setData((d) => (d ? { ...d, process: { ...d.process, steps: d.process.steps.filter((s) => s.id !== id) } } : d));
  }

  // ── Hero Slides helpers ──────────────────────────────────────────────────
  const slides = data.hero_slides ?? [];

  function updateSlide(id: string, patch: Partial<HeroSlide>) {
    setData((d) =>
      d
        ? { ...d, hero_slides: (d.hero_slides ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)) }
        : d
    );
  }

  function addSlide() {
    setData((d) =>
      d
        ? {
            ...d,
            hero_slides: [
              ...(d.hero_slides ?? []),
              {
                id: nextId(),
                mini_title: "THE DESIGN SPACE",
                main_title: "",
                subtitle: "",
                cta_label: "Explore Spaces",
                cta_link: "/portfolio",
                image_url: "",
                sort_order: (d.hero_slides ?? []).length,
              },
            ],
          }
        : d
    );
  }

  function removeSlide(id: string) {
    setData((d) =>
      d ? { ...d, hero_slides: (d.hero_slides ?? []).filter((s) => s.id !== id) } : d
    );
  }

  function moveSlide(id: string, dir: 1 | -1) {
    setData((d) => {
      if (!d) return d;
      const arr = [...(d.hero_slides ?? [])];
      const idx = arr.findIndex((s) => s.id === id);
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return d;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { ...d, hero_slides: arr.map((s, i) => ({ ...s, sort_order: i })) };
    });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — Home</h1>
          <p className="text-[13px] text-[#9A8F82]">Hero section, featured bento grid, and process walkthrough</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </button>
      </div>

      {/* Hero */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <h2 className="text-[14px] font-bold text-[#2B2620] mb-4">Hero Panel</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Mini Title</label>
            <input className={inputClass} value={data.hero.mini_title} onChange={(e) => setData({ ...data, hero: { ...data.hero, mini_title: e.target.value } })} />
          </div>
          <div>
            <label className={labelClass}>CTA Button Label</label>
            <input className={inputClass} value={data.hero.cta_label} onChange={(e) => setData({ ...data, hero: { ...data.hero, cta_label: e.target.value } })} />
          </div>
        </div>
        <div className="mb-4">
          <label className={labelClass}>Main Title</label>
          <input className={inputClass} value={data.hero.main_title} onChange={(e) => setData({ ...data, hero: { ...data.hero, main_title: e.target.value } })} />
        </div>
        <div className="mb-4">
          <label className={labelClass}>Subtitle</label>
          <textarea rows={2} className={inputClass} value={data.hero.subtitle} onChange={(e) => setData({ ...data, hero: { ...data.hero, subtitle: e.target.value } })} />
        </div>
        <div className="mb-4">
          <label className={labelClass}>CTA Link</label>
          <input className={inputClass} value={data.hero.cta_link} onChange={(e) => setData({ ...data, hero: { ...data.hero, cta_link: e.target.value } })} placeholder="/portfolio" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MediaUploadField
            label="Background Video (mp4/webm)"
            kind="video"
            aspect="aspect-video"
            value={data.hero.video_url}
            onChange={(url) => setData({ ...data, hero: { ...data.hero, video_url: url } })}
          />
          <MediaUploadField
            label="Poster / Fallback Image"
            kind="image"
            aspect="aspect-video"
            value={data.hero.poster_image}
            onChange={(url) => setData({ ...data, hero: { ...data.hero, poster_image: url } })}
          />
        </div>
      </section>

      {/* Hero Slides — shown on homepage when slides are configured */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Images size={16} className="text-[#C8922A]" />
            <h2 className="text-[14px] font-bold text-[#2B2620]">Hero Slider — Multiple Slides</h2>
          </div>
          <button
            onClick={addSlide}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20]"
          >
            <Plus size={14} /> Add Slide
          </button>
        </div>
        <p className="text-[11px] text-[#9A8F82] mb-4">
          When slides are added here the full-screen slider replaces the single hero above.
          Each slide has its own background image, titles and CTA button.
          Remove all slides to revert to the single-hero layout.
        </p>

        {slides.length === 0 ? (
          <div className="border-2 border-dashed border-[#EDE8DF] rounded-xl py-10 flex flex-col items-center gap-2 text-[#9A8F82]">
            <Images size={28} className="opacity-40" />
            <p className="text-[12px] font-medium">No slides yet — using single Hero above</p>
            <button
              onClick={addSlide}
              className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20] bg-[#FDF3E3] px-3 py-1.5 rounded-lg"
            >
              <Plus size={13} /> Add First Slide
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {slides.map((slide, idx) => (
              <div key={slide.id} className="border border-[#EDE8DF] rounded-2xl p-4 bg-[#FAFAF9]">
                {/* Slide header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-[12px] font-semibold text-[#6B6259]">Slide {idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Move up */}
                    <button
                      onClick={() => moveSlide(slide.id, -1)}
                      disabled={idx === 0}
                      className="p-1.5 text-[#9A8F82] hover:text-[#1C1C1C] disabled:opacity-30 rounded"
                      title="Move up"
                    >
                      <GripVertical size={14} />
                    </button>
                    <button
                      onClick={() => removeSlide(slide.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left — image upload */}
                  <MediaUploadField
                    label="Slide Background Image"
                    kind="image"
                    aspect="aspect-video"
                    value={slide.image_url}
                    onChange={(url) => updateSlide(slide.id, { image_url: url })}
                  />

                  {/* Right — text fields */}
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Mini Title (eyebrow text)</label>
                      <input
                        className={inputClass}
                        placeholder="THE DESIGN SPACE"
                        value={slide.mini_title}
                        onChange={(e) => updateSlide(slide.id, { mini_title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Main Title *</label>
                      <input
                        className={inputClass}
                        placeholder="We Design Your Luxury Space"
                        value={slide.main_title}
                        onChange={(e) => updateSlide(slide.id, { main_title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Subtitle</label>
                      <textarea
                        rows={2}
                        className={inputClass}
                        placeholder="Bespoke interiors for those who see home as an art form."
                        value={slide.subtitle}
                        onChange={(e) => updateSlide(slide.id, { subtitle: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>CTA Button Label</label>
                        <input
                          className={inputClass}
                          placeholder="Explore Spaces"
                          value={slide.cta_label}
                          onChange={(e) => updateSlide(slide.id, { cta_label: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>CTA Link</label>
                        <input
                          className={inputClass}
                          placeholder="/portfolio"
                          value={slide.cta_link}
                          onChange={(e) => updateSlide(slide.id, { cta_link: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addSlide}
              className="w-full border-2 border-dashed border-[#EDE8DF] rounded-xl py-3 text-[12px] font-semibold text-[#C8922A] hover:border-[#C8922A] hover:bg-[#FDF3E3] transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Add Another Slide
            </button>
          </div>
        )}
      </section>

      {/* Bento Grid */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[14px] font-bold text-[#2B2620]">Bento Grid Matrix</h2>
            <input
              className="text-[12px] text-[#9A8F82] bg-transparent border-none focus:outline-none mt-0.5"
              value={data.grid_matrix.mini_title}
              onChange={(e) => setData({ ...data, grid_matrix: { ...data.grid_matrix, mini_title: e.target.value } })}
            />
          </div>
          <button onClick={addCard} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20]">
            <Plus size={14} /> Add Card
          </button>
        </div>
        <p className="text-[11px] text-[#9A8F82] mb-3">
          Leave empty to auto-fill from projects marked <span className="font-semibold">Featured</span> in Website CMS → Portfolio.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => (
            <div key={card.id} className="border border-[#EDE8DF] rounded-xl p-4">
              <MediaUploadField kind="image" aspect="aspect-[4/3]" value={card.image_url} onChange={(url) => updateCard(card.id, { image_url: url })} />
              <input
                className={`${inputClass} mt-3`}
                placeholder="Card title"
                value={card.image_title}
                onChange={(e) => updateCard(card.id, { image_title: e.target.value })}
              />
              <div className="flex items-center gap-2 mt-2">
                <select
                  className={`${inputClass} flex-1`}
                  value={card.grid_span_class}
                  onChange={(e) => updateCard(card.id, { grid_span_class: e.target.value })}
                >
                  {SPAN_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button onClick={() => removeCard(card.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Process Steps */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[14px] font-bold text-[#2B2620]">Interactive Process Walkthrough</h2>
            <input
              className="text-[12px] text-[#9A8F82] bg-transparent border-none focus:outline-none mt-0.5"
              value={data.process.mini_title}
              onChange={(e) => setData({ ...data, process: { ...data.process, mini_title: e.target.value } })}
            />
          </div>
          <button onClick={addStep} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20]">
            <Plus size={14} /> Add Step
          </button>
        </div>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="border border-[#EDE8DF] rounded-xl p-4 grid grid-cols-1 md:grid-cols-[100px_1fr_140px] gap-4 items-start">
              <input className={inputClass} placeholder="01" value={step.stage} onChange={(e) => updateStep(step.id, { stage: e.target.value })} />
              <div className="space-y-2">
                <input className={inputClass} placeholder="Title" value={step.title} onChange={(e) => updateStep(step.id, { title: e.target.value })} />
                <textarea rows={2} className={inputClass} placeholder="Description" value={step.body} onChange={(e) => updateStep(step.id, { body: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <MediaUploadField kind="image" aspect="aspect-square" value={step.associated_image} onChange={(url) => updateStep(step.id, { associated_image: url })} />
                <button onClick={() => removeStep(step.id)} className="flex items-center justify-center gap-1.5 text-[11px] text-red-500 hover:bg-red-50 rounded-lg py-1.5">
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* About Preview */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6 mt-6">
        <h2 className="text-[14px] font-bold text-[#2B2620] mb-4">About Preview Section</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Title</label>
            <input className={inputClass} value={data.about_preview.title} onChange={(e) => setData({ ...data, about_preview: { ...data.about_preview, title: e.target.value } })} />
          </div>
          <div>
            <label className={labelClass}>CTA Label</label>
            <input className={inputClass} value={data.about_preview.cta_label} onChange={(e) => setData({ ...data, about_preview: { ...data.about_preview, cta_label: e.target.value } })} />
          </div>
        </div>
        <div className="mb-4">
          <label className={labelClass}>Body Text</label>
          <textarea rows={2} className={inputClass} value={data.about_preview.body} onChange={(e) => setData({ ...data, about_preview: { ...data.about_preview, body: e.target.value } })} />
        </div>
        <MediaUploadField label="Studio Image" kind="image" aspect="aspect-video" value={data.about_preview.image} onChange={(url) => setData({ ...data, about_preview: { ...data.about_preview, image: url } })} />
      </section>

      {/* Careers Banner */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <h2 className="text-[14px] font-bold text-[#2B2620] mb-4">Careers Hiring Banner</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Title</label>
            <input className={inputClass} value={data.careers_banner.title} onChange={(e) => setData({ ...data, careers_banner: { ...data.careers_banner, title: e.target.value } })} />
          </div>
          <div>
            <label className={labelClass}>CTA Label</label>
            <input className={inputClass} value={data.careers_banner.cta_label} onChange={(e) => setData({ ...data, careers_banner: { ...data.careers_banner, cta_label: e.target.value } })} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Subtitle</label>
          <input className={inputClass} value={data.careers_banner.subtitle} onChange={(e) => setData({ ...data, careers_banner: { ...data.careers_banner, subtitle: e.target.value } })} />
        </div>
      </section>

      {/* Section Visibility */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5">
        <h2 className="text-[14px] font-bold text-[#2B2620] mb-1">Section Visibility</h2>
        <p className="text-[11px] text-[#9A8F82] mb-4">Toggle sections on or off the live Home page — no data is lost when hidden.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(
            [
              ["hero", "Hero"],
              ["about_preview", "About Preview"],
              ["services_grid", "Services Grid"],
              ["bento_portfolio", "Portfolio Grid"],
              ["products_carousel", "Products Carousel"],
              ["blog_highlights", "Blog Highlights"],
              ["careers_banner", "Careers Banner"],
              ["map", "Map"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[12px] text-[#6B6259] bg-[#FAF8F5] rounded-lg px-3 py-2.5">
              <input
                type="checkbox"
                checked={data.section_visibility[key]}
                onChange={(e) => setData({ ...data, section_visibility: { ...data.section_visibility, [key]: e.target.checked } })}
              />
              {label}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
