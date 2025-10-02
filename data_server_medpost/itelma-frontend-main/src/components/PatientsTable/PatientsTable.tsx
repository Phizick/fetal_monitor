import React from 'react';
import { Table, Tag, Typography, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PatientTableRow } from '../../types';
import {
  calculatePregnancyWeeks,
  formatMonitoringValue,
  isNormalValue
} from '../../utils/patientUtils';
import styles from './PatientsTable.module.scss';

const { Text } = Typography;

interface PatientsTableProps {
  data: PatientTableRow[];
  loading?: boolean;
  onRowClick?: (row: PatientTableRow) => void;
  visibleColumns?: { [key: string]: boolean };
}

const PatientsTable: React.FC<PatientsTableProps> = ({ data, loading = false, onRowClick, visibleColumns }) => {
  const columns: ColumnsType<PatientTableRow> = [
    {
      title: 'Пациентка',
      key: 'patient',
      dataIndex: 'patient',
      width: 150,
      fixed: 'left',
      render: (_, record) => (
        <Text strong>{record.patient.name}</Text>
      ),
    },
    {
      title: 'Палата',
      key: 'room',
      dataIndex: 'room',
      width: 80,
      align: 'center',
      render: (_, record) => record.patient.roomNumber,
    },
    {
      title: 'Номер телефона',
      key: 'phone',
      dataIndex: 'phone',
      width: 120,
      render: (_, record) => (
        <Text className={styles.phoneNumber}>
          {record.patient.phone || 'Не указан'}
        </Text>
      ),
    },
    {
      title: 'Срок беременности',
      key: 'pregnancy',
      dataIndex: 'pregnancy',
      width: 100,
      align: 'center',
      ellipsis: true,
      render: (_, record) => {
        const weeks = calculatePregnancyWeeks(record.patient.pregnancyStartDate);
        return `${weeks} нед.`;
      },
    },
    {
      title: 'Кол-во плодов',
      key: 'fetusCount',
      dataIndex: 'fetusCount',
      width: 80,
      align: 'center',
      ellipsis: true,
      render: (_, record) => record.patient.fetusCount,
    },
    {
      title: 'Состояние',
      key: 'status',
      dataIndex: 'status',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const hasPathology = record.lastData?.pathology;
        const statusText = hasPathology ? 'Патология' : 'Норма';
        const statusColor = hasPathology ? '#ff4d4f' : '#52c41a';

        if (hasPathology && record.lastData) {
          const tooltipContent = (
            <div className={styles.pathologyTooltip}>
              {record.lastData.pathology_desc && (
                <div className={styles.pathologyDesc}>
                  {record.lastData.pathology_desc}
                </div>
              )}
              {record.lastData.pathologies.length > 0 && (
                <ul className={styles.pathologiesList}>
                  {record.lastData.pathologies.map((pathology, index) => (
                    <li key={index}>{pathology}</li>
                  ))}
                </ul>
              )}
            </div>
          );

          return (
            <Tooltip title={tooltipContent} placement="top">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <Tag color={statusColor} style={{ margin: 0 }}>
                  {statusText}
                </Tag>
              </div>
            </Tooltip>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <Tag color={statusColor} style={{ margin: 0 }}>
              {statusText}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Прогноз',
      key: 'prediction',
      dataIndex: 'prediction',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (!record.lastData?.ml) {
          return <Text type="secondary">Нет данных</Text>;
        }

        const { prediction, confidence } = record.lastData.ml;
        const confidencePercent = Math.round(confidence * 100);

        let statusText = '';
        let statusColor = '';

        switch (prediction) {
          case 'Normal':
            statusText = 'Норма';
            statusColor = '#52c41a';
            break;
          case 'Suspect':
            statusText = 'Подозрительно';
            statusColor = '#faad14';
            break;
          case 'Pathological':
            statusText = 'Патология';
            statusColor = '#ff4d4f';
            break;
          default:
            statusText = 'Неизвестно';
            statusColor = '#d9d9d9';
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <Tag color={statusColor} style={{ margin: 0 }}>
              {statusText}
            </Tag>
            <Text style={{ fontSize: '11px', color: '#666' }}>
              {confidencePercent}%
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Продолжительность сессии',
      key: 'duration',
      dataIndex: 'duration',
      width: 120,
      align: 'center',
      ellipsis: true,
      render: (_, record) => {
        const startTime = new Date(record.startTime);
        const now = new Date();
        const durationMs = now.getTime() - startTime.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        if (hours > 0) {
          return `${hours}ч ${minutes}м`;
        }
        return `${minutes}м`;
      },
    },
    {
      title: 'Лечащий врач',
      key: 'doctor',
      dataIndex: 'doctor',
      width: 150,
      ellipsis: true,
      render: (_, record) => record.doctor.name,
    },
    {
      title: 'Препараты',
      key: 'medications',
      dataIndex: 'medications',
      width: 150,
      render: (_, record) => {
        if (!record.lastData?.medications || record.lastData.medications.length === 0) {
          return <Text type="secondary">Нет</Text>;
        }

        return (
          <div className={styles.medicationsList}>
            {record.lastData.medications.map((medication, index) => (
              <span key={index} className={styles.medicationTag}>
                {medication}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Показатели',
      key: 'metrics',
      dataIndex: 'metrics',
      render: (_, record) => {
        if (!record.lastData) {
          return <Text type="secondary">Нет данных</Text>;
        }

        const { lastData } = record;

        return (
          <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span>
                <Text>FHR: </Text>
                <Text
                  style={{
                    color: isNormalValue('fhr', lastData.fhr_bpm) ? '#52c41a' : '#ff4d4f',
                    fontWeight: 'bold'
                  }}
                >
                  {formatMonitoringValue(lastData.fhr_bpm, ' уд/мин')}
                </Text>
              </span>
              <span>
                <Text>UC: </Text>
                <Text
                  style={{
                    color: isNormalValue('uc', lastData.uc_mmHg) ? '#52c41a' : '#ff4d4f',
                    fontWeight: 'bold'
                  }}
                >
                  {formatMonitoringValue(lastData.uc_mmHg, ' мм рт.ст.')}
                </Text>
              </span>
              <span>
                <Text>Baseline: </Text>
                <Text
                  style={{
                    color: isNormalValue('baseline', lastData.baseline_bpm) ? '#52c41a' : '#ff4d4f',
                    fontWeight: 'bold'
                  }}
                >
                  {formatMonitoringValue(lastData.baseline_bpm, ' уд/мин')}
                </Text>
              </span>
              <span>
                <Text>Variability: </Text>
                <Text
                  style={{
                    color: isNormalValue('variability', lastData.variability_bpm) ? '#52c41a' : '#ff4d4f',
                    fontWeight: 'bold'
                  }}
                >
                  {formatMonitoringValue(lastData.variability_bpm, ' уд/мин')}
                </Text>
              </span>
              <span>
                <Text>Accel: </Text>
                <Tag color={lastData.accel ? '#52c41a' : '#d9d9d9'}>
                  {lastData.accel ? 'Да' : 'Нет'}
                </Tag>
              </span>
              <span>
                <Text>Decel: </Text>
                <Tag color={lastData.decel ? '#ff4d4f' : '#d9d9d9'}>
                  {lastData.decel ? 'Да' : 'Нет'}
                </Tag>
              </span>
            </div>
          </div>
        );
      },
    },
  ];

  const filteredColumns = visibleColumns
    ? columns.filter(col => visibleColumns[col.key as string] !== false)
    : columns;

  return (
    <Table
      columns={filteredColumns}
      dataSource={data}
      loading={loading}
      rowKey="sessionId"
      pagination={false}
      scroll={{ x: 1200, y: 'calc(100vh - 300px)' }}
      size="small"
      style={{ height: '100%' }}
      onRow={(record) => ({
        onClick: () => {
          if (onRowClick) onRowClick(record);
        }
      })}
      locale={{
        emptyText: 'Нет подключенных пациентов'
      }}
    />
  );
};

export default PatientsTable;
