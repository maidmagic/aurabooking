"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2, Play, Pause } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: string;
  message_template: string;
  audience: Record<string, unknown>;
  schedule: string | null;
  status: string;
  created_at: string;
}

const typeVariants: Record<string, string> = {
  reminder: "outline",
  promotion: "outline",
  follow_up: "outline",
};

const typeLabels: Record<string, string> = {
  reminder: "Reminder",
  promotion: "Promotion",
  follow_up: "Follow-up",
};

const statusVariants: Record<string, string> = {
  draft: "warning",
  scheduled: "default",
  running: "success",
  completed: "secondary",
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) setCampaigns(await res.json());
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Campaigns</h2>
        <Button render={<Link href="/campaigns/new" />}>
          <Plus className="size-4" />
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">
            No campaigns yet. Create your first campaign.
          </p>
          <Button render={<Link href="/campaigns/new" />}>
            <Plus className="size-4" />
            New Campaign
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} size="sm">
              <CardHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle>{campaign.name}</CardTitle>
                  <Badge variant={typeVariants[campaign.type] as "outline"}>
                    {typeLabels[campaign.type] ?? campaign.type}
                  </Badge>
                  <Badge variant={statusVariants[campaign.status] as "warning" | "default" | "success" | "secondary"}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Schedule: {formatDate(campaign.schedule)}
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                {campaign.status === "draft" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/campaigns/new?id=${campaign.id}`} />}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(campaign.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </>
                )}
                {campaign.status === "scheduled" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(campaign.id, "draft")}
                    >
                      <Pause className="size-3.5" />
                      Pause
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(campaign.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </>
                )}
                {campaign.status === "running" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusUpdate(campaign.id, "completed")}
                  >
                    <Play className="size-3.5" />
                    Complete
                  </Button>
                )}
                {campaign.status === "completed" && null}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
