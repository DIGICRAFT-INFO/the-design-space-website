"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Edit3,
  X,
  Search,
  Package,
} from "lucide-react";
import {
  getAllSettings,
  saveSettings,
  saveMilestones,
  type GSTData,
  type Milestone,
} from "@/services/settingsService";
import { setGstEnabledLocal } from "@/lib/gstToggle";
import ProfileSection from "@/components/settings/ProfileSection";
import { type User } from "@/services/authService";

type BankData = Record<string, string | number | boolean | null | undefined>;
type BrandData = Record<string, string | number | boolean | null | undefined>;
type NumberingData = Record<string, string | number | boolean | null | undefined>;

function fieldValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

// ─── Line Item Type ───────────────────────────────────────────────────────────
interface LineItem {
  id: string;
  category: string;
  name: string;
  description: string;
  default_rate: string;
  unit: string;
  is_active: boolean;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined")
    return { "Content-Type": "application/json" };
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const profileTab = "My Profile";

const adminTabs = [
  "GST Configuration",
  "Items & Services",
  "Milestones",
  "Branding",
  "Bank Details",
  "Document Numbering",
];

const gstFields = ["default_cgst", "default_sgst", "default_igst"] as const;
type GstRateField = (typeof gstFields)[number];

// ─── GST TOGGLE ───────────────────────────────────────────────────────────────
function GSTToggleButton({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`w-14 h-8 rounded-full p-1 transition-colors ${
        enabled ? "bg-[#10B981]" : "bg-[#E5E7EB]"
      }`}
    >
      <div
        className={`h-6 w-6 bg-white rounded-full shadow transition-transform ${
          enabled ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── ACTIVE TOGGLE (small) ────────────────────────────────────────────────────
function SmallToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? "bg-[#C8922A]" : "bg-[#D1D5DB]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  const bg = { success: "#10B981", error: "#EF4444", info: "#C8922A" }[type];
  return (
    <div
      className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-semibold"
      style={{ backgroundColor: bg }}
    >
      {message}
      <button onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINE ITEMS SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function LineItemsSection() {
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<LineItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const [form, setForm] = useState({
    category: "",
    name: "",
    description: "",
    default_rate: "",
    unit: "lot",
    is_active: true,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/line-items/?all=true`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setItems(data.results ?? data ?? []);
    } catch {
      setToast({ message: "Failed to load items", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditItem(null);
    setForm({
      category: "",
      name: "",
      description: "",
      default_rate: "",
      unit: "lot",
      is_active: true,
    });
    setShowForm(true);
  }

  function openEdit(item: LineItem) {
    setEditItem(item);
    setForm({
      category: item.category,
      name: item.name,
      description: item.description,
      default_rate: item.default_rate,
      unit: item.unit,
      is_active: item.is_active,
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editItem
        ? `${API_BASE}/line-items/${editItem.id}/`
        : `${API_BASE}/line-items/`;
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(JSON.stringify(e));
      }
      setToast({
        message: editItem ? "Item updated!" : "Item added to library!",
        type: "success",
      });
      setShowForm(false);
      fetchItems();
    } catch (err: any) {
      setToast({ message: "Error: " + err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item from library?")) return;
    try {
      await fetch(`${API_BASE}/line-items/${id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setToast({ message: "Deleted", type: "info" });
      fetchItems();
    } catch {
      setToast({ message: "Delete failed", type: "error" });
    }
  }

  async function handleToggleActive(item: LineItem) {
    try {
      await fetch(`${API_BASE}/line-items/${item.id}/`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      fetchItems();
    } catch {
      setToast({ message: "Update failed", type: "error" });
    }
  }

  const categories = [
    "All",
    ...Array.from(new Set(items.map((i) => i.category)))
      .filter(Boolean)
      .sort(),
  ];

  const filtered = items.filter(
    (i) =>
      (filterCat === "All" || i.category === filterCat) &&
      (i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="bg-white rounded-xl border border-[#EDE8DF] p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[16px] font-semibold text-[#1C1C1C]">
            Items & Services Library
          </h2>
          <p className="text-[12px] text-[#9A8F82] mt-0.5">
            Add services & materials here — they appear as a dropdown in
            quotations
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]"
          />
          <input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[13px] outline-none focus:border-[#C8922A]"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="border border-[#EDE8DF] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#C8922A] bg-[#FAF8F5]"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="mb-5 p-5 bg-[#FAF8F5] rounded-2xl border border-[#C8922A]/30 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[#1C1C1C]">
              {editItem ? "Edit Item" : "Add New Item / Service"}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-[#9A8F82] hover:text-[#1C1C1C]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#9A8F82] uppercase mb-1.5">
                Category *
              </label>
              <input
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Furniture, Civil, Electrical"
                list="cat-list"
                className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
              />
              <datalist id="cat-list">
                {[
                  "Furniture",
                  "Civil",
                  "Electrical",
                  "Flooring",
                  "False Ceiling",
                  "Painting",
                  "Plumbing",
                  "Décor",
                  "Design Fee",
                  "Package",
                  "Consultation",
                ].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#9A8F82] uppercase mb-1.5">
                Item / Service Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Modular Kitchen — L-Shape"
                className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#9A8F82] uppercase mb-1.5">
              Description
            </label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Brief description shown in quotation line item"
              className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#9A8F82] uppercase mb-1.5">
                Default Rate (₹) *
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.default_rate}
                onChange={(e) =>
                  setForm({ ...form, default_rate: e.target.value })
                }
                placeholder="85000"
                className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#9A8F82] uppercase mb-1.5">
                Unit
              </label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-[#EDE8DF] rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
              >
                {[
                  "lot",
                  "sqft",
                  "nos",
                  "rft",
                  "per_space",
                  "piece",
                  "kg",
                  "meter",
                  "lumpsum",
                ].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#9A8F82] uppercase mb-1.5">
                Active
              </label>
              <div className="flex items-center gap-2 mt-2">
                <SmallToggle
                  enabled={form.is_active}
                  onChange={() =>
                    setForm({ ...form, is_active: !form.is_active })
                  }
                />
                <span className="text-[12px] text-[#6B6259]">
                  {form.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-[#EDE8DF] rounded-xl text-[13px] font-semibold text-[#6B6259] hover:bg-[#F5F2ED]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold rounded-xl transition-all"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {editItem ? "Update Item" : "Save Item"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="py-10 text-center">
          <Loader2 className="animate-spin inline text-[#C8922A]" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-[#9A8F82]">
          <Package size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-[14px] font-medium">No items yet.</p>
          <p className="text-[12px] mt-1">
            Add your services & materials — they'll appear as a dropdown in
            quotations.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 text-[#C8922A] text-[13px] font-semibold hover:underline"
          >
            + Add first item
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Group by category */}
          {Array.from(new Set(filtered.map((i) => i.category))).map((cat) => (
            <div key={cat}>
              <p className="text-[10px] font-black text-[#9A8F82] uppercase tracking-widest mt-5 mb-2 px-1">
                {cat || "Uncategorised"}
              </p>
              {filtered
                .filter((i) => i.category === cat)
                .map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                      item.is_active
                        ? "bg-white border-[#EDE8DF] hover:border-[#C8922A]/30"
                        : "bg-[#FAF8F5] border-[#EDE8DF] opacity-50"
                    }`}
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 bg-[#FDF3E3] rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package size={15} className="text-[#C8922A]" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1C1C1C] truncate">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="text-[11px] text-[#9A8F82] truncate">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Rate */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-bold text-[#1C1C1C]">
                        ₹{parseFloat(item.default_rate).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] text-[#9A8F82]">/{item.unit}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <SmallToggle
                        enabled={item.is_active}
                        onChange={() => handleToggleActive(item)}
                      />
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 text-[#9A8F82] hover:text-[#C8922A] hover:bg-[#FDF3E3] rounded-lg transition-colors"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-[#9A8F82] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const [userRole, setUserRole] = useState<string>("designer");
  const [activeTab, setActiveTab] = useState(profileTab);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const adminRoles = ["owner", "manager", "accountant"];
  const isAdmin = adminRoles.includes(userRole);
  const visibleTabs = isAdmin ? [profileTab, ...adminTabs] : [profileTab];

  const showToast = (message: string, type: "success" | "error") =>
    setToast({ message, type });

  const [gstData, setGstData] = useState<GSTData>({});
  const [bankData, setBankData] = useState<BankData>({});
  const [brandData, setBrandData] = useState<BrandData>({});
  const [numberingData, setNumberingData] = useState<NumberingData>({});
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole(String(user.role || "designer").toLowerCase());
      }
    } catch {
      setUserRole("designer");
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAllSettings();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const settings = await getAllSettings();
      setGstData(settings.gst);
      setBankData(settings.bank);
      setBrandData(settings.brand);
      setNumberingData(settings.numbering);
      setMilestones(settings.milestones);
      setGstEnabledLocal(!!settings.gst?.gst_enabled);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (endpoint: string, data: Record<string, unknown>) => {
    try {
      await saveSettings(endpoint, data);
      if (endpoint === "tax") {
        setGstEnabledLocal(!!data?.gst_enabled);
      }
      setToast({ message: "Settings saved!", type: "success" });
    } catch (error) {
      setToast({ message: "Failed to save settings", type: "error" });
    }
  };

  const handleSaveMilestones = async () => {
    try {
      const saved = await saveMilestones(milestones);
      setMilestones(saved);
      setToast({ message: "Milestones saved!", type: "success" });
    } catch (error) {
      setToast({ message: "Failed to save milestones", type: "error" });
    }
  };

  const addMilestone = () =>
    setMilestones([...milestones, { label: "New Milestone", percentage: 0 }]);

  const deleteMilestone = (_id: string | undefined, index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const totalPercentage = milestones.reduce(
    (s, m) => s + (m.percentage || 0),
    0,
  );

  if (loading && isAdmin)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-[#C8922A]" size={32} />
      </div>
    );

  const handleProfileUpdate = (user: User) => {
    setUserRole(String(user.role || "designer").toLowerCase());
  };

  const gstEnabled = !!gstData.gst_enabled;

  return (
    <div className="max-w-6xl mx-auto p-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1C1C1C]">Settings</h1>
        <p className="text-[13px] text-[#9A8F82] mt-0.5">
          {isAdmin
            ? "Manage your profile and firm billing preferences"
            : "Manage your account profile and security"}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar / mobile tabs */}
        <div className="lg:w-[220px] shrink-0">
          <div className="bg-white rounded-xl border border-[#EDE8DF] p-2 lg:sticky lg:top-4 flex lg:flex-col gap-1 overflow-x-auto">
            {visibleTabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`whitespace-nowrap lg:w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all mb-0.5 shrink-0 ${
                  activeTab === t
                    ? "bg-[#FDF3E3] text-[#C8922A] font-semibold"
                    : "text-[#6B6259] hover:bg-[#FAF8F5]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === profileTab && (
            <ProfileSection
              showToast={showToast}
              onProfileUpdate={handleProfileUpdate}
            />
          )}

          {isAdmin && activeTab === "GST Configuration" && (
            <div className="bg-white rounded-xl border border-[#EDE8DF] p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[16px] font-semibold">
                    GST Configuration
                  </h2>
                  <p className="text-[12px] text-[#9A8F82] mt-0.5">
                    {gstEnabled
                      ? "GST fields visible on quotations & invoices"
                      : "GST hidden — pricing shown exclusive of tax"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[12px] font-bold ${
                      gstEnabled ? "text-[#10B981]" : "text-[#9A8F82]"
                    }`}
                  >
                    GST: {gstEnabled ? "ON" : "OFF"}
                  </span>
                  <GSTToggleButton
                    enabled={gstEnabled}
                    onChange={(next) => {
                      setGstData({ ...gstData, gst_enabled: next });
                      setGstEnabledLocal(next);
                    }}
                  />
                </div>
              </div>

              {/* GST fields — only when ON */}
              {gstEnabled && (
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                      Firm GSTIN
                    </label>
                    <input
                      type="text"
                      value={gstData.firm_gstin ?? ""}
                      onChange={(e) =>
                        setGstData({ ...gstData, firm_gstin: e.target.value })
                      }
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                      className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                      Place of Supply
                    </label>
                    <input
                      type="text"
                      value={gstData.place_of_supply ?? ""}
                      onChange={(e) =>
                        setGstData({
                          ...gstData,
                          place_of_supply: e.target.value,
                        })
                      }
                      placeholder="e.g. Chhattisgarh"
                      className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                    />
                  </div>

                  {gstFields.map((field: GstRateField) => (
                    <div key={field}>
                      <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                        {field.replace("default_", "").toUpperCase()} %
                      </label>
                      <input
                        type="number"
                        value={gstData[field] ?? ""}
                        onChange={(e) =>
                          setGstData({
                            ...gstData,
                            [field]:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          })
                        }
                        className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                      SAC Code
                    </label>
                    <input
                      type="text"
                      value={gstData.sac_code ?? ""}
                      onChange={(e) =>
                        setGstData({ ...gstData, sac_code: e.target.value })
                      }
                      placeholder="998312"
                      className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                    />
                  </div>
                </div>
              )}

              {/* OFF state info */}
              {!gstEnabled && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mt-4">
                  <AlertCircle
                    size={18}
                    className="text-amber-500 flex-shrink-0"
                  />
                  <p className="text-[13px] text-amber-700">
                    GST is disabled. Quotations and invoices will not show any
                    tax fields. Toggle ON above to configure GST.
                  </p>
                </div>
              )}

              <button
                onClick={() => handleSave("tax", gstData)}
                className="mt-6 flex items-center gap-2 bg-[#C8922A] text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-[#B07A20] transition-all"
              >
                <Save size={14} /> Save GST Settings
              </button>
            </div>
          )}

          {/* ── Items & Services ── */}
          {isAdmin && activeTab === "Items & Services" && <LineItemsSection />}

          {/* ── Milestones ── */}
          {isAdmin && activeTab === "Milestones" && (
            <div className="bg-white rounded-xl border border-[#EDE8DF] p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[16px] font-semibold">
                    Milestone Templates
                  </h2>
                  <p className="text-[12px] text-[#9A8F82] mt-0.5">
                    Configure billing stages — must total 100%
                  </p>
                </div>
                <div
                  className={`text-[13px] font-semibold flex items-center gap-1.5 ${
                    totalPercentage === 100 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  <AlertCircle size={14} /> Total: {totalPercentage}%{" "}
                  {totalPercentage === 100 ? "(Valid)" : "(Must be 100%)"}
                </div>
              </div>

              <div className="space-y-3">
                {milestones.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-lg border border-[#EDE8DF]"
                  >
                    <span className="w-7 h-7 bg-[#C8922A] text-white rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={m.label}
                      onChange={(e) => {
                        const copy = [...milestones];
                        copy[i].label = e.target.value;
                        setMilestones(copy);
                      }}
                      className="flex-1 bg-white border border-[#EDE8DF] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#C8922A]"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input
                        type="number"
                        value={m.percentage}
                        onChange={(e) => {
                          const copy = [...milestones];
                          copy[i].percentage = Number(e.target.value);
                          setMilestones(copy);
                        }}
                        className="w-16 bg-white border border-[#EDE8DF] rounded-lg px-2 py-2 text-[13px] text-center outline-none focus:border-[#C8922A]"
                      />
                      <span className="text-[12px] text-[#9A8F82]">%</span>
                    </div>
                    <button
                      onClick={() => deleteMilestone(m.id, i)}
                      className="text-[#9A8F82] hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addMilestone}
                className="mt-3 flex items-center gap-1.5 text-[13px] text-[#C8922A] font-semibold hover:text-[#B07A20] transition-colors"
              >
                <Plus size={14} /> Add Milestone
              </button>

              <button
                disabled={totalPercentage !== 100}
                onClick={handleSaveMilestones}
                className="mt-5 flex items-center gap-2 bg-[#C8922A] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-[#B07A20] transition-all"
              >
                <Save size={14} /> Save Milestones
              </button>
            </div>
          )}

          {/* ── Branding ── */}
          {isAdmin && activeTab === "Branding" && (
            <div className="bg-white rounded-xl border border-[#EDE8DF] p-6">
              <h2 className="text-[16px] font-semibold mb-5">
                Branding & Firm Details
              </h2>
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                    Firm Name
                  </label>
                  <input
                    type="text"
                    value={fieldValue(brandData.firm_name)}
                    onChange={(e) =>
                      setBrandData({ ...brandData, firm_name: e.target.value })
                    }
                    placeholder="Elegance Interior Studio"
                    className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    value={fieldValue(brandData.firm_email)}
                    onChange={(e) =>
                      setBrandData({
                        ...brandData,
                        firm_email: e.target.value,
                      })
                    }
                    className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={fieldValue(brandData.firm_phone)}
                    onChange={(e) =>
                      setBrandData({
                        ...brandData,
                        firm_phone: e.target.value,
                      })
                    }
                    className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                    Primary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={fieldValue(brandData.primary_color) || "#C8922A"}
                      onChange={(e) =>
                        setBrandData({
                          ...brandData,
                          primary_color: e.target.value,
                        })
                      }
                      className="flex-1 border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                    />
                    <input
                      type="color"
                      value={fieldValue(brandData.primary_color) || "#C8922A"}
                      onChange={(e) =>
                        setBrandData({
                          ...brandData,
                          primary_color: e.target.value,
                        })
                      }
                      className="w-12 h-10 rounded-lg border border-[#EDE8DF] cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                    Address
                  </label>
                  <input
                    type="text"
                    value={fieldValue(brandData.firm_address)}
                    onChange={(e) =>
                      setBrandData({
                        ...brandData,
                        firm_address: e.target.value,
                      })
                    }
                    className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                    PDF Footer Text
                  </label>
                  <textarea
                    value={fieldValue(brandData.footer_text)}
                    onChange={(e) =>
                      setBrandData({
                        ...brandData,
                        footer_text: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Thank you for your business..."
                    className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] resize-none"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSave("brand", brandData)}
                className="mt-5 flex items-center gap-2 bg-[#C8922A] text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-[#B07A20] transition-all"
              >
                <Save size={14} /> Save Branding
              </button>
            </div>
          )}

          {/* ── Bank Details ── */}
          {isAdmin && activeTab === "Bank Details" && (
            <div className="bg-white rounded-xl border border-[#EDE8DF] p-6">
              <h2 className="text-[16px] font-semibold mb-5">
                Bank & Payment Details
              </h2>
              <div className="grid grid-cols-2 gap-5">
                {Object.keys(bankData)
                  .filter(
                    (key) => !["id", "updated_at", "upi_qr_code"].includes(key),
                  )
                  .map((key) => (
                    <div key={key}>
                      <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                        {key.replace(/_/g, " ")}
                      </label>
                      <input
                        type="text"
                        value={fieldValue(bankData[key])}
                        onChange={(e) =>
                          setBankData({ ...bankData, [key]: e.target.value })
                        }
                        className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                      />
                    </div>
                  ))}
              </div>
              <button
                onClick={() => handleSave("bank", bankData)}
                className="mt-5 flex items-center gap-2 bg-[#C8922A] text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-[#B07A20] transition-all"
              >
                <Save size={14} /> Save Bank Details
              </button>
            </div>
          )}

          {/* ── Document Numbering ── */}
          {isAdmin && activeTab === "Document Numbering" && (
            <div className="bg-white rounded-xl border border-[#EDE8DF] p-6">
              <h2 className="text-[16px] font-semibold mb-5">
                Document Numbering
              </h2>
              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                    Quote Prefix
                  </label>
                  <input
                    type="text"
                    value={fieldValue(numberingData.quote_prefix)}
                    onChange={(e) =>
                      setNumberingData({
                        ...numberingData,
                        quote_prefix: e.target.value,
                      })
                    }
                    className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={fieldValue(numberingData.invoice_prefix)}
                    onChange={(e) =>
                      setNumberingData({
                        ...numberingData,
                        invoice_prefix: e.target.value,
                      })
                    }
                    className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mb-5">
                <input
                  type="checkbox"
                  id="reset"
                  checked={!!numberingData.reset_yearly}
                  onChange={(e) =>
                    setNumberingData({
                      ...numberingData,
                      reset_yearly: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-[#C8922A]"
                />
                <label htmlFor="reset" className="text-[13px] text-[#6B6259]">
                  Reset numbering every financial year
                </label>
              </div>
              <button
                onClick={() => handleSave("numbering", numberingData)}
                className="flex items-center gap-2 bg-[#C8922A] text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-[#B07A20] transition-all"
              >
                <Save size={14} /> Save Numbering
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}