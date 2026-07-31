"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Trash2, Shield, ShieldOff, ShieldCheck, Edit2, X,
  Loader2, Save, Eye, EyeOff, User, Mail, Key,
  CheckSquare, Square, Users, AlertTriangle, Search,
  RefreshCw, Calendar, Clock,
} from "lucide-react";
import {
  listManagedUsers, createManagedUser, updateManagedUser,
  deleteManagedUser, grantAccess, revokeAccess, updatePageAccess,
  PAGE_GROUPS, PAGE_LABELS, ALL_PAGE_KEYS,
  type ManagedUser, type PageKey,
} from "@/services/rbacService";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  owner:      { label: "Owner",      cls: "bg-amber-100 text-amber-700 border-amber-300" },
  manager:    { label: "Manager",    cls: "bg-blue-100 text-blue-700 border-blue-300" },
  accountant: { label: "Accountant", cls: "bg-purple-100 text-purple-700 border-purple-300" },
  designer:   { label: "Designer",   cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
};
const ROLES = [
  { value: "designer",   label: "Designer" },
  { value: "accountant", label: "Accountant" },
  { value: "manager",    label: "Manager" },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastMsg = { text: string; type: "success" | "error" | "info" };
function Toast({ msg, onClose }: { msg: ToastMsg; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const bg = { success: "bg-emerald-500", error: "bg-red-500", info: "bg-[#C8922A]" }[msg.type];
  return (
    <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-[13px] font-semibold ${bg}`}>
      {msg.text}
      <button onClick={onClose} className="opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ─── Page Access Checklist ────────────────────────────────────────────────────
function PageAccessChecklist({ selected, onChange }: { selected: PageKey[]; onChange: (k: PageKey[]) => void }) {
  function toggle(key: PageKey) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }
  function toggleGroup(keys: PageKey[]) {
    const all = keys.every((k) => selected.includes(k));
    onChange(all ? selected.filter((k) => !keys.includes(k)) : Array.from(new Set([...selected, ...keys])));
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange([...ALL_PAGE_KEYS])} className="text-[11px] font-bold text-[#C8922A] hover:underline">Select All</button>
        <span className="text-[#EDE8DF]">·</span>
        <button type="button" onClick={() => onChange([])} className="text-[11px] font-bold text-[#9A8F82] hover:underline">Clear All</button>
        <span className="ml-auto text-[11px] text-[#9A8F82] font-medium">{selected.length}/{ALL_PAGE_KEYS.length} selected</span>
      </div>
      {PAGE_GROUPS.map((group) => {
        const allSel = group.keys.every((k) => selected.includes(k));
        const someSel = group.keys.some((k) => selected.includes(k));
        return (
          <div key={group.label} className="border border-[#EDE8DF] rounded-xl overflow-hidden">
            <button type="button" onClick={() => toggleGroup(group.keys)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#FAF8F5] text-left hover:bg-[#F5F1EA] transition-colors">
              {allSel ? <CheckSquare size={14} className="text-[#C8922A]" /> : someSel ? <CheckSquare size={14} className="text-[#C8922A]/50" /> : <Square size={14} className="text-[#9A8F82]" />}
              <span className="text-[12px] font-bold text-[#2B2620]">{group.label}</span>
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-3">
              {group.keys.map((key) => (
                <button key={key} type="button" onClick={() => toggle(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                    selected.includes(key) ? "bg-[#FDF3E3] text-[#C8922A] border-[#C8922A]/40" : "bg-white text-[#6B6259] border-[#EDE8DF] hover:border-[#C8922A]/30"
                  }`}>
                  {selected.includes(key) ? <CheckSquare size={11} /> : <Square size={11} />}
                  {PAGE_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function UserModal({ mode, existing, onClose, onSaved }: {
  mode: "create" | "edit"; existing?: ManagedUser;
  onClose: () => void; onSaved: (u: ManagedUser) => void;
}) {
  const [form, setForm] = useState({
    full_name: existing?.full_name ?? "",
    email: existing?.email ?? "",
    password: "",
    role: existing?.role ?? "designer",
    page_access: (existing?.page_access ?? []) as PageKey[],
  });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "create" && !form.password) { setError("Password is required."); return; }
    if (form.password && form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSaving(true);
    try {
      let saved: ManagedUser;
      if (mode === "create") {
        saved = await createManagedUser({ email: form.email, full_name: form.full_name, password: form.password, role: form.role, page_access: form.page_access });
      } else {
        const patch: Parameters<typeof updateManagedUser>[1] = { full_name: form.full_name, email: form.email, role: form.role, page_access: form.page_access };
        if (form.password) patch.new_password = form.password;
        saved = await updateManagedUser(existing!.id, patch);
      }
      onSaved(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl my-8 shadow-2xl border border-[#EDE8DF]">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EDE8DF]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FDF3E3] flex items-center justify-center">
              <Shield size={16} className="text-[#C8922A]" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#1C1C1C]">
                {mode === "create" ? "Create New Admin" : `Edit — ${existing?.full_name}`}
              </h2>
              <p className="text-[11px] text-[#9A8F82]">
                {mode === "create" ? "Instantly active with selected page access" : "Update details and permissions"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[#9A8F82] hover:text-[#1C1C1C] hover:bg-[#FAF8F5] rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-red-600 text-[12px]">
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#6B6259] uppercase tracking-wider mb-1.5 block">Full Name *</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                <input required className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] text-[13px] focus:outline-none focus:border-[#C8922A] transition-colors"
                  placeholder="Admin's full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#6B6259] uppercase tracking-wider mb-1.5 block">Email Address *</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                <input required type="email" className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] text-[13px] focus:outline-none focus:border-[#C8922A] transition-colors"
                  placeholder="admin@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Password + Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#6B6259] uppercase tracking-wider mb-1.5 block">
                {mode === "create" ? "Password *" : "New Password"}
              </label>
              <div className="relative">
                <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                <input type={showPw ? "text" : "password"} required={mode === "create"} minLength={8}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] text-[13px] focus:outline-none focus:border-[#C8922A] transition-colors"
                  placeholder="Min. 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8F82] hover:text-[#1C1C1C]">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#6B6259] uppercase tracking-wider mb-1.5 block">Role</label>
              <select className="w-full px-3.5 py-2.5 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] text-[13px] focus:outline-none focus:border-[#C8922A] transition-colors"
                value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* Page Access */}
          <div>
            <label className="text-[11px] font-bold text-[#6B6259] uppercase tracking-wider mb-2 block">
              Page Access Permissions <span className="font-normal text-[#9A8F82] normal-case">— select which pages this admin can see</span>
            </label>
            <PageAccessChecklist selected={form.page_access} onChange={(keys) => setForm({ ...form, page_access: keys })} />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#EDE8DF]">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-[13px] font-semibold text-[#6B6259] hover:text-[#1C1C1C] transition-colors rounded-xl hover:bg-[#FAF8F5]">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-bold rounded-xl transition-all disabled:opacity-60 shadow-sm">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {mode === "create" ? "Create Admin" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Manage Access Drawer ─────────────────────────────────────────────────────
function AccessDrawer({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: (u: ManagedUser) => void }) {
  const [keys, setKeys] = useState<PageKey[]>([...user.page_access]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const updated = await updatePageAccess(user.id, keys);
      onSaved(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl border-l border-[#EDE8DF] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-[#EDE8DF] px-6 py-5 flex items-center justify-between z-10">
          <div>
            <h2 className="text-[15px] font-bold text-[#1C1C1C] flex items-center gap-2">
              <Shield size={15} className="text-[#C8922A]" /> Manage Access
            </h2>
            <p className="text-[11px] text-[#9A8F82] mt-0.5">{user.full_name} · {user.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[#9A8F82] hover:text-[#1C1C1C] hover:bg-[#FAF8F5] rounded-lg">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 flex-1">
          {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-[12px] mb-4"><AlertTriangle size={13} />{error}</div>}
          <PageAccessChecklist selected={keys} onChange={setKeys} />
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#EDE8DF] px-5 py-4">
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-bold rounded-xl transition-all disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Access Permissions
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AccessControlPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; user?: ManagedUser } | null>(null);
  const [drawer, setDrawer] = useState<ManagedUser | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [granting, setGranting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await listManagedUsers()); }
    catch (err: unknown) { setToast({ text: err instanceof Error ? err.message : "Failed to load users", type: "error" }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRevoke(user: ManagedUser) {
    if (!confirm(`Revoke ALL access for "${user.full_name}"?\n\nThey will be force-logged-out on their next action.`)) return;
    setRevoking(user.id);
    try {
      await revokeAccess(user.id);
      setToast({ text: `Access revoked for ${user.full_name}`, type: "info" });
      await load();
    } catch (err: unknown) { setToast({ text: err instanceof Error ? err.message : "Revoke failed", type: "error" }); }
    finally { setRevoking(null); }
  }

  async function handleGrant(user: ManagedUser) {
    setGranting(user.id);
    try {
      await grantAccess(user.id, { page_access: user.page_access });
      setToast({ text: `Access granted to ${user.full_name}`, type: "success" });
      await load();
    } catch (err: unknown) { setToast({ text: err instanceof Error ? err.message : "Grant failed", type: "error" }); }
    finally { setGranting(null); }
  }

  async function handleDelete(user: ManagedUser) {
    if (!confirm(`Permanently delete "${user.full_name}"?\n\nThis cannot be undone.`)) return;
    setDeleting(user.id);
    try {
      await deleteManagedUser(user.id);
      setToast({ text: `"${user.full_name}" deleted`, type: "info" });
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: unknown) { setToast({ text: err instanceof Error ? err.message : "Delete failed", type: "error" }); }
    finally { setDeleting(null); }
  }

  const activeCount  = users.filter((u) => u.is_active).length;
  const revokedCount = users.filter((u) => !u.is_active).length;
  const filtered = users.filter((u) =>
    !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 pb-24">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {modal && (
        <UserModal mode={modal.mode} existing={modal.user} onClose={() => setModal(null)}
          onSaved={(saved) => {
            setToast({ text: modal.mode === "create" ? `"${saved.full_name}" created with access` : "User updated", type: "success" });
            setModal(null); load();
          }} />
      )}

      {drawer && (
        <AccessDrawer user={drawer} onClose={() => setDrawer(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
            setToast({ text: "Page access updated", type: "success" });
            setDrawer(null);
          }} />
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#1C1C1C] flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#C8922A]" /> Admin Management
          </h1>
          <p className="text-[12px] text-[#9A8F82] mt-0.5">Manage admin accounts &amp; page access permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="w-9 h-9 flex items-center justify-center text-[#9A8F82] hover:text-[#1C1C1C] border border-[#EDE8DF] rounded-xl hover:bg-[#FAF8F5] transition-colors disabled:opacity-50" title="Refresh">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setModal({ mode: "create" })}
            className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm">
            <Plus size={15} /> New Admin
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Total Admins", value: users.length, cls: "text-[#C8922A]", bg: "bg-[#FDF3E3]" },
          { label: "Active",       value: activeCount,  cls: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Revoked",      value: revokedCount, cls: "text-red-500",     bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border border-[#EDE8DF] rounded-2xl px-5 py-4`}>
            <p className={`text-3xl font-black ${s.cls}`}>{s.value}</p>
            <p className="text-[11px] text-[#9A8F82] font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
        <input type="text" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs pl-9 pr-4 py-2.5 rounded-xl border border-[#EDE8DF] bg-white text-[13px] focus:outline-none focus:border-[#C8922A] transition-colors" />
        {search && <button onClick={() => setSearch("")} className="absolute left-[calc(theme(maxWidth.xs)+0px)] top-1/2 hidden sm:block -translate-y-1/2 text-[#9A8F82] hover:text-[#1C1C1C]"><X size={13} /></button>}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#9A8F82]">
            <Loader2 className="animate-spin mr-2" size={20} /> Loading admins…
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center">
            <Users size={32} className="mx-auto text-[#D6D0C8] mb-3" />
            <p className="text-[14px] font-semibold text-[#6B6259]">No admins yet</p>
            <p className="text-[12px] text-[#9A8F82] mt-1">Click &ldquo;New Admin&rdquo; to create the first one</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[#EDE8DF] bg-[#FAF8F5]">
              {["Admin", "Role", "Pages", "Status", "Created", "Actions"].map((h) => (
                <p key={h} className="text-[10px] font-black text-[#9A8F82] uppercase tracking-wider">{h}</p>
              ))}
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <p className="text-center py-10 text-[13px] text-[#9A8F82]">No admins match &ldquo;{search}&rdquo;</p>
            ) : (
              filtered.map((user, idx) => {
                const role = ROLE_CONFIG[user.role] ?? { label: user.role, cls: "bg-gray-100 text-gray-600 border-gray-200" };
                return (
                  <div key={user.id}
                    className={`md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] md:gap-4 px-5 py-4 items-center flex flex-col gap-2 sm:flex-row sm:flex-wrap
                      ${idx < filtered.length - 1 ? "border-b border-[#EDE8DF]" : ""}
                      ${!user.is_active ? "bg-red-50/40" : "hover:bg-[#FAF8F5]"} transition-colors`}>

                    {/* Admin info */}
                    <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-black shrink-0 ${user.is_active ? "bg-[#C8922A]" : "bg-[#9A8F82]"}`}>
                        {initials(user.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#1C1C1C] truncate">{user.full_name}</p>
                        <p className="text-[11px] text-[#9A8F82] truncate">{user.email}</p>
                      </div>
                    </div>

                    {/* Role badge */}
                    <div>
                      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${role.cls}`}>
                        {role.label}
                      </span>
                    </div>

                    {/* Pages */}
                    <div>
                      <button onClick={() => setDrawer(user)}
                        className="text-[12px] font-semibold text-[#C8922A] hover:underline">
                        {user.page_access.length === ALL_PAGE_KEYS.length ? "All pages" : `${user.page_access.length} pages`}
                      </button>
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                        {user.is_active ? "Active" : "Revoked"}
                      </span>
                    </div>

                    {/* Created */}
                    <div className="text-[11px] text-[#9A8F82] flex items-center gap-1">
                      <Calendar size={11} />
                      {fmtDate(user.created_at)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => setDrawer(user)} title="Manage access"
                        className="p-1.5 text-[#9A8F82] hover:text-[#C8922A] hover:bg-[#FDF3E3] rounded-lg transition-colors">
                        <Shield size={14} />
                      </button>
                      <button onClick={() => setModal({ mode: "edit", user })} title="Edit user"
                        className="p-1.5 text-[#9A8F82] hover:text-[#C8922A] hover:bg-[#FDF3E3] rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      {user.is_active ? (
                        <button onClick={() => handleRevoke(user)} disabled={revoking === user.id} title="Revoke access"
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                          {revoking === user.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
                        </button>
                      ) : (
                        <button onClick={() => handleGrant(user)} disabled={granting === user.id} title="Grant access"
                          className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50">
                          {granting === user.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        </button>
                      )}
                      <button onClick={() => handleDelete(user)} disabled={deleting === user.id} title="Delete permanently"
                        className="p-1.5 text-[#9A8F82] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                        {deleting === user.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-[#9A8F82]">
        <span className="flex items-center gap-1.5"><Shield size={12} className="text-[#C8922A]" /> Manage access permissions</span>
        <span className="flex items-center gap-1.5"><ShieldOff size={12} className="text-red-400" /> Revoke — user force-logged-out instantly</span>
        <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500" /> Grant access back</span>
        <span className="flex items-center gap-1.5"><Clock size={12} /> Revocation takes effect on next API request</span>
      </div>
    </div>
  );
}
