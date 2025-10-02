import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Statistic, Tabs, Input, Button, Modal, Checkbox, Tooltip, Space, Dropdown, Menu } from 'antd';
import { CopyOutlined, CheckCircleFilled, SettingOutlined } from '@ant-design/icons';
import {
  UserOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  MedicineBoxOutlined,
  SearchOutlined,
  DownloadOutlined,
  PlusOutlined
} from '@ant-design/icons';
import PatientsTable from '../../../components/PatientsTable/PatientsTable';
import AllPatientsTable from '../../../components/AllPatientsTable/AllPatientsTable';
import PatientFormModal from '../../../components/PatientFormModal/PatientFormModal';
import { usePatientsTable } from '../../../hooks/usePatientsTable';
import { useAllPatients } from '../../../hooks/useAllPatients';
import { useUserStore } from '../../../store/userStore';
import useColumnVisibility from '../../../hooks/useColumnVisibility';
import useCheckboxState from '../../../hooks/useCheckboxState';
import styles from './Active.module.scss';
import * as XLSX from 'xlsx';
import { copyToClipboard } from '../../../utils/clipboard';

const ACTIVE_COLUMN_KEYS = [
  'patient',
  'room',
  'phone',
  'pregnancy',
  'fetusCount',
  'status',
  'prediction',
  'duration',
  'doctor',
  'medications',
  'metrics'
] as const;

const ALL_COLUMN_KEYS = [
  'name',
  'roomNumber',
  'phone',
  'pregnancyStartDate',
  'fetusCount',
  'doctorName',
  'actions'
] as const;

const ACTIVE_COLUMN_LABELS: Record<string, string> = {
  patient: 'Пациентка',
  room: 'Палата',
  phone: 'Номер телефона',
  pregnancy: 'Срок беременности',
  fetusCount: 'Кол-во плодов',
  status: 'Состояние',
  prediction: 'Прогноз',
  duration: 'Продолжительность сессии',
  doctor: 'Лечащий врач',
  medications: 'Препараты',
  metrics: 'Показатели'
};

const ALL_COLUMN_LABELS: Record<string, string> = {
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

const Active: React.FC = () => {
  const [modal, modalContextHolder] = Modal.useModal();
  const [currentTab, setCurrentTab] = useState<'active' | 'all'>('active');
  const { patients, loading, error, totalPatientsCount, reloadStats } = usePatientsTable();
  const [activeSearch, setActiveSearch] = useState('');
  const [debouncedActiveSearch, setDebouncedActiveSearch] = useState('');
  const { checked: onlyMineActive, setChecked: setOnlyMineActive } = useCheckboxState('onlyMineActive', false);
  const { checked: onlyMine, setChecked: setOnlyMine } = useCheckboxState('onlyMine', false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { user } = useUserStore();
  const [tokenPatientId, setTokenPatientId] = useState<string | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);

  const { visibleColumns: activeColumns, toggleColumn: toggleActiveColumn, resetColumns: resetActiveColumns } = useColumnVisibility('activePatientsColumns', ACTIVE_COLUMN_KEYS);
  const { visibleColumns: allColumns, toggleColumn: toggleAllColumn, resetColumns: resetAllColumns } = useColumnVisibility('allPatientsColumns', ALL_COLUMN_KEYS);
  const {
    patients: allPatients,
    loading: allLoading,
    error: allError,
    pagination: allPagination,
    search: allSearch,
    handleSearch,
    handleTableChange,
    refresh: refreshAllPatients,
    doctorMap
  } = useAllPatients({ enabled: currentTab === 'all', onlyMine });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedActiveSearch(activeSearch), 300);
    return () => clearTimeout(t);
  }, [activeSearch]);

  useEffect(() => {
    if (currentTab === 'all') {
      reloadStats();
    }
  }, [currentTab, reloadStats]);

  const stats = {
    total: totalPatientsCount,
    connected: patients.filter(p => p.status === 'started' && p.isActive).length,
    suspicious: patients.filter(p => p.status === 'started' && p.isActive && p.lastData && p.lastData.pathology).length,
    pathologies: patients.filter(p => p.status === 'started' && p.isActive && p.lastData && p.lastData.pathologies.length > 0).length
  };

  const exportAllPatientsXlsx = () => {
    const rows = allPatients.map(p => ({
      'Пациентка': p.name,
      'Палата': p.roomNumber,
      'Номер телефона': p.phone || '',
      'Дата начала беременности': p.pregnancyStartDate ? new Date(p.pregnancyStartDate).toLocaleDateString() : '',
      'Кол-во плодов': p.fetusCount,
      'Лечащий врач': doctorMap[p.doctorId] || `ID: ${p.doctorId}`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Все пациенты');
    const ts = new Date();
    const tsStr = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}-${String(ts.getMinutes()).padStart(2,'0')}`;
    XLSX.writeFile(workbook, `patients_all_${tsStr}.xlsx`);
  };

  const getColumnSettingsMenu = (isActive: boolean) => {
    const currentColumns = isActive ? activeColumns : allColumns;
    const toggleColumn = isActive ? toggleActiveColumn : toggleAllColumn;
    const resetColumns = isActive ? resetActiveColumns : resetAllColumns;
    const columnKeys = isActive ? ACTIVE_COLUMN_KEYS : ALL_COLUMN_KEYS;
    const columnLabels = isActive ? ACTIVE_COLUMN_LABELS : ALL_COLUMN_LABELS;

    return (
      <Menu>
        <Menu.Item key="reset" onClick={resetColumns}>
          Сбросить настройки
        </Menu.Item>
        <Menu.Divider />
        {columnKeys.map(columnKey => (
          <div key={columnKey} style={{ padding: '4px 12px' }}>
            <Checkbox
              checked={currentColumns[columnKey]}
              onChange={() => toggleColumn(columnKey)}
              onClick={(e) => e.stopPropagation()}
            >
              {columnLabels[columnKey]}
            </Checkbox>
          </div>
        ))}
      </Menu>
    );
  };

  const exportActivePatientsXlsx = () => {
    const filtered = patients
      .filter(p => p.status === 'started' && p.isActive)
      .filter(p => !onlyMineActive || !user?.id ? true : p.doctor.id === user.id)
      .filter(p => {
        if (!debouncedActiveSearch) return true;
        const q = debouncedActiveSearch.toLowerCase();
        const { name, roomNumber, phone } = p.patient;
        return (
          (name && name.toLowerCase().includes(q)) ||
          (roomNumber && String(roomNumber).toLowerCase().includes(q)) ||
          (phone && phone.toLowerCase().includes(q))
        );
      });

    const rows = filtered.map(p => ({
      'Пациентка': p.patient.name,
      'Палата': p.patient.roomNumber,
      'Номер телефона': p.patient.phone || '',
      'Срок беременности (нед.)': (() => {
        const start = p.patient.pregnancyStartDate ? new Date(p.patient.pregnancyStartDate) : null;
        if (!start) return '';
        const diffMs = Date.now() - start.getTime();
        const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
        return weeks;
      })(),
      'Кол-во плодов': p.patient.fetusCount,
      'Состояние': p.lastData?.pathology ? 'Патология' : 'Норма',
      'Продолж. сессии': (() => {
        const startTime = new Date(p.startTime);
        const durationMs = Date.now() - startTime.getTime();
        const minutes = Math.floor(durationMs / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;
      })(),
      'Лечащий врач': p.doctor.name,
      'FHR (уд/мин)': p.lastData ? p.lastData.fhr_bpm : '',
      'UC (мм рт.ст.)': p.lastData ? p.lastData.uc_mmHg : '',
      'Baseline (уд/мин)': p.lastData ? p.lastData.baseline_bpm : '',
      'Variability (уд/мин)': p.lastData ? p.lastData.variability_bpm : '',
      'Accel': p.lastData ? (p.lastData.accel ? 'Да' : 'Нет') : '',
      'Decel': p.lastData ? (p.lastData.decel ? 'Да' : 'Нет') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Подключены');
    const ts = new Date();
    const tsStr = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}-${String(ts.getMinutes()).padStart(2,'0')}`;
    XLSX.writeFile(workbook, `active_sessions_${tsStr}.xlsx`);
  };

  return (
    <div className={styles.container}>
      {modalContextHolder}
      <div className={styles.header}>
        <Title level={2}>Пациенты</Title>
        <Paragraph className={styles.subtitle}>
          Добавляйте пациентов и следите за их состоянием
        </Paragraph>
      </div>

      <div className={styles.stats}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Всего"
                value={stats.total}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Подключены"
                value={stats.connected}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Подозрительные"
                value={stats.suspicious}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={styles.statCard}>
              <Statistic
                title="Патологии"
                value={stats.pathologies}
                prefix={<MedicineBoxOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div className={styles.tabsSection}>
        <Tabs
          activeKey={currentTab}
          onChange={(key) => setCurrentTab(key as 'active' | 'all')}
          items={[
            {
              key: 'active',
              label: 'Подключены',
            },
            {
              key: 'all',
              label: 'Все пациенты',
            },
          ]}
        />

        <div className={styles.tabsContent}>
          <div className={styles.tabsHeader}>
            <div className={styles.tabsActionsLeft}>
              {currentTab === 'all' && (
                <>
                  <Search
                    placeholder="Поиск имени, палате или номеру телефона"
                    prefix={<SearchOutlined />}
                    className={styles.searchInput}
                    allowClear
                    value={allSearch}
                    onSearch={handleSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  <Checkbox checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)}>Только свои</Checkbox>
                </>
              )}
              {currentTab === 'active' && (
                <>
                  <Search
                    placeholder="Поиск имени, палате или номеру телефона"
                    prefix={<SearchOutlined />}
                    className={styles.searchInput}
                    allowClear
                    value={activeSearch}
                    onChange={(e) => setActiveSearch(e.target.value)}
                  />
                  <Checkbox checked={onlyMineActive} onChange={(e) => setOnlyMineActive(e.target.checked)}>Только свои</Checkbox>
                </>
              )}
            </div>
            <div className={styles.tabsActionsRight}>
              <Tooltip title="Скачать в xlsx">
                <Button
                  icon={<DownloadOutlined />}
                  className={styles.actionButton}
                  onClick={() => {
                    if (currentTab === 'all') exportAllPatientsXlsx();
                    if (currentTab === 'active') exportActivePatientsXlsx();
                  }}
                />
              </Tooltip>
              <Dropdown overlay={getColumnSettingsMenu(currentTab === 'active')} trigger={['click']} placement="bottomRight">
                <Button icon={<SettingOutlined />} className={styles.columnSettingsButton}>
                  Настройки
                </Button>
              </Dropdown>
              {currentTab === 'all' && (
                <Button type="primary" icon={<PlusOutlined />} className={styles.addButton} onClick={() => {
                  setEditingPatientId(null);
                  setIsCreateOpen(true);
                }}>
                  Добавить
                </Button>
              )}
            </div>
          </div>

          <div className={styles.tableContainer}>
            {currentTab === 'active' ? (
              <>
                {error && (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <Typography.Text type="danger">{error}</Typography.Text>
                  </div>
                )}
                <PatientsTable
                  data={patients
                    .filter(p => p.status === 'started' && p.isActive)
                    .filter(p => !onlyMineActive || !user?.id ? true : p.doctor.id === user.id)
                    .filter(p => {
                      if (!debouncedActiveSearch) return true;
                      const q = debouncedActiveSearch.toLowerCase();
                      const { name, roomNumber, phone } = p.patient;
                      return (
                        (name && name.toLowerCase().includes(q)) ||
                        (roomNumber && String(roomNumber).toLowerCase().includes(q)) ||
                        (phone && phone.toLowerCase().includes(q))
                      );
                    })}
                  loading={loading}
                  visibleColumns={activeColumns}
                  onRowClick={(row) => {
                    window.location.href = `/activeSession/${row.sessionId}`;
                  }}
                />
              </>
            ) : (
              <>
                {allError && (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <Typography.Text type="danger">{allError}</Typography.Text>
                  </div>
                )}
                <AllPatientsTable
                  data={allPatients}
                  loading={allLoading}
                  pagination={allPagination}
                  onTableChange={handleTableChange}
                  doctorMap={doctorMap}
                  visibleColumns={allColumns}
                  onEdit={(p) => {
                    setEditingPatientId(p.id);
                    setIsCreateOpen(true);
                  }}
                  onShowToken={async (p) => {
                    try {
                      const { patientService } = await import('../../../services/api');
                      const res = await patientService.getMonitoringToken(p.id);
                      setCreatedToken(res.monitoringToken);
                      setCopied(false);
                      setTokenPatientId(p.id);
                    } catch {
                      setCreatedToken('');
                    }
                  }}
                  onRowClick={(p) => {
                    window.location.href = `/patients/${p.id}`;
                  }}
                  onViewHistory={(p) => {
                    window.location.href = `/patients/${p.id}/session`;
                  }}
                  onArchive={(p) => {
                    modal.confirm({
                      title: 'Перенести в архив?',
                      content: `Вы уверены, что хотите перенести пациентку ${p.name} в архив?`,
                      okText: 'Архивировать',
                      cancelText: 'Отмена',
                      okType: 'primary',
                      onOk: async () => {
                        try {
                          const { patientService } = await import('../../../services/api');
                          const res = await patientService.togglePatientStatus(p.id);
                          const { showSuccess } = await import('../../../services/notificationService');
                          showSuccess('Успешно', `Пациентка ${res.patient.name} перенесена в архив`);
                          await refreshAllPatients();
                          await reloadStats();
                        } catch {
                          // ignore
                        }
                      }
                    });
                  }}
                />
                <PatientFormModal
                  open={isCreateOpen}
                  onClose={() => {
                    setIsCreateOpen(false);
                    setEditingPatientId(null);
                  }}
                  initialValues={editingPatientId ? allPatients.find(p => p.id === editingPatientId) : undefined}
                  onSuccess={(result) => {
                    setIsCreateOpen(false);
                    setEditingPatientId(null);
                    reloadStats();
                    refreshAllPatients();
                    if (result?.monitoringToken) {
                      setCreatedToken(result.monitoringToken);
                      setCopied(false);
                    }
                  }}
                />
                <Modal
                  open={!!createdToken}
                  onCancel={() => { setCreatedToken(null); setCopied(false); }}
                  footer={null}
                  title="Токен для мониторинга"
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      Используйте данный токен при начале сессии на фетальном мониторе
                    </Typography.Paragraph>
                    <Input
                      value={createdToken || ''}
                      readOnly
                      suffix={
                        <Button
                          type="text"
                          icon={copied ? <CheckCircleFilled style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                          onClick={async () => {
                            if (createdToken) {
                              const success = await copyToClipboard(createdToken);
                              if (success) {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              } else {
                                alert(`Не удалось скопировать автоматически. Токен: ${createdToken}`);
                              }
                            }
                          }}
                        />
                      }
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        danger
                        onClick={() => {
                          if (!tokenPatientId) return;
                          modal.confirm({
                            title: 'Сгенерировать новый токен?',
                            content: 'Предыдущий токен станет недействительным. Вы уверены?',
                            okText: 'Сгенерировать',
                            cancelText: 'Отмена',
                            okType: 'primary',
                            onOk: async () => {
                              try {
                                const { patientService } = await import('../../../services/api');
                                const res = await patientService.generateMonitoringToken(tokenPatientId);
                                setCreatedToken(res.monitoringToken);
                                setCopied(false);
                                const { showSuccess } = await import('../../../services/notificationService');
                                showSuccess('Успешно', 'Новый токен успешно сгенерирован');
                              } catch {
                                // ignore
                              }
                            }
                          });
                        }}
                      >
                        Сгенерировать новый токен
                      </Button>
                    </div>
                  </Space>
                </Modal>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Active;
