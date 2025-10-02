import { useState, useEffect, useCallback } from 'react';
import type { TablePaginationConfig } from 'antd/es/table/interface';
import type { SorterResult, FilterValue } from 'antd/es/table/interface';
import { patientService, userService } from '../services/api';
import { useUserStore } from '../store/userStore';
import type { PatientWithId, User } from '../types';

interface UseArchivePatientsOptions {
  enabled?: boolean;
  onlyMine?: boolean;
}

export const useArchivePatients = (options?: UseArchivePatientsOptions) => {
  const enabled = options?.enabled ?? true;
  const onlyMine = options?.onlyMine ?? false;
  const [patients, setPatients] = useState<PatientWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [doctorMap, setDoctorMap] = useState<Record<number, string>>({});
  const { user } = useUserStore.getState();

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await patientService.getArchivePatients({
        page: pagination.current,
        limit: pagination.pageSize,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
        doctorId: onlyMine && user ? user.id : undefined,
      });
      setPatients(response.patients);
      setPagination(prev => ({ ...prev, total: response.total }));
    } catch (err) {
      console.error('Error loading archive patients:', err);
      setError(`Ошибка загрузки пациентов: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, debouncedSearch, sortBy, sortOrder, onlyMine, user]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleTableChange = useCallback((
    nextPagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>,
    sorter: SorterResult<PatientWithId> | SorterResult<PatientWithId>[]
  ) => {
    const sort = Array.isArray(sorter) ? sorter[0] : sorter;
    if (sort && sort.field) {
      const fieldMapping: Record<string, string> = {
        name: 'name',
        roomNumber: 'roomNumber',
        phone: 'phone',
        pregnancyStartDate: 'pregnancyStartDate',
        fetusCount: 'fetusCount',
        doctorId: 'doctorId',
      };
      const apiField = fieldMapping[String(sort.field)] || String(sort.field);
      setSortBy(apiField);
      setSortOrder(sort.order === 'ascend' ? 'ASC' : 'DESC');
    }
    if (nextPagination) {
      setPagination(prev => ({
        ...prev,
        current: nextPagination.current || 1,
        pageSize: nextPagination.pageSize || prev.pageSize,
      }));
    }
  }, []);

  const loadDoctors = useCallback(async () => {
    try {
      const resp = await userService.getUsers({ page: 1, limit: 1000 });
      const map: Record<number, string> = {};
      resp.users.forEach((u: User) => { map[u.id] = u.name || u.login; });
      setDoctorMap(map);
    } catch {}
  }, []);

  useEffect(() => { if (enabled) loadDoctors(); }, [enabled, loadDoctors]);
  useEffect(() => { if (enabled) loadPatients(); }, [enabled, loadPatients]);

  const refresh = useCallback(() => { loadPatients(); }, [loadPatients]);

  return { patients, loading, error, pagination, search, handleSearch, handleTableChange, refresh, doctorMap };
};


