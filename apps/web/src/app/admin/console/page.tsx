"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Users, TrendingUp, DollarSign, AlertTriangle, Rocket } from "lucide-react";

interface AdminStats {
  totalMRR: string;
  platformROI: string;
  payingCustomers: number;
  freeTrialUsers: number;
  conversionRate: string;
  ghostAccounts: { name: string; email: string; status: string; daysInactive: number }[];
  stuckTrials: { name: string; email: string; daysSinceSignup: number }[];
}

export default function AdminConsolePage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/admin/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">Master Console</h2>
          <p className="text-sm text-muted-foreground mt-0.5">System Infrastructure Dashboard</p>
        </div>
        <Badge variant="success" className="text-xs h-5">
          <Activity className="size-3 mr-1" />
          System Normal
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Monthly Revenue</p>
            <p className="text-2xl font-bold text-[#7C5CFC]">{stats.totalMRR}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Paying Customers</p>
            <p className="text-2xl font-bold text-foreground">{stats.payingCustomers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Free Trials</p>
            <p className="text-2xl font-bold text-sky-600">{stats.freeTrialUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Trial Conversion</p>
            <p className="text-2xl font-bold text-[#4A7C59]">{stats.conversionRate}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="size-4 text-[#C44E4E]" />
                Inactivity Warnings
              </CardTitle>
              <Badge variant="destructive" className="text-[10px] h-4">Action Required</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.ghostAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All paying customers are active. Good work.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#EDE9E3]">
                    <th className="pb-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Shop</th>
                    <th className="pb-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tier</th>
                    <th className="pb-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Inactivity</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.ghostAccounts.map((g, i) => (
                    <tr key={i} className="border-b border-[#EDE9E3]/50 last:border-0">
                      <td className="py-3 font-medium text-foreground">{g.name}</td>
                      <td className="py-3"><Badge variant="default" className="text-[10px] h-4">{g.status}</Badge></td>
                      <td className="py-3 text-right text-[#C44E4E] font-medium tabular-nums">{g.daysInactive}d offline</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Rocket className="size-4 text-sky-600" />
                Stuck Trials
              </CardTitle>
              <Badge variant="default" className="text-[10px] h-4 bg-sky-50 text-sky-700 border-0">High Value Leads</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.stuckTrials.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No stuck trials. All free users are engaged.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#EDE9E3]">
                    <th className="pb-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Business</th>
                    <th className="pb-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="pb-2.5 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.stuckTrials.map((t, i) => (
                    <tr key={i} className="border-b border-[#EDE9E3]/50 last:border-0">
                      <td className="py-3 font-medium text-foreground">{t.name}</td>
                      <td className="py-3 text-muted-foreground">{t.email}</td>
                      <td className="py-3 text-right text-[#D97706] font-medium tabular-nums">{t.daysSinceSignup}d old</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
