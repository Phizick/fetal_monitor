import { useState, useEffect, useCallback } from 'react';
import type { TablePaginationConfig } from 'antd/es/table/interface';
import type { SorterResult, FilterValue } from 'antd/es/table/interface';
import { patientService, userService } from '../services/api';
import { useUserStore } from '../store/userStore';
import type { PatientWithId } from '../types';

interface UseAllPatientsOptions {
  enabled?: boolean;
  onlyMine?: boolean;
}

export const useAllPatients = (options?: UseAllPatientsOptions) => {
  const enabled = options?.enabled ?? true;
  const onlyMine = options?.onlyMine ?? false;
  const [patients, setPatients] = useState<PatientWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const currentPage = pagination.current;
  const pageSize = pagination.pageSize;
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

      const response = await patientService.getPatients({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
        doctorId: onlyMine && user ? user.id : undefined,
      });

      setPatients(response.patients);
      setPagination(prev => ({
        ...prev,
        total: response.total,
      }));

    } catch (err) {
      console.error('Error loading patients:', err);
      setError(`Ошибка загрузки пациентов: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, sortBy, sortOrder, onlyMine, user]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleTableChange = useCallback((
    nextPagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>,
    sorter: SorterResult<PatientWithId> | SorterResult<PatientWithId>[]
  ) => {
    const sort = Array.isArray(sorter) ? sorter[0] : sorter;
    if (sort && sort.field) {
      const fieldMapping: Record<string, string> = {
        'name': 'name',
        'roomNumber': 'roomNumber',
        'phone': 'phone',
        'pregnancyStartDate': 'pregnancyStartDate',
        'fetusCount': 'fetusCount',
        'doctorId': 'doctorId'
      };

      const apiField = fieldMapping[String(sort.field)] || String(sort.field);
      setSortBy(apiField);
      setSortOrder(sort.order === 'ascend' ? 'ASC' : 'DESC');
    }

    if (nextPagination) {
      setPagination(prev => ({
        ...prev,
        current: nextPagination.current || 1,
        pageSize: nextPagination.pageSize || prev.pageSize
      }));
    }
  }, []);

  const refresh = useCallback(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (!enabled) return;
    loadPatients();
  }, [loadPatients, enabled]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!enabled || patients.length === 0) return;
    const uniqueIds = Array.from(new Set(patients.map(p => p.doctorId)));
    const missing = uniqueIds.filter(id => doctorMap[id] === undefined);
    if (missing.length === 0) return;
    missing.forEach(async (id) => {
      try {
        const u = await userService.getUser(id);
        setDoctorMap(prev => ({ ...prev, [id]: u.name || u.login }));
      } catch {
        // ignore single failures
      }
    });
  }, [enabled, patients, doctorMap]);

  return {
    patients,
    loading,
    error,
    pagination,
    search,
    sortBy,
    sortOrder,
    handleSearch,
    handleTableChange,
    refresh,
    doctorMap
  };
};
