"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
  ShieldAlert,
} from "lucide-react";
import API_BASE_URL from "@/lib/config";

interface ServiceMedia {
  file_url: string;
  file_type: string;
  file_size: number;
  original_filename: string;
  uploaded_at: string;
}

interface Service {
  _id: string;
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  media: ServiceMedia[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

type ModalMode = "create" | "edit" | null;

// ── Helper: get a readable error message from a fetch response ──────────────
async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  if (res.status === 403) {
    // Try to get a server-provided reason first
    try {
      const body = await res.json();
      const serverMsg =
        body?.detail ||
        body?.message ||
        body?.error ||
        null;
      if (serverMsg) return `Permission denied: ${serverMsg}`;
    } catch {
      // ignore parse error
    }
    return "You don't have permission to perform this action. Please contact your administrator.";
  }
  if (res.status === 401) {
    return "Your session has expired. Please log in again.";
  }
  try {
    const body = await res.json();
    return body?.detail || body?.message || body?.error || fallback;
  } catch {
    return fallback;
  }
}

// ── Token utilities ──────────────────────────────────────────────────────────
function getToken(): string | null {
  return localStorage.getItem("access");
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    // exp is in seconds
    return Date.now() / 1000 > payload.exp;
  } catch {
    return false;
  }
}

// ── Dropdown menu rendered with fixed positioning so it's never clipped ──────
function ActionMenu({
  service,
  onEdit,
  onDelete,
}: {
  service: Service;
  onEdit: (s: Service) => void;
  onDelete: (s: Service) => void;
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
      ) {
        setOpen(false);
      }
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
        title="Actions"
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onEdit(service);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-[#1C1C1C] hover:bg-[#FAF8F5] transition-colors"
          >
            <Pencil size={14} className="text-[#C8922A]" /> Edit
          </button>
          <div className="h-px bg-[#F5F2ED]" />
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onDelete(service);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </>
  );
}

// ── Permission-denied toast banner ──────────────────────────────────────────
function PermissionBanner({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] flex items-start gap-3 bg-white border border-red-200 rounded-2xl shadow-2xl px-5 py-4 max-w-md w-full mx-4 animate-in slide-in-from-bottom-4">
      <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <ShieldAlert size={18} className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#1C1C1C]">Action not allowed</p>
        <p className="text-[12px] text-[#6B6259] mt-0.5 leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-[#9A8F82] hover:text-[#1C1C1C] transition-colors flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ServicesPage() {
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [userRole, setUserRole] = useState<string>("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
  });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [createFiles, setCreateFiles] = useState<File[]>([]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmService, setDeleteConfirmService] = useState<Service | null>(null);

  // Permission/error banner
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole(user.role || "");
      }
    } catch {
      setUserRole("");
    }
  }, []);

  const canModify = userRole === "owner" || userRole === "manager";
  const getServiceId = (s: Service) => s._id || s.id;

  // ── Auth headers with expiry check ──────────────────────────────────────
  const getAuthHeaders = useCallback((): Record<string, string> | null => {
    const token = getToken();
    if (!token) {
      setPermissionError("No auth token found. Please log in again.");
      return null;
    }
    if (isTokenExpired(token)) {
      setPermissionError("Your session has expired. Please log in again.");
      return null;
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/services/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const msg = await parseErrorMessage(res, `Failed to fetch services (${res.status})`);
        throw new Error(msg);
      }
      const data = await res.json();
      const serviceList = Array.isArray(data) ? data : data.results || data.data || [];
      setServices(serviceList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch services");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // ── Modal helpers ────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingService(null);
    setFormData({ name: "", description: "", status: "active" });
    setCreateFiles([]);
    setModalError(null);
    setModalMode("create");
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setFormData({ name: service.name, description: service.description, status: service.status });
    setModalError(null);
    setModalMode("edit");
  };

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);
    try {
      const headers = getAuthHeaders();
      if (!headers) { setIsSubmitting(false); return; }

      const res = await fetch(`${API_BASE_URL}/services/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: formData.name, description: formData.description }),
      });
      if (!res.ok) {
        const msg = await parseErrorMessage(res, `Failed to create service (${res.status})`);
        throw new Error(msg);
      }
      const created = await res.json();
      const newId = created._id || created.id;

      // If user attached files, upload them now against the newly created service.
      // NOTE: files must go as multipart FormData to the dedicated media endpoint —
      // the create endpoint above only accepts JSON (name/description), so files
      // can never be sent in the same request as service creation.
      if (createFiles.length > 0 && newId) {
        const token = getToken();
        const mediaForm = new FormData();
        createFiles.forEach((file) => mediaForm.append("files", file));
        const mediaRes = await fetch(`${API_BASE_URL}/services/${newId}/media/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }, // no Content-Type: let browser set multipart boundary
          body: mediaForm,
        });
        if (!mediaRes.ok) {
          const msg = await parseErrorMessage(mediaRes, "Service created, but file upload failed.");
          throw new Error(msg);
        }
      }

      setModalMode(null);
      setCreateFiles([]);
      await fetchServices();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to create service");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Update ───────────────────────────────────────────────────────────────
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      const headers = getAuthHeaders();
      if (!headers) { setIsSubmitting(false); return; }

      const id = getServiceId(editingService);
      const res = await fetch(`${API_BASE_URL}/services/${id}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const msg = await parseErrorMessage(res, `Failed to update service (${res.status})`);
        throw new Error(msg);
      }
      setModalMode(null);
      await fetchServices();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to update service");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteConfirmService) return;
    const id = getServiceId(deleteConfirmService);
    setDeletingId(id);
    setDeleteConfirmService(null);

    try {
      const token = getToken();

      // Warn if token looks expired before we even try
      if (token && isTokenExpired(token)) {
        setPermissionError("Your session has expired. Please log in again.");
        setDeletingId(null);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/services/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 403) {
        // Surface a helpful message instead of a generic error
        const msg = await parseErrorMessage(res, "You don't have permission to delete this service.");
        setPermissionError(msg);
        return;
      }

      if (res.status === 401) {
        setPermissionError("Your session has expired. Please log in again.");
        return;
      }

      if (!res.ok && res.status !== 204) {
        const msg = await parseErrorMessage(res, `Failed to delete service (${res.status})`);
        throw new Error(msg);
      }

      // Success — remove from local state
      setServices((prev) => prev.filter((s) => getServiceId(s) !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete service");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const truncateDescription = (desc: string, maxLen = 80) => {
    if (!desc) return "";
    return desc.length > maxLen ? desc.substring(0, maxLen) + "..." : desc;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const isModalOpen = modalMode !== null;

  return (
    <div className="p-8 bg-[#FAF8F5] min-h-screen font-sans text-[#1C1C1C]">

      {/* Permission error banner */}
      {permissionError && (
        <PermissionBanner
          message={permissionError}
          onClose={() => setPermissionError(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1C1C]">Master Services</h1>
          <p className="text-[14px] text-[#9A8F82] mt-1 font-medium">Manage your service catalog and offerings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" size={16} />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-[#EDE8DF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C8922A]/20 focus:border-[#C8922A] w-64 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" size={14} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="pl-9 pr-4 py-2.5 bg-white border border-[#EDE8DF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C8922A]/20 focus:border-[#C8922A] transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {canModify && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[14px] font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <Plus size={18} /> Add Service
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm overflow-visible">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#EDE8DF]">
              <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Name</th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Description</th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Media</th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Status</th>
              <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Created</th>
              {canModify && (
                <th className="px-6 py-4 text-right text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F2ED]">
            {isLoading ? (
              <tr>
                <td colSpan={canModify ? 6 : 5} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-[#C8922A]" size={32} />
                    <p className="text-[#9A8F82] text-sm font-medium">Fetching services...</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={canModify ? 6 : 5} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                      <AlertCircle size={28} className="text-red-500" />
                    </div>
                    <p className="text-[#1C1C1C] font-bold">Something went wrong</p>
                    <p className="text-[#9A8F82] text-sm max-w-sm">{error}</p>
                    <button
                      onClick={fetchServices}
                      className="mt-2 px-5 py-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-sm font-bold rounded-xl transition-all active:scale-95"
                    >
                      Retry
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredServices.length === 0 ? (
              <tr>
                <td colSpan={canModify ? 6 : 5} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 bg-[#FAF8F5] rounded-full flex items-center justify-center mb-2">
                      <Search size={24} className="text-[#EDE8DF]" />
                    </div>
                    <p className="text-[#1C1C1C] font-bold">No services found</p>
                    <p className="text-[#9A8F82] text-sm">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search or filter"
                        : "Create your first service to get started"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredServices.map((service) => {
                const id = getServiceId(service);
                const isBeingDeleted = deletingId === id;
                return (
                  <tr
                    key={id}
                    onClick={() => router.push(`/dashboard/services/${id}`)}
                    className={`group transition-colors cursor-pointer ${
                      isBeingDeleted ? "opacity-40 pointer-events-none" : "hover:bg-[#FAF8F5]/60"
                    }`}
                  >
                    <td className="px-6 py-5">
                      <p className="text-[14px] font-bold text-[#1C1C1C] group-hover:text-[#C8922A] transition-colors">
                        {service.name}
                        {isBeingDeleted && <Loader2 size={13} className="inline ml-2 animate-spin text-[#C8922A]" />}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] text-[#6B6259]">{truncateDescription(service.description)}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[13px] font-bold text-[#1C1C1C]">{service.media?.length || 0}</span>
                    </td>
                    <td className="px-6 py-5">
                      {service.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] text-[#6B6259]">{formatDate(service.created_at)}</p>
                    </td>

                    {canModify && (
                      <td
                        className="px-6 py-5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ActionMenu
                          service={service}
                          onEdit={openEdit}
                          onDelete={(s) => setDeleteConfirmService(s)}
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
        <p>Showing {filteredServices.length} of {services.length} services</p>
        <p>Last updated: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
      </div>

      {/* ── Delete Confirm Dialog ── */}
      {deleteConfirmService && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#1C1C1C]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-[17px] font-black text-[#1C1C1C] mb-1">Delete Service?</h3>
            <p className="text-[13px] text-[#9A8F82] mb-1">
              <span className="font-bold text-[#1C1C1C]">"{deleteConfirmService.name}"</span> will be permanently removed.
            </p>
            <p className="text-[13px] text-[#9A8F82] mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmService(null)}
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
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1C1C1C]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#EDE8DF] bg-[#FAF8F5]">
              <div>
                <h2 className="text-xl font-black text-[#1C1C1C]">
                  {modalMode === "edit" ? "Edit Service" : "Add New Service"}
                </h2>
                <p className="text-xs text-[#9A8F82] mt-0.5 font-bold uppercase tracking-wider">
                  {modalMode === "edit" ? "Update the service details" : "Fill in the service details"}
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="p-2 text-[#9A8F82] hover:text-[#1C1C1C] hover:bg-[#EDE8DF] rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={modalMode === "edit" ? handleUpdate : handleCreate} className="p-8 space-y-5">
              {modalError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">Service Name *</label>
                <input
                  required
                  type="text"
                  maxLength={200}
                  placeholder="e.g. Interior Design Consultation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">Description *</label>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  placeholder="Describe the service offering..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none resize-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                />
                <p className="text-[11px] text-[#9A8F82]">{formData.description.length}/2000 characters</p>
              </div>

              {modalMode === "create" && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    Attach Files (optional)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => setCreateFiles(e.target.files ? Array.from(e.target.files) : [])}
                    className="w-full text-[13px] font-medium text-[#6B6259] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[12px] file:font-bold file:bg-[#EDE8DF] file:text-[#1C1C1C] hover:file:bg-[#E0D9CC]"
                  />
                  {createFiles.length > 0 && (
                    <p className="text-[11px] text-[#9A8F82]">
                      {createFiles.length} file{createFiles.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              )}

              {modalMode === "edit" && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">Status</label>
                  <div className="flex gap-3">
                    {(["active", "inactive"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s })}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-all capitalize ${
                          formData.status === s
                            ? s === "active"
                              ? "bg-green-50 border-green-300 text-green-700"
                              : "bg-gray-100 border-gray-300 text-gray-600"
                            : "bg-white border-[#EDE8DF] text-[#9A8F82] hover:bg-[#FAF8F5]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-[#F5F2ED] flex justify-end items-center gap-4">
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
                    <><Loader2 size={18} className="animate-spin" /> {modalMode === "edit" ? "Updating..." : "Creating..."}</>
                  ) : (
                    modalMode === "edit" ? "Update Service" : "Create Service"
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