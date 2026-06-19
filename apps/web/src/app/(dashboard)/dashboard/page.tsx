"use client";

import { useEffect, useState } from "react";

function MetricCard({
  title,
  value,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
      <span className="text-xs font-medium text-slate-500">{title}</span>
      <div className="mt-4 flex items-end gap-3">
        <span className="text-4xl font-semibold tracking-tight text-slate-900">
          {value}
        </span>
      </div>
      <span
        className={`text-xs font-medium mt-3 ${
          trendUp ? "text-green-600" : "text-slate-400"
        }`}
      >
        {trend}
      </span>
    </div>
  );
}

const demoConversations = [
  {
    id: "1",
    phone: "(416) 555-0192",
    preview: "AI successfully booked a Haircut for tomorrow.",
    status: "Booked",
    statusClass: "bg-green-50 text-green-700 border-green-100",
  },
  {
    id: "2",
    name: "Sarah Jenkins",
    preview: "Asked about pricing for highlights.",
    status: "Chatting",
    statusClass: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    id: "3",
    phone: "(647) 555-0341",
    preview: "Rescheduled appointment to next Tuesday.",
    status: "Rescheduled",
    statusClass: "bg-amber-50 text-amber-700 border-amber-100",
  },
];

const demoSchedule = [
  { time: "2:00", title: "Microneedling Session", name: "Emma Watson", status: "Confirmed" },
  { time: "3:30", title: "Haircut & Color", name: "James Miller", status: "Confirmed" },
  { time: "5:00", title: "Facial Treatment", name: "Olivia Chen", status: "Pending" },
];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    aiBookings: "—",
    missedCalls: "—",
    totalSms: "—",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/monthly").then((r) => r.json()).catch(() => ({})),
      fetch("/api/reports/daily").then((r) => r.json()).catch(() => ({ reports: [] })),
    ]).then(([monthly, reports]) => {
      const report = reports.reports?.[0]?.data;
      setMetrics({
        aiBookings: String(monthly?.monthly_bookings ?? report?.booked_appointments ?? "—"),
        missedCalls: String(report?.missed_calls ?? monthly?.ai_conversations ?? "—"),
        totalSms: String(report?.reminders_sent ?? "—"),
      });
      setLoading(false);
    });
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="AI-Managed Bookings"
          value={metrics.aiBookings}
          trend="+12% this week"
          trendUp={true}
        />
        <MetricCard
          title="Missed Calls Rescued"
          value={metrics.missedCalls}
          trend="$4,200 potential revenue"
          trendUp={true}
        />
        <MetricCard
          title="Total SMS Sent"
          value={metrics.totalSms}
          trend="84% quota used"
          trendUp={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-semibold text-slate-900">
              Live AI Conversations
            </h2>
            <button className="text-xs text-slate-500 hover:text-black transition-colors">
              View All &rarr;
            </button>
          </div>

          <div className="space-y-1">
            {demoConversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors -mx-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {conv.name ?? conv.phone}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{conv.preview}</p>
                </div>
                <span
                  className={`px-2 py-1 text-[10px] font-semibold rounded-full border ${conv.statusClass}`}
                >
                  {conv.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-6">
            Today&rsquo;s Schedule
          </h2>
          <div className="space-y-4">
            {demoSchedule.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                No appointments today
              </p>
            ) : (
              demoSchedule.map((item) => (
                <div
                  key={item.time}
                  className="relative flex items-start gap-4 pb-4 border-l-2 border-slate-100 pl-4 ml-2 last:border-0 last:pb-0"
                >
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-200" />
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {item.time}
                    </span>
                    <p className="text-sm font-medium text-slate-900 mt-0.5">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.name} &middot; {item.status}
                    </p>
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
