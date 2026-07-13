"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { uploadWebsiteImage, uploadWebsiteVideo } from "@/services/webCmsService";
import { resolveMediaUrl } from "@/lib/media";
import { getErrorMessage } from "@/lib/errors";

export default function MediaUploadField({
  value,
  onChange,
  kind = "image",
  label,
  aspect = "aspect-video",
}: {
  value?: string;
  onChange: (fileUrl: string) => void;
  kind?: "image" | "video";
  label?: string;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const res = kind === "video" ? await uploadWebsiteVideo(file) : await uploadWebsiteImage(file);
      onChange(res.file_url);
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {label && <p className="text-[12px] font-semibold text-[#6B6259] mb-1.5">{label}</p>}
      <div
        className={`relative w-full ${aspect} rounded-xl border-2 border-dashed border-[#EDE8DF] bg-[#FAF8F5] overflow-hidden flex items-center justify-center cursor-pointer hover:border-[#C8922A] transition-colors`}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-[#C8922A]" />
        ) : value ? (
          kind === "video" ? (
            <video src={resolveMediaUrl(value)} className="w-full h-full object-cover" muted />
          ) : (
            <img src={resolveMediaUrl(value)} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-[#9A8F82]">
            <Upload size={18} />
            <span className="text-[11px]">{kind === "video" ? "Upload video" : "Upload image"}</span>
          </div>
        )}

        {value && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={kind === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
