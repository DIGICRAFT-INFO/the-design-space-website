"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Loader2,
  MapPin,
  Briefcase,
  Plus,
  X,
  Layout,
  AlertCircle,
  Home,
  Edit2,
  Trash2,
  FileText,
  ScrollText,
  Receipt,
  Send,
  CheckCircle,
  RotateCcw,
  FileStack,
  IndianRupee,
  Clock,
  Banknote,
  BadgeCheck,
  Printer,
  FileSpreadsheet,
  MessageCircle,
  Layers,
  History,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Copy,
  PlusCircle,
  MinusCircle,
} from "lucide-react";

import {
  getClientById,
  getProposalsByClient,
  getQuotationsByClient,
  getInvoicesByClient,
  createProject,
  updateProject,
  deleteProject,
  getProjectsByClient,
  createProposalTemplate,
  updateProposalTemplate,
  deleteProposalTemplate,
  approveQuotation,
  reviseQuotation,
  sendQuotation, // marks sent
  deleteQuotation as deleteQuotationFromClientService,
} from "@/services/clientService";

import {
  // quotations
  getQuotationById,
  createQuotation,
  updateQuotation,
  downloadQuotationPdf,
  sendQuotationEmail,
  getQuotationHistory,
  copyQuotation,
  type QuotationHistoryEntry,
} from "@/services/quotationService";

import {
  // proposals
  getProposalTemplates,
  getProposalById,
  createProposal,
  updateProposal,
  updateProposalStatus,
  deleteProposal,
  downloadProposalPdf,
  sendProposalEmail,
  sendProposalWhatsApp,
  type Proposal,
} from "@/services/proposalService";

import {
  // invoices
  getInvoiceById,
  generateInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  markInvoicePaid,
  downloadInvoicePDF,
  downloadInvoiceCSV,
  sendInvoiceEmail,
  sendInvoiceWhatsApp,
  copyInvoice,
  type Invoice,
} from "@/services/invoiceService";

import API_BASE_URL from "@/lib/config";

/* ───────────────────────────────────────────────────────────────────────────── */

const inputCls =
  "w-full px-3 py-2 bg-[#FAF8F5] border border-[#EDE8DF] rounded-lg text-[14px] outline-none focus:border-[#C8922A] transition-colors";

const projectBadge = (s: string) =>
  (
    ({
      completed: "bg-green-100 text-green-700",
      active: "bg-blue-100 text-blue-700",
      on_hold: "bg-amber-100 text-amber-700",
    }) as Record<string, string>
  )[s] || "bg-gray-100 text-gray-700";

const proposalBadge = (s: string) =>
  (
    ({
      draft: "bg-gray-100 text-gray-600",
      sent: "bg-blue-100 text-blue-700",
      accepted: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-600",
    }) as Record<string, string>
  )[s] || "bg-gray-100 text-gray-700";

const quoteBadge = (s: string) =>
  (
    ({
      draft: "bg-gray-100 text-gray-600",
      sent: "bg-blue-100 text-blue-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-600",
      revised: "bg-purple-100 text-purple-700",
      superseded: "bg-gray-200 text-gray-600",
    }) as Record<string, string>
  )[s] || "bg-gray-100 text-gray-700";

const invoiceBadge = (s: string) =>
  (
    ({
      draft: "bg-gray-100 text-gray-600",
      issued: "bg-blue-100 text-blue-700",
      paid: "bg-green-100 text-green-700",
      partial: "bg-amber-100 text-amber-700",
      overdue: "bg-red-100 text-red-600",
      cancelled: "bg-gray-200 text-gray-500",
    }) as Record<string, string>
  )[s] || "bg-gray-100 text-gray-700";

const invoiceTypeBadge = (t: string) =>
  (
    ({
      full: "bg-indigo-100 text-indigo-700",
      advance: "bg-cyan-100 text-cyan-700",
      milestone: "bg-purple-100 text-purple-700",
      final: "bg-teal-100 text-teal-700",
    }) as Record<string, string>
  )[t] || "bg-gray-100 text-gray-700";

const fmt = (n: any) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const EMPTY_ITEM = () => ({
  _key: Math.random(),
  description: "",
  category: "Furniture",
  quantity: "1",
  unit: "sqft",
  rate: "",
  sort_order: 1,
});

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

function downloadQuotationCSV(q: any) {
  const rows: any[] = [
    ["QUOTATION"],
    [""],
    ["Quote #", q.quote_number],
    ["Version", q.version],
    ["Client", q.client_name],
    ["Project", q.project_name],
    ["Status", q.status],
    ["Valid Until", q.valid_until || "—"],
    [""],
    ["#", "Description", "Category", "Qty", "Unit", "Rate", "Amount"],
    ...(q.items || []).map((it: any, i: number) => [
      i + 1,
      it.description,
      it.category,
      it.quantity,
      it.unit,
      it.rate,
      (
        (parseFloat(it.quantity || "0") || 0) *
        (parseFloat(it.rate || "0") || 0)
      ).toFixed(2),
    ]),
    [""],
    ["Subtotal", "", "", "", "", "", q.subtotal],
    ["Discount", "", "", "", "", "", q.discount_amount],
    ["Taxable Amount", "", "", "", "", "", q.taxable_amount],
    ...(parseFloat(q.cgst_amount || "0") > 0
      ? [["CGST", "", "", "", "", "", q.cgst_amount]]
      : []),
    ...(parseFloat(q.sgst_amount || "0") > 0
      ? [["SGST", "", "", "", "", "", q.sgst_amount]]
      : []),
    ...(parseFloat(q.igst_amount || "0") > 0
      ? [["IGST", "", "", "", "", "", q.igst_amount]]
      : []),
    ["Grand Total", "", "", "", "", "", q.grand_total],
  ];

  const csv = rows
    .map((r) =>
      r.map((c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveBlob(blob, `${q.quote_number || "quotation"}.csv`);
}

function downloadProposalCSV(p: any) {
  const rows = [
    ["PROPOSAL"],
    [],
    ["Proposal #", p.prop_number ?? ""],
    ["Title", p.title ?? ""],
    ["Client", p.client_name ?? ""],
    ["Project", p.project_name ?? ""],
    ["Status", p.status ?? ""],
    ["Valid Until", p.valid_until ?? ""],
    ["Notes", p.notes ?? ""],
    [],
    ["Content"],
    [p.content ?? ""],
  ];

  const csv = rows
    .map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveBlob(
    blob,
    `${(p.prop_number || p.id || "proposal").replace(/[^\w.-]+/g, "_")}.csv`,
  );
}

/* ───────────────────────────────────────────────────────────────────────────── */

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const clientId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "projects" | "proposals" | "quotations" | "invoices"
  >("projects");

  // scroll refs (detail panels)
  const proposalPanelRef = useRef<HTMLDivElement | null>(null);
  const quotePanelRef = useRef<HTMLDivElement | null>(null);
  const invoicePanelRef = useRef<HTMLDivElement | null>(null);

  // ── Projects ───────────────────────────────────────────────────────────────
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isProjectSubmitting, setIsProjectSubmitting] = useState(false);
  const [projectApiError, setProjectApiError] = useState<any>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectForm, setProjectForm] = useState({
    name: "",
    property_type: "apartment",
    style_category: "modern",
    area_sqft: "",
    budget_range: "",
    start_date: "",
    expected_end_date: "",
    status: "active",
    notes: "",
  });

  // ── Proposals ──────────────────────────────────────────────────────────────
  const [proposals, setProposals] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    content: "",
  });
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [templateError, setTemplateError] = useState<any>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [templateActionKey, setTemplateActionKey] = useState<string | null>(
    null,
  );

  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalMode, setProposalMode] = useState<"template" | "manual">(
    "template",
  );
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [proposalError, setProposalError] = useState<any>(null);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(
    null,
  );

  const [proposalForm, setProposalForm] = useState({
    project: "",
    title: "",
    use_template: "",
    content: "",
    valid_until: "",
    notes: "",
  });

  const [viewingProposal, setViewingProposal] = useState<Proposal | null>(null);
  const [proposalDetailLoading, setProposalDetailLoading] = useState(false);
  const [proposalActionKey, setProposalActionKey] = useState<string | null>(
    null,
  );

  // ── Quotations ─────────────────────────────────────────────────────────────
  const [quotations, setQuotations] = useState<any[]>([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteError, setQuoteError] = useState<any>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  const [quoteForm, setQuoteForm] = useState({
    project: "",
    valid_until: "",
    discount_type: "percentage",
    discount_value: "0",
    cgst_rate: "9",
    sgst_rate: "9",
    igst_rate: "0",
    notes: "",
  });

  const [quoteItems, setQuoteItems] = useState<any[]>([EMPTY_ITEM()]);
  const [taxMode, setTaxMode] = useState<"cgst_sgst" | "igst" | "non_gst">(
    "cgst_sgst",
  );
  const [masterServices, setMasterServices] = useState<any[]>([]);

  const [viewingQuote, setViewingQuote] = useState<any>(null);
  const [quoteDetailLoading, setQuoteDetailLoading] = useState(false);
  const [quoteActionKey, setQuoteActionKey] = useState<string | null>(null);

  // Edit-history / compare panel (right side of the quotation modal)
  const [quoteHistoryEntries, setQuoteHistoryEntries] = useState<
    QuotationHistoryEntry[]
  >([]);
  const [quoteHistoryLoading, setQuoteHistoryLoading] = useState(false);
  const [showQuoteHistory, setShowQuoteHistory] = useState(false);

  // ── Quotation Copy Modal ───────────────────────────────────────────────────
  const [isQuoteCopyModalOpen, setIsQuoteCopyModalOpen] = useState(false);
  const [copySourceQuote, setCopySourceQuote] = useState<any>(null);
  const [quoteCopySubmitting, setQuoteCopySubmitting] = useState(false);
  const [quoteCopyForm, setQuoteCopyForm] = useState<{
    valid_until: string;
    notes: string;
    items: Array<{
      _key: string;
      description: string;
      category: string;
      quantity: string;
      unit: string;
      rate: string;
    }>;
  }>({ valid_until: "", notes: "", items: [] });

  // ── Invoices ───────────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesRefreshKey, setInvoicesRefreshKey] = useState(0);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceError, setInvoiceError] = useState<any>(null);

  const [invoiceForm, setInvoiceForm] = useState({
    quotation_id: "",
    invoice_type: "full",
    milestone_label: "",
    milestone_percentage: 100,
    invoice_date: new Date().toISOString().split("T")[0],
    due_days: 15,
    notes: "",
  });

  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false);
  const [invoiceActionKey, setInvoiceActionKey] = useState<string | null>(null);

  // optional invoice edit (minimal)
  const [isInvoiceEditOpen, setIsInvoiceEditOpen] = useState(false);
  const [invoiceEditSubmitting, setInvoiceEditSubmitting] = useState(false);
  const [invoiceEditForm, setInvoiceEditForm] = useState<{
    invoice_type: string;
    invoice_date: string;
    due_date: string;
    notes: string;
    items: Array<{
      _key: string;
      description: string;
      category: string;
      quantity: string;
      unit: string;
      rate: string;
    }>;
  }>({
    invoice_type: "full",
    invoice_date: "",
    due_date: "",
    notes: "",
    items: [],
  });

  // ── Invoice Copy Modal (full edit before cloning) ──────────────────────────
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceInvoice, setCopySourceInvoice] = useState<any>(null);
  const [copySubmitting, setCopySubmitting] = useState(false);
  const [copyForm, setCopyForm] = useState<{
    invoice_type: string;
    invoice_date: string;
    due_date: string;
    notes: string;
    items: Array<{
      _key: string;
      description: string;
      category: string;
      quantity: string;
      unit: string;
      rate: string;
    }>;
  }>({
    invoice_type: "full",
    invoice_date: "",
    due_date: "",
    notes: "",
    items: [],
  });

  /* ────────────────────────────────────────────────────────────────────────── */
  /* Fetch helpers                                                             */
  /* ────────────────────────────────────────────────────────────────────────── */

  const fetchClientData = useCallback(async () => {
    try {
      const data = await getClientById(clientId as string);
      setClient(data);
    } catch (e) {
      console.error("Client fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const data = await getProjectsByClient(clientId as string);
      setProjects(data);
    } catch (e) {
      console.error("Projects fetch failed:", e);
    } finally {
      setProjectsLoading(false);
    }
  }, [clientId]);

  const fetchProposals = useCallback(async () => {
    setProposalsLoading(true);
    try {
      const data = await getProposalsByClient(clientId as string);
      setProposals(data);
    } catch (e) {
      console.error("Proposals fetch failed:", e);
    } finally {
      setProposalsLoading(false);
    }
  }, [clientId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await getProposalTemplates();
      setTemplates(data);
    } catch (e) {
      console.error("Templates fetch failed:", e);
    }
  }, []);

  const fetchQuotations = useCallback(async () => {
    setQuotationsLoading(true);
    try {
      const data = await getQuotationsByClient(clientId as string);
      setQuotations(data);
    } catch (e) {
      console.error("Quotations fetch failed:", e);
    } finally {
      setQuotationsLoading(false);
    }
  }, [clientId]);

  const fetchQuoteDetail = useCallback(async (qid: string) => {
    setQuoteDetailLoading(true);
    try {
      const data = await getQuotationById(qid);
      setViewingQuote(data);
    } catch (e) {
      console.error("Quote detail fetch failed:", e);
    } finally {
      setQuoteDetailLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    setInvoices([]); // force clear so React always re-renders rows with fresh data
    try {
      const data = await getInvoicesByClient(clientId as string);
      // Deep-clone each object so React sees new references and re-renders every row
      setInvoices(data.map((inv: any) => ({ ...inv })));
      setInvoicesRefreshKey((k) => k + 1); // bump key so every row remounts
    } catch (e) {
      console.error("Invoices fetch failed:", e);
    } finally {
      setInvoicesLoading(false);
    }
  }, [clientId]);

  const fetchInvoiceDetail = useCallback(async (iid: string) => {
    setInvoiceDetailLoading(true);
    try {
      const data = await getInvoiceById(iid);
      setViewingInvoice(data);
    } catch (e) {
      console.error("Invoice detail fetch failed:", e);
    } finally {
      setInvoiceDetailLoading(false);
    }
  }, []);

  const fetchProposalDetail = useCallback(async (pid: string) => {
    setProposalDetailLoading(true);
    try {
      const data = await getProposalById(pid);
      setViewingProposal(data);
    } catch (e) {
      console.error("Proposal detail fetch failed:", e);
    } finally {
      setProposalDetailLoading(false);
    }
  }, []);

  /* ────────────────────────────────────────────────────────────────────────── */
  /* Effects                                                                    */
  /* ────────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  useEffect(() => {
    if (!client) return;
    // always keep projects loaded because modals use it
    fetchProjects();

    if (activeTab === "projects") fetchProjects();
    if (activeTab === "proposals") {
      fetchProposals();
      fetchTemplates();
    }
    if (activeTab === "quotations") fetchQuotations();
    if (activeTab === "invoices") {
      fetchInvoices();
      fetchQuotations();
    }
  }, [
    activeTab,
    client,
    fetchProjects,
    fetchProposals,
    fetchTemplates,
    fetchQuotations,
    fetchInvoices,
  ]);

  // auto-scroll detail panels
  useEffect(() => {
    if (viewingQuote && !quoteDetailLoading) {
      quotePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [viewingQuote, quoteDetailLoading]);

  useEffect(() => {
    if (viewingInvoice && !invoiceDetailLoading) {
      invoicePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [viewingInvoice, invoiceDetailLoading]);

  useEffect(() => {
    if (viewingProposal && !proposalDetailLoading) {
      proposalPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [viewingProposal, proposalDetailLoading]);

  /* ────────────────────────────────────────────────────────────────────────── */
  /* Project handlers                                                           */
  /* ────────────────────────────────────────────────────────────────────────── */

  const handleProjectInputChange = (e: any) => {
    const { name, value } = e.target;
    setProjectForm((p) => ({ ...p, [name]: value }));
    setProjectApiError(null);
  };

const handleProjectEditClick = (proj: any) => {
  setEditingProjectId(proj.id);
  setProjectForm({
    name: proj.name,
    property_type: proj.property_type,
    style_category: proj.style_category || "modern",
    area_sqft: proj.area_sqft ?? "",
    budget_range: proj.budget_range ?? "",
    // Backend often returns full ISO datetime (e.g. "2024-01-15T00:00:00Z"),
    // but <input type="date"> only accepts "YYYY-MM-DD" — anything else
    // silently renders as blank. Normalize before populating the form.
    start_date: proj.start_date ? String(proj.start_date).split("T")[0] : "",
    expected_end_date: proj.expected_end_date
      ? String(proj.expected_end_date).split("T")[0]
      : "",
    status: proj.status,
    notes: proj.notes || "",
  });
  setIsProjectModalOpen(true);
};

  const handleDeleteProject = async (pid: string) => {
    if (!confirm("Delete this project?")) return;
    try {
      await deleteProject(clientId as string, pid);
      await fetchClientData();
      await fetchProjects();
    } catch {
      alert("Failed to delete project.");
    }
  };

  const handleProjectSubmit = async (e: any) => {
    e.preventDefault();
    setIsProjectSubmitting(true);
    setProjectApiError(null);

    const payload = {
      ...projectForm,
      client: clientId,
      area_sqft: projectForm.area_sqft
        ? parseFloat(projectForm.area_sqft)
        : null,
    };

    try {
      if (editingProjectId) {
        await updateProject(clientId as string, editingProjectId, payload);
      } else {
        await createProject(clientId as string, payload);
      }
      await fetchClientData();
      await fetchProjects();
      closeProjectModal();
    } catch (err) {
      setProjectApiError(err);
    } finally {
      setIsProjectSubmitting(false);
    }
  };

  const closeProjectModal = () => {
    setIsProjectModalOpen(false);
    setEditingProjectId(null);
    setProjectForm({
      name: "",
      property_type: "apartment",
      style_category: "modern",
      area_sqft: "",
      budget_range: "",
      start_date: "",
      expected_end_date: "",
      status: "active",
      notes: "",
    });
  };

  /* ────────────────────────────────────────────────────────────────────────── */
  /* Template handlers                                                          */
  /* ────────────────────────────────────────────────────────────────────────── */

  const handleTemplateSubmit = async (e: any) => {
    e.preventDefault();
    setTemplateSubmitting(true);
    setTemplateError(null);
    try {
      if (editingTemplateId) {
        await updateProposalTemplate(editingTemplateId, templateForm);
      } else {
        await createProposalTemplate(templateForm);
      }
      await fetchTemplates();
      closeTemplateModal();
    } catch (err) {
      setTemplateError(err);
    } finally {
      setTemplateSubmitting(false);
    }
  };

  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setEditingTemplateId(null);
    setTemplateError(null);
    setTemplateForm({ name: "", description: "", content: "" });
  };

  const openEditTemplateModal = (t: any) => {
    setEditingTemplateId(t.id);
    setTemplateForm({
      name: t.name || "",
      description: t.description || "",
      content: t.content || "",
    });
    setTemplateError(null);
    setIsTemplateModalOpen(true);
  };

  const handleTemplateDelete = async (tid: string) => {
    if (!confirm("Delete this template permanently?")) return;
    setTemplateActionKey(tid);
    try {
      await deleteProposalTemplate(tid);
      await fetchTemplates();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    } finally {
      setTemplateActionKey(null);
    }
  };

  /* ────────────────────────────────────────────────────────────────────────── */
  /* Proposal handlers                                                          */
  /* ────────────────────────────────────────────────────────────────────────── */

  const openProposalModal = () => {
    setEditingProposalId(null);
    setProposalMode("template");
    setProposalForm({
      project: projects?.[0]?.id || "",
      title: "",
      use_template: "",
      content: "",
      valid_until: "",
      notes: "",
    });
    setProposalError(null);
    setIsProposalModalOpen(true);
  };

  const openEditProposalModal = async (pid: string) => {
    const p = await getProposalById(pid);
    setEditingProposalId(pid);

    setProposalMode(p.template ? "template" : "manual");
    setProposalForm({
      // `project` (and `template`) come back populated as nested objects
      // from the API, not plain ids — unwrap to the id so it matches the
      // <select> option values.
      project:
        (typeof p.project === "object" && p.project
          ? (p.project as any).id || (p.project as any)._id
          : p.project) ||
        projects?.[0]?.id ||
        "",
      title: p.title || "",
      use_template:
        (typeof p.template === "object" && p.template
          ? (p.template as any).id || (p.template as any)._id
          : p.template) || "",
      content: p.content || "",
      // valid_until is a Date field and comes back as a full ISO datetime
      // (e.g. "2024-01-15T00:00:00.000Z") — <input type="date"> only
      // accepts "YYYY-MM-DD" and silently renders blank otherwise.
      valid_until: p.valid_until ? String(p.valid_until).split("T")[0] : "",
      notes: p.notes || "",
    });

    setProposalError(null);
    setIsProposalModalOpen(true);
  };

  const handleProposalSubmit = async (e: any) => {
    e.preventDefault();
    setProposalSubmitting(true);
    setProposalError(null);

    const payload =
      proposalMode === "template"
        ? {
            project: proposalForm.project,
            title: proposalForm.title,
            use_template: proposalForm.use_template || undefined,
            valid_until: proposalForm.valid_until || undefined,
            notes: proposalForm.notes || undefined,
          }
        : {
            project: proposalForm.project,
            title: proposalForm.title,
            content: proposalForm.content,
            valid_until: proposalForm.valid_until || undefined,
            notes: proposalForm.notes || undefined,
          };

    try {
      if (editingProposalId) await updateProposal(editingProposalId, payload);
      else await createProposal(payload);

      await fetchProposals();
      setIsProposalModalOpen(false);
      setEditingProposalId(null);
    } catch (err) {
      setProposalError(err);
    } finally {
      setProposalSubmitting(false);
    }
  };

  const handleProposalDelete = async (pid: string) => {
    if (!confirm("Delete this proposal permanently?")) return;
    try {
      await deleteProposal(pid);
      await fetchProposals();
      if (viewingProposal?.id === pid) setViewingProposal(null);
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  };

  const handleProposalStatus = async (
    pid: string,
    st: "sent" | "accepted" | "rejected",
  ) => {
    setProposalActionKey(`${st}_${pid}`);
    try {
      await updateProposalStatus(pid, st);
      await fetchProposals();
      if (viewingProposal?.id === pid) await fetchProposalDetail(pid);
    } catch (e: any) {
      alert(e?.message || "Status update failed");
    } finally {
      setProposalActionKey(null);
    }
  };

  /* ────────────────────────────────────────────────────────────────────────── */
  /* Quotation handlers                                                         */
  /* ────────────────────────────────────────────────────────────────────────── */

  const fetchMasterServices = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/services/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setMasterServices(Array.isArray(data) ? data : (data.results ?? []));
      }
    } catch (e) {
      console.error("Master services fetch failed:", e);
    }
  }, []);

  const fetchQuoteHistory = async (qid: string) => {
    setQuoteHistoryLoading(true);
    try {
      const data = await getQuotationHistory(qid);
      setQuoteHistoryEntries(data);
    } catch {
      setQuoteHistoryEntries([]);
    } finally {
      setQuoteHistoryLoading(false);
    }
  };

  const openQuoteModal = () => {
    setEditingQuoteId(null);
    setQuoteForm({
      project: projects?.[0]?.id || "",
      valid_until: "",
      discount_type: "percentage",
      discount_value: "0",
      cgst_rate: "9",
      sgst_rate: "9",
      igst_rate: "0",
      notes: "",
    });
    setQuoteItems([EMPTY_ITEM()]);
    setTaxMode("cgst_sgst");
    setQuoteError(null);
    setQuoteHistoryEntries([]);
    setShowQuoteHistory(false);
    setIsQuoteModalOpen(true);
    fetchMasterServices();
  };

  const openEditQuoteModal = async (qid: string) => {
    const q = await getQuotationById(qid);
    setEditingQuoteId(qid);

    setQuoteForm({
      // `project` comes back populated (nested object) from the detail
      // endpoint, not a plain id — unwrap it so it matches <option value>.
      project:
        typeof q.project === "object" && q.project
          ? (q.project as any).id || (q.project as any)._id
          : q.project,
      // valid_until is a Date field → arrives as full ISO datetime
      // ("2024-01-15T00:00:00.000Z"); <input type="date"> needs
      // "YYYY-MM-DD" and silently blanks on anything else.
      valid_until: q.valid_until ? String(q.valid_until).split("T")[0] : "",
      discount_type: q.discount_type || "percentage",
      discount_value: String(q.discount_value || "0"),
      cgst_rate: String(q.cgst_rate || "9"),
      sgst_rate: String(q.sgst_rate || "9"),
      igst_rate: String(q.igst_rate || "0"),
      notes: q.notes || "",
    });

    setTaxMode(
      parseFloat(q.igst_rate || "0") > 0
        ? "igst"
        : parseFloat(q.cgst_rate || "0") === 0 &&
            parseFloat(q.sgst_rate || "0") === 0 &&
            parseFloat(q.igst_rate || "0") === 0
          ? "non_gst"
          : "cgst_sgst",
    );

    setQuoteItems(
      (q.items || []).map((it: any) => ({
        _key: Math.random(),
        description: it.description,
        category: it.category || "Furniture",
        quantity: String(it.quantity),
        unit: it.unit || "sqft",
        rate: String(it.rate),
        sort_order: it.sort_order || 1,
      })),
    );

    setQuoteError(null);
    setIsQuoteModalOpen(true);
    fetchMasterServices();
    setShowQuoteHistory(true);
    fetchQuoteHistory(qid);
  };

  const closeQuoteModal = () => {
    setIsQuoteModalOpen(false);
    setQuoteError(null);
  };

  const addItem = () =>
    setQuoteItems((p) => [...p, { ...EMPTY_ITEM(), sort_order: p.length + 1 }]);
  const removeItem = (key: any) =>
    setQuoteItems((p) => p.filter((i) => i._key !== key));
  const updateItem = (key: any, field: string, val: any) =>
    setQuoteItems((p) =>
      p.map((i) => (i._key === key ? { ...i, [field]: val } : i)),
    );

  const moveItem = (key: any, dir: number) => {
    setQuoteItems((p) => {
      const idx = p.findIndex((i) => i._key === key);
      const next = idx + dir;
      if (next < 0 || next >= p.length) return p;
      const arr = [...p];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((i, n) => ({ ...i, sort_order: n + 1 }));
    });
  };

  const totals = useMemo(() => {
    const subtotal = quoteItems.reduce(
      (s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0),
      0,
    );
    const dv = parseFloat(quoteForm.discount_value) || 0;
    const discAmt =
      quoteForm.discount_type === "percentage" ? (subtotal * dv) / 100 : dv;
    const taxable = Math.max(0, subtotal - discAmt);
    let cgst = 0,
      sgst = 0,
      igst = 0;

    if (taxMode === "cgst_sgst") {
      cgst = (taxable * (parseFloat(quoteForm.cgst_rate) || 0)) / 100;
      sgst = (taxable * (parseFloat(quoteForm.sgst_rate) || 0)) / 100;
    } else if (taxMode === "igst") {
      igst = (taxable * (parseFloat(quoteForm.igst_rate) || 0)) / 100;
    }
    // non_gst: all taxes stay 0

    return {
      subtotal,
      discAmt,
      taxable,
      cgst,
      sgst,
      igst,
      total: taxable + cgst + sgst + igst,
    };
  }, [quoteItems, quoteForm, taxMode]);

  // Totals preview for the "Copy Quotation" modal — mirrors the source
  // quotation's discount type/value and CGST/SGST/IGST rates so the preview
  // shown to the user matches what will actually be saved (not just a raw
  // sum of qty × rate labelled "Grand Total").
  const quoteCopyTotals = useMemo(() => {
    const subtotal = quoteCopyForm.items.reduce(
      (s, it) =>
        s + (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0),
      0,
    );

    const discountType = copySourceQuote?.discount_type || "percentage";
    const discountValue = parseFloat(copySourceQuote?.discount_value) || 0;
    const discAmt =
      discountType === "percentage"
        ? (subtotal * discountValue) / 100
        : discountValue;
    const taxable = Math.max(0, subtotal - discAmt);

    const cgstRate = parseFloat(copySourceQuote?.cgst_rate) || 0;
    const sgstRate = parseFloat(copySourceQuote?.sgst_rate) || 0;
    const igstRate = parseFloat(copySourceQuote?.igst_rate) || 0;

    const cgst = (taxable * cgstRate) / 100;
    const sgst = (taxable * sgstRate) / 100;
    const igst = (taxable * igstRate) / 100;

    return {
      subtotal,
      discountType,
      discountValue,
      discAmt,
      taxable,
      cgstRate,
      sgstRate,
      igstRate,
      cgst,
      sgst,
      igst,
      total: taxable + cgst + sgst + igst,
    };
  }, [quoteCopyForm.items, copySourceQuote]);

  // Totals preview for the "Copy Invoice" modal — mirrors the source
  // invoice's CGST/SGST/IGST rates so the preview shown to the user matches
  // what will actually be saved. Invoices carry no discount of their own —
  // the backend's copy-invoice logic always computes tax straight off the
  // subtotal (taxable_amount === subtotal, discount is always ₹0) — so we
  // surface that explicitly rather than omitting the rows.
  //
  // NOTE: the invoice-detail API (getInvoiceById, used to load the source
  // invoice here) does not return cgst_rate/sgst_rate/igst_rate — those are
  // only attached by the update endpoint. So we derive the effective rate
  // from the source invoice's stored amounts (amount ÷ subtotal × 100)
  // whenever an explicit rate isn't present, instead of silently falling
  // back to 0 and hiding the tax rows.
  const copyInvoiceTotals = useMemo(() => {
    const subtotal = copyForm.items.reduce(
      (s, it) =>
        s + (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0),
      0,
    );

    const discAmt = 0;
    const taxable = subtotal;

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const srcSubtotal = parseFloat(copySourceInvoice?.subtotal) || 0;
    const deriveRate = (explicitRate: any, amount: any) => {
      if (
        explicitRate !== undefined &&
        explicitRate !== null &&
        explicitRate !== ""
      ) {
        const r = parseFloat(explicitRate);
        if (!isNaN(r)) return r;
      }
      const amt = parseFloat(amount) || 0;
      return srcSubtotal > 0 ? round2((amt / srcSubtotal) * 100) : 0;
    };

    const cgstRate = deriveRate(
      copySourceInvoice?.cgst_rate,
      copySourceInvoice?.cgst_amount,
    );
    const sgstRate = deriveRate(
      copySourceInvoice?.sgst_rate,
      copySourceInvoice?.sgst_amount,
    );
    const igstRate = deriveRate(
      copySourceInvoice?.igst_rate,
      copySourceInvoice?.igst_amount,
    );

    const cgst = (taxable * cgstRate) / 100;
    const sgst = (taxable * sgstRate) / 100;
    const igst = (taxable * igstRate) / 100;

    return {
      subtotal,
      discAmt,
      taxable,
      cgstRate,
      sgstRate,
      igstRate,
      cgst,
      sgst,
      igst,
      total: taxable + cgst + sgst + igst,
    };
  }, [copyForm.items, copySourceInvoice]);

  const handleQuoteSubmit = async (e: any) => {
    e.preventDefault();
    if (!quoteForm.project) {
      setQuoteError({
        error: "Please select a project before saving the quotation.",
      });
      return;
    }
    const validItems = quoteItems.filter(
      (i) => i.description?.trim() && parseFloat(i.rate) > 0,
    );
    if (validItems.length === 0) {
      setQuoteError({
        error: "Please add at least one item with a description and rate.",
      });
      return;
    }
    setQuoteSubmitting(true);
    setQuoteError(null);

    // Inside handleQuoteSubmit
    // Ensure this conversion is robust
    const payload = {
      project: quoteForm.project,
      valid_until: quoteForm.valid_until || undefined,
      discount_type: quoteForm.discount_type,
      discount_value: parseFloat(quoteForm.discount_value) || 0,
      cgst_rate:
        taxMode === "cgst_sgst" ? parseFloat(quoteForm.cgst_rate) || 0 : 0,
      sgst_rate:
        taxMode === "cgst_sgst" ? parseFloat(quoteForm.sgst_rate) || 0 : 0,
      igst_rate: taxMode === "igst" ? parseFloat(quoteForm.igst_rate) || 0 : 0,
      notes: quoteForm.notes,
      items: quoteItems
        .filter((i) => i.description?.trim() && parseFloat(i.rate) > 0)
        .map((i, n) => ({
          description: i.description.trim(),
          category: i.category || "",
          quantity: parseFloat(i.quantity) || 1,
          unit: i.unit || "",
          rate: parseFloat(i.rate),
          sort_order: n + 1,
        })),
    };

    try {
      if (editingQuoteId) await updateQuotation(editingQuoteId, payload);
      else await createQuotation(payload);

      await fetchQuotations();
      closeQuoteModal();
      setEditingQuoteId(null);
    } catch (err) {
      setQuoteError(err);
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const handleApproveQuote = async (qid: string) => {
    if (!confirm("Approve this quotation?")) return;
    setQuoteActionKey(`approve_${qid}`);
    try {
      await approveQuotation(qid);
      await fetchQuotations();
      if (viewingQuote?.id === qid) await fetchQuoteDetail(qid);
    } catch {
      alert("Approve failed.");
    } finally {
      setQuoteActionKey(null);
    }
  };

  const handleSendQuote = async (qid: string) => {
    if (!confirm("Mark as Sent?")) return;
    setQuoteActionKey(`send_${qid}`);
    try {
      await sendQuotation(qid);
      await fetchQuotations();
      if (viewingQuote?.id === qid) await fetchQuoteDetail(qid);
    } catch {
      alert("Send failed.");
    } finally {
      setQuoteActionKey(null);
    }
  };

  const handleReviseQuote = async (qid: string) => {
    if (!confirm("Create a new revision?")) return;
    setQuoteActionKey(`revise_${qid}`);
    try {
      await reviseQuotation(qid);
      await fetchQuotations();
      setViewingQuote(null);
    } catch {
      alert("Revise failed.");
    } finally {
      setQuoteActionKey(null);
    }
  };

  const handleDeleteQuote = async (qid: string) => {
    if (!confirm("Delete this quotation permanently?")) return;
    setQuoteActionKey(`del_${qid}`);
    try {
      await deleteQuotationFromClientService(qid);
      await fetchQuotations();
      if (viewingQuote?.id === qid) setViewingQuote(null);
    } catch {
      alert("Delete failed.");
    } finally {
      setQuoteActionKey(null);
    }
  };

  // ── Quotation Copy Handlers ────────────────────────────────────────────────
  const openQuoteCopyModal = async (q: any) => {
    const full = await getQuotationById(q.id);
    setCopySourceQuote(full);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    setQuoteCopyForm({
      valid_until: (full as any).valid_until
        ? (full as any).valid_until.split("T")[0]
        : validUntil.toISOString().split("T")[0],
      notes: (full as any).notes || "",
      items: ((full as any).items || []).map((it: any, i: number) => ({
        _key: `item_${i}_${Date.now()}`,
        description: it.description || "",
        category: it.category || "",
        quantity: String(it.quantity || "1"),
        unit: it.unit || "",
        rate: String(it.rate || "0"),
      })),
    });
    setIsQuoteCopyModalOpen(true);
  };

  const updateQuoteCopyItem = (key: string, field: string, value: string) => {
    setQuoteCopyForm((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it._key === key ? { ...it, [field]: value } : it,
      ),
    }));
  };

  const addQuoteCopyItem = () => {
    setQuoteCopyForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          _key: `new_${Date.now()}`,
          description: "",
          category: "",
          quantity: "1",
          unit: "",
          rate: "0",
        },
      ],
    }));
  };

  const removeQuoteCopyItem = (key: string) => {
    setQuoteCopyForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it._key !== key),
    }));
  };

  const submitQuoteCopy = async () => {
    if (!copySourceQuote?.id) return;
    setQuoteCopySubmitting(true);
    try {
      await copyQuotation(copySourceQuote.id, {
        valid_until: quoteCopyForm.valid_until || undefined,
        notes: quoteCopyForm.notes,
        items: quoteCopyForm.items.map((it) => ({
          description: it.description,
          category: it.category,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
        })),
      });
      setIsQuoteCopyModalOpen(false);
      setCopySourceQuote(null);
      await fetchQuotations();
    } catch (e: any) {
      alert(e?.message || "Copy failed");
    } finally {
      setQuoteCopySubmitting(false);
    }
  };

  // Quotation email/whatsapp (not present in quotationService currently)
  const sendQuotationEmail = async (qid: string) => {
    setQuoteActionKey(`email_${qid}`);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/notifications/email/quotation/${qid}/send/`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) throw new Error("Email failed");
      alert("✅ Quotation emailed!");
    } catch (e: any) {
      alert(e?.message || "Email failed");
    } finally {
      setQuoteActionKey(null);
    }
  };

  const sendQuotationWhatsApp = async (qid: string) => {
    setQuoteActionKey(`wa_${qid}`);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/notifications/whatsapp/quotation/${qid}/send/`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) throw new Error("WhatsApp failed");
      alert("✅ Quotation WhatsApp sent!");
    } catch (e: any) {
      alert(e?.message || "WhatsApp failed");
    } finally {
      setQuoteActionKey(null);
    }
  };

  /* ────────────────────────────────────────────────────────────────────────── */
  /* Invoice handlers                                                           */
  /* ────────────────────────────────────────────────────────────────────────── */

  const openInvoiceModal = () => {
    const approvedQuote = quotations.find((q: any) => q.status === "approved");
    setInvoiceForm({
      quotation_id: approvedQuote?.id || "",
      invoice_type: "full",
      milestone_label: "",
      milestone_percentage: 100,
      invoice_date: new Date().toISOString().split("T")[0],
      due_days: 15,
      notes: "",
    });
    setInvoiceError(null);
    setIsInvoiceModalOpen(true);
  };

  const closeInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setInvoiceError(null);
  };

  const handleInvoiceTypeChange = (type: string) => {
    const defaults: Record<string, any> = {
      full: { milestone_label: "", milestone_percentage: 100, due_days: 15 },
      advance: {
        milestone_label: "Advance on Booking",
        milestone_percentage: 10,
        due_days: 7,
      },
      milestone: {
        milestone_label: "",
        milestone_percentage: 20,
        due_days: 15,
      },
      final: {
        milestone_label: "Final Handover",
        milestone_percentage: 20,
        due_days: 7,
      },
    };
    setInvoiceForm((p: any) => ({
      ...p,
      invoice_type: type,
      ...defaults[type],
    }));
  };

  const handleInvoiceSubmit = async (e: any) => {
    e.preventDefault();
    setInvoiceSubmitting(true);
    setInvoiceError(null);

    const payload = {
      quotation_id: invoiceForm.quotation_id,
      invoice_type: invoiceForm.invoice_type as any,
      milestone_label: invoiceForm.milestone_label || undefined,
      milestone_percentage: invoiceForm.milestone_percentage,
      invoice_date: invoiceForm.invoice_date,
      due_days: invoiceForm.due_days,
      notes: invoiceForm.notes || undefined,
    };

    try {
      await generateInvoice(payload as any);
      await fetchInvoices();
      closeInvoiceModal();
    } catch (err) {
      setInvoiceError(err);
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handleSendInvoice = async (iid: string) => {
    if (!confirm("Mark invoice as Issued?")) return;
    setInvoiceActionKey(`issue_${iid}`);
    try {
      await sendInvoice(iid);
      await fetchInvoices();
      if (viewingInvoice?.id === iid) await fetchInvoiceDetail(iid);
    } catch {
      alert("Failed.");
    } finally {
      setInvoiceActionKey(null);
    }
  };

  const handleMarkPaid = async (iid: string) => {
    if (!confirm("Mark invoice as Paid?")) return;
    setInvoiceActionKey(`paid_${iid}`);
    try {
      await markInvoicePaid(iid);
      await fetchInvoices();
      if (viewingInvoice?.id === iid) await fetchInvoiceDetail(iid);
    } catch {
      alert("Failed.");
    } finally {
      setInvoiceActionKey(null);
    }
  };

  const handleDeleteInvoice = async (iid: string) => {
    if (!confirm("Delete this invoice permanently?")) return;
    setInvoiceActionKey(`del_${iid}`);
    try {
      await deleteInvoice(iid);
      await fetchInvoices();
      if (viewingInvoice?.id === iid) setViewingInvoice(null);
    } catch {
      alert("Delete failed.");
    } finally {
      setInvoiceActionKey(null);
    }
  };

  const openInvoiceEdit = async (iid: string) => {
    const inv = (await getInvoiceById(iid)) as any;
    setInvoiceEditForm({
      invoice_type: inv.invoice_type || "full",
      invoice_date: inv.invoice_date ? inv.invoice_date.split("T")[0] : "",
      due_date: inv.due_date ? inv.due_date.split("T")[0] : "",
      notes: inv.notes || "",
      items: (inv.items || []).map((it: any, i: number) => ({
        _key: `edit_${i}_${Date.now()}`,
        description: it.description || "",
        category: it.category || "",
        quantity: String(it.quantity || "1"),
        unit: it.unit || "",
        rate: String(it.rate || "0"),
      })),
    });
    setIsInvoiceEditOpen(true);
  };

  const updateEditItem = (key: string, field: string, value: string) => {
    setInvoiceEditForm((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it._key === key ? { ...it, [field]: value } : it,
      ),
    }));
  };

  const addEditItem = () => {
    setInvoiceEditForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          _key: `new_${Date.now()}`,
          description: "",
          category: "",
          quantity: "1",
          unit: "",
          rate: "0",
        },
      ],
    }));
  };

  const removeEditItem = (key: string) => {
    setInvoiceEditForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it._key !== key),
    }));
  };

  const submitInvoiceEdit = async (e: any) => {
    e.preventDefault();
    if (!viewingInvoice?.id) return;
    setInvoiceEditSubmitting(true);
    try {
      await updateInvoice(viewingInvoice.id, {
        invoice_type: invoiceEditForm.invoice_type,
        invoice_date: invoiceEditForm.invoice_date,
        due_date: invoiceEditForm.due_date,
        notes: invoiceEditForm.notes,
        items: invoiceEditForm.items.map((it) => ({
          description: it.description,
          category: it.category,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
        })),
      } as any);
      await fetchInvoices();
      await fetchInvoiceDetail(viewingInvoice.id);
      setIsInvoiceEditOpen(false);
    } catch (e: any) {
      alert(e?.message || "Update failed");
    } finally {
      setInvoiceEditSubmitting(false);
    }
  };

  // ── Copy Modal Handlers ────────────────────────────────────────────────────
  const openCopyModal = async (inv: any) => {
    // Defense in depth — the Copy button is already hidden for paid/partial
    // invoices, but guard here too in case this is ever called elsewhere.
    if (["paid", "partial"].includes(inv.status)) {
      alert(
        "This invoice already has payments recorded, so it can't be copied. Please create a new invoice instead.",
      );
      return;
    }
    // Fetch full detail (with items)
    const full = await getInvoiceById(inv.id);
    setCopySourceInvoice(full);
    const today = new Date().toISOString().split("T")[0];
    const due = new Date();
    due.setDate(due.getDate() + 15);
    setCopyForm({
      invoice_type: (full as any).invoice_type || "full",
      invoice_date: today,
      due_date: due.toISOString().split("T")[0],
      notes: (full as any).notes || "",
      items: ((full as any).items || []).map((it: any, i: number) => ({
        _key: `item_${i}_${Date.now()}`,
        description: it.description || "",
        category: it.category || "",
        quantity: String(it.quantity || "1"),
        unit: it.unit || "",
        rate: String(it.rate || "0"),
      })),
    });
    setIsCopyModalOpen(true);
  };

  const updateCopyItem = (key: string, field: string, value: string) => {
    setCopyForm((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it._key === key ? { ...it, [field]: value } : it,
      ),
    }));
  };

  const addCopyItem = () => {
    setCopyForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          _key: `new_${Date.now()}`,
          description: "",
          category: "",
          quantity: "1",
          unit: "",
          rate: "0",
        },
      ],
    }));
  };

  const removeCopyItem = (key: string) => {
    setCopyForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it._key !== key),
    }));
  };

  const submitCopyInvoice = async () => {
    if (!copySourceInvoice?.id) return;
    setCopySubmitting(true);
    try {
      const newInv = await copyInvoice(copySourceInvoice.id, {
        invoice_date: copyForm.invoice_date,
        due_date: copyForm.due_date,
        notes: copyForm.notes,
        items: copyForm.items.map((it) => ({
          description: it.description,
          category: it.category,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
        })),
      });
      setIsCopyModalOpen(false);
      setCopySourceInvoice(null);
      await fetchInvoices();
      // Auto-open the newly created copy in the detail panel
      if (newInv?.id) await fetchInvoiceDetail(newInv.id);
    } catch (e: any) {
      alert(e?.message || "Copy failed");
    } finally {
      setCopySubmitting(false);
    }
  };

  /* ────────────────────────────────────────────────────────────────────────── */
  /* Invoice stats                                                              */
  /* ────────────────────────────────────────────────────────────────────────── */

  const invoiceStats = useMemo(() => {
    // Cancelled invoices are the "source" of a Copy & Edit action — they're
    // superseded by the new copy, so they shouldn't add to Total Invoiced
    // (otherwise the same bill amount would be counted twice: once for the
    // original, once for the copy).
    const activeInvoices = invoices.filter(
      (i: any) => i.status !== "cancelled",
    );
    return {
      total: invoices.length,
      totalValue: activeInvoices.reduce(
        (s: number, i: any) => s + parseFloat(i.grand_total || 0),
        0,
      ),
      paid: invoices
        .filter((i: any) => i.status === "paid")
        .reduce((s: number, i: any) => s + parseFloat(i.grand_total || 0), 0),
      pending: invoices
        .filter((i: any) => ["draft", "issued", "partial"].includes(i.status))
        .reduce(
          (s: number, i: any) =>
            s + parseFloat(i.balance_due || i.grand_total || 0),
          0,
        ),
    };
  }, [invoices]);

  /* ────────────────────────────────────────────────────────────────────────── */
  /* Render                                                                     */
  /* ────────────────────────────────────────────────────────────────────────── */

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF8F5]">
        <Loader2 className="animate-spin text-[#C8922A]" size={40} />
      </div>
    );

  if (!client) return <div className="p-10 text-center">Client not found.</div>;

  return (
    <div className="p-4 sm:p-8 bg-[#FAF8F5] min-h-screen font-sans">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#9A8F82] hover:text-[#1C1C1C] transition-colors group"
        >
          <ArrowLeft
            size={18}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="text-sm font-medium">Back to Clients</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* LEFT: Client Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6 shadow-sm">
            <div className="flex flex-col items-center text-center pb-6 border-b border-[#F5F2ED]">
              <div className="w-20 h-20 rounded-full bg-[#FDF3E3] text-[#C8922A] text-3xl font-bold flex items-center justify-center border-2 border-[#F5E6CC] mb-4 shadow-sm">
                {client?.full_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <h1 className="text-xl font-bold text-[#1C1C1C]">
                {client.full_name}
              </h1>
              {client.client_type && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mt-2"
                  style={{
                    background:
                      client.client_type === "vendor"
                        ? "#EEF2FF"
                        : client.client_type === "local"
                          ? "#FFF7ED"
                          : client.client_type === "corporate"
                            ? "#F0FDF4"
                            : client.client_type === "builder"
                              ? "#FDF4FF"
                              : "#F5F5F5",
                    color:
                      client.client_type === "vendor"
                        ? "#4F46E5"
                        : client.client_type === "local"
                          ? "#EA580C"
                          : client.client_type === "corporate"
                            ? "#16A34A"
                            : client.client_type === "builder"
                              ? "#9333EA"
                              : "#6B7280",
                  }}
                >
                  {client.client_type === "other" && client.client_type_other
                    ? client.client_type_other
                    : client.client_type}
                </span>
              )}
            </div>

            <div className="pt-6 space-y-5">
              {[
                {
                  icon: <Mail size={16} />,
                  label: "Email Address",
                  value: client.email || "N/A",
                },
                {
                  icon: <Phone size={16} />,
                  label: "Phone Number",
                  value: client.phone || "N/A",
                },
                {
                  icon: <CreditCard size={16} />,
                  label: "GST Number",
                  value: client.gstin || "N/A",
                  upper: true,
                },
                {
                  icon: <MapPin size={16} />,
                  label: "Billing Address",
                  value: client.billing_address || "N/A",
                },
                {
                  icon: <Home size={16} />,
                  label: "Site Address",
                  value: client.site_address || "N/A",
                },
                {
                  icon: <BadgeCheck size={16} />,
                  label: "Lead Source",
                  value:
                    client.lead_source === "other"
                      ? client.lead_source_other || "Other"
                      : client.lead_source || "N/A",
                },
                {
                  icon: <MapPin size={16} />,
                  label: "Location",
                  value:
                    [client.city, client.state, client.country]
                      .filter(Boolean)
                      .join(", ") || "N/A",
                },
              ].map(({ icon, label, value, upper }: any) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="p-2 bg-[#FAF8F5] rounded-lg text-[#9A8F82]">
                    {icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-bold text-[#9A8F82] tracking-wider">
                      {label}
                    </p>
                    <p
                      className={`text-[13px] font-medium text-[#1C1C1C] break-words leading-relaxed ${upper ? "uppercase" : ""}`}
                    >
                      {label === "Email Address" && value !== "N/A" ? (
                        <a
                          href={`mailto:${value}`}
                          className="hover:text-[#C8922A] hover:underline transition-colors"
                        >
                          {value}
                        </a>
                      ) : label === "Phone Number" && value !== "N/A" ? (
                        <a
                          href={`tel:${value}`}
                          className="hover:text-[#C8922A] hover:underline transition-colors"
                        >
                          {value}
                        </a>
                      ) : (
                        value
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EDE8DF] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[#9A8F82] text-[12px] font-semibold uppercase tracking-widest mb-3">
              <Calendar size={14} /> Account Info
            </div>
            <p className="text-[13px] text-[#6B6259]">
              Created on:{" "}
              <span className="font-bold text-[#1C1C1C]">
                {new Date(client.created_at).toLocaleDateString()}
              </span>
            </p>
          </div>
        </div>

        {/* RIGHT: Tabs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tab Bar + Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1 bg-white border border-[#EDE8DF] rounded-xl p-1 shadow-sm flex-wrap">
              {[
                {
                  key: "projects",
                  icon: <Briefcase size={13} />,
                  label: `Projects (${client.project_count ?? projects.length ?? 0})`,
                },
                {
                  key: "proposals",
                  icon: <ScrollText size={13} />,
                  label: "Proposals",
                },
                {
                  key: "quotations",
                  icon: <Receipt size={13} />,
                  label: "Quotations",
                },
                {
                  key: "invoices",
                  icon: <FileStack size={13} />,
                  label: "Invoices",
                },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                    activeTab === t.key
                      ? "bg-[#C8922A] text-white shadow-sm"
                      : "text-[#6B6259] hover:text-[#1C1C1C]"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === "projects" && (
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-sm"
              >
                <Plus size={15} /> Add Project
              </button>
            )}

            {activeTab === "proposals" && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingTemplateId(null);
                    setTemplateForm({ name: "", description: "", content: "" });
                    setTemplateError(null);
                    setIsTemplateModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-white border border-[#EDE8DF] hover:border-[#C8922A] text-[#6B6259] hover:text-[#C8922A] text-[12px] font-semibold px-3 py-2 rounded-lg transition-all shadow-sm"
                >
                  <Layout size={14} /> Template
                </button>
                <button
                  onClick={openProposalModal}
                  className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold px-4 py-2 rounded-lg transition-all shadow-sm"
                >
                  <Plus size={14} /> Proposal
                </button>
              </div>
            )}

            {activeTab === "quotations" && (
              <button
                onClick={openQuoteModal}
                className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-sm"
              >
                <Plus size={15} /> New Quotation
              </button>
            )}

            {activeTab === "invoices" && (
              <button
                onClick={openInvoiceModal}
                className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-sm"
              >
                <Plus size={15} /> Generate Invoice
              </button>
            )}
          </div>

          {/* PROJECTS TAB */}
          {activeTab === "projects" && (
            <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden shadow-sm">
              {projectsLoading ? (
                <div className="py-14 text-center">
                  <Loader2
                    className="inline animate-spin text-[#C8922A]"
                    size={24}
                  />
                </div>
              ) : projects.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="bg-[#FAF8F5] border-b border-[#EDE8DF]">
                      <tr>
                        <th className="px-4 sm:px-6 py-4 text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">
                          Project Details
                        </th>
                        <th className="px-4 sm:px-6 py-4 text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 sm:px-6 py-4 text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5F2ED]">
                      {projects.map((p: any) => (
                        <tr
                          key={p.id}
                          className="hover:bg-[#FAF8F5] transition-colors"
                        >
                          <td className="px-4 sm:px-6 py-4">
                            <p className="text-[13px] font-bold text-[#1C1C1C] capitalize">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-[#9A8F82] mt-0.5">
                              {p.property_type} • ₹
                              {Number(p.budget_range || 0).toLocaleString(
                                "en-IN",
                              )}
                            </p>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${projectBadge(p.status)}`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleProjectEditClick(p)}
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteProject(p.id)}
                                className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-16 text-center text-[#9A8F82] text-sm">
                  No projects found.
                </div>
              )}
            </div>
          )}

          {/* PROPOSALS TAB */}
          {activeTab === "proposals" && (
            <div className="space-y-4">
              {/* Templates */}
              <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#EDE8DF] flex items-center gap-2">
                  <Layout size={14} className="text-[#C8922A]" />
                  <h3 className="text-[12px] font-bold text-[#6B6259] uppercase tracking-widest">
                    Saved Templates
                  </h3>
                  <span className="ml-auto text-[11px] bg-[#FDF3E3] text-[#C8922A] font-bold px-2 py-0.5 rounded-full">
                    {templates.length}
                  </span>
                </div>

                {templates.length > 0 ? (
                  <div className="divide-y divide-[#F5F2ED]">
                    {templates.map((t: any) => (
                      <div
                        key={t.id}
                        className="px-6 py-3 flex items-center gap-3 hover:bg-[#FAF8F5]"
                      >
                        <div className="p-2 bg-[#FDF3E3] rounded-lg text-[#C8922A]">
                          <FileText size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-[#1C1C1C]">
                            {t.name}
                          </p>
                          {t.description && (
                            <p className="text-[11px] text-[#9A8F82] truncate max-w-xs">
                              {t.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEditTemplateModal(t)}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
                            title="Edit Template"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleTemplateDelete(t.id)}
                            disabled={templateActionKey === t.id}
                            className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50"
                            title="Delete Template"
                          >
                            {templateActionKey === t.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center text-[#9A8F82] text-[13px]">
                    No templates yet.
                  </div>
                )}
              </div>

              {/* Proposals list */}
              <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#EDE8DF] flex items-center gap-2">
                  <ScrollText size={14} className="text-[#C8922A]" />
                  <h3 className="text-[12px] font-bold text-[#6B6259] uppercase tracking-widest">
                    Proposals
                  </h3>
                  <span className="ml-auto text-[11px] bg-[#FDF3E3] text-[#C8922A] font-bold px-2 py-0.5 rounded-full">
                    {proposals.length}
                  </span>
                </div>

                {proposalsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2
                      className="animate-spin text-[#C8922A]"
                      size={22}
                    />
                  </div>
                ) : proposals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left">
                      <thead className="border-b border-[#EDE8DF]">
                        <tr>
                          {[
                            "Proposal",
                            "Project",
                            "Valid Until",
                            "Status",
                            "Actions",
                          ].map((h, i) => (
                            <th
                              key={h}
                              className={`px-4 sm:px-6 py-3 text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider ${
                                i === 4 ? "text-right" : ""
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#F5F2ED]">
                        {proposals.map((p: any) => (
                          <tr key={p.id} className="hover:bg-[#FAF8F5]">
                            <td className="px-4 sm:px-6 py-4">
                              <button
                                onClick={() => fetchProposalDetail(p.id)}
                                className="text-[13px] font-bold text-[#C8922A] hover:underline"
                              >
                                #{p.prop_number || "—"}
                              </button>
                              <p className="text-[12px] text-[#6B6259]">
                                {p.title}
                              </p>
                            </td>

                            <td className="px-4 sm:px-6 py-4">
                              <p className="text-[13px] text-[#1C1C1C] capitalize">
                                {p.project_name}
                              </p>
                              {p.template_name && (
                                <p className="text-[11px] text-[#9A8F82]">
                                  via {p.template_name}
                                </p>
                              )}
                            </td>

                            <td className="px-4 sm:px-6 py-4 text-[13px] text-[#6B6259]">
                              {p.valid_until
                                ? new Date(p.valid_until).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )
                                : "—"}
                            </td>

                            <td className="px-4 sm:px-6 py-4">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${proposalBadge(p.status)}`}
                              >
                                {p.status}
                              </span>
                            </td>

                            <td className="px-4 sm:px-6 py-4 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  onClick={() => openEditProposalModal(p.id)}
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>

                                {p.status === "draft" && (
                                  <button
                                    onClick={() =>
                                      handleProposalStatus(p.id, "sent")
                                    }
                                    disabled={
                                      proposalActionKey === `sent_${p.id}`
                                    }
                                    className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                                    title="Mark Sent"
                                  >
                                    {proposalActionKey === `sent_${p.id}` ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Send size={14} />
                                    )}
                                  </button>
                                )}

                                {p.status === "sent" && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleProposalStatus(p.id, "accepted")
                                      }
                                      disabled={
                                        proposalActionKey === `accepted_${p.id}`
                                      }
                                      className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 disabled:opacity-50"
                                      title="Accept"
                                    >
                                      {proposalActionKey ===
                                      `accepted_${p.id}` ? (
                                        <Loader2
                                          size={14}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <CheckCircle size={14} />
                                      )}
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleProposalStatus(p.id, "rejected")
                                      }
                                      disabled={
                                        proposalActionKey === `rejected_${p.id}`
                                      }
                                      className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50"
                                      title="Reject"
                                    >
                                      {proposalActionKey ===
                                      `rejected_${p.id}` ? (
                                        <Loader2
                                          size={14}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <X size={14} />
                                      )}
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={async () => {
                                    setProposalActionKey(`pdf_${p.id}`);
                                    try {
                                      const blob = await downloadProposalPdf(
                                        p.id,
                                      );
                                      saveBlob(
                                        blob,
                                        `${(p.prop_number || p.id).replace(/[^\w.-]+/g, "_")}.pdf`,
                                      );
                                    } catch (e: any) {
                                      alert(e?.message || "PDF failed");
                                    } finally {
                                      setProposalActionKey(null);
                                    }
                                  }}
                                  disabled={proposalActionKey === `pdf_${p.id}`}
                                  className="p-1.5 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50"
                                  title="PDF"
                                >
                                  {proposalActionKey === `pdf_${p.id}` ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Printer size={14} />
                                  )}
                                </button>

                                <button
                                  onClick={async () => {
                                    const full = await getProposalById(p.id);
                                    downloadProposalCSV(full);
                                  }}
                                  className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100"
                                  title="CSV"
                                >
                                  <FileSpreadsheet size={14} />
                                </button>

                                <button
                                  onClick={async () => {
                                    setProposalActionKey(`email_${p.id}`);
                                    try {
                                      await sendProposalEmail(p.id);
                                      alert("✅ Proposal emailed!");
                                    } catch (e: any) {
                                      alert(e?.message || "Email failed");
                                    } finally {
                                      setProposalActionKey(null);
                                    }
                                  }}
                                  disabled={
                                    proposalActionKey === `email_${p.id}`
                                  }
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                                  title="Email"
                                >
                                  {proposalActionKey === `email_${p.id}` ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Mail size={14} />
                                  )}
                                </button>

                                <button
                                  onClick={async () => {
                                    setProposalActionKey(`wa_${p.id}`);
                                    try {
                                      await sendProposalWhatsApp(p.id);
                                      alert("✅ Proposal WhatsApp sent!");
                                    } catch (e: any) {
                                      alert(e?.message || "WhatsApp failed");
                                    } finally {
                                      setProposalActionKey(null);
                                    }
                                  }}
                                  disabled={proposalActionKey === `wa_${p.id}`}
                                  className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 disabled:opacity-50"
                                  title="WhatsApp"
                                >
                                  {proposalActionKey === `wa_${p.id}` ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <MessageCircle size={14} />
                                  )}
                                </button>

                                <button
                                  onClick={() => handleProposalDelete(p.id)}
                                  className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center text-[#9A8F82] text-[13px]">
                    No proposals found for this client.
                  </div>
                )}
              </div>

              {/* Proposal Detail Panel (opens below + autoscroll) */}
              {(proposalDetailLoading || viewingProposal) && (
                <div
                  ref={proposalPanelRef}
                  className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm overflow-hidden scroll-mt-24"
                >
                  <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#EDE8DF] flex items-center justify-between">
                    <h3 className="text-[13px] font-bold text-[#1C1C1C]">
                      {proposalDetailLoading
                        ? "Loading..."
                        : `Proposal #${viewingProposal?.prop_number || "—"} — ${viewingProposal?.project_name || ""}`}
                    </h3>
                    <button
                      onClick={() => setViewingProposal(null)}
                      className="text-[#9A8F82] hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {proposalDetailLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2
                        className="animate-spin text-[#C8922A]"
                        size={22}
                      />
                    </div>
                  ) : viewingProposal ? (
                    <div className="p-6 space-y-4">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${proposalBadge(viewingProposal.status)}`}
                        >
                          {viewingProposal.status}
                        </span>
                        {viewingProposal.valid_until && (
                          <span className="text-[12px] text-[#6B6259]">
                            Valid until:{" "}
                            <span className="font-semibold">
                              {new Date(
                                viewingProposal.valid_until,
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </span>
                        )}
                      </div>

                      {viewingProposal.notes && (
                        <div className="bg-[#FAF8F5] rounded-lg px-4 py-3 text-[13px] text-[#6B6259] border border-[#EDE8DF]">
                          <span className="font-bold text-[#9A8F82] uppercase text-[10px] block mb-1 tracking-wide">
                            Notes
                          </span>
                          {viewingProposal.notes}
                        </div>
                      )}

                      <div className="bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl p-4">
                        <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider mb-2">
                          Content
                        </p>
                        <pre className="whitespace-pre-wrap text-[12px] text-[#1C1C1C] font-mono leading-relaxed">
                          {viewingProposal.content || "—"}
                        </pre>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          onClick={() =>
                            openEditProposalModal(viewingProposal.id)
                          }
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold hover:border-[#C8922A]"
                        >
                          <Edit2 size={13} /> Edit
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              const blob = await downloadProposalPdf(
                                viewingProposal.id,
                              );
                              saveBlob(
                                blob,
                                `${(viewingProposal.prop_number || viewingProposal.id).replace(/[^\w.-]+/g, "_")}.pdf`,
                              );
                            } catch (e: any) {
                              alert(e?.message || "PDF failed");
                            }
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <Printer size={13} /> PDF
                        </button>

                        <button
                          onClick={() => downloadProposalCSV(viewingProposal)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <FileSpreadsheet size={13} /> CSV
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              await sendProposalEmail(viewingProposal.id);
                              alert("✅ Proposal emailed!");
                            } catch (e: any) {
                              alert(e?.message || "Email failed");
                            }
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <Mail size={13} /> Email
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              await sendProposalWhatsApp(viewingProposal.id);
                              alert("✅ WhatsApp sent!");
                            } catch (e: any) {
                              alert(e?.message || "WhatsApp failed");
                            }
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <MessageCircle size={13} /> WhatsApp
                        </button>

                        <button
                          onClick={() =>
                            handleProposalDelete(viewingProposal.id)
                          }
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[12px] font-semibold hover:bg-red-100 ml-auto"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* QUOTATIONS TAB */}
          {activeTab === "quotations" && (
            <div className="space-y-4">
              {quotationsLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="animate-spin text-[#C8922A]" size={28} />
                </div>
              ) : quotations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EDE8DF] p-16 text-center text-[#9A8F82] text-sm shadow-sm">
                  No quotations yet. Click <strong>New Quotation</strong> to
                  create one.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left">
                      <thead className="bg-[#FAF8F5] border-b border-[#EDE8DF]">
                        <tr>
                          {[
                            "Quote #",
                            "Project",
                            "Tax",
                            "Grand Total",
                            "Status",
                            "Actions",
                          ].map((h, i) => (
                            <th
                              key={h}
                              className={`px-4 sm:px-5 py-4 text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider ${
                                i >= 3 ? "text-right" : ""
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#F5F2ED]">
                        {quotations.map((q: any) => (
                          <tr
                            key={q.id}
                            className="hover:bg-[#FAF8F5] transition-colors"
                          >
                            <td className="px-4 sm:px-5 py-4">
                              <button
                                onClick={() => fetchQuoteDetail(q.id)}
                                className="text-[13px] font-bold text-[#C8922A] hover:underline"
                              >
                                #{q.quote_number}{" "}
                                <span className="text-[11px] text-[#9A8F82] font-normal">
                                  v{q.version}
                                </span>
                              </button>
                            </td>

                            <td className="px-4 sm:px-5 py-4 text-[13px] text-[#1C1C1C] capitalize">
                              {q.project_name}
                            </td>

                            <td className="px-4 sm:px-5 py-4 text-[11px] text-[#6B6259]">
                              {parseFloat(q.igst_rate) > 0
                                ? `IGST ${q.igst_rate}%`
                                : parseFloat(q.cgst_rate) > 0 ||
                                    parseFloat(q.sgst_rate) > 0
                                  ? `CGST ${q.cgst_rate}% + SGST ${q.sgst_rate}%`
                                  : `Non-GST`}
                            </td>

                            <td className="px-4 sm:px-5 py-4 text-right">
                              <span className="text-[13px] font-bold text-[#1C1C1C]">
                                ₹{fmt(q.grand_total)}
                              </span>
                            </td>

                            <td className="px-4 sm:px-5 py-4 text-right">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${quoteBadge(q.status)}`}
                              >
                                {q.status}
                              </span>
                            </td>

                            <td className="px-4 sm:px-5 py-4 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  onClick={() => openEditQuoteModal(q.id)}
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>

                                {q.status === "draft" && (
                                  <button
                                    onClick={() => handleSendQuote(q.id)}
                                    disabled={quoteActionKey === `send_${q.id}`}
                                    className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                                    title="Mark Sent"
                                  >
                                    {quoteActionKey === `send_${q.id}` ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Send size={14} />
                                    )}
                                  </button>
                                )}

                                {(q.status === "draft" ||
                                  q.status === "sent") && (
                                  <button
                                    onClick={() => handleApproveQuote(q.id)}
                                    disabled={
                                      quoteActionKey === `approve_${q.id}`
                                    }
                                    className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 disabled:opacity-50"
                                    title="Approve"
                                  >
                                    {quoteActionKey === `approve_${q.id}` ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <CheckCircle size={14} />
                                    )}
                                  </button>
                                )}

                                {q.status === "approved" && (
                                  <button
                                    onClick={() => handleReviseQuote(q.id)}
                                    disabled={
                                      quoteActionKey === `revise_${q.id}`
                                    }
                                    className="p-1.5 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 disabled:opacity-50"
                                    title="Revise"
                                  >
                                    {quoteActionKey === `revise_${q.id}` ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <RotateCcw size={14} />
                                    )}
                                  </button>
                                )}

                                <button
                                  onClick={async () => {
                                    setQuoteActionKey(`pdf_${q.id}`);
                                    try {
                                      const blob = await downloadQuotationPdf(
                                        q.id,
                                      );
                                      saveBlob(blob, `${q.quote_number}.pdf`);
                                    } catch (e: any) {
                                      alert(e?.message || "PDF failed");
                                    } finally {
                                      setQuoteActionKey(null);
                                    }
                                  }}
                                  disabled={quoteActionKey === `pdf_${q.id}`}
                                  className="p-1.5 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50"
                                  title="PDF"
                                >
                                  {quoteActionKey === `pdf_${q.id}` ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Printer size={14} />
                                  )}
                                </button>

                                <button
                                  onClick={async () => {
                                    const full = await getQuotationById(q.id);
                                    downloadQuotationCSV(full);
                                  }}
                                  className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100"
                                  title="CSV"
                                >
                                  <FileSpreadsheet size={14} />
                                </button>

                                <button
                                  onClick={() => sendQuotationEmail(q.id)}
                                  disabled={quoteActionKey === `email_${q.id}`}
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                                  title="Email"
                                >
                                  {quoteActionKey === `email_${q.id}` ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Mail size={14} />
                                  )}
                                </button>

                                <button
                                  onClick={() => sendQuotationWhatsApp(q.id)}
                                  disabled={quoteActionKey === `wa_${q.id}`}
                                  className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 disabled:opacity-50"
                                  title="WhatsApp"
                                >
                                  {quoteActionKey === `wa_${q.id}` ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <MessageCircle size={14} />
                                  )}
                                </button>

                                <button
                                  onClick={() => handleDeleteQuote(q.id)}
                                  disabled={quoteActionKey === `del_${q.id}`}
                                  className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50"
                                  title="Delete"
                                >
                                  {quoteActionKey === `del_${q.id}` ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>

                                <button
                                  onClick={() => openQuoteCopyModal(q)}
                                  className="p-1.5 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100"
                                  title="Copy & Edit Quotation"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Quote Detail Panel (auto-scroll) */}
              {(quoteDetailLoading || viewingQuote) && (
                <div
                  ref={quotePanelRef}
                  className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm overflow-hidden scroll-mt-24"
                >
                  <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#EDE8DF] flex items-center justify-between">
                    <h3 className="text-[13px] font-bold text-[#1C1C1C]">
                      {quoteDetailLoading
                        ? "Loading..."
                        : `Quote #${viewingQuote.quote_number} — ${viewingQuote.project_name} (v${viewingQuote.version})`}
                    </h3>
                    <button
                      onClick={() => setViewingQuote(null)}
                      className="text-[#9A8F82] hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {quoteDetailLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2
                        className="animate-spin text-[#C8922A]"
                        size={22}
                      />
                    </div>
                  ) : viewingQuote ? (
                    <div className="p-6 space-y-5">
                      {viewingQuote.items?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[780px] text-left text-[13px]">
                            <thead>
                              <tr className="border-b border-[#EDE8DF]">
                                {[
                                  "#",
                                  "Description",
                                  "Category",
                                  "Qty",
                                  "Unit",
                                  "Rate",
                                  "Amount",
                                ].map((h) => (
                                  <th
                                    key={h}
                                    className="pb-2 pr-4 text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider whitespace-nowrap"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F2ED]">
                              {viewingQuote.items.map((it: any, n: number) => (
                                <tr key={it.id || n}>
                                  <td className="py-2.5 pr-4 text-[#9A8F82]">
                                    {n + 1}
                                  </td>
                                  <td className="py-2.5 pr-4 font-medium text-[#1C1C1C]">
                                    {it.description}
                                  </td>
                                  <td className="py-2.5 pr-4 text-[#6B6259]">
                                    {it.category}
                                  </td>
                                  <td className="py-2.5 pr-4 text-[#1C1C1C]">
                                    {it.quantity}
                                  </td>
                                  <td className="py-2.5 pr-4 text-[#6B6259]">
                                    {it.unit}
                                  </td>
                                  <td className="py-2.5 pr-4 text-[#1C1C1C]">
                                    ₹{fmt(it.rate)}
                                  </td>
                                  <td className="py-2.5 font-bold text-[#1C1C1C]">
                                    ₹
                                    {fmt(
                                      (parseFloat(it.quantity) || 0) *
                                        (parseFloat(it.rate) || 0),
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-[13px] text-[#9A8F82] italic">
                          No items in this quotation.
                        </p>
                      )}

                      <div className="ml-auto w-full sm:w-72 space-y-1.5 pt-4 border-t border-[#EDE8DF] text-[13px]">
                        {(
                          [
                            ["Subtotal", `₹${fmt(viewingQuote.subtotal)}`],
                            [
                              `Discount (${
                                viewingQuote.discount_type === "percentage"
                                  ? viewingQuote.discount_value + "%"
                                  : "₹" + fmt(viewingQuote.discount_value)
                              })`,
                              `-₹${fmt(viewingQuote.discount_amount)}`,
                            ],
                            [
                              "Taxable Amount",
                              `₹${fmt(viewingQuote.taxable_amount)}`,
                            ],
                            parseFloat(viewingQuote.cgst_amount) > 0 && [
                              `CGST @ ${viewingQuote.cgst_rate}%`,
                              `₹${fmt(viewingQuote.cgst_amount)}`,
                            ],
                            parseFloat(viewingQuote.sgst_amount) > 0 && [
                              `SGST @ ${viewingQuote.sgst_rate}%`,
                              `₹${fmt(viewingQuote.sgst_amount)}`,
                            ],
                            parseFloat(viewingQuote.igst_amount) > 0 && [
                              `IGST @ ${viewingQuote.igst_rate}%`,
                              `₹${fmt(viewingQuote.igst_amount)}`,
                            ],
                          ] as any[]
                        )
                          .filter(Boolean)
                          .map(([label, val]: any) => (
                            <div
                              key={label}
                              className="flex justify-between text-[#6B6259]"
                            >
                              <span>{label}</span>
                              <span className="font-medium text-[#1C1C1C]">
                                {val}
                              </span>
                            </div>
                          ))}
                        <div className="flex justify-between font-bold text-[15px] pt-2 border-t border-[#EDE8DF] text-[#1C1C1C]">
                          <span>Grand Total</span>
                          <span>₹{fmt(viewingQuote.grand_total)}</span>
                        </div>
                      </div>

                      {viewingQuote.notes && (
                        <div className="bg-[#FAF8F5] rounded-lg px-4 py-3 text-[13px] text-[#6B6259] border border-[#EDE8DF]">
                          <span className="font-bold text-[#9A8F82] uppercase text-[10px] block mb-1 tracking-wide">
                            Notes
                          </span>
                          {viewingQuote.notes}
                        </div>
                      )}

                      {/* Detail actions incl. EDIT */}
                      <div className="flex gap-2 pt-2 flex-wrap">
                        <button
                          onClick={() => openEditQuoteModal(viewingQuote.id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold hover:border-[#C8922A]"
                        >
                          <Edit2 size={13} /> Edit
                        </button>

                        {viewingQuote.status === "draft" && (
                          <button
                            onClick={() => handleSendQuote(viewingQuote.id)}
                            disabled={!!quoteActionKey}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[12px] font-semibold hover:bg-blue-100"
                          >
                            <Send size={13} /> Mark as Sent
                          </button>
                        )}

                        {(viewingQuote.status === "draft" ||
                          viewingQuote.status === "sent") && (
                          <button
                            onClick={() => handleApproveQuote(viewingQuote.id)}
                            disabled={!!quoteActionKey}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-lg text-[12px] font-semibold hover:bg-green-100"
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                        )}

                        {viewingQuote.status === "approved" && (
                          <button
                            onClick={() => handleReviseQuote(viewingQuote.id)}
                            disabled={!!quoteActionKey}
                            className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-[12px] font-semibold hover:bg-purple-100"
                          >
                            <RotateCcw size={13} /> Revise
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            try {
                              const blob = await downloadQuotationPdf(
                                viewingQuote.id,
                              );
                              saveBlob(
                                blob,
                                `${viewingQuote.quote_number}.pdf`,
                              );
                            } catch (e: any) {
                              alert(e?.message || "PDF failed");
                            }
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <Printer size={13} /> PDF
                        </button>

                        <button
                          onClick={() => downloadQuotationCSV(viewingQuote)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <FileSpreadsheet size={13} /> CSV
                        </button>

                        <button
                          onClick={() => sendQuotationEmail(viewingQuote.id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <Mail size={13} /> Email
                        </button>

                        <button
                          onClick={() => sendQuotationWhatsApp(viewingQuote.id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <MessageCircle size={13} /> WhatsApp
                        </button>

                        <button
                          onClick={() => handleDeleteQuote(viewingQuote.id)}
                          disabled={!!quoteActionKey}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[12px] font-semibold hover:bg-red-100 ml-auto"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* INVOICES TAB */}
          {activeTab === "invoices" && (
            <div className="space-y-4">
              {/* Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: "Total Invoiced",
                    value: `₹${fmt(invoiceStats.totalValue)}`,
                    icon: <IndianRupee size={14} />,
                    color: "text-[#C8922A]",
                    bg: "bg-[#FDF3E3]",
                  },
                  {
                    label: "Amount Received",
                    value: `₹${fmt(invoiceStats.paid)}`,
                    icon: <BadgeCheck size={14} />,
                    color: "text-green-600",
                    bg: "bg-green-50",
                  },
                  {
                    label: "Balance Pending",
                    value: `₹${fmt(invoiceStats.pending)}`,
                    icon: <Clock size={14} />,
                    color: "text-amber-600",
                    bg: "bg-amber-50",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-white border border-[#EDE8DF] rounded-xl p-4 shadow-sm"
                  >
                    <div
                      className={`inline-flex p-2 ${s.bg} rounded-lg ${s.color} mb-2`}
                    >
                      {s.icon}
                    </div>
                    <p className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">
                      {s.label}
                    </p>
                    <p className={`text-[15px] font-bold ${s.color} mt-0.5`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Invoice List */}
              {invoicesLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="animate-spin text-[#C8922A]" size={28} />
                </div>
              ) : invoices.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EDE8DF] p-16 text-center shadow-sm">
                  <div className="w-12 h-12 bg-[#FDF3E3] rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileStack size={22} className="text-[#C8922A]" />
                  </div>
                  <p className="text-[#9A8F82] text-sm font-medium">
                    No invoices yet.
                  </p>
                  <p className="text-[#9A8F82] text-[12px] mt-1">
                    Generate one from an approved quotation.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left">
                      <thead className="bg-[#FAF8F5] border-b border-[#EDE8DF]">
                        <tr>
                          {[
                            "Invoice #",
                            "Project",
                            "Type",
                            "Date",
                            "Due Date",
                            "Grand Total",
                            "Status",
                            "Actions",
                          ].map((h, i) => (
                            <th
                              key={h}
                              className={`px-4 py-4 text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider ${
                                i >= 5 ? "text-right" : ""
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#F5F2ED]">
                        {invoices.map((inv: any) => (
                          <tr
                            key={`${inv.id}-${invoicesRefreshKey}`}
                            className="hover:bg-[#FAF8F5] transition-colors"
                          >
                            <td className="px-4 py-4">
                              <button
                                onClick={() => fetchInvoiceDetail(inv.id)}
                                className="text-[13px] font-bold text-[#C8922A] hover:underline"
                              >
                                #{inv.invoice_number}
                              </button>
                            </td>

                            <td className="px-4 py-4 text-[13px] text-[#1C1C1C] capitalize">
                              {inv.project_name}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${invoiceTypeBadge(inv.invoice_type)}`}
                              >
                                {inv.invoice_type}
                              </span>
                              {inv.milestone_label && (
                                <p className="text-[10px] text-[#9A8F82] mt-0.5 truncate max-w-[140px]">
                                  {inv.milestone_label}
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-4 text-[12px] text-[#6B6259]">
                              {inv.invoice_date
                                ? new Date(inv.invoice_date).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )
                                : "—"}
                            </td>

                            <td className="px-4 py-4 text-[12px] text-[#6B6259]">
                              {inv.due_date
                                ? new Date(inv.due_date).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )
                                : "—"}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <p className="text-[13px] font-bold text-[#1C1C1C]">
                                ₹{fmt(inv.grand_total)}
                              </p>
                              {parseFloat(inv.balance_due) > 0 &&
                                parseFloat(inv.balance_due) !==
                                  parseFloat(inv.grand_total) && (
                                  <p className="text-[10px] text-amber-600 font-medium">
                                    Bal: ₹{fmt(inv.balance_due)}
                                  </p>
                                )}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${invoiceBadge(inv.status)}`}
                              >
                                {inv.status}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                                {inv.status === "draft" && (
                                  <button
                                    onClick={() => handleSendInvoice(inv.id)}
                                    disabled={
                                      invoiceActionKey === `issue_${inv.id}`
                                    }
                                    title="Mark Issued"
                                    className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                                  >
                                    {invoiceActionKey === `issue_${inv.id}` ? (
                                      <Loader2
                                        size={13}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Send size={13} />
                                    )}
                                  </button>
                                )}

                                {(inv.status === "issued" ||
                                  inv.status === "partial") && (
                                  <button
                                    onClick={() => handleMarkPaid(inv.id)}
                                    disabled={
                                      invoiceActionKey === `paid_${inv.id}`
                                    }
                                    title="Mark Paid"
                                    className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 disabled:opacity-50"
                                  >
                                    {invoiceActionKey === `paid_${inv.id}` ? (
                                      <Loader2
                                        size={13}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Banknote size={13} />
                                    )}
                                  </button>
                                )}

                                <button
                                  onClick={() =>
                                    downloadInvoicePDF(
                                      inv.id,
                                      inv.invoice_number,
                                    )
                                  }
                                  title="PDF"
                                  className="p-1.5 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100"
                                >
                                  <Printer size={13} />
                                </button>

                                <button
                                  onClick={async () => {
                                    const full = await getInvoiceById(inv.id);
                                    downloadInvoiceCSV(full as any);
                                  }}
                                  title="CSV"
                                  className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100"
                                >
                                  <FileSpreadsheet size={13} />
                                </button>

                                <button
                                  onClick={async () => {
                                    setInvoiceActionKey(`email_${inv.id}`);
                                    try {
                                      await sendInvoiceEmail(inv.id);
                                      alert("✅ Invoice emailed!");
                                    } catch (e: any) {
                                      alert(e?.message || "Email failed");
                                    } finally {
                                      setInvoiceActionKey(null);
                                    }
                                  }}
                                  disabled={
                                    invoiceActionKey === `email_${inv.id}`
                                  }
                                  title="Email"
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
                                >
                                  {invoiceActionKey === `email_${inv.id}` ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Mail size={13} />
                                  )}
                                </button>

                                <button
                                  onClick={async () => {
                                    setInvoiceActionKey(`wa_${inv.id}`);
                                    try {
                                      await sendInvoiceWhatsApp(inv.id);
                                      alert("✅ WhatsApp sent!");
                                    } catch (e: any) {
                                      alert(e?.message || "WhatsApp failed");
                                    } finally {
                                      setInvoiceActionKey(null);
                                    }
                                  }}
                                  disabled={invoiceActionKey === `wa_${inv.id}`}
                                  title="WhatsApp"
                                  className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  {invoiceActionKey === `wa_${inv.id}` ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <MessageCircle size={13} />
                                  )}
                                </button>

                                <button
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  disabled={
                                    invoiceActionKey === `del_${inv.id}`
                                  }
                                  title="Delete"
                                  className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50"
                                >
                                  {invoiceActionKey === `del_${inv.id}` ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                </button>

                                {/* ── COPY button ── */}
                                {/* Hidden for paid/partial invoices — copying */}
                                {/* would create a second live invoice for */}
                                {/* money that's already been collected. */}
                                {!["paid", "partial"].includes(inv.status) && (
                                  <button
                                    onClick={() => openCopyModal(inv)}
                                    title="Copy & Edit Invoice"
                                    className="p-1.5 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100"
                                  >
                                    <Copy size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Invoice Detail Panel (auto-scroll) */}
              {(invoiceDetailLoading || viewingInvoice) && (
                <div
                  ref={invoicePanelRef}
                  className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm overflow-hidden scroll-mt-24"
                >
                  <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#EDE8DF] flex items-center justify-between">
                    <h3 className="text-[13px] font-bold text-[#1C1C1C]">
                      {invoiceDetailLoading
                        ? "Loading..."
                        : `Invoice #${viewingInvoice.invoice_number} — ${viewingInvoice.project_name}`}
                    </h3>
                    <button
                      onClick={() => setViewingInvoice(null)}
                      className="text-[#9A8F82] hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {invoiceDetailLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2
                        className="animate-spin text-[#C8922A]"
                        size={22}
                      />
                    </div>
                  ) : viewingInvoice ? (
                    <div className="p-6 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF8F5] rounded-xl p-4 border border-[#EDE8DF] text-[13px]">
                        <div>
                          <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                            Client
                          </p>
                          <p className="font-semibold text-[#1C1C1C]">
                            {viewingInvoice.client_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                            Invoice Type
                          </p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${invoiceTypeBadge(viewingInvoice.invoice_type)}`}
                          >
                            {viewingInvoice.invoice_type}
                          </span>
                          {viewingInvoice.milestone_label && (
                            <span className="ml-2 text-[12px] text-[#6B6259]">
                              — {viewingInvoice.milestone_label}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                            Invoice Date
                          </p>
                          <p className="text-[#1C1C1C]">
                            {viewingInvoice.invoice_date
                              ? new Date(
                                  viewingInvoice.invoice_date,
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                            Due Date
                          </p>
                          <p className="text-[#1C1C1C]">
                            {viewingInvoice.due_date
                              ? new Date(
                                  viewingInvoice.due_date,
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })
                              : "—"}
                          </p>
                        </div>
                      </div>

                      {viewingInvoice.items?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[780px] text-left text-[13px]">
                            <thead>
                              <tr className="border-b border-[#EDE8DF]">
                                {[
                                  "#",
                                  "Description",
                                  "Category",
                                  "Qty",
                                  "Unit",
                                  "Rate",
                                  "Amount",
                                ].map((h) => (
                                  <th
                                    key={h}
                                    className="pb-2 pr-4 text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider whitespace-nowrap"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F2ED]">
                              {viewingInvoice.items.map(
                                (it: any, n: number) => (
                                  <tr key={it.id || n}>
                                    <td className="py-2.5 pr-4 text-[#9A8F82]">
                                      {n + 1}
                                    </td>
                                    <td className="py-2.5 pr-4 font-medium text-[#1C1C1C]">
                                      {it.description}
                                    </td>
                                    <td className="py-2.5 pr-4 text-[#6B6259]">
                                      {it.category}
                                    </td>
                                    <td className="py-2.5 pr-4 text-[#1C1C1C]">
                                      {it.quantity}
                                    </td>
                                    <td className="py-2.5 pr-4 text-[#6B6259]">
                                      {it.unit}
                                    </td>
                                    <td className="py-2.5 pr-4 text-[#1C1C1C]">
                                      ₹{fmt(it.rate)}
                                    </td>
                                    <td className="py-2.5 font-bold text-[#1C1C1C]">
                                      ₹
                                      {fmt(
                                        (parseFloat(it.quantity) || 0) *
                                          (parseFloat(it.rate) || 0),
                                      )}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-[13px] text-[#9A8F82] italic">
                          No line items.
                        </p>
                      )}

                      <div className="ml-auto w-full sm:w-72 space-y-1.5 pt-4 border-t border-[#EDE8DF] text-[13px]">
                        {(
                          [
                            ["Subtotal", `₹${fmt(viewingInvoice.subtotal)}`],
                            parseFloat(viewingInvoice.cgst_amount) > 0 && [
                              `CGST @ ${viewingInvoice.cgst_rate || ""}%`,
                              `₹${fmt(viewingInvoice.cgst_amount)}`,
                            ],
                            parseFloat(viewingInvoice.sgst_amount) > 0 && [
                              `SGST @ ${viewingInvoice.sgst_rate || ""}%`,
                              `₹${fmt(viewingInvoice.sgst_amount)}`,
                            ],
                            parseFloat(viewingInvoice.igst_amount) > 0 && [
                              `IGST @ ${viewingInvoice.igst_rate || ""}%`,
                              `₹${fmt(viewingInvoice.igst_amount)}`,
                            ],
                            parseFloat(viewingInvoice.total_tax) > 0 && [
                              "Total Tax",
                              `₹${fmt(viewingInvoice.total_tax)}`,
                            ],
                          ] as any[]
                        )
                          .filter(Boolean)
                          .map(([label, val]: any) => (
                            <div
                              key={label}
                              className="flex justify-between text-[#6B6259]"
                            >
                              <span>{label}</span>
                              <span className="font-medium text-[#1C1C1C]">
                                {val}
                              </span>
                            </div>
                          ))}
                        <div className="flex justify-between font-bold text-[15px] pt-2 border-t border-[#EDE8DF] text-[#1C1C1C]">
                          <span>Grand Total</span>
                          <span>₹{fmt(viewingInvoice.grand_total)}</span>
                        </div>
                      </div>

                      {viewingInvoice.notes && (
                        <div className="bg-[#FAF8F5] rounded-lg px-4 py-3 text-[13px] text-[#6B6259] border border-[#EDE8DF]">
                          <span className="font-bold text-[#9A8F82] uppercase text-[10px] block mb-1 tracking-wide">
                            Notes
                          </span>
                          {viewingInvoice.notes}
                        </div>
                      )}

                      {/* Detail actions incl. EDIT */}
                      <div className="flex gap-2 pt-2 flex-wrap">
                        <button
                          onClick={() => openInvoiceEdit(viewingInvoice.id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold hover:border-[#C8922A]"
                        >
                          <Edit2 size={13} /> Edit
                        </button>

                        {viewingInvoice.status === "draft" && (
                          <button
                            onClick={() => handleSendInvoice(viewingInvoice.id)}
                            disabled={!!invoiceActionKey}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[12px] font-semibold hover:bg-blue-100"
                          >
                            <Send size={13} /> Mark as Issued
                          </button>
                        )}

                        {(viewingInvoice.status === "issued" ||
                          viewingInvoice.status === "partial") && (
                          <button
                            onClick={() => handleMarkPaid(viewingInvoice.id)}
                            disabled={!!invoiceActionKey}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-lg text-[12px] font-semibold hover:bg-green-100"
                          >
                            <Banknote size={13} /> Mark as Paid
                          </button>
                        )}

                        <button
                          onClick={() =>
                            downloadInvoicePDF(
                              viewingInvoice.id,
                              viewingInvoice.invoice_number,
                            )
                          }
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <Printer size={13} /> PDF
                        </button>

                        <button
                          onClick={() =>
                            downloadInvoiceCSV(viewingInvoice as Invoice)
                          }
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <FileSpreadsheet size={13} /> CSV
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              await sendInvoiceEmail(viewingInvoice.id);
                              alert("✅ Invoice emailed!");
                            } catch (e: any) {
                              alert(e?.message || "Email failed");
                            }
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <Mail size={13} /> Email
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              await sendInvoiceWhatsApp(viewingInvoice.id);
                              alert("✅ WhatsApp sent!");
                            } catch (e: any) {
                              alert(e?.message || "WhatsApp failed");
                            }
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EDE8DF] rounded-lg text-[12px] font-semibold"
                        >
                          <MessageCircle size={13} /> WhatsApp
                        </button>

                        <button
                          onClick={() => handleDeleteInvoice(viewingInvoice.id)}
                          disabled={!!invoiceActionKey}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[12px] font-semibold hover:bg-red-100 ml-auto"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* ASSIGNED SERVICES SECTION                                              */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* <AssignedServicesSection clientId={clientId as string} /> */}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* PROJECT MODAL */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {isProjectModalOpen && (
        <Modal
          title={editingProjectId ? "Update Project" : "Add New Project"}
          onClose={closeProjectModal}
          maxW="max-w-2xl"
        >
          <form
            onSubmit={handleProjectSubmit}
            className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto"
          >
            {projectApiError && (
              <ErrorBanner error={projectApiError} cls="sm:col-span-2" />
            )}
            <FF label="Project Name *" cls="sm:col-span-2">
              <input
                required
                name="name"
                value={projectForm.name}
                onChange={handleProjectInputChange}
                placeholder="Project name"
                className={inputCls}
              />
            </FF>
            <FF label="Property Type">
              <select
                name="property_type"
                value={projectForm.property_type}
                onChange={handleProjectInputChange}
                className={inputCls}
              >
                {["apartment", "villa", "office", "commercial"].map((v) => (
                  <option key={v} value={v}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            </FF>
            <FF label="Area (Sq. Ft.)">
              <input
                type="number"
                name="area_sqft"
                value={projectForm.area_sqft}
                onChange={handleProjectInputChange}
                placeholder="1200"
                className={inputCls}
              />
            </FF>
            <FF label="Budget (₹)">
              <input
                type="number"
                name="budget_range"
                value={projectForm.budget_range}
                onChange={handleProjectInputChange}
                placeholder="500000"
                className={inputCls}
              />
            </FF>
            <FF label="Status">
              <select
                name="status"
                value={projectForm.status}
                onChange={handleProjectInputChange}
                className={inputCls}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </FF>
            <FF label="Start Date">
              <input
                type="date"
                name="start_date"
                value={projectForm.start_date}
                onChange={handleProjectInputChange}
                className={inputCls}
              />
            </FF>
            <FF label="End Date">
              <input
                type="date"
                name="expected_end_date"
                value={projectForm.expected_end_date}
                onChange={handleProjectInputChange}
                className={inputCls}
              />
            </FF>
            <div className="sm:col-span-2 pt-4 border-t border-[#F5F2ED]">
              <MFooter
                onCancel={closeProjectModal}
                isSubmitting={isProjectSubmitting}
                label={editingProjectId ? "Update Project" : "Save Project"}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <Modal
          title={editingTemplateId ? "Update Template" : "Create New Template"}
          onClose={closeTemplateModal}
          maxW="max-w-2xl"
        >
          <form
            onSubmit={handleTemplateSubmit}
            className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
          >
            {templateError && <ErrorBanner error={templateError} />}
            <FF label="Template Name *">
              <input
                required
                value={templateForm.name}
                onChange={(e) =>
                  setTemplateForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. Residential Standard"
                className={inputCls}
              />
            </FF>
            <FF label="Description">
              <input
                value={templateForm.description}
                onChange={(e) =>
                  setTemplateForm((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                placeholder="Short description"
                className={inputCls}
              />
            </FF>
            <FF label="Content *">
              <textarea
                required
                rows={10}
                value={templateForm.content}
                onChange={(e) =>
                  setTemplateForm((p) => ({ ...p, content: e.target.value }))
                }
                placeholder={"Dear {{client_name}},\n\n..."}
                className={`${inputCls} resize-none font-mono text-[12px]`}
              />
              <p className="text-[11px] text-[#9A8F82] mt-1">
                Vars:{" "}
                <code className="bg-[#F5F2ED] px-1 rounded">
                  {"{{client_name}}"}
                </code>{" "}
                <code className="bg-[#F5F2ED] px-1 rounded">
                  {"{{project_name}}"}
                </code>{" "}
                <code className="bg-[#F5F2ED] px-1 rounded">
                  {"{{property_type}}"}
                </code>
              </p>
            </FF>
            <div className="pt-4 border-t border-[#F5F2ED]">
              <MFooter
                onCancel={closeTemplateModal}
                isSubmitting={templateSubmitting}
                label={editingTemplateId ? "Update Template" : "Save Template"}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* PROPOSAL MODAL */}
      {isProposalModalOpen && (
        <Modal
          title={editingProposalId ? "Edit Proposal" : "Create Proposal"}
          onClose={() => setIsProposalModalOpen(false)}
          maxW="max-w-2xl"
        >
          <div className="px-6 pt-5">
            <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl p-1 w-fit mb-4">
              {["template", "manual"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setProposalMode(m as any)}
                  className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                    proposalMode === m
                      ? "bg-white text-[#C8922A] shadow-sm border border-[#EDE8DF]"
                      : "text-[#6B6259]"
                  }`}
                >
                  {m === "template" ? "From Template" : "Manual"}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleProposalSubmit}
            className="px-6 pb-6 space-y-4 max-h-[70vh] overflow-y-auto"
          >
            {proposalError && <ErrorBanner error={proposalError} />}

            <FF label="Project *">
              <select
                required
                value={proposalForm.project}
                onChange={(e) =>
                  setProposalForm((p) => ({ ...p, project: e.target.value }))
                }
                className={inputCls}
              >
                <option value="">— Select —</option>
                {projects.map((pr: any) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </FF>

            <FF label="Title *">
              <input
                required
                value={proposalForm.title}
                onChange={(e) =>
                  setProposalForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Interior Design Proposal..."
                className={inputCls}
              />
            </FF>

            {proposalMode === "template" ? (
              <FF label="Template *">
                <select
                  required
                  value={proposalForm.use_template}
                  onChange={(e) =>
                    setProposalForm((p) => ({
                      ...p,
                      use_template: e.target.value,
                    }))
                  }
                  className={inputCls}
                >
                  <option value="">— Select —</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </FF>
            ) : (
              <FF label="Content *">
                <textarea
                  required
                  rows={7}
                  value={proposalForm.content}
                  onChange={(e) =>
                    setProposalForm((p) => ({ ...p, content: e.target.value }))
                  }
                  placeholder={"Dear Client,\n\n..."}
                  className={`${inputCls} resize-none font-mono text-[12px]`}
                />
              </FF>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FF label="Valid Until">
                <input
                  type="date"
                  value={proposalForm.valid_until}
                  onChange={(e) =>
                    setProposalForm((p) => ({
                      ...p,
                      valid_until: e.target.value,
                    }))
                  }
                  className={inputCls}
                />
              </FF>
              <FF label="Notes">
                <input
                  value={proposalForm.notes}
                  onChange={(e) =>
                    setProposalForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Optional"
                  className={inputCls}
                />
              </FF>
            </div>

            <div className="pt-4 border-t border-[#F5F2ED]">
              <MFooter
                onCancel={() => setIsProposalModalOpen(false)}
                isSubmitting={proposalSubmitting}
                label={
                  editingProposalId ? "Update Proposal" : "Create Proposal"
                }
              />
            </div>
          </form>
        </Modal>
      )}

      {/* QUOTATION MODAL */}
      {isQuoteModalOpen && (
        <Modal
          title={editingQuoteId ? "Edit Quotation" : "Create New Quotation"}
          onClose={closeQuoteModal}
          maxW="max-w-4xl"
          headerExtra={
            editingQuoteId && (
              <button
                type="button"
                onClick={() => setShowQuoteHistory((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${showQuoteHistory ? "bg-[#FDF3E3] text-[#C8922A]" : "text-[#9A8F82] hover:bg-[#F5F2ED]"}`}
              >
                <History size={14} /> History{" "}
                {showQuoteHistory ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>
            )
          }
          side={
            editingQuoteId &&
            showQuoteHistory && (
              <QuoteHistoryPanel
                entries={quoteHistoryEntries}
                loading={quoteHistoryLoading}
              />
            )
          }
        >
          <form
            onSubmit={handleQuoteSubmit}
            className="max-h-[88vh] overflow-y-auto"
          >
            <div className="px-6 pt-5 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-[#EDE8DF]">
              {quoteError && (
                <ErrorBanner error={quoteError} cls="sm:col-span-3" />
              )}

              <FF label="Project *" cls="sm:col-span-1">
                <select
                  required
                  value={quoteForm.project}
                  onChange={(e) =>
                    setQuoteForm((p) => ({ ...p, project: e.target.value }))
                  }
                  className={inputCls}
                >
                  <option value="">— Select Project —</option>
                  {projects.length === 0 && (
                    <option disabled value="">
                      No projects found — create a project first
                    </option>
                  )}
                  {projects.map((pr: any) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </select>
              </FF>

              <FF label="Valid Until">
                <input
                  type="date"
                  value={quoteForm.valid_until}
                  onChange={(e) =>
                    setQuoteForm((p) => ({ ...p, valid_until: e.target.value }))
                  }
                  className={inputCls}
                />
              </FF>

              <FF label="Discount Type">
                <select
                  value={quoteForm.discount_type}
                  onChange={(e) =>
                    setQuoteForm((p) => ({
                      ...p,
                      discount_type: e.target.value,
                    }))
                  }
                  className={inputCls}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </FF>

              <FF
                label={`Discount Value ${quoteForm.discount_type === "percentage" ? "%" : "₹"}`}
              >
                <input
                  type="number"
                  min="0"
                  value={quoteForm.discount_value}
                  onChange={(e) =>
                    setQuoteForm((p) => ({
                      ...p,
                      discount_value: e.target.value,
                    }))
                  }
                  className={inputCls}
                />
              </FF>

              <div className="sm:col-span-2 flex flex-col justify-end gap-2">
                <label className="text-[11px] font-bold text-[#6B6259] uppercase tracking-wide">
                  Tax Mode
                </label>
                <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl p-1 w-fit">
                  <button
                    type="button"
                    onClick={() => setTaxMode("cgst_sgst")}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                      taxMode === "cgst_sgst"
                        ? "bg-white text-[#C8922A] shadow-sm border border-[#EDE8DF]"
                        : "text-[#6B6259]"
                    }`}
                  >
                    CGST + SGST
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxMode("igst")}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                      taxMode === "igst"
                        ? "bg-white text-[#C8922A] shadow-sm border border-[#EDE8DF]"
                        : "text-[#6B6259]"
                    }`}
                  >
                    IGST (Outstation)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxMode("non_gst")}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                      taxMode === "non_gst"
                        ? "bg-white text-[#C8922A] shadow-sm border border-[#EDE8DF]"
                        : "text-[#6B6259]"
                    }`}
                  >
                    Non-GST
                  </button>
                </div>
              </div>

              {taxMode === "cgst_sgst" ? (
                <>
                  <FF label="CGST Rate (%)">
                    <input
                      type="number"
                      min="0"
                      max="28"
                      value={quoteForm.cgst_rate}
                      onChange={(e) =>
                        setQuoteForm((p) => ({
                          ...p,
                          cgst_rate: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </FF>
                  <FF label="SGST Rate (%)">
                    <input
                      type="number"
                      min="0"
                      max="28"
                      value={quoteForm.sgst_rate}
                      onChange={(e) =>
                        setQuoteForm((p) => ({
                          ...p,
                          sgst_rate: e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  </FF>
                </>
              ) : taxMode === "igst" ? (
                <FF label="IGST Rate (%)" cls="sm:col-span-2">
                  <input
                    type="number"
                    min="0"
                    max="28"
                    value={quoteForm.igst_rate}
                    onChange={(e) =>
                      setQuoteForm((p) => ({ ...p, igst_rate: e.target.value }))
                    }
                    className={inputCls}
                  />
                </FF>
              ) : (
                <div className="sm:col-span-2 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-[12px] text-amber-700 font-medium">
                  No tax will be applied — Non-GST quotation.
                </div>
              )}

              <FF label="Notes" cls="sm:col-span-3">
                <input
                  value={quoteForm.notes}
                  onChange={(e) =>
                    setQuoteForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="e.g. Prices valid for 30 days..."
                  className={inputCls}
                />
              </FF>
            </div>

            {/* Line Items */}
            <div className="px-6 py-5 border-b border-[#EDE8DF]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-bold text-[#6B6259] uppercase tracking-widest">
                  Line Items
                </h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C8922A] hover:underline"
                >
                  <Plus size={13} /> Add Item
                </button>
              </div>

              <div className="space-y-2">
                {quoteItems.map((item: any, idx: number) => {
                  const amount =
                    (parseFloat(item.quantity) || 0) *
                    (parseFloat(item.rate) || 0);
                  return (
                    <div
                      key={item._key}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl px-3 py-2"
                    >
                      <div className="sm:col-span-1 flex items-center justify-between sm:flex-col sm:items-center sm:gap-0">
                        <button
                          type="button"
                          onClick={() => moveItem(item._key, -1)}
                          disabled={idx === 0}
                          className="text-[#9A8F82] hover:text-[#C8922A] disabled:opacity-20"
                        >
                          ↑
                        </button>
                        <span className="text-[10px] text-[#9A8F82] font-bold leading-none">
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => moveItem(item._key, 1)}
                          disabled={idx === quoteItems.length - 1}
                          className="text-[#9A8F82] hover:text-[#C8922A] disabled:opacity-20"
                        >
                          ↓
                        </button>
                      </div>

                      <div className="sm:col-span-4">
                        {masterServices.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const svc = masterServices.find(
                                (s) => s.id === e.target.value,
                              );
                              if (!svc) return;

                              const name =
                                svc.name || svc.service_name || svc.title || "";
                              const desc =
                                svc.description ||
                                svc.service_description ||
                                "";

                              // Name + description combined in the item description field
                              updateItem(
                                item._key,
                                "description",
                                desc ? `${name} - ${desc}` : name,
                              );

                              // Bonus: auto-fill category/rate/unit if the master service defines them
                              if (svc.category)
                                updateItem(item._key, "category", svc.category);
                              if (svc.unit)
                                updateItem(item._key, "unit", svc.unit);
                              if (svc.rate ?? svc.default_rate ?? svc.price) {
                                updateItem(
                                  item._key,
                                  "rate",
                                  String(
                                    svc.rate ?? svc.default_rate ?? svc.price,
                                  ),
                                );
                              }
                            }}
                            className={`${inputCls} text-[11px] py-1 mb-1 text-[#9A8F82]`}
                          >
                            <option value="">— Select from Services —</option>
                            {masterServices.map((svc: any) => (
                              <option key={svc.id} value={svc.id}>
                                {svc.name || svc.service_name}
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          required
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item._key, "description", e.target.value)
                          }
                          placeholder="Description"
                          className={`${inputCls} text-[12px] py-1.5`}
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <select
                          value={item.category}
                          onChange={(e) =>
                            updateItem(item._key, "category", e.target.value)
                          }
                          className={`${inputCls} text-[12px] py-1.5`}
                        >
                          {[
                            "Furniture",
                            "Civil",
                            "Electrical",
                            "Flooring",
                            "Plumbing",
                            "HVAC",
                            "Painting",
                            "Package",
                            "Other",
                          ].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-1 min-w-0">
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item._key, "quantity", e.target.value)
                          }
                          className={`${inputCls} text-[12px] py-1.5`}
                        />
                      </div>

                      <div className="sm:col-span-1 min-w-0">
                        <select
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(item._key, "unit", e.target.value)
                          }
                          className={`${inputCls} text-[12px] py-1.5`}
                        >
                          {[
                            "sqft",
                            "rft",
                            "lot",
                            "nos",
                            "unit",
                            "kg",
                            "set",
                          ].map((u) => (
                            <option key={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2 min-w-0">
                        <input
                          type="number"
                          min="0"
                          value={item.rate}
                          onChange={(e) =>
                            updateItem(item._key, "rate", e.target.value)
                          }
                          placeholder="0"
                          className={`${inputCls} text-[12px] py-1.5`}
                        />
                      </div>

                      <div className="sm:col-span-2 min-w-0 flex items-center justify-end gap-1">
                        <span
                          title={`₹${fmt(amount)}`}
                          className="text-[12px] font-bold text-[#1C1C1C] truncate"
                        >
                          ₹{fmt(amount)}
                        </span>
                        {quoteItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item._key)}
                            className="text-red-400 hover:text-red-600 ml-1 shrink-0"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals + Submit */}
            <div className="px-6 py-5 bg-[#FAF8F5] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div className="space-y-1 text-[12px] w-full sm:min-w-[240px] sm:w-auto">
                <div className="flex justify-between text-[#6B6259]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#1C1C1C]">
                    ₹{fmt(totals.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-[#6B6259]">
                  <span>Discount</span>
                  <span className="font-semibold text-red-500">
                    -₹{fmt(totals.discAmt)}
                  </span>
                </div>
                <div className="flex justify-between text-[#6B6259]">
                  <span>Taxable</span>
                  <span className="font-semibold text-[#1C1C1C]">
                    ₹{fmt(totals.taxable)}
                  </span>
                </div>
                {taxMode === "cgst_sgst" ? (
                  <>
                    <div className="flex justify-between text-[#6B6259]">
                      <span>CGST @ {quoteForm.cgst_rate}%</span>
                      <span className="font-semibold">₹{fmt(totals.cgst)}</span>
                    </div>
                    <div className="flex justify-between text-[#6B6259]">
                      <span>SGST @ {quoteForm.sgst_rate}%</span>
                      <span className="font-semibold">₹{fmt(totals.sgst)}</span>
                    </div>
                  </>
                ) : taxMode === "igst" ? (
                  <div className="flex justify-between text-[#6B6259]">
                    <span>IGST @ {quoteForm.igst_rate}%</span>
                    <span className="font-semibold">₹{fmt(totals.igst)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-[#6B6259] text-[11px] italic">
                    <span>No GST applied</span>
                    <span>—</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[15px] pt-2 border-t border-[#C8922A]/30 text-[#C8922A]">
                  <span>Grand Total</span>
                  <span>₹{fmt(totals.total)}</span>
                </div>
              </div>

              <MFooter
                onCancel={closeQuoteModal}
                isSubmitting={quoteSubmitting}
                label={editingQuoteId ? "Update Quotation" : "Save Quotation"}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* INVOICE MODAL */}
      {isInvoiceModalOpen && (
        <Modal
          title="Generate Invoice"
          onClose={closeInvoiceModal}
          maxW="max-w-lg"
        >
          <form
            onSubmit={handleInvoiceSubmit}
            className="p-6 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            {invoiceError && <ErrorBanner error={invoiceError} />}
            <div>
              <label className="text-[11px] font-bold text-[#6B6259] uppercase tracking-wide block mb-2">
                Invoice Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    value: "full",
                    label: "Full (100%)",
                    desc: "Complete invoice for full amount",
                  },
                  {
                    value: "advance",
                    label: "Advance",
                    desc: "Advance payment on booking",
                  },
                  {
                    value: "milestone",
                    label: "Milestone",
                    desc: "Partial milestone payment",
                  },
                  {
                    value: "final",
                    label: "Final",
                    desc: "Final invoice on handover",
                  },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleInvoiceTypeChange(t.value)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      invoiceForm.invoice_type === t.value
                        ? "border-[#C8922A] bg-[#FDF3E3]"
                        : "border-[#EDE8DF] bg-white hover:border-[#C8922A]/40"
                    }`}
                  >
                    <p
                      className={`text-[12px] font-bold ${invoiceForm.invoice_type === t.value ? "text-[#C8922A]" : "text-[#1C1C1C]"}`}
                    >
                      {t.label}
                    </p>
                    <p className="text-[10px] text-[#9A8F82] mt-0.5">
                      {t.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <FF label="Quotation (Approved) *">
              <select
                required
                value={invoiceForm.quotation_id}
                onChange={(e) =>
                  setInvoiceForm((p: any) => ({
                    ...p,
                    quotation_id: e.target.value,
                  }))
                }
                className={inputCls}
              >
                <option value="">— Select Quotation —</option>
                {quotations.map((q: any) => (
                  <option key={q.id} value={q.id}>
                    #{q.quote_number} v{q.version} — {q.project_name} (₹
                    {fmt(q.grand_total)}) [{q.status}]
                  </option>
                ))}
              </select>
              {quotations.filter((q: any) => q.status === "approved").length ===
                0 && (
                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} /> No approved quotations found.
                  Approve a quotation first.
                </p>
              )}
            </FF>

            {invoiceForm.invoice_type !== "full" && (
              <FF
                label={`Milestone Label ${invoiceForm.invoice_type === "milestone" ? "*" : ""}`}
              >
                <input
                  value={invoiceForm.milestone_label}
                  onChange={(e) =>
                    setInvoiceForm((p: any) => ({
                      ...p,
                      milestone_label: e.target.value,
                    }))
                  }
                  placeholder={
                    invoiceForm.invoice_type === "advance"
                      ? "Advance on Booking"
                      : invoiceForm.invoice_type === "final"
                        ? "Final Handover"
                        : "e.g. Design & Layout Approval"
                  }
                  className={inputCls}
                />
              </FF>
            )}

            {invoiceForm.invoice_type !== "full" && (
              <FF label="Milestone Percentage (%)">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={invoiceForm.milestone_percentage}
                  onChange={(e) =>
                    setInvoiceForm((p: any) => ({
                      ...p,
                      milestone_percentage: Number(e.target.value),
                    }))
                  }
                  className={inputCls}
                />
                <p className="text-[11px] text-[#9A8F82] mt-1">
                  This % of quotation grand total will be invoiced.
                </p>
              </FF>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FF label="Invoice Date *">
                <input
                  type="date"
                  required
                  value={invoiceForm.invoice_date}
                  onChange={(e) =>
                    setInvoiceForm((p: any) => ({
                      ...p,
                      invoice_date: e.target.value,
                    }))
                  }
                  className={inputCls}
                />
              </FF>
              <FF label="Due In (Days)">
                <input
                  type="number"
                  min="0"
                  value={invoiceForm.due_days}
                  onChange={(e) =>
                    setInvoiceForm((p: any) => ({
                      ...p,
                      due_days: Number(e.target.value),
                    }))
                  }
                  className={inputCls}
                />
              </FF>
            </div>

            <FF label="Notes">
              <input
                value={invoiceForm.notes}
                onChange={(e) =>
                  setInvoiceForm((p: any) => ({ ...p, notes: e.target.value }))
                }
                placeholder="e.g. Please pay within 15 days."
                className={inputCls}
              />
            </FF>

            <div className="pt-4 border-t border-[#F5F2ED]">
              <MFooter
                onCancel={closeInvoiceModal}
                isSubmitting={invoiceSubmitting}
                label="Generate Invoice"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* ─── COPY QUOTATION MODAL ────────────────────────────────────────────── */}
      {isQuoteCopyModalOpen && copySourceQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EDE8DF] w-full max-w-3xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE8DF] bg-[#FAF8F5] rounded-t-2xl">
              <div>
                <h2 className="text-[15px] font-bold text-[#1C1C1C]">
                  Copy Quotation
                </h2>
                <p className="text-[11px] text-[#9A8F82] mt-0.5">
                  Source:{" "}
                  <span className="font-semibold text-[#C8922A]">
                    {copySourceQuote.quote_number}
                  </span>{" "}
                  → will create{" "}
                  <span className="font-semibold text-[#C8922A]">
                    {copySourceQuote.quote_number}-C1
                  </span>{" "}
                  (or next suffix)
                </p>
              </div>
              <button
                onClick={() => setIsQuoteCopyModalOpen(false)}
                className="text-[#9A8F82] hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Meta fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                    Project
                  </label>
                  <div className="px-3 py-2 bg-[#FAF8F5] border border-[#EDE8DF] rounded-lg text-[13px] text-[#6B6259]">
                    {copySourceQuote.project_name || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={quoteCopyForm.valid_until}
                    onChange={(e) =>
                      setQuoteCopyForm((p) => ({
                        ...p,
                        valid_until: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={quoteCopyForm.notes}
                  onChange={(e) =>
                    setQuoteCopyForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A] resize-none"
                  placeholder="Terms, remarks..."
                />
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">
                    Line Items
                  </label>
                  <button
                    onClick={addQuoteCopyItem}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#C8922A] hover:underline"
                  >
                    <PlusCircle size={13} /> Add Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#EDE8DF]">
                  <table className="w-full min-w-[700px] text-[12px]">
                    <thead className="bg-[#FAF8F5]">
                      <tr>
                        {[
                          "Description",
                          "Category",
                          "Qty",
                          "Unit",
                          "Rate (₹)",
                          "Amount (₹)",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5F2ED]">
                      {quoteCopyForm.items.map((item) => {
                        const amt =
                          (parseFloat(item.quantity) || 0) *
                          (parseFloat(item.rate) || 0);
                        return (
                          <tr key={item._key}>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.description}
                                onChange={(e) =>
                                  updateQuoteCopyItem(
                                    item._key,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                placeholder="e.g. Interior Design"
                                className="w-full min-w-[140px] px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.category}
                                onChange={(e) =>
                                  updateQuoteCopyItem(
                                    item._key,
                                    "category",
                                    e.target.value,
                                  )
                                }
                                placeholder="Furniture"
                                className="w-full min-w-[100px] px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateQuoteCopyItem(
                                    item._key,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className="w-16 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.unit}
                                onChange={(e) =>
                                  updateQuoteCopyItem(
                                    item._key,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                placeholder="sqft"
                                className="w-16 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) =>
                                  updateQuoteCopyItem(
                                    item._key,
                                    "rate",
                                    e.target.value,
                                  )
                                }
                                className="w-24 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-3 py-1.5 font-semibold text-[#1C1C1C] whitespace-nowrap">
                              ₹
                              {amt.toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                onClick={() => removeQuoteCopyItem(item._key)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <MinusCircle size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals preview — Subtotal / Discount / Taxable / CGST / SGST / IGST / Grand Total */}
                <div className="ml-auto w-full sm:w-72 space-y-1.5 pt-4 mt-3 border-t border-[#EDE8DF] text-[13px]">
                  <div className="flex justify-between text-[#6B6259]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#1C1C1C]">
                      ₹{fmt(quoteCopyTotals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#6B6259]">
                    <span>
                      Discount (
                      {quoteCopyTotals.discountType === "percentage"
                        ? `${quoteCopyTotals.discountValue}%`
                        : `₹${fmt(quoteCopyTotals.discountValue)}`}
                      )
                    </span>
                    <span className="font-medium text-[#1C1C1C]">
                      -₹{fmt(quoteCopyTotals.discAmt)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#6B6259]">
                    <span>Taxable Amount</span>
                    <span className="font-medium text-[#1C1C1C]">
                      ₹{fmt(quoteCopyTotals.taxable)}
                    </span>
                  </div>
                  {quoteCopyTotals.cgst > 0 && (
                    <div className="flex justify-between text-[#6B6259]">
                      <span>CGST @ {quoteCopyTotals.cgstRate}%</span>
                      <span className="font-medium text-[#1C1C1C]">
                        ₹{fmt(quoteCopyTotals.cgst)}
                      </span>
                    </div>
                  )}
                  {quoteCopyTotals.sgst > 0 && (
                    <div className="flex justify-between text-[#6B6259]">
                      <span>SGST @ {quoteCopyTotals.sgstRate}%</span>
                      <span className="font-medium text-[#1C1C1C]">
                        ₹{fmt(quoteCopyTotals.sgst)}
                      </span>
                    </div>
                  )}
                  {quoteCopyTotals.igst > 0 && (
                    <div className="flex justify-between text-[#6B6259]">
                      <span>IGST @ {quoteCopyTotals.igstRate}%</span>
                      <span className="font-medium text-[#1C1C1C]">
                        ₹{fmt(quoteCopyTotals.igst)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[15px] pt-2 border-t border-[#EDE8DF] text-[#1C1C1C]">
                    <span>Grand Total</span>
                    <span>₹{fmt(quoteCopyTotals.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#EDE8DF] flex justify-end gap-3 bg-[#FAF8F5] rounded-b-2xl">
              <button
                onClick={() => setIsQuoteCopyModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#EDE8DF] text-[13px] font-semibold text-[#6B6259] hover:bg-[#F5F2ED]"
              >
                Cancel
              </button>
              <button
                onClick={submitQuoteCopy}
                disabled={quoteCopySubmitting}
                className="px-5 py-2 rounded-lg bg-[#C8922A] text-white text-[13px] font-bold hover:bg-[#B07A20] disabled:opacity-60 flex items-center gap-2"
              >
                {quoteCopySubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Copy size={14} />
                )}
                Create Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── COPY INVOICE MODAL ─────────────────────────────────────────────── */}
      {isCopyModalOpen && copySourceInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EDE8DF] w-full max-w-3xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE8DF] bg-[#FAF8F5] rounded-t-2xl">
              <div>
                <h2 className="text-[15px] font-bold text-[#1C1C1C]">
                  Copy Invoice
                </h2>
                <p className="text-[11px] text-[#9A8F82] mt-0.5">
                  Source:{" "}
                  <span className="font-semibold text-[#C8922A]">
                    {copySourceInvoice.invoice_number}
                  </span>{" "}
                  → will create{" "}
                  <span className="font-semibold text-[#C8922A]">
                    {copySourceInvoice.invoice_number}-C1
                  </span>{" "}
                  (or next suffix)
                </p>
              </div>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="text-[#9A8F82] hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Meta fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                    Client
                  </label>
                  <div className="px-3 py-2 bg-[#FAF8F5] border border-[#EDE8DF] rounded-lg text-[13px] text-[#6B6259]">
                    {copySourceInvoice.client_name || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                    Invoice Type
                  </label>
                  <select
                    value={copyForm.invoice_type}
                    onChange={(e) =>
                      setCopyForm((p) => ({
                        ...p,
                        invoice_type: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A] bg-white"
                  >
                    {["full", "advance", "milestone", "final"].map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={copyForm.invoice_date}
                    onChange={(e) =>
                      setCopyForm((p) => ({
                        ...p,
                        invoice_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={copyForm.due_date}
                    onChange={(e) =>
                      setCopyForm((p) => ({ ...p, due_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={copyForm.notes}
                  onChange={(e) =>
                    setCopyForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A] resize-none"
                  placeholder="Payment terms, remarks..."
                />
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">
                    Line Items
                  </label>
                  <button
                    onClick={addCopyItem}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#C8922A] hover:underline"
                  >
                    <PlusCircle size={13} /> Add Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#EDE8DF]">
                  <table className="w-full min-w-[700px] text-[12px]">
                    <thead className="bg-[#FAF8F5]">
                      <tr>
                        {[
                          "Description",
                          "Category",
                          "Qty",
                          "Unit",
                          "Rate (₹)",
                          "Amount (₹)",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5F2ED]">
                      {copyForm.items.map((item) => {
                        const amt =
                          (parseFloat(item.quantity) || 0) *
                          (parseFloat(item.rate) || 0);
                        return (
                          <tr key={item._key}>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.description}
                                onChange={(e) =>
                                  updateCopyItem(
                                    item._key,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                placeholder="e.g. Interior Design"
                                className="w-full min-w-[140px] px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.category}
                                onChange={(e) =>
                                  updateCopyItem(
                                    item._key,
                                    "category",
                                    e.target.value,
                                  )
                                }
                                placeholder="Furniture"
                                className="w-full min-w-[100px] px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateCopyItem(
                                    item._key,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className="w-16 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.unit}
                                onChange={(e) =>
                                  updateCopyItem(
                                    item._key,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                placeholder="sqft"
                                className="w-16 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) =>
                                  updateCopyItem(
                                    item._key,
                                    "rate",
                                    e.target.value,
                                  )
                                }
                                className="w-24 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-3 py-1.5 font-semibold text-[#1C1C1C] whitespace-nowrap">
                              ₹
                              {amt.toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                onClick={() => removeCopyItem(item._key)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <MinusCircle size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals preview — Subtotal / Discount / Taxable / CGST / SGST / IGST / Grand Total */}
                <div className="ml-auto w-full sm:w-72 space-y-1.5 pt-4 mt-3 border-t border-[#EDE8DF] text-[13px]">
                  <div className="flex justify-between text-[#6B6259]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#1C1C1C]">
                      ₹{fmt(copyInvoiceTotals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#6B6259]">
                    <span>Discount (0%)</span>
                    <span className="font-medium text-[#1C1C1C]">
                      -₹{fmt(copyInvoiceTotals.discAmt)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#6B6259]">
                    <span>Taxable Amount</span>
                    <span className="font-medium text-[#1C1C1C]">
                      ₹{fmt(copyInvoiceTotals.taxable)}
                    </span>
                  </div>
                  {copyInvoiceTotals.cgst > 0 && (
                    <div className="flex justify-between text-[#6B6259]">
                      <span>CGST @ {copyInvoiceTotals.cgstRate}%</span>
                      <span className="font-medium text-[#1C1C1C]">
                        ₹{fmt(copyInvoiceTotals.cgst)}
                      </span>
                    </div>
                  )}
                  {copyInvoiceTotals.sgst > 0 && (
                    <div className="flex justify-between text-[#6B6259]">
                      <span>SGST @ {copyInvoiceTotals.sgstRate}%</span>
                      <span className="font-medium text-[#1C1C1C]">
                        ₹{fmt(copyInvoiceTotals.sgst)}
                      </span>
                    </div>
                  )}
                  {copyInvoiceTotals.igst > 0 && (
                    <div className="flex justify-between text-[#6B6259]">
                      <span>IGST @ {copyInvoiceTotals.igstRate}%</span>
                      <span className="font-medium text-[#1C1C1C]">
                        ₹{fmt(copyInvoiceTotals.igst)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[15px] pt-2 border-t border-[#EDE8DF] text-[#1C1C1C]">
                    <span>Grand Total</span>
                    <span>₹{fmt(copyInvoiceTotals.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#EDE8DF] flex justify-end gap-3 bg-[#FAF8F5] rounded-b-2xl">
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#EDE8DF] text-[13px] font-semibold text-[#6B6259] hover:bg-[#F5F2ED]"
              >
                Cancel
              </button>
              <button
                onClick={submitCopyInvoice}
                disabled={copySubmitting}
                className="px-5 py-2 rounded-lg bg-[#C8922A] text-white text-[13px] font-bold hover:bg-[#b07d24] disabled:opacity-60 flex items-center gap-2"
              >
                {copySubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Copy size={14} />
                )}
                {copySubmitting ? "Creating..." : "Create Copy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── INVOICE EDIT MODAL (Full) ──────────────────────────────────────── */}
      {isInvoiceEditOpen && viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EDE8DF] w-full max-w-3xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE8DF] bg-[#FAF8F5] rounded-t-2xl">
              <div>
                <h2 className="text-[15px] font-bold text-[#1C1C1C]">
                  Edit Invoice
                </h2>
                <p className="text-[11px] text-[#9A8F82] mt-0.5">
                  <span className="font-semibold text-[#C8922A]">
                    {viewingInvoice.invoice_number}
                  </span>
                  {" — "}
                  {viewingInvoice.project_name}
                </p>
              </div>
              <button
                onClick={() => setIsInvoiceEditOpen(false)}
                className="text-[#9A8F82] hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <form
              onSubmit={submitInvoiceEdit}
              className="overflow-y-auto flex-1 p-6 space-y-5"
            >
              {/* Meta fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                    Client
                  </label>
                  <div className="px-3 py-2 bg-[#FAF8F5] border border-[#EDE8DF] rounded-lg text-[13px] text-[#6B6259]">
                    {viewingInvoice.client_name || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                    Invoice Type
                  </label>
                  <select
                    value={invoiceEditForm.invoice_type}
                    onChange={(e) =>
                      setInvoiceEditForm((p) => ({
                        ...p,
                        invoice_type: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A] bg-white"
                  >
                    {["full", "advance", "milestone", "final"].map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceEditForm.invoice_date}
                    onChange={(e) =>
                      setInvoiceEditForm((p) => ({
                        ...p,
                        invoice_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={invoiceEditForm.due_date}
                    onChange={(e) =>
                      setInvoiceEditForm((p) => ({
                        ...p,
                        due_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={invoiceEditForm.notes}
                  onChange={(e) =>
                    setInvoiceEditForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-[#EDE8DF] rounded-lg text-[13px] focus:outline-none focus:border-[#C8922A] resize-none"
                  placeholder="Payment terms, remarks..."
                />
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">
                    Line Items
                  </label>
                  <button
                    type="button"
                    onClick={addEditItem}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#C8922A] hover:underline"
                  >
                    <PlusCircle size={13} /> Add Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#EDE8DF]">
                  <table className="w-full min-w-[700px] text-[12px]">
                    <thead className="bg-[#FAF8F5]">
                      <tr>
                        {[
                          "Description",
                          "Category",
                          "Qty",
                          "Unit",
                          "Rate (₹)",
                          "Amount (₹)",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-[10px] font-bold text-[#9A8F82] uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5F2ED]">
                      {invoiceEditForm.items.map((item) => {
                        const amt =
                          (parseFloat(item.quantity) || 0) *
                          (parseFloat(item.rate) || 0);
                        return (
                          <tr key={item._key}>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.description}
                                onChange={(e) =>
                                  updateEditItem(
                                    item._key,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                placeholder="e.g. Interior Design"
                                className="w-full min-w-[140px] px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.category}
                                onChange={(e) =>
                                  updateEditItem(
                                    item._key,
                                    "category",
                                    e.target.value,
                                  )
                                }
                                placeholder="Furniture"
                                className="w-full min-w-[100px] px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateEditItem(
                                    item._key,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className="w-16 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={item.unit}
                                onChange={(e) =>
                                  updateEditItem(
                                    item._key,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                placeholder="sqft"
                                className="w-16 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) =>
                                  updateEditItem(
                                    item._key,
                                    "rate",
                                    e.target.value,
                                  )
                                }
                                className="w-24 px-2 py-1 border border-[#EDE8DF] rounded-md text-[12px] focus:outline-none focus:border-[#C8922A]"
                              />
                            </td>
                            <td className="px-3 py-1.5 font-semibold text-[#1C1C1C] whitespace-nowrap">
                              ₹
                              {amt.toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                type="button"
                                onClick={() => removeEditItem(item._key)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <MinusCircle size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Grand total preview */}
                <div className="flex justify-end mt-3 pr-2">
                  <div className="text-[13px] font-bold text-[#1C1C1C]">
                    Subtotal: ₹
                    {invoiceEditForm.items
                      .reduce(
                        (s, it) =>
                          s +
                          (parseFloat(it.quantity) || 0) *
                            (parseFloat(it.rate) || 0),
                        0,
                      )
                      .toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    <span className="text-[11px] font-normal text-[#9A8F82] ml-2">
                      (tax recalculated on save)
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer inside form */}
              <div className="pt-4 border-t border-[#EDE8DF] flex justify-end gap-3 bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setIsInvoiceEditOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#EDE8DF] text-[13px] font-semibold text-[#6B6259] hover:bg-[#F5F2ED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invoiceEditSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#C8922A] text-white text-[13px] font-bold hover:bg-[#b07d24] disabled:opacity-60 flex items-center gap-2"
                >
                  {invoiceEditSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Edit2 size={14} />
                  )}
                  {invoiceEditSubmitting ? "Saving..." : "Update Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* Assigned Services Section                                                    */
/* ───────────────────────────────────────────────────────────────────────────── */

function AssignedServicesSection({ clientId }: { clientId: string }) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/services/client/${clientId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(`Failed to load services: ${res.status}`);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : (data.results ?? []));
    } catch (e: any) {
      setError(e.message || "Failed to load assigned services");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return (
    <div className="mt-8">
      <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#EDE8DF] flex items-center gap-2">
          <Layers size={14} className="text-[#C8922A]" />
          <h3 className="text-[12px] font-bold text-[#6B6259] uppercase tracking-widest">
            Assigned Services
          </h3>
          <span className="ml-auto text-[11px] bg-[#FDF3E3] text-[#C8922A] font-bold px-2 py-0.5 rounded-full">
            {services.length}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-[#C8922A]" size={22} />
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-500 text-[13px] mb-3">{error}</p>
            <button
              onClick={fetchServices}
              className="text-[12px] font-semibold text-[#C8922A] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : services.length === 0 ? (
          <div className="p-10 text-center text-[#9A8F82] text-[13px]">
            No services assigned to this client yet.
          </div>
        ) : (
          <div className="divide-y divide-[#F5F2ED]">
            {services.map((svc: any) => (
              <div
                key={svc.id || svc._id}
                className="px-6 py-4 flex items-center gap-4 hover:bg-[#FAF8F5] transition-colors"
              >
                <div className="w-10 h-10 bg-[#FDF3E3] rounded-xl flex items-center justify-center text-[#C8922A]">
                  <Layers size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#1C1C1C] truncate">
                    {svc.service_name || svc.name || "Unnamed Service"}
                  </p>
                  {(svc.service_description || svc.description) && (
                    <p className="text-[11px] text-[#9A8F82] truncate max-w-sm">
                      {(svc.service_description || svc.description)?.substring(
                        0,
                        80,
                      )}
                    </p>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    (svc.service_status || svc.status) === "active"
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {svc.service_status || svc.status || "active"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* Shared helpers                                                               */
/* ───────────────────────────────────────────────────────────────────────────── */

function formatHistVal(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number")
    return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime()))
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
  }
  return String(v);
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// One field-level change. "Line Items" renders a row-by-row before/after diff;
// everything else renders as a compact "old → new" chip (red/green).
function QuoteChangeRow({
  change,
}: {
  change: { field: string; old_value: any; new_value: any };
}) {
  if (change.field === "Line Items") {
    const oldItems: any[] = Array.isArray(change.old_value)
      ? change.old_value
      : [];
    const newItems: any[] = Array.isArray(change.new_value)
      ? change.new_value
      : [];
    const maxLen = Math.max(oldItems.length, newItems.length);
    const rows: React.ReactNode[] = [];
    for (let i = 0; i < maxLen; i++) {
      const o = oldItems[i],
        n = newItems[i];
      const same =
        o &&
        n &&
        o.description === n.description &&
        o.quantity === n.quantity &&
        o.rate === n.rate;
      if (same) continue;
      rows.push(
        <div key={i} className="space-y-1">
          {o && (
            <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] text-red-700 line-through truncate pr-2">
                {o.description || "(blank)"}
              </span>
              <span className="text-[11px] text-red-700 font-semibold whitespace-nowrap">
                {o.quantity} × ₹{formatHistVal(o.rate)}
              </span>
            </div>
          )}
          {n && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] text-emerald-700 truncate pr-2">
                {n.description || "(blank)"}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold whitespace-nowrap">
                {n.quantity} × ₹{formatHistVal(n.rate)}
              </span>
            </div>
          )}
        </div>,
      );
    }
    if (rows.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-[#9A8F82] uppercase tracking-wide">
          Line Items
        </p>
        {rows}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span className="text-[#6B6259] flex-shrink-0">{change.field}</span>
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 line-through truncate max-w-[90px]">
          {formatHistVal(change.old_value)}
        </span>
        <ArrowRight size={11} className="text-[#9A8F82] flex-shrink-0" />
        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold truncate max-w-[90px]">
          {formatHistVal(change.new_value)}
        </span>
      </span>
    </div>
  );
}

// Right-side compare panel for the quotation modal: chronological edit list with diff highlighting.
function QuoteHistoryPanel({
  entries,
  loading,
}: {
  entries: QuotationHistoryEntry[];
  loading: boolean;
}) {
  return (
    <div className="w-80 max-h-[88vh] bg-[#FCFBF9] rounded-2xl shadow-2xl border border-[#EDE8DF] flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-[#EDE8DF] flex items-center gap-2 bg-[#FAF8F5] flex-shrink-0">
        <History size={16} className="text-[#C8922A]" />
        <div>
          <h3 className="text-[13px] font-bold text-[#1C1C1C]">Edit History</h3>
          <p className="text-[11px] text-[#9A8F82]">
            Compare against earlier saves
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-[#9A8F82]">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-[12px] text-[#9A8F82] text-center py-10">
            No edits yet — changes will appear here once you update this
            quotation.
          </p>
        ) : (
          entries.map((entry, idx) => {
            const revisionNo = entries.length - idx; // entries are newest-first; oldest edit = R1
            return (
              <div
                key={entry.id}
                className="p-3.5 bg-white rounded-xl border border-[#EDE8DF] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#1C1C1C]">
                    R{revisionNo}
                    {idx === 0 ? " · Latest" : ""}
                  </span>
                  <span className="text-[10px] text-[#9A8F82]">
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
                <div className="space-y-2">
                  {entry.changes.map((c, i) => (
                    <QuoteChangeRow key={i} change={c} />
                  ))}
                </div>
                {entry.changed_by_name && (
                  <p className="text-[10px] text-[#9A8F82] pt-1 border-t border-[#EDE8DF]">
                    by {entry.changed_by_name}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  maxW = "max-w-2xl",
  side,
  headerExtra,
}: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center gap-4 bg-black/40 backdrop-blur-sm p-4">
      <div
        className={`bg-white rounded-2xl w-full ${maxW} shadow-2xl overflow-hidden`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE8DF] bg-[#FAF8F5]">
          <h2 className="text-[15px] font-bold text-[#1C1C1C]">{title}</h2>
          <div className="flex items-center gap-1">
            {headerExtra}
            <button
              onClick={onClose}
              className="text-[#9A8F82] hover:text-red-500 transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {children}
      </div>
      {side}
    </div>
  );
}

function FF({ label, children, cls = "" }: any) {
  return (
    <div className={`space-y-1.5 ${cls}`}>
      <label className="text-[11px] font-bold text-[#6B6259] uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBanner({ error, cls = "" }: any) {
  return (
    <div
      className={`bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-2 text-red-600 text-[13px] ${cls}`}
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>
        {typeof error === "string"
          ? error
          : error?.error ||
            error?.detail ||
            error?.message ||
            JSON.stringify(error)}
      </span>
    </div>
  );
}

function MFooter({ onCancel, isSubmitting, label }: any) {
  return (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-[13px] font-semibold text-[#6B6259] hover:text-[#1C1C1C] transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-6 py-2 bg-[#C8922A] text-white text-[13px] font-semibold rounded-lg shadow-md disabled:opacity-50 flex items-center gap-2 hover:bg-[#B07A20] transition-colors"
      >
        {isSubmitting && <Loader2 size={13} className="animate-spin" />}
        {isSubmitting ? "Processing..." : label}
      </button>
    </div>
  );
}