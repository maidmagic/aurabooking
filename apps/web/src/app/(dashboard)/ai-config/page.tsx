"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Save, Loader2, Trash2 } from "lucide-react";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string | null;
  active: boolean;
  deposit_required: boolean;
  deposit_amount: number;
}

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type BusinessHours = Record<string, DayHours>;

interface BookingRules {
  min_notice_minutes: number;
  max_bookings_per_day: number;
  buffer_minutes: number;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DEFAULT_HOURS: BusinessHours = {
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: "09:00", close: "17:00", closed: true },
  sunday: { open: "09:00", close: "17:00", closed: true },
};

const DEFAULT_BOOKING_RULES: BookingRules = {
  min_notice_minutes: 60,
  max_bookings_per_day: 3,
  buffer_minutes: 15,
};

export default function AiConfigPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [hoursLoading, setHoursLoading] = useState(true);

  const [aiPersona, setAiPersona] = useState("");
  const [bookingRules, setBookingRules] = useState<BookingRules>(DEFAULT_BOOKING_RULES);
  const [personaLoading, setPersonaLoading] = useState(true);

  const [savingHours, setSavingHours] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);

  const [savingPersona, setSavingPersona] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDuration, setFormDuration] = useState(30);
  const [formPrice, setFormPrice] = useState(0);
  const [formDescription, setFormDescription] = useState("");
  const [formDepositRequired, setFormDepositRequired] = useState(false);
  const [formDepositAmount, setFormDepositAmount] = useState(0);

  const fetchServices = () => {
    setServicesLoading(true);
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices)
      .finally(() => setServicesLoading(false));
  };

  const fetchAiSettings = () => {
    setHoursLoading(true);
    setPersonaLoading(true);
    fetch("/api/ai-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.business_hours) setBusinessHours(data.business_hours);
        if (data.booking_rules) setBookingRules(data.booking_rules);
        if (data.ai_persona) setAiPersona(data.ai_persona);
      })
      .finally(() => {
        setHoursLoading(false);
        setPersonaLoading(false);
      });
  };

  useEffect(() => {
    fetchServices();
    fetchAiSettings();
  }, []);

  const handleAddService = async () => {
    setAddLoading(true);
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        duration: formDuration,
        price: formPrice,
        description: formDescription || null,
        deposit_required: formDepositRequired,
        deposit_amount: formDepositAmount,
      }),
    });
    if (res.ok) {
      setDialogOpen(false);
      setFormName("");
      setFormDuration(30);
      setFormPrice(0);
      setFormDescription("");
      setFormDepositRequired(false);
      setFormDepositAmount(0);
      fetchServices();
    }
    setAddLoading(false);
  };

  const handleDeleteService = async (id: string) => {
    await fetch("/api/services", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchServices();
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    setHoursSaved(false);
    const res = await fetch("/api/ai-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_hours: businessHours }),
    });
    if (res.ok) {
      setHoursSaved(true);
      setTimeout(() => setHoursSaved(false), 2000);
    }
    setSavingHours(false);
  };

  const handleSavePersona = async () => {
    setSavingPersona(true);
    setPersonaSaved(false);
    const res = await fetch("/api/ai-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ai_persona: aiPersona,
        booking_rules: bookingRules,
      }),
    });
    if (res.ok) {
      setPersonaSaved(true);
      setTimeout(() => setPersonaSaved(false), 2000);
    }
    setSavingPersona(false);
  };

  const updateDay = (day: string, field: keyof DayHours, value: string | boolean) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">AI Config</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your services, business hours, and AI receptionist settings
        </p>
      </div>

      <Tabs defaultValue="services">
        <TabsList className="mb-6">
          <TabsTrigger value="services">Services Catalog</TabsTrigger>
          <TabsTrigger value="hours">Business Hours</TabsTrigger>
          <TabsTrigger value="persona">AI Persona</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Services</CardTitle>
                  <CardDescription>Manage your service offerings</CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Service</Button>} />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Service</DialogTitle>
                      <DialogDescription>Create a new service for your customers to book</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Teeth Cleaning" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="duration">Duration (mins)</Label>
                          <Input id="duration" type="number" min={1} value={formDuration} onChange={(e) => setFormDuration(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="price">Price ($)</Label>
                          <Input id="price" type="number" min={0} step="0.01" value={formPrice} onChange={(e) => setFormPrice(Number(e.target.value))} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} placeholder="Optional description of this service" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch id="deposit-required" checked={formDepositRequired} onCheckedChange={setFormDepositRequired} />
                          <Label htmlFor="deposit-required" className="text-sm">Deposit required</Label>
                        </div>
                        {formDepositRequired && (
                          <div className="w-32">
                            <Input id="deposit-amount" type="number" min={0} step="0.01" value={formDepositAmount} onChange={(e) => setFormDepositAmount(Number(e.target.value))} placeholder="$0.00" />
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline">Cancel</Button>} />
                      <Button onClick={handleAddService} disabled={addLoading || !formName}>
                        {addLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Add Service
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services yet. Add your first service to get started.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-muted-foreground pb-2 pr-4">Name</th>
                        <th className="text-left font-medium text-muted-foreground pb-2 pr-4">Duration</th>
                        <th className="text-left font-medium text-muted-foreground pb-2 pr-4">Price</th>
                        <th className="text-left font-medium text-muted-foreground pb-2 pr-4">Deposit</th>
                        <th className="text-left font-medium text-muted-foreground pb-2 pr-4">Status</th>
                        <th className="text-right font-medium text-muted-foreground pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((s) => (
                        <tr key={s.id} className="border-b border-border/50">
                          <td className="py-3 pr-4 font-medium text-foreground">{s.name}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{s.duration} min</td>
                          <td className="py-3 pr-4 text-muted-foreground">${Number(s.price).toFixed(2)}</td>
                          <td className="py-3 pr-4">
                            {s.deposit_required ? (
                              <span className="text-[#7C5CFC]">${Number(s.deposit_amount).toFixed(2)} deposit</span>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={s.active ? "success" : "default"}>{s.active ? "Active" : "Inactive"}</Badge>
                          </td>
                          <td className="py-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteService(s.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Hours</CardTitle>
              <CardDescription>Set your weekly operating hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hoursLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center gap-4 py-2">
                      <div className="w-24 text-sm font-medium text-foreground">{DAY_LABELS[day]}</div>
                      {businessHours[day]?.closed ? (
                        <span className="text-sm text-muted-foreground italic">Closed</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Input
                            type="time"
                            value={businessHours[day]?.open ?? "09:00"}
                            onChange={(e) => updateDay(day, "open", e.target.value)}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={businessHours[day]?.close ?? "17:00"}
                            onChange={(e) => updateDay(day, "close", e.target.value)}
                            className="w-32"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        <Label className="text-xs text-muted-foreground cursor-pointer">Closed</Label>
                        <Switch
                          checked={businessHours[day]?.closed ?? false}
                          onCheckedChange={(checked) => updateDay(day, "closed", checked)}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <Button onClick={handleSaveHours} disabled={savingHours}>
                      {savingHours ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save Hours
                    </Button>
                    {hoursSaved && <span className="text-sm text-[#4A7C59]">Saved!</span>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="persona">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Persona</CardTitle>
              <CardDescription>Configure your AI receptionist personality and booking rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {personaLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="persona">System Prompt</Label>
                    <Textarea
                      id="persona"
                      value={aiPersona}
                      onChange={(e) => setAiPersona(e.target.value)}
                      rows={6}
                      placeholder="Describe how your AI receptionist should behave..."
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-foreground">Booking Rules</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="minNotice">Min notice (mins)</Label>
                        <Input
                          id="minNotice"
                          type="number"
                          min={0}
                          value={bookingRules.min_notice_minutes}
                          onChange={(e) => setBookingRules((prev) => ({ ...prev, min_notice_minutes: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="maxBookings">Max bookings / day</Label>
                        <Input
                          id="maxBookings"
                          type="number"
                          min={1}
                          value={bookingRules.max_bookings_per_day}
                          onChange={(e) => setBookingRules((prev) => ({ ...prev, max_bookings_per_day: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="buffer">Buffer (mins)</Label>
                        <Input
                          id="buffer"
                          type="number"
                          min={0}
                          value={bookingRules.buffer_minutes}
                          onChange={(e) => setBookingRules((prev) => ({ ...prev, buffer_minutes: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button onClick={handleSavePersona} disabled={savingPersona}>
                      {savingPersona ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save Persona
                    </Button>
                    {personaSaved && <span className="text-sm text-[#4A7C59]">Saved!</span>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
