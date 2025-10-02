import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Spin, Space, Checkbox, Button, Tabs, Tag } from 'antd';
import PageHeader from '../../../components/PageHeader/PageHeader';
import styles from './PatientSessions.module.scss';
import { FileSearchOutlined } from '@ant-design/icons';
import {
  FHRChart,
  UCChart,
  BaselineChart,
  VariabilityChart,
  AccelChart,
  DecelChart,
  PathologiesChart,
  MedicationsChart
} from '../../../components/Charts';
import MLPredictionDisplay from '../../../components/MLPredictionDisplay/MLPredictionDisplay';
import { monitoringService } from '../../../services/api';
import { websocketService } from '../../../services/websocketService';
import type { MonitoringDataResponse } from '../../../types';


const { Text } = Typography;

const ActiveSession: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState<string>('');
  const [status, setStatus] = useState<'started' | 'stopped' | 'error' | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [startTimeMs, setStartTimeMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{
    t: number;
    fhr: number;
    uc: number;
    baseline: number;
    variability: number;
    accel: boolean;
    decel: boolean;
    pathologies: string[];
    medications: string[]
  }[]>([]);
  const [visibleCharts, setVisibleCharts] = useState({
    fhr: true,
    uc: true,
    baseline: true,
    variability: true,
    accel: true,
    decel: true,
    pathologies: true,
    medications: true,
  });
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastMLData, setLastMLData] = useState<{
    prediction: 'Normal' | 'Suspect' | 'Pathological';
    confidence: number;
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
  } | null>(null);

  const fhrRef = useRef<unknown>(null);
  const ucRef = useRef<unknown>(null);
  const baselineRef = useRef<unknown>(null);
  const variabilityRef = useRef<unknown>(null);
  const accelRef = useRef<unknown>(null);
  const decelRef = useRef<unknown>(null);
  const pathologiesRef = useRef<unknown>(null);
  const medicationsRef = useRef<unknown>(null);
  const lastTsRef = useRef<number | null>(null);
  const bufferRef = useRef<{
    t: number;
    fhr: number;
    uc: number;
    baseline: number;
    variability: number;
    accel: boolean;
    decel: boolean;
    pathologies: string[];
    medications: string[]
  }[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;
      try {
        setLoading(true);
        setChartLoading(true);
        setChartError(null);
        try {
          setPatientName('');
        } catch {
          // ignore
        }
        const tsTo = Date.now();
        const tsFrom = tsTo - 15 * 60 * 1000;
        const resp: MonitoringDataResponse = await monitoringService.getSessionData(sessionId, {
          timestampFrom: new Date(tsFrom).toISOString(),
          timestampTo: new Date(tsTo).toISOString(),
          limit: 100000,
        } as { timestampFrom: string; timestampTo: string; limit: number });
        const points = resp.data
          .map(d => ({
            t: new Date(d.timestamp).getTime(),
            fhr: Number(d.fhr_bpm),
            uc: Number(d.uc_mmHg),
            baseline: Number(d.baseline_bpm),
            variability: Number(d.variability_bpm),
            accel: Boolean(d.accel),
            decel: Boolean(d.decel),
            pathologies: Array.isArray(d.pathologies) ? d.pathologies : [],
            medications: Array.isArray(d.medications) ? d.medications : [],
          }))
          .sort((a, b) => a.t - b.t);
        setChartData(points);
        lastTsRef.current = points.length ? points[points.length - 1].t : null;
      } catch {
        setChartError('Ошибка загрузки истории');
      } finally {
        setLoading(false);
        setChartLoading(false);
      }
    };
    load();
  }, [sessionId]);

  useEffect(() => {
    const loadMeta = async () => {
      if (!sessionId) return;
      try {
        const s = await monitoringService.getSessionById(sessionId);
        setStatus(s.status);
        setStartTimeMs(new Date(s.startTime).getTime());
        setPatientId((s as any).patient?.id || null); // eslint-disable-line @typescript-eslint/no-explicit-any
        setPatientName((s as any).patient?.name || ''); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (s.status !== 'started') {
          navigate('/', { replace: true });
          return;
        }

        setIsInitializing(false);
      } catch (e) {
        console.error('[ActiveSession] loadMeta error', e);
        setIsInitializing(false);
      }
    };
    loadMeta();
  }, [sessionId, navigate]);

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('token') || '';
    websocketService.connect(token).catch(() => {}).finally(() => {
      if (mounted && sessionId) {
        websocketService.subscribeToSession(sessionId);
      }
    });
    return () => { mounted = false; };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const token = localStorage.getItem('token') || '';
    websocketService.connect(token).finally(() => websocketService.subscribeToSession(sessionId));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onData = (evt: any) => {
      if (evt.sessionId !== sessionId) return;
      const tsIso = evt.data?.timestamp || evt.timestamp;
      if (!tsIso) return;
      const t = new Date(tsIso).getTime();
      if (lastTsRef.current && t <= lastTsRef.current) return;
      lastTsRef.current = t;
      bufferRef.current.push({
        t,
        fhr: Number(evt.data?.fhr_bpm),
        uc: Number(evt.data?.uc_mmHg),
        baseline: Number(evt.data?.baseline_bpm),
        variability: Number(evt.data?.variability_bpm),
        accel: Boolean(evt.data?.accel),
        decel: Boolean(evt.data?.decel),
        pathologies: Array.isArray(evt.data?.pathologies) ? evt.data.pathologies : [],
        medications: Array.isArray(evt.data?.medications) ? evt.data.medications : [],
      });

      if (evt.data?.ml) {
        setLastMLData(evt.data.ml);
      }

      if (evt.patient?.name && !patientName) setPatientName(evt.patient.name);
      if (evt.patient?.id && !patientId) setPatientId(evt.patient.id);
      if (evt.session?.startTime && !startTimeMs) setStartTimeMs(new Date(evt.session.startTime).getTime());
    if (evt.session?.status) setStatus(evt.session.status as 'started' | 'stopped' | 'error');
    };
    const onStatus = (evt: { sessionId: string; status?: string }) => {
      if (evt.sessionId !== sessionId) return;
      if (evt.status) setStatus(evt.status as 'started' | 'stopped' | 'error');
    };

    websocketService.on('monitoring-data', onData);
    websocketService.on('session-status', onStatus);
    websocketService.on('session-stopped', onStatus);
    websocketService.on('session-error', onStatus);

    return () => {
      websocketService.off('monitoring-data', onData);
      websocketService.off('session-status', onStatus);
      websocketService.off('session-stopped', onStatus);
      websocketService.off('session-error', onStatus);
      queueMicrotask(() => websocketService.unsubscribeFromSession(sessionId));
    };
  }, [sessionId, patientName, patientId, startTimeMs]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (bufferRef.current.length === 0) return;
      const toFlush = bufferRef.current;
      bufferRef.current = [];
      setChartData(prev => [...prev, ...toFlush]);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const badge = useMemo(() => {
    if (status === 'started') return <Tag color="#52c41a">Активна</Tag>;
    if (status === 'stopped') return <Tag color="#ff4d4f">Stopped</Tag>;
    if (status === 'error') return <Tag color="#ff4d4f">Error</Tag>;
    return null;
  }, [status]);

  const durationText = useMemo(() => {
    if (!startTimeMs) return null;
    const end = status === 'started' ? nowMs : (lastTsRef.current ?? startTimeMs);
    const durSec = Math.max(0, Math.floor((end - startTimeMs) / 1000));
    const hh = String(Math.floor(durSec / 3600)).padStart(2, '0');
    const mm = String(Math.floor((durSec % 3600) / 60)).padStart(2, '0');
    const ss = String(durSec % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [startTimeMs, nowMs, status]);

  const actions = useMemo(() => (
    status !== 'started' && patientId && sessionId ? (
      <Button icon={<FileSearchOutlined />} onClick={() => navigate(`/patients/${patientId}/session/${sessionId}`)}>Просмотр сводки</Button>
    ) : null
  ), [status, patientId, sessionId, navigate]);

  const StatusTab = () => {
    return <MLPredictionDisplay data={lastMLData} />;
  };

  if (isInitializing) {
    return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader
        title={`Сессия ${sessionId || ''}`}
        subtitle={(
          <div>
            {patientName ? (<div>Пациентка: {patientName}</div>) : null}
            {startTimeMs ? (<div>Время начала: {new Date(startTimeMs).toLocaleString()}</div>) : null}
            {durationText ? (<div>Продолжительность: {durationText}</div>) : null}
          </div>
        )}
        showBack
        titlePostfix={badge ? <div style={{ marginLeft: 12 }}>{badge}</div> : undefined}
        actions={actions}
        actionsVertical
      />
      <div className={styles.content}>
        <Tabs
          defaultActiveKey="status"
          items={[
            {
              key: 'status',
              label: 'Прогноз',
              children: <StatusTab />
            },
            {
              key: 'charts',
              label: 'Графики',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Space wrap>
                      <Checkbox checked={visibleCharts.fhr} onChange={(e) => setVisibleCharts(prev => ({ ...prev, fhr: e.target.checked }))}>ЧСС плода</Checkbox>
                      <Checkbox checked={visibleCharts.uc} onChange={(e) => setVisibleCharts(prev => ({ ...prev, uc: e.target.checked }))}>Тонус матки</Checkbox>
                      <Checkbox checked={visibleCharts.baseline} onChange={(e) => setVisibleCharts(prev => ({ ...prev, baseline: e.target.checked }))}>Базальная ЧСС</Checkbox>
                      <Checkbox checked={visibleCharts.variability} onChange={(e) => setVisibleCharts(prev => ({ ...prev, variability: e.target.checked }))}>Вариабельность</Checkbox>
                      <Checkbox checked={visibleCharts.accel} onChange={(e) => setVisibleCharts(prev => ({ ...prev, accel: e.target.checked }))}>Акцелерации</Checkbox>
                      <Checkbox checked={visibleCharts.decel} onChange={(e) => setVisibleCharts(prev => ({ ...prev, decel: e.target.checked }))}>Децелерации</Checkbox>
                      <Checkbox checked={visibleCharts.pathologies} onChange={(e) => setVisibleCharts(prev => ({ ...prev, pathologies: e.target.checked }))}>Патологии</Checkbox>
                      <Checkbox checked={visibleCharts.medications} onChange={(e) => setVisibleCharts(prev => ({ ...prev, medications: e.target.checked }))}>Медикаменты</Checkbox>
                    </Space>
                  </div>
                  {chartError && <Text type="danger">{chartError}</Text>}
                  {loading || chartLoading ? <Spin /> : null}

        {visibleCharts.fhr && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
              <Text strong>ЧСС плода | FHR (bpm)</Text>
            </div>
            <FHRChart
              ref={fhrRef}
              data={chartData}
              height={320}
              showZoomControls={false}
            />
          </>
        )}

        {visibleCharts.uc && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
              <Text strong>Тонус матки | UC (мм рт. ст.)</Text>
            </div>
            <UCChart
              ref={ucRef}
              data={chartData}
              height={320}
              showZoomControls={false}
            />
          </>
        )}

        {visibleCharts.baseline && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
              <Text strong>Базальная ЧСС | Baseline (bpm)</Text>
            </div>
            <BaselineChart
              ref={baselineRef}
              data={chartData}
              height={320}
              showZoomControls={false}
            />
          </>
        )}

        {visibleCharts.variability && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
              <Text strong>Вариабельность | Variability (bpm)</Text>
            </div>
            <VariabilityChart
              ref={variabilityRef}
              data={chartData}
              height={320}
              showZoomControls={false}
            />
          </>
        )}

        {visibleCharts.accel && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
              <Text strong>Акцелерации | Accelerations</Text>
            </div>
            <AccelChart
              ref={accelRef}
              data={chartData}
              height={120}
              showZoomControls={false}
            />
          </>
        )}

        {visibleCharts.decel && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
              <Text strong>Децелерации | Decelerations</Text>
            </div>
            <DecelChart
              ref={decelRef}
              data={chartData}
              height={120}
              showZoomControls={false}
            />
          </>
        )}

        {visibleCharts.pathologies && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
              <Text strong>Патологии | Pathologies</Text>
            </div>
            <PathologiesChart
              ref={pathologiesRef}
              data={chartData}
              height={120}
              showZoomControls={false}
            />
          </>
        )}

        {visibleCharts.medications && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
              <Text strong>Медикаменты | Medications</Text>
            </div>
            <MedicationsChart
              ref={medicationsRef}
              data={chartData}
              height={120}
              showZoomControls={false}
            />
          </>
        )}
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};

export default ActiveSession;


