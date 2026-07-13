"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Film, Image as ImageIcon, AlertCircle } from "lucide-react";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface SelectedFile {
  file: File;
  id: string;
}

interface ServiceFormProps {
  initialData?: { name: string; description: string };
  onSubmit: (data: { name: string; description: string; files: File[] }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon size={16} className="text-blue-500" />;
  if (type.startsWith("video/")) return <Film size={16} className="text-purple-500" />;
  return <FileText size={16} className="text-red-500" />;
}

export default function ServiceForm({ initialData, onSubmit, onCancel, isSubmitting }: ServiceFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndAddFiles = useCallback((files: FileList | File[]) => {
    setFileError(null);
    const newFiles: SelectedFile[] = [];

    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setFileError(`"${file.name}" has an unsupported format. Accepted: JPEG, PNG, WebP, MP4, MOV, PDF.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`"${file.name}" exceeds the 50MB size limit.`);
        return;
      }
      newFiles.push({ file, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      files: selectedFiles.map((sf) => sf.file),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name Field */}
      <div className="space-y-2">
        <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
          Service Name *
        </label>
        <input
          required
          type="text"
          maxLength={200}
          placeholder="e.g. Interior Design Consultation"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
        />
        <p className="text-[11px] text-[#9A8F82]">{name.length}/200 characters</p>
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
          Description *
        </label>
        <textarea
          required
          rows={4}
          maxLength={2000}
          placeholder="Describe the service offering..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none resize-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
        />
        <p className="text-[11px] text-[#9A8F82]">{description.length}/2000 characters</p>
      </div>

      {/* Media Dropzone */}
      {!initialData && (
        <div className="space-y-2">
          <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
            Media Files
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[#C8922A] bg-[#C8922A]/5"
                : "border-[#EDE8DF] bg-[#FAF8F5] hover:border-[#C8922A]/50"
            }`}
          >
            <Upload size={32} className="mx-auto text-[#9A8F82] mb-3" />
            <p className="text-[14px] font-bold text-[#6B6259]">
              Drag & drop files here or click to select
            </p>
            <p className="text-[11px] text-[#9A8F82] mt-1">
              JPEG, PNG, WebP, MP4, MOV, PDF — Max 50MB per file
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File Error */}
          {fileError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={16} />
              <span>{fileError}</span>
            </div>
          )}

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 mt-3">
              {selectedFiles.map((sf) => (
                <div
                  key={sf.id}
                  className="flex items-center justify-between p-3 bg-white border border-[#EDE8DF] rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(sf.file.type)}
                    <span className="text-[13px] font-medium text-[#1C1C1C] truncate">
                      {sf.file.name}
                    </span>
                    <span className="text-[11px] text-[#9A8F82] whitespace-nowrap">
                      {formatFileSize(sf.file.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(sf.id);
                    }}
                    className="p-1 text-[#9A8F82] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="pt-6 border-t border-[#F5F2ED] flex justify-end items-center gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 text-[14px] font-bold text-[#6B6259] hover:text-[#1C1C1C] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-3 bg-[#C8922A] text-white text-[14px] font-black rounded-xl shadow-lg shadow-[#C8922A]/20 disabled:opacity-50 active:scale-95 transition-all flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              {initialData ? "Saving..." : "Creating..."}
            </>
          ) : initialData ? (
            "Save Changes"
          ) : (
            "Create Service"
          )}
        </button>
      </div>
    </form>
  );
}
