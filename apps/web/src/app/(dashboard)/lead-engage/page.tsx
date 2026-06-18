"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Zap, Sparkles, MessageSquare, Phone, Clock, Loader2 } from "lucide-react";

interface Lead {
  id: string;
  type: "abandoned_deposit" | "stale_conversation" | "new_lead";
  priority: "hot" | "warm" | "new";
  customer_name: string | null;
  customer_phone: string | null;
  channel: string;
  summary: string;
  created_at: string;
  last_contact: string | null;
  conversation_id?: string;
}

interface LeadData {
  leads: Lead[];
  counts: { hot: number; warm: number; new: number; total: number };
}

const priorityConfig = {
  hot: { label: "Hot", icon: Flame, color: "text-[#C44E4E]", bg: "bg-[#C44E4E]/10", border: "border-l-[#C44E4E]" },
  warm: { label: "Warm", icon: Zap, color: "text-[#D97706]", bg: "bg-[#D97706]/10", border: "border-l-[#D97706]" },
  new: { label: "New", icon: Sparkles, color: "text-[#7C5CFC]", bg: "bg-[#7C5CFC]/10", border: "border-l-[#7C5CFC]" },
};

const channelIcon: Record<string, typeof MessageSquare> = {
  sms: Phone,
  web_chat: MessageSquare,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LeadEngagePage() {
  const [data, setData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lead-engage")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const counts = data?.counts;
  const leads = data?.leads ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Lead Engage</h2>
        <p className="text-sm text-muted-foreground mt-1">Leads that need your attention</p>
      </div>

      {counts && counts.total > 0 && (
        <div className="flex gap-2">
          {counts.hot > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C44E4E]/10 text-sm text-[#C44E4E] font-medium">
              <Flame className="h-3.5 w-3.5" />
              {counts.hot} Hot
            </div>
          )}
          {counts.warm > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D97706]/10 text-sm text-[#D97706] font-medium">
              <Zap className="h-3.5 w-3.5" />
              {counts.warm} Warm
            </div>
          )}
          {counts.new > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7C5CFC]/10 text-sm text-[#7C5CFC] font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              {counts.new} New
            </div>
          )}
        </div>
      )}

      {leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No leads to engage. You're all caught up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const config = priorityConfig[lead.priority];
            const Icon = config.icon;
            const ChannelIcon = channelIcon[lead.channel] ?? MessageSquare;

            return (
              <Card key={lead.id} className={`border-l-4 ${config.border}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {lead.customer_name ?? "Unknown"}
                        </p>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ChannelIcon className="h-3 w-3" />
                          <span className="capitalize">{lead.channel.replace("_", " ")}</span>
                        </div>
                        <span>·</span>
                        <span>{lead.summary}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {lead.last_contact && <span>Last contact: {timeAgo(lead.last_contact)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {lead.conversation_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/inbox?conversation=${lead.conversation_id}`, "_self")}
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />
                          Open
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
