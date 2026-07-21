"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save, Images, GripVertical } from "lucide-react";
import {
  getAboutAdmin,
  updateAboutAdmin,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from "@/services/webCmsService";
import type { WebAbout, TeamMember, HeroSlide } from "@/services/websiteService";
import MediaUploadField from "@/components/webcms/MediaUploadField";
import Toast, { type ToastState } from "@/components/webcms/Toast";
import { getErrorMessage } from "@/lib/errors";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#EDE8DF] bg-white text-[13px] focus:outline-none focus:border-[#C8922A]";
const labelClass = "text-[12px] font-semibold text-[#6B6259] mb-1.5 block";

let uid = 0;
const nextId = () => `new-${Date.now()}-${uid++}`;

export default function WebCmsAboutPage() {
  const [data, setData] = useState<WebAbout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getAboutAdmin()
      .then(setData)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const updated = await updateAboutAdmin({
        narrative: data.narrative,
        about_slides: data.about_slides,
        studio_gallery: data.studio_gallery,
        studio_video_url: data.studio_video_url,
      });
      setData(updated);
      setToast({ message: "About page updated", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e, "Save failed"), type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function addGalleryImage() {
    setData((d) => (d ? { ...d, studio_gallery: [...d.studio_gallery, { id: nextId(), file_url: "", caption: "", sort_order: d.studio_gallery.length }] } : d));
  }
  function updateGalleryImage(id: string, url: string) {
    setData((d) => (d ? { ...d, studio_gallery: d.studio_gallery.map((g) => (g.id === id ? { ...g, file_url: url } : g)) } : d));
  }
  function removeGalleryImage(id: string) {
    setData((d) => (d ? { ...d, studio_gallery: d.studio_gallery.filter((g) => g.id !== id) } : d));
  }

  // ── About Slides helpers ─────────────────────────────────────────────────
  const slides = data?.about_slides ?? [];

  function updateSlide(id: string, patch: Partial<HeroSlide>) {
    setData((d) =>
      d ? { ...d, about_slides: (d.about_slides ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)) } : d
    );
  }

  function addSlide() {
    setData((d) =>
      d
        ? {
            ...d,
            about_slides: [
              ...(d.about_slides ?? []),
              {
                id: nextId(),
                mini_title: "THE DESIGN SPACE",
                main_title: "",
                subtitle: "",
                cta_label: "Our Story",
                cta_link: "/about",
                image_url: "",
                sort_order: (d.about_slides ?? []).length,
              },
            ],
          }
        : d
    );
  }

  function removeSlide(id: string) {
    setData((d) =>
      d ? { ...d, about_slides: (d.about_slides ?? []).filter((s) => s.id !== id) } : d
    );
  }

  function moveSlide(id: string, dir: 1 | -1) {
    setData((d) => {
      if (!d) return d;
      const arr = [...(d.about_slides ?? [])];
      const idx = arr.findIndex((s) => s.id === id);
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return d;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { ...d, about_slides: arr.map((s, i) => ({ ...s, sort_order: i })) };
    });
  }

  async function handleAddMember() {
    try {
      const updated = await addTeamMember({ name: "New Team Member", designation: "", avatar_url: "" });
      setData(updated);
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  async function handleMemberField(memberId: string, patch: Partial<TeamMember>) {
    setData((d) =>
      d ? { ...d, team_members: d.team_members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)) } : d
    );
  }

  async function handleMemberBlur(memberId: string) {
    const member = data?.team_members.find((m) => m.id === memberId);
    if (!member) return;
    setSavingMemberId(memberId);
    try {
      await updateTeamMember(memberId, { name: member.name, designation: member.designation, avatar_url: member.avatar_url });
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    } finally {
      setSavingMemberId(null);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remove this team member?")) return;
    try {
      await deleteTeamMember(memberId);
      setData((d) => (d ? { ...d, team_members: d.team_members.filter((m) => m.id !== memberId) } : d));
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9A8F82]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — About</h1>
          <p className="text-[13px] text-[#9A8F82]">Brand story, studio gallery, and integrated team</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </button>
      </div>

      {/* Narrative */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <h2 className="text-[14px] font-bold text-[#2B2620] mb-4">Our Philosophy / Story</h2>
        <div className="mb-4">
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            value={data.narrative.philosophy_title}
            onChange={(e) => setData({ ...data, narrative: { ...data.narrative, philosophy_title: e.target.value } })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Story — Paragraph One</label>
            <textarea
              rows={5}
              className={inputClass}
              value={data.narrative.story_para_one}
              onChange={(e) => setData({ ...data, narrative: { ...data.narrative, story_para_one: e.target.value } })}
            />
          </div>
          <div>
            <label className={labelClass}>Story — Paragraph Two</label>
            <textarea
              rows={5}
              className={inputClass}
              value={data.narrative.story_para_two}
              onChange={(e) => setData({ ...data, narrative: { ...data.narrative, story_para_two: e.target.value } })}
            />
          </div>
        </div>
        <MediaUploadField
          label="Hero / Workshop Image"
          kind="image"
          aspect="aspect-video"
          value={data.narrative.hero_image}
          onChange={(url) => setData({ ...data, narrative: { ...data.narrative, hero_image: url } })}
        />
      </section>

      {/* About Slides — shown at top of About page when slides configured */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Images size={16} className="text-[#C8922A]" />
            <h2 className="text-[14px] font-bold text-[#2B2620]">About Page Hero Slider</h2>
          </div>
          <button
            onClick={addSlide}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20]"
          >
            <Plus size={14} /> Add Slide
          </button>
        </div>
        <p className="text-[11px] text-[#9A8F82] mb-4">
          When slides are added, a full-screen slider with arrows and auto-play is shown at the top of the About page.
          Remove all slides to revert to the static title layout.
        </p>

        {slides.length === 0 ? (
          <div className="border-2 border-dashed border-[#EDE8DF] rounded-xl py-10 flex flex-col items-center gap-2 text-[#9A8F82]">
            <Images size={28} className="opacity-40" />
            <p className="text-[12px] font-medium">No slides yet — using static title layout</p>
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-[12px] font-semibold text-[#6B6259]">Slide {idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
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
                  <MediaUploadField
                    label="Slide Background Image"
                    kind="image"
                    aspect="aspect-video"
                    value={slide.image_url}
                    onChange={(url) => updateSlide(slide.id, { image_url: url })}
                  />
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
                        placeholder="Crafting Quiet Luxury"
                        value={slide.main_title}
                        onChange={(e) => updateSlide(slide.id, { main_title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Subtitle</label>
                      <textarea
                        rows={2}
                        className={inputClass}
                        placeholder="A decade of quiet, considered luxury interiors."
                        value={slide.subtitle}
                        onChange={(e) => updateSlide(slide.id, { subtitle: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>CTA Label</label>
                        <input
                          className={inputClass}
                          placeholder="Our Story"
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

      {/* Studio gallery */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-[#2B2620]">The Studio Gallery</h2>
          <button onClick={addGalleryImage} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20]">
            <Plus size={14} /> Add Image
          </button>
        </div>
        <MediaUploadField
          label="Studio Video (optional — small floating loop)"
          kind="video"
          aspect="aspect-video"
          value={data.studio_video_url}
          onChange={(url) => setData({ ...data, studio_video_url: url })}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {data.studio_gallery.map((img) => (
            <div key={img.id} className="relative">
              <MediaUploadField kind="image" aspect="aspect-square" value={img.file_url} onChange={(url) => updateGalleryImage(img.id, url)} />
              <button
                onClick={() => removeGalleryImage(img.id)}
                className="absolute top-2 left-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-[#2B2620]">Integrated Team</h2>
          <button onClick={handleAddMember} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20]">
            <Plus size={14} /> Add Team Member
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.team_members.map((member) => (
            <div key={member.id} className="border border-[#EDE8DF] rounded-xl p-4">
              <MediaUploadField
                kind="image"
                aspect="aspect-square"
                value={member.avatar_url}
                onChange={(url) => {
                  handleMemberField(member.id, { avatar_url: url });
                  updateTeamMember(member.id, { avatar_url: url }).catch((e) => setToast({ message: getErrorMessage(e), type: "error" }));
                }}
              />
              <input
                className={`${inputClass} mt-3`}
                placeholder="Name"
                value={member.name}
                onChange={(e) => handleMemberField(member.id, { name: e.target.value })}
                onBlur={() => handleMemberBlur(member.id)}
              />
              <input
                className={`${inputClass} mt-2`}
                placeholder="Designation"
                value={member.designation}
                onChange={(e) => handleMemberField(member.id, { designation: e.target.value })}
                onBlur={() => handleMemberBlur(member.id)}
              />
              <button
                onClick={() => handleRemoveMember(member.id)}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] text-red-500 hover:bg-red-50 rounded-lg py-1.5 mt-2"
              >
                {savingMemberId === member.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
