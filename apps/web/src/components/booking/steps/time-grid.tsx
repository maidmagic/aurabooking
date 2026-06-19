"use client";

import { useEffect, useState, useMemo } from "react";

function getWeekDates(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setDate(start.getDate() - start.getDay() + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDayName(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDayNum(d: Date): string {
  return d.toLocaleDateString("en-US", { day: "numeric" });
}

function isToday(d: Date): boolean {
  const t = new Date();
  return formatDateKey(d) === formatDateKey(t);
}

const TIME_LABELS: Record<string, string> = {
  "08": "Morning",
  "12": "Afternoon",
  "17": "Evening",
};

export function TimeGrid({
  businessId,
  duration,
  onSelect,
}: {
  businessId: string;
  duration: number;
  onSelect: (date: string, time: string) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [anchor, setAnchor] = useState(today);
  const [selectedDate, setSelectedDate] = useState(formatDateKey(today));
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const weekDates = getWeekDates(anchor);

  useEffect(() => {
    setLoading(true);
    setSelectedTime(null);
    fetch(`/api/booking/availability?business_id=${businessId}&date=${selectedDate}&duration=${duration}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [businessId, selectedDate, duration]);

  const groupedSlots = useMemo(() => {
    const groups: { label: string; times: string[] }[] = [];
    let currentGroup: string | null = null;

    for (const slot of slots) {
      const hour = slot.split(":")[0];
      let groupLabel = "";
      if (hour < "12") groupLabel = "Morning";
      else if (hour < "17") groupLabel = "Afternoon";
      else groupLabel = "Evening";

      if (groupLabel !== currentGroup) {
        currentGroup = groupLabel;
        groups.push({ label: groupLabel, times: [] });
      }
      groups[groups.length - 1].times.push(slot);
    }

    return groups;
  }, [slots]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {weekDates.map((d) => {
          const key = formatDateKey(d);
          const selected = key === selectedDate;
          return (
            <button
              key={key}
              onClick={() => setSelectedDate(key)}
              className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl min-w-[60px] transition-all ${
                selected
                  ? "bg-black text-white"
                  : "bg-white border border-slate-100 text-slate-600 hover:border-slate-300"
              }`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider">
                {formatDayName(d)}
              </span>
              <span className={`text-lg font-semibold ${isToday(d) && !selected ? "text-black" : ""}`}>
                {formatDayNum(d)}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-9 w-20 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : groupedSlots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-slate-400">No available times for this date.</p>
          <p className="text-xs text-slate-300 mt-1">Try another day.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedSlots.map((group) => (
            <div key={group.label}>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                {group.label}
              </h4>
              <div className="flex gap-2 flex-wrap">
                {group.times.map((time) => {
                  const selected = time === selectedTime;
                  return (
                    <button
                      key={time}
                      onClick={() => {
                        setSelectedTime(time);
                        onSelect(selectedDate, time);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selected
                          ? "bg-black text-white"
                          : "bg-white border border-slate-100 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
