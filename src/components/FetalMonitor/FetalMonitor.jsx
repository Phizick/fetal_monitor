import React, { useEffect, useRef, useState, useCallback } from 'react';
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

// Регистрируем компоненты Chart.js
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
  apiUrl = 'http://77.246.158.103/stream/sse',
  windowSize = 15,
  width = 1920,
  height = 1080,
  className = '',
  style = {}
}) => {
  // Встроенные стили для полной автономности
  const containerStyles = {
    width: '800px',
    height: '456px',
    background: '#000',
    border: '2px solid #333',
    borderRadius: '8px',
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
    gap: '10px'
  };

  const rightPanelStyles = {
    width: '200px',
    height: '456px',
    background: '#0a0a0a',
    border: '1px solid #333',
    borderLeft: '2px solid #333',
    display: 'flex',
    flexDirection: 'column',
    padding: '10px',
    gap: '0px'
  };

  const graphContainerStyles = {
    height: '152px',
    width: '600px',
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'hidden'
  };

  const fhrBlockStyles = {
    width: '200px',
    height: '76px',
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRight: '2px solid #333',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative'
  };

  const dataContainerStyles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1
  };

  const headerStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px'
  };

  const heartIconStyles = {
    width: '16px',
    height: '16px',
    filter: 'brightness(0) saturate(100%) invert(30%) sepia(95%) saturate(1000%) hue-rotate(320deg) brightness(1.2) contrast(1.2)'
  };

  const labelStyles = {
    color: 'rgba(153, 153, 153, 1)',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
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
  // Состояние
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

  // Refs
  const eventSourceRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const updateCounterRef = useRef(0);

  // Константы
  const MIN_UPDATE_INTERVAL = 200; // 200мс между обновлениями
  const UPDATE_FREQUENCY = 3; // Обновляем каждый 3-й кадр

  // Обновление данных с throttling
  const updateData = useCallback((newData) => {
    const now = Date.now();

    // Обновляем текущие значения сразу (без throttling)
    setCurrentValues({
      fhr1: Math.round(newData.fhr_bpm),
      fhr2: Math.round(newData.fhr_bpm + Math.sin(now / 1000) * 5),
      toco: Math.round(60 + (newData.uc_mmHg / 100) * 120),
      fm: Math.round(190 + Math.sin(now / 1000) * 10),
      mibp: Math.round(210 + Math.sin(now / 2000) * 5),
      hr: Math.round(100 + Math.sin(now / 1500) * 20),
      temp: 36.5
    });

    // Throttling только для обновления графиков
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
      // Удаляем старые данные (скользящее окно)
      Object.keys(newDataPoints).forEach(key => {
        newDataPoints[key] = newDataPoints[key].filter(point => now - point.x <= windowMs);
      });

      return newDataPoints;
    });
  }, [windowSize]);

  // Подключение к API
  const connectToAPI = useCallback(() => {
    // Если уже подключены, не подключаемся снова
    if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    console.log('Подключение к API:', apiUrl);
    const eventSource = new EventSource(apiUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('Подключено к потоку данных');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Получены данные:', data);
        updateData(data);
      } catch (error) {
        console.error('Ошибка парсинга данных:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Ошибка соединения:', error);
      setIsConnected(false);

      // Переподключение только если соединение действительно закрыто
      setTimeout(() => {
        if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.CLOSED) {
          connectToAPI();
        }
      }, 5000);
    };
  }, [apiUrl, updateData]);

  // Отключение от API
  const disconnectFromAPI = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Автоматическое подключение при монтировании
  useEffect(() => {
    const timer = setTimeout(() => {
      connectToAPI();
    }, 1000);

    return () => {
      clearTimeout(timer);
      disconnectFromAPI();
    };
  }, []); // Убираем зависимости чтобы избежать переподключений

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      disconnectFromAPI();
    };
  }, [disconnectFromAPI]);

  // Настройки Chart.js
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            second: 'HH:mm:ss'
          }
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
        border: {
          color: 'rgba(153, 153, 153, 1)',
          width: 1
        }
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
          stepSize: 30
        },
        border: {
          color: 'rgba(153, 153, 153, 1)',
          width: 1
        }
      }
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 3
      },
      line: {
        tension: 0.4,
        borderWidth: 1.5
      }
    },
    animation: {
      duration: 0
    },
    devicePixelRatio: 1
  };

  // Данные для графиков
  const fhrData = {
    datasets: [
      {
        label: 'FHR 1',
        data: data.fhr1,
        borderColor: 'rgba(115, 252, 142, 1)',
        backgroundColor: 'rgba(115, 252, 142, 0.1)',
        fill: false,
        tension: 0.4
      },
      {
        label: 'FHR 2',
        data: data.fhr2,
        borderColor: 'rgba(250, 141, 243, 1)',
        backgroundColor: 'rgba(250, 141, 243, 0.1)',
        fill: false,
        tension: 0.4
      }
    ]
  };

  const tocoData = {
    datasets: [
      {
        label: 'TOCO',
        data: data.toco,
        borderColor: 'rgba(121, 246, 246, 1)',
        backgroundColor: 'rgba(121, 246, 246, 0.1)',
        fill: false,
        tension: 0.4
      },
      {
        label: 'FM',
        data: data.fm,
        borderColor: 'rgba(250, 141, 243, 1)',
        backgroundColor: 'rgba(250, 141, 243, 0.1)',
        fill: false,
        tension: 0.4
      }
    ]
  };

  const vitalsData = {
    datasets: [
      {
        label: 'MIBP',
        data: data.mibp,
        borderColor: 'rgba(252, 206, 115, 1)',
        backgroundColor: 'rgba(252, 206, 115, 0.1)',
        fill: false,
        tension: 0.4
      },
      {
        label: 'HR',
        data: data.hr,
        borderColor: 'rgba(121, 246, 246, 1)',
        backgroundColor: 'rgba(121, 246, 246, 0.1)',
        fill: false,
        tension: 0.4
      }
    ]
  };

  return (
    <div
      className={`fetal-monitor ${className}`}
      style={containerStyles}
    >
      {/* Сетка фона */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `
            linear-gradient(rgba(153, 153, 153, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(153, 153, 153, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '15px 15px',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Секция с графиками */}
      <div
        style={{
          width: '600px',
          height: '456px', // 152px * 3
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0a0a',
          borderRight: '2px solid #333',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* FHR график */}
        <div
          style={{
            height: '152px',
            width: '600px',
            position: 'relative',
            background: '#0a0a0a',
            borderBottom: '1px solid #333',
            padding: 0
          }}
        >
          <div style={{ width: '100%', height: '100%' }}>
            <Line data={fhrData} options={chartOptions} />
          </div>
        </div>

        {/* TOCO/FM график */}
        <div
          style={{
            height: '152px',
            width: '600px',
            position: 'relative',
            background: '#0a0a0a',
            borderBottom: '1px solid #333',
            padding: 0
          }}
        >
          <div style={{ width: '100%', height: '100%' }}>
            <Line data={tocoData} options={chartOptions} />
          </div>
        </div>

        {/* MIBP/HR/TEMP график */}
        <div
          style={{
            height: '152px',
            width: '600px',
            position: 'relative',
            background: '#0a0a0a',
            padding: 0
          }}
        >
          <div style={{ width: '100%', height: '100%' }}>
            <Line data={vitalsData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Панель значений */}
      <div
        style={{
          width: '200px',
          height: '456px', // 152px * 3
          background: '#111',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '2px solid #333',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* Первый график - FHR 1 и FHR 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '152px' }}>
          {/* FHR 1 блок */}
          <div
            style={{
              width: '200px',
              height: '76px',
              background: '#0a0a0a',
              border: '1px solid #333',
              borderRight: '2px solid #333',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            {/* Левая часть - контейнер с данными */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                flex: 1
              }}
            >
              {/* Заголовок с иконкой */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px'
                }}
              >
                <img
                  src={heart}
                  alt="Heart"
                  style={{
                    width: '16px',
                    height: '16px',
                    filter: 'brightness(0) saturate(100%) invert(30%) sepia(95%) saturate(1000%) hue-rotate(320deg) brightness(1.2) contrast(1.2)'
                  }}
                />
                <span
                  style={{
                    color: 'rgba(153, 153, 153, 1)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  FHR 1
                </span>
              </div>

              {/* Значение */}
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'rgba(115, 252, 142, 1)',
                  textShadow: '0 0 8px rgba(115, 252, 142, 1)',
                  fontFamily: 'Courier New, monospace',
                  marginBottom: '4px'
                }}
              >
                {currentValues.fhr1}
              </div>

              {/* Единицы измерения */}
              <div
                style={{
                  fontSize: '9px',
                  color: '#888',
                  textTransform: 'uppercase'
                }}
              >
                уд/мин
              </div>
            </div>

            {/* Правая часть - иконка volume */}
            <img
              src={volume}
              alt="Volume"
              style={{
                width: '44px',
                height: '76px'
              }}
            />
          </div>

          {/* FHR 2 блок */}
          <div
            style={{
              width: '200px',
              height: '76px',
              background: '#0a0a0a',
              border: '1px solid #333',
              borderRight: '2px solid #333',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            {/* Левая часть - контейнер с данными */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                flex: 1
              }}
            >
              {/* Заголовок с иконкой */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px'
                }}
              >
                <img
                  src={heart}
                  alt="Heart"
                  style={{
                    width: '16px',
                    height: '16px',
                    filter: 'brightness(0) saturate(100%) invert(30%) sepia(95%) saturate(1000%) hue-rotate(320deg) brightness(1.2) contrast(1.2)'
                  }}
                />
                <span
                  style={{
                    color: 'rgba(153, 153, 153, 1)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  FHR 2
                </span>
              </div>

              {/* Значение */}
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'rgba(250, 141, 243, 1)',
                  textShadow: '0 0 8px rgba(250, 141, 243, 1)',
                  fontFamily: 'Courier New, monospace',
                  marginBottom: '4px'
                }}
              >
                {currentValues.fhr2}
              </div>

              {/* Единицы измерения */}
              <div
                style={{
                  fontSize: '9px',
                  color: '#888',
                  textTransform: 'uppercase'
                }}
              >
                уд/мин
              </div>
            </div>

            {/* Правая часть - иконка volume */}
            <img
              src={volume}
              alt="Volume"
              style={{
                width: '44px',
                height: '76px'
              }}
            />
          </div>
        </div>

        {/* Второй график - TOCO, FM, SpO2 */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '152px' }}>
          {/* Верхний ряд - TOCO и FM */}
          <div style={{ display: 'flex', height: '76px' }}>
            {/* TOCO блок */}
            <div
              style={{
                width: '100px',
                height: '76px',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRight: '1px solid #333',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                position: 'relative'
              }}
            >
              <div
                style={{
                  color: 'rgba(153, 153, 153, 1)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}
              >
                TOCO
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'rgba(121, 246, 246, 1)',
                  textShadow: '0 0 6px rgba(121, 246, 246, 1)',
                  fontFamily: 'Courier New, monospace',
                  marginBottom: '4px'
                }}
              >
                {currentValues.toco}
              </div>
              <div
                style={{
                  fontSize: '8px',
                  color: '#888',
                  textTransform: 'uppercase'
                }}
              >
                ед.
              </div>
            </div>

            {/* FM блок */}
            <div
              style={{
                width: '100px',
                height: '76px',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRight: '2px solid #333',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                position: 'relative'
              }}
            >
              <div
                style={{
                  color: 'rgba(153, 153, 153, 1)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}
              >
                FM
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'rgba(250, 141, 243, 1)',
                  textShadow: '0 0 6px rgba(250, 141, 243, 1)',
                  fontFamily: 'Courier New, monospace',
                  marginBottom: '4px'
                }}
              >
                {currentValues.fm}
              </div>
              <div
                style={{
                  fontSize: '8px',
                  color: '#888',
                  textTransform: 'uppercase'
                }}
              >
                ед.
              </div>
            </div>
          </div>

          {/* Нижний ряд - SpO2 */}
          <div
            style={{
              width: '200px',
              height: '76px',
              background: '#0a0a0a',
              border: '1px solid #333',
              borderRight: '2px solid #333',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              position: 'relative'
            }}
          >
            <div
              style={{
                color: 'rgba(153, 153, 153, 1)',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}
            >
              SpO2 %
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'rgba(255, 147, 179, 1)',
                  textShadow: '0 0 8px rgba(255, 147, 179, 1)',
                  fontFamily: 'Courier New, monospace'
                }}
              >
                98
              </div>
              <img
                src={co2}
                alt="CO2"
                style={{
                  width: '8px',
                  height: '30px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Третий график - MIBP, HR, TEMP */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '152px' }}>
          {/* Верхний блок - MIBP */}
          <div
            style={{
              width: '200px',
              height: '76px',
              background: '#0a0a0a',
              border: '1px solid #333',
              borderRight: '2px solid #333',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              position: 'relative'
            }}
          >
            <div
              style={{
                color: 'rgba(153, 153, 153, 1)',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}
            >
              MIBP мм.рт.ст
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'rgba(252, 206, 115, 1)',
                textShadow: '0 0 8px rgba(252, 206, 115, 1)',
                fontFamily: 'Courier New, monospace',
                marginBottom: '4px'
              }}
            >
              {currentValues.mibp}
            </div>
            <div
              style={{
                fontSize: '9px',
                color: '#888',
                textTransform: 'uppercase'
              }}
            >
              мм.рт.ст
            </div>
          </div>

          {/* Нижний ряд - HR и TEMP */}
          <div style={{ display: 'flex', height: '76px' }}>
            {/* HR блок */}
            <div
              style={{
                width: '100px',
                height: '76px',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRight: '1px solid #333',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                position: 'relative'
              }}
            >
              <div
                style={{
                  color: 'rgba(153, 153, 153, 1)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}
              >
                HR
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'rgba(121, 246, 246, 1)',
                  textShadow: '0 0 6px rgba(121, 246, 246, 1)',
                  fontFamily: 'Courier New, monospace',
                  marginBottom: '4px'
                }}
              >
                {currentValues.hr}
              </div>
              <div
                style={{
                  fontSize: '8px',
                  color: '#888',
                  textTransform: 'uppercase'
                }}
              >
                уд/мин
              </div>
            </div>

            {/* TEMP блок */}
            <div
              style={{
                width: '100px',
                height: '76px',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRight: '2px solid #333',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                position: 'relative'
              }}
            >
              <div
                style={{
                  color: 'rgba(153, 153, 153, 1)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}
              >
                TEMP
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'rgba(255, 255, 255, 1)',
                  textShadow: '0 0 6px rgba(255, 255, 255, 1)',
                  fontFamily: 'Courier New, monospace',
                  marginBottom: '4px'
                }}
              >
                {currentValues.temp}
              </div>
              <div
                style={{
                  fontSize: '8px',
                  color: '#888',
                  textTransform: 'uppercase'
                }}
              >
                °C
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* CSS анимация для пульса */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}
      </style>
    </div>
  );
};

export default FetalMonitor;
