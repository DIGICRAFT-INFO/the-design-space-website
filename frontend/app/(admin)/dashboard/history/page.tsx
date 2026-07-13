"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Download,
  Eye,
  Filter,
  Clock,
  FileText,
  Receipt,
  CreditCard,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import API_BASE_URL from "@/lib/config";

// ── Types ─────────────────────────────────────────────────────────────────────
interface NotificationLog {
  id: string;
  channel: "whatsapp" | "email";
  doc_type: "invoice" | "quotation" | "reminder" | "proposal";
  doc_id: string;
  recipient: string;
  status: "sent" | "failed" | "pending";
  error: string;
  wa_message_id: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const iconForDocType = (docType: string) => {
  switch (docType) {
    case "invoice":
      return { icon: Receipt, color: "#C8922A", bg: "#FDF3E3" };
    case "quotation":
      return { icon: FileText, color: "#10B981", bg: "#ECFDF5" };
    case "payment":
    case "reminder":
      return { icon: CreditCard, color: "#3B82F6", bg: "#EFF6FF" };
    case "proposal":
      return { icon: FileText, color: "#8B5CF6", bg: "#F5F3FF" };
    default:
      return { icon: Users, color: "#F59E0B", bg: "#FFFBEB" };
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case "sent":
      return "bg-green-50 text-green-600";
    case "failed":
      return "bg-red-50 text-red-600";
    case "pending":
      return "bg-amber-50 text-amber-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [limit, setLimit] = useState(25);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLogs = useCallback(
    async (append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const token = getToken();
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const params = new URLSearchParams();
        if (typeFilter) params.set("doc_type", typeFilter);

        const res = await fetch(
          `${API_BASE_URL}/notifications/logs/${params.toString() ? "?" + params.toString() : ""}`,
          { headers: getAuthHeaders() }
        );

        if (res.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("access_token");
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        if (!res.ok)
          throw new Error(`Failed to load activity logs: ${res.status}`);

        const data = await res.json();
        const allLogs: NotificationLog[] = Array.isArray(data)
          ? data
          : data.results ?? [];

        // Client-side pagination (API returns all sorted by -created_at)
        const currentLimit = append ? limit : 25;
        const sliced = allLogs.slice(0, currentLimit);
        setLogs(sliced);
        setHasMore(allLogs.length > currentLimit);
      } catch (e: any) {
        setError(e.message || "Failed to load activity logs");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [typeFilter, limit]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleLoadMore = () => {
    setLimit((prev) => prev + 25);
  };

  // Re-fetch when limit changes
  useEffect(() => {
    if (limit > 25) {
      fetchLogs(true);
    }
  }, [limit]);

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.doc_type.toLowerCase().includes(q) ||
      log.recipient.toLowerCase().includes(q) ||
      log.channel.toLowerCase().includes(q) ||
      log.doc_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1C1C1C]">
            Document History
          </h1>
          <p className="text-[13px] text-[#9A8F82] mt-0.5">
            Complete audit trail of all notification activity
          </p>
        </div>
        <button
          onClick={() => fetchLogs()}
          className="flex items-center gap-2 bg-white border border-[#EDE8DF] text-[#6B6259] text-[13px] font-medium px-4 py-2.5 rounded-lg hover:bg-[#FAF8F5]"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-[#EDE8DF] rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-[#9A8F82]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient, type..."
            className="bg-transparent text-[13px] outline-none flex-1 placeholder-[#9A8F82]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-[#EDE8DF] rounded-lg px-3 py-2 text-[13px] text-[#6B6259] outline-none cursor-pointer"
        >
          <option value="">All Types</option>
          <option value="invoice">Invoice</option>
          <option value="quotation">Quotation</option>
          <option value="proposal">Proposal</option>
          <option value="reminder">Reminder</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-[#C8922A]" size={32} />
          <p className="text-[#9A8F82] text-sm font-medium">
            Loading activity logs...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-red-500 text-[14px] font-medium">{error}</p>
          <button
            onClick={() => fetchLogs()}
            className="mt-2 px-4 py-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Timeline Table */}
          <div className="bg-white rounded-xl border border-[#EDE8DF]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EDE8DF] bg-[#FAF8F5]">
                  {[
                    "Document",
                    "Type",
                    "Channel",
                    "Recipient",
                    "Status",
                    "Timestamp",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[11px] font-semibold text-[#9A8F82] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-16 text-center text-[#9A8F82] text-[13px]"
                    >
                      No activity logs found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => {
                    const iconConf = iconForDocType(log.doc_type);
                    const Icon = iconConf.icon;
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-[#F5F2ED] last:border-0 hover:bg-[#FAF8F5] transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: iconConf.bg }}
                            >
                              <Icon
                                size={14}
                                style={{ color: iconConf.color }}
                              />
                            </div>
                            <span className="text-[13px] font-semibold text-[#1C1C1C] truncate max-w-[140px]">
                              {log.doc_id.substring(0, 8)}...
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-[#6B6259] capitalize">
                          {log.doc_type}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[12px] font-medium text-[#1C1C1C] capitalize">
                            {log.channel}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-[#6B6259] truncate max-w-[180px]">
                          {log.recipient}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${statusBadge(log.status)}`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-[12px] text-[#9A8F82]">
                            <Clock size={11} />
                            {new Date(log.created_at).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}{" "}
                            ·{" "}
                            {new Date(log.created_at).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-[#EDE8DF] text-[#6B6259] text-[13px] font-semibold rounded-lg hover:bg-[#FAF8F5] transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}

          {/* Footer info */}
          <div className="mt-4 text-[12px] text-[#9A8F82] text-center">
            Showing {filtered.length} log{filtered.length !== 1 ? "s" : ""}
          </div>
        </>
      )}
    </div>
  );
}
