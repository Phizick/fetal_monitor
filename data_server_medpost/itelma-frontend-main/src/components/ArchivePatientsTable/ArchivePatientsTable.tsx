import React from 'react';
import { Table, Typography, Space, Button, Tooltip } from 'antd';
import { UndoOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { PatientWithId } from '../../types';
import styles from '../AllPatientsTable/AllPatientsTable.module.scss';

const { Text } = Typography;

interface ArchivePatientsTableProps {
  data: PatientWithId[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
  };
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
  doctorMap?: Record<number, string>;
  onRestore?: (patient: PatientWithId) => void;
  onDelete?: (patient: PatientWithId) => void;
  visibleColumns?: { [key: string]: boolean };
}

const ArchivePatientsTable: React.FC<ArchivePatientsTableProps> = ({
  data,
  loading = false,
  pagination,
  onTableChange,
  doctorMap,
  onRestore,
  onDelete,
  visibleColumns
}) => {
  const columns: ColumnsType<PatientWithId> = [
    {
      title: 'Пациентка',
      key: 'name',
      dataIndex: 'name',
      width: 150,
      fixed: 'left',
      sorter: true,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Палата',
      key: 'roomNumber',
      dataIndex: 'roomNumber',
      width: 80,
      align: 'center',
      sorter: true,
    },
    {
      title: 'Номер телефона',
      key: 'phone',
      dataIndex: 'phone',
      width: 120,
      sorter: true,
      render: (phone: string) => (
        <Text className={styles.phoneNumber}>
          {phone || 'Не указан'}
        </Text>
      ),
    },
    {
      title: 'Дата начала беременности',
      key: 'pregnancyStartDate',
      dataIndex: 'pregnancyStartDate',
      width: 140,
      align: 'center',
      ellipsis: true,
      sorter: true,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Кол-во плодов',
      key: 'fetusCount',
      dataIndex: 'fetusCount',
      width: 80,
      align: 'center',
      ellipsis: true,
      sorter: true,
    },
    {
      title: 'Лечащий врач',
      key: 'doctorId',
      dataIndex: 'doctorId',
      width: 150,
      ellipsis: true,
      render: (doctorId: number) => (
        <Text>{doctorMap?.[doctorId] || `ID: ${doctorId}`}</Text>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Восстановить">
            <Button type="text" icon={<UndoOutlined />} onClick={() => onRestore && onRestore(record)} />
          </Tooltip>
          <Tooltip title="Удалить">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete && onDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const isEmpty = !data || data.length === 0;
  const computedColumns = isEmpty
    ? columns.map(col => ({ ...col, width: undefined, fixed: undefined }))
    : columns;

  const filteredColumns = visibleColumns
    ? computedColumns.filter(col => visibleColumns[col.key as string] !== false)
    : computedColumns;

  return (
    <Table
      columns={filteredColumns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      pagination={pagination ? {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} из ${total} пациентов`,
        pageSizeOptions: ['10', '20', '50'],
      } : false}
      onChange={onTableChange}
      scroll={isEmpty ? { y: 'calc(100vh - 420px)' } : { x: 600, y: 'calc(100vh - 420px)' }}
      size="small"
      style={{ height: '100%' }}
      tableLayout={isEmpty ? 'fixed' : undefined}
      locale={{
        emptyText: 'Нет пациентов'
      }}
    />
  );
};

export default ArchivePatientsTable;


