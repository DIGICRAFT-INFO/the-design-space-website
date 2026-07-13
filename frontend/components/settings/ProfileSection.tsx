"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  Trash2,
  User,
} from "lucide-react";
import {
  changePassword,
  deleteAvatar,
  getCurrentUser,
  getProfileImageUrl,
  updateProfile,
  uploadAvatar,
  type User as UserProfile,
} from "@/services/authService";

type ToastFn = (message: string, type: "success" | "error") => void;

export default function ProfileSection({
  onProfileUpdate,
  showToast,
}: {
  onProfileUpdate?: (user: UserProfile) => void;
  showToast: ToastFn;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setProfile(user);
        setFullName(user.full_name || "");
        setEmail(user.email || "");
        setPhone(user.phone || "");
      })
      .catch(() => showToast("Failed to load profile", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const avatarUrl = getProfileImageUrl(profile?.profile_image);

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      showToast("Full name cannot be empty", "error");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      setProfile(updated);
      onProfileUpdate?.(updated);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: updated }));
      showToast("Profile updated successfully", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword) {
      showToast("Please enter your current password", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password changed successfully", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Password change failed", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("Only PNG, JPG, JPEG or WEBP images allowed", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5 MB", "error");
      return;
    }

    setUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(file);
      setProfile(updated);
      onProfileUpdate?.(updated);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: updated }));
      showToast("Profile photo updated", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const updated = await deleteAvatar();
      setProfile(updated);
      onProfileUpdate?.(updated);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: updated }));
      showToast("Profile photo removed", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Remove failed", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#C8922A]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Avatar & Identity ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#EDE8DF] p-6">
        <h2 className="text-[16px] font-semibold mb-5">My Profile</h2>

        {/* Avatar row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6">
          <div className="relative shrink-0 self-start">
            <div className="w-24 h-24 rounded-full bg-[#FDF3E3] border-2 border-[#EDE8DF] overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={36} className="text-[#C8922A]" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              title="Upload profile photo"
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#C8922A] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#B07A20] disabled:opacity-50 transition-colors"
            >
              {uploadingAvatar ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#1C1C1C] truncate">
              {profile?.full_name}
            </p>
            <p className="text-[13px] text-[#9A8F82] truncate">{profile?.email}</p>
            {profile?.phone && (
              <p className="text-[12px] text-[#9A8F82] mt-0.5">{profile.phone}</p>
            )}
            <span className="inline-block mt-1 text-[11px] font-semibold text-[#C8922A] capitalize bg-[#FDF3E3] px-2 py-0.5 rounded-full">
              {profile?.role}
            </span>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="mt-2 text-[12px] text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={12} /> Remove photo
              </button>
            )}
          </div>
        </div>

        {/* Edit fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Full Name */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
              Full Name
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]"
              />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                maxLength={200}
                className="w-full border border-[#EDE8DF] rounded-lg pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
              Email Address
            </label>
            <div className="relative">
              <Mail
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-[#EDE8DF] rounded-lg pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] transition-colors"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
              Phone{" "}
              <span className="font-normal text-[#C8B89C] normal-case">(optional)</span>
            </label>
            <div className="relative">
              <Phone
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                maxLength={20}
                className="w-full border border-[#EDE8DF] rounded-lg pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-[#C8922A] transition-colors"
              />
            </div>
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
              Role
            </label>
            <div className="w-full border border-[#EDE8DF] rounded-lg px-3 py-2.5 text-[13px] bg-[#FAF8F5] text-[#9A8F82] capitalize">
              {profile?.role || "—"}
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="mt-5 flex items-center gap-2 bg-[#C8922A] text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-[#B07A20] disabled:opacity-50 transition-colors"
        >
          {savingProfile ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Save Profile
        </button>
      </div>

      {/* ── Change Password ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#EDE8DF] p-6">
        <h2 className="text-[16px] font-semibold mb-1">Change Password</h2>
        <p className="text-[12px] text-[#9A8F82] mb-5">
          Use a strong password with at least 8 characters
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Current password */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
              Current Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F82]" />
              <input
                type={showOldPw ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full border border-[#EDE8DF] rounded-lg pl-9 pr-9 py-2.5 text-[13px] outline-none focus:border-[#C8922A] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowOldPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8F82] hover:text-[#C8922A] text-[11px]"
              >
                {showOldPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-[#EDE8DF] rounded-lg px-3 pr-9 py-2.5 text-[13px] outline-none focus:border-[#C8922A] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8F82] hover:text-[#C8922A] text-[11px]"
              >
                {showNewPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6259] mb-1.5 uppercase">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-[#EDE8DF] rounded-lg px-3 pr-9 py-2.5 text-[13px] outline-none focus:border-[#C8922A] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8F82] hover:text-[#C8922A] text-[11px]"
              >
                {showConfirmPw ? "Hide" : "Show"}
              </button>
            </div>
            {/* Match indicator */}
            {confirmPassword && newPassword && (
              <p
                className={`text-[11px] mt-1 ${
                  newPassword === confirmPassword ? "text-green-500" : "text-red-500"
                }`}
              >
                {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={savingPassword || !oldPassword || !newPassword || !confirmPassword}
          className="mt-5 flex items-center gap-2 bg-[#1C1C1C] text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-[#333] disabled:opacity-50 transition-colors"
        >
          {savingPassword ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Lock size={14} />
          )}
          Update Password
        </button>
      </div>
    </div>
  );
}
