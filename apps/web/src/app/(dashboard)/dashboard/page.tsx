"use client";

import { useEffect, useState } from "react";

interface RoiData {
  total_conversations: number;
  booked_conversations: number;
  conversion_rate: number;
  total_bookings: number;
  estimated_revenue: number;
  actual_revenue_cents: number;
  actual_revenue_dollars: number;
  today_conversations: number;
  today_bookings: number;
  daily: { date: string; conversations: number; bookings: number }[];
}

function MetricCard({
  title,
  value,
  subtitle,
  highlight,
}: {
  title: string;
  value: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-between ${highlight ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100"}`}>
      <span className="text-xs font-medium text-slate-500">{title}</span>
      <div className="mt-3">
        <span className={`text-4xl font-semibold tracking-tight ${highlight ? "text-emerald-700" : "text-slate-900"}`}>
          {value}
        </span>
      </div>
      <span className="text-xs text-slate-400 mt-3">{subtitle}</span>
    </div>
  );
}

function DailyBar({ day, max, conversations, bookings }: { day: string; max: number; conversations: number; bookings: number }) {
  const convHeight = max > 0 ? (conversations / max) * 100 : 0;
  const bookHeight = max > 0 ? (bookings / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <div className="relative h-24 w-full flex items-end justify-center gap-[3px]">
        <div className="w-[6px] rounded-full bg-slate-200 transition-all" style={{ height: `${convHeight}%` }} />
        <div className="w-[6px] rounded-full bg-emerald-400 transition-all" style={{ height: `${bookHeight}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 truncate w-full text-center">{day.split(",")[0]}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<RoiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/roi").then((r) => r.json()),
      fetch("/api/analytics/monthly").then((r) => r.json()).catch(() => ({})),
    ]).then(([roi]) => {
      setData(roi);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  const maxDaily = Math.max(...(data?.daily.map((d) => d.conversations) ?? [1]), 1);

  return (
    <>
      {/* Hero Revenue Recovered */}
      <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl border border-emerald-100 p-8 mb-6">
        <p className="text-xs font-medium text-emerald-600 uppercase tracking-widest">Revenue Recovered This Month</p>
        <p className="text-5xl font-semibold tracking-tight text-emerald-900 mt-2">
          ${(data?.estimated_revenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-sm text-emerald-700 mt-2">
          {data?.total_conversations} conversations handled &middot;{" "}
          {data?.booked_conversations} converted to bookings &middot;{" "}
          {data?.conversion_rate}% booking rate
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Missed Calls Intercepted"
          value={String(data?.total_conversations ?? 0)}
          subtitle="Total conversations handled by AI this month"
        />
        <MetricCard
          title="SMS → Bookings"
          value={String(data?.booked_conversations ?? 0)}
          subtitle={`${data?.conversion_rate ?? 0}% conversion rate from conversation to booking`}
        />
        <MetricCard
          title="Actual Revenue Collected"
          value={`$${(data?.actual_revenue_dollars ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle="Deposits & payments completed this month"
          highlight
        />
      </div>

      {/* Daily Chart + Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-semibold text-slate-900">Daily Activity (7 Days)</h2>
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-200" /> Conversations
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Bookings
              </span>
            </div>
          </div>
          <div className="flex items-end gap-1">
            {(data?.daily ?? []).map((d) => (
              <DailyBar key={d.date} day={d.date} max={maxDaily} conversations={d.conversations} bookings={d.bookings} />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 text-center text-xs text-slate-500">
            <div className="bg-slate-50 rounded-xl p-3">
              <span className="block text-lg font-semibold text-slate-900">{data?.today_conversations ?? 0}</span>
              Today&rsquo;s Conversations
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <span className="block text-lg font-semibold text-slate-900">{data?.today_bookings ?? 0}</span>
              Today&rsquo;s Bookings
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-6">Today&rsquo;s Schedule</h2>
          <div className="space-y-4">
            {schedule.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No appointments today</p>
            ) : (
              schedule.map((item, i) => (
                <div key={i} className="relative flex items-start gap-4 pb-4 border-l-2 border-slate-100 pl-4 ml-2 last:border-0 last:pb-0">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-200" />
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.time}</span>
                    <p className="text-sm font-medium text-slate-900 mt-0.5">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.name} &middot; {item.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
