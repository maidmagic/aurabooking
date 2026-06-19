export interface AppointmentSlot {
  start: string;
  end: string;
  providerId?: string;
  providerName?: string;
}

export interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

export interface CreateAppointmentParams {
  patientId: string;
  providerId: string;
  start: string;
  end: string;
  notes?: string;
  patientName?: string;
  patientPhone?: string;
}

export interface CreateAppointmentResult {
  id: string;
  pmsId?: string;
}

export interface PMSConnector {
  getAvailableSlots(date: string, durationMinutes: number): Promise<AppointmentSlot[]>;
  findPatient(name: string, phone?: string): Promise<PatientInfo | null>;
  createAppointment(params: CreateAppointmentParams): Promise<CreateAppointmentResult>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export interface PMSConfig {
  base_url: string;
  username: string;
  password: string;
  [key: string]: unknown;
}
