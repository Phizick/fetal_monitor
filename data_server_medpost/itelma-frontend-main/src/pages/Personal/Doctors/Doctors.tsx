import React from 'react';
import { Typography, Input, Button, Tooltip } from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import styles from './Doctors.module.scss';
import DoctorsTable from '../../../components/DoctorsTable/DoctorsTable';
import { useDoctors } from '../../../hooks/useDoctors';

const { Title, Paragraph } = Typography;
const { Search } = Input;

const Doctors: React.FC = () => {
  const { doctors, loading, error, pagination, search, handleSearch, handleTableChange } = useDoctors();

  const exportDoctorsXlsx = () => {
    const rows = doctors.map(d => ({
      'Имя': d.name,
      'Дата создания': d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Врачи');
    const ts = new Date();
    const tsStr = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}-${String(ts.getMinutes()).padStart(2,'0')}`;
    XLSX.writeFile(wb, `doctors_${tsStr}.xlsx`);
  };
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>Лечащие врачи</Title>
        <Paragraph className={styles.subtitle}>
          Управление персоналом лечащих врачей
        </Paragraph>
      </div>

      <div className={styles.tabsSection}>
        <div className={styles.tabsHeader}>
          <div className={styles.tabsActions}>
            <Search
              placeholder="Поиск по имени"
              prefix={<SearchOutlined />}
              className={styles.searchInput}
              allowClear
              value={search}
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <Tooltip title="Скачать в xlsx">
              <Button icon={<DownloadOutlined />} className={styles.actionButton} onClick={exportDoctorsXlsx} />
            </Tooltip>
          </div>
        </div>

        <div className={styles.tableContainer}>
          {error && (
            <div className={styles.empty}>
              <Typography.Text type="danger">{error}</Typography.Text>
            </div>
          )}
          <DoctorsTable
            data={doctors}
            loading={loading}
            pagination={pagination}
            onTableChange={handleTableChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Doctors;
