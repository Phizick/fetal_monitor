import { useCallback, useEffect, useState } from 'react';
import type { TablePaginationConfig } from 'antd/es/table/interface';
import type { SorterResult, FilterValue } from 'antd/es/table/interface';
import { userService } from '../services/api';
import type { User } from '../types';

export const useDoctors = () => {
  const [doctors, setDoctors] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const loadDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await userService.getUsers({ page: pagination.current, limit: pagination.pageSize });
      const filtered = debouncedSearch
        ? res.users.filter(u => (u.name || '').toLowerCase().includes(debouncedSearch.toLowerCase()))
        : res.users;
      setDoctors(filtered);
      setPagination(prev => ({ ...prev, total: res.total }));
    } catch (e) {
      setError(`Ошибка загрузки пользователей: ${e}`);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, debouncedSearch, sortBy, sortOrder]);

  const handleSearch = useCallback((value: string) => setSearch(value), []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleTableChange = useCallback((
    nextPagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>,
    sorter: SorterResult<User> | SorterResult<User>[]
  ) => {
    const sort = Array.isArray(sorter) ? sorter[0] : sorter;
    if (sort && sort.field) {
      const apiField = String(sort.field);
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

  useEffect(() => { loadDoctors(); }, [loadDoctors]);

  return { doctors, loading, error, pagination, search, handleSearch, handleTableChange };
};


