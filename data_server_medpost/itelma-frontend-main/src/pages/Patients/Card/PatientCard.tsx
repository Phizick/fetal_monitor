import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Descriptions, Spin, Grid } from 'antd';
import PageHeader from '../../../components/PageHeader/PageHeader';
import { HistoryOutlined, EditOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import PatientFormModal from '../../../components/PatientFormModal/PatientFormModal';
import styles from './PatientCard.module.scss';
import { patientService, userService } from '../../../services/api';
import type { PatientWithId } from '../../../types';

const PatientCard: React.FC = () => {
  const { id } = useParams();
  const screens = Grid.useBreakpoint();
  const [patient, setPatient] = useState<PatientWithId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>('');
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const p = await patientService.getPatient(id);
        setPatient(p);
        if (p.doctorId) {
          try {
            const d = await userService.getUser(p.doctorId);
            setDoctorName(d.name || d.login);
          } catch {
            setDoctorName(`ID: ${p.doctorId}`);
          }
        } else {
          setDoctorName('—');
        }
      } catch {
        setError(`Ошибка загрузки пациентки`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <div className={styles.container}>
      <PageHeader
        title="Карточка пациентки"
        subtitle={patient?.name || '—'}
        showBack
        titlePostfix={(
          <Button type="text" icon={<EditOutlined />} onClick={() => setIsEditOpen(true)} />
        )}
        actions={(
          <Button icon={<HistoryOutlined />} onClick={() => id && (window.location.href = `/patients/${id}/session`)}>История мониторинга</Button>
        )}
      />

      <div className={styles.content}>
        {loading ? (
          <div className={styles.center}><Spin /></div>
        ) : error ? (
          <Typography.Text type="danger">{error}</Typography.Text>
        ) : patient ? (
          <Descriptions bordered column={1} size="middle" layout={screens.md ? 'horizontal' : 'vertical'}>
            <Descriptions.Item label="Имя">{patient.name}</Descriptions.Item>
            <Descriptions.Item label="Дата рождения">{new Date(patient.birthday).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="Адрес">{patient.address}</Descriptions.Item>
            <Descriptions.Item label="Телефон">{patient.phone}</Descriptions.Item>
            <Descriptions.Item label="Палата">{patient.roomNumber}</Descriptions.Item>
            <Descriptions.Item label="Дата начала беременности">{new Date(patient.pregnancyStartDate).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="Количество плодов">{patient.fetusCount}</Descriptions.Item>
            <Descriptions.Item label="Лечащий врач">{doctorName}</Descriptions.Item>
            <Descriptions.Item label="Создана">{new Date(patient.createdAt).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Обновлена">{new Date(patient.updatedAt).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        ) : null}
        {patient && (
          <PatientFormModal
            open={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            initialValues={patient}
            onSuccess={async () => {
              setIsEditOpen(false);
              if (id) {
                const updated = await patientService.getPatient(id);
                setPatient(updated);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PatientCard;


