"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, XCircle, CheckCircle2, MessageSquare, PhoneCall, Calendar, Loader2 } from "lucide-react";

interface DailyReportData {
  id: string;
  report_date: string;
  data: {
    new_conversations: number;
    booked_appointments: number;
    cancelled_appointments: number;
    deposits_collected: number;
    deposit_revenue: number;
    pending_deposits: number;
    abandoned_deposits: number;
    reminders_sent: number;
    missed_calls: number;
    messages_exchanged: number;
  };
  sms_sent: boolean;
}

interface AnalyticsData {
  total_collected: number;
  total_collected_dollars: number;
  pending_count: number;
  abandoned_24h: number;
  conversion_rate: number;
  recent_deposits: Array<{
    id: string;
    amount: number;
    status: string;
    paid_at: string | null;
    created_at: string;
    appointment: {
      customer_name: string;
      start_time: string;
      service_name: string | null;
    } | null;
  }>;
  funnel: {
    bookings_started: number;
    payment_links_sent: number;
    deposits_completed: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/deposits")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/reports/daily")
      .then((r) => r.json())
      .then((res) => setReports(res.reports ?? []))
      .finally(() => setReportsLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-6">Dashboard</h2>
        <p className="text-muted-foreground">Failed to load analytics.</p>
      </div>
    );
  }

  const maxFunnel = Math.max(
    data.funnel.bookings_started,
    data.funnel.payment_links_sent,
    data.funnel.deposits_completed,
    1
  );

  const latestReport = reports[0];
  const maxConvs = Math.max(...reports.map((r) => r.data.new_conversations), 1);
  const maxRevenue = Math.max(...reports.map((r) => r.data.deposit_revenue), 1);
  const formatShortDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
    paid: "success",
    pending: "warning",
    failed: "destructive",
  };

  const statusLabel: Record<string, string> = {
    paid: "Paid",
    pending: "Pending",
    failed: "Failed",
  };

  return (
    <div className="max-w-6xl space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>

      {/* Daily Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Daily Summary</CardTitle>
          {!reportsLoading && latestReport && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{latestReport.report_date}</span>
              {latestReport.sms_sent ? (
                <span className="flex items-center gap-1 text-xs text-[#4A7C59]">
                  <CheckCircle2 className="size-3" /> SMS sent
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">SMS not sent</span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports yet. Reports generate daily via cron.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <SummaryStat icon={MessageSquare} label="Conversations" value={latestReport.data.new_conversations} color="text-[#7C5CFC]" bg="bg-[#7C5CFC]/10" />
                <SummaryStat icon={Calendar} label="Bookings" value={latestReport.data.booked_appointments} color="text-[#4A7C59]" bg="bg-[#4A7C59]/10" />
                <SummaryStat icon={DollarSign} label="Revenue" value={`$${(latestReport.data.deposit_revenue / 100).toFixed(2)}`} color="text-[#4A7C59]" bg="bg-[#4A7C59]/10" />
                <SummaryStat icon={Clock} label="Pending" value={latestReport.data.pending_deposits} color="text-[#D97706]" bg="bg-[#D97706]/10" />
                <SummaryStat icon={PhoneCall} label="Missed Calls" value={latestReport.data.missed_calls} color="text-[#C44E4E]" bg="bg-[#C44E4E]/10" />
                <SummaryStat icon={CheckCircle2} label="Reminders" value={latestReport.data.reminders_sent} color="text-[#4A7C59]" bg="bg-[#4A7C59]/10" />
              </div>

              {/* 7-Day sparkline */}
              {reports.length >= 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Conversations (7 days)</p>
                    <div className="flex items-end gap-1 h-20">
                      {reports.slice(0, 7).reverse().map((r) => (
                        <div key={r.id} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t-sm bg-[#7C5CFC]/60 transition-all duration-300"
                            style={{ height: `${(r.data.new_conversations / maxConvs) * 64 + 4}px` }}
                          />
                          <span className="text-[10px] text-muted-foreground">{formatShortDate(r.report_date)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Revenue (7 days)</p>
                    <div className="flex items-end gap-1 h-20">
                      {reports.slice(0, 7).reverse().map((r) => (
                        <div key={r.id} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t-sm bg-[#4A7C59]/60 transition-all duration-300"
                            style={{ height: `${(r.data.deposit_revenue / maxRevenue) * 64 + 4}px` }}
                          />
                          <span className="text-[10px] text-muted-foreground">{formatShortDate(r.report_date)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-lg bg-[#4A7C59]/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-[#4A7C59]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">${data.total_collected_dollars.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Collected Revenue</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-lg bg-[#D97706]/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-[#D97706]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{data.pending_count}</p>
              <p className="text-sm text-muted-foreground">Pending Transactions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-lg bg-[#C44E4E]/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-[#C44E4E]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{data.abandoned_24h}</p>
              <p className="text-sm text-muted-foreground">Abandoned (24h)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-lg bg-[#7C5CFC]/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-[#7C5CFC]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{data.conversion_rate}%</p>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Funnel (7 Days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FunnelRow
            label="Bookings Started"
            count={data.funnel.bookings_started}
            maxCount={maxFunnel}
            barClass="bg-[#7C5CFC]"
          />
          <FunnelRow
            label="Payment Link Sent"
            count={data.funnel.payment_links_sent}
            maxCount={maxFunnel}
            barClass="bg-[#7C5CFC]/60"
          />
          <FunnelRow
            label="Deposit Completed"
            count={data.funnel.deposits_completed}
            maxCount={maxFunnel}
            barClass="bg-[#7C5CFC]/30"
          />
        </CardContent>
      </Card>

      {/* Recent Deposits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_deposits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No recent transactions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground pb-3 pr-4">Customer</th>
                    <th className="text-left font-medium text-muted-foreground pb-3 pr-4">Service</th>
                    <th className="text-left font-medium text-muted-foreground pb-3 pr-4">Amount</th>
                    <th className="text-left font-medium text-muted-foreground pb-3 pr-4">Status</th>
                    <th className="text-left font-medium text-muted-foreground pb-3 pr-4">Date</th>
                    <th className="text-left font-medium text-muted-foreground pb-3">Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_deposits.map((d) => (
                    <tr key={d.id} className="border-b border-border/50">
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {d.appointment?.customer_name ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {d.appointment?.service_name ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-foreground">
                        ${(d.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusVariant[d.status] ?? "default"}>
                          {statusLabel[d.status] ?? d.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(d.created_at)}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {d.paid_at ? formatDate(d.paid_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

function FunnelRow({
  label,
  count,
  maxCount,
  barClass,
}: {
  label: string;
  count: number;
  maxCount: number;
  barClass: string;
}) {
  const pct = (count / maxCount) * 100;
  return (
    <div className="flex items-center gap-4">
      <div className="w-36 text-sm text-muted-foreground shrink-0">{label}</div>
      <div className="flex-1 h-6 bg-[#FAF8F5] rounded-md overflow-hidden">
        <div
          className={`h-full rounded-md ${barClass} transition-all duration-500`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <div className="w-12 text-right text-sm font-medium text-foreground tabular-nums">
        {count}
      </div>
    </div>
  );
}
