"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Filter,
  Trash2,
  Pencil,
  MoreHorizontal,
  Phone,
  MapPin,
  Calendar,
  Clock,
  FileText,
} from "lucide-react";
import API_BASE_URL from "@/lib/config";

interface Enquiry {
  _id: string;
  id: string;
  client_name: string;
  mobile_number: string;
  address: string;
  enquiry_date: string;
  enquiry_time: string;
  notes: string;
  status: "new" | "contacted" | "converted" | "lost";
  created_by: { full_name: string; email: string } | string;
  created_at: string;
  updated_at: string;
}

type ModalMode = "create" | "edit" | null;

const STATUS_CONFIG = {
  new:       { label: "New",       bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200",   dot: "bg-blue-500"   },
  contacted: { label: "Contacted", bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-500" },
  converted: { label: "Converted", bg: "bg-green-100",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-500"  },
  lost:      { label: "Lost",      bg: "bg-red-100",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-400"    },
};

// ── Action Dropdown ──────────────────────────────────────────────────────────
function ActionMenu({
  enquiry,
  onEdit,
  onDelete,
}: {
  enquiry: Enquiry;
  onEdit: (e: Enquiry) => void;
  onDelete: (e: Enquiry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
      zIndex: 9999,
      minWidth: 160,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseDown={openMenu}
        className="p-2 rounded-lg text-[#9A8F82] hover:text-[#1C1C1C] hover:bg-[#F5F0E8] transition-all"
      >
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div
          ref={menuRef}
          style={menuStyle}
          className="bg-white border border-[#EDE8DF] rounded-xl shadow-xl overflow-hidden"
        >
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onEdit(enquiry); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-[#1C1C1C] hover:bg-[#FAF8F5] transition-colors"
          >
            <Pencil size={14} className="text-[#C8922A]" /> Edit
          </button>
          <div className="h-px bg-[#F5F2ED]" />
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onDelete(enquiry); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Enquiry["status"]>("all");
  const [userRole, setUserRole] = useState<string>("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Enquiry | null>(null);

  const defaultForm = {
    client_name: "",
    mobile_number: "",
    address: "",
    enquiry_date: new Date().toISOString().split("T")[0],
    enquiry_time: "10:00",
    notes: "",
    status: "new" as Enquiry["status"],
  };
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) setUserRole(JSON.parse(userStr).role || "");
    } catch { setUserRole(""); }
  }, []);

  const canModify = userRole === "owner" || userRole === "manager" || userRole === "admin";
  const getId = (e: Enquiry) => e._id || e.id;

  // ── Fetch ────────────────────────────────────────────────────────────────
const fetchEnquiries = useCallback(async () => {
  const token = localStorage.getItem("access");
  if (!token) return; // ← ADD THIS — don't call API without a token
  
  setIsLoading(true);
  setError(null);
  try {
    const res = await fetch(`${API_BASE_URL}/enquiries/`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
      if (!res.ok) throw new Error(`Failed to fetch enquiries (${res.status})`);
      const data = await res.json();
      setEnquiries(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch enquiries");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);

  // ── Modal helpers ────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingEnquiry(null);
    setFormData(defaultForm);
    setModalError(null);
    setModalMode("create");
  };

  const openEdit = (enquiry: Enquiry) => {
    setEditingEnquiry(enquiry);
    setFormData({
      client_name: enquiry.client_name,
      mobile_number: enquiry.mobile_number,
      address: enquiry.address,
      enquiry_date: enquiry.enquiry_date?.split("T")[0] || "",
      enquiry_time: enquiry.enquiry_time || "10:00",
      notes: enquiry.notes || "",
      status: enquiry.status,
    });
    setModalError(null);
    setModalMode("edit");
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);
    try {
      const token = localStorage.getItem("access");
      const isEdit = modalMode === "edit" && editingEnquiry;
      const url = isEdit
        ? `${API_BASE_URL}/enquiries/${getId(editingEnquiry!)}/`
        : `${API_BASE_URL}/enquiries/`;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || errData?.message || `Failed (${res.status})`);
      }

      setModalMode(null);
      await fetchEnquiries();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const id = getId(deleteConfirm);
    setDeletingId(id);
    setDeleteConfirm(null);
    try {
      const token = localStorage.getItem("access");
      const res = await fetch(`${API_BASE_URL}/enquiries/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) throw new Error(`Failed to delete (${res.status})`);
      setEnquiries((prev) => prev.filter((e) => getId(e) !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete enquiry");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = enquiries.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      e.client_name.toLowerCase().includes(q) ||
      e.mobile_number.includes(q) ||
      e.address.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatTime = (t: string) => {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${m} ${ampm}`;
  };

  return (
    <div className="p-8 bg-[#FAF8F5] min-h-screen font-sans text-[#1C1C1C]">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1C1C]">Enquiries</h1>
          <p className="text-[14px] text-[#9A8F82] mt-1 font-medium">Track and manage incoming client enquiries</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" size={16} />
            <input
              type="text"
              placeholder="Search by name, mobile, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-[#EDE8DF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C8922A]/20 focus:border-[#C8922A] w-72 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" size={14} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="pl-9 pr-4 py-2.5 bg-white border border-[#EDE8DF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C8922A]/20 focus:border-[#C8922A] transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          {canModify && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[14px] font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <Plus size={18} /> Add Enquiry
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm overflow-visible">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#EDE8DF]">
              <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Client Name</th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Mobile</th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Address</th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Date & Time</th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Status</th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Notes</th>
              {canModify && (
                <th className="px-6 py-4 text-right text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2ED]">
            {isLoading ? (
              <tr>
                <td colSpan={canModify ? 7 : 6} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-[#C8922A]" size={32} />
                    <p className="text-[#9A8F82] text-sm font-medium">Fetching enquiries...</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={canModify ? 7 : 6} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                      <AlertCircle size={28} className="text-red-500" />
                    </div>
                    <p className="text-[#1C1C1C] font-bold">Something went wrong</p>
                    <p className="text-[#9A8F82] text-sm">{error}</p>
                    <button onClick={fetchEnquiries} className="mt-2 px-5 py-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-sm font-bold rounded-xl transition-all active:scale-95">
                      Retry
                    </button>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={canModify ? 7 : 6} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 bg-[#FAF8F5] rounded-full flex items-center justify-center mb-2">
                      <FileText size={24} className="text-[#EDE8DF]" />
                    </div>
                    <p className="text-[#1C1C1C] font-bold">No enquiries found</p>
                    <p className="text-[#9A8F82] text-sm">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search or filter"
                        : "Add your first enquiry to get started"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((enquiry) => {
                const id = getId(enquiry);
                const isDeleting = deletingId === id;
                const sc = STATUS_CONFIG[enquiry.status] || STATUS_CONFIG.new;
                return (
                  <tr
                    key={id}
                    className={`group transition-colors ${isDeleting ? "opacity-40 pointer-events-none" : "hover:bg-[#FAF8F5]/60"}`}
                  >
                    <td className="px-6 py-5">
                      <p className="text-[14px] font-bold text-[#1C1C1C]">
                        {enquiry.client_name}
                        {isDeleting && <Loader2 size={13} className="inline ml-2 animate-spin text-[#C8922A]" />}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-[#9A8F82]" />
                        <p className="text-[13px] text-[#6B6259] font-medium">{enquiry.mobile_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-[200px]">
                      <div className="flex items-start gap-1.5">
                        <MapPin size={12} className="text-[#9A8F82] mt-0.5 flex-shrink-0" />
                        <p className="text-[13px] text-[#6B6259] truncate">{enquiry.address}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-[#9A8F82]" />
                          <p className="text-[12px] text-[#6B6259] font-medium">{formatDate(enquiry.enquiry_date)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-[#9A8F82]" />
                          <p className="text-[12px] text-[#9A8F82]">{formatTime(enquiry.enquiry_time)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${sc.bg} ${sc.text} border ${sc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 max-w-[160px]">
                      <p className="text-[12px] text-[#9A8F82] truncate">{enquiry.notes || "—"}</p>
                    </td>
                    {canModify && (
                      <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          enquiry={enquiry}
                          onEdit={openEdit}
                          onDelete={(e) => setDeleteConfirm(e)}
                        />
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-[12px] text-[#9A8F82] font-medium">
        <p>Showing {filtered.length} of {enquiries.length} enquiries</p>
        <p>Last updated: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
      </div>

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#1C1C1C]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-[17px] font-black text-[#1C1C1C] mb-1">Delete Enquiry?</h3>
            <p className="text-[13px] text-[#9A8F82] mb-1">
              Enquiry for <span className="font-bold text-[#1C1C1C]">"{deleteConfirm.client_name}"</span> will be permanently removed.
            </p>
            <p className="text-[13px] text-[#9A8F82] mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-[#EDE8DF] text-[#6B6259] rounded-xl font-bold text-[13px] hover:bg-[#FAF8F5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-[13px] transition-colors active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modalMode && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1C1C1C]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#EDE8DF] bg-[#FAF8F5] flex-shrink-0">
              <div>
                <h2 className="text-xl font-black text-[#1C1C1C]">
                  {modalMode === "edit" ? "Edit Enquiry" : "Add New Enquiry"}
                </h2>
                <p className="text-xs text-[#9A8F82] mt-0.5 font-bold uppercase tracking-wider">
                  {modalMode === "edit" ? "Update enquiry details" : "Fill in the client enquiry details"}
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="p-2 text-[#9A8F82] hover:text-[#1C1C1C] hover:bg-[#EDE8DF] rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
              {modalError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Client Name */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">Client Name *</label>
                <input
                  required
                  type="text"
                  maxLength={200}
                  placeholder="e.g. Rahul Sharma"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">Mobile Number *</label>
                <input
                  required
                  type="tel"
                  maxLength={15}
                  placeholder="e.g. 9876543210"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                  className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">Address *</label>
                <textarea
                  required
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. 42, MG Road, Bangalore, Karnataka"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none resize-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                />
              </div>

              {/* Date + Time side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">Date *</label>
                  <input
                    required
                    type="date"
                    value={formData.enquiry_date}
                    onChange={(e) => setFormData({ ...formData, enquiry_date: e.target.value })}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">Time *</label>
                  <input
                    required
                    type="time"
                    value={formData.enquiry_time}
                    onChange={(e) => setFormData({ ...formData, enquiry_time: e.target.value })}
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">Status</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(STATUS_CONFIG) as Enquiry["status"][]).map((s) => {
                    const sc = STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s })}
                        className={`py-2 rounded-xl text-[11px] font-bold border transition-all capitalize ${
                          formData.status === s
                            ? `${sc.bg} ${sc.border} ${sc.text}`
                            : "bg-white border-[#EDE8DF] text-[#9A8F82] hover:bg-[#FAF8F5]"
                        }`}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">Notes <span className="text-[#9A8F82] font-medium normal-case">(optional)</span></label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  placeholder="Any additional details about this enquiry..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none resize-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                />
                <p className="text-[11px] text-[#9A8F82]">{formData.notes.length}/1000</p>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-[#F5F2ED] flex justify-end items-center gap-4">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
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
                    <><Loader2 size={18} className="animate-spin" /> {modalMode === "edit" ? "Updating..." : "Saving..."}</>
                  ) : (
                    modalMode === "edit" ? "Update Enquiry" : "Save Enquiry"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}