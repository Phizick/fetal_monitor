import React from 'react';
import { Table, Typography, Button, Space, Tooltip } from 'antd';
import { EditOutlined, ApiOutlined, InboxOutlined, HistoryOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TablePaginationConfig } from 'antd/es/table/interface';
import type { SorterResult, FilterValue } from 'antd/es/table/interface';
import type { PatientWithId } from '../../types';
import { calculatePregnancyWeeks } from '../../utils/patientUtils';
import styles from './AllPatientsTable.module.scss';

const { Text } = Typography;

interface AllPatientsTableProps {
  data: PatientWithId[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
  };
  onTableChange?: (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<PatientWithId> | SorterResult<PatientWithId>[]
  ) => void;
  doctorMap?: Record<number, string>;
  onEdit?: (patient: PatientWithId) => void;
  onShowToken?: (patient: PatientWithId) => void;
  onArchive?: (patient: PatientWithId) => void;
  onRowClick?: (patient: PatientWithId) => void;
  onViewHistory?: (patient: PatientWithId) => void;
  visibleColumns?: { [key: string]: boolean };
}

const AllPatientsTable: React.FC<AllPatientsTableProps> = ({
  data,
  loading = false,
  pagination,
  onTableChange,
  doctorMap,
  onEdit,
  onShowToken,
  onArchive,
  onRowClick,
  onViewHistory,
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
      title: 'Срок беременности',
      key: 'pregnancyStartDate',
      dataIndex: 'pregnancyStartDate',
      width: 100,
      align: 'center',
      ellipsis: true,
      sorter: true,
      render: (date: string) => {
        const weeks = calculatePregnancyWeeks(date);
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
      sorter: true,
    },
    {
      title: 'Лечащий врач',
      key: 'doctorId',
      dataIndex: 'doctorId',
      width: 150,
      ellipsis: true,
      render: (doctorId: number) => {
        const name = doctorMap?.[doctorId];
        return name ? <Text>{name}</Text> : <Text type="secondary">ID: {doctorId}</Text>;
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(record); }}
            />
          </Tooltip>
          <Tooltip title="История мониторинга">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={(e) => { e.stopPropagation(); if (onViewHistory) onViewHistory(record); }}
            />
          </Tooltip>
          <Tooltip title="Токен мониторинга">
            <Button
              type="text"
              icon={<ApiOutlined />}
              onClick={(e) => { e.stopPropagation(); if (onShowToken) onShowToken(record); }}
            />
          </Tooltip>
          <Tooltip title="Архивировать">
            <Button
              type="text"
              icon={<InboxOutlined />}
              onClick={(e) => { e.stopPropagation(); if (onArchive) onArchive(record); }}
            />
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
      onRow={(record) => ({
        onClick: () => onRowClick && onRowClick(record),
        style: onRowClick ? { cursor: 'pointer' } : undefined,
      })}
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

export default AllPatientsTable;
