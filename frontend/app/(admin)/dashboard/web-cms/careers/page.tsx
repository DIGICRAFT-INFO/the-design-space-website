"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ChevronDown, Save, Download, ExternalLink } from "lucide-react";
import {
  listJobsAdmin,
  createJob,
  updateJob,
  deleteJob,
  listApplicationsAdmin,
  updateApplicationStatus,
  deleteApplication,
  type CareerApplicationAdmin,
} from "@/services/webCmsService";
import type { WebCareerJob } from "@/services/websiteService";
import { resolveMediaUrl } from "@/lib/media";
import { getErrorMessage } from "@/lib/errors";
import Toast, { type ToastState } from "@/components/webcms/Toast";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#EDE8DF] bg-white text-[13px] focus:outline-none focus:border-[#C8922A]";
const labelClass = "text-[12px] font-semibold text-[#6B6259] mb-1.5 block";

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

export default function WebCmsCareersPage() {
  const [tab, setTab] = useState<"jobs" | "applicants">("jobs");
  const [toast, setToast] = useState<ToastState>(null);

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — Careers</h1>
        <p className="text-[13px] text-[#9A8F82]">Job board and applicant tracker</p>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-[#EDE8DF]">
        {(["jobs", "applicants"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[13px] font-semibold capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? "border-[#C8922A] text-[#C8922A]" : "border-transparent text-[#9A8F82] hover:text-[#2B2620]"
            }`}
          >
            {t === "jobs" ? "Job Postings" : "Applicant Tracker"}
          </button>
        ))}
      </div>

      {tab === "jobs" ? <JobsTab setToast={setToast} /> : <ApplicantsTab setToast={setToast} />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function JobsTab({ setToast }: { setToast: (t: ToastState) => void }) {
  const [jobs, setJobs] = useState<WebCareerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listJobsAdmin()
      .then(setJobs)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    try {
      const created = await createJob({ title: "New Role", employment_type: "full_time", requirements: [] });
      setJobs((s) => [created, ...s]);
      setOpenId(created.id);
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  function patchLocal(id: string, patch: Partial<WebCareerJob>) {
    setJobs((list) => list.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  async function handleSaveRow(job: WebCareerJob) {
    setSaving(job.id);
    try {
      const updated = await updateJob(job.id, job);
      setJobs((list) => list.map((j) => (j.id === job.id ? updated : j)));
      setToast({ message: "Job posting saved", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this job posting?")) return;
    try {
      await deleteJob(id);
      setJobs((list) => list.filter((j) => j.id !== id));
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-[#9A8F82]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={handleCreate} className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Job Posting
        </button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-[#9A8F82] text-sm">No job postings yet.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const open = openId === job.id;
            return (
              <div key={job.id} className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
                <button onClick={() => setOpenId(open ? null : job.id)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <div>
                    <p className="text-[14px] font-semibold text-[#2B2620]">{job.title || "Untitled Role"}</p>
                    <p className="text-[11px] text-[#9A8F82] capitalize">{job.department} · {job.status}</p>
                  </div>
                  <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="px-5 pb-5 border-t border-[#EDE8DF] pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={labelClass}>Job Title</label>
                        <input className={inputClass} value={job.title} onChange={(e) => patchLocal(job.id, { title: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelClass}>Department</label>
                        <input className={inputClass} value={job.department} onChange={(e) => patchLocal(job.id, { department: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={labelClass}>Location</label>
                        <input className={inputClass} value={job.location} onChange={(e) => patchLocal(job.id, { location: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelClass}>Employment Type</label>
                        <select className={inputClass} value={job.employment_type} onChange={(e) => patchLocal(job.id, { employment_type: e.target.value as WebCareerJob["employment_type"] })}>
                          {EMPLOYMENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className={labelClass}>Description</label>
                      <textarea rows={3} className={inputClass} value={job.description} onChange={(e) => patchLocal(job.id, { description: e.target.value })} />
                    </div>
                    <div className="mb-4">
                      <label className={labelClass}>Requirements (one per line)</label>
                      <textarea
                        rows={4}
                        className={inputClass}
                        value={job.requirements.join("\n")}
                        onChange={(e) => patchLocal(job.id, { requirements: e.target.value.split("\n").filter(Boolean) })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[12px] text-[#6B6259]">
                        <input type="checkbox" checked={job.status === "open"} onChange={(e) => patchLocal(job.id, { status: e.target.checked ? "open" : "closed" })} />
                        Open for applications
                      </label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDelete(job.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handleSaveRow(job)}
                          disabled={saving === job.id}
                          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                        >
                          {saving === job.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
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
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  reviewed: "bg-amber-50 text-amber-700",
  archived: "bg-gray-100 text-gray-600",
};

function ApplicantsTab({ setToast }: { setToast: (t: ToastState) => void }) {
  const [applications, setApplications] = useState<CareerApplicationAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    listApplicationsAdmin()
      .then(setApplications)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStatusChange(id: string, status: CareerApplicationAdmin["status"]) {
    try {
      const updated = await updateApplicationStatus(id, status);
      setApplications((list) => list.map((a) => (a.id === id ? updated : a)));
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this application?")) return;
    try {
      await deleteApplication(id);
      setApplications((list) => list.filter((a) => a.id !== id));
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-[#9A8F82]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (applications.length === 0) {
    return <p className="text-[#9A8F82] text-sm">No applications yet.</p>;
  }

  return (
    <div className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#EDE8DF] text-left text-[11px] uppercase tracking-wide text-[#9A8F82]">
              <th className="px-5 py-3">Applicant</th>
              <th className="px-5 py-3">Applied For</th>
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">Resume</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} className="border-b border-[#EDE8DF] last:border-0">
                <td className="px-5 py-3">
                  <p className="font-medium text-[#2B2620]">{app.applicant_name}</p>
                  {app.cover_note && <p className="text-[11px] text-[#9A8F82] line-clamp-1 max-w-xs">{app.cover_note}</p>}
                </td>
                <td className="px-5 py-3 text-[#6B6259]">{app.job_title_snapshot || "—"}</td>
                <td className="px-5 py-3 text-[#6B6259]">
                  <div>{app.phone}</div>
                  <div className="text-[11px] text-[#9A8F82]">{app.email}</div>
                </td>
                <td className="px-5 py-3">
                  {app.resume_url ? (
                    <a
                      href={resolveMediaUrl(app.resume_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[#C8922A] hover:underline"
                    >
                      <Download size={13} /> PDF <ExternalLink size={11} />
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3">
                  <select
                    value={app.status}
                    onChange={(e) => handleStatusChange(app.id, e.target.value as CareerApplicationAdmin["status"])}
                    className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border-0 ${STATUS_COLORS[app.status]}`}
                  >
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="archived">Archived</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => handleDelete(app.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
