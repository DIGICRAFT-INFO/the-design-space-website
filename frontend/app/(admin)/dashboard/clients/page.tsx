"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  MoreHorizontal,
  Building2,
  Phone,
  Mail,
  X,
  CreditCard,
  Loader2,
  Edit2,
  Trash2,
  UserPlus,
  Briefcase,
  ExternalLink,
  ChevronRight,
  MapPin,
} from "lucide-react";
import {
  getAllClients,
  createClient,
  updateClient,
  deleteClient,
  type Client,
  type ClientFormData,
} from "@/services/clientService";

type ClientUI = Client & {
  full_name: string;
  projects: number;
  initial: string;
  state: string;
  city: string;
  address: string;
  gstin: string;
  lead_source: string;
  lead_source_other: string;
  client_type: string;
  client_type_other: string;
  country: string;
  all_projects_completed: boolean;
};
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // UTs
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];
function toClientUI(client: Client): ClientUI {
  return {
    ...client,
    full_name: client.full_name || "Unknown", // ← null guard
    projects: client.project_count ?? 0,
    initial: (client.full_name || "?").charAt(0).toUpperCase(), // ← crash fix
    state: client.state || "",
    city: client.city || "",
    address: client.billing_address || "",
    gstin: client.gstin || "",
    lead_source: client.lead_source || "",
    lead_source_other: client.lead_source_other || "",
    country: client.country || "India",
    client_type: client.client_type || "",
    client_type_other: (client as any).client_type_other || "",
    all_projects_completed: !!client.all_projects_completed,
  };
}

export default function ClientsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientUI[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    billing_address: "",
    site_address: "",
    gstin: "",
    lead_source: "",
    lead_source_other: "",
    city: "",
    state: "",
    country: "India",
    client_type: "",
    client_type_other: "",
  });

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const results = await getAllClients();
      setClients(results.map(toClientUI));
    } catch (error) {
      console.error("Fetch Error:", error);
      setFetchError("Failed to load clients. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      billing_address: "",
      site_address: "",
      gstin: "",
      lead_source: "",
      lead_source_other: "",
      city: "",
      state: "",
      country: "India",
      client_type: "",
      client_type_other: "",
    });
  };

  const handleEditClick = (client: ClientUI) => {
    setEditingId(client.id);
    setFormData({
      full_name: client.full_name,
      email: client.email || "",
      phone: client.phone || "",
      billing_address: client.billing_address || "",
      site_address: client.site_address || "",
      gstin: client.gstin || "",
      lead_source: client.lead_source || "",
      lead_source_other: client.lead_source_other || "",
      city: client.city || "",
      state: client.state || "",
      country: client.country || "India",
      client_type: client.client_type || "",
      client_type_other: client.client_type_other || "",
    });
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload: ClientFormData = { ...formData };
    try {
      if (editingId) {
        await updateClient(editingId, payload);
      } else {
        await createClient(payload);
      }
      await fetchClients();
      closeModal();
    } catch (error) {
      alert(
        "Error: " +
          (error instanceof Error ? error.message : "Connection failed."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    console.log("DELETE ID:", id);
    if (
      !window.confirm(
        "Are you sure you want to delete this client? This action cannot be undone.",
      )
    )
      return;
    try {
      await deleteClient(id);
      await fetchClients();
    } catch (error) {
      alert(
        "Delete failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
    setActiveMenu(null);
  };

  const filteredClients = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery),
  );

  return (
    <div className="p-8 bg-[#FAF8F5] min-h-screen font-sans text-[#1C1C1C]">
      {/* Upper Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1C1C]">
            Clients
          </h1>
          <p className="text-[14px] text-[#9A8F82] mt-1 font-medium">
            Manage your portfolio and client relationships efficiently
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-[#EDE8DF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C8922A]/20 focus:border-[#C8922A] w-64 transition-all"
            />
          </div>
          <button
            onClick={() => {
              closeModal();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[14px] font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <UserPlus size={18} /> Add Client
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-[#EDE8DF] shadow-sm">
          <p className="text-[#9A8F82] text-xs font-bold uppercase tracking-wider">
            Total Clients
          </p>
          <p className="text-2xl font-black mt-1">{clients.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#EDE8DF] shadow-sm">
          <p className="text-[#9A8F82] text-xs font-bold uppercase tracking-wider">
            Active Projects
          </p>
          <p className="text-2xl font-black mt-1 text-[#C8922A]">
            {clients.reduce((acc, curr) => acc + curr.projects, 0)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#EDE8DF] shadow-sm">
          <p className="text-[#9A8F82] text-xs font-bold uppercase tracking-wider">
            New This Month
          </p>
          <p className="text-2xl font-black mt-1 text-green-600">
            {
              clients.filter((c) => {
                const created = (c as any).created_at;
                if (!created) return false;
                const d = new Date(created);
                const now = new Date();
                return (
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear()
                );
              }).length
            }
          </p>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm ">
        <div className="">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EDE8DF]">
                <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">
                  Client Profile
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">
                  Contact Details
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">
                  Engagement
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-[#9A8F82] uppercase tracking-[0.1em]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2ED]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2
                        className="animate-spin text-[#C8922A]"
                        size={32}
                      />
                      <p className="text-[#9A8F82] text-sm font-medium">
                        Fetching your clients...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-red-500 text-sm font-medium">
                        {fetchError}
                      </p>
                      <button
                        onClick={fetchClients}
                        className="px-4 py-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold rounded-lg transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 bg-[#FAF8F5] rounded-full flex items-center justify-center mb-2">
                        <Search size={24} className="text-[#EDE8DF]" />
                      </div>
                      <p className="text-[#1C1C1C] font-bold">
                        No clients found
                      </p>
                      <p className="text-[#9A8F82] text-sm">
                        Try adjusting your search query
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((c) => (
                  <tr
                    key={c.id}
                    className="group hover:bg-[#FAF8F5]/50 transition-colors"
                  >
                    <td className="px-6 py-5">
                      <Link
                        href={`/dashboard/clients/${c.id}`}
                        className="flex items-center gap-4 outline-none"
                      >
                        <div className="w-11 h-11 rounded-full bg-[#FDF3E3] text-[#C8922A] font-black text-[15px] flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-[#F5E6CC] group-hover:scale-110 transition-transform">
                          {c.initial}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-[#1C1C1C] group-hover:text-[#C8922A] transition-colors flex items-center gap-1.5">
                            {c.full_name}{" "}
                            <ChevronRight
                              size={12}
                              className="opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0"
                            />
                          </p>
                          {c.client_type && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mt-0.5"
                              style={{
                                background:
                                  c.client_type === "vendor"
                                    ? "#EEF2FF"
                                    : c.client_type === "local"
                                      ? "#FFF7ED"
                                      : c.client_type === "corporate"
                                        ? "#F0FDF4"
                                        : c.client_type === "builder"
                                          ? "#FDF4FF"
                                          : "#F5F5F5",
                                color:
                                  c.client_type === "vendor"
                                    ? "#4F46E5"
                                    : c.client_type === "local"
                                      ? "#EA580C"
                                      : c.client_type === "corporate"
                                        ? "#16A34A"
                                        : c.client_type === "builder"
                                          ? "#9333EA"
                                          : "#6B7280",
                              }}
                            >
                              {c.client_type === "other" &&
                              c.client_type_other
                                ? c.client_type_other
                                : c.client_type}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-[11px] text-[#9A8F82] mt-0.5">
                            <MapPin size={10} />{" "}
                            {c.site_address
                              ? c.site_address.substring(0, 25) +
                                (c.site_address.length > 25 ? "..." : "")
                              : "No site address"}
                            ...
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[12px] text-[#6B6259] font-medium">
                          <div className="p-1 bg-[#FAF8F5] rounded">
                            <Mail size={12} className="text-[#9A8F82]" />
                          </div>
                          {c.email ? (
                            <a
                              href={`mailto:${c.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-[#C8922A] hover:underline transition-colors"
                            >
                              {c.email}
                            </a>
                          ) : (
                            "No email"
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-[#6B6259] font-medium">
                          <div className="p-1 bg-[#FAF8F5] rounded">
                            <Phone size={12} className="text-[#9A8F82]" />
                          </div>
                          {c.phone ? (
                            <a
                              href={`tel:${c.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-[#C8922A] hover:underline transition-colors"
                            >
                              {c.phone}
                            </a>
                          ) : (
                            "No phone"
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-[#9A8F82]" />
                        <span className="text-[13px] font-bold text-[#1C1C1C]">
                          {c.projects}{" "}
                          <span className="text-[#9A8F82] font-medium">
                            Projects
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {c.all_projects_completed ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#ECFDF5] text-[#10B981] border border-[#D1FAE5]">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right relative">
                      <button
                        onClick={() =>
                          setActiveMenu(activeMenu === c.id ? null : c.id)
                        }
                        className={`p-2 rounded-xl transition-all ${activeMenu === c.id ? "bg-[#1C1C1C] text-white shadow-md" : "text-[#9A8F82] hover:bg-[#EDE8DF] hover:text-[#1C1C1C]"}`}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {activeMenu === c.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setActiveMenu(null)}
                          ></div>
                          <div className="absolute right-6 mt-2 z-50 w-44 bg-white border border-[#EDE8DF] rounded-2xl shadow-2xl py-2 animate-in fade-in zoom-in duration-200">
                            <Link
                              href={`/dashboard/clients/${c.id}`}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-[#1C1C1C] hover:bg-[#FAF8F5]"
                            >
                              <ExternalLink
                                size={15}
                                className="text-[#C8922A]"
                              />{" "}
                              View Profile
                            </Link>
                            <button
                              onClick={() => handleEditClick(c)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-[#1C1C1C] hover:bg-[#FAF8F5]"
                            >
                              <Edit2 size={15} className="text-blue-500" /> Edit
                              Client
                            </button>
                            <div className="h-px bg-[#F5F2ED] my-1 mx-2"></div>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={15} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-6 flex items-center justify-between text-[12px] text-[#9A8F82] font-medium">
        <p>
          Showing {filteredClients.length} of {clients.length} clients
        </p>
        <p>
          Last updated:{" "}
          {new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>{" "}
      </div>

      {/* Modal - Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1C1C1C]/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white  rounded-[24px] w-full max-w-xl shadow-2xl overflow-y-scroll max-h-[90vh] animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#EDE8DF] bg-[#FAF8F5]">
              <div>
                <h2 className="text-xl font-black text-[#1C1C1C]">
                  {editingId ? "Edit Client Profile" : "Create New Client"}
                </h2>
                <p className="text-xs text-[#9A8F82] mt-0.5 font-bold uppercase tracking-wider">
                  Please fill in all required information
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-[#9A8F82] hover:text-[#1C1C1C] hover:bg-[#EDE8DF] rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                  Full Legal Name *
                </label>
                <div className="relative">
                  <Building2
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]"
                    size={16}
                  />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="hello@company.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 00000 00000"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                  GST Number (Optional)
                </label>
                <div className="relative">
                  <CreditCard
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="22AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gstin: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-bold uppercase outline-none focus:border-[#C8922A] transition-all"
                  />
                </div>
              </div>

              {/* Client Type */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    Client Type
                  </label>
                  <select
                    value={formData.client_type}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        client_type: e.target.value,
                        // type change karte hi other empty
                        client_type_other:
                          e.target.value === "other"
                            ? p.client_type_other
                            : "",
                      }))
                    }
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] transition-all"
                  >
                    <option value="">— Select Type —</option>
                    <option value="local">Local</option>
                    <option value="vendor">Vendor</option>
                    <option value="corporate">Corporate</option>
                    <option value="builder">Builder</option>
                    <option value="architect">Architect / Designer</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    Client Type (If Other)
                  </label>
                  <input
                    disabled={formData.client_type !== "other"}
                    value={formData.client_type_other}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        client_type_other: e.target.value,
                      }))
                    }
                    placeholder="e.g. NGO, Government, Trust..."
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Lead Source */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    Lead Source
                  </label>
                  <select
                    value={formData.lead_source}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        lead_source: e.target.value,
                        // source change karte hi other empty
                        lead_source_other:
                          e.target.value === "other" ? p.lead_source_other : "",
                      }))
                    }
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] transition-all"
                  >
                    <option value="">— Select —</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="google">Google Search / Ads</option>
                    <option value="website">Website</option>
                    <option value="walkin">Walk-in</option>
                    <option value="referral">Reference / Referral</option>
                    <option value="architect">Architect / Designer</option>
                    <option value="builder">Builder</option>
                    <option value="broker">Broker</option>
                    <option value="portal">99acres / MagicBricks / etc</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    Lead Source (If Other)
                  </label>
                  <input
                    disabled={formData.lead_source !== "other"}
                    value={formData.lead_source_other}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        lead_source_other: e.target.value,
                      }))
                    }
                    placeholder="e.g. Partner, Event, Newspaper..."
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    City
                  </label>
                  <input
                    value={formData.city}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, city: e.target.value }))
                    }
                    placeholder="e.g. Raipur"
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    State
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, state: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none focus:border-[#C8922A] transition-all"
                  >
                    <option value="">— Select —</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    Country
                  </label>
                  <input
                    value={formData.country}
                    readOnly
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none opacity-80"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    Billing Address
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter complete billing address"
                    value={formData.billing_address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billing_address: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none resize-none focus:border-[#C8922A] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-[0.1em]">
                    Site Address
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter project site address"
                    value={formData.site_address}
                    onChange={(e) =>
                      setFormData({ ...formData, site_address: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] font-medium outline-none resize-none focus:border-[#C8922A] transition-all"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-[#F5F2ED] flex justify-end items-center gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 text-[14px] font-bold text-[#6B6259] hover:text-[#1C1C1C] transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-[#C8922A] text-white text-[14px] font-black rounded-xl shadow-lg shadow-[#C8922A]/20 disabled:opacity-50 active:scale-95 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Saving
                      Changes...
                    </>
                  ) : editingId ? (
                    "Update Client"
                  ) : (
                    "Create Client"
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