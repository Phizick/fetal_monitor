import React from 'react';
import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { User } from '../../types';

const { Text } = Typography;

interface DoctorsTableProps {
  data: User[];
  loading?: boolean;
  pagination?: { current: number; pageSize: number; total: number };
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
}

const DoctorsTable: React.FC<DoctorsTableProps> = ({ data, loading = false, pagination, onTableChange }) => {
  const columns: ColumnsType<User> = [
    {
      title: 'Имя',
      key: 'name',
      dataIndex: 'name',
      sorter: true,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Дата создания',
      key: 'createdAt',
      dataIndex: 'createdAt',
      sorter: true,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const isEmpty = !data || data.length === 0;
  const computedColumns = isEmpty ? columns.map(c => ({ ...c, width: undefined, fixed: undefined })) : columns;

  return (
    <Table
      columns={computedColumns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      pagination={pagination ? {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} врачей`,
        pageSizeOptions: ['10', '20', '50'],
      } : false}
      onChange={onTableChange}
      scroll={isEmpty ? { y: 'calc(100vh - 420px)' } : { y: 'calc(100vh - 420px)' }}
      size="small"
      style={{ height: '100%' }}
      tableLayout={isEmpty ? 'fixed' : undefined}
      locale={{ emptyText: 'Нет врачей' }}
    />
  );
};

export default DoctorsTable;


