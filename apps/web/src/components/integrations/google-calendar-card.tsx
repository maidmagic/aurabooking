"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2 } from "lucide-react";

interface Props {
  connected: boolean;
  onDisconnect: () => Promise<void>;
}

export function GoogleCalendarCard({ connected, onDisconnect }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    window.location.href = "/api/integrations/google/auth";
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await onDisconnect();
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Google Calendar</CardTitle>
              <CardDescription>Sync availability and create events</CardDescription>
            </div>
          </div>
          <Badge variant={connected ? "booked" : "default"}>
            {connected ? "Connected" : "Not connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {connected ? (
          <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Disconnect
          </Button>
        ) : (
          <Button onClick={handleConnect}>Connect Google Calendar</Button>
        )}
      </CardContent>
    </Card>
  );
}
