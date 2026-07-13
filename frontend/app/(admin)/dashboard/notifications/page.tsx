"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Receipt, FileText, IndianRupee, ScrollText,
  FolderKanban, Wrench, Image as ImageIcon, Loader2,
  ChevronLeft, ChevronRight, CheckCheck, Trash2, Bell,
  AlertCircle,
} from "lucide-react";
import {
  fetchNotifications, fetchUnreadCount, markAsRead,
  markAllAsRead, deleteNotification, InAppNotification,
} from "@/lib/notifications";

// ── Event type → icon + colour map ───────────────────────────────────────────
// BUG FIX: Added project_*, service_*, portfolio_* entries that were missing
const EVENT_TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  client_created:       { icon: Users,        color: "#D97706", bg: "#FEF3C7", label: "New Client"         },
  invoice_created:      { icon: Receipt,      color: "#059669", bg: "#D1FAE5", label: "Invoice Created"    },
  invoice_sent:         { icon: Receipt,      color: "#2563EB", bg: "#DBEAFE", label: "Invoice Sent"       },
  invoice_paid:         { icon: Receipt,      color: "#059669", bg: "#D1FAE5", label: "Invoice Paid"       },
  quotation_created:    { icon: FileText,     color: "#2563EB", bg: "#DBEAFE", label: "Quotation Created"  },
  quotation_approved:   { icon: FileText,     color: "#059669", bg: "#D1FAE5", label: "Quote Approved"     },
  quotation_rejected:   { icon: FileText,     color: "#DC2626", bg: "#FEE2E2", label: "Quote Rejected"     },
  payment_received:     { icon: IndianRupee,  color: "#7C3AED", bg: "#EDE9FE", label: "Payment Received"   },
  proposal_created:     { icon: ScrollText,   color: "#0D9488", bg: "#CCFBF1", label: "Proposal Created"   },
  proposal_sent:        { icon: ScrollText,   color: "#0D9488", bg: "#CCFBF1", label: "Proposal Sent"      },
  proposal_accepted:    { icon: ScrollText,   color: "#059669", bg: "#D1FAE5", label: "Proposal Accepted"  },
  proposal_rejected:    { icon: ScrollText,   color: "#DC2626", bg: "#FEE2E2", label: "Proposal Rejected"  },
  project_created:      { icon: FolderKanban, color: "#C8922A", bg: "#FDF3E3", label: "Project Created"    },
  project_status_changed:{ icon: FolderKanban,color: "#F59E0B", bg: "#FFFBEB", label: "Project Updated"   },
  service_created:      { icon: Wrench,       color: "#6366F1", bg: "#EEF2FF", label: "Service Added"      },
  portfolio_created:    { icon: ImageIcon,    color: "#EC4899", bg: "#FCE7F3", label: "Portfolio Added"    },
  enquiry_received:     { icon: Bell,         color: "#9A8F82", bg: "#F5F2ED", label: "New Enquiry"        },
};

// BUG FIX: Filter options — "invoice" / "quotation" etc. are prefix-group values
// that the backend now supports via regex match (^invoice, ^quotation, ...)
const EVENT_TYPE_FILTERS = [
  { label: "All Types",  value: ""                },
  { label: "Clients",    value: "client_created"  },
  { label: "Invoices",   value: "invoice"         },
  { label: "Quotations", value: "quotation"       },
  { label: "Payments",   value: "payment_received"},
  { label: "Proposals",  value: "proposal"        },
  { label: "Projects",   value: "project"         },
  { label: "Services",   value: "service_created" },
  { label: "Portfolio",  value: "portfolio_created"},
];

function getRelativeTime(dateStr: string): string {
  const diffMs  = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);
  if (diffSec < 60)  return "just now";
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffHr  < 24)  return `${diffHr}h ago`;
  if (diffDay <  7)  return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Status badge ──────────────────────────────────────────────────────────────
function EventBadge({ eventType }: { eventType: string }) {
  const cfg = EVENT_TYPE_CONFIG[eventType];
  if (!cfg) return null;
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]         = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typeFilter, setTypeFilter]   = useState("");
  const [readFilter, setReadFilter]   = useState<"all" | "unread" | "read">("all");
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { page?: number; limit?: number; type?: string; is_read?: boolean } = {
        page,
        limit: 20,
      };
      if (typeFilter) params.type = typeFilter;
      if (readFilter === "unread") params.is_read = false;
      if (readFilter === "read")   params.is_read = true;

      const data = await fetchNotifications(params);
      setNotifications(data.notifications || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, readFilter]);

  const loadUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(await fetchUnreadCount());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  // Mark single as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  // Delete single notification
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  };

  const getIconConfig = (eventType: string) =>
    EVENT_TYPE_CONFIG[eventType] || { icon: Bell, color: "#9A8F82", bg: "#F5F2ED", label: eventType };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#1C1C1C] tracking-tight">Notifications</h1>
          <p className="text-[13px] text-[#9A8F82] mt-1">
            {total} total&nbsp;·&nbsp;
            <span className={unreadCount > 0 ? "text-[#C8922A] font-semibold" : ""}>
              {unreadCount} unread
            </span>
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-[#C8922A] bg-[#FDF3E3] rounded-xl hover:bg-[#F5E6C8] transition-colors"
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="text-[12px] text-[#6B6259] bg-white border border-[#EDE8DF] rounded-lg px-3 py-2 outline-none font-medium cursor-pointer focus:border-[#C8922A]"
        >
          {EVENT_TYPE_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Read / Unread toggle */}
        <div className="flex items-center bg-white border border-[#EDE8DF] rounded-lg overflow-hidden">
          {(["all", "unread", "read"] as const).map(val => (
            <button
              key={val}
              onClick={() => { setReadFilter(val); setPage(1); }}
              className={`px-3 py-2 text-[12px] font-medium capitalize transition-colors ${
                readFilter === val
                  ? "bg-[#FDF3E3] text-[#C8922A] font-bold"
                  : "text-[#6B6259] hover:bg-[#FAF8F5]"
              }`}
            >
              {val}
            </button>
          ))}
        </div>

        {/* Active filter indicators */}
        {(typeFilter || readFilter !== "all") && (
          <button
            onClick={() => { setTypeFilter(""); setReadFilter("all"); setPage(1); }}
            className="text-[11px] text-[#9A8F82] hover:text-[#C8922A] font-medium transition-colors"
          >
            Clear filters ×
          </button>
        )}
      </div>

      {/* ── Notification list ── */}
      <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 size={20} className="animate-spin text-[#C8922A]" />
            <span className="text-[13px] text-[#9A8F82]">Loading notifications...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle size={22} className="text-red-500" />
            </div>
            <p className="text-[14px] text-red-600 font-medium">{error}</p>
            <button
              onClick={loadNotifications}
              className="text-[12px] text-[#C8922A] font-bold hover:underline"
            >
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div className="w-14 h-14 rounded-full bg-[#FAF8F5] flex items-center justify-center mb-1">
              <Bell size={24} className="text-[#D4C5A9]" />
            </div>
            <p className="text-[14px] text-[#6B6259] font-semibold">No notifications found</p>
            <p className="text-[12px] text-[#9A8F82]">
              {typeFilter || readFilter !== "all"
                ? "Try adjusting your filters"
                : "Activity notifications will appear here"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F2ED]">
            {notifications.map(notification => {
              const cfg  = getIconConfig(notification.event_type);
              const Icon = cfg.icon;
              const isDeleting = deletingId === notification.id;

              return (
                <div
                  key={notification.id}
                  className={`group flex items-start gap-4 px-5 py-4 hover:bg-[#FAF8F5] transition-colors cursor-pointer ${
                    !notification.is_read ? "bg-[#FDFAF6]" : ""
                  } ${isDeleting ? "opacity-40 pointer-events-none" : ""}`}
                  onClick={() => { if (!notification.is_read) handleMarkAsRead(notification.id); }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    <Icon size={17} style={{ color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-[#1C1C1C] truncate">
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#C8922A] flex-shrink-0" />
                      )}
                      <EventBadge eventType={notification.event_type} />
                    </div>
                    <p className="text-[12px] text-[#6B6259] mt-0.5 line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                    <p className="text-[11px] text-[#C8B89C] mt-1 font-medium">
                      {getRelativeTime(notification.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.is_read && (
                      <button
                        onClick={e => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                        title="Mark as read"
                        className="p-1.5 rounded-lg hover:bg-[#EDE8DF] text-[#9A8F82] hover:text-[#C8922A] transition-colors"
                      >
                        <CheckCheck size={13} />
                      </button>
                    )}
                    <button
                      onClick={e => handleDelete(notification.id, e)}
                      title="Delete notification"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#9A8F82] hover:text-red-500 transition-colors"
                    >
                      {isDeleting
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-[#9A8F82] font-medium">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-2 text-[12px] font-medium text-[#6B6259] bg-white border border-[#EDE8DF] rounded-lg hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-[12px] font-semibold rounded-lg transition-colors ${
                    p === page
                      ? "bg-[#C8922A] text-white"
                      : "text-[#6B6259] hover:bg-[#FAF8F5] border border-[#EDE8DF]"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-2 text-[12px] font-medium text-[#6B6259] bg-white border border-[#EDE8DF] rounded-lg hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
