"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, Trash2, Loader2, Edit3, X,
  Mail, CheckCircle, Search,
  UserPlus, FolderPlus, Library,
  Save, Package, Copy, ChevronDown, Download,
  Image as ImgIcon,
} from "lucide-react";
import { getGstEnabledLocal } from "@/lib/gstToggle";
import API_BASE_URL from "@/lib/config";
import { downloadQuotationPdf, sendQuotationEmail, copyQuotation } from "@/services/quotationService";

const API_BASE = API_BASE_URL;

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
function handleUnauth(s: number) {
  if (s === 401 && typeof window !== "undefined") window.location.href = "/login";
}
function getServiceImageUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  if (fileUrl.startsWith("http")) return fileUrl;
  const origin = API_BASE.replace(/\/api\/v1\/?$/, "");
  return `${origin}/${fileUrl.replace(/^\//, "")}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MasterService {
  id: string; name: string; description: string; status: string;
  media: Array<{ file_url: string; file_type: string; original_filename: string }>;
}
interface Client {
  id: string; full_name: string; email: string; phone: string;
  billing_address: string; gstin: string; projects: Project[];
}
interface Project { id: string; name: string; property_type: string; status: string; }
interface LineLibraryItem { id: string; category: string; name: string; description: string; default_rate: string; unit: string; }
interface QuotationItem {
  id?: string; service?: string; service_image_url?: string;
  description: string; category: string; quantity: string; unit: string; rate: string; sort_order: number;
}
interface Quotation {
  id: string; quote_number: string; version: number; project: string | null;
  project_name: string; client_name: string; status: string; grand_total: string;
  subtotal: string; discount_type: string; discount_value: string; discount_amount: string;
  taxable_amount: string; cgst_rate: string; sgst_rate: string; igst_rate: string;
  cgst_amount: string; sgst_amount: string; igst_amount: string; total_tax: string;
  valid_until: string; notes: string; items: QuotationItem[]; created_at: string;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: "Approved", color: "#10B981", bg: "#ECFDF5" },
  sent:     { label: "Sent",     color: "#3B82F6", bg: "#EFF6FF" },
  draft:    { label: "Draft",    color: "#6B7280", bg: "#F3F4F6" },
  rejected: { label: "Rejected", color: "#EF4444", bg: "#FEF2F2" },
  superseded:{ label: "Superseded", color: "#9CA3AF", bg: "#F9FAFB" },
};
const EMPTY_ITEM: QuotationItem = {
  service: "", service_image_url: "", description: "", category: "", quantity: "1", unit: "lot", rate: "", sort_order: 0
};
const UNITS = ["lot", "sqft", "rft", "nos", "kg", "piece", "set", "day", "hr", "month"];

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success"|"error"|"info"; onClose: ()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "success" ? "#10B981" : type === "error" ? "#EF4444" : "#C8922A";
  return (
    <div className="fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-semibold"
      style={{ backgroundColor: bg }}>
      {message}<button onClick={onClose}><X size={14}/></button>
    </div>
  );
}

// ─── Service Picker (custom dropdown with images) ─────────────────────────────
function ServicePicker({ services, value, onChange }: {
  services: MasterService[];
  value: string;
  onChange: (svc: MasterService | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = services.find(s => s.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(q.toLowerCase()) ||
    s.description.toLowerCase().includes(q.toLowerCase())
  );

  const imgUrl = selected?.media?.[0]?.file_type === "image"
    ? getServiceImageUrl(selected.media[0].file_url)
    : null;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 border border-[#EDE8DF] rounded-lg px-2 py-1.5 text-[12px] bg-white hover:border-[#C8922A] transition-colors text-left"
      >
        {imgUrl && (
          <img src={imgUrl} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0"/>
        )}
        {!imgUrl && <Package size={13} className="text-[#9A8F82] flex-shrink-0"/>}
        <span className={`flex-1 truncate ${selected ? "text-[#1C1C1C]" : "text-[#9A8F82]"}`}>
          {selected ? selected.name : "— Select Service —"}
        </span>
        <ChevronDown size={12} className="text-[#9A8F82] flex-shrink-0"/>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-[200] mt-1 w-72 bg-white border border-[#EDE8DF] rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-[#EDE8DF]">
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search services…"
              className="w-full px-3 py-1.5 text-[12px] border border-[#EDE8DF] rounded-lg outline-none focus:border-[#C8922A]"
            />
          </div>
          {/* Clear option */}
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); setQ(""); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#9A8F82] hover:bg-[#FAF8F5]"
          >
            <X size={12}/> Clear / Manual entry
          </button>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-[#9A8F82] text-center">No services found</p>
            ) : filtered.map(svc => {
              const svcImg = svc.media?.find(m => m.file_type === "image");
              const url = svcImg ? getServiceImageUrl(svcImg.file_url) : null;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => { onChange(svc); setOpen(false); setQ(""); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#FAF8F5] transition-colors ${value === svc.id ? "bg-[#FDF3E3]" : ""}`}
                >
                  {url ? (
                    <img src={url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0"/>
                  ) : (
                    <div className="w-8 h-8 rounded bg-[#F5F2ED] flex items-center justify-center flex-shrink-0">
                      <Package size={14} className="text-[#9A8F82]"/>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#1C1C1C] truncate">{svc.name}</p>
                    <p className="text-[10px] text-[#9A8F82] truncate line-clamp-1">{svc.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Add Client ─────────────────────────────────────────────────────────
function QuickAddClientModal({ onClose, onCreated }: { onClose: ()=>void; onCreated: (c: Client)=>void }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", billing_address: "", gstin: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const res = await fetch(`${API_BASE}/clients/`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(form) });
      handleUnauth(res.status);
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || JSON.stringify(d)); }
      onCreated(await res.json());
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  const fields = [
    { k: "full_name", l: "Full Name *", req: true },
    { k: "phone", l: "Phone *", req: true },
    { k: "email", l: "Email", req: false },
    { k: "billing_address", l: "Address *", req: true },
    { k: "gstin", l: "GSTIN", req: false },
  ];

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#EDE8DF] flex justify-between items-center">
          <div className="flex items-center gap-2"><UserPlus size={16} className="text-[#C8922A]"/><h3 className="font-bold">Add Client</h3></div>
          <button onClick={onClose}><X size={18} className="text-[#9A8F82]"/></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {err && <p className="text-[12px] text-red-500 bg-red-50 p-2 rounded-lg">{err}</p>}
          {fields.map(f => (
            <div key={f.k}>
              <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">{f.l}</label>
              <input required={f.req} value={(form as any)[f.k]} onChange={e => setForm({...form, [f.k]: e.target.value})}
                className="w-full border border-[#EDE8DF] rounded-lg p-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]"/>
            </div>
          ))}
          <button type="submit" disabled={saving}
            className="w-full bg-[#C8922A] hover:bg-[#B07A20] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-[13px]">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} Save Client
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Quick Add Project ────────────────────────────────────────────────────────
function QuickAddProjectModal({ clientId, clientName, onClose, onCreated }: {
  clientId: string; clientName: string; onClose: ()=>void; onCreated: (p: Project)=>void;
}) {
  const [form, setForm] = useState({ name: "", property_type: "apartment", status: "active", notes: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const res = await fetch(`${API_BASE}/clients/${clientId}/projects/`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ ...form, client: clientId })
      });
      handleUnauth(res.status);
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || JSON.stringify(d)); }
      onCreated(await res.json());
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#EDE8DF] flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2"><FolderPlus size={16} className="text-[#C8922A]"/><h3 className="font-bold">Add Project</h3></div>
            <p className="text-[11px] text-[#9A8F82]">Client: {clientName}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-[#9A8F82]"/></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3">
          {err && <p className="text-[12px] text-red-500 bg-red-50 p-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">Project Name *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full border border-[#EDE8DF] rounded-lg p-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]"/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">Property Type</label>
            <select value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})}
              className="w-full border border-[#EDE8DF] rounded-lg p-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]">
              {["apartment","villa","office","commercial","residential"].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#9A8F82] uppercase mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              className="w-full border border-[#EDE8DF] rounded-lg p-2.5 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5] resize-none"/>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-[#C8922A] hover:bg-[#B07A20] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-[13px]">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} Save Project
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Line Item Library Picker ─────────────────────────────────────────────────
function LibraryPicker({ items, onSelect, onClose }: {
  items: LineLibraryItem[]; onSelect: (i: LineLibraryItem)=>void; onClose: ()=>void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const cats = ["All", ...Array.from(new Set(items.map(i => i.category))).sort()];
  const filtered = items.filter(i =>
    (cat === "All" || i.category === cat) &&
    (i.name.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#EDE8DF] flex justify-between items-center">
          <div className="flex items-center gap-2"><Library size={16} className="text-[#C8922A]"/><h3 className="font-bold">Item Library</h3></div>
          <button onClick={onClose}><X size={18} className="text-[#9A8F82]"/></button>
        </div>
        <div className="p-3 border-b border-[#EDE8DF] space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]"/>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search items…"
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-[#EDE8DF] rounded-lg outline-none focus:border-[#C8922A]"/>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {cats.map(c => (
              <button key={c} type="button" onClick={() => setCat(c)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${cat === c ? "bg-[#C8922A] text-white" : "bg-[#F5F2ED] text-[#6B6259]"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto divide-y divide-[#F5F2ED]">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[#9A8F82]">No items found</p>
          ) : filtered.map(item => (
            <button key={item.id} type="button" onClick={() => onSelect(item)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#FAF8F5] text-left">
              <div>
                <p className="text-[13px] font-semibold text-[#1C1C1C]">{item.name}</p>
                <p className="text-[11px] text-[#9A8F82]">{item.category} · {item.unit}</p>
              </div>
              <p className="text-[13px] font-bold text-[#C8922A]">₹{parseFloat(item.default_rate).toLocaleString("en-IN")}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<MasterService[]>([]);
  const [lineLibrary, setLineLibrary] = useState<LineLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState<{ message: string; type: "success"|"error"|"info" } | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [libraryTargetIdx, setLibraryTargetIdx] = useState<number | null>(null);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([{ ...EMPTY_ITEM }]);
  const [formMeta, setFormMeta] = useState({
    valid_until: "", discount_type: "fixed", discount_value: "0",
    cgst_rate: "9", sgst_rate: "9", igst_rate: "0", notes: "", taxMode: "cgst_sgst",
  });
  const [gstEnabled, setGstEnabled] = useState(true);

  useEffect(() => {
    setGstEnabled(getGstEnabledLocal(true));
    const h = () => setGstEnabled(getGstEnabledLocal(true));
    window.addEventListener("gst_enabled_changed", h);
    return () => window.removeEventListener("gst_enabled_changed", h);
  }, []);

  const showToast = (msg: string, type: "success"|"error"|"info") => setToast({ message: msg, type });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchQuotations(), fetchClients(), fetchServices(), fetchLineLibrary()]);
    setLoading(false);
  }

  async function fetchQuotations() {
    try {
      const res = await fetch(`${API_BASE}/quotations/`, { headers: getAuthHeaders() });
      handleUnauth(res.status);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setQuotations(d.results ?? d ?? []);
    } catch { showToast("Failed to load quotations", "error"); }
  }
  async function fetchClients() {
    try {
      const res = await fetch(`${API_BASE}/clients/`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const d = await res.json();
      setClients(d.results ?? d ?? []);
    } catch {}
  }
  async function fetchServices() {
    try {
      const res = await fetch(`${API_BASE}/services/?status=active`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const d = await res.json();
      setServices(d.results ?? d ?? []);
    } catch {}
  }
  async function fetchLineLibrary() {
    try {
      const res = await fetch(`${API_BASE}/line-items/`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const d = await res.json();
      setLineLibrary(d.results ?? d ?? []);
    } catch {}
  }

  // ── Client change ────────────────────────────────────────────────────────
  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId);
    setSelectedProjectId("");
    setSelectedClient(clients.find(c => c.id === clientId) || null);
  }

  function handleClientCreated(client: Client) {
    const c = { ...client, projects: [] };
    setClients(prev => [...prev, c]);
    setSelectedClientId(client.id);
    setSelectedClient(c);
    setSelectedProjectId("");
    setShowAddClient(false);
    showToast(`Client "${client.full_name}" added!`, "success");
  }
  function handleProjectCreated(project: Project) {
    setClients(prev => prev.map(c => c.id === selectedClientId ? { ...c, projects: [...(c.projects||[]), project] } : c));
    setSelectedClient(prev => prev ? { ...prev, projects: [...(prev.projects||[]), project] } : prev);
    setSelectedProjectId(project.id);
    setShowAddProject(false);
    showToast(`Project "${project.name}" added!`, "success");
  }

  // ── Service select on a line item ─────────────────────────────────────────
  function handleServiceSelect(idx: number, svc: MasterService | null) {
    setItems(prev => {
      const n = [...prev];
      if (!svc) {
        n[idx] = { ...n[idx], service: "", service_image_url: "" };
      } else {
        const firstImg = svc.media?.find(m => m.file_type === "image");
        n[idx] = {
          ...n[idx],
          service: svc.id,
          service_image_url: firstImg?.file_url || "",
          description: svc.name,
          category: "",
        };
      }
      return n;
    });
  }

  // ── Library select ───────────────────────────────────────────────────────
  function handleLibrarySelect(lib: LineLibraryItem) {
    if (libraryTargetIdx !== null) {
      setItems(prev => {
        const n = [...prev];
        n[libraryTargetIdx] = {
          ...n[libraryTargetIdx],
          description: lib.name + (lib.description ? ` — ${lib.description}` : ""),
          category: lib.category,
          unit: lib.unit,
          rate: lib.default_rate,
        };
        return n;
      });
    } else {
      setItems(prev => [...prev, {
        ...EMPTY_ITEM,
        description: lib.name + (lib.description ? ` — ${lib.description}` : ""),
        category: lib.category, unit: lib.unit, rate: lib.default_rate,
        sort_order: prev.length,
      }]);
    }
    setLibraryTargetIdx(null);
    setShowLibrary(false);
    showToast(`"${lib.name}" added!`, "success");
  }

  // ── Item helpers ─────────────────────────────────────────────────────────
  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM, sort_order: prev.length }]); }
  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof QuotationItem, value: string) {
    setItems(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
  }
  function itemAmt(item: QuotationItem) {
    const q = parseFloat(item.quantity || "0"), r = parseFloat(item.rate || "0");
    return isNaN(q) || isNaN(r) ? 0 : q * r;
  }

  // ── Live totals ──────────────────────────────────────────────────────────
  const totals = (() => {
    const subtotal = items.reduce((s, it) => s + itemAmt(it), 0);
    const dv = parseFloat(formMeta.discount_value || "0") || 0;
    const discAmt = formMeta.discount_type === "percentage" ? subtotal * dv / 100 : dv;
    const taxable = subtotal - discAmt;
    const useIgst = gstEnabled && formMeta.taxMode === "igst";
    const noGst   = !gstEnabled || formMeta.taxMode === "non_gst";
    const cgst = noGst || useIgst ? 0 : (taxable * parseFloat(formMeta.cgst_rate || "0")) / 100;
    const sgst = noGst || useIgst ? 0 : (taxable * parseFloat(formMeta.sgst_rate || "0")) / 100;
    const igst = noGst || !useIgst ? 0 : (taxable * parseFloat(formMeta.igst_rate || "0")) / 100;
    return { subtotal, discAmt, taxable, cgst, sgst, igst, totalTax: cgst+sgst+igst, grand: taxable+cgst+sgst+igst };
  })();
  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Open create ──────────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setSelectedClientId(""); setSelectedClient(null); setSelectedProjectId("");
    setItems([{ ...EMPTY_ITEM }]);
    setFormMeta({ valid_until: "", discount_type: "fixed", discount_value: "0", cgst_rate: "9", sgst_rate: "9", igst_rate: "18", notes: "", taxMode: "cgst_sgst" });
    setIsModalOpen(true);
  }

  // ── Open edit ────────────────────────────────────────────────────────────
  async function openEdit(id: string) {
    try {
      const res = await fetch(`${API_BASE}/quotations/${id}/`, { headers: getAuthHeaders() });
      handleUnauth(res.status);
      const q: Quotation = await res.json();

      // Find client from project
      let matchedClientId = "";
      let matchedClient: Client | null = null;
      const allClients = clients.length > 0 ? clients : await (async () => {
        const r = await fetch(`${API_BASE}/clients/`, { headers: getAuthHeaders() });
        const d = await r.json(); const list = d.results ?? d ?? [];
        setClients(list); return list;
      })();
      for (const c of allClients) {
        if ((c.projects || []).some((p: Project) => p.id === q.project)) {
          matchedClient = c; matchedClientId = c.id; break;
        }
      }

      setEditingId(id);
      setSelectedClientId(matchedClientId);
      setSelectedClient(matchedClient);
      setSelectedProjectId(q.project || "");

      const cgstR = parseFloat(q.cgst_rate || "9");
      const sgstR = parseFloat(q.sgst_rate || "9");
      const igstR = parseFloat(q.igst_rate || "0");
      const taxMode = igstR > 0 ? "igst" : cgstR > 0 || sgstR > 0 ? "cgst_sgst" : "non_gst";

      setFormMeta({
        valid_until: q.valid_until ? q.valid_until.split("T")[0] : "",
        discount_type: q.discount_type || "fixed",
        discount_value: String(q.discount_value || "0"),
        cgst_rate: String(cgstR), sgst_rate: String(sgstR), igst_rate: String(igstR || 18),
        notes: q.notes || "",
        taxMode,
      });
      setItems(q.items?.length ? q.items.map(it => ({
        id: it.id, service: it.service || "", service_image_url: it.service_image_url || "",
        description: it.description, category: it.category || "",
        quantity: String(it.quantity), unit: it.unit || "lot", rate: String(it.rate), sort_order: it.sort_order || 0,
      })) : [{ ...EMPTY_ITEM }]);
      setIsModalOpen(true);
    } catch { showToast("Failed to load quotation", "error"); }
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!items[0]?.description && !items[0]?.service) { showToast("Add at least one line item", "error"); return; }
    setSubmitting(true);
    try {
      const noGst   = !gstEnabled || formMeta.taxMode === "non_gst";
      const useIgst = gstEnabled && formMeta.taxMode === "igst";
      const payload = {
        project: selectedProjectId || null,
        valid_until: formMeta.valid_until || null,
        discount_type: formMeta.discount_type,
        discount_value: parseFloat(formMeta.discount_value) || 0,
        cgst_rate:  noGst || useIgst ? 0 : parseFloat(formMeta.cgst_rate) || 0,
        sgst_rate:  noGst || useIgst ? 0 : parseFloat(formMeta.sgst_rate) || 0,
        igst_rate:  noGst || !useIgst ? 0 : parseFloat(formMeta.igst_rate) || 0,
        notes: formMeta.notes,
        items: items.filter(it => it.description.trim() || it.service).map((it, idx) => ({
          ...(it.id ? { id: it.id } : {}),
          service: it.service || null,
          service_image_url: it.service_image_url || null,
          description: it.description, category: it.category,
          quantity: parseFloat(it.quantity) || 1,
          unit: it.unit, rate: parseFloat(it.rate) || 0, sort_order: idx,
        })),
      };
      const url = editingId ? `${API_BASE}/quotations/${editingId}/` : `${API_BASE}/quotations/`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
      handleUnauth(res.status);
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || d.detail || JSON.stringify(d)); }
      showToast(editingId ? "Quotation updated!" : "Quotation created!", "success");
      setIsModalOpen(false);
      fetchQuotations();
    } catch (err: any) { showToast("Error: " + err.message, "error"); }
    finally { setSubmitting(false); }
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Delete this quotation?")) return;
    try {
      const res = await fetch(`${API_BASE}/quotations/${id}/`, { method: "DELETE", headers: getAuthHeaders() });
      handleUnauth(res.status);
      if (!res.ok) throw new Error();
      showToast("Deleted", "success");
      fetchQuotations();
    } catch { showToast("Delete failed", "error"); }
  }
  async function handleApprove(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/quotations/${id}/approve/`, { method: "POST", headers: getAuthHeaders() });
      handleUnauth(res.status);
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Approval failed"); }
      showToast("Approved!", "success");
      fetchQuotations();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setActionId(null); }
  }
  async function handlePDF(id: string, quoteNumber: string) {
    setActionId(id);
    try {
      const blob = await downloadQuotationPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${quoteNumber}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("PDF downloaded!", "success");
    } catch (e: any) { showToast("PDF failed: " + e.message, "error"); }
    finally { setActionId(null); }
  }
  async function handleEmail(id: string) {
    setActionId(id);
    try {
      await sendQuotationEmail(id);
      showToast("Email sent!", "success");
    } catch { showToast("Email failed", "error"); }
    finally { setActionId(null); }
  }

  async function handleSend(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`${API_BASE}/quotations/${id}/send/`, { method: "POST", headers: getAuthHeaders() });
      handleUnauth(res.status);
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed"); }
      showToast("Marked as Sent!", "success");
      fetchQuotations();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setActionId(null); }
  }

  async function handleCopy(q: Quotation) {
    setActionId(q.id);
    try {
      const copied = await copyQuotation(q.id, {});
      showToast(`Copied as ${copied.quote_number}!`, "success");
      fetchQuotations();
    } catch (e: any) { showToast("Copy failed: " + e.message, "error"); }
    finally { setActionId(null); }
  }

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = quotations.filter(q => {
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    const matchSearch = !search ||
      q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
      (q.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.project_name || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-[#FAF8F5] min-h-screen">
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      {showAddClient && <QuickAddClientModal onClose={() => setShowAddClient(false)} onCreated={handleClientCreated}/>}
      {showAddProject && selectedClient && (
        <QuickAddProjectModal clientId={selectedClientId} clientName={selectedClient.full_name}
          onClose={() => setShowAddProject(false)} onCreated={handleProjectCreated}/>
      )}
      {showLibrary && <LibraryPicker items={lineLibrary} onSelect={handleLibrarySelect} onClose={() => { setShowLibrary(false); setLibraryTargetIdx(null); }}/>}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-bold text-[#1C1C1C]">Quotations</h1>
          <p className="text-[13px] text-[#9A8F82]">{quotations.length} total · {quotations.filter(q=>q.status==="approved").length} approved</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="pl-9 pr-4 py-2.5 bg-white border border-[#EDE8DF] rounded-xl text-[13px] outline-none focus:border-[#C8922A] w-52"/>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="py-2.5 px-3 bg-white border border-[#EDE8DF] rounded-xl text-[13px] outline-none focus:border-[#C8922A]">
            <option value="all">All Status</option>
            {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white font-bold px-5 py-2.5 rounded-xl text-[13px]">
            <Plus size={16}/> New Quotation
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-[#C8922A]"/></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[#1C1C1C] font-bold">No quotations found</p>
            <p className="text-[13px] text-[#9A8F82] mt-1">Create your first quotation above</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-[#FAF8F5] border-b border-[#EDE8DF]">
              <tr>
                {["Quote #","Client","Project","Status","Amount","Date","Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2ED]">
              {filtered.map(q => {
                const sc = STATUS_CFG[q.status] || STATUS_CFG.draft;
                const isActing = actionId === q.id;
                return (
                  <tr key={q.id} className="hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-bold text-[#1C1C1C]">{q.quote_number}</p>
                      <p className="text-[11px] text-[#9A8F82]">v{q.version}</p>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#6B6259]">{q.client_name || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-[#6B6259]">{q.project_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{ color: sc.color, backgroundColor: sc.bg }}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-[#1C1C1C]">
                      ₹{parseFloat(q.grand_total || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#9A8F82]">
                      {new Date(q.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(q.id)} title="Edit"
                          className="p-1.5 text-[#9A8F82] hover:text-[#C8922A] hover:bg-[#FDF3E3] rounded-lg transition-colors">
                          <Edit3 size={14}/>
                        </button>
                        {q.status === "draft" || q.status === "sent" ? (
                          <button onClick={() => handleApprove(q.id)} title="Approve" disabled={isActing}
                            className="p-1.5 text-[#9A8F82] hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                            {isActing ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
                          </button>
                        ) : null}
                        <button onClick={() => handlePDF(q.id, q.quote_number)} title="Download PDF" disabled={isActing}
                          className="p-1.5 text-[#9A8F82] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          {isActing ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                        </button>
                        <button onClick={() => handleEmail(q.id)} title="Send Email" disabled={isActing}
                          className="p-1.5 text-[#9A8F82] hover:text-[#C8922A] hover:bg-[#FDF3E3] rounded-lg transition-colors">
                          <Mail size={14}/>
                        </button>
                        {(q.status === "draft") && (
                          <button onClick={() => handleSend(q.id)} title="Mark as Sent" disabled={isActing}
                            className="p-1.5 text-[#9A8F82] hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors text-[11px] font-bold">
                            Sent
                          </button>
                        )}
                        <button onClick={() => handleCopy(q)} title="Copy Quotation" disabled={isActing}
                          className="p-1.5 text-[#9A8F82] hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                          <Copy size={14}/>
                        </button>
                        <button onClick={() => handleDelete(q.id)} title="Delete"
                          className="p-1.5 text-[#9A8F82] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl my-6 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#EDE8DF] bg-[#FCFBF9] flex justify-between items-center">
              <div>
                <h2 className="text-[18px] font-bold text-[#1C1C1C]">{editingId ? "Edit Quotation" : "Create New Quotation"}</h2>
                <p className="text-[12px] text-[#9A8F82]">Fill in details — project and client are optional for walk-in customers</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-[#9A8F82] hover:text-[#1C1C1C] rounded-full">
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Row 1: Client, Project, Valid Until */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Client */}
                <div>
                  <label className="block text-[10px] font-black text-[#9A8F82] uppercase mb-1">Client <span className="font-normal text-[#C8B89C] normal-case">(optional)</span></label>
                  <div className="flex gap-1">
                    <select value={selectedClientId} onChange={e => handleClientChange(e.target.value)}
                      className="flex-1 border border-[#EDE8DF] rounded-lg p-2 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]">
                      <option value="">— Walk-in / No Client —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowAddClient(true)}
                      className="p-2 border border-[#EDE8DF] rounded-lg text-[#9A8F82] hover:text-[#C8922A] hover:border-[#C8922A]">
                      <UserPlus size={14}/>
                    </button>
                  </div>
                </div>
                {/* Project */}
                <div>
                  <label className="block text-[10px] font-black text-[#9A8F82] uppercase mb-1">Project <span className="font-normal text-[#C8B89C] normal-case">(optional)</span></label>
                  <div className="flex gap-1">
                    <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                      className="flex-1 border border-[#EDE8DF] rounded-lg p-2 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]">
                      <option value="">— No Project —</option>
                      {(selectedClient?.projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {selectedClientId && (
                      <button type="button" onClick={() => setShowAddProject(true)}
                        className="p-2 border border-[#EDE8DF] rounded-lg text-[#9A8F82] hover:text-[#C8922A] hover:border-[#C8922A]">
                        <FolderPlus size={14}/>
                      </button>
                    )}
                  </div>
                </div>
                {/* Valid Until */}
                <div>
                  <label className="block text-[10px] font-black text-[#9A8F82] uppercase mb-1">Valid Until <span className="font-normal text-[#C8B89C] normal-case">(optional)</span></label>
                  <input type="date" value={formMeta.valid_until} onChange={e => setFormMeta({...formMeta, valid_until: e.target.value})}
                    className="w-full border border-[#EDE8DF] rounded-lg p-2 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]"/>
                </div>
              </div>

              {/* Row 2: Tax Mode, Discount, Rates */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#FAF8F5] rounded-xl">
                {/* Tax Mode */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-[#9A8F82] uppercase mb-2">Tax Mode</label>
                  <div className="flex gap-1.5">
                    {[
                      { k: "cgst_sgst", l: "CGST + SGST" },
                      { k: "igst", l: "IGST (Outstation)" },
                      { k: "non_gst", l: "Non-GST" },
                    ].map(m => (
                      <button key={m.k} type="button" onClick={() => setFormMeta({...formMeta, taxMode: m.k})}
                        className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-bold transition-all ${formMeta.taxMode === m.k ? "bg-[#C8922A] text-white" : "bg-white border border-[#EDE8DF] text-[#6B6259]"}`}>
                        {m.l}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Discount */}
                <div>
                  <label className="block text-[10px] font-black text-[#9A8F82] uppercase mb-1">Discount</label>
                  <div className="flex gap-1">
                    <select value={formMeta.discount_type} onChange={e => setFormMeta({...formMeta, discount_type: e.target.value})}
                      className="w-24 border border-[#EDE8DF] rounded-lg p-2 text-[12px] outline-none focus:border-[#C8922A] bg-white">
                      <option value="fixed">₹ Fixed</option>
                      <option value="percentage">% Pct</option>
                    </select>
                    <input type="number" min="0" value={formMeta.discount_value}
                      onChange={e => setFormMeta({...formMeta, discount_value: e.target.value})}
                      className="flex-1 border border-[#EDE8DF] rounded-lg p-2 text-[13px] outline-none focus:border-[#C8922A] bg-white"/>
                  </div>
                </div>
                {/* GST Rates */}
                <div>
                  {formMeta.taxMode === "cgst_sgst" && (
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="block text-[10px] font-black text-[#9A8F82] uppercase mb-1">CGST %</label>
                        <input type="number" min="0" max="28" value={formMeta.cgst_rate}
                          onChange={e => setFormMeta({...formMeta, cgst_rate: e.target.value})}
                          className="w-full border border-[#EDE8DF] rounded-lg p-2 text-[13px] outline-none focus:border-[#C8922A] bg-white"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-[#9A8F82] uppercase mb-1">SGST %</label>
                        <input type="number" min="0" max="28" value={formMeta.sgst_rate}
                          onChange={e => setFormMeta({...formMeta, sgst_rate: e.target.value})}
                          className="w-full border border-[#EDE8DF] rounded-lg p-2 text-[13px] outline-none focus:border-[#C8922A] bg-white"/>
                      </div>
                    </div>
                  )}
                  {formMeta.taxMode === "igst" && (
                    <div>
                      <label className="block text-[10px] font-black text-[#9A8F82] uppercase mb-1">IGST %</label>
                      <input type="number" min="0" max="28" value={formMeta.igst_rate}
                        onChange={e => setFormMeta({...formMeta, igst_rate: e.target.value})}
                        className="w-full border border-[#EDE8DF] rounded-lg p-2 text-[13px] outline-none focus:border-[#C8922A] bg-white"/>
                    </div>
                  )}
                  {formMeta.taxMode === "non_gst" && (
                    <div className="flex items-center h-full">
                      <p className="text-[12px] text-[#9A8F82]">No tax applied</p>
                    </div>
                  )}
                </div>
              </div>

              {/* LINE ITEMS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black text-[#9A8F82] uppercase">Line Items *</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setLibraryTargetIdx(null); setShowLibrary(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#C8922A] border border-[#C8922A]/30 rounded-lg hover:bg-[#FDF3E3]">
                      <Library size={12}/> From Library
                    </button>
                    <button type="button" onClick={addItem}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#1C1C1C] border border-[#EDE8DF] rounded-lg hover:bg-[#FAF8F5]">
                      <Plus size={12}/> Add Item
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const svcImgUrl = item.service_image_url ? getServiceImageUrl(item.service_image_url) : null;
                    return (
                      <div key={idx} className="border border-[#EDE8DF] rounded-xl p-3 bg-white">
                        <div className="grid grid-cols-12 gap-2 items-start">
                          {/* # */}
                          <div className="col-span-1 flex items-center justify-center pt-2">
                            <span className="text-[12px] text-[#9A8F82] font-bold">{idx+1}</span>
                          </div>
                          {/* Service picker */}
                          <div className="col-span-4">
                            <label className="block text-[9px] font-bold text-[#9A8F82] uppercase mb-1">Service</label>
                            <ServicePicker services={services} value={item.service || ""}
                              onChange={(svc) => handleServiceSelect(idx, svc)}/>
                          </div>
                          {/* Description */}
                          <div className="col-span-4">
                            <label className="block text-[9px] font-bold text-[#9A8F82] uppercase mb-1">Description *</label>
                            <input value={item.description}
                              onChange={e => updateItem(idx, "description", e.target.value)}
                              placeholder="Item description"
                              className="w-full border border-[#EDE8DF] rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#C8922A]"/>
                          </div>
                          {/* Category */}
                          <div className="col-span-2">
                            <label className="block text-[9px] font-bold text-[#9A8F82] uppercase mb-1">Category</label>
                            <input value={item.category}
                              onChange={e => updateItem(idx, "category", e.target.value)}
                              placeholder="e.g. Furniture"
                              className="w-full border border-[#EDE8DF] rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#C8922A]"/>
                          </div>
                          {/* Delete */}
                          <div className="col-span-1 flex items-end pb-0.5">
                            {items.length > 1 && (
                              <button type="button" onClick={() => removeItem(idx)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 size={13}/>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Second row: Qty, Unit, Rate, Amount + image thumbnail */}
                        <div className="grid grid-cols-12 gap-2 items-center mt-2">
                          <div className="col-span-1"/>
                          {/* Thumbnail */}
                          <div className="col-span-1">
                            {svcImgUrl ? (
                              <img src={svcImgUrl} alt="" className="w-8 h-8 rounded object-cover border border-[#EDE8DF]"/>
                            ) : (
                              <div className="w-8 h-8 rounded bg-[#F5F2ED] flex items-center justify-center">
                                <ImgIcon size={12} className="text-[#C8B89C]"/>
                              </div>
                            )}
                          </div>
                          {/* Qty */}
                          <div className="col-span-2">
                            <label className="block text-[9px] font-bold text-[#9A8F82] uppercase mb-1">Qty</label>
                            <input type="number" min="0.01" step="0.01" value={item.quantity}
                              onChange={e => updateItem(idx, "quantity", e.target.value)}
                              className="w-full border border-[#EDE8DF] rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#C8922A]"/>
                          </div>
                          {/* Unit */}
                          <div className="col-span-2">
                            <label className="block text-[9px] font-bold text-[#9A8F82] uppercase mb-1">Unit</label>
                            <select value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)}
                              className="w-full border border-[#EDE8DF] rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#C8922A]">
                              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          {/* Rate */}
                          <div className="col-span-3">
                            <label className="block text-[9px] font-bold text-[#9A8F82] uppercase mb-1">Rate (₹)</label>
                            <input type="number" min="0" step="0.01" value={item.rate}
                              onChange={e => updateItem(idx, "rate", e.target.value)}
                              placeholder="0.00"
                              className="w-full border border-[#EDE8DF] rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#C8922A]"/>
                          </div>
                          {/* Amount */}
                          <div className="col-span-3">
                            <label className="block text-[9px] font-bold text-[#9A8F82] uppercase mb-1">Amount</label>
                            <div className="px-2 py-1.5 bg-[#FAF8F5] border border-[#EDE8DF] rounded-lg text-[12px] font-semibold text-[#1C1C1C]">
                              {fmt(itemAmt(item))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals + Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-black text-[#9A8F82] uppercase mb-1">Notes <span className="font-normal text-[#C8B89C] normal-case">(optional)</span></label>
                  <textarea rows={4} value={formMeta.notes} onChange={e => setFormMeta({...formMeta, notes: e.target.value})}
                    placeholder="e.g. Prices valid for 30 days. 50% advance required."
                    className="w-full border border-[#EDE8DF] rounded-xl p-3 text-[13px] outline-none focus:border-[#C8922A] resize-none"/>
                </div>
                {/* Totals */}
                <div className="bg-[#1C1C1C] text-white rounded-xl p-4 space-y-1.5">
                  {[
                    ["Subtotal", fmt(totals.subtotal)],
                    ...(totals.discAmt > 0 ? [[`Discount`, `- ${fmt(totals.discAmt)}`]] : []),
                    ["Taxable Amount", fmt(totals.taxable)],
                    ...(totals.cgst > 0 ? [[`CGST @ ${formMeta.cgst_rate}%`, fmt(totals.cgst)]] : []),
                    ...(totals.sgst > 0 ? [[`SGST @ ${formMeta.sgst_rate}%`, fmt(totals.sgst)]] : []),
                    ...(totals.igst > 0 ? [[`IGST @ ${formMeta.igst_rate}%`, fmt(totals.igst)]] : []),
                  ].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between text-[12px]">
                      <span className="text-white/60">{l}</span><span>{v}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-white/20 flex justify-between">
                    <span className="text-[14px] font-bold">Grand Total</span>
                    <span className="text-[16px] font-bold text-[#C8922A]">{fmt(totals.grand)}</span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-[13px] font-bold text-[#6B6259] border border-[#EDE8DF] rounded-xl hover:bg-[#FAF8F5]">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-7 py-2.5 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-bold rounded-xl disabled:opacity-50">
                  {submitting ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>}
                  {editingId ? "Update Quotation" : "Save Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
