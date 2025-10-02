import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import volume from './volume.png'
import co2 from "./co2.png"
import heart from "./heart.svg"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const FetalMonitor = ({
  setHasPathology,
  apiUrl = 'http://77.246.158.103:8081/stream/sse',
  windowSize = 15,
  className = '',
  style = {}
}) => {
  const containerStyles = {
    width: '100%',
    height: '100%',
    background: '#000',
    borderTop: '2px solid #333',
    display: 'flex',
    fontFamily: 'Arial, sans-serif',
    position: 'relative',
    overflow: 'hidden',
    ...style
  };

  const leftPanelStyles = {
    flex: 1,
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: 0 // allow charts to shrink
  };

  const rightPanelStyles = {
    width: '220px',
    maxWidth: '30vw',
    minWidth: '180px',
    height: '100%',
    background: '#0a0a0a',
    borderLeft: '2px solid #333',
    display: 'flex',
    flexDirection: 'column',
    padding: '10px',
    gap: '0px',
    boxSizing: 'border-box'
  };

  const graphRowStyles = {
    flex: 1,
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 0 // allow charts to fit in flex
  };

  const headerStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px'
  };

  const valueStyles = (color) => ({
    fontSize: '24px',
    fontWeight: 'bold',
    color: color,
    textShadow: `0 0 8px ${color}`,
    fontFamily: 'Courier New, monospace',
    marginBottom: '4px'
  });

  const unitStyles = {
    fontSize: '9px',
    color: '#888',
    textTransform: 'uppercase'
  };

  const volumeIconStyles = {
    width: '44px',
    height: '76px'
  };

  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState({
    fhr1: [],
    fhr2: [],
    toco: [],
    fm: [],
    mibp: [],
    hr: []
  });
  const [currentValues, setCurrentValues] = useState({
    fhr1: 0,
    fhr2: 0,
    toco: 0,
    fm: 0,
    mibp: 0,
    hr: 0,
    temp: 36.5
  });

  const eventSourceRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const updateCounterRef = useRef(0);

  // Сбалансированные константы для производительности и информативности
  const MIN_UPDATE_INTERVAL = 300; // 300мс между обновлениями
  const UPDATE_FREQUENCY = 3; // Обновляем каждый 3-й кадр
  const MAX_DATA_POINTS = 200; // Максимум точек на графике (достаточно для информативности)

  const updateData = useCallback((newData) => {
    const now = Date.now();

    setCurrentValues({
      fhr1: Math.round(newData.fhr_bpm),
      fhr2: Math.round(newData.fhr_bpm + Math.sin(now / 1000) * 5),
      toco: Math.round(60 + (newData.uc_mmHg / 100) * 120),
      fm: Math.round(190 + Math.sin(now / 1000) * 10),
      mibp: Math.round(210 + Math.sin(now / 2000) * 5),
      hr: Math.round(100 + Math.sin(now / 1500) * 20),
      temp: 36.5
    });

    if (now - lastUpdateTimeRef.current < MIN_UPDATE_INTERVAL) return;

    updateCounterRef.current++;
    if (updateCounterRef.current % UPDATE_FREQUENCY !== 0) return;

    lastUpdateTimeRef.current = now;
    const windowMs = windowSize * 1000;

    setData(prevData => {
      const newDataPoints = {
        fhr1: [...prevData.fhr1, { x: now, y: newData.fhr_bpm }],
        fhr2: [...prevData.fhr2, { x: now, y: newData.fhr_bpm + Math.sin(now / 1000) * 5 }],
        toco: [...prevData.toco, { x: now, y: 60 + (newData.uc_mmHg / 100) * 120 }],
        fm: [...prevData.fm, { x: now, y: 190 + Math.sin(now / 1000) * 10 }],
        mibp: [...prevData.mibp, { x: now, y: 210 + Math.sin(now / 2000) * 5 }],
        hr: [...prevData.hr, { x: now, y: 100 + Math.sin(now / 1500) * 20 }]
      };
      setHasPathology(newData.pathology)
      Object.keys(newDataPoints).forEach(key => {
        newDataPoints[key] = newDataPoints[key]
          .filter(point => now - point.x <= windowMs)
          .slice(-MAX_DATA_POINTS); // Ограничиваем количество точек
      });

      return newDataPoints;
    });
  }, [windowSize]);

  const connectToAPI = useCallback(() => {
    if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(apiUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        updateData(data);
      } catch (error) {
        console.error('Ошибка парсинга данных:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setTimeout(() => {
        if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.CLOSED) {
          connectToAPI();
        }
      }, 5000);
    };
  }, [apiUrl, updateData]);

  const disconnectFromAPI = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      connectToAPI();
    }, 1000);

    return () => {
      clearTimeout(timer);
      disconnectFromAPI();
    };
  }, []);

  useEffect(() => {
    return () => {
      disconnectFromAPI();
    };
  }, [disconnectFromAPI]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: { 
      legend: { display: false }, 
      tooltip: { enabled: false }
    },
    scales: {
      x: {
        type: 'time',
        time: { 
          displayFormats: { second: 'HH:mm:ss' },
          unit: 'second',
          stepSize: 5
        },
        grid: { 
          color: 'rgba(153, 153, 153, 0.1)', 
          lineWidth: 1
        },
        ticks: { 
          color: 'rgba(153, 153, 153, 1)', 
          font: { size: 8 }, 
          maxTicksLimit: 6
        },
        border: { color: 'rgba(153, 153, 153, 1)', width: 1 }
      },
      y: {
        min: 30,
        max: 240,
        grid: { 
          color: 'rgba(153, 153, 153, 0.1)', 
          lineWidth: 1
        },
        ticks: { 
          color: 'rgba(153, 153, 153, 1)', 
          font: { size: 8 }, 
          stepSize: 30,
          maxTicksLimit: 8
        },
        border: { color: 'rgba(153, 153, 153, 1)', width: 1 }
      }
    },
    elements: { 
      point: { radius: 0, hoverRadius: 2 }, 
      line: { 
        tension: 0.2, 
        borderWidth: 1.5,
        fill: false
      } 
    },
    animation: { 
      duration: 0,
      animate: false
    },
    devicePixelRatio: window.devicePixelRatio || 1,
    // Оптимизации производительности без потери информативности
    parsing: false,
    normalized: true,
    spanGaps: true
  };

  // Мемоизированные данные графиков - сбалансированные настройки
  const fhrData = useMemo(() => ({
    datasets: [
      { 
        label: 'FHR 1', 
        data: data.fhr1, 
        borderColor: 'rgba(115, 252, 142, 1)', 
        backgroundColor: 'rgba(115, 252, 142, 0.1)', 
        fill: false, 
        tension: 0.2 
      },
      { 
        label: 'FHR 2', 
        data: data.fhr2, 
        borderColor: 'rgba(250, 141, 243, 1)', 
        backgroundColor: 'rgba(250, 141, 243, 0.1)', 
        fill: false, 
        tension: 0.2 
      }
    ]
  }), [data.fhr1, data.fhr2]);

  const tocoData = useMemo(() => ({
    datasets: [
      { 
        label: 'TOCO', 
        data: data.toco, 
        borderColor: 'rgba(121, 246, 246, 1)', 
        backgroundColor: 'rgba(121, 246, 246, 0.1)', 
        fill: false, 
        tension: 0.2 
      },
      { 
        label: 'FM', 
        data: data.fm, 
        borderColor: 'rgba(250, 141, 243, 1)', 
        backgroundColor: 'rgba(250, 141, 243, 0.1)', 
        fill: false, 
        tension: 0.2 
      }
    ]
  }), [data.toco, data.fm]);

  const vitalsData = useMemo(() => ({
    datasets: [
      { 
        label: 'MIBP', 
        data: data.mibp, 
        borderColor: 'rgba(252, 206, 115, 1)', 
        backgroundColor: 'rgba(252, 206, 115, 0.1)', 
        fill: false, 
        tension: 0.2 
      },
      { 
        label: 'HR', 
        data: data.hr, 
        borderColor: 'rgba(121, 246, 246, 1)', 
        backgroundColor: 'rgba(121, 246, 246, 0.1)', 
        fill: false, 
        tension: 0.2 
      }
    ]
  }), [data.mibp, data.hr]);

  return (
    <div className={`fetal-monitor ${className}`} style={containerStyles}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `
            linear-gradient(rgba(153, 153, 153, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(153, 153, 153, 0.1) 1px, transparent 1px)
          `, backgroundSize: '15px 15px', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px', paddingRight: '10px', boxSizing: 'border-box' }}>
        <div style={graphRowStyles}>
          <div style={{ width: '100%', height: '100%' }}>
            <Line data={fhrData} options={chartOptions} />
          </div>
        </div>
        <div style={graphRowStyles}>
          <div style={{ width: '100%', height: '100%' }}>
            <Line data={tocoData} options={chartOptions} />
          </div>
        </div>
        <div style={graphRowStyles}>
          <div style={{ width: '100%', height: '100%' }}>
            <Line data={vitalsData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div style={rightPanelStyles}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '33%' }}>
          <div style={{ width: '100%', height: '50%', background: '#0a0a0a', border: '1px solid #333', borderRight: '2px solid #333', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
              <div style={headerStyles}>
                <img src={heart} alt="Heart" style={{ width: '16px', height: '16px', filter: 'brightness(0) saturate(100%) invert(30%) sepia(95%) saturate(1000%) hue-rotate(320deg) brightness(1.2) contrast(1.2)' }} />
                <span style={{ color: 'rgba(153, 153, 153, 1)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FHR 1</span>
              </div>
              <div style={valueStyles('rgba(115, 252, 142, 1)')}>{currentValues.fhr1}</div>
              <div style={unitStyles}>уд/мин</div>
            </div>
            <img src={volume} alt="Volume" style={volumeIconStyles} />
          </div>
          <div style={{ width: '100%', height: '50%', background: '#0a0a0a', border: '1px solid #333', borderRight: '2px solid #333', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
              <div style={headerStyles}>
                <img src={heart} alt="Heart" style={{ width: '16px', height: '16px', filter: 'brightness(0) saturate(100%) invert(30%) sepia(95%) saturate(1000%) hue-rotate(320deg) brightness(1.2) contrast(1.2)' }} />
                <span style={{ color: 'rgba(153, 153, 153, 1)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FHR 2</span>
              </div>
              <div style={valueStyles('rgba(250, 141, 243, 1)')}>{currentValues.fhr2}</div>
              <div style={unitStyles}>уд/мин</div>
            </div>
            <img src={volume} alt="Volume" style={volumeIconStyles} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: '33%' }}>
          <div style={{ display: 'flex', height: '50%' }}>
            <div style={{ width: '50%', height: '100%', background: '#0a0a0a', border: '1px solid #333', borderRight: '1px solid #333', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', position: 'relative', boxSizing: 'border-box' }}>
              <div style={{ color: 'rgba(153, 153, 153, 1)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>TOCO</div>
              <div style={valueStyles('rgba(121, 246, 246, 1)')}>{currentValues.toco}</div>
              <div style={{ fontSize: '8px', color: '#888', textTransform: 'uppercase' }}>ед.</div>
            </div>
            <div style={{ width: '50%', height: '100%', background: '#0a0a0a', border: '1px solid #333', borderRight: '2px solid #333', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', position: 'relative', boxSizing: 'border-box' }}>
              <div style={{ color: 'rgba(153, 153, 153, 1)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>FM</div>
              <div style={valueStyles('rgba(250, 141, 243, 1)')}>{currentValues.fm}</div>
              <div style={{ fontSize: '8px', color: '#888', textTransform: 'uppercase' }}>ед.</div>
            </div>
          </div>
          <div style={{ width: '100%', height: '50%', background: '#0a0a0a', border: '1px solid #333', borderRight: '2px solid #333', padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', position: 'relative', boxSizing: 'border-box' }}>
            <div style={{ color: 'rgba(153, 153, 153, 1)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>SpO2 %</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={valueStyles('rgba(255, 147, 179, 1)')}>98</div>
              <img src={co2} alt="CO2" style={{ width: '8px', height: '30px' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: '34%' }}>
          <div style={{ width: '100%', height: '50%', background: '#0a0a0a', border: '1px solid #333', borderRight: '2px solid #333', padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', position: 'relative', boxSizing: 'border-box' }}>
            <div style={{ color: 'rgba(153, 153, 153, 1)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>MIBP мм.рт.ст</div>
            <div style={valueStyles('rgba(252, 206, 115, 1)')}>{currentValues.mibp}</div>
            <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase' }}>мм.рт.ст</div>
          </div>
          <div style={{ display: 'flex', height: '50%' }}>
            <div style={{ width: '50%', height: '100%', background: '#0a0a0a', border: '1px solid #333', borderRight: '1px solid #333', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', position: 'relative', boxSizing: 'border-box' }}>
              <div style={{ color: 'rgba(153, 153, 153, 1)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>HR</div>
              <div style={valueStyles('rgba(121, 246, 246, 1)')}>{currentValues.hr}</div>
              <div style={{ fontSize: '8px', color: '#888', textTransform: 'uppercase' }}>уд/мин</div>
            </div>
            <div style={{ width: '50%', height: '100%', background: '#0a0a0a', border: '1px solid #333', borderRight: '2px solid #333', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', position: 'relative', boxSizing: 'border-box' }}>
              <div style={{ color: 'rgba(153, 153, 153, 1)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>TEMP</div>
              <div style={valueStyles('rgba(255, 255, 255, 1)')}>{currentValues.temp}</div>
              <div style={{ fontSize: '8px', color: '#888', textTransform: 'uppercase' }}>°C</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
};

export default FetalMonitor;
