# Плавные графики для мониторинга фетального состояния

JavaScript решения для создания плавных графиков как в Python Plotly, работающие с вашим API.

## 🎯 Проблема

В React не удалось создать такие же плавные графики как в Python версии с Plotly. Нужно решение с:
- Плавными сглаженными линиями (spline)
- Работой в реальном времени
- Скользящим окном данных
- Темной темой как в оригинале

## ✅ Решения

### 1. React компонент (рекомендуется)

**Файлы:**
- `FetalMonitoringChart.jsx` - основной компонент
- `App.jsx` - пример использования
- `App.css` - стили
- `package.json` - зависимости

**Особенности:**
- ✅ Полная интеграция с React
- ✅ Настраиваемые параметры
- ✅ Кастомный плагин для сглаживания
- ✅ TypeScript поддержка
- ✅ Адаптивный дизайн

### 2. Vanilla JavaScript (универсальное)

**Файлы:**
- `fetal-chart-vanilla.js` - класс компонента
- `index.html` - пример использования

**Особенности:**
- ✅ Работает без React
- ✅ Легко интегрируется в любой проект
- ✅ Минимальные зависимости
- ✅ Простая настройка

## 🚀 Быстрый старт

### React версия

1. **Установите зависимости:**
```bash
npm install chart.js react-chartjs-2 chartjs-adapter-date-fns date-fns
```

2. **Импортируйте компонент:**
```jsx
import FetalMonitoringChart from './FetalMonitoringChart';

function App() {
  return (
    <FetalMonitoringChart 
      apiUrl="http://localhost:8080"
      windowSize={15}
      enableSmoothing={true}
    />
  );
}
```

3. **Запустите ваш Python API:**
```bash
python realtime_api.py
```

### Vanilla JavaScript версия

1. **Добавьте Chart.js в HTML:**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
<script src="fetal-chart-vanilla.js"></script>
```

2. **Создайте контейнер:**
```html
<div id="fetal-chart"></div>
```

3. **Инициализируйте график:**
```javascript
const chart = new FetalMonitoringChart('fetal-chart', {
  apiUrl: 'http://localhost:8080',
  windowSize: 15,
  enableSmoothing: true
});
```

## 🔧 Технические детали

### Сглаживание графиков

Обе версии используют кастомные алгоритмы сглаживания:

**React версия:**
```javascript
const smoothLinePlugin = {
  id: 'smoothLine',
  beforeDraw: (chart) => {
    // Использует quadraticCurveTo для плавных кривых
    // Аналогично shape: 'spline' в Plotly
  }
};
```

**Vanilla версия:**
```javascript
// Использует tension: 0.4 в Chart.js
tension: this.options.enableSmoothing ? 0.4 : 0
```

### Подключение к API

Обе версии подключаются через Server-Sent Events:

```javascript
const eventSource = new EventSource(`${apiUrl}/stream/sse`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateData(data);
};
```

### Скользящее окно

Данные автоматически удаляются по истечении времени:

```javascript
const windowMs = windowSize * 1000;
data = data.filter(point => now - point.x <= windowMs);
```

## 📊 Параметры компонентов

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `apiUrl` | string | `'http://localhost:8080'` | URL вашего API |
| `windowSize` | number | `15` | Размер окна данных в секундах |
| `updateInterval` | number | `100` | Интервал обновления в мс |
| `enableSmoothing` | boolean | `true` | Включить сглаживание |
| `showPathology` | boolean | `true` | Показывать патологии |
| `showMedications` | boolean | `true` | Показывать препараты |

## 🎨 Стилизация

### Цветовая схема (как в Python)
- **Фон**: `#0b1220` (темно-синий)
- **Текст**: `#e6edf3` (светло-серый)
- **FHR график**: `#4ade80` (зеленый)
- **UC график**: `#60a5fa` (синий)
- **Патологии**: `#7f1d1d` (красный)

### Адаптивность
- Автоматическое масштабирование
- Мобильная версия
- Гибкая сетка графиков

## 🔌 API совместимость

Компоненты работают с вашим существующим API:

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

## ⚡ Производительность

### Оптимизации
- **Без анимации**: `animation: { duration: 0 }`
- **Эффективное обновление**: `update('none')`
- **Управление памятью**: автоматическое удаление старых данных
- **Плавная отрисовка**: `requestAnimationFrame`

### Рекомендации
- Используйте `windowSize` 10-20 секунд
- `updateInterval` 100-200 мс
- Включайте сглаживание для лучшего вида

## 🐛 Устранение неполадок

### График не отображается
1. Проверьте, что API запущен
2. Убедитесь в правильности URL
3. Проверьте CORS настройки
4. Откройте консоль браузера

### Данные не обновляются
1. Проверьте подключение к `/stream/sse`
2. Убедитесь в формате данных API
3. Проверьте настройки `windowSize`

### График не плавный
1. Включите `enableSmoothing: true`
2. Уменьшите `updateInterval`
3. Увеличьте `windowSize`

## 📈 Сравнение с Python версией

| Функция | Python Plotly | JavaScript Chart.js |
|---------|---------------|---------------------|
| Сглаживание | `shape: 'spline'` | Кастомный плагин |
| Реальное время | ✅ | ✅ |
| Скользящее окно | ✅ | ✅ |
| Темная тема | ✅ | ✅ |
| Адаптивность | ✅ | ✅ |
| Производительность | Хорошая | Отличная |

## 🔄 Миграция с Python

1. **Замените Plotly на Chart.js**
2. **Используйте Server-Sent Events вместо WebSocket**
3. **Настройте сглаживание через плагин**
4. **Адаптируйте стили под вашу тему**

## 📝 Примеры использования

### Базовое использование (React)
```jsx
<FetalMonitoringChart 
  apiUrl="http://localhost:8080"
  windowSize={15}
  enableSmoothing={true}
  showPathology={true}
  showMedications={true}
/>
```

### Базовое использование (Vanilla JS)
```javascript
const chart = new FetalMonitoringChart('container', {
  apiUrl: 'http://localhost:8080',
  windowSize: 15,
  enableSmoothing: true
});
```

### Кастомизация стилей
```css
.fetal-monitoring-chart {
  background: #your-color;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

## 🚀 Развертывание

### Локальная разработка
```bash
# React
npm start

# Vanilla JS
# Просто откройте index.html в браузере
```

### Продакшн
```bash
# React
npm run build

# Vanilla JS
# Загрузите файлы на сервер
```

## 📄 Лицензия

MIT License - используйте свободно в своих проектах.

## 🤝 Поддержка

Если у вас возникли проблемы:
1. Проверьте консоль браузера
2. Убедитесь в правильности API
3. Проверьте настройки компонента
4. Создайте issue в репозитории

---

**Результат:** Теперь у вас есть плавные графики в JavaScript, которые работают точно так же как в Python версии! 🎉
