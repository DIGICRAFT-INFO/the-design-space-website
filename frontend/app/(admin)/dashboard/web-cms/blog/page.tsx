"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Plus, Trash2, ChevronDown, Save, Eye, Code } from "lucide-react";
import { listBlogAdmin, createBlogPost, updateBlogPost, deleteBlogPost } from "@/services/webCmsService";
import type { WebBlogPost } from "@/services/websiteService";
import { getErrorMessage } from "@/lib/errors";
import MediaUploadField from "@/components/webcms/MediaUploadField";
import Toast, { type ToastState } from "@/components/webcms/Toast";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#EDE8DF] bg-white text-[13px] focus:outline-none focus:border-[#C8922A]";
const labelClass = "text-[12px] font-semibold text-[#6B6259] mb-1.5 block";

export default function WebCmsBlogPage() {
  const [posts, setPosts] = useState<WebBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastState>(null);

  function load() {
    setLoading(true);
    listBlogAdmin()
      .then(setPosts)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate() {
    try {
      const created = await createBlogPost({ title: "New Article" });
      setPosts((s) => [created, ...s]);
      setOpenId(created.id);
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  function patchLocal(id: string, patch: Partial<WebBlogPost>) {
    setPosts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function handleSaveRow(post: WebBlogPost) {
    setSaving(post.id);
    try {
      const updated = await updateBlogPost(post.id, post);
      setPosts((list) => list.map((p) => (p.id === post.id ? updated : p)));
      setToast({ message: "Article saved", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this article?")) return;
    try {
      await deleteBlogPost(id);
      setPosts((list) => list.filter((p) => p.id !== id));
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  if (loading) {
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
          <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — Blog Editorial Suite</h1>
          <p className="text-[13px] text-[#9A8F82]">Articles shown on the public Journal</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Article
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-[#9A8F82] text-sm">No articles yet. Create your first one.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const open = openId === post.id;
            const isPreview = !!preview[post.id];
            return (
              <div key={post.id} className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
                <button onClick={() => setOpenId(open ? null : post.id)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <div>
                    <p className="text-[14px] font-semibold text-[#2B2620]">{post.title || "Untitled Article"}</p>
                    <p className="text-[11px] text-[#9A8F82]">
                      /blog/{post.slug} · {post.status === "published" ? "Published" : "Draft"}
                    </p>
                  </div>
                  <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="px-5 pb-5 border-t border-[#EDE8DF] pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={labelClass}>Title</label>
                        <input className={inputClass} value={post.title} onChange={(e) => patchLocal(post.id, { title: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelClass}>Category</label>
                        <input className={inputClass} placeholder="Trends, Materials, Studio…" value={post.category} onChange={(e) => patchLocal(post.id, { category: e.target.value })} />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className={labelClass}>Excerpt</label>
                      <textarea rows={2} className={inputClass} value={post.excerpt} onChange={(e) => patchLocal(post.id, { excerpt: e.target.value })} />
                    </div>

                    <MediaUploadField label="Cover Image" kind="image" aspect="aspect-video" value={post.cover_image} onChange={(url) => patchLocal(post.id, { cover_image: url })} />

                    <div className="mt-4 mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={labelClass}>Content (Markdown)</label>
                        <button
                          onClick={() => setPreview((p) => ({ ...p, [post.id]: !p[post.id] }))}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B6259] hover:text-[#C8922A]"
                        >
                          {isPreview ? <Code size={13} /> : <Eye size={13} />} {isPreview ? "Edit" : "Preview"}
                        </button>
                      </div>
                      {isPreview ? (
                        <div className="ds-prose border border-[#EDE8DF] rounded-lg p-4 min-h-[200px] bg-[#FAF8F5]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content || "*Nothing to preview yet.*"}</ReactMarkdown>
                        </div>
                      ) : (
                        <textarea
                          rows={12}
                          className={`${inputClass} font-mono text-[12px]`}
                          placeholder="## Heading&#10;&#10;Write your article in Markdown…"
                          value={post.content}
                          onChange={(e) => patchLocal(post.id, { content: e.target.value })}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={labelClass}>Tags (comma-separated)</label>
                        <input
                          className={inputClass}
                          value={post.tags.join(", ")}
                          onChange={(e) => patchLocal(post.id, { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Author</label>
                          <input className={inputClass} value={post.author_name} onChange={(e) => patchLocal(post.id, { author_name: e.target.value })} />
                        </div>
                        <div>
                          <label className={labelClass}>Read Time (min)</label>
                          <input type="number" className={inputClass} value={post.read_time_minutes} onChange={(e) => patchLocal(post.id, { read_time_minutes: Number(e.target.value) })} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={labelClass}>Published Date</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={post.published_at ? post.published_at.split("T")[0] : ""}
                          onChange={(e) => patchLocal(post.id, { published_at: e.target.value || null })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Status</label>
                        <select
                          className={inputClass}
                          value={post.status}
                          onChange={(e) => patchLocal(post.id, { status: e.target.value as "draft" | "published" })}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[12px] text-[#6B6259]">
                        <input
                          type="checkbox"
                          checked={post.status === "published"}
                          onChange={(e) => patchLocal(post.id, { status: e.target.checked ? "published" : "draft" })}
                        />
                        Published
                      </label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDelete(post.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handleSaveRow(post)}
                          disabled={saving === post.id}
                          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                        >
                          {saving === post.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
