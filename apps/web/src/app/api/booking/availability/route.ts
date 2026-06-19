import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function generateTimeSlots(
  date: string,
  durationMinutes: number,
  busySlots: { start: string; end: string }[],
): string[] {
  const slots: string[] = [];
  const dayStart = 8 * 60;
  const dayEnd = 18 * 60;

  for (let m = dayStart; m + durationMinutes <= dayEnd; m += 15) {
    const slotStart = new Date(`${date}T${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

    const conflict = busySlots.some((busy) => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return slotStart < busyEnd && slotEnd > busyStart;
    });

    if (!conflict) {
      slots.push(
        `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
      );
    }
  }

  return slots;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business_id");
  const date = searchParams.get("date");
  const durationStr = searchParams.get("duration");

  if (!businessId || !date || !durationStr) {
    return NextResponse.json(
      { error: "business_id, date, and duration are required" },
      { status: 400 },
    );
  }

  const duration = parseInt(durationStr, 10);
  if (isNaN(duration) || duration <= 0) {
    return NextResponse.json({ error: "duration must be a positive number" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const dayStart = `${date}T00:00:00Z`;
  const dayEnd = `${date}T23:59:59Z`;

  const { data: appointments } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("user_id", businessId)
    .gte("start_time", dayStart)
    .lte("start_time", dayEnd)
    .neq("status", "cancelled");

  const { data: slotHolds } = await supabase
    .from("slot_holds")
    .select("start_time, end_time")
    .eq("user_id", businessId)
    .gte("start_time", dayStart)
    .lte("start_time", dayEnd)
    .gte("expires_at", new Date().toISOString());

  const busySlots = [
    ...(appointments ?? []).map((a) => ({ start: a.start_time, end: a.end_time })),
    ...(slotHolds ?? []).map((s) => ({ start: s.start_time, end: s.end_time })),
  ];

  const slots = generateTimeSlots(date, duration, busySlots);

  return NextResponse.json({ slots, date, duration });
}
