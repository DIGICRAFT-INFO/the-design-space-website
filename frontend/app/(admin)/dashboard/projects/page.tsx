"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  MapPin,
  Maximize2,
  Calendar,
  Loader2,
  X,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  LayoutGrid,
} from "lucide-react";
import { useParams } from "next/navigation";

import {
  getProjectsByClient,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  type Project,
} from "@/services/projectService";
import { getAllClients, type Client } from "@/services/clientService";

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  active:    { label: "Active",    color: "#065F46", bg: "#D1FAE5", dot: "#10B981" },
  on_hold:   { label: "On Hold",   color: "#92400E", bg: "#FEF3C7", dot: "#F59E0B" },
  completed: { label: "Completed", color: "#374151", bg: "#F3F4F6", dot: "#9CA3AF" },
};

function resolveClientId(client: unknown): string {
  if (!client) return "";
  if (typeof client === "string") return client;
  if (typeof client === "object") {
    return ((client as Record<string, unknown>).id as string) ?? "";
  }
  return String(client);
}

// Backend stores dates as Mongoose `Date`, which serializes to a full ISO
// datetime string (e.g. "2026-07-02T00:00:00.000Z"). <input type="date">
// only accepts exactly "yyyy-MM-dd" — anything else is silently rejected and
// the field renders blank even though the value exists. Normalize here.
function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatDisplayDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Filter Sidebar ──────────────────────────────────────────────────────────

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function FilterSection({ title, icon, defaultOpen = true, children }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#EDE8DF] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-4 text-[13px] font-semibold text-[#3D3530] hover:bg-[#FAF7F3] transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        {open ? <ChevronUp size={14} className="text-[#9A8F82]" /> : <ChevronDown size={14} className="text-[#9A8F82]" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  dot?: string;
}

function FilterChip({ active, onClick, children, count, dot }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all text-left ${
        active
          ? "bg-[#C8922A] text-white font-semibold shadow-sm"
          : "text-[#5C5248] hover:bg-[#F5F0E8] hover:text-[#1C1C1C]"
      }`}
    >
      <span className="flex items-center gap-2">
        {dot && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: active ? "white" : dot }}
          />
        )}
        {children}
      </span>
      {count !== undefined && (
        <span
          className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
            active ? "bg-white/25 text-white" : "bg-[#EDE8DF] text-[#9A8F82]"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  p,
  deletingId,
  onEdit,
  onDelete,
}: {
  p: Project;
  deletingId: string | null;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const isDeleting = !!p.id && deletingId === p.id;
  const cfg = statusConfig[p.status] ?? statusConfig.completed;

  return (
    <div
      onClick={onEdit}
      className="relative bg-white border border-[#EDE8DF] rounded-2xl p-5 hover:border-[#C8922A] cursor-pointer transition-all shadow-sm hover:shadow-md group"
    >
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        title="Delete project"
        className="absolute top-4 right-4 p-1.5 rounded-lg text-[#C8C0B8] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-100"
      >
        {isDeleting ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Trash2 size={15} />
        )}
      </button>

      <div className="flex items-start gap-3 mb-4 pr-8">
        <div className="w-10 h-10 bg-[#FEF3E2] rounded-xl flex items-center justify-center font-bold text-[#C8922A] text-[15px] flex-shrink-0">
          {(p.client_name?.[0] ?? p.name?.[0] ?? "P").toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-[#1C1C1C] text-[15px] truncate">{p.name}</h3>
          <p className="text-[#9A8F82] text-[12px] truncate">{p.client_name ?? ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12px] text-[#6B6259] mb-4">
        <div className="flex items-center gap-1.5">
          <MapPin size={13} className="text-[#B0A89E] flex-shrink-0" />
          <span className="capitalize">{p.property_type}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Maximize2 size={13} className="text-[#B0A89E] flex-shrink-0" />
          <span>{p.area_sqft || "0"} sqft</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-[#B0A89E] flex-shrink-0" />
          <span>{formatDisplayDate(p.start_date) || "—"}</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-[#C8922A]">
          {p.budget_range ? p.budget_range : <span className="text-[#B0A89E] font-normal">No budget</span>}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#F3EFE8]">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
          {cfg.label}
        </span>
        {p.expected_end_date && (
          <span className="text-[11px] text-[#9A8F82]">
            Due {formatDisplayDate(p.expected_end_date)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const params = useParams<{ clientId?: string }>();
  const routeClientId = params?.clientId;

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const emptyForm: Project = useMemo(
    () => ({
      client: routeClientId ?? "",
      name: "",
      property_type: "apartment",
      style_category: "",
      area_sqft: "",
      budget_range: "",
      start_date: new Date().toISOString().split("T")[0],
      expected_end_date: "",
      status: "active",
      notes: "",
    }),
    [routeClientId],
  );

  const [formData, setFormData] = useState<Project>(emptyForm);

  useEffect(() => { setFormData(emptyForm); }, [emptyForm]);

  const fetchClients = async () => {
    try {
      const data = await getAllClients();
      setClients(data);
    } catch (e) {
      console.error("Clients fetch error:", e);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = routeClientId
        ? await getProjectsByClient(routeClientId)
        : await getProjects();
      setProjects(Array.isArray(data) ? data : ((data as any)?.results ?? []));
    } catch (e) {
      console.error("Fetch error:", e);
      setError("Failed to load projects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    if (!routeClientId) fetchClients();
  }, [routeClientId]);

  const openEditModal = (p: Project) => {
    setFormData({
      ...p,
      client: resolveClientId(p.client) || routeClientId || "",
      start_date: toDateInputValue(p.start_date),
      expected_end_date: toDateInputValue(p.expected_end_date),
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const clientId = routeClientId ?? resolveClientId(formData.client);
      if (!clientId) { alert("Please select a client"); return; }

      if (formData.id) {
        await updateProject(clientId, formData.id, formData);
      } else {
        await createProject(clientId, formData);
      }
      setIsModalOpen(false);
      await fetchProjects();
    } catch (e) {
      console.error("API error:", e);
      alert("Failed to save. " + (e instanceof Error ? e.message : ""));
    }
  };

  const handleDelete = async (p: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!p.id) return;
    if (!confirm(`Delete project "${p.name}"? This cannot be undone.`)) return;

    const clientId = routeClientId ?? resolveClientId(p.client);
    if (!clientId) { alert("Could not resolve client for this project."); return; }

    setDeletingId(p.id);
    try {
      await deleteProject(clientId, p.id);
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      await fetchProjects();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete project. " + (err instanceof Error ? err.message : ""));
      await fetchProjects();
    } finally {
      setDeletingId(null);
    }
  };

  // ── Derived counts ──────────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, active: 0, on_hold: 0, completed: 0 };
    for (const p of projects) {
      counts.all++;
      if (p.status in counts) counts[p.status]++;
    }
    return counts;
  }, [projects]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    for (const p of projects) {
      const t = (p.property_type ?? "").toLowerCase();
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [projects]);

  // Only clients that have at least one project
  const activeClientIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of projects) {
      const id = resolveClientId(p.client);
      if (id) ids.add(id);
    }
    return ids;
  }, [projects]);

  const clientsWithProjects = useMemo(
    () => clients.filter((c) => activeClientIds.has(c.id)),
    [clients, activeClientIds],
  );

  const clientCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) {
      const id = resolveClientId(p.client);
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [projects]);

  // ── Filtered / grouped ──────────────────────────────────────────────────────

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const status = (p.status ?? "").toLowerCase();
      const type   = (p.property_type ?? "").toLowerCase();
      const pClientId = resolveClientId(p.client);

      const sMatch = statusFilter === "all" || status === statusFilter;
      const tMatch = typeFilter   === "all" || type   === typeFilter;
      const cMatch = routeClientId || clientFilter === "all" || pClientId === clientFilter;

      return sMatch && tMatch && cMatch;
    });
  }, [projects, statusFilter, typeFilter, clientFilter, routeClientId]);

  const groupedProjects = useMemo(() => {
    if (routeClientId) return null;

    const groups = new Map<string, { clientName: string; items: Project[] }>();
    for (const p of filteredProjects) {
      const key   = resolveClientId(p.client) || "unassigned";
      const label = p.client_name || "Unassigned";
      if (!groups.has(key)) groups.set(key, { clientName: label, items: [] });
      groups.get(key)!.items.push(p);
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.clientName.localeCompare(b.clientName),
    );
  }, [filteredProjects, routeClientId]);

  const activeFilterCount = [
    statusFilter !== "all",
    typeFilter   !== "all",
    clientFilter !== "all",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setClientFilter("all");
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-[#FBFAF7]">

      {/* ── SIDEBAR ── */}
      <aside
        className={`flex-shrink-0 transition-all duration-300 border-r border-[#EDE8DF] bg-white ${
          sidebarOpen ? "w-[220px]" : "w-0 overflow-hidden"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#EDE8DF]">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#3D3530] tracking-wide uppercase">
            <SlidersHorizontal size={14} className="text-[#C8922A]" />
            Filters
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-[11px] text-[#C8922A] font-semibold hover:underline"
            >
              Clear {activeFilterCount}
            </button>
          )}
        </div>

        {/* By Status */}
        <FilterSection
          title="Status"
          icon={<span className="w-2 h-2 rounded-full bg-[#C8922A] inline-block" />}
        >
          <div className="space-y-0.5">
            {(["all", "active", "on_hold", "completed"] as const).map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                count={statusCounts[s] ?? 0}
                dot={s !== "all" ? statusConfig[s]?.dot : undefined}
              >
                {s === "all" ? "All statuses" : statusConfig[s]?.label}
              </FilterChip>
            ))}
          </div>
        </FilterSection>

        {/* By Property Type */}
        <FilterSection
          title="Property type"
          icon={<LayoutGrid size={13} className="text-[#C8922A]" />}
        >
          <div className="space-y-0.5">
            {(["all", "apartment", "villa", "office", "commercial"] as const).map((t) => (
              <FilterChip
                key={t}
                active={typeFilter === t}
                onClick={() => setTypeFilter(t)}
                count={typeCounts[t] ?? 0}
              >
                {t === "all" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}
              </FilterChip>
            ))}
          </div>
        </FilterSection>

        {/* By Client — only in global mode, only show clients with projects */}
        {!routeClientId && clientsWithProjects.length > 0 && (
          <FilterSection
            title="Client"
            icon={<Users size={13} className="text-[#C8922A]" />}
          >
            <div className="space-y-0.5 max-h-52 overflow-y-auto">
              <FilterChip
                active={clientFilter === "all"}
                onClick={() => setClientFilter("all")}
                count={projects.length}
              >
                All clients
              </FilterChip>
              {clientsWithProjects.map((c) => (
                <FilterChip
                  key={c.id}
                  active={clientFilter === c.id}
                  onClick={() => setClientFilter(c.id)}
                  count={clientCounts.get(c.id) ?? 0}
                >
                  <span className="truncate">{c.full_name}</span>
                </FilterChip>
              ))}
            </div>
          </FilterSection>
        )}
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#EDE8DF] bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-[#9A8F82] hover:text-[#1C1C1C] hover:bg-[#F5F0E8] transition-colors"
              title="Toggle filters"
            >
              <SlidersHorizontal size={18} />
            </button>

            <div>
              <h1 className="text-[22px] font-bold text-[#1C1C1C] leading-tight">
                {routeClientId ? "Client Projects" : "Projects"}
              </h1>
              <p className="text-[#9A8F82] text-[13px]">
                {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
                {activeFilterCount > 0 && (
                  <span className="ml-1 text-[#C8922A]">· {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => { setFormData(emptyForm); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-[#C8922A] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#B07A20] transition-all shadow-sm shadow-[#C8922A]/20"
          >
            <Plus size={16} /> New Project
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8">
          {loading ? (
            <div className="flex justify-center mt-24">
              <Loader2 className="animate-spin text-[#C8922A]" size={36} />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center mt-24 gap-3">
              <p className="text-red-500 text-[14px] font-medium">{error}</p>
              <button
                onClick={fetchProjects}
                className="px-4 py-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold rounded-lg"
              >
                Retry
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-24 gap-2 text-[#9A8F82]">
              <LayoutGrid size={36} className="text-[#D5CEC6]" />
              <p className="text-[15px] font-medium">No projects found</p>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="text-[13px] text-[#C8922A] hover:underline mt-1">
                  Clear filters
                </button>
              )}
            </div>
          ) : groupedProjects ? (
            <div className="space-y-10">
              {groupedProjects.map((group) => (
                <div key={group.clientName}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#FEF3E2] flex items-center justify-center text-[12px] font-bold text-[#C8922A]">
                      {group.clientName[0]?.toUpperCase()}
                    </div>
                    <span className="text-[14px] font-bold text-[#1C1C1C]">{group.clientName}</span>
                    <span className="text-[11px] bg-[#F3EFE8] text-[#9A8F82] px-2 py-0.5 rounded-full font-medium">
                      {group.items.length}
                    </span>
                    <div className="flex-1 h-px bg-[#EDE8DF]" />
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {group.items.map((p) => (
                      <ProjectCard
                        key={p.id ?? `${p.name}-${p.start_date}`}
                        p={p}
                        deletingId={deletingId}
                        onEdit={() => openEditModal(p)}
                        onDelete={(e) => handleDelete(p, e)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {filteredProjects.map((p) => (
                <ProjectCard
                  key={p.id ?? `${p.name}-${p.start_date}`}
                  p={p}
                  deletingId={deletingId}
                  onEdit={() => openEditModal(p)}
                  onDelete={(e) => handleDelete(p, e)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-[#F5F2ED] flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-[18px] font-bold text-[#1C1C1C]">
                {formData.id ? "Edit Project" : "New Project"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-[#9A8F82] hover:text-black hover:bg-[#F5F0E8]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {!routeClientId && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-widest">Client</label>
                  <select
                    required
                    value={resolveClientId(formData.client)}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="w-full border border-[#EDE8DF] rounded-xl p-3 text-[14px] outline-none bg-white focus:border-[#C8922A]"
                  >
                    <option value="" disabled>Select client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-widest">Project Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-[#EDE8DF] rounded-xl p-3 text-[14px] outline-none focus:border-[#C8922A]"
                    placeholder="Enter project name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-widest">Property Type</label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full border border-[#EDE8DF] rounded-xl p-3 text-[14px] outline-none bg-white focus:border-[#C8922A]"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="villa">Villa</option>
                    <option value="office">Office</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-widest">Area (sqft)</label>
                  <input
                    type="number"
                    value={formData.area_sqft || ""}
                    onChange={(e) => setFormData({ ...formData, area_sqft: e.target.value })}
                    className="w-full border border-[#EDE8DF] rounded-xl p-3 text-[14px] outline-none focus:border-[#C8922A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-widest">Budget Range</label>
                  <input
                    value={formData.budget_range}
                    onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                    className="w-full border border-[#EDE8DF] rounded-xl p-3 text-[14px] outline-none focus:border-[#C8922A]"
                    placeholder="e.g. 5–8 Lakhs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-widest">Start Date</label>
                  <input type="date" value={formData.start_date || ""} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full border border-[#EDE8DF] rounded-xl p-3 text-[14px] outline-none focus:border-[#C8922A]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-widest">End Date</label>
                  <input type="date" value={formData.expected_end_date || ""} onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })} className="w-full border border-[#EDE8DF] rounded-xl p-3 text-[14px] outline-none focus:border-[#C8922A]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#9A8F82] uppercase tracking-widest">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-[#EDE8DF] rounded-xl p-3 text-[14px] outline-none bg-white focus:border-[#C8922A]"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-[#EDE8DF] text-[#6B6259] rounded-xl font-bold text-[13px] hover:bg-[#FAF7F3]">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-[#C8922A] text-white rounded-xl font-bold text-[13px] hover:bg-[#B07A20] shadow-sm shadow-[#C8922A]/20">
                  {formData.id ? "Update Project" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}