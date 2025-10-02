export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    login: string;
  };
}
