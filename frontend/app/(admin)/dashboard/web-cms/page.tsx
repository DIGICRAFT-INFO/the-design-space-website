"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, LayoutGrid, Newspaper, Briefcase, Inbox } from "lucide-react";
import { getCmsOverview, type CmsOverview } from "@/services/webCmsService";
import { getErrorMessage } from "@/lib/errors";

const ACTIVITY_ICON: Record<string, string> = {
  enquiry: "💬",
  application: "📄",
  portfolio: "🖼️",
  blog: "📝",
};

export default function WebCmsOverviewPage() {
  const [data, setData] = useState<CmsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getCmsOverview()
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9A8F82]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-500 text-sm">{error}</div>;
  }

  const stats = [
    { label: "Published Projects", value: data?.stats.published_portfolio ?? 0, icon: LayoutGrid, href: "/dashboard/web-cms/portfolio" },
    { label: "Published Articles", value: data?.stats.published_blog_posts ?? 0, icon: Newspaper, href: "/dashboard/web-cms/blog" },
    { label: "Open Roles", value: data?.stats.open_jobs ?? 0, icon: Briefcase, href: "/dashboard/web-cms/careers" },
    { label: "New Leads (7 days)", value: data?.stats.new_leads_7d ?? 0, icon: Inbox, href: "/dashboard/web-cms/leads" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[#2B2620]">Website Interactive CMS</h1>
        <p className="text-[13px] text-[#9A8F82]">A snapshot of your public website — content, leads, and recent activity.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white border border-[#EDE8DF] rounded-2xl p-5 hover:border-[#C8922A] transition-colors"
          >
            <s.icon className="w-5 h-5 text-[#C8922A] mb-3" />
            <p className="text-2xl font-bold text-[#2B2620]">{s.value}</p>
            <p className="text-[12px] text-[#9A8F82] mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-[#EDE8DF] rounded-2xl p-5">
        <h2 className="text-[14px] font-bold text-[#2B2620] mb-4">Recent Activity</h2>
        {data?.recent_activity.length ? (
          <ul className="divide-y divide-[#EDE8DF]">
            {data.recent_activity.map((a, i) => (
              <li key={i} className="flex items-center gap-3 py-3 text-[13px]">
                <span>{ACTIVITY_ICON[a.type] || "•"}</span>
                <span className="flex-1 text-[#2B2620]">{a.label}</span>
                <span className="text-[11px] text-[#9A8F82] shrink-0">{new Date(a.at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-[#9A8F82]">No recent activity yet.</p>
        )}
      </div>
    </div>
  );
}
