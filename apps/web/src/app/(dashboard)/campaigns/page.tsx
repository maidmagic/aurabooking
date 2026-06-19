"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const DEMO_CAMPAIGNS = [
  {
    id: "demo-1", name: "6-Month Recall (Hygiene)", type: "reminder",
    message_template: "", audience: { raw: "Not seen > 6 mos" },
    schedule: null, status: "running", created_at: new Date().toISOString(),
    revenue: 8400, bookings: 32,
  },
  {
    id: "demo-2", name: "Mother's Day Filler Special", type: "promotion",
    message_template: "", audience: { raw: "Spent > $500" },
    schedule: null, status: "completed", created_at: new Date().toISOString(),
    revenue: 5850, bookings: 14,
  },
  {
    id: "demo-3", name: "Birthday Offer Sequence", type: "promotion",
    message_template: "", audience: { raw: "Birthday this month" },
    schedule: null, status: "running", created_at: new Date().toISOString(),
    revenue: 2100, bookings: 8,
  },
  {
    id: "demo-4", name: "VIP Touch-Up Reminder", type: "follow_up",
    message_template: "", audience: { raw: "Filler 9-12 mos ago" },
    schedule: null, status: "draft", created_at: new Date().toISOString(),
    revenue: 0, bookings: 0,
  },
];

interface Campaign {
  id: string;
  name: string;
  type: string;
  message_template: string;
  audience: Record<string, unknown>;
  schedule: string | null;
  status: string;
  created_at: string;
  revenue?: number;
  bookings?: number;
}

const audienceLabel = (audience: Record<string, unknown>): string => {
  if (typeof audience === "object" && audience !== null) {
    const raw = (audience as Record<string, string>).raw || "";
    if (raw.includes("6")) return "Not seen > 6 mos";
    if (raw.includes("$")) return "Spent > $500";
    if (audience.filter === "all") return "All Clients";
    if (audience.tag) return `Tag: ${audience.tag}`;
  }
  return "Custom Audience";
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.length > 0 ? data : DEMO_CAMPAIGNS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleStatusUpdate = async (id: string, status: string) => {
    const res = await fetch("/api/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/campaigns", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue ?? 0), 0);
  const activeCount = campaigns.filter((c) => c.status === "running").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">

      {/* 1. Header & Quick Actions */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">Automate outreach and fill your calendar.</p>
        </div>
        <Link
          href="/campaigns/new"
          className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-full shadow-sm hover:bg-slate-800 transition-all inline-block"
        >
          + New Campaign
        </Link>
      </div>

      {/* 2. ROI Observability */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Total Revenue Generated</span>
          <p className="text-3xl font-semibold text-slate-900 mt-2">
            ${totalRevenue.toLocaleString()}
          </p>
          <span className="text-xs font-medium text-green-600 mt-1 block">From automated campaigns</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Active Sequences</span>
          <p className="text-3xl font-semibold text-slate-900 mt-2">{activeCount}</p>
          <span className="text-xs font-medium text-slate-500 mt-1 block">Running in background</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Average AI Conversion</span>
          <p className="text-3xl font-semibold text-slate-900 mt-2">18%</p>
          <span className="text-xs font-medium text-green-600 mt-1 block">+4% from last month</span>
        </div>
      </div>

      {/* 3. Campaign Control Grid */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 bg-[#FAFAFA] text-xs font-medium uppercase tracking-widest text-slate-500">
          <div className="col-span-4">Campaign Name</div>
          <div className="col-span-3">Trigger / Audience</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3 text-right">Revenue Won</div>
        </div>

        {campaigns.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-slate-400 mb-4">No campaigns yet. Create your first campaign.</p>
            <Link
              href="/campaigns/new"
              className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-full shadow-sm hover:bg-slate-800 transition-all inline-block"
            >
              + New Campaign
            </Link>
          </div>
        ) : (
          campaigns.map((campaign) => {
            const isAutomated = campaign.schedule !== null || campaign.status === "running";
            return (
              <div
                key={campaign.id}
                className="grid grid-cols-12 gap-4 px-6 py-5 border-b border-slate-50 items-center hover:bg-slate-50 transition-colors"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isAutomated ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                  }`}>
                    {isAutomated ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{campaign.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isAutomated ? "Automated Sequence" : "One-Off AI Blast"}
                    </p>
                  </div>
                </div>
                <div className="col-span-3">
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                    {audienceLabel(campaign.audience)}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  {campaign.status === "running" ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                      <span className="w-2 h-2 rounded-full bg-green-500" /> Active
                    </span>
                  ) : campaign.status === "completed" ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-slate-300" /> Completed
                    </span>
                  ) : campaign.status === "scheduled" ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> Scheduled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Draft
                    </span>
                  )}
                </div>
                <div className="col-span-3 text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    ${(campaign.revenue ?? 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {campaign.bookings ?? 0} Bookings
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
