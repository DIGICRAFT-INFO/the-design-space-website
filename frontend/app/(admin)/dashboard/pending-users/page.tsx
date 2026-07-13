"use client";

import { useEffect, useState } from "react";
import { Check, X, Users, ShieldAlert, AlertCircle, Lock } from "lucide-react";
import API_BASE_URL from "@/lib/config";
import LoadingState from "@/components/ui/LoadingState";

interface AppUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function UserManagementPage() {
  const [pendingUsers, setPendingUsers] = useState<AppUser[]>([]);
  const [activeUsers, setActiveUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "active">("pending");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Fetch all users data
  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch pending users
      const pendingRes = await fetch(`${API_BASE_URL}/auth/manager/pending-users/`, { headers });
      const pendingData = await pendingRes.json();
      if (pendingRes.ok) {
        setPendingUsers(Array.isArray(pendingData) ? pendingData : pendingData.results || pendingData.data || []);
      }

      // Fetch all active users
      const activeRes = await fetch(`${API_BASE_URL}/auth/manager/all-users/`, { headers });
      const activeData = await activeRes.json();
      if (activeRes.ok) {
        const users = Array.isArray(activeData) ? activeData : activeData.results || activeData.data || [];
        setActiveUsers(users.filter((u: AppUser) => u.is_active !== false));
      }
    } catch (err) {
      setMessage({ text: "Failed to load users", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Auto-clear message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Action: Approve or Reject Pending User
  const handlePendingAction = async (id: string, action: "approve" | "reject") => {
    try {
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      const method = action === "approve" ? "PUT" : "DELETE";
      const url = `${API_BASE_URL}/auth/manager/${action}/${id}/`;

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ text: `User ${action}d successfully!`, type: "success" });
        setPendingUsers(pendingUsers.filter((u) => u.id !== id));
        
        // If approved, add to active users
        if (action === "approve") {
          const user = pendingUsers.find((u) => u.id === id);
          if (user) setActiveUsers([...activeUsers, { ...user, is_active: true }]);
        }
      } else {
        setMessage({ text: data.detail || "Action failed", type: "error" });
      }
    } catch {
      setMessage({ text: "Something went wrong", type: "error" });
    }
  };

  // Action: Revoke/Deactivate Active User Access
  const handleRevokeAccess = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this user's access? They won't be able to login anymore.")) return;

    try {
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      // Try deactivate endpoint (more common for deactivating users)
      const url = `${API_BASE_URL}/auth/manager/deactivate/${id}/`;

      const res = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ text: "User access revoked successfully!", type: "success" });
        setActiveUsers(activeUsers.filter((u) => u.id !== id));
        
        // If the revoked user is the current logged-in user, logout after 2 seconds
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (currentUser.id === id) {
          setTimeout(() => {
            localStorage.clear();
            window.location.href = "/login?revoked=true";
          }, 2000);
        }
      } else {
        setMessage({ text: data.detail || "Failed to revoke access - please contact backend administrator", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Connection error - revoke endpoint may not exist yet", type: "error" });
    }
  };

  if (loading) {
    return <LoadingState message="Loading user management..." />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-[26px] font-extrabold text-[#1C1C1C] tracking-tight">User Management</h1>
        <p className="text-[14px] text-[#9A8F82] mt-1 font-medium">Approve new users and manage active user access.</p>
      </div>

      {/* Revoke endpoint warning */}
      {revokeError && (
        <div className="p-4 rounded-lg text-sm font-medium flex items-center gap-3 bg-[#FEF2F2] text-[#7F1D1D] border border-[#FECACA]">
          <AlertCircle size={18} className="shrink-0" />
          <span>{revokeError}</span>
          <button onClick={() => setRevokeError(null)} className="ml-auto text-[#DC2626] hover:text-[#991b1b]">×</button>
        </div>
      )}

      {message.text && (
        <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-3 ${message.type === "success" ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]" : "bg-[#FEF2F2] text-[#7F1D1D] border border-[#FECACA]"}`}>
          <AlertCircle size={18} className="shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-0 bg-white rounded-xl border border-[#EDE8DF] p-1 w-fit">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-6 py-2.5 rounded-lg font-semibold text-[13px] transition-all ${
            activeTab === "pending"
              ? "bg-[#FDF3E3] text-[#C8922A]"
              : "text-[#6B6259] hover:text-[#1C1C1C]"
          }`}
        >
          Pending Users {pendingUsers.length > 0 && <span className="ml-2 text-[11px] bg-[#EF4444] text-white px-2 py-0.5 rounded-full">{pendingUsers.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`px-6 py-2.5 rounded-lg font-semibold text-[13px] transition-all ${
            activeTab === "active"
              ? "bg-[#FDF3E3] text-[#C8922A]"
              : "text-[#6B6259] hover:text-[#1C1C1C]"
          }`}
        >
          Active Users {activeUsers.length > 0 && <span className="ml-2 text-[11px] bg-[#10B981] text-white px-2 py-0.5 rounded-full">{activeUsers.length}</span>}
        </button>
      </div>

      {/* Pending Users Tab */}
      {activeTab === "pending" && (
        <div>
          {pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-[#EDE8DF] text-center">
              <Users size={40} className="text-[#EDE8DF] mb-3" />
              <p className="text-[14px] font-semibold text-[#1C1C1C]">No pending approval requests</p>
              <p className="text-[12px] text-[#9A8F82] mt-1\">All registration requests have been processed.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EDE8DF] text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">
                    <th className="px-6 py-4 text-left">Full Name</th>
                    <th className="px-6 py-4 text-left">Email</th>
                    <th className="px-6 py-4 text-left">Requested Role</th>
                    <th className="px-6 py-4 text-left">Registration Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F2ED]">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#FAF8F5]/50 transition-colors text-[13px] text-[#1C1C1C]">
                      <td className="px-6 py-4 font-medium">{user.full_name}</td>
                      <td className="px-6 py-4 text-[#6B6259]">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1.5 bg-[#FDF3E3] text-[#C8922A] text-[11px] font-bold rounded-lg uppercase">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#9A8F82]">
                        {new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handlePendingAction(user.id, "approve")}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-[12px] rounded-lg transition-colors"
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handlePendingAction(user.id, "reject")}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-semibold text-[12px] rounded-lg border border-[#FECACA] transition-colors"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Active Users Tab */}
      {activeTab === "active" && (
        <div>
          {activeUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-[#EDE8DF] text-center">
              <Users size={40} className="text-[#EDE8DF] mb-3" />
              <p className="text-[14px] font-semibold text-[#1C1C1C]">No active users</p>
              <p className="text-[12px] text-[#9A8F82] mt-1">Approve pending users to activate their accounts.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EDE8DF] text-[11px] font-bold text-[#9A8F82] uppercase tracking-wider">
                    <th className="px-6 py-4 text-left">Full Name</th>
                    <th className="px-6 py-4 text-left">Email</th>
                    <th className="px-6 py-4 text-left">Role</th>
                    <th className="px-6 py-4 text-left">Approval Date</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F2ED]">
                  {activeUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#FAF8F5]/50 transition-colors text-[13px] text-[#1C1C1C]">
                      <td className="px-6 py-4 font-medium">{user.full_name}</td>
                      <td className="px-6 py-4 text-[#6B6259]">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1.5 bg-[#EFF6FF] text-[#3B82F6] text-[11px] font-bold rounded-lg uppercase">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#9A8F82]">
                        {new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1.5 bg-[#ECFDF5] text-[#059669] text-[11px] font-bold rounded-lg uppercase">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRevokeAccess(user.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-semibold text-[12px] rounded-lg border border-[#FECACA] transition-colors"
                        >
                          <Lock size={14} /> Revoke Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}