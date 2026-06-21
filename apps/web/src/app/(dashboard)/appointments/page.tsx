"use client";

import { useEffect, useState, useCallback } from "react";
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

interface AppointmentWithDuration extends Appointment {
  durationMinutes: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDayAppointments(appointments: Appointment[], date: Date) {
  return appointments.filter((a) => {
    const d = new Date(a.start_time);
    return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
  });
}

function CalendarGrid({ appointments, onSelectDay, selectedDate, onDropAppointment }: {
  appointments: Appointment[];
  onSelectDay: (d: Date) => void;
  selectedDate: Date | null;
  onDropAppointment: (appointmentId: string, newDate: Date) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = new Date();

  const cells: ({ day: number; currentMonth: boolean; date: Date } | null)[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrev - i);
    cells.push({ day: daysInPrev - i, currentMonth: false, date: d });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
  }

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    setDragOverDay(dateKey);
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverDay(null);
    const appointmentId = e.dataTransfer.getData("text/appointment-id");
    if (appointmentId) {
      onDropAppointment(appointmentId, targetDate);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonthOffset((m) => m - 1)} className="text-sm text-slate-500 hover:text-black transition-colors px-2 py-1">←</button>
        <h3 className="text-sm font-semibold text-slate-900">{MONTHS[month]} {year}</h3>
        <button onClick={() => setMonthOffset((m) => m + 1)} className="text-sm text-slate-500 hover:text-black transition-colors px-2 py-1">→</button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden">
        {DAYS.map((d) => (
          <div key={d} className="bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">{d}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const dateKey = cell.date.toISOString();
          const isToday = cell.date.toDateString() === today.toDateString();
          const isSelected = selectedDate && cell.date.toDateString() === selectedDate.toDateString();
          const dayApts = getDayAppointments(appointments, cell.date);
          const isDragOver = dragOverDay === dateKey;
          return (
            <div
              key={i}
              onDragOver={(e) => handleDragOver(e, dateKey)}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={(e) => handleDrop(e, cell.date)}
              onClick={() => cell.currentMonth && onSelectDay(cell.date)}
              className={`bg-white min-h-[80px] p-1.5 transition-colors flex flex-col ${
                !cell.currentMonth ? "opacity-30" : "hover:bg-slate-50 cursor-pointer"
              } ${isSelected ? "ring-2 ring-inset ring-black" : ""} ${isDragOver ? "bg-slate-100" : ""}`}
            >
              <span className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center ${
                isToday ? "bg-black text-white rounded-full" : "text-slate-700"
              }`}>
                {cell.day}
              </span>
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {dayApts.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/appointment-id", apt.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className={`text-[9px] px-1 py-0.5 rounded truncate font-medium cursor-grab active:cursor-grabbing ${
                      apt.status === "cancelled" ? "bg-red-50 text-red-500 line-through" :
                      apt.status === "completed" ? "bg-emerald-50 text-emerald-600" :
                      "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {new Date(apt.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    {" "}{apt.customer_name?.split(" ")[0] ?? "?"}
                  </div>
                ))}
                {dayApts.length > 3 && (
                  <span className="text-[8px] text-slate-400 ml-1">+{dayApts.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const fetchAppointments = useCallback(() => {
    fetch("/api/appointments").then((r) => r.json()).then(setAppointments);
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleDropAppointment = async (appointmentId: string, newDate: Date) => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return;

    const oldStart = new Date(apt.start_time);
    const oldEnd = new Date(apt.end_time);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(newDate);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    const res = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: appointmentId,
        status: "confirmed",
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      }),
    });

    if (res.ok) {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId
            ? { ...a, start_time: newStart.toISOString(), end_time: newEnd.toISOString(), status: "confirmed" }
            : a
        )
      );
    }
  };

  const selectedDayAppointments = selectedDate ? getDayAppointments(appointments, selectedDate) : [];

  const handleCancel = async (id: string) => {
    await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "cancelled" }),
    });
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
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
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, payment_status: "pending" } : a)));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Appointments</h2>
        <div className="flex items-center bg-slate-100 rounded-full p-0.5">
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${view === "calendar" ? "bg-white text-black shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >Calendar</button>
          <button
            onClick={() => setView("list")}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${view === "list" ? "bg-white text-black shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >List</button>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <CalendarGrid
              appointments={appointments}
              onSelectDay={setSelectedDate}
              selectedDate={selectedDate}
              onDropAppointment={handleDropAppointment}
            />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              {selectedDate ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "Select a day"}
            </h3>
            {selectedDate && selectedDayAppointments.length > 0 ? (
              <AppointmentList
                appointments={selectedDayAppointments}
                onCancel={handleCancel}
                onSendPayment={handleSendPayment}
              />
            ) : selectedDate ? (
              <p className="text-sm text-slate-400 text-center py-8">No appointments on this day</p>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Click a date to view appointments</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <AppointmentList
            appointments={appointments}
            onCancel={handleCancel}
            onSendPayment={handleSendPayment}
          />
        </div>
      )}
    </div>
  );
}
