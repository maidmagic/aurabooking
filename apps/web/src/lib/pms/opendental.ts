import { PMSConnector, AppointmentSlot, PatientInfo, CreateAppointmentParams, CreateAppointmentResult, PMSConfig } from "./types";

export class OpenDentalConnector implements PMSConnector {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(config: PMSConfig) {
    this.baseUrl = config.base_url.replace(/\/$/, "");
    this.username = config.username;
    this.password = config.password;
  }

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString("base64");

    const res = await fetch(url, {
      method,
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenDental API error (${res.status}): ${text || res.statusText}`);
    }

    return res.json().catch(() => ({}));
  }

  async getAvailableSlots(date: string, durationMinutes: number): Promise<AppointmentSlot[]> {
    try {
      const { data: ops } = await this.request("GET", `/operatories`);
      const { data: blockouts } = await this.request("GET", `/blockouts?date=${date}`);
      const { data: appointments } = await this.request("GET", `/appointments?date=${date}`);

      const dayStart = 8 * 60;
      const dayEnd = 17 * 60;
      const slotDuration = durationMinutes;
      const booked: Array<{ start: number; end: number }> = [];

      for (const apt of (appointments ?? [])) {
        booked.push({ start: parseMinutes(apt.AptDateTime), end: parseMinutes(apt.AptDateTime) + (apt.Length ?? 60) });
      }
      for (const bo of (blockouts ?? [])) {
        booked.push({ start: parseMinutes(bo.BlockoutDate), end: parseMinutes(bo.BlockoutDate) + (bo.BlockoutType ?? 60) });
      }

      const slots: AppointmentSlot[] = [];
      for (let m = dayStart; m + slotDuration <= dayEnd; m += 15) {
        const conflict = booked.some((b) => m < b.end && m + slotDuration > b.start);
        if (!conflict) {
          const startTime = `${date}T${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;
          const endTime = `${date}T${String(Math.floor((m + slotDuration) / 60)).padStart(2, "0")}:${String((m + slotDuration) % 60).padStart(2, "0")}:00`;
          slots.push({ start: startTime, end: endTime });
        }
      }
      return slots;
    } catch {
      return [];
    }
  }

  async findPatient(name: string, phone?: string): Promise<PatientInfo | null> {
    try {
      const parts = name.trim().split(/\s+/);
      const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
      const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : name;

      const { data: patients } = await this.request("GET", `/patients/search?lastName=${encodeURIComponent(lastName)}&firstName=${encodeURIComponent(firstName)}`);

      if (!patients || patients.length === 0) return null;

      const match = patients.find((p: any) => {
        if (phone) return p.PrimaryPhone?.includes(phone.replace(/\D/g, "")) || p.WirelessPhone?.includes(phone.replace(/\D/g, ""));
        return true;
      }) || patients[0];

      return {
        id: String(match.PatNum ?? match.PatientNum ?? match.id),
        firstName: match.FName ?? match.FirstName ?? "",
        lastName: match.LName ?? match.LastName ?? "",
        phone: match.PrimaryPhone ?? match.WirelessPhone ?? null,
        email: match.Email ?? null,
      };
    } catch {
      return null;
    }
  }

  async createAppointment(params: CreateAppointmentParams): Promise<CreateAppointmentResult> {
    const { data: created } = await this.request("POST", `/appointments`, {
      PatNum: Number(params.patientId),
      AptDateTime: params.start,
      Note: params.notes || "",
      Length: Math.round((new Date(params.end).getTime() - new Date(params.start).getTime()) / 60000),
      AptStatus: "Scheduled",
    });

    return { id: String(created?.AptNum ?? created?.id ?? "unknown"), pmsId: String(created?.AptNum ?? "") };
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("GET", `/patients?limit=1`);
      return { ok: true, message: "Connected to OpenDental API" };
    } catch (err: any) {
      return { ok: false, message: err.message || "Connection failed" };
    }
  }
}

function parseMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
