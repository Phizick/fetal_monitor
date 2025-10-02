# Обновления API - Управление пациентками

## 🆕 Новые возможности

### 1. Получение всех пациенток
- **GET** `/patients` - получить список всех пациенток из БД
- Возвращает массив объектов с ID, именем и препаратами

### 2. Управление препаратами по пациенткам
- **PUT** `/sim/medications/{patient_id}` - установить препараты для конкретной пациентки
- Обновляет препараты в БД и в симуляторе
- Старый POST `/sim/medications` помечен как deprecated

## 📋 Изменения в API

### Добавленные эндпоинты

#### GET /patients
```http
GET /patients
Content-Type: application/json
```

**Ответ:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "full_name": "Иванова И.И.",
    "medications": ["гинипрал", "магнезия"]
  }
]
```

#### PUT /sim/medications/{patient_id}
```http
PUT /sim/medications/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "medications": ["гинипрал", "магнезия", "окситоцин"]
}
```

**Ответ:**
```json
{
  "message": "Medications updated for patient",
  "patient_id": "507f1f77bcf86cd799439011",
  "medications": ["гинипрал", "магнезия", "окситоцин"]
}
```

### Измененные эндпоинты

#### POST /sim/medications (deprecated)
- Помечен как устаревший
- Рекомендуется использовать PUT /sim/medications/{patient_id}
- Продолжает работать для обратной совместимости

## 🔧 Технические детали

### Обновления в realtime_api.py

1. **Добавлен новый роут GET /patients:**
```python
@app.get("/patients", response_model=List[PatientOut])
async def get_all_patients() -> List[PatientOut]:
    # Возвращает всех пациенток из БД
```

2. **Изменен роут для препаратов:**
```python
@app.put("/sim/medications/{patient_id}")
async def set_patient_medications(
    patient_id: str = Path(..., description="Mongo ObjectId пациентки"),
    payload: SimulatorMedications = None
):
    # Обновляет препараты для конкретной пациентки в БД
```

3. **Сохранен старый роут для совместимости:**
```python
@app.post("/sim/medications", deprecated=True)
async def set_medications_legacy(payload: SimulatorMedications):
    # Старый роут помечен как deprecated
```

### Обновления в БД

- Добавлено поле `updated_at` при обновлении препаратов
- Индексы остались без изменений
- Обратная совместимость сохранена

## 🎨 React компоненты

### Новый компонент PatientManagement.jsx

**Функции:**
- ✅ Просмотр всех пациенток
- ✅ Создание новых пациенток
- ✅ Редактирование препаратов
- ✅ Обработка ошибок
- ✅ Уведомления об успехе

**Использование:**
```jsx
import PatientManagement from './PatientManagement';

<PatientManagement apiUrl="http://localhost:8080" />
```

### Обновленный App.jsx

**Новые возможности:**
- ✅ Переключатель вкладок (Мониторинг / Пациентки)
- ✅ Интеграция с PatientManagement
- ✅ Сохранение настроек между вкладками

**Файл:** `App_with_patients.jsx`

## 📱 Интерфейс

### Вкладка "Мониторинг"
- Плавные графики FHR и UC
- Настройки отображения
- Индикаторы патологий

### Вкладка "Пациентки"
- Список всех пациенток
- Создание новых пациенток
- Управление препаратами
- Поиск и фильтрация

## 🚀 Быстрый старт

### 1. Обновите API
```bash
# Остановите старый API
# Запустите обновленный
python realtime_api.py
```

### 2. Используйте новые компоненты
```jsx
// Вместо App.jsx используйте App_with_patients.jsx
import App from './App_with_patients';

// Или используйте только PatientManagement
import PatientManagement from './PatientManagement';
```

### 3. Тестирование
```bash
# Проверьте новые эндпоинты
curl http://localhost:8080/patients
curl -X PUT http://localhost:8080/sim/medications/ID -d '{"medications":["гинипрал"]}'
```

## 📊 Примеры использования

### JavaScript/React

```javascript
// Получить всех пациенток
const patients = await fetch('http://localhost:8080/patients').then(r => r.json());

// Обновить препараты для пациентки
await fetch(`http://localhost:8080/sim/medications/${patientId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ medications: ['гинипрал', 'магнезия'] })
});
```

### Python

```python
import requests

# Получить всех пациенток
patients = requests.get('http://localhost:8080/patients').json()

# Обновить препараты
response = requests.put(
    f'http://localhost:8080/sim/medications/{patient_id}',
    json={'medications': ['гинипрал', 'магнезия']}
)
```

## 🔄 Миграция

### С старого API на новый

**Старый способ:**
```javascript
// Не рекомендуется
fetch('/sim/medications', {
  method: 'POST',
  body: JSON.stringify({ medications: ['гинипрал'] })
});
```

**Новый способ:**
```javascript
// Рекомендуется
fetch(`/sim/medications/${patientId}`, {
  method: 'PUT',
  body: JSON.stringify({ medications: ['гинипрал'] })
});
```

## 🐛 Обработка ошибок

### Коды ошибок
- `400` - Неверный ID пациентки
- `404` - Пациентка не найдена
- `500` - Ошибка подключения к БД

### Пример обработки
```javascript
try {
  const response = await fetch(`/sim/medications/${patientId}`, {
    method: 'PUT',
    body: JSON.stringify({ medications })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Ошибка ${response.status}: ${error.detail}`);
  }
  
  const result = await response.json();
  console.log('Успешно:', result);
  
} catch (error) {
  console.error('Ошибка:', error.message);
}
```

## 📈 Производительность

### Оптимизации
- Асинхронные запросы к БД
- Кэширование списка пациенток
- Ленивая загрузка данных
- Обработка ошибок без блокировки UI

### Рекомендации
- Используйте пагинацию для больших списков
- Кэшируйте данные пациенток
- Обрабатывайте ошибки сети

## 🔒 Безопасность

### Валидация
- Проверка ObjectId перед запросами к БД
- Валидация входных данных
- Санитизация строк препаратов

### Ошибки
- Не раскрываются внутренние детали БД
- Понятные сообщения об ошибках
- Логирование для отладки

## 📝 Changelog

### v0.2.0
- ✅ Добавлен GET /patients
- ✅ Изменен POST /sim/medications на PUT /sim/medications/{patient_id}
- ✅ Добавлен компонент PatientManagement
- ✅ Обновлен интерфейс с вкладками
- ✅ Сохранена обратная совместимость

### v0.1.0
- ✅ Базовый API для мониторинга
- ✅ Симулятор данных
- ✅ Потоковые эндпоинты

## 🤝 Поддержка

Если у вас возникли проблемы:
1. Проверьте версию API (должна быть 0.2.0+)
2. Убедитесь в правильности ObjectId
3. Проверьте логи сервера
4. Используйте Swagger UI для тестирования

---

**Результат:** Теперь у вас есть полноценное управление пациентками с современным API! 🎉
