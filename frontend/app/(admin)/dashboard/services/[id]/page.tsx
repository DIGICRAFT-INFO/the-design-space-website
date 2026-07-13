"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Edit2,
  Trash2,
  UserPlus,
  X,
  Upload,
  Download,
  Play,
  FileText,
  Image as ImageIcon,
  Film,
} from "lucide-react";
import API_BASE_URL from "@/lib/config";
import ServiceForm from "@/components/services/ServiceForm";

interface ServiceMedia {
  _id?: string;
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
  created_by: { name?: string; _id?: string } | string;
  created_at: string;
  updated_at: string;
}

interface Assignment {
  _id?: string;
  id?: string;
  client: { _id?: string; id?: string; name?: string; full_name?: string } | string;
  assigned_by: { name?: string } | string;
  assigned_at: string;
}

interface Client {
  _id: string;
  id?: string;
  name?: string;
  full_name?: string;
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // Assign client modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Media upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);

  // Media preview
  const [previewMedia, setPreviewMedia] = useState<ServiceMedia | null>(null);

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

  const canEdit = userRole === "owner" || userRole === "manager";
  const canDelete = userRole === "owner";

  const getToken = () => localStorage.getItem("access") || "";

  const fetchService = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch service (${res.status})`);
      const data = await res.json();
      setService(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch service");
    } finally {
      setIsLoading(false);
    }
  }, [serviceId]);

  const fetchAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}/assignments`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch assignments");
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : data.results || data.data || []);
    } catch {
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchService();
    fetchAssignments();
  }, [fetchService, fetchAssignments]);

  // Fetch clients for assign modal
  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/clients/`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setClients(Array.isArray(data) ? data : data.results || data.data || []);
    } catch {
      setClients([]);
    }
  };

  const handleAssignClient = async () => {
    if (!selectedClientId) return;
    setIsAssigning(true);
    setAssignError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_id: selectedClientId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || errData?.error || "Failed to assign client");
      }
      setShowAssignModal(false);
      setSelectedClientId("");
      await fetchAssignments();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to assign client");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleEdit = async (data: { name: string; description: string; files: File[] }) => {
    setIsEditSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: data.name, description: data.description }),
      });
      if (!res.ok) throw new Error("Failed to update service");
      setShowEditModal(false);
      await fetchService();
    } catch {
      // error handled in form
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to delete service");
      router.push("/dashboard/services");
    } catch {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Media upload
  const uploadFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}/media/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || errData?.error || "Upload failed");
      }
      await fetchService();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMedia(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  };

  const deleteMedia = async (mediaId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/services/${serviceId}/media/${mediaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to delete media");
      await fetchService();
    } catch {
      // silent fail
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getCreatorName = () => {
    if (!service) return "—";
    if (typeof service.created_by === "object" && service.created_by?.name) {
      return service.created_by.name;
    }
    return typeof service.created_by === "string" ? service.created_by : "—";
  };

  const getMediaUrl = (media: ServiceMedia) => {
    if (!media.file_url) return '';
    // Already absolute URL
    if (media.file_url.startsWith('http')) return media.file_url;
    // Relative path like "uploads/services/xyz.png" — prepend backend origin
    const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    const filePath = media.file_url.replace(/^\//, '');
    return `${origin}/${filePath}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-8 bg-[#FAF8F5] min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#C8922A]" size={32} />
          <p className="text-[#9A8F82] text-sm font-medium">Loading service...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !service) {
    return (
      <div className="p-8 bg-[#FAF8F5] min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <p className="text-[#1C1C1C] font-bold">Something went wrong</p>
          <p className="text-[#9A8F82] text-sm">{error || "Service not found"}</p>
          <button
            onClick={fetchService}
            className="mt-2 px-5 py-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-sm font-bold rounded-xl transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#FAF8F5] min-h-screen font-sans text-[#1C1C1C]">
      {/* Back Button */}
      <button
        onClick={() => router.push("/dashboard/services")}
        className="flex items-center gap-2 text-[#9A8F82] hover:text-[#1C1C1C] text-sm font-bold mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Services
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1C1C]">
            {service.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            {service.status === "active" ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                Inactive
              </span>
            )}
            <span className="text-[13px] text-[#9A8F82]">
              Created by {getCreatorName()} on {formatDate(service.created_at)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#EDE8DF] text-[#6B6259] text-[13px] font-bold rounded-xl hover:border-[#C8922A] hover:text-[#C8922A] transition-all"
            >
              <Edit2 size={14} /> Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 text-[13px] font-bold rounded-xl hover:bg-red-50 transition-all"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm p-6 mb-6">
        <h2 className="text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em] mb-3">
          Description
        </h2>
        <p className="text-[14px] text-[#6B6259] leading-relaxed whitespace-pre-wrap">
          {service.description}
        </p>
      </div>

      {/* Media Gallery */}
      <div className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">
            Media ({service.media?.length || 0})
          </h2>
        </div>

        {service.media && service.media.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {service.media.map((media, idx) => {
              const mediaUrl = getMediaUrl(media);
              const mediaId = media._id || `media-${idx}`;
              return (
                <div key={mediaId} className="relative group rounded-xl overflow-hidden border border-[#EDE8DF]">
                  {media.file_type === "image" ? (
                    <img
                      src={mediaUrl}
                      alt={media.original_filename}
                      className="w-full h-32 object-cover cursor-pointer"
                      onClick={() => setPreviewMedia(media)}
                    />
                  ) : media.file_type === "video" ? (
                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center cursor-pointer" onClick={() => setPreviewMedia(media)}>
                      <Play size={32} className="text-[#C8922A]" />
                    </div>
                  ) : (
                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center gap-2">
                      <FileText size={28} className="text-red-500" />
                      <Download size={14} className="text-[#9A8F82]" />
                    </a>
                  )}
                  <div className="px-2 py-1.5 bg-white">
                    <p className="text-[11px] text-[#6B6259] truncate">{media.original_filename}</p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => deleteMedia(mediaId)}
                      className="absolute top-2 right-2 p-1 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-[#9A8F82]">No media files attached</p>
        )}

        {/* Upload Dropzone (owner/manager only) */}
        {canEdit && (
          <div className="mt-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingMedia(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDraggingMedia(false); }}
              onDrop={handleMediaDrop}
              onClick={() => mediaInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDraggingMedia
                  ? "border-[#C8922A] bg-[#C8922A]/5"
                  : "border-[#EDE8DF] bg-[#FAF8F5] hover:border-[#C8922A]/50"
              }`}
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin text-[#C8922A]" />
                  <span className="text-[13px] text-[#9A8F82]">Uploading...</span>
                </div>
              ) : (
                <>
                  <Upload size={24} className="mx-auto text-[#9A8F82] mb-2" />
                  <p className="text-[13px] font-bold text-[#6B6259]">
                    Drop files here or click to upload
                  </p>
                  <p className="text-[11px] text-[#9A8F82] mt-1">
                    JPEG, PNG, WebP, MP4, MOV, PDF — Max 50MB per file
                  </p>
                </>
              )}
            </div>
            <input
              ref={mediaInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,application/pdf"
              onChange={handleMediaSelect}
              className="hidden"
            />
            {uploadError && (
              <div className="flex items-center gap-2 p-3 mt-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assigned Clients Section */}
      <div className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">
            Assigned Clients
          </h2>
          {canEdit && (
            <button
              onClick={() => {
                setAssignError(null);
                setSelectedClientId("");
                fetchClients();
                setShowAssignModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-bold rounded-lg transition-all"
            >
              <UserPlus size={14} /> Assign Client
            </button>
          )}
        </div>

        {assignmentsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-[#C8922A]" />
          </div>
        ) : assignments.length > 0 ? (
          <div className="divide-y divide-[#F5F2ED]">
            {assignments.map((assignment) => {
              const clientName =
                typeof assignment.client === "object"
                  ? assignment.client?.name || assignment.client?.full_name || "Unknown"
                  : assignment.client;
              return (
                <div key={assignment.id || assignment._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-[14px] font-bold text-[#1C1C1C]">{clientName}</p>
                    <p className="text-[11px] text-[#9A8F82]">
                      Assigned {formatDate(assignment.assigned_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-[#9A8F82] py-4">No clients assigned</p>
        )}
      </div>

      {/* Media Preview Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1C1C1C]/80 backdrop-blur-sm p-4" onClick={() => setPreviewMedia(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-[#C8922A] transition-colors"
            >
              <X size={24} />
            </button>
            {previewMedia.file_type === "image" ? (
              <img
                src={getMediaUrl(previewMedia)}
                alt={previewMedia.original_filename}
                className="w-full max-h-[85vh] object-contain rounded-xl"
              />
            ) : previewMedia.file_type === "video" ? (
              <video
                src={getMediaUrl(previewMedia)}
                controls
                className="w-full max-h-[85vh] rounded-xl"
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Assign Client Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1C1C1C]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#EDE8DF] bg-[#FAF8F5]">
              <h2 className="text-xl font-black text-[#1C1C1C]">Assign Client</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-2 text-[#9A8F82] hover:text-[#1C1C1C] rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-5">
              {assignError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={16} />
                  <span>{assignError}</span>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                  Select Client
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                >
                  <option value="">Choose a client...</option>
                  {clients.map((client) => (
                    <option key={client._id || client.id} value={client._id || client.id}>
                      {client.name || client.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setShowAssignModal(false)} className="px-5 py-2.5 text-[14px] font-bold text-[#6B6259]">
                  Cancel
                </button>
                <button
                  onClick={handleAssignClient}
                  disabled={!selectedClientId || isAssigning}
                  className="px-6 py-2.5 bg-[#C8922A] text-white text-[14px] font-black rounded-xl disabled:opacity-50 transition-all"
                >
                  {isAssigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1C1C1C]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#EDE8DF] bg-[#FAF8F5]">
              <h2 className="text-xl font-black text-[#1C1C1C]">Edit Service</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-[#9A8F82] hover:text-[#1C1C1C] rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-8">
              <ServiceForm
                initialData={{ name: service.name, description: service.description }}
                onSubmit={handleEdit}
                onCancel={() => setShowEditModal(false)}
                isSubmitting={isEditSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1C1C1C]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-sm shadow-2xl p-8 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-black text-[#1C1C1C] mb-2">Delete Service?</h3>
            <p className="text-[13px] text-[#9A8F82] mb-6">
              This will deactivate &ldquo;{service.name}&rdquo;. This action can be undone by reactivating.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 text-[14px] font-bold text-[#6B6259] border border-[#EDE8DF] rounded-xl hover:bg-[#FAF8F5] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 text-white text-[14px] font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}