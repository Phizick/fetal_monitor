export interface NewSessionEvent {
  sessionId: string;
  status: 'started' | 'stopped' | 'error';
  startTime: string;
  patient: {
    id: string;
    name: string;
    roomNumber: string;
    phone?: string;
    pregnancyStartDate: string;
    fetusCount: number;
    doctorId: number;
  };
  doctor: {
    id: number;
    name: string;
    login: string;
  };
  timestamp: string;
}

export interface MonitoringDataEvent {
  sessionId: string;
  timestamp: string;
  data: {
    fhr_bpm: number;
    uc_mmHg: number;
    baseline_bpm: number;
    variability_bpm: number;
    accel: boolean;
    decel: boolean;
    pathology: boolean;
    pathology_desc: string;
    pathologies: string[];
    medications: string[];
    ml?: {
      prediction: 'Normal' | 'Suspect' | 'Pathological';
      confidence: number;
      probabilities: {
        Normal: number;
        Suspect: number;
        Pathological: number;
      };
      forecasts: {
        '10min': {
          fetal_bradycardia: number;
          fetal_tachycardia: number;
          low_variability: number;
          uterine_tachysystole: number;
          any_pathology: number;
        };
        '30min': {
          fetal_bradycardia: number;
          fetal_tachycardia: number;
          low_variability: number;
          uterine_tachysystole: number;
          any_pathology: number;
        };
        '60min': {
          fetal_bradycardia: number;
          fetal_tachycardia: number;
          low_variability: number;
          uterine_tachysystole: number;
          any_pathology: number;
        };
      };
    };
  };
  patient: {
    id: string;
    name: string;
    roomNumber: string;
    phone?: string;
    pregnancyStartDate: string;
    fetusCount: number;
    doctorId: number;
  };
  doctor: {
    id: number;
    name: string;
    login: string;
  };
  session: {
    startTime: string;
    status: string;
  };
}

export interface SessionStoppedEvent {
  sessionId: string;
  reason: string;
  timestamp: string;
}

export interface SessionErrorEvent {
  sessionId: string;
  error: {
    type: string;
    message: string;
  };
  timestamp: string;
}

export interface SessionStatusEvent {
  sessionId: string;
  status: 'started' | 'stopped' | 'error';
  timestamp: string;
}

export interface MonitoringErrorEvent {
  sessionId: string;
  timestamp: string;
  error: {
    type: string;
    message: string;
  };
}

export interface MonitoringSessionResponse {
  sessionId: string;
  status: 'started' | 'stopped' | 'error';
  startTime: string;
  monitorId: string;
  isActive: boolean;
  patient: {
    id: string;
    name: string;
    roomNumber: string;
    phone?: string;
    pregnancyStartDate: string;
    fetusCount: number;
    doctorId: number;
  };
  doctor: {
    id: number;
    name: string;
    login: string;
  };
}

export interface PatientTableRow {
  sessionId: string;
  status: 'started' | 'stopped' | 'error' | 'no-data';
  startTime: string;
  isActive: boolean;
  patient: {
    id: string;
    name: string;
    roomNumber: string;
    phone?: string;
    pregnancyStartDate: string;
    fetusCount: number;
    doctorId: number;
  };
  doctor: {
    id: number;
    name: string;
    login: string;
  };
  lastData?: {
    timestamp: string;
    fhr_bpm: number;
    uc_mmHg: number;
    baseline_bpm: number;
    variability_bpm: number;
    accel: boolean;
    decel: boolean;
    pathology: boolean;
    pathology_desc: string;
    pathologies: string[];
    medications: string[];
    ml?: {
      prediction: 'Normal' | 'Suspect' | 'Pathological';
      confidence: number;
      probabilities: {
        Normal: number;
        Suspect: number;
        Pathological: number;
      };
      forecasts: {
        '10min': {
          fetal_bradycardia: number;
          fetal_tachycardia: number;
          low_variability: number;
          uterine_tachysystole: number;
          any_pathology: number;
        };
        '30min': {
          fetal_bradycardia: number;
          fetal_tachycardia: number;
          low_variability: number;
          uterine_tachysystole: number;
          any_pathology: number;
        };
        '60min': {
          fetal_bradycardia: number;
          fetal_tachycardia: number;
          low_variability: number;
          uterine_tachysystole: number;
          any_pathology: number;
        };
      };
    };
  };
  lastDataTime?: string;
}
