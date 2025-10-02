import React, { useState } from 'react';
import FetalMonitoringChart from './FetalMonitoringChart';
import './App.css';

function App() {
  const [apiUrl, setApiUrl] = useState('http://localhost:8080');
  const [windowSize, setWindowSize] = useState(15);
  const [updateInterval, setUpdateInterval] = useState(100);
  const [enableSmoothing, setEnableSmoothing] = useState(true);
  const [showPathology, setShowPathology] = useState(true);
  const [showMedications, setShowMedications] = useState(true);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Система мониторинга фетального состояния</h1>
        
        {/* Панель настроек */}
        <div className="settings-panel">
          <div className="setting-group">
            <label>URL API:</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8080"
            />
          </div>
          
          <div className="setting-group">
            <label>Окно данных (сек):</label>
            <input
              type="number"
              value={windowSize}
              onChange={(e) => setWindowSize(Number(e.target.value))}
              min="5"
              max="60"
            />
          </div>
          
          <div className="setting-group">
            <label>Интервал обновления (мс):</label>
            <input
              type="number"
              value={updateInterval}
              onChange={(e) => setUpdateInterval(Number(e.target.value))}
              min="50"
              max="1000"
            />
          </div>
          
          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={enableSmoothing}
                onChange={(e) => setEnableSmoothing(e.target.checked)}
              />
              Сглаживание графиков
            </label>
          </div>
          
          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={showPathology}
                onChange={(e) => setShowPathology(e.target.checked)}
              />
              Показывать патологии
            </label>
          </div>
          
          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={showMedications}
                onChange={(e) => setShowMedications(e.target.checked)}
              />
              Показывать препараты
            </label>
          </div>
        </div>
      </header>

      <main className="App-main">
        <FetalMonitoringChart
          apiUrl={apiUrl}
          windowSize={windowSize}
          updateInterval={updateInterval}
          enableSmoothing={enableSmoothing}
          showPathology={showPathology}
          showMedications={showMedications}
        />
      </main>
    </div>
  );
}

export default App;
