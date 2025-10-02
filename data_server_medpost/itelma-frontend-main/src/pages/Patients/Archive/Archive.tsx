import React from 'react';
import { Typography, Input, Button, Checkbox, Tooltip, Dropdown, Menu } from 'antd';
import { SearchOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import styles from './Archive.module.scss';
import ArchivePatientsTable from '../../../components/ArchivePatientsTable/ArchivePatientsTable';
import { Modal } from 'antd';
import { showSuccess } from '../../../services/notificationService';
import { patientService } from '../../../services/api';
import { useArchivePatients } from '../../../hooks/useArchivePatients';
import useColumnVisibility from '../../../hooks/useColumnVisibility';
import useCheckboxState from '../../../hooks/useCheckboxState';

const ARCHIVE_COLUMN_KEYS = [
  'name',
  'roomNumber',
  'phone',
  'pregnancyStartDate',
  'fetusCount',
  'doctorName',
  'actions'
] as const;

const ARCHIVE_COLUMN_LABELS: Record<string, string> = {
  name: 'Пациентка',
  roomNumber: 'Палата',
  phone: 'Номер телефона',
  pregnancyStartDate: 'Срок беременности',
  fetusCount: 'Кол-во плодов',
  doctorName: 'Лечащий врач',
  actions: 'Действия'
};

const { Title, Paragraph } = Typography;
const { Search } = Input;

const Archive: React.FC = () => {
  const { checked: onlyMine, setChecked: setOnlyMine } = useCheckboxState('archiveOnlyMine', false);
  const { patients, loading, error, pagination, search, handleSearch, handleTableChange, doctorMap, refresh } = useArchivePatients({ enabled: true, onlyMine });

  const { visibleColumns, toggleColumn, resetColumns } = useColumnVisibility('archivePatientsColumns', ARCHIVE_COLUMN_KEYS);

  const getColumnSettingsMenu = () => (
    <Menu>
      <Menu.Item key="reset" onClick={resetColumns}>
        Сбросить настройки
      </Menu.Item>
      <Menu.Divider />
      {ARCHIVE_COLUMN_KEYS.map(columnKey => (
        <div key={columnKey} style={{ padding: '4px 12px' }}>
          <Checkbox
            checked={visibleColumns[columnKey]}
            onChange={() => toggleColumn(columnKey)}
            onClick={(e) => e.stopPropagation()}
          >
            {ARCHIVE_COLUMN_LABELS[columnKey]}
          </Checkbox>
        </div>
      ))}
    </Menu>
  );

  const exportArchiveXlsx = () => {
    const rows = patients.map(p => ({
      'Пациентка': p.name,
      'Палата': p.roomNumber,
      'Номер телефона': p.phone || '',
      'Дата начала беременности': p.pregnancyStartDate ? new Date(p.pregnancyStartDate).toLocaleDateString() : '',
      'Кол-во плодов': p.fetusCount,
      'Лечащий врач': doctorMap?.[p.doctorId] || `ID: ${p.doctorId}`,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Архив');
    const ts = new Date();
    const tsStr = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}-${String(ts.getMinutes()).padStart(2,'0')}`;
    XLSX.writeFile(wb, `patients_archive_${tsStr}.xlsx`);
  };
  const [modal, modalContextHolder] = Modal.useModal();
  return (
    <div className={styles.container}>
      {modalContextHolder}
      <div className={styles.header}>
        <Title level={2}>Архив пациентов</Title>
        <Paragraph className={styles.subtitle}>
          Просмотр архивных записей пациентов
        </Paragraph>
      </div>

      <div className={styles.tabsSection}>
        <div className={styles.tabsHeader}>
          <div className={styles.tabsActionsLeft}>
            <Search
              placeholder="Поиск имени, палате или номеру телефона"
              prefix={<SearchOutlined />}
              className={styles.searchInput}
              allowClear
              value={search}
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <Checkbox checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)}>Только свои</Checkbox>
          </div>
          <div className={styles.tabsActionsRight}>
            <Tooltip title="Скачать в xlsx">
              <Button icon={<DownloadOutlined />} className={styles.actionButton} onClick={exportArchiveXlsx} />
            </Tooltip>
            <Dropdown overlay={getColumnSettingsMenu()} trigger={['click']} placement="bottomRight">
              <Button icon={<SettingOutlined />} className={styles.columnSettingsButton}>
                Настройки
              </Button>
            </Dropdown>
          </div>
        </div>

        <div className={styles.tableContainer}>
          {error && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Typography.Text type="danger">{error}</Typography.Text>
            </div>
          )}
          <ArchivePatientsTable
            data={patients}
            loading={loading}
            pagination={pagination}
            onTableChange={handleTableChange}
            doctorMap={doctorMap}
            visibleColumns={visibleColumns}
            onRestore={(p) => {
              modal.confirm({
                title: 'Восстановить пациентку?',
                content: `Вы точно хотите восстановить пациента ${p.name}?`,
                okText: 'Восстановить',
                cancelText: 'Отмена',
                onOk: async () => {
                  await patientService.togglePatientStatus(p.id);
                  showSuccess('Успешно', `Пациентка ${p.name} восстановлена`);
                  refresh();
                }
              });
            }}
            onDelete={(p) => {
              modal.confirm({
                title: 'Удалить пациентку?',
                content: `Вы точно хотите удалить пациента ${p.name}?`,
                okText: 'Удалить',
                cancelText: 'Отмена',
                okType: 'danger',
                onOk: async () => {
                  await patientService.deletePatient(p.id);
                  showSuccess('Успешно', `Пациентка ${p.name} удалена`);
                  refresh();
                }
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Archive;
