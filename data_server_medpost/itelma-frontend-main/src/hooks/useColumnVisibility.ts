import { useState } from 'react';

interface ColumnVisibility {
  [key: string]: boolean;
}

const useColumnVisibility = (storageKey: string, defaultColumns: readonly string[]) => {
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const result: ColumnVisibility = {};
        defaultColumns.forEach(col => {
          result[col] = parsed[col] !== undefined ? parsed[col] : true;
        });
        return result;
      }
    } catch (error) {
      console.warn('Failed to parse column visibility from localStorage:', error);
    }

    const defaultVisibility: ColumnVisibility = {};
    defaultColumns.forEach(col => {
      defaultVisibility[col] = true;
    });
    return defaultVisibility;
  });

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newVisibility = {
        ...prev,
        [columnKey]: !prev[columnKey]
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(newVisibility));
      } catch (error) {
        console.warn('Failed to save column visibility to localStorage:', error);
      }

      return newVisibility;
    });
  };

  const resetColumns = () => {
    const defaultVisibility: ColumnVisibility = {};
    defaultColumns.forEach(col => {
      defaultVisibility[col] = true;
    });

    setVisibleColumns(defaultVisibility);

    try {
      localStorage.setItem(storageKey, JSON.stringify(defaultVisibility));
    } catch (error) {
      console.warn('Failed to reset column visibility in localStorage:', error);
    }
  };

  return {
    visibleColumns,
    toggleColumn,
    resetColumns
  };
};

export default useColumnVisibility;
