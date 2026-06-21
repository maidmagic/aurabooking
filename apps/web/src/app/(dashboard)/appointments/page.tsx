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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  useEffect(() => {
    fetch("/api/appointments").then((r) => r.json()).then(setAppointments);
  }, []);
  return { appointments, setAppointments };
}

function getDayAppointments(appointments: Appointment[], date: Date) {
  return appointments.filter((a) => {
    const d = new Date(a.start_time);
    return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
  });
}

function CalendarGrid({ appointments, onSelectDay, selectedDate }: {
  appointments: Appointment[];
  onSelectDay: (d: Date) => void;
  selectedDate: Date | null;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInPrev = new Date(year, month, 0).getDate();

  const today = new Date();

  const cells: ({ day: number; currentMonth: boolean } | null)[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, currentMonth: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, currentMonth: true });
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) cells.push({ day: i, currentMonth: false });

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
          const dateObj = new Date(year, month, cell.day);
          const isToday = cell.currentMonth && dateObj.toDateString() === today.toDateString();
          const isSelected = selectedDate && dateObj.toDateString() === selectedDate.toDateString();
          const dayApts = getDayAppointments(appointments, dateObj);
          return (
            <button
              key={i}
              onClick={() => cell.currentMonth && onSelectDay(dateObj)}
              className={`bg-white min-h-[56px] p-1.5 text-left transition-colors flex flex-col ${
                !cell.currentMonth ? "opacity-30" : "hover:bg-slate-50 cursor-pointer"
              } ${isSelected ? "ring-2 ring-inset ring-black" : ""}`}
            >
              <span className={`text-xs font-medium ${isToday ? "bg-black text-white w-5 h-5 rounded-full flex items-center justify-center" : "text-slate-700"}`}>
                {cell.day}
              </span>
              {dayApts.length > 0 && (
                <div className="mt-auto flex gap-0.5">
                  {dayApts.slice(0, 3).map((apt) => (
                    <span key={apt.id} className={`w-1.5 h-1.5 rounded-full ${apt.status === "cancelled" ? "bg-red-300" : apt.status === "completed" ? "bg-emerald-400" : "bg-slate-400"}`} />
                  ))}
                  {dayApts.length > 3 && <span className="text-[8px] text-slate-400">+{dayApts.length - 3}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const { appointments, setAppointments } = useAppointments();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
