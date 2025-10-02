# Примеры использования обновленного API

## Новые эндпоинты

### 1. Получить всех пациенток

**GET** `/patients`

Возвращает список всех пациенток из базы данных.

**Ответ:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "full_name": "Иванова И.И.",
    "medications": ["гинипрал", "магнезия"]
  },
  {
    "id": "507f1f77bcf86cd799439012", 
    "full_name": "Петрова П.П.",
    "medications": ["окситоцин"]
  }
]
```

**Пример запроса (curl):**
```bash
curl -X GET "http://localhost:8080/patients" \
  -H "accept: application/json"
```

**Пример запроса (JavaScript):**
```javascript
const response = await fetch('http://localhost:8080/patients');
const patients = await response.json();
console.log(patients);
```

### 2. Установить препараты для конкретной пациентки

**PUT** `/sim/medications/{patient_id}`

Устанавливает активные препараты для конкретной пациентки и обновляет их в БД.

**Параметры:**
- `patient_id` (string) - ID пациентки (Mongo ObjectId)

**Тело запроса:**
```json
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

**Пример запроса (curl):**
```bash
curl -X PUT "http://localhost:8080/sim/medications/507f1f77bcf86cd799439011" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "medications": ["гинипрал", "магнезия"]
  }'
```

**Пример запроса (JavaScript):**
```javascript
const patientId = "507f1f77bcf86cd799439011";
const medications = ["гинипрал", "магнезия"];

const response = await fetch(`http://localhost:8080/sim/medications/${patientId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ medications })
});

const result = await response.json();
console.log(result);
```

## Полный пример работы с API

### 1. Создание пациентки
```javascript
// Создаем новую пациентку
const createPatient = async (fullName, medications = []) => {
  const response = await fetch('http://localhost:8080/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      full_name: fullName,
      medications: medications
    })
  });
  
  return await response.json();
};

const newPatient = await createPatient("Сидорова С.С.", ["гинипрал"]);
console.log('Создана пациентка:', newPatient);
```

### 2. Получение списка всех пациенток
```javascript
// Получаем всех пациенток
const getAllPatients = async () => {
  const response = await fetch('http://localhost:8080/patients');
  return await response.json();
};

const patients = await getAllPatients();
console.log('Все пациентки:', patients);
```

### 3. Обновление препаратов для пациентки
```javascript
// Обновляем препараты для конкретной пациентки
const updatePatientMedications = async (patientId, medications) => {
  const response = await fetch(`http://localhost:8080/sim/medications/${patientId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ medications })
  });
  
  return await response.json();
};

const result = await updatePatientMedications(
  "507f1f77bcf86cd799439011", 
  ["окситоцин", "магнезия"]
);
console.log('Препараты обновлены:', result);
```

### 4. Получение данных конкретной пациентки
```javascript
// Получаем данные конкретной пациентки
const getPatient = async (patientId) => {
  const response = await fetch(`http://localhost:8080/patients/${patientId}`);
  return await response.json();
};

const patient = await getPatient("507f1f77bcf86cd799439011");
console.log('Данные пациентки:', patient);
```

## React компонент для работы с пациентами

```jsx
import React, { useState, useEffect } from 'react';

const PatientManagement = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [medications, setMedications] = useState([]);

  // Загружаем всех пациенток
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await fetch('http://localhost:8080/patients');
        const data = await response.json();
        setPatients(data);
      } catch (error) {
        console.error('Ошибка загрузки пациенток:', error);
      }
    };
    
    loadPatients();
  }, []);

  // Обновляем препараты для выбранной пациентки
  const updateMedications = async () => {
    if (!selectedPatient) return;
    
    try {
      const response = await fetch(`http://localhost:8080/sim/medications/${selectedPatient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ medications })
      });
      
      const result = await response.json();
      console.log('Препараты обновлены:', result);
      
      // Обновляем список пациенток
      const updatedPatients = patients.map(p => 
        p.id === selectedPatient.id 
          ? { ...p, medications: medications }
          : p
      );
      setPatients(updatedPatients);
      
    } catch (error) {
      console.error('Ошибка обновления препаратов:', error);
    }
  };

  return (
    <div>
      <h2>Управление пациентками</h2>
      
      {/* Список пациенток */}
      <div>
        <h3>Список пациенток:</h3>
        {patients.map(patient => (
          <div 
            key={patient.id}
            onClick={() => setSelectedPatient(patient)}
            style={{
              padding: '10px',
              border: selectedPatient?.id === patient.id ? '2px solid #4ade80' : '1px solid #ccc',
              margin: '5px',
              cursor: 'pointer'
            }}
          >
            <strong>{patient.full_name}</strong>
            <br />
            Препараты: {patient.medications.join(', ') || 'нет'}
          </div>
        ))}
      </div>
      
      {/* Управление препаратами */}
      {selectedPatient && (
        <div>
          <h3>Препараты для {selectedPatient.full_name}:</h3>
          <input
            type="text"
            value={medications.join(', ')}
            onChange={(e) => setMedications(e.target.value.split(',').map(m => m.trim()).filter(m => m))}
            placeholder="Введите препараты через запятую"
          />
          <button onClick={updateMedications}>
            Обновить препараты
          </button>
        </div>
      )}
    </div>
  );
};

export default PatientManagement;
```

## Обработка ошибок

### Коды ошибок

- `400` - Неверный ID пациентки
- `404` - Пациентка не найдена
- `500` - Ошибка подключения к БД

### Пример обработки ошибок

```javascript
const updateMedications = async (patientId, medications) => {
  try {
    const response = await fetch(`http://localhost:8080/sim/medications/${patientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ medications })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Ошибка ${response.status}: ${error.detail}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Ошибка обновления препаратов:', error);
    throw error;
  }
};
```

## Миграция с старого API

### Старый способ (deprecated)
```javascript
// Старый способ - не рекомендуется
fetch('http://localhost:8080/sim/medications', {
  method: 'POST',
  body: JSON.stringify({ medications: ['гинипрал'] })
});
```

### Новый способ
```javascript
// Новый способ - рекомендуется
const patientId = "507f1f77bcf86cd799439011";
fetch(`http://localhost:8080/sim/medications/${patientId}`, {
  method: 'PUT',
  body: JSON.stringify({ medications: ['гинипрал'] })
});
```

## Тестирование в Swagger

1. Откройте `http://localhost:8080/docs`
2. Найдите новые эндпоинты:
   - `GET /patients` - получить всех пациенток
   - `PUT /sim/medications/{patient_id}` - обновить препараты
3. Используйте "Try it out" для тестирования
