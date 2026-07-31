"use client";

import { useEffect, useRef, useState } from "react";
import {
  User, Mail, Phone, Shield, Camera, Trash2, Save, Key,
  Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, Lock,
  Calendar, Clock, ChevronRight,
} from "lucide-react";
import {
  getCurrentUser, updateProfile, changePassword,
  uploadAvatar, deleteAvatar, getProfileImageUrl,
  type User as UserType,
} from "@/services/authService";
import { PAGE_LABELS, type PageKey } from "@/services/rbacService";

// ─── Toast ───────────────────────────────────────────────────────────────────
type ToastState = { message: string; type: "success" | "error" } | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-[13px] font-semibold transition-all ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}>
      {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
      {toast.message}
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-[#EDE8DF] bg-[#FAF8F5] text-[13px] focus:outline-none focus:border-[#C8922A] transition-colors placeholder:text-[#B0A69A]";
const labelCls = "text-[11px] font-bold text-[#6B6259] uppercase tracking-wider mb-1.5 block";
const errCls = "text-[11px] text-red-500 mt-1 flex items-center gap-1";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-[#FDF3E3] text-[#C8922A] border-[#C8922A]/30",
  manager: "bg-blue-50 text-blue-700 border-blue-200",
  accountant: "bg-purple-50 text-purple-700 border-purple-200",
  designer: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner / Superadmin",
  manager: "Manager",
  accountant: "Accountant",
  designer: "Designer",
};

// ─── Avatar Section ───────────────────────────────────────────────────────────
function AvatarSection({ user, onUpdate }: { user: UserType; onUpdate: (u: UserType) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [err, setErr] = useState("");
  const avatarUrl = getProfileImageUrl(user.profile_image);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Client-side validation
    if (file.size > 5 * 1024 * 1024) { setErr("File must be under 5 MB."); return; }
    if (file.size < 1024) { setErr("File too small — must be at least 1 KB."); return; }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["png", "jpg", "jpeg", "webp"].includes(ext ?? "")) { setErr("Only PNG, JPG, JPEG, or WEBP allowed."); return; }
    setErr("");
    setUploading(true);
    try {
      const updated = await uploadAvatar(file);
      onUpdate(updated);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: updated }));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const updated = await deleteAvatar();
      onUpdate(updated);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: updated }));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar circle */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-[#C8922A] flex items-center justify-center text-white text-3xl font-black overflow-hidden ring-4 ring-[#FDF3E3]">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={user.full_name} className="w-full h-full object-cover" onError={() => onUpdate({ ...user, profile_image: null })} />
          ) : (
            user.full_name?.charAt(0).toUpperCase() || "U"
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-7 h-7 bg-[#C8922A] hover:bg-[#B07A20] text-white rounded-full flex items-center justify-center shadow-md transition-colors"
          title="Change photo"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFile} />

      <div className="text-center">
        <p className="text-[13px] font-bold text-[#1C1C1C]">{user.full_name}</p>
        <p className="text-[11px] text-[#9A8F82]">{user.email}</p>
        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border mt-1.5 ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </div>

      {avatarUrl && (
        <button
          onClick={handleRemove}
          disabled={removing}
          className="flex items-center gap-1.5 text-[11px] text-red-500 hover:text-red-600 font-semibold transition-colors"
        >
          {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Remove photo
        </button>
      )}
      {err && <p className="text-[11px] text-red-500 text-center">{err}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  // Profile form state
  const [profile, setProfile] = useState({ full_name: "", email: "", phone: "" });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form state
  const [pw, setPw] = useState({ old: "", new: "", confirm: "" });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u);
        setProfile({ full_name: u.full_name, email: u.email, phone: u.phone ?? "" });
      })
      .catch(() => setToast({ message: "Failed to load profile", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  function handleUserUpdate(updated: UserType) {
    setUser(updated);
    setProfile({ full_name: updated.full_name, email: updated.email, phone: updated.phone ?? "" });
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileErrors({});
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ full_name: profile.full_name, email: profile.email, phone: profile.phone });
      handleUserUpdate(updated);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: updated }));
      setToast({ message: "Profile updated successfully", type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      if (msg.toLowerCase().includes("email")) {
        setProfileErrors({ email: msg });
      } else {
        setToast({ message: msg, type: "error" });
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!pw.old) errs.old = "Current password is required.";
    if (pw.new.length < 8) errs.new = "Password must be at least 8 characters.";
    if (pw.new === pw.old) errs.new = "New password must be different from current password.";
    if (pw.new !== pw.confirm) errs.confirm = "Passwords do not match.";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwErrors({});
    setSavingPw(true);
    try {
      await changePassword(pw.old, pw.new);
      setPw({ old: "", new: "", confirm: "" });
      setToast({ message: "Password changed successfully", type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Password change failed";
      if (msg.toLowerCase().includes("current") || msg.toLowerCase().includes("old")) {
        setPwErrors({ old: msg });
      } else {
        setPwErrors({ new: msg });
      }
    } finally {
      setSavingPw(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9A8F82]">
        <Loader2 className="animate-spin mr-2" size={22} /> Loading profile…
      </div>
    );
  }

  if (!user) return null;

  const pageAccess = (user as UserType & { page_access?: string[] }).page_access ?? [];

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="flex items-center gap-2 text-[#9A8F82] text-[12px]">
        <span>Dashboard</span>
        <ChevronRight size={12} />
        <span className="text-[#1C1C1C] font-semibold">My Profile</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

        {/* Left column — Avatar + meta */}
        <div className="space-y-4">
          {/* Avatar card */}
          <div className="bg-white border border-[#EDE8DF] rounded-2xl p-6 flex flex-col items-center">
            <AvatarSection user={user} onUpdate={handleUserUpdate} />
          </div>

          {/* Account meta */}
          <div className="bg-white border border-[#EDE8DF] rounded-2xl p-5 space-y-3">
            <h3 className="text-[12px] font-bold text-[#6B6259] uppercase tracking-wider">Account Info</h3>
            <div className="space-y-2">
              {[
                { icon: <Calendar size={12} />, label: "Member since", value: user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                { icon: <Clock size={12} />, label: "Role", value: ROLE_LABELS[user.role] ?? user.role },
                { icon: <Lock size={12} />, label: "Account status", value: (user as UserType & { is_active?: boolean }).is_active !== false ? "Active" : "Inactive" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-2.5">
                  <span className="text-[#9A8F82] mt-0.5 shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-[10px] text-[#9A8F82]">{item.label}</p>
                    <p className="text-[12px] font-semibold text-[#1C1C1C]">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Page Permissions (read-only) */}
          {pageAccess.length > 0 && (
            <div className="bg-white border border-[#EDE8DF] rounded-2xl p-5">
              <h3 className="text-[12px] font-bold text-[#6B6259] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Shield size={13} className="text-[#C8922A]" /> My Permissions
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {pageAccess.map((key) => (
                  <span key={key} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-[#FDF3E3] text-[#C8922A] border border-[#C8922A]/20">
                    {PAGE_LABELS[key as PageKey] ?? key}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — Forms */}
        <div className="space-y-5">

          {/* Edit Profile */}
          <div className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EDE8DF] bg-[#FAF8F5]">
              <h2 className="text-[15px] font-bold text-[#1C1C1C] flex items-center gap-2">
                <User size={16} className="text-[#C8922A]" /> Personal Information
              </h2>
              <p className="text-[12px] text-[#9A8F82] mt-0.5">Update your name, email and phone number</p>
            </div>
            <form onSubmit={handleProfileSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                    <input
                      required
                      className={`${inputCls} pl-9`}
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                    <input
                      required
                      type="email"
                      className={`${inputCls} pl-9 ${profileErrors.email ? "border-red-400" : ""}`}
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="you@example.com"
                    />
                  </div>
                  {profileErrors.email && <p className={errCls}><AlertTriangle size={11} /> {profileErrors.email}</p>}
                </div>
              </div>
              <div className="max-w-sm">
                <label className={labelCls}>Phone Number <span className="text-[#B0A69A] font-normal normal-case">(optional)</span></label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                  <input
                    className={`${inputCls} pl-9`}
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-[#EDE8DF]">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-bold rounded-xl transition-all disabled:opacity-60"
                >
                  {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EDE8DF] bg-[#FAF8F5]">
              <h2 className="text-[15px] font-bold text-[#1C1C1C] flex items-center gap-2">
                <Key size={16} className="text-[#C8922A]" /> Change Password
              </h2>
              <p className="text-[12px] text-[#9A8F82] mt-0.5">Use a strong password of at least 8 characters</p>
            </div>
            <form onSubmit={handlePasswordSave} className="p-6 space-y-4">
              {/* Current password */}
              <div>
                <label className={labelCls}>Current Password</label>
                <div className="relative max-w-sm">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                  <input
                    type={showOld ? "text" : "password"}
                    className={`${inputCls} pl-9 pr-10 ${pwErrors.old ? "border-red-400" : ""}`}
                    value={pw.old}
                    onChange={(e) => setPw({ ...pw, old: e.target.value })}
                    placeholder="Enter current password"
                  />
                  <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8F82]">
                    {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {pwErrors.old && <p className={errCls}><AlertTriangle size={11} /> {pwErrors.old}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* New password */}
                <div>
                  <label className={labelCls}>New Password</label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                    <input
                      type={showNew ? "text" : "password"}
                      minLength={8}
                      className={`${inputCls} pl-9 pr-10 ${pwErrors.new ? "border-red-400" : ""}`}
                      value={pw.new}
                      onChange={(e) => setPw({ ...pw, new: e.target.value })}
                      placeholder="Min 8 characters"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8F82]">
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {pwErrors.new && <p className={errCls}><AlertTriangle size={11} /> {pwErrors.new}</p>}
                </div>
                {/* Confirm */}
                <div>
                  <label className={labelCls}>Confirm New Password</label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
                    <input
                      type="password"
                      className={`${inputCls} pl-9 ${pwErrors.confirm ? "border-red-400" : ""}`}
                      value={pw.confirm}
                      onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                      placeholder="Re-enter new password"
                    />
                  </div>
                  {pwErrors.confirm && <p className={errCls}><AlertTriangle size={11} /> {pwErrors.confirm}</p>}
                </div>
              </div>

              {/* Strength indicator */}
              {pw.new && (
                <div className="max-w-sm">
                  <div className="flex gap-1 mb-1">
                    {[8, 10, 12].map((threshold, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${pw.new.length >= threshold ? ["bg-red-400", "bg-yellow-400", "bg-emerald-500"][i] : "bg-[#EDE8DF]"}`} />
                    ))}
                  </div>
                  <p className="text-[10px] text-[#9A8F82]">
                    {pw.new.length < 8 ? "Too short" : pw.new.length < 10 ? "Weak" : pw.new.length < 12 ? "Fair" : "Strong"}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-[#EDE8DF]">
                <button
                  type="submit"
                  disabled={savingPw}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#1C1C1C] hover:bg-[#2B2620] text-white text-[13px] font-bold rounded-xl transition-all disabled:opacity-60"
                >
                  {savingPw ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                  Update Password
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
