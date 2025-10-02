import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
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
  Filler
);

// Плагин для сглаживания линий (аналог shape: 'spline' из Plotly)
const smoothLinePlugin = {
  id: 'smoothLine',
  beforeDraw: (chart) => {
    const { ctx } = chart;
    const datasets = chart.data.datasets;
    
    datasets.forEach((dataset, datasetIndex) => {
      if (dataset.smooth && dataset.data.length > 1) {
        ctx.save();
        ctx.beginPath();
        
        const points = dataset.data;
        const tension = 0.4; // Коэффициент сглаживания (0-1)
        
        // Рисуем сглаженную линию
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        
        if (points.length > 1) {
          ctx.quadraticCurveTo(
            points[points.length - 1].x,
            points[points.length - 1].y,
            points[points.length - 1].x,
            points[points.length - 1].y
          );
        }
        
        ctx.strokeStyle = dataset.borderColor;
        ctx.lineWidth = dataset.borderWidth;
        ctx.stroke();
        ctx.restore();
      }
    });
  }
};

const FetalMonitoringChart = ({ 
  apiUrl = 'http://localhost:8080',
  windowSize = 15, // секунд
  updateInterval = 100, // миллисекунд
  enableSmoothing = true,
  showPathology = true,
  showMedications = true
}) => {
  const [data, setData] = useState({
    fhr: [],
    uc: [],
    pathologies: [],
    medications: []
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [currentPathology, setCurrentPathology] = useState('Нет патологии');
  const [currentMedications, setCurrentMedications] = useState([]);
  const [startTime, setStartTime] = useState(null);
  
  const chartRef = useRef(null);
  const eventSourceRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Функция для сглаживания данных (аналог smoothing из Plotly)
  const smoothData = useCallback((data, smoothing = 1.2) => {
    if (data.length < 3) return data;
    
    const smoothed = [...data];
    
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const next = data[i + 1];
      
      if (prev && curr && next) {
        smoothed[i] = {
          ...curr,
          y: curr.y * smoothing + (prev.y + next.y) * (1 - smoothing) / 2
        };
      }
    }
    
    return smoothed;
  }, []);

  // Функция для обновления данных
  const updateData = useCallback((newData) => {
    setData(prevData => {
      const now = Date.now();
      const windowMs = windowSize * 1000;
      
      // Добавляем новые данные
      const newFhrPoint = {
        x: now,
        y: newData.fhr_bpm
      };
      
      const newUcPoint = {
        x: now,
        y: newData.uc_mmHg
      };
      
      let newFhr = [...prevData.fhr, newFhrPoint];
      let newUc = [...prevData.uc, newUcPoint];
      
      // Удаляем старые данные (скользящее окно)
      newFhr = newFhr.filter(point => now - point.x <= windowMs);
      newUc = newUc.filter(point => now - point.x <= windowMs);
      
      // Применяем сглаживание если включено
      if (enableSmoothing) {
        newFhr = smoothData(newFhr, 1.2);
        newUc = smoothData(newUc, 1.0);
      }
      
      return {
        fhr: newFhr,
        uc: newUc,
        pathologies: newData.pathologies || [],
        medications: newData.medications || []
      };
    });
    
    // Обновляем патологии и препараты
    if (newData.pathology) {
      setCurrentPathology(newData.pathology_desc || 'Есть патология');
    } else {
      setCurrentPathology('Нет патологии');
    }
    
    setCurrentMedications(newData.medications || []);
  }, [windowSize, enableSmoothing, smoothData]);

  // Подключение к API через Server-Sent Events
  const connectToAPI = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const eventSource = new EventSource(`${apiUrl}/stream/sse`);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('Подключено к потоку данных');
      setIsConnected(true);
      setStartTime(Date.now());
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        updateData(data);
      } catch (error) {
        console.error('Ошибка парсинга данных:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('Ошибка соединения:', error);
      setIsConnected(false);
      
      // Переподключение через 5 секунд
      setTimeout(() => {
        if (!isConnected) {
          connectToAPI();
        }
      }, 5000);
    };
  }, [apiUrl, updateData, isConnected]);

  // Отключение от API
  const disconnectFromAPI = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Настройка Chart.js
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          title: (context) => {
            const time = new Date(context[0].parsed.x);
            return `Время: ${time.toLocaleTimeString()}`;
          },
          label: (context) => {
            const dataset = context.dataset;
            const value = context.parsed.y;
            return `${dataset.label}: ${value.toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            second: 'HH:mm:ss',
            minute: 'HH:mm'
          }
        },
        title: {
          display: true,
          text: 'Время (сек)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#e6edf3',
          maxTicksLimit: 8
        }
      },
      y: {
        title: {
          display: true,
          text: 'Значение',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#e6edf3'
        }
      }
    },
    elements: {
      point: {
        radius: 0, // Скрываем точки для плавности
        hoverRadius: 4
      },
      line: {
        tension: enableSmoothing ? 0.4 : 0, // Сглаживание
        borderWidth: 2,
        borderCapStyle: 'round',
        borderJoinStyle: 'round'
      }
    },
    animation: {
      duration: 0 // Отключаем анимацию для плавности
    }
  };

  // Данные для FHR графика
  const fhrChartData = {
    datasets: [
      {
        label: 'FHR (уд/мин)',
        data: data.fhr,
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        fill: true,
        smooth: enableSmoothing,
        tension: 0.4
      }
    ]
  };

  // Данные для UC графика
  const ucChartData = {
    datasets: [
      {
        label: 'UC (мм рт.ст.)',
        data: data.uc,
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        fill: true,
        smooth: enableSmoothing,
        tension: 0.4
      }
    ]
  };

  // Настройки для FHR графика
  const fhrOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        min: 60,
        max: 200,
        title: {
          ...chartOptions.scales.y.title,
          text: 'FHR (уд/мин)'
        }
      }
    }
  };

  // Настройки для UC графика
  const ucOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        min: 0,
        max: 100,
        title: {
          ...chartOptions.scales.y.title,
          text: 'UC (мм рт.ст.)'
        }
      }
    }
  };

  // Эффект для подключения/отключения
  useEffect(() => {
    connectToAPI();
    
    return () => {
      disconnectFromAPI();
    };
  }, [connectToAPI, disconnectFromAPI]);

  // Эффект для обновления графика
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update('none');
    }
  }, [data]);

  return (
    <div className="fetal-monitoring-chart" style={{
      background: '#0b1220',
      color: '#e6edf3',
      padding: '20px',
      borderRadius: '8px',
      fontFamily: 'sans-serif'
    }}>
      {/* Заголовок и статус */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          margin: '0 0 10px 0', 
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          Realtime CTG/UC Monitor
        </h2>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px',
          marginBottom: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#4ade80' : '#ef4444'
            }} />
            <span style={{ fontSize: '14px' }}>
              {isConnected ? 'Подключено' : 'Потеря соединения...'}
            </span>
          </div>
          
          {showPathology && (
            <div style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: currentPathology === 'Нет патологии' ? '#064e3b' : '#7f1d1d',
              color: currentPathology === 'Нет патологии' ? '#d1fae5' : '#fecaca',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {currentPathology}
            </div>
          )}
          
          {showMedications && currentMedications.length > 0 && (
            <div style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: '#1f2937',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Препараты: {currentMedications.join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Карточки с активными патологиями */}
      {data.pathologies.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          {data.pathologies.map((pathology, index) => (
            <div
              key={index}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#111827',
                border: '1px solid #7f1d1d',
                color: '#fca5a5',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {pathology}
            </div>
          ))}
        </div>
      )}

      {/* Графики */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px',
        height: '400px'
      }}>
        {/* FHR график */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '8px',
          padding: '16px',
          position: 'relative'
        }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#e6edf3'
          }}>
            FHR (уд/мин)
          </h3>
          <div style={{ height: 'calc(100% - 40px)' }}>
            <Line 
              ref={chartRef}
              data={fhrChartData} 
              options={fhrOptions}
              plugins={[smoothLinePlugin]}
            />
          </div>
        </div>

        {/* UC график */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '8px',
          padding: '16px',
          position: 'relative'
        }}>
          <h3 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#e6edf3'
          }}>
            Uterine Contractions (мм рт.ст.)
          </h3>
          <div style={{ height: 'calc(100% - 40px)' }}>
            <Line 
              ref={chartRef}
              data={ucChartData} 
              options={ucOptions}
              plugins={[smoothLinePlugin]}
            />
          </div>
        </div>
      </div>

      {/* Управление */}
      <div style={{ 
        marginTop: '20px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <button
          onClick={isConnected ? disconnectFromAPI : connectToAPI}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isConnected ? '#ef4444' : '#4ade80',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isConnected ? 'Отключить' : 'Подключить'}
        </button>
        
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          Окно: {windowSize}с | Обновление: {updateInterval}мс
        </div>
      </div>
    </div>
  );
};

export default FetalMonitoringChart;
