export interface LoginRequestDTO {
  login: string;
  password: string;
}

export interface RegisterRequestDTO extends LoginRequestDTO {
  name: string;
}

export interface LoginResponseDTO {
  access_token: string;
}
