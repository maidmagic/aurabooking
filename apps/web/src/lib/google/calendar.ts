import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";

function getOAuthClient(accessToken: string, refreshToken?: string) {
  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!
  );
  oauth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return oauth;
}

export async function getCalendarClient(userId: string) {
  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google_calendar")
    .single();

  if (!integration) throw new Error("Google Calendar not connected");

  const oauth = getOAuthClient(integration.access_token, integration.refresh_token);
  return google.calendar({ version: "v3", auth: oauth });
}

export async function checkAvailability(
  userId: string,
  date: string,
  durationMinutes: number
): Promise<string[]> {
  const calendar = await getCalendarClient(userId);
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  const busy = data.calendars?.["primary"]?.busy ?? [];

  const allSlots: string[] = [];
  const ms = durationMinutes * 60 * 1000;
  let cursor = dayStart.getTime();
  const end = dayEnd.getTime();

  while (cursor + ms <= end) {
    const slotEnd = cursor + ms;
    const conflicts = busy.some(
      (b) =>
        new Date(b.start!).getTime() < slotEnd &&
        new Date(b.end!).getTime() > cursor
    );
    if (!conflicts) {
      allSlots.push(new Date(cursor).toISOString());
    }
    cursor += ms;
  }

  return allSlots;
}

export async function createCalendarEvent(
  userId: string,
  summary: string,
  startTime: string,
  endTime: string,
  description?: string
): Promise<string> {
  const calendar = await getCalendarClient(userId);

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary,
      description,
      start: { dateTime: startTime, timeZone: "UTC" },
      end: { dateTime: endTime, timeZone: "UTC" },
    },
  });

  return data.id!;
}

interface SyncEvent {
  id: string;
  summary: string;
  start?: { dateTime: string } | { date: string };
  end?: { dateTime: string } | { date: string };
  status?: string;
}

export async function syncEvents(
  userId: string
): Promise<{ events: SyncEvent[]; nextSyncToken: string | null }> {
  const admin = createAdminClient();
  const calendar = await getCalendarClient(userId);

  const { data: integration } = await admin
    .from("integrations")
    .select("metadata")
    .eq("user_id", userId)
    .eq("provider", "google_calendar")
    .single();

  const storedToken = integration?.metadata?.syncToken as string | undefined;

  const params: any = {
    calendarId: "primary",
    singleEvents: true,
    orderBy: "startTime",
  };

  if (storedToken) {
    params.syncToken = storedToken;
  } else {
    params.timeMin = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  const { data } = await calendar.events.list(params);

  const nextSyncToken = data.nextSyncToken ?? null;

  if (nextSyncToken) {
    const newMetadata = { ...(integration?.metadata ?? {}), syncToken: nextSyncToken };
    await admin
      .from("integrations")
      .update({ metadata: newMetadata })
      .eq("user_id", userId)
      .eq("provider", "google_calendar");
  }

  return {
    events: (data.items ?? []).map((e) => ({
      id: e.id!,
      summary: e.summary ?? "",
      start: e.start
        ? { dateTime: e.start.dateTime ?? "", date: e.start.date ?? "" }
        : undefined,
      end: e.end
        ? { dateTime: e.end.dateTime ?? "", date: e.end.date ?? "" }
        : undefined,
      status: e.status ?? undefined,
    })),
    nextSyncToken,
  };
}
