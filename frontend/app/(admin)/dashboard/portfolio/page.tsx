"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, Image as ImageIcon, Upload, X, Loader2, Mail, MessageCircle,
  Download, Trash2, Send, FolderOpen, ChevronDown, AlertTriangle, CheckCircle,
  FileText, File as FileIcon,
} from "lucide-react";
import {
  getAllPortfolios, createPortfolio, deletePortfolio, uploadPortfolioImages,
  deletePortfolioImage, uploadPortfolioDocuments, deletePortfolioDocument,
  downloadPortfolioPDF, sendPortfolio, resolveImageUrl,
  type Portfolio, type PortfolioCategory,
} from "@/services/portfoliService";
import { getProjects, type Project } from "@/services/projectService";

const CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  living_room: "Living Room",
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  office: "Office",
  full_home: "Full Home",
  other: "Other",
};

function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null); // expanded card
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [sendModalFor, setSendModalFor] = useState<Portfolio | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getAllPortfolios(), getProjects().catch(() => [])])
      .then(([p, proj]) => {
        setPortfolios(p);
        setProjects(proj);
      })
      .catch(() => setPortfolios([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this portfolio and all its images?")) return;
    await deletePortfolio(id);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9A8F82]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading portfolio...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#2B2620]">Portfolio</h1>
          <p className="text-[13px] text-[#9A8F82]">Showcase completed work · share with clients</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Portfolio
        </button>
      </div>

      {/* Grid */}
      {portfolios.length === 0 ? (
        <div className="text-center py-20 text-[#9A8F82]">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No portfolio entries yet</p>
          <p className="text-[13px] mt-1">Create one and start uploading photos of finished work.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {portfolios.map((pf) => (
            <PortfolioCard
              key={pf.id}
              portfolio={pf}
              expanded={activeId === pf.id}
              uploading={uploadingId === pf.id}
              uploadingDoc={uploadingDocId === pf.id}
              onToggle={() => setActiveId(activeId === pf.id ? null : pf.id)}
              onUpload={async (files) => {
                setUploadingId(pf.id);
                try {
                  await uploadPortfolioImages(pf.id, files);
                  load();
                } finally {
                  setUploadingId(null);
                }
              }}
              onDeleteImage={async (imageId) => {
                await deletePortfolioImage(pf.id, imageId);
                load();
              }}
              onUploadDoc={async (files) => {
                setUploadingDocId(pf.id);
                try {
                  await uploadPortfolioDocuments(pf.id, files);
                  load();
                } finally {
                  setUploadingDocId(null);
                }
              }}
              onDeleteDoc={async (docId) => {
                await deletePortfolioDocument(pf.id, docId);
                load();
              }}
              onDeletePortfolio={() => handleDelete(pf.id)}
              onDownload={() => downloadPortfolioPDF(pf.id, pf.title)}
              onSend={() => setSendModalFor(pf)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <CreatePortfolioModal
          projects={projects}
          creating={creating}
          onClose={() => setCreateOpen(false)}
          onCreate={async (payload) => {
            setCreating(true);
            try {
              await createPortfolio(payload);
              setCreateOpen(false);
              load();
            } finally {
              setCreating(false);
            }
          }}
        />
      )}

      {/* Send Modal */}
      {sendModalFor && (
        <SendPortfolioModal
          portfolio={sendModalFor}
          onClose={() => setSendModalFor(null)}
        />
      )}
    </div>
  );
}

// ── Portfolio Card ─────────────────────────────────────────────────────────

function PortfolioCard({
  portfolio, expanded, uploading, uploadingDoc, onToggle, onUpload, onDeleteImage,
  onUploadDoc, onDeleteDoc, onDeletePortfolio, onDownload, onSend,
}: {
  portfolio: Portfolio;
  expanded: boolean;
  uploading: boolean;
  uploadingDoc: boolean;
  onToggle: () => void;
  onUpload: (files: File[]) => void;
  onDeleteImage: (imageId: string) => void;
  onUploadDoc: (files: File[]) => void;
  onDeleteDoc: (docId: string) => void;
  onDeletePortfolio: () => void;
  onDownload: () => void;
  onSend: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [docDragOver, setDocDragOver] = useState(false);
  const cover = portfolio.images?.[0];
  const projectName = typeof portfolio.project === "object" ? portfolio.project?.name : undefined;
  const docCount = portfolio.documents?.length || 0;

  return (
    <div className="bg-white border border-[#EDE8DF] rounded-xl overflow-hidden flex flex-col">
      {/* Cover */}
      <div
        className="relative h-40 bg-[#F5F2ED] flex items-center justify-center cursor-pointer"
        onClick={onToggle}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveImageUrl(cover.file_url)} alt={portfolio.title} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-8 h-8 text-[#D8D0C2]" />
        )}
        <span className="absolute top-2 left-2 bg-black/55 text-white text-[10px] font-semibold px-2 py-1 rounded">
          {portfolio.images?.length || 0} photo{portfolio.images?.length !== 1 ? "s" : ""}
        </span>
        <span
          className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-1 rounded ${
            portfolio.status === "published" ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#F5F2ED] text-[#9A8F82]"
          }`}
        >
          {portfolio.status}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-[#2B2620] leading-snug">{portfolio.title}</h3>
          <ChevronDown className={`w-4 h-4 text-[#9A8F82] shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} onClick={onToggle} />
        </div>
        <p className="text-[11px] text-[#9A8F82] mt-1">{CATEGORY_LABELS[portfolio.category]}</p>
        {projectName && (
          <p className="text-[11px] text-[#9A8F82] flex items-center gap-1 mt-1">
            <FolderOpen className="w-3 h-3" /> {projectName}
          </p>
        )}
        {docCount > 0 && (
          <p className="text-[11px] text-[#9A8F82] flex items-center gap-1 mt-1">
            <FileText className="w-3 h-3" /> {docCount} document{docCount !== 1 ? "s" : ""}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F0ECE4]">
          <button
            onClick={onSend}
            disabled={!portfolio.images?.length}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#C8922A] hover:bg-[#B07A20] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> Send
          </button>
          <button
            onClick={onDownload}
            disabled={!portfolio.images?.length}
            title="Download PDF"
            className="p-2 rounded-lg border border-[#EDE8DF] text-[#6B6259] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onDeletePortfolio}
            title="Delete portfolio"
            className="p-2 rounded-lg border border-[#EDE8DF] text-[#9A8F82] hover:bg-[#FEF2F2] hover:text-[#EF4444] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded — gallery + upload */}
      {expanded && (
        <div className="border-t border-[#F0ECE4] p-4 bg-[#FAF8F5] space-y-5">
          {/* ── Images section ── */}
          <div>
            <p className="text-[11px] font-semibold text-[#6B6259] uppercase tracking-wide mb-2">Photos</p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) onUpload(Array.from(e.dataTransfer.files));
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-lg py-5 cursor-pointer transition-colors ${
                dragOver ? "border-[#C8922A] bg-[#FDF3E3]" : "border-[#D8D0C2] hover:border-[#C8922A]"
              }`}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#C8922A]" />
              ) : (
                <Upload className="w-5 h-5 text-[#9A8F82]" />
              )}
              <p className="text-[12px] text-[#6B6259] font-medium">
                {uploading ? "Uploading..." : "Drop images here or click to upload"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) onUpload(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
            </div>

            {portfolio.images?.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {portfolio.images.map((img) => (
                  <div key={img.id} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveImageUrl(img.file_url)} alt={img.caption || ""} className="w-full h-20 object-cover rounded-md border border-[#EDE8DF]" />
                    <button
                      onClick={() => onDeleteImage(img.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── PDF documents section ── */}
          <div>
            <p className="text-[11px] font-semibold text-[#6B6259] uppercase tracking-wide mb-2">Documents (PDF)</p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDocDragOver(true); }}
              onDragLeave={() => setDocDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDocDragOver(false);
                if (e.dataTransfer.files.length) onUploadDoc(Array.from(e.dataTransfer.files));
              }}
              onClick={() => docInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-lg py-5 cursor-pointer transition-colors ${
                docDragOver ? "border-[#C8922A] bg-[#FDF3E3]" : "border-[#D8D0C2] hover:border-[#C8922A]"
              }`}
            >
              {uploadingDoc ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#C8922A]" />
              ) : (
                <FileText className="w-5 h-5 text-[#9A8F82]" />
              )}
              <p className="text-[12px] text-[#6B6259] font-medium">
                {uploadingDoc ? "Uploading..." : "Drop PDF files here or click to upload"}
              </p>
              <input
                ref={docInputRef}
                type="file"
                accept="application/pdf"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) onUploadDoc(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
            </div>

            {docCount > 0 && (
              <div className="space-y-1.5 mt-3">
                {portfolio.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 bg-white border border-[#EDE8DF] rounded-md px-2.5 py-2 group"
                  >
                    <FileIcon className="w-3.5 h-3.5 text-[#C8922A] shrink-0" />
                    <a
                      href={resolveImageUrl(doc.file_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-[#2B2620] truncate flex-1 hover:underline"
                      title={doc.title}
                    >
                      {doc.title}
                    </a>
                    {doc.file_size > 0 && (
                      <span className="text-[10px] text-[#9A8F82] shrink-0">{formatFileSize(doc.file_size)}</span>
                    )}
                    <button
                      onClick={() => onDeleteDoc(doc.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#9A8F82] hover:text-[#EF4444] shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Portfolio Modal ──────────────────────────────────────────────────

function CreatePortfolioModal({
  projects, creating, onClose, onCreate,
}: {
  projects: Project[];
  creating: boolean;
  onClose: () => void;
  onCreate: (payload: { title: string; description: string; category: PortfolioCategory; project: string; custom_category?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PortfolioCategory>("other");
  const [project, setProject] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-[#2B2620]">New Portfolio Entry</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-[#9A8F82]" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-medium text-[#6B6259]">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Skyline Residence — Living Room"
              className="w-full mt-1 px-3 py-2 text-[13px] border border-[#EDE8DF] rounded-lg outline-none focus:border-[#C8922A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[#6B6259]">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as PortfolioCategory);
                  if (e.target.value !== "other") setCustomCategory("");
                }}
                className="w-full mt-1 px-3 py-2 text-[13px] border border-[#EDE8DF] rounded-lg outline-none focus:border-[#C8922A] bg-white"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#6B6259]">Project (optional)</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-[13px] border border-[#EDE8DF] rounded-lg outline-none focus:border-[#C8922A] bg-white"
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom category input — sirf "Other" select hone par dikhega */}
          {category === "other" && (
            <div>
              <label className="text-[12px] font-medium text-[#6B6259]">
                Custom Category Name <span className="text-[#9A8F82] font-normal">(optional)</span>
              </label>
              <input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Terrace, Balcony, Kids Room..."
                className="w-full mt-1 px-3 py-2 text-[13px] border border-[#EDE8DF] rounded-lg outline-none focus:border-[#C8922A]"
              />
            </div>
          )}

          <div>
            <label className="text-[12px] font-medium text-[#6B6259]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Short note about the work done..."
              className="w-full mt-1 px-3 py-2 text-[13px] border border-[#EDE8DF] rounded-lg outline-none focus:border-[#C8922A] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-[13px] font-medium text-[#6B6259] border border-[#EDE8DF] rounded-lg hover:bg-[#FAF8F5]">
            Cancel
          </button>
          <button
            disabled={!title.trim() || creating}
            onClick={() => onCreate({
              title: title.trim(),
              description,
              category,
              project,
              ...(category === "other" && customCategory.trim() ? { custom_category: customCategory.trim() } : {}),
            })}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-[#C8922A] hover:bg-[#B07A20] disabled:opacity-50 rounded-lg"
          >
            {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Send Portfolio Modal ────────────────────────────────────────────────────

function SendPortfolioModal({ portfolio, onClose }: { portfolio: Portfolio; onClose: () => void }) {
  const client = typeof portfolio.project === "object" ? portfolio.project?.client : undefined;

  const [channel, setChannel] = useState<"email" | "whatsapp" | null>(null);
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (channel === "email") setRecipient(client?.email || "");
    if (channel === "whatsapp") setRecipient(client?.phone || "");
  }, [channel, client]);

  async function handleSend() {
    if (!channel) return;
    setSending(true);
    setResult(null);
    try {
      const res = await sendPortfolio(portfolio.id, channel, recipient || undefined);
      setResult({ ok: true, message: res.message });
    } catch (err: any) {
      setResult({ ok: false, message: err?.error || "Failed to send. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-[#2B2620]">Send Portfolio</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-[#9A8F82]" /></button>
        </div>
        <p className="text-[12px] text-[#9A8F82] mb-4">"{portfolio.title}" · {portfolio.images?.length || 0} photos</p>

        {/* Channel selector */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => setChannel("email")}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-[12px] font-medium transition-colors ${
              channel === "email" ? "border-[#C8922A] bg-[#FDF3E3] text-[#C8922A]" : "border-[#EDE8DF] text-[#6B6259] hover:bg-[#FAF8F5]"
            }`}
          >
            <Mail className="w-4 h-4" /> Email
          </button>
          <button
            onClick={() => setChannel("whatsapp")}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-[12px] font-medium transition-colors ${
              channel === "whatsapp" ? "border-[#C8922A] bg-[#FDF3E3] text-[#C8922A]" : "border-[#EDE8DF] text-[#6B6259] hover:bg-[#FAF8F5]"
            }`}
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
        </div>

        {channel && (
          <div className="mb-3">
            <label className="text-[12px] font-medium text-[#6B6259]">
              {channel === "email" ? "Recipient email" : "Recipient phone"}
            </label>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={channel === "email" ? "client@email.com" : "+91 9XXXXXXXXX"}
              className="w-full mt-1 px-3 py-2 text-[13px] border border-[#EDE8DF] rounded-lg outline-none focus:border-[#C8922A]"
            />
            {!recipient && (
              <p className="text-[11px] text-[#C8922A] mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> No client contact on file — enter one manually.
              </p>
            )}
          </div>
        )}

        {result && (
          <div className={`flex items-center gap-2 text-[12px] mb-3 px-3 py-2 rounded-lg ${
            result.ok ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#FEF2F2] text-[#EF4444]"
          }`}>
            {result.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {result.message}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-[13px] font-medium text-[#6B6259] border border-[#EDE8DF] rounded-lg hover:bg-[#FAF8F5]">
            Close
          </button>
          <button
            disabled={!channel || !recipient || sending}
            onClick={handleSend}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-[#C8922A] hover:bg-[#B07A20] disabled:opacity-50 rounded-lg"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send
          </button>
        </div>
      </div>
    </div>
  );
}
