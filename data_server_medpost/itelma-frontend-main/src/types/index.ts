// Auth types
export * from './auth';

// User types
export * from './user';

// Patient types
export * from './patient';

// Monitoring types
export * from './monitoring';

// WebSocket types
export * from './websocket';

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


// Common types
export interface SelectOption {
  value: string | number;
  label: string;
}

export interface TableColumn {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  sorter?: boolean;
  filterable?: boolean;
}
