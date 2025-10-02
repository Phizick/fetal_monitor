export interface Patient {
  name: string;
  birthday: string;
  address: string;
  phone: string;
  roomNumber: string;
  pregnancyStartDate: string;
  fetusCount: number;
  doctorId: number;
}

export interface PatientWithId extends Patient {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientStatus {
  id: number;
  status: 'active' | 'archived' | 'monitoring';
  lastMonitoringDate?: string;
}

export interface PatientStats {
  total: number;
  connected: number;
  suspicious: number;
  pathologies: number;
}

export interface PatientsResponse {
  patients: PatientWithId[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePatientResponse extends PatientWithId {
  monitoringToken: string;
}

export interface MonitoringTokenResponse {
  patientId: string;
  monitoringToken: string;
  expiresAt: string;
}

export interface ToggleStatusResponse {
  patient: {
    id: string;
    name: string;
    isActive: boolean;
  };
  message: string;
}
