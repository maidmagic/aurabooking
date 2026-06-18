"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, MapPin, Trash2, Plus } from "lucide-react";

interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  is_primary: boolean;
}

export default function LocationsSettingsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchLocations = useCallback(async () => {
    const res = await fetch("/api/settings/locations");
    const data = await res.json();
    setLocations(data ?? []);
  }, []);

  useEffect(() => {
    fetchLocations().finally(() => setLoading(false));
  }, [fetchLocations]);

  const handleAdd = async () => {
    if (!name) return;
    setSaving(true);
    await fetch("/api/settings/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, phone, email, timezone, is_primary: isPrimary }),
    });
    setSaving(false);
    setOpen(false);
    setName("");
    setAddress("");
    setPhone("");
    setEmail("");
    setTimezone("America/New_York");
    setIsPrimary(false);
    fetchLocations();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/settings/locations/${id}`, { method: "DELETE" });
    fetchLocations();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Locations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your business locations.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><Plus className="h-4 w-4" />Add Location</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Location</DialogTitle>
              <DialogDescription>Add a new business location.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Downtown Office" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="office@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="primary">Primary location</Label>
                <Switch id="primary" checked={isPrimary} onCheckedChange={setIsPrimary} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {locations.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">No locations added yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {loc.name}
                        {loc.is_primary && <Badge variant="default" className="text-[10px]">Primary</Badge>}
                      </CardTitle>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(loc.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {loc.address && <p className="text-muted-foreground">{loc.address}</p>}
                {loc.phone && <p className="text-muted-foreground">{loc.phone}</p>}
                {loc.email && <p className="text-muted-foreground">{loc.email}</p>}
                <p className="text-muted-foreground text-xs">{loc.timezone}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
