"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save, Images, GripVertical } from "lucide-react";
import {
  getAboutAdmin,
  updateAboutAdmin,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  addValue,
  updateValue,
  deleteValue,
  addIndustry,
  updateIndustry,
  deleteIndustry,
} from "@/services/webCmsService";
import type { WebAbout, TeamMember, HeroSlide, ValueItem, IndustryItem } from "@/services/websiteService";
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

  // Singleton section draft states
  const [whoWeAreDraft, setWhoWeAreDraft] = useState({ title: "", body: "", background_image: "" });
  const [missionDraft, setMissionDraft] = useState({ title: "", body: "" });
  const [visionDraft, setVisionDraft] = useState({ title: "", body: "" });
  const [savingSection, setSavingSection] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getAboutAdmin()
      .then((d) => {
        setData(d);
        setWhoWeAreDraft(d.who_we_are ?? { title: "", body: "", background_image: "" });
        setMissionDraft(d.mission ?? { title: "", body: "" });
        setVisionDraft(d.vision ?? { title: "", body: "" });
      })
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

  async function saveSingletonSection(section: "who_we_are" | "mission" | "vision", body: object) {
    setSavingSection(section);
    try {
      const updated = await updateAboutAdmin({ [section]: body });
      setData(updated);
      setToast({ message: "Saved", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e, "Save failed"), type: "error" });
    } finally {
      setSavingSection(null);
    }
  }

  // Gallery helpers
  function addGalleryImage() {
    setData((d) => (d ? { ...d, studio_gallery: [...d.studio_gallery, { id: nextId(), file_url: "", caption: "", sort_order: d.studio_gallery.length }] } : d));
  }
  function updateGalleryImage(id: string, url: string) {
    setData((d) => (d ? { ...d, studio_gallery: d.studio_gallery.map((g) => (g.id === id ? { ...g, file_url: url } : g)) } : d));
  }
  function removeGalleryImage(id: string) {
    setData((d) => (d ? { ...d, studio_gallery: d.studio_gallery.filter((g) => g.id !== id) } : d));
  }

  // Slide helpers
  const slides = data?.about_slides ?? [];
  function updateSlide(id: string, patch: Partial<HeroSlide>) {
    setData((d) => d ? { ...d, about_slides: (d.about_slides ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)) } : d);
  }
  function addSlide() {
    setData((d) => d ? { ...d, about_slides: [...(d.about_slides ?? []), { id: nextId(), mini_title: "THE DESIGN SPACE", main_title: "", subtitle: "", cta_label: "Our Story", cta_link: "/about", image_url: "", sort_order: (d.about_slides ?? []).length }] } : d);
  }
  function removeSlide(id: string) {
    setData((d) => d ? { ...d, about_slides: (d.about_slides ?? []).filter((s) => s.id !== id) } : d);
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

  // Values helpers
  async function handleAddValue() {
    try {
      const updated = await addValue({ icon: "✦", title: "New Value", description: "" });
      setData(updated);
    } catch (e) { setToast({ message: getErrorMessage(e), type: "error" }); }
  }
  async function handleValueBlur(item: ValueItem, field: keyof ValueItem) {
    try { await updateValue(item.id, { [field]: item[field] }); }
    catch (e) { setToast({ message: getErrorMessage(e), type: "error" }); }
  }
  async function handleDeleteValue(id: string) {
    if (!confirm("Delete this value?")) return;
    try {
      await deleteValue(id);
      setData((d) => d ? { ...d, values: d.values.filter((v) => v.id !== id) } : d);
    } catch (e) { setToast({ message: getErrorMessage(e), type: "error" }); }
  }
  function patchValue(id: string, patch: Partial<ValueItem>) {
    setData((d) => d ? { ...d, values: d.values.map((v) => v.id === id ? { ...v, ...patch } : v) } : d);
  }

  // Industries helpers
  async function handleAddIndustry() {
    try {
      const updated = await addIndustry({ name: "New Industry", is_published: false });
      setData(updated);
    } catch (e) { setToast({ message: getErrorMessage(e), type: "error" }); }
  }
  async function handleIndustryBlur(item: IndustryItem, field: keyof IndustryItem) {
    try { await updateIndustry(item.id, { [field]: item[field] }); }
    catch (e) { setToast({ message: getErrorMessage(e), type: "error" }); }
  }
  async function handleIndustryToggle(item: IndustryItem) {
    const next = !item.is_published;
    setData((d) => d ? { ...d, industries: d.industries.map((ind) => ind.id === item.id ? { ...ind, is_published: next } : ind) } : d);
    try { await updateIndustry(item.id, { is_published: next }); }
    catch (e) { setToast({ message: getErrorMessage(e), type: "error" }); }
  }
  async function handleDeleteIndustry(id: string) {
    if (!confirm("Delete this industry?")) return;
    try {
      await deleteIndustry(id);
      setData((d) => d ? { ...d, industries: d.industries.filter((ind) => ind.id !== id) } : d);
    } catch (e) { setToast({ message: getErrorMessage(e), type: "error" }); }
  }
  function patchIndustry(id: string, patch: Partial<IndustryItem>) {
    setData((d) => d ? { ...d, industries: d.industries.map((ind) => ind.id === id ? { ...ind, ...patch } : ind) } : d);
  }

  // Team helpers
  async function handleAddMember() {
    try {
      const updated = await addTeamMember({ name: "New Team Member", designation: "", avatar_url: "", is_founder: false, bio: "", social_instagram: "", social_linkedin: "" });
      setData(updated);
    } catch (e) { setToast({ message: getErrorMessage(e), type: "error" }); }
  }
  function handleMemberField(memberId: string, patch: Partial<TeamMember>) {
    setData((d) => d ? { ...d, team_members: d.team_members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)) } : d);
  }
  async function handleMemberBlur(memberId: string) {
    const member = data?.team_members.find((m) => m.id === memberId);
    if (!member) return;
    setSavingMemberId(memberId);
    try {
      await updateTeamMember(memberId, { name: member.name, designation: member.designation, avatar_url: member.avatar_url, is_founder: member.is_founder, bio: member.bio, social_instagram: member.social_instagram, social_linkedin: member.social_linkedin });
    } catch (e) { setToast({ message: getErrorMessage(e), type: "error" }); }
    finally { setSavingMemberId(null); }
  }
  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remove this team member?")) return;
    try {
      await deleteTeamMember(memberId);
      setData((d) => (d ? { ...d, team_members: d.team_members.filter((m) => m.id !== memberId) } : d));
    } catch (e) { setToast({ message: getErrorMessage(e), type: "error" }); }
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

      {/* ── Narrative ──────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <h2 className="text-[14px] font-bold text-[#2B2620] mb-4">Our Philosophy / Story</h2>
        <div className="mb-4">
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={data.narrative.philosophy_title}
            onChange={(e) => setData({ ...data, narrative: { ...data.narrative, philosophy_title: e.target.value } })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Story — Paragraph One</label>
            <textarea rows={5} className={inputClass} value={data.narrative.story_para_one}
              onChange={(e) => setData({ ...data, narrative: { ...data.narrative, story_para_one: e.target.value } })} />
          </div>
          <div>
            <label className={labelClass}>Story — Paragraph Two</label>
            <textarea rows={5} className={inputClass} value={data.narrative.story_para_two}
              onChange={(e) => setData({ ...data, narrative: { ...data.narrative, story_para_two: e.target.value } })} />
          </div>
        </div>
        <MediaUploadField label="Hero / Workshop Image" kind="image" aspect="aspect-video"
          value={data.narrative.hero_image}
          onChange={(url) => setData({ ...data, narrative: { ...data.narrative, hero_image: url } })} />
      </section>

      {/* ── About Slides ───────────────────────────────────────────────── */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Images size={16} className="text-[#C8922A]" />
            <h2 className="text-[14px] font-bold text-[#2B2620]">About Page Hero Slider</h2>
          </div>
          <button onClick={addSlide} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20]">
            <Plus size={14} /> Add Slide
          </button>
        </div>
        <p className="text-[11px] text-[#9A8F82] mb-4">When slides are added, a full-screen slider is shown at the top of the About page.</p>
        {slides.length === 0 ? (
          <div className="border-2 border-dashed border-[#EDE8DF] rounded-xl py-8 flex flex-col items-center gap-2 text-[#9A8F82]">
            <Images size={24} className="opacity-40" />
            <p className="text-[12px] font-medium">No slides yet</p>
            <button onClick={addSlide} className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20] bg-[#FDF3E3] px-3 py-1.5 rounded-lg">
              <Plus size={13} /> Add First Slide
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {slides.map((slide, idx) => (
              <div key={slide.id} className="border border-[#EDE8DF] rounded-2xl p-4 bg-[#FAFAF9]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#C8922A] text-white text-[10px] font-black flex items-center justify-center">{idx + 1}</span>
                    <span className="text-[12px] font-semibold text-[#6B6259]">Slide {idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveSlide(slide.id, -1)} disabled={idx === 0} className="p-1.5 text-[#9A8F82] hover:text-[#1C1C1C] disabled:opacity-30 rounded"><GripVertical size={14} /></button>
                    <button onClick={() => removeSlide(slide.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MediaUploadField label="Slide Background Image" kind="image" aspect="aspect-video" value={slide.image_url} onChange={(url) => updateSlide(slide.id, { image_url: url })} />
                  <div className="space-y-3">
                    <div><label className={labelClass}>Mini Title</label><input className={inputClass} value={slide.mini_title} onChange={(e) => updateSlide(slide.id, { mini_title: e.target.value })} /></div>
                    <div><label className={labelClass}>Main Title</label><input className={inputClass} value={slide.main_title} onChange={(e) => updateSlide(slide.id, { main_title: e.target.value })} /></div>
                    <div><label className={labelClass}>Subtitle</label><textarea rows={2} className={inputClass} value={slide.subtitle} onChange={(e) => updateSlide(slide.id, { subtitle: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelClass}>CTA Label</label><input className={inputClass} value={slide.cta_label} onChange={(e) => updateSlide(slide.id, { cta_label: e.target.value })} /></div>
                      <div><label className={labelClass}>CTA Link</label><input className={inputClass} value={slide.cta_link} onChange={(e) => updateSlide(slide.id, { cta_link: e.target.value })} /></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addSlide} className="w-full border-2 border-dashed border-[#EDE8DF] rounded-xl py-3 text-[12px] font-semibold text-[#C8922A] hover:border-[#C8922A] hover:bg-[#FDF3E3] transition-colors flex items-center justify-center gap-1.5">
              <Plus size={14} /> Add Another Slide
            </button>
          </div>
        )}
      </section>

      {/* ── Studio Gallery ─────────────────────────────────────────────── */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-[#2B2620]">The Studio Gallery</h2>
          <button onClick={addGalleryImage} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20]"><Plus size={14} /> Add Image</button>
        </div>
        <MediaUploadField label="Studio Video (optional)" kind="video" aspect="aspect-video" value={data.studio_video_url} onChange={(url) => setData({ ...data, studio_video_url: url })} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {data.studio_gallery.map((img) => (
            <div key={img.id} className="relative">
              <MediaUploadField kind="image" aspect="aspect-square" value={img.file_url} onChange={(url) => updateGalleryImage(img.id, url)} />
              <button onClick={() => removeGalleryImage(img.id)} className="absolute top-2 left-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who We Are ─────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-[#2B2620]">Who We Are</h2>
          <button onClick={() => saveSingletonSection("who_we_are", whoWeAreDraft)} disabled={savingSection === "who_we_are"}
            className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold px-3 py-2 rounded-lg disabled:opacity-60">
            {savingSection === "who_we_are" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
          </button>
        </div>
        <div className="mb-3"><label className={labelClass}>Title</label><input className={inputClass} value={whoWeAreDraft.title} onChange={(e) => setWhoWeAreDraft({ ...whoWeAreDraft, title: e.target.value })} /></div>
        <div className="mb-3"><label className={labelClass}>Body</label><textarea rows={4} className={inputClass} value={whoWeAreDraft.body} onChange={(e) => setWhoWeAreDraft({ ...whoWeAreDraft, body: e.target.value })} /></div>
        <MediaUploadField label="Background Image (optional — parallax)" kind="image" aspect="aspect-video" value={whoWeAreDraft.background_image} onChange={(url) => setWhoWeAreDraft({ ...whoWeAreDraft, background_image: url })} />
      </section>

      {/* ── Our Mission ────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-[#2B2620]">Our Mission</h2>
          <button onClick={() => saveSingletonSection("mission", missionDraft)} disabled={savingSection === "mission"}
            className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold px-3 py-2 rounded-lg disabled:opacity-60">
            {savingSection === "mission" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
          </button>
        </div>
        <div className="mb-3"><label className={labelClass}>Title</label><input className={inputClass} value={missionDraft.title} onChange={(e) => setMissionDraft({ ...missionDraft, title: e.target.value })} /></div>
        <div><label className={labelClass}>Body</label><textarea rows={4} className={inputClass} value={missionDraft.body} onChange={(e) => setMissionDraft({ ...missionDraft, body: e.target.value })} /></div>
      </section>

      {/* ── Our Vision ─────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-[#2B2620]">Our Vision</h2>
          <button onClick={() => saveSingletonSection("vision", visionDraft)} disabled={savingSection === "vision"}
            className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold px-3 py-2 rounded-lg disabled:opacity-60">
            {savingSection === "vision" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
          </button>
        </div>
        <div className="mb-3"><label className={labelClass}>Title</label><input className={inputClass} value={visionDraft.title} onChange={(e) => setVisionDraft({ ...visionDraft, title: e.target.value })} /></div>
        <div><label className={labelClass}>Body</label><textarea rows={4} className={inputClass} value={visionDraft.body} onChange={(e) => setVisionDraft({ ...visionDraft, body: e.target.value })} /></div>
      </section>

      {/* ── What We Stand For (Values) ─────────────────────────────────── */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-[#2B2620]">What We Stand For</h2>
          <button onClick={handleAddValue} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20]"><Plus size={14} /> Add Value</button>
        </div>
        {(data.values ?? []).length === 0 ? (
          <p className="text-[#9A8F82] text-sm">No values yet. Add your first one.</p>
        ) : (
          <div className="space-y-4">
            {(data.values ?? []).map((item) => (
              <div key={item.id} className="border border-[#EDE8DF] rounded-xl p-4 bg-[#FAFAF9]">
                <div className="grid grid-cols-[60px_1fr] gap-3 mb-3">
                  <div><label className={labelClass}>Icon</label>
                    <input className={inputClass} value={item.icon} onChange={(e) => patchValue(item.id, { icon: e.target.value })} onBlur={() => handleValueBlur(item, "icon")} />
                  </div>
                  <div><label className={labelClass}>Title</label>
                    <input className={inputClass} value={item.title} onChange={(e) => patchValue(item.id, { title: e.target.value })} onBlur={() => handleValueBlur(item, "title")} />
                  </div>
                </div>
                <div className="mb-2"><label className={labelClass}>Description</label>
                  <textarea rows={2} className={inputClass} value={item.description} onChange={(e) => patchValue(item.id, { description: e.target.value })} onBlur={() => handleValueBlur(item, "description")} />
                </div>
                <button onClick={() => handleDeleteValue(item.id)} className="flex items-center gap-1.5 text-[11px] text-red-500 hover:bg-red-50 rounded-lg px-2 py-1 mt-1"><Trash2 size={12} /> Delete</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Industries ─────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[14px] font-bold text-[#2B2620]">Industries</h2>
            <p className="text-[11px] text-[#9A8F82]">Only published industries appear on the website.</p>
          </div>
          <button onClick={handleAddIndustry} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20]"><Plus size={14} /> Add Industry</button>
        </div>
        {(data.industries ?? []).length === 0 ? (
          <p className="text-[#9A8F82] text-sm">No industries yet.</p>
        ) : (
          <div className="space-y-4">
            {(data.industries ?? []).map((item) => (
              <div key={item.id} className="border border-[#EDE8DF] rounded-xl p-4 bg-[#FAFAF9]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div><label className={labelClass}>Name</label>
                    <input className={inputClass} value={item.name} onChange={(e) => patchIndustry(item.id, { name: e.target.value })} onBlur={() => handleIndustryBlur(item, "name")} />
                  </div>
                  <div><label className={labelClass}>Description</label>
                    <input className={inputClass} value={item.description} onChange={(e) => patchIndustry(item.id, { description: e.target.value })} onBlur={() => handleIndustryBlur(item, "description")} />
                  </div>
                </div>
                <MediaUploadField label="Icon / Cover Image" kind="image" aspect="aspect-video" value={item.icon_url}
                  onChange={(url) => { patchIndustry(item.id, { icon_url: url }); updateIndustry(item.id, { icon_url: url }).catch((e) => setToast({ message: getErrorMessage(e), type: "error" })); }} />
                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div onClick={() => handleIndustryToggle(item)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${item.is_published ? "bg-[#C8922A]" : "bg-[#D6D0C8]"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.is_published ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                    <span className="text-[12px] font-semibold text-[#6B6259]">{item.is_published ? "Published" : "Draft"}</span>
                  </label>
                  <button onClick={() => handleDeleteIndustry(item.id)} className="flex items-center gap-1.5 text-[11px] text-red-500 hover:bg-red-50 rounded-lg px-2 py-1"><Trash2 size={12} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Team ───────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#EDE8DF] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[14px] font-bold text-[#2B2620]">Integrated Team</h2>
            <p className="text-[11px] text-[#9A8F82]">Mark one member as Founder for a hero card on the website.</p>
          </div>
          <button onClick={handleAddMember} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:text-[#B07A20]"><Plus size={14} /> Add Member</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.team_members.map((member) => (
            <div key={member.id} className={`border rounded-xl p-4 ${member.is_founder ? "border-[#C8922A] bg-[#FDF8F0]" : "border-[#EDE8DF]"}`}>
              {/* Founder badge */}
              {member.is_founder && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-[#C8922A] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide">FOUNDER</span>
                </div>
              )}
              <MediaUploadField kind="image" aspect="aspect-square" value={member.avatar_url}
                onChange={(url) => { handleMemberField(member.id, { avatar_url: url }); updateTeamMember(member.id, { avatar_url: url }).catch((e) => setToast({ message: getErrorMessage(e), type: "error" })); }} />
              <input className={`${inputClass} mt-3`} placeholder="Name" value={member.name}
                onChange={(e) => handleMemberField(member.id, { name: e.target.value })} onBlur={() => handleMemberBlur(member.id)} />
              <input className={`${inputClass} mt-2`} placeholder="Designation / Role" value={member.designation}
                onChange={(e) => handleMemberField(member.id, { designation: e.target.value })} onBlur={() => handleMemberBlur(member.id)} />
              <textarea rows={3} className={`${inputClass} mt-2`} placeholder="Bio (optional)" value={member.bio ?? ""}
                onChange={(e) => handleMemberField(member.id, { bio: e.target.value })} onBlur={() => handleMemberBlur(member.id)} />
              <input className={`${inputClass} mt-2`} placeholder="Instagram URL (optional)" value={member.social_instagram ?? ""}
                onChange={(e) => handleMemberField(member.id, { social_instagram: e.target.value })} onBlur={() => handleMemberBlur(member.id)} />
              <input className={`${inputClass} mt-2`} placeholder="LinkedIn URL (optional)" value={member.social_linkedin ?? ""}
                onChange={(e) => handleMemberField(member.id, { social_linkedin: e.target.value })} onBlur={() => handleMemberBlur(member.id)} />
              {/* Founder toggle + delete */}
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="accent-[#C8922A] w-4 h-4" checked={!!member.is_founder}
                    onChange={(e) => { handleMemberField(member.id, { is_founder: e.target.checked }); updateTeamMember(member.id, { is_founder: e.target.checked }).catch((err) => setToast({ message: getErrorMessage(err), type: "error" })); }} />
                  <span className="text-[12px] font-semibold text-[#6B6259]">Mark as Founder</span>
                </label>
                <button onClick={() => handleRemoveMember(member.id)} className="flex items-center gap-1.5 text-[11px] text-red-500 hover:bg-red-50 rounded-lg px-2 py-1">
                  {savingMemberId === member.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
