import React, { useState, useEffect } from 'react';

const PatientManagement = ({ apiUrl = 'http://localhost:8080' }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Загружаем всех пациенток
  const loadPatients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiUrl}/patients`);
      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setPatients(data);
    } catch (err) {
      setError(`Ошибка загрузки пациенток: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем пациенток при монтировании компонента
  useEffect(() => {
    loadPatients();
  }, []);

  // Обновляем препараты для выбранной пациентки
  const updateMedications = async () => {
    if (!selectedPatient) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`${apiUrl}/sim/medications/${selectedPatient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ medications })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Ошибка ${response.status}: ${errorData.detail || response.statusText}`);
      }
      
      const result = await response.json();
      setSuccess(`Препараты успешно обновлены для ${selectedPatient.full_name}`);
      
      // Обновляем список пациенток
      const updatedPatients = patients.map(p => 
        p.id === selectedPatient.id 
          ? { ...p, medications: medications }
          : p
      );
      setPatients(updatedPatients);
      
    } catch (err) {
      setError(`Ошибка обновления препаратов: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Создаем новую пациентку
  const createPatient = async (fullName, initialMedications = []) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiUrl}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          medications: initialMedications
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Ошибка ${response.status}: ${errorData.detail || response.statusText}`);
      }
      
      const newPatient = await response.json();
      setPatients([...patients, newPatient]);
      setSuccess(`Пациентка ${fullName} успешно создана`);
      
    } catch (err) {
      setError(`Ошибка создания пациентки: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Обработчики для формы создания пациентки
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientMedications, setNewPatientMedications] = useState('');

  const handleCreatePatient = (e) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    
    const medications = newPatientMedications
      .split(',')
      .map(m => m.trim())
      .filter(m => m);
    
    createPatient(newPatientName.trim(), medications);
    setNewPatientName('');
    setNewPatientMedications('');
  };

  // Обработчик изменения препаратов
  const handleMedicationsChange = (e) => {
    const value = e.target.value;
    const medicationsList = value
      .split(',')
      .map(m => m.trim())
      .filter(m => m);
    setMedications(medicationsList);
  };

  // Очистка сообщений
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div style={{
      background: '#0b1220',
      color: '#e6edf3',
      padding: '20px',
      borderRadius: '8px',
      fontFamily: 'sans-serif'
    }}>
      <h2 style={{ 
        margin: '0 0 20px 0', 
        fontSize: '24px',
        fontWeight: 'bold',
        background: 'linear-gradient(45deg, #4ade80, #60a5fa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        Управление пациентками
      </h2>

      {/* Сообщения об ошибках и успехе */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#7f1d1d',
          color: '#fecaca',
          borderRadius: '6px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button 
            onClick={clearMessages}
            style={{
              background: 'none',
              border: 'none',
              color: '#fecaca',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px',
          backgroundColor: '#064e3b',
          color: '#d1fae5',
          borderRadius: '6px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{success}</span>
          <button 
            onClick={clearMessages}
            style={{
              background: 'none',
              border: 'none',
              color: '#d1fae5',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Форма создания новой пациентки */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>
          Создать новую пациентку
        </h3>
        
        <form onSubmit={handleCreatePatient} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newPatientName}
            onChange={(e) => setNewPatientName(e.target.value)}
            placeholder="ФИО пациентки"
            required
            style={{
              padding: '8px 12px',
              border: '1px solid #374151',
              borderRadius: '6px',
              background: '#0b1220',
              color: '#e6edf3',
              fontSize: '14px',
              minWidth: '200px'
            }}
          />
          
          <input
            type="text"
            value={newPatientMedications}
            onChange={(e) => setNewPatientMedications(e.target.value)}
            placeholder="Препараты через запятую (опционально)"
            style={{
              padding: '8px 12px',
              border: '1px solid #374151',
              borderRadius: '6px',
              background: '#0b1220',
              color: '#e6edf3',
              fontSize: '14px',
              minWidth: '250px'
            }}
          />
          
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#6b7280' : '#4ade80',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </form>
      </div>

      {/* Список пациенток */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            Список пациенток ({patients.length})
          </h3>
          <button
            onClick={loadPatients}
            disabled={loading}
            style={{
              padding: '6px 12px',
              backgroundColor: loading ? '#6b7280' : '#60a5fa',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            {loading ? 'Загрузка...' : 'Обновить'}
          </button>
        </div>

        {patients.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>
            {loading ? 'Загрузка пациенток...' : 'Нет пациенток'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {patients.map(patient => (
              <div 
                key={patient.id}
                onClick={() => {
                  setSelectedPatient(patient);
                  setMedications(patient.medications || []);
                }}
                style={{
                  padding: '12px',
                  border: selectedPatient?.id === patient.id ? '2px solid #4ade80' : '1px solid #374151',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: selectedPatient?.id === patient.id ? '#064e3b' : '#0b1220',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {patient.full_name}
                </div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                  Препараты: {patient.medications?.join(', ') || 'нет'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  ID: {patient.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Управление препаратами для выбранной пациентки */}
      {selectedPatient && (
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>
            Препараты для {selectedPatient.full_name}
          </h3>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              value={medications.join(', ')}
              onChange={handleMedicationsChange}
              placeholder="Введите препараты через запятую"
              style={{
                padding: '8px 12px',
                border: '1px solid #374151',
                borderRadius: '6px',
                background: '#0b1220',
                color: '#e6edf3',
                fontSize: '14px',
                minWidth: '300px',
                flex: 1
              }}
            />
            
            <button
              onClick={updateMedications}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: loading ? '#6b7280' : '#4ade80',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Обновление...' : 'Обновить препараты'}
            </button>
            
            <button
              onClick={() => setSelectedPatient(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Отменить
            </button>
          </div>
          
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
            Текущие препараты: {medications.length > 0 ? medications.join(', ') : 'нет'}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientManagement;
