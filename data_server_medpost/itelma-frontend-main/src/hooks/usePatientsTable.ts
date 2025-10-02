import { useState, useEffect, useCallback } from 'react';
import { websocketService } from '../services/websocketService';
import { monitoringService, patientService } from '../services/api';
import type {
  PatientTableRow,
  NewSessionEvent,
  MonitoringDataEvent,
  SessionStoppedEvent,
  SessionErrorEvent
} from '../types';

export const usePatientsTable = () => {
  const [patients, setPatients] = useState<PatientTableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);

  const handleNewSession = useCallback((data: NewSessionEvent) => {

    if (!data.patient || !data.doctor) {
      console.error('Incomplete session data:', data);
      return;
    }

    setPatients(prev => {
      const existingPatient = prev.find(p => p.sessionId === data.sessionId);
      if (existingPatient) {
        return prev;
      }

      const newPatient: PatientTableRow = {
        sessionId: data.sessionId,
        status: data.status,
        startTime: data.startTime,
        isActive: data.status === 'started',
        patient: {
          id: data.patient.id,
          name: data.patient.name || 'Неизвестно',
          roomNumber: data.patient.roomNumber || 'Неизвестно',
          phone: data.patient.phone,
          pregnancyStartDate: data.patient.pregnancyStartDate || new Date().toISOString(),
          fetusCount: data.patient.fetusCount || 1,
          doctorId: data.patient.doctorId || 0
        },
        doctor: {
          id: data.doctor.id,
          name: data.doctor.name || 'Неизвестно',
          login: data.doctor.login || 'unknown'
        },
        lastDataTime: data.timestamp
      };

      return [...prev, newPatient];
    });

    websocketService.subscribeToSession(data.sessionId);
  }, []);

  const handleMonitoringData = useCallback((data: MonitoringDataEvent) => {

    if (!data.data) {
      console.error('No monitoring data in event:', data);
      return;
    }

    setPatients(prev => prev.map(patient =>
      patient.sessionId === data.sessionId
        ? {
            ...patient,
            lastData: {
              timestamp: data.timestamp,
              fhr_bpm: data.data.fhr_bpm || 0,
              uc_mmHg: data.data.uc_mmHg || 0,
              baseline_bpm: data.data.baseline_bpm || 0,
              variability_bpm: data.data.variability_bpm || 0,
              accel: data.data.accel || false,
              decel: data.data.decel || false,
              pathology: data.data.pathology || false,
              pathology_desc: data.data.pathology_desc || '',
              pathologies: data.data.pathologies || [],
              medications: data.data.medications || [],
              ml: data.data.ml
            },
            lastDataTime: data.timestamp
          }
        : patient
    ));
  }, []);

  const handleSessionStopped = useCallback((data: SessionStoppedEvent) => {
    setPatients(prev => prev.map(patient =>
      patient.sessionId === data.sessionId
        ? {
            ...patient,
            status: 'stopped',
            isActive: false
          }
        : patient
    ));
  }, []);

  const handleSessionError = useCallback((data: SessionErrorEvent) => {
    setPatients(prev => prev.map(patient =>
      patient.sessionId === data.sessionId
        ? {
            ...patient,
            status: 'error',
            isActive: false
          }
        : patient
    ));
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const stats = await patientService.getActivePatientsCount();
      setTotalPatientsCount(stats.count);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const sessions = await monitoringService.getSessions();

      const initialPatients: PatientTableRow[] = sessions.map(session => {

        if (!session.patient || !session.doctor) {
          console.error('Incomplete session data:', session);
          return null;
        }

        return {
          sessionId: session.sessionId,
          status: session.status,
          startTime: session.startTime,
          isActive: session.isActive,
          patient: {
            id: session.patient.id,
            name: session.patient.name || 'Неизвестно',
            roomNumber: session.patient.roomNumber || 'Неизвестно',
            phone: session.patient.phone,
            pregnancyStartDate: session.patient.pregnancyStartDate || new Date().toISOString(),
            fetusCount: session.patient.fetusCount || 1,
            doctorId: session.patient.doctorId || 0
          },
          doctor: {
            id: session.doctor.id,
            name: session.doctor.name || 'Неизвестно',
            login: session.doctor.login || 'unknown'
          }
        };
      }).filter(Boolean) as PatientTableRow[];

      setPatients(initialPatients);

      sessions.forEach(session => {
        websocketService.subscribeToSession(session.sessionId);
      });

    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(`Ошибка загрузки данных: ${err}`);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Нет токена в localStorage');
        return;
      }

      setLoading(true);
      setError(null);

      websocketService.off('new-session', handleNewSession);
      websocketService.off('monitoring-data', handleMonitoringData);
      websocketService.off('session-stopped', handleSessionStopped);
      websocketService.off('session-error', handleSessionError);

      await websocketService.connect(token);
      setIsConnected(true);

      websocketService.on('new-session', handleNewSession);
      websocketService.on('monitoring-data', handleMonitoringData);
      websocketService.on('session-stopped', handleSessionStopped);
      websocketService.on('session-error', handleSessionError);

      await loadInitialData();

    } catch (err) {
      console.error('WebSocket connection error:', err);
      setError(`Ошибка подключения: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [handleNewSession, handleMonitoringData, handleSessionStopped, handleSessionError, loadInitialData]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setIsConnected(false);
    setPatients([]);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      await loadStats();
      await connect();
    };

    initialize();
  }, [loadStats, connect]);

  useEffect(() => {
    return () => {
      websocketService.off('new-session', handleNewSession);
      websocketService.off('monitoring-data', handleMonitoringData);
      websocketService.off('session-stopped', handleSessionStopped);
      websocketService.off('session-error', handleSessionError);
    };
  }, [handleNewSession, handleMonitoringData, handleSessionStopped, handleSessionError]);

  return {
    patients,
    loading,
    error,
    isConnected,
    totalPatientsCount,
    reloadStats: loadStats,
    connect,
    disconnect
  };
};
