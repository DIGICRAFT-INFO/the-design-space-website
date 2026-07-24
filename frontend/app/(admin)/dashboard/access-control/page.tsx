"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Trash2, Shield, ShieldOff, ShieldCheck, Edit2, X,
  Loader2, Save, Eye, EyeOff, Calendar, User, Mail, Key,
  CheckSquare, Square, Users, AlertTriangle,
} from "lucide-react";
import {
  listManagedUsers, createManagedUser, updateManagedUser,
  deleteManagedUser, grantAccess, revokeAccess, updatePageAccess,
  PAGE_GROUPS, PAGE_LABELS, ALL_PAGE_KEYS,
  type ManagedUser, type PageKey,
} from "@/services/rbacService";

// ─── Toast ───────────────────────────────────────────────────────────────────
type ToastMsg = { text: string; type: "success" | "error" | "info" };

function Toast({ msg, onClose }: { msg: ToastMsg; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const bg = { success: "bg-emerald-500", error: "bg-red-500", info: "bg-[#C8922A]" }[msg.type];
  return (
    <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-[13px] font-semibold ${bg}`}>
      {msg.text}
      <button onClick={onClose}><X size={14} /></button>
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] text-[13px] focus:outline-none focus:border-[#C8922A] transition-colors";
const labelCls = "text-[11px] font-bold text-[#6B6259] uppercase tracking-wider mb-1.5 block";

const ROLES = [
  { value: "designer", label: "Designer" },
  { value: "accountant", label: "Accountant" },
  { value: "manager", label: "Manager" },
];

// ─── Page Access Checklist ────────────────────────────────────────────────────
function PageAccessChecklist({
  selected,
  onChange,
}: {
  selected: PageKey[];
  onChange: (keys: PageKey[]) => void;
}) {
  function toggle(key: PageKey) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }
  function toggleGroup(keys: PageKey[]) {
    const allSelected = keys.every((k) => selected.includes(k));
    if (allSelected) {
      onChange(selected.filter((k) => !keys.includes(k)));
    } else {
      const merged = Array.from(new Set([...selected, ...keys]));
      onChange(merged);
    }
  }
  function selectAll() { onChange([...ALL_PAGE_KEYS]); }
  function clearAll() { onChange([]); }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={selectAll} className="text-[11px] font-bold text-[#C8922A] hover:underline">Select All</button>
        <span className="text-[#EDE8DF]">|</span>
        <button type="button" onClick={clearAll} className="text-[11px] font-bold text-[#9A8F82] hover:underline">Clear All</button>
        <span className="ml-auto text-[11px] text-[#9A8F82]">{selected.length}/{ALL_PAGE_KEYS.length} selected</span>
      </div>
      {PAGE_GROUPS.map((group) => {
        const allSel = group.keys.every((k) => selected.includes(k));
        const someSel = group.keys.some((k) => selected.includes(k));
        return (
          <div key={group.label} className="border border-[#EDE8DF] rounded-xl p-4">
            <button
              type="button"
              onClick={() => toggleGroup(group.keys)}
              className="flex items-center gap-2 w-full text-left mb-3"
            >
              {allSel ? (
                <CheckSquare size={15} className="text-[#C8922A]" />
              ) : someSel ? (
                <CheckSquare size={15} className="text-[#C8922A]/50" />
              ) : (
                <Square size={15} className="text-[#9A8F82]" />
              )}
              <span className="text-[12px] font-bold text-[#2B2620]">{group.label}</span>
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              {group.keys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    selected.includes(key)
                      ? "bg-[#FDF3E3] text-[#C8922A] border border-[#C8922A]/30"
                      : "bg-white text-[#6B6259] border border-[#EDE8DF] hover:border-[#C8922A]/30"
                  }`}
                >
                  {selected.includes(key) ? <CheckSquare size={12} /> : <Square size={12} />}
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

// ─── Create/Edit Modal ────────────────────────────────────────────────────────
function UserModal({
  mode,
  existing,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  existing?: ManagedUser;
  onClose: () => void;
  onSaved: (u: ManagedUser) => void;
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
    setSaving(true);
    try {
      let saved: ManagedUser;
      if (mode === "create") {
        if (!form.password) { setError("Password is required."); setSaving(false); return; }
        saved = await createManagedUser({
          email: form.email,
          full_name: form.full_name,
          password: form.password,
          role: form.role,
          page_access: form.page_access,
        });
      } else {
        const patch: Parameters<typeof updateManagedUser>[1] = {
          full_name: form.full_name,
          email: form.email,
          role: form.role,
          page_access: form.page_access,
        };
        if (form.password) patch.new_password = form.password;
        saved = await updateManagedUser(existing!.id, patch);
      }
      onSaved(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-[#EDE8DF] px-6 py-5 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-[16px] font-bold text-[#1C1C1C]">
              {mode === "create" ? "Add New User" : "Edit User"}
            </h2>
            <p className="text-[12px] text-[#9A8F82] mt-0.5">
              {mode === "create" ? "User will be instantly active with selected access" : "Update user details and page access"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[#9A8F82] hover:text-[#1C1C1C] hover:bg-[#FAF8F5] rounded-xl">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-[12px]">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name *</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                <input required className={`${inputCls} pl-9`} placeholder="Rajesh Kumar" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email Address *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                <input required type="email" className={`${inputCls} pl-9`} placeholder="rajesh@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{mode === "create" ? "Password *" : "New Password (leave blank to keep)"}</label>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                <input
                  type={showPw ? "text" : "password"}
                  required={mode === "create"}
                  minLength={8}
                  className={`${inputCls} pl-9 pr-10`}
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8F82]">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={`${labelCls} mb-3`}>Page Access — Select which pages this user can see</label>
            <PageAccessChecklist selected={form.page_access} onChange={(keys) => setForm({ ...form, page_access: keys })} />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#EDE8DF]">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-[13px] font-semibold text-[#6B6259] hover:text-[#1C1C1C] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-bold rounded-xl transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {mode === "create" ? "Create User & Grant Access" : "Save Changes"}
            </button>
          </div>
        </form>
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
  const [revoking, setRevoking] = useState<string | null>(null);
  const [granting, setGranting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedAccess, setExpandedAccess] = useState<string | null>(null);
  const [editingAccess, setEditingAccess] = useState<{ id: string; keys: PageKey[] } | null>(null);
  const [savingAccess, setSavingAccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listManagedUsers();
      setUsers(data);
    } catch (err: unknown) {
      setToast({ text: err instanceof Error ? err.message : "Failed to load users", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRevoke(user: ManagedUser) {
    if (!confirm(`Revoke ALL access for "${user.full_name}"? They will be logged out immediately.`)) return;
    setRevoking(user.id);
    try {
      await revokeAccess(user.id);
      setToast({ text: `Access revoked for ${user.full_name}`, type: "info" });
      await load();
    } catch (err: unknown) {
      setToast({ text: err instanceof Error ? err.message : "Revoke failed", type: "error" });
    } finally {
      setRevoking(null);
    }
  }

  async function handleGrant(user: ManagedUser) {
    setGranting(user.id);
    try {
      await grantAccess(user.id, { page_access: user.page_access });
      setToast({ text: `Access granted to ${user.full_name}`, type: "success" });
      await load();
    } catch (err: unknown) {
      setToast({ text: err instanceof Error ? err.message : "Grant failed", type: "error" });
    } finally {
      setGranting(null);
    }
  }

  async function handleDelete(user: ManagedUser) {
    if (!confirm(`Permanently delete "${user.full_name}"? This cannot be undone.`)) return;
    setDeleting(user.id);
    try {
      await deleteManagedUser(user.id);
      setToast({ text: `User "${user.full_name}" deleted`, type: "info" });
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: unknown) {
      setToast({ text: err instanceof Error ? err.message : "Delete failed", type: "error" });
    } finally {
      setDeleting(null);
    }
  }

  async function handleSaveAccess() {
    if (!editingAccess) return;
    setSavingAccess(true);
    try {
      const updated = await updatePageAccess(editingAccess.id, editingAccess.keys);
      setToast({ text: "Page access updated", type: "success" });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingAccess(null);
      setExpandedAccess(null);
    } catch (err: unknown) {
      setToast({ text: err instanceof Error ? err.message : "Update failed", type: "error" });
    } finally {
      setSavingAccess(false);
    }
  }

  const activeCount = users.filter((u) => u.is_active).length;
  const revokedCount = users.filter((u) => !u.is_active).length;

  return (
    <div className="max-w-5xl mx-auto p-4 pb-24">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      {modal && (
        <UserModal
          mode={modal.mode}
          existing={modal.user}
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            setToast({ text: modal.mode === "create" ? `User "${saved.full_name}" created with access` : "User updated", type: "success" });
            setModal(null);
            load();
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1C1C1C] flex items-center gap-2">
            <ShieldCheck size={22} className="text-[#C8922A]" /> Access Control
          </h1>
          <p className="text-[13px] text-[#9A8F82] mt-0.5">
            Manage user access — grant/revoke page-level permissions in real time
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <Plus size={15} /> Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Users", value: users.length, color: "text-[#1C1C1C]", icon: <Users size={16} className="text-[#9A8F82]" /> },
          { label: "Active Access", value: activeCount, color: "text-emerald-600", icon: <ShieldCheck size={16} className="text-emerald-500" /> },
          { label: "Revoked", value: revokedCount, color: "text-red-500", icon: <ShieldOff size={16} className="text-red-400" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#EDE8DF] rounded-2xl p-4 flex items-center gap-3">
            {s.icon}
            <div>
              <p className="text-[11px] text-[#9A8F82] font-semibold uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#9A8F82]">
          <Loader2 className="animate-spin mr-2" size={22} /> Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#EDE8DF] rounded-3xl py-16 text-center">
          <Users size={36} className="mx-auto text-[#EDE8DF] mb-3" />
          <p className="text-[14px] font-semibold text-[#6B6259]">No users yet</p>
          <p className="text-[12px] text-[#9A8F82] mt-1">Click "Add User" to create the first managed user</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${user.is_active ? "border-[#EDE8DF]" : "border-red-200 bg-red-50/30"}`}>
              {/* User row */}
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px] shrink-0 ${user.is_active ? "bg-[#C8922A]" : "bg-[#9A8F82]"}`}>
                  {user.full_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-[#1C1C1C] truncate">{user.full_name}</span>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                    }`}>
                      {user.is_active ? "Active" : "Revoked"}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FDF3E3] text-[#C8922A]">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#9A8F82] mt-0.5 flex items-center gap-3 flex-wrap">
                    <span>{user.email}</span>
                    {user.access_granted_at && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(user.access_granted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    )}
                    <span className="text-[10px]">{user.page_access.length} pages</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (expandedAccess === user.id) {
                        setExpandedAccess(null);
                        setEditingAccess(null);
                      } else {
                        setExpandedAccess(user.id);
                        setEditingAccess({ id: user.id, keys: [...user.page_access] });
                      }
                    }}
                    className="px-3 py-1.5 text-[11px] font-bold text-[#6B6259] hover:text-[#C8922A] bg-[#FAF8F5] hover:bg-[#FDF3E3] border border-[#EDE8DF] rounded-lg transition-colors"
                  >
                    {expandedAccess === user.id ? "Close" : "Manage Access"}
                  </button>

                  <button onClick={() => setModal({ mode: "edit", user })} className="p-2 text-[#9A8F82] hover:text-[#C8922A] hover:bg-[#FDF3E3] rounded-lg transition-colors" title="Edit">
                    <Edit2 size={14} />
                  </button>

                  {user.is_active ? (
                    <button
                      onClick={() => handleRevoke(user)}
                      disabled={revoking === user.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {revoking === user.id ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
                      Revoke
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGrant(user)}
                      disabled={granting === user.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {granting === user.id ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                      Grant
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(user)}
                    disabled={deleting === user.id}
                    className="p-2 text-[#9A8F82] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-60"
                    title="Delete permanently"
                  >
                    {deleting === user.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded Access Editor */}
              {expandedAccess === user.id && editingAccess && (
                <div className="border-t border-[#EDE8DF] p-5 bg-[#FAF8F5]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-bold text-[#2B2620] flex items-center gap-1.5">
                      <Shield size={14} className="text-[#C8922A]" /> Page Access for {user.full_name}
                    </h3>
                    <button
                      onClick={handleSaveAccess}
                      disabled={savingAccess}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-bold rounded-xl transition-all disabled:opacity-60"
                    >
                      {savingAccess ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Save Access
                    </button>
                  </div>
                  <PageAccessChecklist
                    selected={editingAccess.keys}
                    onChange={(keys) => setEditingAccess({ id: user.id, keys })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
