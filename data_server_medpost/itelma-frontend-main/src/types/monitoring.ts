export interface MonitoringSession {
  id: string;
  sessionId: string;
  status: 'started' | 'stopped' | 'error';
  startTime: string;
  endTime: string | null;
  monitorId: string;
  sseUrl: string;
  isActive: boolean;
  stopReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MLPrediction {
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
}

export interface MonitoringData {
  id: string;
  sessionId: string;
  timestamp: string;
  t_ms: number;
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
  ml?: MLPrediction;
  createdAt: string;
}

export interface SessionsResponse {
  sessions: MonitoringSession[];
  total: number;
  page: number;
  limit: number;
}

export interface MonitoringDataResponse {
  data: MonitoringData[];
  total: number;
  page: number;
  limit: number;
}

export interface MonitoringSessionSummary {
  id: string;
  sessionId: string;
  sampleCount: number;
  fhr_mean: number;
  fhr_min: number;
  fhr_max: number;
  fhr_stddev: number;
  uc_mean: number;
  uc_min: number;
  uc_max: number;
  uc_stddev: number;
  baseline_mean: number;
  baseline_min: number;
  baseline_max: number;
  baseline_stddev: number;
  variability_mean: number;
  variability_min: number;
  variability_max: number;
  variability_stddev: number;
  accel_ms: string;
  decel_ms: string;
  pathology_ms: string;
  duration_ms: string;
  pathologies: string[];
  medications: string[];
  ml?: MLPrediction;
}
