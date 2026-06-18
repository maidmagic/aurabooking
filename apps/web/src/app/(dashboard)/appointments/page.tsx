"use client";

import { useEffect, useState } from "react";
import { AppointmentList } from "@/components/appointments/appointment-list";

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

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    fetch("/api/appointments").then((r) => r.json()).then(setAppointments);
  }, []);

  const handleCancel = async (id: string) => {
    await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "cancelled" }),
    });
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
    );
  };

  const handleSendPayment = async (id: string) => {
    const res = await fetch("/api/payments/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_id: id }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, "_blank");
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, payment_status: "pending" } : a))
      );
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Appointments</h2>
      <AppointmentList
        appointments={appointments}
        onCancel={handleCancel}
        onSendPayment={handleSendPayment}
      />
    </div>
  );
}
