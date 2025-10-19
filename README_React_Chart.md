# React компонент для мониторинга фетального состояния

Плавные графики для React с использованием Chart.js, работающие с вашим API.

## Особенности

- ✅ **Плавные графики** - сглаживание линий как в Python Plotly
- ✅ **Реальное время** - подключение через Server-Sent Events
- ✅ **Скользящее окно** - автоматическое удаление старых данных
- ✅ **Адаптивный дизайн** - работает на всех устройствах
- ✅ **Настраиваемые параметры** - окно данных, интервал обновления
- ✅ **Индикаторы состояния** - патологии, препараты, соединение
- ✅ **Темная тема** - как в оригинальном Python интерфейсе

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Запустите ваш Python API:
```bash
python realtime_api.py
```

3. Запустите React приложение:
```bash
npm start
```

## Использование

### Базовое использование

```jsx
import FetalMonitoringChart from './FetalMonitoringChart';

function App() {
  return (
    <FetalMonitoringChart 
      apiUrl="http://localhost:8080"
      windowSize={15}
      updateInterval={100}
      enableSmoothing={true}
      showPathology={true}
      showMedications={true}
    />
  );
}
```

### Параметры компонента

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `apiUrl` | string | `'http://localhost:8080'` | URL вашего API |
| `windowSize` | number | `15` | Размер окна данных в секундах |
| `updateInterval` | number | `100` | Интервал обновления в миллисекундах |
| `enableSmoothing` | boolean | `true` | Включить сглаживание графиков |
| `showPathology` | boolean | `true` | Показывать индикатор патологий |
| `showMedications` | boolean | `true` | Показывать активные препараты |

## Технические детали

### Сглаживание графиков

Компонент использует кастомный плагин для Chart.js, который создает плавные линии аналогично `shape: 'spline'` в Plotly:

```javascript
const smoothLinePlugin = {
  id: 'smoothLine',
  beforeDraw: (chart) => {
    // Логика сглаживания с использованием quadraticCurveTo
  }
};
```

### Подключение к API

Компонент подключается к вашему API через Server-Sent Events:

```javascript
const eventSource = new EventSource(`${apiUrl}/stream/sse`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateData(data);
};
```

### Скользящее окно

Данные автоматически удаляются по истечении времени окна:

```javascript
const windowMs = windowSize * 1000;
newFhr = newFhr.filter(point => now - point.x <= windowMs);
```

## Стилизация

Компонент использует темную тему, аналогичную Python версии:

- Фон: `#0b1220` (темно-синий)
- Текст: `#e6edf3` (светло-серый)
- FHR график: `#4ade80` (зеленый)
- UC график: `#60a5fa` (синий)
- Патологии: `#7f1d1d` (красный)

## API совместимость

Компонент работает с вашим существующим API и ожидает данные в формате:

```json
{
  "timestamp": "2025-01-24T12:00:00.000Z",
  "t_ms": 123456,
  "fhr_bpm": 142,
  "uc_mmHg": 32.5,
  "baseline_bpm": 140,
  "variability_bpm": 6.0,
  "accel": false,
  "decel": true,
  "pathology": false,
  "pathology_desc": "",
  "pathologies": [],
  "medications": []
}
```

## Производительность

- **Оптимизированное обновление**: Chart.js обновляется без анимации
- **Эффективное управление памятью**: старые данные автоматически удаляются
- **Плавная отрисовка**: используется `requestAnimationFrame` для обновлений
- **Минимальные перерисовки**: обновляются только измененные части

## Отладка

Для отладки откройте консоль браузера. Компонент выводит:

- Статус подключения к API
- Ошибки парсинга данных
- Информацию о переподключении

## Расширение функциональности

### Добавление новых графиков

```jsx
const newChartData = {
  datasets: [
    {
      label: 'Новый параметр',
      data: data.newParameter,
      borderColor: '#ff6b6b',
      backgroundColor: 'rgba(255, 107, 107, 0.1)',
      fill: true,
      smooth: enableSmoothing
    }
  ]
};
```

### Кастомные индикаторы

```jsx
{/* Ваш кастомный индикатор */}
<div className="custom-indicator">
  <span>Кастомное значение: {customValue}</span>
</div>
```

## Устранение неполадок

### График не отображается
- Проверьте, что API запущен на указанном URL
- Убедитесь, что CORS настроен правильно
- Проверьте консоль браузера на ошибки

### Данные не обновляются
- Проверьте подключение к `/stream/sse`
- Убедитесь, что API возвращает данные в правильном формате
- Проверьте настройки `windowSize` и `updateInterval`

### График не плавный
- Убедитесь, что `enableSmoothing={true}`
- Проверьте, что `updateInterval` не слишком большой
- Убедитесь, что `windowSize` достаточен для сглаживания

## Лицензия

MIT License - используйте свободно в своих проектах.
