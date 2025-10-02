/**
 * Vanilla JavaScript компонент для мониторинга фетального состояния
 * Плавные графики с использованием Chart.js
 */

class FetalMonitoringChart {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = {
      apiUrl: 'http://localhost:8080',
      windowSize: 15, // секунд
      updateInterval: 100, // миллисекунд
      enableSmoothing: true,
      showPathology: true,
      showMedications: true,
      ...options
    };
    
    this.data = {
      fhr: [],
      uc: [],
      pathologies: [],
      medications: []
    };
    
    this.isConnected = false;
    this.startTime = null;
    this.eventSource = null;
    this.charts = {};
    
    this.init();
  }
  
  init() {
    this.createHTML();
    this.initCharts();
    this.connectToAPI();
  }
  
  createHTML() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`Container with id "${this.containerId}" not found`);
    }
    
    container.innerHTML = `
      <div class="fetal-monitoring-chart" style="
        background: #0b1220;
        color: #e6edf3;
        padding: 20px;
        border-radius: 8px;
        font-family: sans-serif;
      ">
        <!-- Заголовок и статус -->
        <div style="margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">
            Realtime CTG/UC Monitor
          </h2>
          
          <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div id="status-indicator" style="
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: #ef4444;
              "></div>
              <span id="status-text" style="font-size: 14px;">Потеря соединения...</span>
            </div>
            
            <div id="pathology-indicator" style="
              padding: 8px 16px;
              border-radius: 6px;
              background-color: #064e3b;
              color: #d1fae5;
              font-size: 14px;
              font-weight: bold;
              display: ${this.options.showPathology ? 'block' : 'none'};
            ">
              Нет патологии
            </div>
            
            <div id="medications-indicator" style="
              padding: 8px 16px;
              border-radius: 6px;
              background-color: #1f2937;
              color: #9ca3af;
              font-size: 14px;
              display: ${this.options.showMedications ? 'block' : 'none'};
            ">
              Препараты: нет
            </div>
          </div>
        </div>

        <!-- Карточки с активными патологиями -->
        <div id="pathologies-cards" style="
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        "></div>

        <!-- Графики -->
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          height: 400px;
        ">
          <!-- FHR график -->
          <div style="
            background-color: #111827;
            border: 1px solid #1f2937;
            border-radius: 8px;
            padding: 16px;
            position: relative;
          ">
            <h3 style="
              margin: 0 0 16px 0;
              font-size: 16px;
              font-weight: bold;
              color: #e6edf3;
            ">
              FHR (уд/мин)
            </h3>
            <div style="height: calc(100% - 40px);">
              <canvas id="fhr-chart"></canvas>
            </div>
          </div>

          <!-- UC график -->
          <div style="
            background-color: #111827;
            border: 1px solid #1f2937;
            border-radius: 8px;
            padding: 16px;
            position: relative;
          ">
            <h3 style="
              margin: 0 0 16px 0;
              font-size: 16px;
              font-weight: bold;
              color: #e6edf3;
            ">
              Uterine Contractions (мм рт.ст.)
            </h3>
            <div style="height: calc(100% - 40px);">
              <canvas id="uc-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Управление -->
        <div style="
          margin-top: 20px;
          display: flex;
          gap: 12px;
          align-items: center;
        ">
          <button id="connect-btn" style="
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            background-color: #4ade80;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          ">
            Подключить
          </button>
          
          <div style="font-size: 12px; color: #9ca3af;">
            Окно: ${this.options.windowSize}с | Обновление: ${this.options.updateInterval}мс
          </div>
        </div>
      </div>
    `;
    
    // Добавляем обработчики событий
    document.getElementById('connect-btn').addEventListener('click', () => {
      if (this.isConnected) {
        this.disconnectFromAPI();
      } else {
        this.connectToAPI();
      }
    });
  }
  
  initCharts() {
    // Инициализируем Chart.js если не загружен
    if (typeof Chart === 'undefined') {
      console.error('Chart.js не загружен. Добавьте <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>');
      return;
    }
    
    // FHR график
    const fhrCtx = document.getElementById('fhr-chart').getContext('2d');
    this.charts.fhr = new Chart(fhrCtx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'FHR (уд/мин)',
          data: [],
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74, 222, 128, 0.1)',
          fill: true,
          tension: this.options.enableSmoothing ? 0.4 : 0,
          pointRadius: 0,
          pointHoverRadius: 4
        }]
      },
      options: {
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
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1
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
            title: {
              display: true,
              text: 'Время',
              color: '#e6edf3',
              font: {
                size: 12,
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
            min: 60,
            max: 200,
            title: {
              display: true,
              text: 'FHR (уд/мин)',
              color: '#e6edf3',
              font: {
                size: 12,
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
        animation: {
          duration: 0
        }
      }
    });
    
    // UC график
    const ucCtx = document.getElementById('uc-chart').getContext('2d');
    this.charts.uc = new Chart(ucCtx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'UC (мм рт.ст.)',
          data: [],
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          fill: true,
          tension: this.options.enableSmoothing ? 0.4 : 0,
          pointRadius: 0,
          pointHoverRadius: 4
        }]
      },
      options: {
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
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1
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
            title: {
              display: true,
              text: 'Время',
              color: '#e6edf3',
              font: {
                size: 12,
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
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'UC (мм рт.ст.)',
              color: '#e6edf3',
              font: {
                size: 12,
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
        animation: {
          duration: 0
        }
      }
    });
  }
  
  connectToAPI() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    this.eventSource = new EventSource(`${this.options.apiUrl}/stream/sse`);
    
    this.eventSource.onopen = () => {
      console.log('Подключено к потоку данных');
      this.isConnected = true;
      this.startTime = Date.now();
      this.updateStatus();
    };
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.updateData(data);
      } catch (error) {
        console.error('Ошибка парсинга данных:', error);
      }
    };
    
    this.eventSource.onerror = (error) => {
      console.error('Ошибка соединения:', error);
      this.isConnected = false;
      this.updateStatus();
      
      // Переподключение через 5 секунд
      setTimeout(() => {
        if (!this.isConnected) {
          this.connectToAPI();
        }
      }, 5000);
    };
  }
  
  disconnectFromAPI() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.updateStatus();
  }
  
  updateStatus() {
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    const btn = document.getElementById('connect-btn');
    
    if (this.isConnected) {
      indicator.style.backgroundColor = '#4ade80';
      text.textContent = 'Подключено';
      btn.textContent = 'Отключить';
      btn.style.backgroundColor = '#ef4444';
    } else {
      indicator.style.backgroundColor = '#ef4444';
      text.textContent = 'Потеря соединения...';
      btn.textContent = 'Подключить';
      btn.style.backgroundColor = '#4ade80';
    }
  }
  
  updateData(newData) {
    const now = Date.now();
    const windowMs = this.options.windowSize * 1000;
    
    // Добавляем новые данные
    const newFhrPoint = {
      x: now,
      y: newData.fhr_bpm
    };
    
    const newUcPoint = {
      x: now,
      y: newData.uc_mmHg
    };
    
    this.data.fhr.push(newFhrPoint);
    this.data.uc.push(newUcPoint);
    
    // Удаляем старые данные (скользящее окно)
    this.data.fhr = this.data.fhr.filter(point => now - point.x <= windowMs);
    this.data.uc = this.data.uc.filter(point => now - point.x <= windowMs);
    
    // Обновляем графики
    this.charts.fhr.data.datasets[0].data = this.data.fhr;
    this.charts.uc.data.datasets[0].data = this.data.uc;
    
    this.charts.fhr.update('none');
    this.charts.uc.update('none');
    
    // Обновляем патологии
    if (this.options.showPathology) {
      const pathologyIndicator = document.getElementById('pathology-indicator');
      if (newData.pathology) {
        pathologyIndicator.textContent = newData.pathology_desc || 'Есть патология';
        pathologyIndicator.style.backgroundColor = '#7f1d1d';
        pathologyIndicator.style.color = '#fecaca';
      } else {
        pathologyIndicator.textContent = 'Нет патологии';
        pathologyIndicator.style.backgroundColor = '#064e3b';
        pathologyIndicator.style.color = '#d1fae5';
      }
    }
    
    // Обновляем препараты
    if (this.options.showMedications) {
      const medicationsIndicator = document.getElementById('medications-indicator');
      const medications = newData.medications || [];
      medicationsIndicator.textContent = `Препараты: ${medications.join(', ') || 'нет'}`;
    }
    
    // Обновляем карточки патологий
    this.updatePathologyCards(newData.pathologies || []);
  }
  
  updatePathologyCards(pathologies) {
    const container = document.getElementById('pathologies-cards');
    container.innerHTML = '';
    
    pathologies.forEach((pathology, index) => {
      const card = document.createElement('div');
      card.style.cssText = `
        padding: 8px 12px;
        border-radius: 6px;
        background-color: #111827;
        border: 1px solid #7f1d1d;
        color: #fca5a5;
        font-size: 12px;
        font-weight: bold;
      `;
      card.textContent = pathology;
      container.appendChild(card);
    });
  }
  
  destroy() {
    this.disconnectFromAPI();
    if (this.charts.fhr) this.charts.fhr.destroy();
    if (this.charts.uc) this.charts.uc.destroy();
  }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FetalMonitoringChart;
} else if (typeof window !== 'undefined') {
  window.FetalMonitoringChart = FetalMonitoringChart;
}
