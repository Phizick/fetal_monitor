import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Table, Spin } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import PageHeader from '../../../components/PageHeader/PageHeader';
import { monitoringService, patientService } from '../../../services/api';
import type { MonitoringSession, SessionsResponse } from '../../../types';
import styles from './PatientSessions.module.scss';

const { Text } = Typography;

const PatientSessions: React.FC = () => {
  const { id } = useParams();
  const [patientName, setPatientName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonitoringSession[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const load = useCallback(async (page = 1, limit = 10) => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const resp: SessionsResponse = await monitoringService.getPatientSessions(id, { page, limit, status: 'stopped' });
      setData(resp.sessions);
      setPagination({ current: resp.page, pageSize: resp.limit, total: resp.total });
    } catch (e) {
      setError('Ошибка загрузки истории');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const fetchName = async () => {
      if (!id) return;
      try {
        const p = await patientService.getPatient(id);
        setPatientName(p.name);
      } catch {
        setPatientName('—');
      }
    };
    fetchName();
    load(1, 10);
  }, [id, load]);

  const handleTableChange = (pag: TablePaginationConfig) => {
    load(pag.current || 1, pag.pageSize || 10);
  };

  const columns: ColumnsType<MonitoringSession> = [
    {
      title: 'Время начала',
      key: 'startTime',
      dataIndex: 'startTime',
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: 'Время окончания',
      key: 'endTime',
      dataIndex: 'endTime',
      render: (v: string | null) => v ? new Date(v).toLocaleString() : '—',
    },
    {
      title: 'ID монитора',
      key: 'monitorId',
      dataIndex: 'monitorId',
      render: (v: string) => <Text>{v}</Text>,
    },
  ];

  return (
    <div className={styles.container}>
      <PageHeader title="История мониторинга" subtitle={patientName} showBack />
      <div className={styles.content}>
        {error && <div className={styles.center}><Text type="danger">{error}</Text></div>}
        {loading ? (
          <div className={styles.center}><Spin /></div>
        ) : (
          <Table
            columns={columns}
            dataSource={data}
            rowKey={(r) => r.id || r.sessionId}
            pagination={{ current: pagination.current, pageSize: pagination.pageSize, total: pagination.total, showSizeChanger: false }}
            onChange={handleTableChange}
            onRow={(record) => ({ onClick: () => { if (id) window.location.href = `/patients/${id}/session/${record.sessionId}`; }, style: { cursor: 'pointer' } })}
          />
        )}
      </div>
    </div>
  );
};

export default PatientSessions;


