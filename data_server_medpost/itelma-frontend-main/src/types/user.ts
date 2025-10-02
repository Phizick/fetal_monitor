export interface User {
  id: number;
  createdAt: string;
  updatedAt: string;
  login: string;
  name: string;
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}
