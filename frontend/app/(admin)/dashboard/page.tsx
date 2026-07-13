"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  FolderOpen,
  Receipt,
  IndianRupee,
  ExternalLink,
  Plus,
  TrendingUp,
  Briefcase,
  FileText,
  CreditCard,
  MessageSquare,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Bell,
  ChevronRight,
  BarChart3,
  Activity,
  ShieldAlert,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import API_BASE_URL from "@/lib/config";
import DateCalendarWidget from "@/components/dashboard/DateCalendarWidget";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  // KPIs from /dashboard/summary
  kpis: {
    total_invoiced: number;
    total_collected: number;
    outstanding: number;
    overdue_count: number;
    active_projects: number;
    total_clients: number;
    pending_quotations: number;
  };
  recent_invoices: any[];
  // supplementary
  projects: any[];
  proposals: any[];
  quotations: any[];
  payments: any[];
  enquiries: any[];
  notifications: any[];
}

// ─── Configs ──────────────────────────────────────────────────────────────────

const invoiceStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  issued:         { label: "Issued",    color: "#3B82F6", bg: "#EFF6FF" },
  paid:           { label: "Paid",      color: "#10B981", bg: "#ECFDF5" },
  overdue:        { label: "Overdue",   color: "#EF4444", bg: "#FEF2F2" },
  partial:        { label: "Partial",   color: "#F59E0B", bg: "#FFFBEB" },
  partially_paid: { label: "Partial",   color: "#F59E0B", bg: "#FFFBEB" },
  draft:          { label: "Draft",     color: "#6B7280", bg: "#F3F4F6" },
  cancelled:      { label: "Cancelled", color: "#9CA3AF", bg: "#F9FAFB" },
};

const projectStatusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active:    { label: "Active",    color: "#065F46", bg: "#D1FAE5", dot: "#10B981" },
  on_hold:   { label: "On Hold",   color: "#92400E", bg: "#FEF3C7", dot: "#F59E0B" },
  completed: { label: "Completed", color: "#374151", bg: "#F3F4F6", dot: "#9CA3AF" },
};

const enquiryStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  new:       { label: "New",       color: "#3B82F6", bg: "#EFF6FF" },
  contacted: { label: "Contacted", color: "#F59E0B", bg: "#FFFBEB" },
  converted: { label: "Converted", color: "#10B981", bg: "#ECFDF5" },
  lost:      { label: "Lost",      color: "#EF4444", bg: "#FEF2F2" },
};

const proposalStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: "Draft",    color: "#6B7280", bg: "#F3F4F6" },
  sent:     { label: "Sent",     color: "#3B82F6", bg: "#EFF6FF" },
  accepted: { label: "Accepted", color: "#10B981", bg: "#ECFDF5" },
  rejected: { label: "Rejected", color: "#EF4444", bg: "#FEF2F2" },
};

// ─── Chart Data: built from real invoices (no demo/static data) ──────────────
// Builds a trailing N-month series from actual invoice records so the graph
// always reflects whatever data currently exists — even if it's just the
// current month with one or two invoices.
function buildMonthlyTrend(invoices: any[], monthsBack = 6) {
  const now = new Date();
  const buckets: { key: string; month: string; invoiced: number; collected: number }[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString("en-IN", { month: "short" }),
      invoiced: 0,
      collected: 0,
    });
  }

  const bucketMap = new Map(buckets.map((b) => [b.key, b]));

  for (const inv of invoices) {
    const dateStr = inv.created_at || inv.due_date;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = bucketMap.get(key);
    if (!bucket) continue; // outside the trailing window
    bucket.invoiced += Number(inv.grand_total || 0);
    bucket.collected += Number(inv.amount_paid || 0);
  }

  // Convert to thousands (₹K) to keep the chart scale readable, matching tooltip labels
  return buckets.map((b) => ({
    month: b.month,
    invoiced: Math.round(b.invoiced / 1000),
    collected: Math.round(b.collected / 1000),
  }));
}

// ─── Helper: currency format ──────────────────────────────────────────────────
const fmtINR = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(1)}K`
    : `₹${n.toLocaleString("en-IN")}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#EDE8DF] rounded-xl px-4 py-3 shadow-lg text-xs">
        <p className="font-bold text-[#1C1C1C] mb-1.5">{label}</p>
        <p className="text-[#C8922A] font-medium">Invoiced: ₹{payload[0]?.value}K</p>
        <p className="text-[#10B981] font-medium">Collected: ₹{payload[1]?.value}K</p>
      </div>
    );
  }
  return null;
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
  border: string;
  href: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
}

function StatCard({ label, value, icon: Icon, color, bg, border, href, sub, trend }: StatCardProps) {
  return (
    <Link href={href}>
      <div
        className="bg-white rounded-2xl p-5 border hover:shadow-lg transition-all duration-200 group cursor-pointer"
        style={{ borderColor: border }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
            <Icon size={20} style={{ color }} />
          </div>
          <div className="flex items-center gap-1">
            {trend === "up" && <ArrowUpRight size={14} className="text-green-500" />}
            {trend === "down" && <ArrowDownRight size={14} className="text-red-400" />}
            <ChevronRight size={14} className="text-[#D5CEC6] group-hover:text-[#C8922A] transition-colors" />
          </div>
        </div>
        <p className="text-[28px] font-extrabold text-[#1C1C1C] leading-none">{value}</p>
        <p className="text-[12px] text-[#9A8F82] mt-1.5 font-semibold uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[11px] mt-1" style={{ color }}>{sub}</p>}
      </div>
    </Link>
  );
}

function SectionHeader({ title, sub, href, linkLabel = "View all" }: { title: string; sub?: string; href: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-[15px] font-bold text-[#1C1C1C]">{title}</h2>
        {sub && <p className="text-[11px] text-[#9A8F82] mt-0.5">{sub}</p>}
      </div>
      <Link href={href} className="flex items-center gap-1 text-[11px] text-[#C8922A] font-bold hover:underline uppercase tracking-wider">
        {linkLabel} <ExternalLink size={10} />
      </Link>
    </div>
  );
}

// ─── Mini Pie ─────────────────────────────────────────────────────────────────
function MiniPie({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="text-[12px] text-[#9A8F82] py-4 text-center">No data yet</p>;
  return (
    <div className="flex items-center gap-4">
      <PieChart width={80} height={80}>
        <Pie data={data} cx={35} cy={35} innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
      </PieChart>
      <div className="space-y-1.5 flex-1 min-w-0">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-[#6B6259]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              {d.name}
            </span>
            <span className="font-bold text-[#1C1C1C]">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyRow({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon size={28} className="text-[#EDE8DF] mb-2" />
      <p className="text-[12px] text-[#9A8F82] font-medium">{label}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [userName, setUserName] = useState("User");
  const [isApproved, setIsApproved] = useState(true);
  const [userRole, setUserRole] = useState<string>("designer");

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) {
        const userData = JSON.parse(u);
        setUserName(userData.full_name?.split(" ")[0] || "User");
        setUserRole(userData.role?.toLowerCase() || "designer");
        // Check if user is inactive
        if (userData.is_active === false) {
          setIsApproved(false);
        }
      }
    } catch {}
  }, []);

  // Auto-logout if account is revoked and redirect to login
  useEffect(() => {
    if (isApproved === false) {
      const timer = setTimeout(() => {
        localStorage.clear();
        window.location.href = "/login?revoked=true";
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isApproved]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Verify user is active before loading dashboard
      try {
        const authRes = await fetch(`${API_BASE_URL}/auth/me/`, { headers });
        if (authRes.status === 401 || authRes.status === 403) {
          setIsApproved(false);
          setLoading(false);
          return;
        }
        const authData = await authRes.json();
        if (authData.detail && authData.detail.toLowerCase().includes("inactive")) {
          setIsApproved(false);
          setLoading(false);
          return;
        }
        if (authData.is_active === false) {
          setIsApproved(false);
          setLoading(false);
          return;
        }
      } catch (authErr) {
        // If auth check fails, log it but continue
        console.warn("Auth verification failed:", authErr);
      }

      // Fetch in parallel — gracefully degrade each
      const [summaryRes, projectsRes, proposalsRes, quotationsRes, paymentsRes, enquiriesRes, notifRes] =
        await Promise.allSettled([
          fetch(`${API_BASE_URL}/dashboard/summary`, { headers }),
          fetch(`${API_BASE_URL}/clients/projects/`, { headers }),
          fetch(`${API_BASE_URL}/proposals`, { headers }),
          fetch(`${API_BASE_URL}/quotations`, { headers }),
          fetch(`${API_BASE_URL}/invoices?limit=20`, { headers }),
          fetch(`${API_BASE_URL}/enquiries`, { headers }),
          fetch(`${API_BASE_URL}/in-app-notifications?limit=5`, { headers }),
        ]);

      const safe = async (res: PromiseSettledResult<Response>) => {
        if (res.status !== "fulfilled" || !res.value.ok) return null;
        try { return await res.value.json(); } catch { return null; }
      };

      const summary     = await safe(summaryRes);
      const projJson    = await safe(projectsRes);
      const propJson    = await safe(proposalsRes);
      const quoteJson   = await safe(quotationsRes);
      const paymentsJson= await safe(paymentsRes);
      const enqJson     = await safe(enquiriesRes);
      const notifJson   = await safe(notifRes);

      const kpis = summary?.kpis ?? {
        total_invoiced: 0, total_collected: 0, outstanding: 0,
        overdue_count: 0, active_projects: 0, total_clients: 0, pending_quotations: 0,
      };

      const projects     = Array.isArray(projJson)  ? projJson  : (projJson?.results  ?? projJson?.data  ?? []);
      const proposals    = Array.isArray(propJson)  ? propJson  : (propJson?.results  ?? propJson?.data  ?? []);
      const quotations   = Array.isArray(quoteJson) ? quoteJson : (quoteJson?.results ?? quoteJson?.data ?? []);
      const payments     = Array.isArray(paymentsJson) ? paymentsJson : (paymentsJson?.results ?? paymentsJson?.data ?? []);
      const enquiries    = Array.isArray(enqJson)   ? enqJson   : (enqJson?.results   ?? enqJson?.data   ?? []);
      const notifications= notifJson?.notifications ?? (Array.isArray(notifJson) ? notifJson : notifJson?.data ?? []);

      const recentInvoices = (summary?.recent_invoices ?? []).map((inv: any) => ({
        id: inv.id,
        number: inv.invoice_number || "—",
        client: inv.project__client__full_name || inv.client_name || "—",
        project: inv.project__name || inv.project_name || "—",
        amount: fmtINR(Number(inv.grand_total || 0)),
        status: inv.status || "draft",
        date: inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—",
      }));

      setData({ kpis, recent_invoices: recentInvoices, projects, proposals, quotations, payments, enquiries, notifications });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F9F6F1] to-[#F5F2ED] p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border-2 border-[#E0D5C8] p-8 shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center">
              <ShieldAlert size={32} className="text-[#EF4444]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#1C1C1C] text-center mb-2">Account Pending Approval</h1>
          <p className="text-[14px] text-[#6B6259] text-center mb-6 leading-relaxed">
            Hello <span className="font-semibold text-[#1C1C1C]">{userName}</span>, your The Design Space portal account has been successfully registered but requires activation from the Manager before you can view financial KPIs and data.
          </p>
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FFFBEB] rounded-xl border border-[#FDE68A] mb-6">
            <Clock size={16} className="text-[#F59E0B] flex-shrink-0" />
            <span className="text-[12px] font-semibold text-[#92400E]">Status: Awaiting Verification</span>
          </div>
          <p className="text-[12px] text-[#9A8F82] text-center">
            Your account details have been saved. The Manager will review and activate your access shortly.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error)   return <ErrorState message={error} onRetry={fetchAll} />;
  if (!data)   return null;

  const { kpis, recent_invoices, projects, proposals, quotations, payments, enquiries, notifications } = data;

  const chartData = buildMonthlyTrend(payments, 6);
  const hasChartActivity = chartData.some((d) => d.invoiced > 0 || d.collected > 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // ── Derived stats ──────────────────────────────────────────────────────────

  const collectionRate = kpis.total_invoiced > 0
    ? Math.round((kpis.total_collected / kpis.total_invoiced) * 100)
    : 0;

  // Project breakdown
  const projectsByStatus = ["active", "on_hold", "completed"].map((s) => ({
    name: projectStatusConfig[s]?.label ?? s,
    value: projects.filter((p: any) => p.status === s).length,
    color: projectStatusConfig[s]?.dot ?? "#9CA3AF",
  }));

  // Enquiry breakdown
  const enquiriesByStatus = ["new", "contacted", "converted", "lost"].map((s) => ({
    name: enquiryStatusConfig[s]?.label ?? s,
    value: enquiries.filter((e: any) => e.status === s).length,
    color: { new: "#3B82F6", contacted: "#F59E0B", converted: "#10B981", lost: "#EF4444" }[s] ?? "#9CA3AF",
  }));

  // Recent projects (last 4)
  const recentProjects = [...projects]
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 4);

  // Recent enquiries (last 5)
  const recentEnquiries = [...enquiries]
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  // Recent proposals (last 4)
  const recentProposals = [...proposals]
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 4);

  // Recent quotations (last 4)
  const recentQuotations = [...quotations]
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 4);

  // Payment total collected
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount_paid || p.grand_total || 0), 0);
  const overdueInvoices = payments.filter((p: any) => p.status === "overdue");

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#1C1C1C] tracking-tight">
            {greeting}, {userName} 👋
          </h1>
          <p className="text-[14px] text-[#9A8F82] mt-1 font-medium">
            Here's the full picture of your business today.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <WeatherWidget />
          <DateCalendarWidget />
        </div>
      </div>

      {/* ── Alert Banner: overdue invoices ─────────────────────────────────── */}
      {kpis.overdue_count > 0 && (
        <Link href="/dashboard/invoices">
          <div className="flex items-center gap-3 bg-[#FEF2F2] border border-[#FECACA] rounded-2xl px-5 py-3.5 cursor-pointer hover:border-[#EF4444] transition-colors group">
            <AlertTriangle size={18} className="text-[#EF4444] flex-shrink-0" />
            <p className="text-[13px] font-semibold text-[#7F1D1D]">
              <span className="text-[#EF4444]">{kpis.overdue_count} invoice{kpis.overdue_count > 1 ? "s" : ""} overdue</span>
              {" "}— outstanding {fmtINR(kpis.outstanding)} needs attention.
            </p>
            <ChevronRight size={14} className="ml-auto text-[#EF4444] group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* ── KPI Cards Row 1: Financial ──────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-black text-[#9A8F82] uppercase tracking-widest mb-3">Financial Overview</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Invoiced" value={fmtINR(kpis.total_invoiced)} icon={Receipt} color="#C8922A" bg="#FDF3E3" border="#F5E6C8" href="/dashboard/invoices" trend="up" sub="All time" />
          <StatCard label="Collected" value={fmtINR(kpis.total_collected)} icon={CheckCircle2} color="#10B981" bg="#ECFDF5" border="#A7F3D0" href="/dashboard/payments" trend="up" sub={`${collectionRate}% collection rate`} />
          <StatCard label="Outstanding" value={fmtINR(kpis.outstanding)} icon={Clock} color="#F59E0B" bg="#FFFBEB" border="#FDE68A" href="/dashboard/invoices" trend="neutral" sub="Across active invoices" />
          <StatCard label="Overdue" value={`${kpis.overdue_count} inv.`} icon={AlertTriangle} color="#EF4444" bg="#FEF2F2" border="#FECACA" href="/dashboard/invoices" trend={kpis.overdue_count > 0 ? "down" : "neutral"} sub={kpis.overdue_count > 0 ? "Action required" : "All clear"} />
        </div>
      </div>

      {/* ── KPI Cards Row 2: Business ───────────────────────────────────────── */}
      {userRole !== "accountant" && (
        <div>
          <p className="text-[10px] font-black text-[#9A8F82] uppercase tracking-widest mb-3">Business Metrics</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Clients" value={kpis.total_clients} icon={Users} color="#8B5CF6" bg="#F5F3FF" border="#DDD6FE" href="/dashboard/clients" />
            <StatCard label="Active Projects" value={kpis.active_projects} icon={Briefcase} color="#3B82F6" bg="#EFF6FF" border="#BFDBFE" href="/dashboard/projects" />
            <StatCard label="Pending Quotations" value={kpis.pending_quotations} icon={FileText} color="#0D9488" bg="#F0FDFA" border="#99F6E4" href="/dashboard/quotations" />
            <StatCard label="Enquiries" value={enquiries.length} icon={MessageSquare} color="#EC4899" bg="#FDF2F8" border="#FBCFE8" href="/dashboard/enquiry" />
          </div>
        </div>
      )}

      {/* ── Chart + Activity ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EDE8DF] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-bold text-[#1C1C1C]">Performance Analytics</h2>
              <div className="flex items-center gap-5 mt-2">
                <span className="flex items-center gap-2 text-[11px] text-[#9A8F82] font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C8922A] inline-block" /> Invoiced
                </span>
                <span className="flex items-center gap-2 text-[11px] text-[#9A8F82] font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block" /> Collected
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-center px-3 py-1.5 bg-[#FDF3E3] rounded-xl">
                <p className="text-[10px] text-[#9A8F82] font-semibold uppercase">Rate</p>
                <p className="text-[16px] font-black text-[#C8922A]">{collectionRate}%</p>
              </div>
            </div>
          </div>
          {hasChartActivity ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8922A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#C8922A" stopOpacity={0} />
                  </linearGradient>sdf
                  <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9A8F82" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9A8F82" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="invoiced" stroke="#C8922A" strokeWidth={2.5} fill="url(#invoicedGrad)" dot={false} activeDot={{ r: 5, fill: "#C8922A", stroke: "#fff", strokeWidth: 2 }} />
                <Area type="monotone" dataKey="collected" stroke="#10B981" strokeWidth={2.5} fill="url(#collectedGrad)" dot={false} activeDot={{ r: 5, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <EmptyRow icon={BarChart3} label="No invoices in the last 6 months yet" />
            </div>
          )}
        </div>

        {/* Notifications Feed */}
        <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6">
          <SectionHeader title="Recent Activity" href="/dashboard/notifications" />
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <EmptyRow icon={Bell} label="No recent activity" />
            ) : (
              notifications.slice(0, 5).map((n: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-xl hover:bg-[#FAF8F5] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#FDF3E3] text-[#C8922A] font-bold text-[11px] flex items-center justify-center shrink-0">
                    {(n.event_type || n.title || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#1C1C1C] truncate capitalize">{n.title || "Activity"}</p>
                    <p className="text-[10px] text-[#9A8F82] truncate">{n.message || ""}</p>
                  </div>
                  <span className="text-[10px] text-[#C8B89C] shrink-0">
                    {n.created_at ? new Date(n.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Middle Row: Projects + Enquiries ───────────────────────────────── */}
      {userRole !== "accountant" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Projects */}
        <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6">
          <SectionHeader title="Projects" sub={`${projects.length} total`} href="/dashboard/projects" />

          {/* Mini pie breakdown */}
          <div className="mb-4 p-4 bg-[#FAF8F5] rounded-xl">
            <MiniPie data={projectsByStatus} />
          </div>

          {/* Recent projects list */}
          <div className="space-y-2.5">
            {recentProjects.length === 0 ? (
              <EmptyRow icon={FolderOpen} label="No projects yet" />
            ) : (
              recentProjects.map((p: any, i: number) => {
                const cfg = projectStatusConfig[p.status] ?? projectStatusConfig.active;
                return (
                  <div key={p.id || i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#FAF8F5] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#FEF3E2] flex items-center justify-center text-[#C8922A] font-bold text-[12px] flex-shrink-0">
                      {(p.name || p.client_name || "P").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1C1C1C] truncate">{p.name || "—"}</p>
                      <p className="text-[11px] text-[#9A8F82] truncate">{p.client_name || ""} · {p.property_type || ""}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 capitalize"
                      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Enquiries */}
        <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6">
          <SectionHeader title="Enquiries" sub={`${enquiries.length} total`} href="/dashboard/enquiry" />

          {/* Mini pie breakdown */}
          <div className="mb-4 p-4 bg-[#FAF8F5] rounded-xl">
            <MiniPie data={enquiriesByStatus} />
          </div>

          {/* Recent enquiries */}
          <div className="space-y-2.5">
            {recentEnquiries.length === 0 ? (
              <EmptyRow icon={MessageSquare} label="No enquiries yet" />
            ) : (
              recentEnquiries.map((e: any, i: number) => {
                const cfg = enquiryStatusConfig[e.status] ?? enquiryStatusConfig.new;
                return (
                  <div key={e._id || e.id || i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#FAF8F5] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#F0F9FF] flex items-center justify-center text-[#0EA5E9] font-bold text-[12px] flex-shrink-0">
                      {(e.client_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1C1C1C] truncate">{e.client_name || "—"}</p>
                      <p className="text-[11px] text-[#9A8F82] truncate">{e.mobile_number || ""}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── Proposals + Quotations ──────────────────────────────────────────── */}
      {userRole !== "accountant" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Proposals */}
        <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EDE8DF]">
            <SectionHeader title="Proposals" sub="Latest sent & pending" href="/dashboard/proposals" />
          </div>
          {recentProposals.length === 0 ? (
            <div className="px-6 py-8"><EmptyRow icon={FileText} label="No proposals yet" /></div>
          ) : (
            <div className="divide-y divide-[#F5F2ED]">
              {recentProposals.map((p: any, i: number) => {
                const cfg = proposalStatusConfig[p.status] ?? proposalStatusConfig.draft;
                return (
                  <div key={p.id || i} className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#FDFCFA] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-[#8B5CF6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1C1C1C] truncate">{p.client_name || p.title || "Proposal"}</p>
                      <p className="text-[11px] text-[#9A8F82] truncate">{p.project_name || ""}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quotations */}
        <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EDE8DF]">
            <SectionHeader title="Quotations" sub="Latest estimates" href="/dashboard/quotations" />
          </div>
          {recentQuotations.length === 0 ? (
            <div className="px-6 py-8"><EmptyRow icon={Receipt} label="No quotations yet" /></div>
          ) : (
            <div className="divide-y divide-[#F5F2ED]">
              {recentQuotations.map((q: any, i: number) => {
                const statusCfg = invoiceStatusConfig[q.status] ?? invoiceStatusConfig.draft;
                return (
                  <div key={q.id || i} className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#FDFCFA] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] flex items-center justify-center flex-shrink-0">
                      <IndianRupee size={14} className="text-[#10B981]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1C1C1C] truncate">{q.client_name || "—"}</p>
                      <p className="text-[11px] text-[#9A8F82] truncate">
                        {q.quote_number ? `#${q.quote_number}` : ""} · {q.project_name || ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-bold text-[#1C1C1C]">{fmtINR(Number(q.grand_total || 0))}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── Recent Invoices Table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#EDE8DF] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EDE8DF]">
          <div>
            <h2 className="text-[15px] font-bold text-[#1C1C1C]">Recent Invoices</h2>
            <p className="text-[11px] text-[#9A8F82] mt-0.5">Latest billing transactions</p>
          </div>
          <Link href="/dashboard/invoices" className="flex items-center gap-1.5 text-[12px] text-[#C8922A] font-bold hover:underline">
            View all <ExternalLink size={12} />
          </Link>
        </div>
        {recent_invoices.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt size={32} className="mx-auto text-[#EDE8DF] mb-3" />
            <p className="text-[14px] font-semibold text-[#6B6259]">No invoices yet</p>
            <Link href="/dashboard/invoices/generate" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#C8922A] text-white text-[13px] font-bold rounded-xl hover:bg-[#B07A20] transition-colors">
              <Plus size={14} /> New Invoice
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#FAF8F5]">
                {["Invoice #", "Client", "Project", "Amount", "Status", "Due"].map((h) => (
                  <th key={h} className="px-6 py-3.5 text-left text-[10px] font-black text-[#9A8F82] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2ED]">
              {recent_invoices.map((inv, i) => {
                const st = invoiceStatusConfig[inv.status] ?? invoiceStatusConfig.draft;
                return (
                  <tr key={i} className="hover:bg-[#FDFCFA] transition-colors">
                    <td className="px-6 py-4 text-[13px] font-bold text-[#C8922A]">{inv.number}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#FDF3E3] text-[#C8922A] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {inv.client.charAt(0)}
                        </div>
                        <span className="text-[13px] text-[#1C1C1C] font-medium">{inv.client}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-[#6B6259] max-w-[160px] truncate">{inv.project}</td>
                    <td className="px-6 py-4 text-[13px] font-bold text-[#1C1C1C]">{inv.amount}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase" style={{ color: st.color, backgroundColor: st.bg }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-[#9A8F82] font-medium">{inv.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Payments + Quick Actions row ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Payment Summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EDE8DF] p-6">
          <SectionHeader title="Payment Tracker" sub="Invoice payment status" href="/dashboard/payments" />
          {payments.length === 0 ? (
            <EmptyRow icon={CreditCard} label="No payment records yet" />
          ) : (
            <div className="space-y-2.5">
              {payments.slice(0, 5).map((p: any, i: number) => {
                const pct = p.grand_total > 0 ? Math.min(100, Math.round((Number(p.amount_paid || 0) / Number(p.grand_total)) * 100)) : 0;
                const st = invoiceStatusConfig[p.status] ?? invoiceStatusConfig.draft;
                return (
                  <div key={p.id || i} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[12px] font-semibold text-[#1C1C1C] truncate">{p.client_name || "—"}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] font-bold" style={{ color: st.color }}>{st.label}</span>
                          <span className="text-[12px] font-bold text-[#1C1C1C]">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#F5F2ED] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: p.status === "paid" ? "#10B981" : p.status === "overdue" ? "#EF4444" : "#C8922A",
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px] font-bold text-[#1C1C1C]">{fmtINR(Number(p.amount_paid || 0))}</p>
                      <p className="text-[10px] text-[#9A8F82]">of {fmtINR(Number(p.grand_total || 0))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-[#EDE8DF] p-6">
          <h2 className="text-[15px] font-bold text-[#1C1C1C] mb-4">Quick Actions</h2>
          <div className="space-y-2.5">
            {[
              { label: "New Invoice", href: "/dashboard/invoices/generate", icon: Receipt, color: "#C8922A", bg: "#FDF3E3" },
              { label: "Add Client", href: "/dashboard/clients", icon: Users, color: "#8B5CF6", bg: "#F5F3FF" },
              { label: "New Project", href: "/dashboard/projects", icon: FolderOpen, color: "#3B82F6", bg: "#EFF6FF" },
              { label: "New Quotation", href: "/dashboard/quotations", icon: FileText, color: "#0D9488", bg: "#F0FDFA" },
              { label: "New Proposal", href: "/dashboard/proposals", icon: Layers, color: "#EC4899", bg: "#FDF2F8" },
              { label: "Log Enquiry", href: "/dashboard/enquiry", icon: MessageSquare, color: "#F59E0B", bg: "#FFFBEB" },
            ].map((a) => (
              <Link key={a.label} href={a.href}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAF8F5] transition-colors group cursor-pointer">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: a.bg }}>
                    <a.icon size={15} style={{ color: a.color }} />
                  </div>
                  <span className="text-[13px] font-semibold text-[#1C1C1C] group-hover:text-[#C8922A] transition-colors">{a.label}</span>
                  <Plus size={13} className="ml-auto text-[#D5CEC6] group-hover:text-[#C8922A] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}