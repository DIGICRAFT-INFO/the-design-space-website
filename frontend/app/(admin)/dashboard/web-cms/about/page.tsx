"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import {
  getAboutAdmin,
  updateAboutAdmin,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from "@/services/webCmsService";
import type { WebAbout, TeamMember } from "@/services/websiteService";
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
