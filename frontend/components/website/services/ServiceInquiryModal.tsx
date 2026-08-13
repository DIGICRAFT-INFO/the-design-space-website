"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, ImageIcon, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { submitServiceInquiry } from "@/services/websiteService";
import { getErrorMessage } from "@/lib/errors";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ACCEPTED_TYPES = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "image/svg+xml", "image/avif", "image/bmp", "image/tiff",
  "application/pdf", "application/json", "text/json",
];
const ACCEPTED_EXT = ".jpg,.jpeg,.png,.webp,.gif,.svg,.avif,.bmp,.tiff,.pdf,.json";

type AttachedFile = { file: File; preview?: string; id: string };

interface Props {
  serviceName: string;
  serviceId?: string;
  onClose: () => void;
}

const inputClass =
  "w-full bg-transparent border-b border-[var(--ds-border)] py-3 text-sm placeholder:text-[var(--ds-ink-soft)] focus:outline-none focus:border-[var(--ds-gold)] transition-colors text-[var(--ds-ink)]";

export default function ServiceInquiryModal({ serviceName, serviceId, onClose }: Props) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", description: "" });
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const valid = arr.filter((f) => ACCEPTED_TYPES.includes(f.type));
    if (valid.length !== arr.length) {
      setErrorMsg(`${arr.length - valid.length} file(s) skipped — unsupported type.`);
    }
    const newItems: AttachedFile[] = valid.map((f) => ({
      file: f,
      id: `${Date.now()}-${Math.random()}`,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }));
    setFiles((prev) => [...prev, ...newItems].slice(0, 10));
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setStatus("error");
      setErrorMsg("Name and phone number are required.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const fd = new FormData();
      fd.append("service_name", serviceName);
      if (serviceId) fd.append("service_id", serviceId);
      fd.append("name", form.name.trim());
      fd.append("phone", form.phone.trim());
      fd.append("email", form.email.trim());
      fd.append("subject", form.subject.trim());
      fd.append("description", form.description.trim());
      files.forEach((f) => fd.append("attachments", f.file));
      await submitServiceInquiry(fd);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(getErrorMessage(err));
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ y: 60, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="relative z-10 w-full sm:max-w-2xl max-h-[95svh] sm:max-h-[90vh] flex flex-col bg-[var(--ds-bg)] sm:rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[var(--ds-border)] shrink-0">
            <div>
              <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--ds-gold)] mb-1">Service Inquiry</p>
              <h2
                className="text-xl md:text-2xl font-light tracking-tight text-[var(--ds-ink)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {serviceName}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-full text-[var(--ds-ink-soft)] hover:text-[var(--ds-ink)] hover:bg-[var(--ds-border)] transition-colors mt-0.5"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5">
            {status === "success" ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center py-10"
              >
                <CheckCircle2 size={48} className="text-[var(--ds-gold)] mb-4" />
                <h3
                  className="text-2xl font-light mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Inquiry Received
                </h3>
                <p className="text-sm text-[var(--ds-ink-soft)] max-w-sm">
                  Thank you for your interest in <span className="font-medium text-[var(--ds-ink)]">{serviceName}</span>. Our team will get back to you shortly.
                </p>
                <button
                  onClick={onClose}
                  className="mt-8 px-6 py-2.5 rounded-full border border-[var(--ds-ink)] text-[11px] tracking-[0.14em] uppercase font-medium hover:bg-[var(--ds-ink)] hover:text-[var(--ds-bg)] transition-colors"
                >
                  Close
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-1.5 block">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-1.5 block">
                      Phone <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-[10px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-1.5 block">
                    Email <span className="text-[var(--ds-ink-soft)] normal-case tracking-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="hello@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="text-[10px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-1.5 block">
                    Subject / Short Summary
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3BHK residential renovation — Raipur"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className={inputClass}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-1.5 block">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your space, requirements, timeline, budget…"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="text-[10px] tracking-[0.18em] uppercase text-[var(--ds-ink-soft)] mb-2 block">
                    Attachments <span className="normal-case tracking-normal text-[var(--ds-ink-soft)]">(images, PDF, JSON — up to 10 files, 25MB each)</span>
                  </label>

                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors px-4 py-6 flex flex-col items-center gap-2 ${
                      dragging
                        ? "border-[var(--ds-gold)] bg-[var(--ds-gold)]/5"
                        : "border-[var(--ds-border)] hover:border-[var(--ds-gold)]/50 hover:bg-[var(--ds-gold)]/3"
                    }`}
                  >
                    <Upload size={22} className="text-[var(--ds-ink-soft)]" />
                    <p className="text-sm text-[var(--ds-ink-soft)] text-center">
                      Drop files here or <span className="text-[var(--ds-gold)] font-medium">browse</span>
                    </p>
                    <p className="text-[11px] text-[var(--ds-ink-soft)]/60">
                      JPG, PNG, WebP, GIF, SVG, BMP, PDF, JSON
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPTED_EXT}
                      className="hidden"
                      onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                    />
                  </div>

                  {/* File list */}
                  {files.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {files.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--ds-bg-alt)] border border-[var(--ds-border)]"
                        >
                          {item.preview ? (
                            <img src={item.preview} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
                          ) : item.file.type === "application/pdf" ? (
                            <div className="w-10 h-10 rounded-md bg-red-50 flex items-center justify-center shrink-0">
                              <FileText size={18} className="text-red-500" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                              <ImageIcon size={18} className="text-blue-500" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium truncate text-[var(--ds-ink)]">{item.file.name}</p>
                            <p className="text-[10px] text-[var(--ds-ink-soft)]">
                              {(item.file.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(item.id)}
                            className="p-1.5 rounded-lg text-[var(--ds-ink-soft)] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Error */}
                {status === "error" && errorMsg && (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                {/* Submit */}
                <div className="pt-1 pb-2">
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[var(--ds-ink)] text-[var(--ds-bg)] rounded-full text-[11px] tracking-[0.14em] uppercase font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity"
                  >
                    {status === "submitting" ? (
                      <><Loader2 size={14} className="animate-spin" /> Sending…</>
                    ) : (
                      "Submit Inquiry"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
