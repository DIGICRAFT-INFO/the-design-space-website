"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  FileText,
  Loader2,
  X,
  Trash2,
  Edit3,
  Save,
  ChevronDown,
  Printer,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Send,
  CheckCircle,
  XCircle,
  Package,
} from "lucide-react";

import {
  getAllProposals,
  getProposalTemplates,
  createProposal,
  updateProposal,
  deleteProposal,
  updateProposalStatus,
  downloadProposalPdf,
  sendProposalEmail,
  sendProposalWhatsApp,
  type Proposal,
  type ProposalFormData,
  type ProposalTemplate,
} from "@/services/proposalService";

import {
  getAllClients,
  createClient,
  type Client,
  type ClientFormData,
} from "@/services/clientService";

import API_BASE_URL from "@/lib/config";

// ── MasterService type ───────────────────────────────────────────────────────
interface MasterService {
  id: string;
  name: string;
  description: string;
  status: string;
  media: Array<{ file_url: string; file_type: string; original_filename: string }>;
}

function getServiceImgUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  if (fileUrl.startsWith("http")) return fileUrl;
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${origin}/${fileUrl.replace(/^\//, "")}`;
}import {
  getProjectsByClient,
  createProject,
  type Project,
} from "@/services/projectService";

/* ─────────────────────────────────────────────────────────────────────────── */

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Draft", color: "#6B6259", bg: "#F5F2ED" },
  sent: { label: "Sent", color: "#3B82F6", bg: "#EFF6FF" },
  accepted: { label: "Accepted", color: "#10B981", bg: "#ECFDF5" },
  rejected: { label: "Rejected", color: "#EF4444", bg: "#FEF2F2" },
};

const blankForm: ProposalFormData = {
  project: "",
  title: "",
  content: "",
  status: "draft",
  valid_until: "",
  notes: "",
  use_template: "",
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* Quick Add: Client Modal */
/* ─────────────────────────────────────────────────────────────────────────── */

function QuickAddClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (client: Client) => void;
}) {
const [form, setForm] = useState<ClientFormData>({
  full_name: "",
  email: "",
  phone: "",
  billing_address: "",
  site_address: "",
  gstin: "",
  state: "",
  country: "India",
  city: "",
  lead_source: "",
  lead_source_other: "",
  client_type: "",
  client_type_other: "",
});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const created = await createClient(form);
      onCreated(created);
    } catch (err: any) {
      setError(err?.message || "Failed to create client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#EDE8DF] flex justify-between items-center bg-[#FCFBF9]">
          <h3 className="text-[16px] font-bold">Add New Client</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#F5F2ED] rounded-full text-[#9A8F82]"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="p-5 space-y-3 max-h-[70vh] overflow-y-auto"
        >
          {error && (
            <p className="text-[12px] text-red-500 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div>
            <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
              Full Name *
            </label>
            <input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] outline-none bg-[#FAF8F5] focus:border-[#C8922A]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
              Phone *
            </label>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] outline-none bg-[#FAF8F5] focus:border-[#C8922A]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
              Email
            </label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] outline-none bg-[#FAF8F5] focus:border-[#C8922A]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
              Billing Address *
            </label>
            <textarea
              required
              rows={2}
              value={form.billing_address}
              onChange={(e) =>
                setForm({ ...form, billing_address: e.target.value })
              }
              className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] outline-none bg-[#FAF8F5] focus:border-[#C8922A] resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
              Site Address
            </label>
            <textarea
              rows={2}
              value={form.site_address}
              onChange={(e) =>
                setForm({ ...form, site_address: e.target.value })
              }
              className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] outline-none bg-[#FAF8F5] focus:border-[#C8922A] resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
              GSTIN
            </label>
            <input
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] outline-none bg-[#FAF8F5] focus:border-[#C8922A]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#C8922A] hover:bg-[#B07A20] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[13px] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            Save Client
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Quick Add: Project Modal */
/* ─────────────────────────────────────────────────────────────────────────── */

function QuickAddProjectModal({
  clientId,
  clientName,
  onClose,
  onCreated,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<Project>({
    client: clientId,
    name: "",
    property_type: "apartment",
    style_category: "modern",
    area_sqft: "",
    budget_range: "",
    start_date: today,
    expected_end_date: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    setForm((p) => ({ ...p, client: clientId }));
  }, [clientId]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload: Project = {
        ...form,
        client: clientId, // force
        area_sqft: form.area_sqft === "" ? null : form.area_sqft,
      };

      const created = await createProject(clientId, payload);
      onCreated(created);
    } catch (err: any) {
      setError(err?.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#EDE8DF] flex justify-between items-center bg-[#FCFBF9]">
          <div>
            <h3 className="text-[16px] font-bold">Add New Project</h3>
            <p className="text-[11px] text-[#9A8F82]">Client: {clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#F5F2ED] rounded-full text-[#9A8F82]"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="p-5 space-y-3 max-h-[70vh] overflow-y-auto"
        >
          {error && (
            <p className="text-[12px] text-red-500 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div>
            <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
              Client
            </label>
            <input
              value={clientName}
              disabled
              className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] bg-[#FAF8F5] opacity-80"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
              Project Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] outline-none bg-[#FAF8F5] focus:border-[#C8922A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
                Property Type *
              </label>
              <select
                value={form.property_type}
                onChange={(e) =>
                  setForm({ ...form, property_type: e.target.value })
                }
                className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] outline-none bg-[#FAF8F5] focus:border-[#C8922A]"
              >
                {["apartment", "villa", "office", "commercial"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
                Style
              </label>
              <select
                value={form.style_category}
                onChange={(e) =>
                  setForm({ ...form, style_category: e.target.value })
                }
                className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] outline-none bg-[#FAF8F5] focus:border-[#C8922A]"
              >
                {["modern", "traditional", "minimalist", "contemporary"].map(
                  (v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
                Area (sqft)
              </label>
              <input
                type="number"
                value={form.area_sqft ?? ""}
                onChange={(e) =>
                  setForm({ ...form, area_sqft: e.target.value })
                }
                className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] outline-none bg-[#FAF8F5] focus:border-[#C8922A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">
                Budget Range
              </label>
              <input
                value={form.budget_range}
                onChange={(e) =>
                  setForm({ ...form, budget_range: e.target.value })
                }
                className="w-full border border-[#EDE8DF] rounded-xl p-2.5 text-[13px] outline-none bg-[#FAF8F5] focus:border-[#C8922A]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#C8922A] hover:bg-[#B07A20] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[13px] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            Save Project
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Main Page */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function ProposalsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allServices, setAllServices] = useState<MasterService[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProposalFormData>(blankForm);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [showTemplate, setShowTemplate] = useState(false);
  const [showValidUntil, setShowValidUntil] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [proposalList, templateList, clientList, serviceList] = await Promise.all([
        getAllProposals(),
        getProposalTemplates(),
        getAllClients(),
        fetch(`${API_BASE_URL}/services/?status=active`, {
          headers: { Authorization: `Bearer ${typeof window !== "undefined" ? (localStorage.getItem("access") || localStorage.getItem("token") || "") : ""}` }
        }).then(r => r.ok ? r.json() : { results: [] }).then(d => (d.results ?? d ?? []) as MasterService[]),
      ]);
      setProposals(proposalList);
      setTemplates(templateList);
      setClients(clientList);
      setAllServices(serviceList);
    } catch (e) {
      console.error(e);
      alert("Failed to load proposals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadProjectsForClient = useCallback(async (clientId: string) => {
    if (!clientId) {
      setProjects([]);
      return;
    }
    try {
      const list = await getProjectsByClient(clientId);
      setProjects(list);
    } catch (e) {
      console.error(e);
      setProjects([]);
    }
  }, []);

  const openNew = () => {
    setEditId(null);
    setFormData(blankForm);
    setSelectedClientId("");
    setProjects([]);
    setSelectedServiceIds([]);

    setShowTemplate(false);
    setShowValidUntil(false);
    setShowNotes(false);

    setIsModalOpen(true);
  };

  const openEdit = async (p: Proposal) => {
    setEditId(p.id);

    const cid = p.client_id ?? "";
    setSelectedClientId(cid);
    await loadProjectsForClient(cid);

    // Restore selected services — backend returns populated objects or IDs
    const svcIds = (p.services || []).map((s: any) =>
      typeof s === "object" ? s.id || s._id : s
    );
    setSelectedServiceIds(svcIds);

    setFormData({
      project:
        (typeof p.project === "object" && p.project
          ? (p.project as any).id || (p.project as any)._id
          : p.project) || "",
      title: p.title ?? "",
      content: p.content ?? "",
      status: p.status ?? "draft",
      valid_until: p.valid_until ? String(p.valid_until).split("T")[0] : "",
      notes: p.notes ?? "",
      use_template:
        (typeof p.template === "object" && p.template
          ? (p.template as any).id || (p.template as any)._id
          : p.template) || "",
    });

    setShowTemplate(!!p.template);
    setShowValidUntil(!!p.valid_until);
    setShowNotes(!!p.notes);

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData(blankForm);
    setSelectedClientId("");
    setProjects([]);
    setSelectedServiceIds([]);
  };

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    setFormData((prev) => ({
      ...prev,
      use_template: templateId,
      // frontend preview auto-fill (backend will also auto-generate on create)
      content: tpl?.content ?? prev.content,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (!formData.project) {
      alert("Please select a project");
      setSaving(false);
      return;
    }
    if (!showTemplate && !formData.content) {
      alert("Content is required (or select a template)");
      setSaving(false);
      return;
    }

    const payload: ProposalFormData = {
      project: formData.project,
      title: formData.title,
      status: formData.status ?? "draft",

      content: showTemplate ? formData.content || undefined : formData.content,
      use_template: showTemplate
        ? formData.use_template || undefined
        : undefined,
      valid_until: showValidUntil
        ? formData.valid_until || undefined
        : undefined,
      notes: showNotes ? formData.notes || undefined : undefined,
      services: selectedServiceIds.length > 0 ? selectedServiceIds : [],
    };

    try {
      if (editId) await updateProposal(editId, payload);
      else await createProposal(payload);

      await fetchData();
      closeModal();
    } catch (err: any) {
      alert("Error: " + (err?.message || "Failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this proposal?")) return;
    try {
      await deleteProposal(id);
      setProposals((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const markStatus = async (
    id: string,
    st: "sent" | "accepted" | "rejected",
  ) => {
    setActionId(`${st}_${id}`);
    try {
      await updateProposalStatus(id, st);
      await fetchData();
    } catch (e: any) {
      alert(e?.message || "Status update failed");
    } finally {
      setActionId(null);
    }
  };

  const handleDownloadPdf = async (p: Proposal) => {
    setActionId(`pdf_${p.id}`);
    try {
      const blob = await downloadProposalPdf(p.id);
      const filename = `${(p.prop_number || p.id).replace(/[^\w.-]+/g, "_")}.pdf`;

      const url = URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      alert(e?.message || "PDF download failed");
    } finally {
      setActionId(null);
    }
  };

  const handleDownloadCsv = (p: Proposal) => {
    const rows = [
      ["Proposal Number", p.prop_number ?? ""],
      ["Title", p.title ?? ""],
      ["Client", p.client_name ?? ""],
      ["Project", p.project_name ?? ""],
      ["Status", p.status ?? ""],
      ["Valid Until", p.valid_until ?? ""],
      ["Notes", p.notes ?? ""],
      ["Content", p.content ?? ""],
    ];

    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(p.prop_number || p.id).replace(/[^\w.-]+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendEmail = async (id: string) => {
    setActionId(`email_${id}`);
    try {
      await sendProposalEmail(id);
      alert("✅ Proposal emailed to client!");
    } catch (e: any) {
      alert(e?.message || "Email failed");
    } finally {
      setActionId(null);
    }
  };

  const handleSendWhatsApp = async (id: string) => {
    setActionId(`wa_${id}`);
    try {
      await sendProposalWhatsApp(id);
      alert("✅ Proposal sent on WhatsApp!");
    } catch (e: any) {
      alert(e?.message || "WhatsApp failed");
    } finally {
      setActionId(null);
    }
  };

  // Quick add callbacks
  const handleClientCreated = async (client: Client) => {
    setClients((prev) => [client, ...prev]);
    setSelectedClientId(client.id);
    setFormData((prev) => ({ ...prev, project: "" }));
    setShowAddClient(false);
    await loadProjectsForClient(client.id);
  };

  const handleProjectCreated = (project: Project) => {
    setProjects((prev) => [project, ...prev]);
    setFormData((prev) => ({ ...prev, project: project.id! }));
    setShowAddProject(false);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return proposals.filter((p) => {
      return (
        (p.client_name ?? "").toLowerCase().includes(q) ||
        (p.prop_number ?? "").toLowerCase().includes(q) ||
        (p.title ?? "").toLowerCase().includes(q)
      );
    });
  }, [proposals, searchQuery]);

  const selectedClientName =
    clients.find((c) => c.id === selectedClientId)?.full_name ||
    "Selected Client";

  return (
    <div className="min-h-screen bg-[#FCFBF9] p-6 md:p-10 text-[#1C1C1C]">
      {/* Nested quick add modals */}
      {showAddClient && (
        <QuickAddClientModal
          onClose={() => setShowAddClient(false)}
          onCreated={handleClientCreated}
        />
      )}

      {showAddProject && selectedClientId && (
        <QuickAddProjectModal
          clientId={selectedClientId}
          clientName={selectedClientName}
          onClose={() => setShowAddProject(false)}
          onCreated={handleProjectCreated}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Proposals</h1>
          <p className="text-[#9A8F82] font-medium">
            Create and manage client proposals
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-[#C8922A] hover:bg-[#B07A20] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
        >
          <Plus size={20} strokeWidth={3} /> New Proposal
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EDE8DF] rounded-[32px] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#EDE8DF]">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9A8F82]"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by client, number, or title..."
              className="w-full pl-12 pr-4 py-3 bg-[#FAF8F5] rounded-xl outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EDE8DF] text-[11px] font-black text-[#9A8F82] uppercase tracking-[2px]">
                <th className="px-8 py-5">Document</th>
                <th className="px-8 py-5">Client / Project</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Valid Until</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F5F2ED]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-[#C8922A]" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-[#9A8F82]">
                    No proposals found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#FCFBF9] transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#FDF3E3] rounded-xl flex items-center justify-center text-[#C8922A]">
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-[14px]">
                            #{p.prop_number ?? "—"}
                          </p>
                          <p className="text-[12px] text-[#9A8F82]">
                            {p.title}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <p className="font-bold text-[14px]">
                        {p.client_name || "—"}
                      </p>
                      <p className="text-[12px] text-[#6B6259]">
                        {p.project_name || "—"}
                      </p>
                    </td>

                    <td className="px-8 py-6">
                      <span
                        className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                        style={{
                          backgroundColor: statusConfig[p.status]?.bg,
                          color: statusConfig[p.status]?.color,
                        }}
                      >
                        {statusConfig[p.status]?.label ?? p.status}
                      </span>
                    </td>

                    <td className="px-8 py-6 text-[13px] text-[#6B6259]">
                      {p.valid_until || "—"}
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 border border-[#EDE8DF] rounded-lg text-[#6B6259] hover:text-[#C8922A]"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>

                        {p.status === "draft" && (
                          <button
                            onClick={() => markStatus(p.id, "sent")}
                            disabled={actionId === `sent_${p.id}`}
                            className="p-2 border border-[#EDE8DF] rounded-lg text-[#6B6259] hover:text-[#3B82F6] disabled:opacity-50"
                            title="Mark Sent"
                          >
                            {actionId === `sent_${p.id}` ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Send size={14} />
                            )}
                          </button>
                        )}

                        {p.status === "sent" && (
                          <>
                            <button
                              onClick={() => markStatus(p.id, "accepted")}
                              disabled={actionId === `accepted_${p.id}`}
                              className="p-2 border border-[#EDE8DF] rounded-lg text-[#6B6259] hover:text-[#10B981] disabled:opacity-50"
                              title="Accept"
                            >
                              {actionId === `accepted_${p.id}` ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <CheckCircle size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => markStatus(p.id, "rejected")}
                              disabled={actionId === `rejected_${p.id}`}
                              className="p-2 border border-[#EDE8DF] rounded-lg text-[#6B6259] hover:text-[#EF4444] disabled:opacity-50"
                              title="Reject"
                            >
                              {actionId === `rejected_${p.id}` ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <XCircle size={14} />
                              )}
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleDownloadPdf(p)}
                          disabled={actionId === `pdf_${p.id}`}
                          className="p-2 border border-[#EDE8DF] rounded-lg text-[#6B6259] hover:text-[#1C1C1C] disabled:opacity-50"
                          title="PDF"
                        >
                          {actionId === `pdf_${p.id}` ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Printer size={14} />
                          )}
                        </button>

                        <button
                          onClick={() => handleDownloadCsv(p)}
                          className="p-2 border border-[#EDE8DF] rounded-lg text-[#6B6259] hover:text-[#10B981]"
                          title="CSV"
                        >
                          <FileSpreadsheet size={14} />
                        </button>

                        <button
                          onClick={() => handleSendEmail(p.id)}
                          disabled={actionId === `email_${p.id}`}
                          className="p-2 border border-[#EDE8DF] rounded-lg text-[#6B6259] hover:text-[#3B82F6] disabled:opacity-50"
                          title="Send Email (Backend)"
                        >
                          {actionId === `email_${p.id}` ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Mail size={14} />
                          )}
                        </button>

                        <button
                          onClick={() => handleSendWhatsApp(p.id)}
                          disabled={actionId === `wa_${p.id}`}
                          className="p-2 border border-[#EDE8DF] rounded-lg text-[#6B6259] hover:text-[#25D366] disabled:opacity-50"
                          title="Send WhatsApp (Backend)"
                        >
                          {actionId === `wa_${p.id}` ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <MessageCircle size={14} />
                          )}
                        </button>

                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 border border-[#EDE8DF] rounded-lg text-[#6B6259] hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-[#EDE8DF] flex justify-between items-center bg-[#FCFBF9] rounded-t-[32px]">
              <div>
                <h2 className="font-black text-xl">
                  {editId ? "Edit Proposal" : "New Proposal"}
                </h2>
                <p className="text-[12px] text-[#9A8F82] mt-0.5">
                  Client → Project select karo
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-[#9A8F82] hover:text-black"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
                id="proposal-form"
              >
                {/* Client */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black text-[#6B6259] uppercase tracking-wider">
                    Client <span className="text-red-400">*</span>
                  </label>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        required
                        value={selectedClientId}
                        onChange={async (e) => {
                          const cid = e.target.value;
                          setSelectedClientId(cid);
                          setFormData((prev) => ({ ...prev, project: "" }));
                          await loadProjectsForClient(cid);
                        }}
                        className="w-full p-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C8922A] appearance-none"
                      >
                        <option value="">Select a client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8F82] pointer-events-none"
                        size={16}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddClient(true)}
                      className="px-4 py-3 border border-dashed border-[#C8922A] text-[#C8922A] rounded-xl text-[12px] font-bold hover:bg-[#FDF3E3]"
                    >
                      + Client
                    </button>
                  </div>
                </div>

                {/* Project */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black text-[#6B6259] uppercase tracking-wider">
                    Project <span className="text-red-400">*</span>
                  </label>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        required
                        disabled={!selectedClientId}
                        value={formData.project}
                        onChange={(e) =>
                          setFormData({ ...formData, project: e.target.value })
                        }
                        className="w-full p-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C8922A] appearance-none disabled:opacity-60"
                      >
                        <option value="">
                          {selectedClientId
                            ? "Select a project"
                            : "Select client first"}
                        </option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8F82] pointer-events-none"
                        size={16}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!selectedClientId}
                      onClick={() => setShowAddProject(true)}
                      className="px-4 py-3 border border-dashed border-[#C8922A] text-[#C8922A] rounded-xl text-[12px] font-bold hover:bg-[#FDF3E3] disabled:opacity-60"
                    >
                      + Project
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black text-[#6B6259] uppercase tracking-wider">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full p-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C8922A]"
                  />
                </div>

                {/* Template toggle */}
                <div className="border border-[#EDE8DF] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowTemplate((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF8F5] hover:bg-[#F5F2ED]"
                  >
                    <span className="text-[13px] font-semibold text-[#6B6259]">
                      Template
                    </span>
                    <span className="text-[11px] text-[#C8922A] font-bold">
                      {showTemplate ? "Remove" : "+ Add"}
                    </span>
                  </button>

                  {showTemplate && (
                    <div className="px-4 py-3 border-t border-[#EDE8DF]">
                      <div className="relative">
                        <select
                          value={formData.use_template ?? ""}
                          onChange={(e) => handleTemplateSelect(e.target.value)}
                          className="w-full p-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C8922A] appearance-none"
                        >
                          <option value="">No template</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8F82] pointer-events-none"
                          size={16}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-black text-[#6B6259] uppercase tracking-wider">
                    Content {showTemplate ? "(optional)" : "*"}
                  </label>
                  <textarea
                    required={!showTemplate}
                    rows={6}
                    value={formData.content ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    className="w-full p-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C8922A] resize-none font-mono"
                  />
                </div>

                {/* Optional: Valid Until */}
                <div className="border border-[#EDE8DF] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowValidUntil((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF8F5] hover:bg-[#F5F2ED]"
                  >
                    <span className="text-[13px] font-semibold text-[#6B6259]">
                      Valid Until
                    </span>
                    <span className="text-[11px] text-[#C8922A] font-bold">
                      {showValidUntil ? "Remove" : "+ Add"}
                    </span>
                  </button>
                  {showValidUntil && (
                    <div className="px-4 py-3 border-t border-[#EDE8DF]">
                      <input
                        type="date"
                        value={formData.valid_until ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            valid_until: e.target.value,
                          })
                        }
                        className="w-full p-3 bg-white border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C8922A]"
                      />
                    </div>
                  )}
                </div>

                {/* Optional: Notes */}
                <div className="border border-[#EDE8DF] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowNotes((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF8F5] hover:bg-[#F5F2ED]"
                  >
                    <span className="text-[13px] font-semibold text-[#6B6259]">
                      Internal Notes
                    </span>
                    <span className="text-[11px] text-[#C8922A] font-bold">
                      {showNotes ? "Remove" : "+ Add"}
                    </span>
                  </button>
                  {showNotes && (
                    <div className="px-4 py-3 border-t border-[#EDE8DF]">
                      <textarea
                        rows={3}
                        value={formData.notes ?? ""}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        className="w-full p-3 bg-white border border-[#EDE8DF] rounded-xl outline-none focus:border-[#C8922A] resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Services Showcase (for PDF page 2) */}
                <div className="border border-[#EDE8DF] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#FAF8F5]">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-[#C8922A]" />
                      <span className="text-[13px] font-semibold text-[#6B6259]">
                        Services Showcase
                      </span>
                      <span className="text-[10px] text-[#9A8F82]">(appears in PDF)</span>
                    </div>
                    {selectedServiceIds.length > 0 && (
                      <span className="text-[11px] bg-[#C8922A] text-white px-2 py-0.5 rounded-full font-bold">
                        {selectedServiceIds.length} selected
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-[#EDE8DF] space-y-1.5 max-h-52 overflow-y-auto">
                    {allServices.length === 0 ? (
                      <p className="text-[12px] text-[#9A8F82] py-2">No active services found. Add services from the Services page first.</p>
                    ) : allServices.map(svc => {
                      const checked = selectedServiceIds.includes(svc.id);
                      const firstImg = svc.media?.find(m => m.file_type === "image");
                      const imgUrl = firstImg ? getServiceImgUrl(firstImg.file_url) : null;
                      return (
                        <label key={svc.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${checked ? "bg-[#FDF3E3] border border-[#C8922A]/30" : "hover:bg-[#FAF8F5] border border-transparent"}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedServiceIds(prev =>
                                checked ? prev.filter(id => id !== svc.id) : [...prev, svc.id]
                              );
                            }}
                            className="accent-[#C8922A] w-4 h-4 flex-shrink-0"
                          />
                          {imgUrl ? (
                            <img src={imgUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border border-[#EDE8DF]" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-[#F5F2ED] flex items-center justify-center flex-shrink-0">
                              <Package size={12} className="text-[#9A8F82]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-[#1C1C1C] truncate">{svc.name}</p>
                            {svc.description && (
                              <p className="text-[10px] text-[#9A8F82] truncate">{svc.description}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-[#EDE8DF] flex gap-3 bg-white rounded-b-[32px]">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-3 border-2 border-[#EDE8DF] text-[#6B6259] font-bold rounded-2xl hover:bg-[#FAF8F5]"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="proposal-form"
                disabled={saving}
                className="flex-1 py-3 bg-[#C8922A] text-white font-black rounded-2xl hover:bg-[#B07A20] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Save size={20} />
                )}
                {editId ? "Update Proposal" : "Create Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}