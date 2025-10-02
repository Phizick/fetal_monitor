import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Table, Tag, Spin, Tabs, Button, Space, Checkbox } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '../../../components/PageHeader/PageHeader';
import { monitoringService, patientService } from '../../../services/api';
import type { MonitoringSessionSummary, MonitoringSession } from '../../../types/monitoring';
import styles from './PatientSessions.module.scss';
import type { MonitoringDataResponse } from '../../../types';
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

const { Text } = Typography;

function msToHms(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

const labels: Record<string, string> = {
  sampleCount: 'Кол-во сэмплов',
  fhr_mean: 'Средняя ЧСС плода (уд/мин)',
  fhr_min: 'Мин. ЧСС плода (уд/мин)',
  fhr_max: 'Макс. ЧСС плода (уд/мин)',
  fhr_stddev: 'СКО ЧСС (уд/мин)',
  uc_mean: 'Средний тонус матки (мм рт. ст.)',
  baseline_mean: 'Базальная ЧСС (уд/мин)',
  variability_mean: 'Вариабельность (уд/мин)',
  accel_ms: 'Время в акцелерациях (мм:сс)',
  decel_ms: 'Время в децелерациях (мм:сс)',
  pathology_ms: 'Время с эпизодами патологии (мм:сс)',
  duration_ms: 'Длительность сессии (чч:мм:сс)'
};

const PatientSessionDetails: React.FC = () => {
  const { id, sessionId } = useParams();
  const [summary, setSummary] = useState<MonitoringSessionSummary | null>(null);
  const [session, setSession] = useState<MonitoringSession | null>(null);
  const [patientName, setPatientName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{ t: number; fhr: number; uc: number; baseline: number; variability: number; accel: boolean; decel: boolean; pathologies: string[]; medications: string[] }[]>([]);
  const fhrRef = useRef<unknown>(null);
  const ucRef = useRef<unknown>(null);
  const baselineRef = useRef<unknown>(null);
  const variabilityRef = useRef<unknown>(null);
  const accelRef = useRef<unknown>(null);
  const decelRef = useRef<unknown>(null);
  const pathologiesRef = useRef<unknown>(null);
  const medicationsRef = useRef<unknown>(null);
  const fhrScrollRef = useRef<HTMLDivElement | null>(null);
  const ucScrollRef = useRef<HTMLDivElement | null>(null);
  const baselineScrollRef = useRef<HTMLDivElement | null>(null);
  const variabilityScrollRef = useRef<HTMLDivElement | null>(null);
  const accelScrollRef = useRef<HTMLDivElement | null>(null);
  const decelScrollRef = useRef<HTMLDivElement | null>(null);
  const pathologiesScrollRef = useRef<HTMLDivElement | null>(null);
  const medicationsScrollRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);

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

  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;
      try {
        setLoading(true);
        const [s, sessionInfo] = await Promise.all([
          monitoringService.getSessionSummary(sessionId),
          monitoringService.getSessionById(sessionId)
        ]);
        setSummary(s);
        setSession(sessionInfo);
      } catch {
        setError('Ошибка загрузки сессии');
      } finally {
        setLoading(false);
      }
    };
    const loadName = async () => {
      if (!id) return;
      try {
        const p = await patientService.getPatient(id);
        setPatientName(p.name);
      } catch {
        setPatientName('—');
      }
    };
    loadName();
    load();
  }, [id, sessionId]);

  const loadChart = async () => {
    if (!sessionId) return;
    try {
      setChartLoading(true);
      setChartError(null);
      const resp: MonitoringDataResponse = await monitoringService.getSessionData(sessionId, { page: 1, limit: 100000 });
      const points = resp.data.map(d => ({
        t: new Date(d.timestamp).getTime(),
        fhr: d.fhr_bpm,
        uc: d.uc_mmHg,
        baseline: d.baseline_bpm,
        variability: d.variability_bpm,
        accel: d.accel,
        decel: d.decel,
        pathologies: Array.isArray(d.pathologies) ? d.pathologies : [],
        medications: Array.isArray(d.medications) ? d.medications : [],
      }));
      setChartData(points);
    } catch {
      setChartError('Ошибка загрузки данных графиков');
    } finally {
      setChartLoading(false);
    }
  };

  type ZoomCapable = { zoom?: (opts?: unknown) => void; resetZoom?: () => void };
  const zoomIn = (ref: React.MutableRefObject<unknown>) => { (ref.current as ZoomCapable | null)?.zoom?.({ x: 1.2 }); };
  const zoomOut = (ref: React.MutableRefObject<unknown>) => { (ref.current as ZoomCapable | null)?.zoom?.({ x: 0.8 }); };
  const resetZoom = (ref: React.MutableRefObject<unknown>) => { (ref.current as ZoomCapable | null)?.resetZoom?.(); };

  const controls = (
    <Space>
      <Button onClick={() => { zoomIn(fhrRef); zoomIn(ucRef); zoomIn(baselineRef); zoomIn(variabilityRef); zoomIn(accelRef); zoomIn(decelRef); zoomIn(pathologiesRef); zoomIn(medicationsRef); }}>+</Button>
      <Button onClick={() => { zoomOut(fhrRef); zoomOut(ucRef); zoomOut(baselineRef); zoomOut(variabilityRef); zoomOut(accelRef); zoomOut(decelRef); zoomOut(pathologiesRef); zoomOut(medicationsRef); }}>-</Button>
      <Button onClick={() => { resetZoom(fhrRef); resetZoom(ucRef); resetZoom(baselineRef); resetZoom(variabilityRef); resetZoom(accelRef); resetZoom(decelRef); resetZoom(pathologiesRef); resetZoom(medicationsRef); }}>Сбросить зум</Button>
    </Space>
  );

  const columns: ColumnsType<{ key: string; metric: string; value: React.ReactNode }> = [
    { title: 'Показатель', dataIndex: 'metric', key: 'metric', width: 300 },
    { title: 'Значение', dataIndex: 'value', key: 'value' },
  ];

  const dataSource = summary ? [
    { key: 'sampleCount', metric: labels.sampleCount, value: summary.sampleCount },
    { key: 'fhr_mean', metric: labels.fhr_mean, value: summary.fhr_mean.toFixed(1) },
    { key: 'fhr_min', metric: labels.fhr_min, value: summary.fhr_min },
    { key: 'fhr_max', metric: labels.fhr_max, value: summary.fhr_max },
    { key: 'fhr_stddev', metric: labels.fhr_stddev, value: summary.fhr_stddev.toFixed(1) },
    { key: 'uc_mean', metric: labels.uc_mean, value: summary.uc_mean.toFixed(1) },
    { key: 'baseline_mean', metric: labels.baseline_mean, value: summary.baseline_mean.toFixed(1) },
    { key: 'variability_mean', metric: labels.variability_mean, value: summary.variability_mean.toFixed(1) },
    { key: 'accel_ms', metric: labels.accel_ms, value: msToHms(Number(summary.accel_ms)) },
    { key: 'decel_ms', metric: labels.decel_ms, value: msToHms(Number(summary.decel_ms)) },
    { key: 'pathology_ms', metric: labels.pathology_ms, value: msToHms(Number(summary.pathology_ms)) },
    { key: 'duration_ms', metric: labels.duration_ms, value: msToHms(Number(summary.duration_ms)) },
  ] : [];

  return (
    <div className={styles.container}>
      <PageHeader
        title={`Сессия ${sessionId || ''}`}
        subtitle={(
          <div>
            {patientName ? (<div>Пациентка: {patientName}</div>) : null}
            {session ? (<div>Время начала: {formatDateTime(session.startTime)}</div>) : null}
            {session?.endTime ? (<div>Время окончания: {formatDateTime(session.endTime)}</div>) : null}
          </div>
        )}
        showBack
      />
      <div className={styles.content}>
        <Tabs
          defaultActiveKey="summary"
          items={[
            {
              key: 'summary',
              label: 'Сводка',
              children: (
                <>
                  {error && <div className={styles.center}><Text type="danger">{error}</Text></div>}
                  {loading ? <div className={styles.center}><Spin /></div> : (
                    <>
                      {summary && (
                        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {summary.pathologies && summary.pathologies.length > 0 && (
                            <div>
                              <Text style={{ color: '#595959', marginRight: 8 }}>Обнаруженные патологии:</Text>
                              {summary.pathologies.map((p, i) => (
                                <Tag color="#ff4d4f" key={i} style={{ marginTop: 4 }}>{p}</Tag>
                              ))}
                            </div>
                          )}
                          {summary.medications && summary.medications.length > 0 && (
                            <div>
                              <Text style={{ color: '#595959', marginRight: 8 }}>Применённые препараты:</Text>
                              {summary.medications.map((m, i) => (
                                <Tag color="#52c41a" key={i} style={{ marginTop: 4 }}>{m}</Tag>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <Table
                        columns={columns}
                        dataSource={dataSource}
                        pagination={false}
                        size="small"
                        rowKey="key"
                      />
                    </>
                  )}
                </>
              )
            },
            {
              key: 'prediction',
              label: 'Прогноз',
              children: (
                <div>
                  {error && <div className={styles.center}><Text type="danger">{error}</Text></div>}
                  {loading ? <div className={styles.center}><Spin /></div> : (
                    <MLPredictionDisplay data={summary?.ml || null} />
                  )}
                </div>
              )
            },
            {
              key: 'charts',
              label: 'Графики',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <Checkbox checked={visibleCharts.fhr} onChange={(e) => setVisibleCharts(v => ({ ...v, fhr: e.target.checked }))}>FHR</Checkbox>
                      <Checkbox checked={visibleCharts.uc} onChange={(e) => setVisibleCharts(v => ({ ...v, uc: e.target.checked }))}>UC</Checkbox>
                      <Checkbox checked={visibleCharts.baseline} onChange={(e) => setVisibleCharts(v => ({ ...v, baseline: e.target.checked }))}>Baseline</Checkbox>
                      <Checkbox checked={visibleCharts.variability} onChange={(e) => setVisibleCharts(v => ({ ...v, variability: e.target.checked }))}>Variability</Checkbox>
                      <Checkbox checked={visibleCharts.accel} onChange={(e) => setVisibleCharts(v => ({ ...v, accel: e.target.checked }))}>Accel</Checkbox>
                      <Checkbox checked={visibleCharts.decel} onChange={(e) => setVisibleCharts(v => ({ ...v, decel: e.target.checked }))}>Decel</Checkbox>
                      <Checkbox checked={visibleCharts.pathologies} onChange={(e) => setVisibleCharts(v => ({ ...v, pathologies: e.target.checked }))}>Патологии</Checkbox>
                      <Checkbox checked={visibleCharts.medications} onChange={(e) => setVisibleCharts(v => ({ ...v, medications: e.target.checked }))}>Медикаменты</Checkbox>
                    </div>
                    {controls}
                  </div>
                  {chartError && <Text type="danger">{chartError}</Text>}
                  {chartLoading && <Spin />}
                  {!chartLoading && chartData.length > 0 && (
                    <>
                      {visibleCharts.fhr && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
                            <Text strong>ЧСС плода | FHR (bpm)</Text>
                            <Space size="small">
                              <Button size="small" onClick={() => zoomIn(fhrRef)}>+</Button>
                              <Button size="small" onClick={() => zoomOut(fhrRef)}>-</Button>
                              <Button size="small" onClick={() => resetZoom(fhrRef)}>Сбросить</Button>
                            </Space>
                          </div>
                          <div
                            ref={fhrScrollRef}
                            onScroll={(e) => {
                              if (syncingRef.current) return;
                              syncingRef.current = true;
                              const left = (e.currentTarget as HTMLDivElement).scrollLeft;
                              if (ucScrollRef.current) ucScrollRef.current.scrollLeft = left;
                              if (baselineScrollRef.current) baselineScrollRef.current.scrollLeft = left;
                              if (variabilityScrollRef.current) variabilityScrollRef.current.scrollLeft = left;
                              if (accelScrollRef.current) accelScrollRef.current.scrollLeft = left;
                              if (decelScrollRef.current) decelScrollRef.current.scrollLeft = left;
                              if (pathologiesScrollRef.current) pathologiesScrollRef.current.scrollLeft = left;
                              if (medicationsScrollRef.current) medicationsScrollRef.current.scrollLeft = left;
                              requestAnimationFrame(() => { syncingRef.current = false; });
                            }}
                            style={{ overflowX: 'auto', overflowY: 'hidden' }}
                          >
                            <div style={{ width: Math.max(chartData.length * 2, 800) }}>
                              <FHRChart
                                ref={fhrRef}
                                data={chartData}
                                height={300}
                                showZoomControls={false}
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {visibleCharts.uc && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
                            <Text strong>Тонус матки | UC (мм рт. ст.)</Text>
                            <Space size="small">
                              <Button size="small" onClick={() => zoomIn(ucRef)}>+</Button>
                              <Button size="small" onClick={() => zoomOut(ucRef)}>-</Button>
                              <Button size="small" onClick={() => resetZoom(ucRef)}>Сбросить</Button>
                            </Space>
                          </div>
                          <div
                            ref={ucScrollRef}
                            onScroll={(e) => {
                              if (syncingRef.current) return;
                              syncingRef.current = true;
                              const left = (e.currentTarget as HTMLDivElement).scrollLeft;
                              if (fhrScrollRef.current) fhrScrollRef.current.scrollLeft = left;
                              if (baselineScrollRef.current) baselineScrollRef.current.scrollLeft = left;
                              if (variabilityScrollRef.current) variabilityScrollRef.current.scrollLeft = left;
                              if (accelScrollRef.current) accelScrollRef.current.scrollLeft = left;
                              if (decelScrollRef.current) decelScrollRef.current.scrollLeft = left;
                              if (pathologiesScrollRef.current) pathologiesScrollRef.current.scrollLeft = left;
                              if (medicationsScrollRef.current) medicationsScrollRef.current.scrollLeft = left;
                              requestAnimationFrame(() => { syncingRef.current = false; });
                            }}
                            style={{ overflowX: 'auto', overflowY: 'hidden' }}
                          >
                            <div style={{ width: Math.max(chartData.length * 2, 800) }}>
                              <UCChart
                                ref={ucRef}
                                data={chartData}
                                height={300}
                                showZoomControls={false}
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {visibleCharts.baseline && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
                            <Text strong>Базальная ЧСС | Baseline (bpm)</Text>
                            <Space size="small">
                              <Button size="small" onClick={() => zoomIn(baselineRef)}>+</Button>
                              <Button size="small" onClick={() => zoomOut(baselineRef)}>-</Button>
                              <Button size="small" onClick={() => resetZoom(baselineRef)}>Сбросить</Button>
                            </Space>
                          </div>
                          <div
                            ref={baselineScrollRef}
                            onScroll={(e) => {
                              if (syncingRef.current) return;
                              syncingRef.current = true;
                              const left = (e.currentTarget as HTMLDivElement).scrollLeft;
                              if (fhrScrollRef.current) fhrScrollRef.current.scrollLeft = left;
                              if (ucScrollRef.current) ucScrollRef.current.scrollLeft = left;
                              if (variabilityScrollRef.current) variabilityScrollRef.current.scrollLeft = left;
                              if (accelScrollRef.current) accelScrollRef.current.scrollLeft = left;
                              if (decelScrollRef.current) decelScrollRef.current.scrollLeft = left;
                              if (pathologiesScrollRef.current) pathologiesScrollRef.current.scrollLeft = left;
                              if (medicationsScrollRef.current) medicationsScrollRef.current.scrollLeft = left;
                              requestAnimationFrame(() => { syncingRef.current = false; });
                            }}
                            style={{ overflowX: 'auto', overflowY: 'hidden' }}
                          >
                            <div style={{ width: Math.max(chartData.length * 2, 800) }}>
                              <BaselineChart
                                ref={baselineRef}
                                data={chartData}
                                height={300}
                                showZoomControls={false}
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {visibleCharts.variability && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
                            <Text strong>Вариабельность | Variability (bpm)</Text>
                            <Space size="small">
                              <Button size="small" onClick={() => zoomIn(variabilityRef)}>+</Button>
                              <Button size="small" onClick={() => zoomOut(variabilityRef)}>-</Button>
                              <Button size="small" onClick={() => resetZoom(variabilityRef)}>Сбросить</Button>
                            </Space>
                          </div>
                          <div
                            ref={variabilityScrollRef}
                            onScroll={(e) => {
                              if (syncingRef.current) return;
                              syncingRef.current = true;
                              const left = (e.currentTarget as HTMLDivElement).scrollLeft;
                              if (fhrScrollRef.current) fhrScrollRef.current.scrollLeft = left;
                              if (ucScrollRef.current) ucScrollRef.current.scrollLeft = left;
                              if (baselineScrollRef.current) baselineScrollRef.current.scrollLeft = left;
                              if (accelScrollRef.current) accelScrollRef.current.scrollLeft = left;
                              if (decelScrollRef.current) decelScrollRef.current.scrollLeft = left;
                              if (pathologiesScrollRef.current) pathologiesScrollRef.current.scrollLeft = left;
                              if (medicationsScrollRef.current) medicationsScrollRef.current.scrollLeft = left;
                              requestAnimationFrame(() => { syncingRef.current = false; });
                            }}
                            style={{ overflowX: 'auto', overflowY: 'hidden' }}
                          >
                            <div style={{ width: Math.max(chartData.length * 2, 800) }}>
                              <VariabilityChart
                                ref={variabilityRef}
                                data={chartData}
                                height={300}
                                showZoomControls={false}
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {visibleCharts.accel && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
                            <Text strong>Акцелерации | Accelerations</Text>
                            <Space size="small">
                              <Button size="small" onClick={() => zoomIn(accelRef)}>+</Button>
                              <Button size="small" onClick={() => zoomOut(accelRef)}>-</Button>
                              <Button size="small" onClick={() => resetZoom(accelRef)}>Сбросить</Button>
                            </Space>
                          </div>
                          <div
                            ref={accelScrollRef}
                            onScroll={(e) => {
                              if (syncingRef.current) return;
                              syncingRef.current = true;
                              const left = (e.currentTarget as HTMLDivElement).scrollLeft;
                              if (fhrScrollRef.current) fhrScrollRef.current.scrollLeft = left;
                              if (ucScrollRef.current) ucScrollRef.current.scrollLeft = left;
                              if (baselineScrollRef.current) baselineScrollRef.current.scrollLeft = left;
                              if (variabilityScrollRef.current) variabilityScrollRef.current.scrollLeft = left;
                              if (decelScrollRef.current) decelScrollRef.current.scrollLeft = left;
                              if (pathologiesScrollRef.current) pathologiesScrollRef.current.scrollLeft = left;
                              if (medicationsScrollRef.current) medicationsScrollRef.current.scrollLeft = left;
                              requestAnimationFrame(() => { syncingRef.current = false; });
                            }}
                            style={{ overflowX: 'auto', overflowY: 'hidden' }}
                          >
                            <div style={{ width: Math.max(chartData.length * 2, 800) }}>
                              <AccelChart
                                ref={accelRef}
                                data={chartData}
                                height={120}
                                showZoomControls={false}
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {visibleCharts.decel && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
                            <Text strong>Децелерации | Decelerations</Text>
                            <Space size="small">
                              <Button size="small" onClick={() => zoomIn(decelRef)}>+</Button>
                              <Button size="small" onClick={() => zoomOut(decelRef)}>-</Button>
                              <Button size="small" onClick={() => resetZoom(decelRef)}>Сбросить</Button>
                            </Space>
                          </div>
                          <div
                            ref={decelScrollRef}
                            onScroll={(e) => {
                              if (syncingRef.current) return;
                              syncingRef.current = true;
                              const left = (e.currentTarget as HTMLDivElement).scrollLeft;
                              if (fhrScrollRef.current) fhrScrollRef.current.scrollLeft = left;
                              if (ucScrollRef.current) ucScrollRef.current.scrollLeft = left;
                              if (baselineScrollRef.current) baselineScrollRef.current.scrollLeft = left;
                              if (variabilityScrollRef.current) variabilityScrollRef.current.scrollLeft = left;
                              if (accelScrollRef.current) accelScrollRef.current.scrollLeft = left;
                              if (pathologiesScrollRef.current) pathologiesScrollRef.current.scrollLeft = left;
                              if (medicationsScrollRef.current) medicationsScrollRef.current.scrollLeft = left;
                              requestAnimationFrame(() => { syncingRef.current = false; });
                            }}
                            style={{ overflowX: 'auto', overflowY: 'hidden' }}
                          >
                            <div style={{ width: Math.max(chartData.length * 2, 800) }}>
                              <DecelChart
                                ref={decelRef}
                                data={chartData}
                                height={120}
                                showZoomControls={false}
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {visibleCharts.pathologies && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
                            <Text strong>Патологии | Pathologies</Text>
                            <Space size="small">
                              <Button size="small" onClick={() => zoomIn(pathologiesRef)}>+</Button>
                              <Button size="small" onClick={() => zoomOut(pathologiesRef)}>-</Button>
                              <Button size="small" onClick={() => resetZoom(pathologiesRef)}>Сбросить</Button>
                            </Space>
                          </div>
                          <div
                            ref={pathologiesScrollRef}
                            onScroll={(e) => {
                              if (syncingRef.current) return;
                              syncingRef.current = true;
                              const left = (e.currentTarget as HTMLDivElement).scrollLeft;
                              if (fhrScrollRef.current) fhrScrollRef.current.scrollLeft = left;
                              if (ucScrollRef.current) ucScrollRef.current.scrollLeft = left;
                              if (baselineScrollRef.current) baselineScrollRef.current.scrollLeft = left;
                              if (variabilityScrollRef.current) variabilityScrollRef.current.scrollLeft = left;
                              if (accelScrollRef.current) accelScrollRef.current.scrollLeft = left;
                              if (decelScrollRef.current) decelScrollRef.current.scrollLeft = left;
                              if (medicationsScrollRef.current) medicationsScrollRef.current.scrollLeft = left;
                              requestAnimationFrame(() => { syncingRef.current = false; });
                            }}
                            style={{ overflowX: 'auto', overflowY: 'hidden' }}
                          >
                            <div style={{ width: Math.max(chartData.length * 2, 800) }}>
                              <PathologiesChart
                                ref={pathologiesRef}
                                data={chartData}
                                height={120}
                                showZoomControls={false}
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {visibleCharts.medications && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
                            <Text strong>Медикаменты | Medications</Text>
                            <Space size="small">
                              <Button size="small" onClick={() => zoomIn(medicationsRef)}>+</Button>
                              <Button size="small" onClick={() => zoomOut(medicationsRef)}>-</Button>
                              <Button size="small" onClick={() => resetZoom(medicationsRef)}>Сбросить</Button>
                            </Space>
                          </div>
                          <div
                            ref={medicationsScrollRef}
                            onScroll={(e) => {
                              if (syncingRef.current) return;
                              syncingRef.current = true;
                              const left = (e.currentTarget as HTMLDivElement).scrollLeft;
                              if (fhrScrollRef.current) fhrScrollRef.current.scrollLeft = left;
                              if (ucScrollRef.current) ucScrollRef.current.scrollLeft = left;
                              if (baselineScrollRef.current) baselineScrollRef.current.scrollLeft = left;
                              if (variabilityScrollRef.current) variabilityScrollRef.current.scrollLeft = left;
                              if (accelScrollRef.current) accelScrollRef.current.scrollLeft = left;
                              if (decelScrollRef.current) decelScrollRef.current.scrollLeft = left;
                              if (pathologiesScrollRef.current) pathologiesScrollRef.current.scrollLeft = left;
                              requestAnimationFrame(() => { syncingRef.current = false; });
                            }}
                            style={{ overflowX: 'auto', overflowY: 'hidden' }}
                          >
                            <div style={{ width: Math.max(chartData.length * 2, 800) }}>
                              <MedicationsChart
                                ref={medicationsRef}
                                data={chartData}
                                height={120}
                                showZoomControls={false}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )
            }
          ]}
          onChange={(key) => { if (key === 'charts' && chartData.length === 0) loadChart(); }}
        />
      </div>
    </div>
  );
};

export default PatientSessionDetails;
