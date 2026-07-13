"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, Copy, Check, FileText, Film, File } from "lucide-react";
import { listMedia, deleteMedia, type MediaFile } from "@/services/webCmsService";
import { resolveMediaUrl } from "@/lib/media";
import { getErrorMessage } from "@/lib/errors";
import Toast, { type ToastState } from "@/components/webcms/Toast";

const FILTERS: { value: MediaFile["type"] | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "pdf", label: "PDFs" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function WebCmsMediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MediaFile["type"] | "all">("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  function load() {
    setLoading(true);
    listMedia()
      .then(setFiles)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = useMemo(() => (filter === "all" ? files : files.filter((f) => f.type === filter)), [files, filter]);

  async function handleCopy(file: MediaFile) {
    await navigator.clipboard.writeText(resolveMediaUrl(file.file_url));
    const key = `${file.folder}/${file.filename}`;
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  async function handleDelete(file: MediaFile) {
    if (!confirm(`Delete "${file.filename}"? This can't be undone, and any page still referencing it will show a broken image/link.`)) return;
    try {
      await deleteMedia(file.folder, file.filename);
      setFiles((list) => list.filter((f) => !(f.folder === file.folder && f.filename === file.filename)));
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
    <div className="p-6 max-w-6xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — Media Library</h1>
        <p className="text-[13px] text-[#9A8F82]">Every image, video, and resume uploaded to the website, in one place</p>
      </div>

      <div className="flex gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-colors ${
              filter === f.value ? "bg-[#2B2620] text-white" : "bg-white border border-[#EDE8DF] text-[#6B6259] hover:border-[#C8922A]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-[#9A8F82] text-sm">No files here yet — uploads from any Web-CMS form will show up in this library.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((file) => {
            const key = `${file.folder}/${file.filename}`;
            return (
              <div key={key} className="bg-white border border-[#EDE8DF] rounded-xl overflow-hidden group relative">
                <div className="aspect-square bg-[#FAF8F5] flex items-center justify-center overflow-hidden">
                  {file.type === "image" ? (
                    <img src={resolveMediaUrl(file.file_url)} alt={file.filename} className="w-full h-full object-cover" />
                  ) : file.type === "video" ? (
                    <Film className="w-6 h-6 text-[#9A8F82]" />
                  ) : file.type === "pdf" ? (
                    <FileText className="w-6 h-6 text-[#9A8F82]" />
                  ) : (
                    <File className="w-6 h-6 text-[#9A8F82]" />
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-medium text-[#2B2620] truncate" title={file.filename}>{file.filename}</p>
                  <p className="text-[10px] text-[#9A8F82]">{formatBytes(file.size_bytes)}</p>
                </div>
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(file)}
                    className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center hover:bg-[#FAF8F5]"
                    title="Copy URL"
                  >
                    {copiedKey === key ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="text-[#6B6259]" />}
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 size={13} className="text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
