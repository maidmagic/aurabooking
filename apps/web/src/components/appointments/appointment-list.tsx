"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  start_time: string;
  end_time: string;
  status: string;
  payment_status?: string;
  services?: { name: string } | null;
}

interface Props {
  appointments: Appointment[];
  onCancel: (id: string) => void;
  onSendPayment?: (id: string) => void;
}

const statusVariant: Record<string, "default" | "booked" | "destructive" | "warning" | "success"> = {
  confirmed: "booked",
  cancelled: "destructive",
  rescheduled: "warning",
  completed: "success",
};

export function AppointmentList({ appointments, onCancel, onSendPayment }: Props) {
  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground">No appointments yet</p>;
  }

  return (
    <div className="space-y-3">
      {appointments.map((apt) => (
        <div
          key={apt.id}
          className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
        >
          <div>
            <p className="font-medium text-foreground">{apt.customer_name}</p>
            <p className="text-sm text-muted-foreground">
              {apt.services?.name ?? "No service"} —{" "}
              {new Date(apt.start_time).toLocaleDateString()} at{" "}
              {new Date(apt.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
            {apt.payment_status && (
              <p className="text-xs mt-1">
                Payment:{" "}
                <span className={
                  apt.payment_status === "paid" ? "text-[#4A7C59] font-medium" :
                  apt.payment_status === "pending" ? "text-[#D97706] font-medium" :
                  "text-muted-foreground"
                }>
                  {apt.payment_status}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[apt.status] ?? "default"}>{apt.status}</Badge>
            {apt.payment_status === "unpaid" && onSendPayment && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendPayment(apt.id)}
                className="gap-1.5"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Send Payment
              </Button>
            )}
            {apt.status === "confirmed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(apt.id)}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
