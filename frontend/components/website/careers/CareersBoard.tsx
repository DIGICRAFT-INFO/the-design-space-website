"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Upload, X } from "lucide-react";
import { submitJobApplication } from "@/services/websiteService";
import { getErrorMessage } from "@/lib/errors";
import MagneticButton from "@/components/website/MagneticButton";
import type { WebCareerJob } from "@/services/websiteService";

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

const inputClass =
  "w-full bg-transparent border-b border-[var(--ds-border)] py-2.5 text-sm placeholder:text-[var(--ds-ink-soft)] focus:outline-none focus:border-[var(--ds-gold)] transition-colors";

export default function CareersBoard({ jobs }: { jobs: WebCareerJob[] }) {
  const [openId, setOpenId] = useState<string | null>(jobs[0]?.id ?? null);

  if (jobs.length === 0) {
    return <p className="text-[var(--ds-ink-soft)]">No open roles right now — check back soon, or send us your portfolio anyway.</p>;
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const open = openId === job.id;
        return (
          <div key={job.id} className="border border-[var(--ds-border)] rounded-sm overflow-hidden">
            <button onClick={() => setOpenId(open ? null : job.id)} className="w-full flex items-center justify-between px-6 py-5 text-left">
              <div>
                <h3 className="text-lg md:text-xl font-light" style={{ fontFamily: "var(--font-display)" }}>{job.title}</h3>
                <p className="text-xs text-[var(--ds-ink-soft)] mt-1">
                  {job.department && `${job.department} · `}
                  {EMPLOYMENT_LABELS[job.employment_type] || job.employment_type} · {job.location}
                </p>
              </div>
              <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-8 border-t border-[var(--ds-border)] pt-6">
                    {job.description && <p className="text-sm text-[var(--ds-ink-soft)] leading-relaxed mb-4">{job.description}</p>}
                    {job.requirements?.length > 0 && (
                      <ul className="space-y-2 mb-8">
                        {job.requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <span className="mt-2 w-1 h-1 rounded-full bg-[var(--ds-gold)] shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    )}
                    <ApplicationForm jobId={job.id} jobTitle={job.title} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function ApplicationForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", cover_note: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setStatus("error");
      setErrorMsg("Please share your name, email and phone number.");
      return;
    }
    if (!file) {
      setStatus("error");
      setErrorMsg("A PDF resume is required.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("job_id", jobId);
      formData.append("job_title", jobTitle);
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("cover_note", form.cover_note);
      formData.append("resume", file);
      await submitJobApplication(formData);
      setStatus("success");
      setForm({ name: "", email: "", phone: "", cover_note: "" });
      setFile(null);
    } catch (err) {
      setStatus("error");
      setErrorMsg(getErrorMessage(err));
    }
  }

  if (status === "success") {
    return (
      <div className="bg-[var(--ds-bg-alt)] rounded-sm p-6">
        <p className="text-sm">Thank you — your application for <strong>{jobTitle}</strong> has been received.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--ds-ink-soft)]">Apply for this role</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
        <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} required />
      </div>
      <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} required />
      <textarea placeholder="A short note (optional)" rows={3} value={form.cover_note} onChange={(e) => setForm({ ...form, cover_note: e.target.value })} className={`${inputClass} resize-none`} />

      <div>
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {file ? (
          <div className="flex items-center justify-between border border-[var(--ds-border)] rounded-sm px-4 py-2.5 text-sm">
            <span className="truncate">{file.name}</span>
            <button type="button" onClick={() => setFile(null)} className="shrink-0 ml-2 text-[var(--ds-ink-soft)] hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-[var(--ds-border)] rounded-sm py-3 text-sm text-[var(--ds-ink-soft)] hover:border-[var(--ds-gold)] hover:text-[var(--ds-gold)] transition-colors"
          >
            <Upload size={15} /> Upload Resume (PDF)
          </button>
        )}
      </div>

      {status === "error" && <p className="text-sm text-red-500">{errorMsg}</p>}

      <MagneticButton
        type="submit"
        disabled={status === "submitting"}
        data-cursor="Apply"
        className="inline-flex items-center px-6 py-3 bg-[var(--ds-ink)] text-[var(--ds-bg)] rounded-full text-[11px] tracking-[0.14em] uppercase font-medium disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting…" : "Submit Application"}
      </MagneticButton>
    </form>
  );
}
