import axios from 'axios';
import { showError } from './notificationService';
import type {
  LoginRequest,
  LoginResponse,
  User,
  UsersResponse,
  Patient,
  PatientWithId,
  PatientsResponse,
  SessionsResponse,
  MonitoringDataResponse,
  MonitoringSessionResponse,
  CreatePatientResponse,
  MonitoringTokenResponse,
  ToggleStatusResponse,
} from '../types';
import type { MonitoringSessionSummary, MonitoringSession } from '../types/monitoring';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (error.response?.data?.message) {
      showError('Ошибка', error.response.data.message);
    } else {
      showError('Ошибка', 'Произошла неизвестная ошибка');
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/login', credentials);
    return response.data;
  },
};

export const userService = {
  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/users/me');
    return response.data;
  },

  getUser: async (id: number): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  getUsers: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<UsersResponse> => {
    const response = await api.get<UsersResponse>('/users', { params });
    return response.data;
  },

  updateProfile: async (data: { login: string; name: string }): Promise<User> => {
    const response = await api.patch<User>('/users/me', data);
    return response.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await api.patch('/users/me/password', data);
  },
};

export const patientService = {
  createPatient: async (patient: Patient): Promise<CreatePatientResponse> => {
    const response = await api.post<CreatePatientResponse>('/patients', patient);
    return response.data;
  },

  getPatients: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    doctorId?: number;
  }): Promise<PatientsResponse> => {
    const response = await api.get<PatientsResponse>('/patients', { params });
    return response.data;
  },

  getArchivePatients: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    doctorId?: number;
  }): Promise<PatientsResponse> => {
    const response = await api.get<PatientsResponse>('/patients', { params: {...params, status: 'inactive'} });
    return response.data;
  },

  getPatient: async (id: string): Promise<PatientWithId & { monitoringToken?: string }> => {
    const response = await api.get<PatientWithId & { monitoringToken?: string }>(`/patients/${id}`);
    return response.data;
  },

  generateMonitoringToken: async (id: string): Promise<MonitoringTokenResponse> => {
    const response = await api.post<MonitoringTokenResponse>(`/patients/${id}/generate-monitoring-token`);
    return response.data;
  },

  getMonitoringToken: async (id: string): Promise<MonitoringTokenResponse> => {
    const response = await api.get<MonitoringTokenResponse>(`/patients/${id}/monitoring-token`);
    return response.data;
  },

  togglePatientStatus: async (id: string): Promise<ToggleStatusResponse> => {
    const response = await api.patch<ToggleStatusResponse>(`/patients/${id}/toggle-status`);
    return response.data;
  },

  updatePatient: async (id: string, patient: Partial<Patient>): Promise<PatientWithId> => {
    const response = await api.patch<PatientWithId>(`/patients/${id}`, patient);
    return response.data;
  },

  deletePatient: async (id: string): Promise<void> => {
    await api.delete(`/patients/${id}`);
  },

  getActivePatientsCount: async (): Promise<{ count: number }> => {
    const response = await api.get<{ count: number }>('/patients/count/active');
    return response.data;
  },
};

export const monitoringService = {
  getSessions: async (): Promise<MonitoringSessionResponse[]> => {
    const response = await api.get<MonitoringSessionResponse[]>('/monitoring/sessions');
    return response.data;
  },

  getSessionById: async (sessionId: string): Promise<MonitoringSession> => {
    const response = await api.get<MonitoringSession>(`/monitoring/session/${sessionId}`);
    return response.data;
  },

  getPatientSessions: async (patientId: string, params?: {
    page?: number;
    limit?: number;
    status?: 'started' | 'stopped' | 'error';
    startDateFrom?: string;
    startDateTo?: string;
  }): Promise<SessionsResponse> => {
    const response = await api.get<SessionsResponse>(`/monitoring/patient/${patientId}/sessions`, { params });
    return response.data;
  },

  getSessionData: async (sessionId: string, params?: {
    page?: number;
    limit?: number;
    timestampFrom?: string;
    timestampTo?: string;
  }): Promise<MonitoringDataResponse> => {
    const response = await api.get<MonitoringDataResponse>(`/monitoring/session/${sessionId}/data`, { params });
    return response.data;
  },

  getSessionSummary: async (sessionId: string): Promise<MonitoringSessionSummary> => {
    const response = await api.get<MonitoringSessionSummary>(`/monitoring/session/${sessionId}/summary`);
    return response.data;
  },
};

export default api;
