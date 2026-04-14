import { apiClient } from "./api-client";
import {
  UsuarioDTO,
  UsuarioDTOResponse,
  UnidadeDTO,
  UnidadeDTOResponse,
  ReservaDTO,
  ReservaDTOResponse,
  LocalDTO,
  LocalDTOResponse,
  EnderecoDTO,
  EnderecoDTOResponse,
  CadastroDTOResponse,
  AlterarSenhaDTO,
  TokenResponseDTO,
  PrimeiroAcessoDTO,
  LoginDTO,
} from "@shared/api-types";

export const AuthService = {
  login: (data: LoginDTO) => apiClient.post<{ message?: string } | any>("/auth/login", data),
  refresh: (data: TokenResponseDTO) => apiClient.post<TokenResponseDTO>("/auth/refresh", data),
  primeiroAcesso: (data: PrimeiroAcessoDTO) => apiClient.post<{ message?: string } | any>("/auth/primeiro-acesso", data),
};

export const UsuarioService = {
  findAll: () => apiClient.get<UsuarioDTOResponse[]>("/usuarios"),
  create: (data: UsuarioDTO) => apiClient.post<CadastroDTOResponse>("/usuarios", data),
  findById: (id: number) => apiClient.get<UsuarioDTOResponse>(`/usuarios/${id}`),
  update: (id: number, data: UsuarioDTO) => apiClient.put<UsuarioDTOResponse>(`/usuarios/${id}`, data),
  delete: (id: number) => apiClient.delete<{ message?: string } | any>(`/usuarios/${id}`),
  alterarSenha: (data: AlterarSenhaDTO) => apiClient.post<{ message?: string } | any>("/usuarios/alterar-senha", data),
  findByEmail: (email: string) => apiClient.get<UsuarioDTOResponse>(`/usuarios/email/${email}`),
  atualizarMinhaFoto: (formData: FormData) => apiClient.patch<UsuarioDTOResponse>("/usuarios/meu-perfil/foto", formData),
};

export const UnidadeService = {
  findAll: () => apiClient.get<UnidadeDTOResponse[]>("/unidades"),
  create: (data: UnidadeDTO) => apiClient.post<UnidadeDTOResponse>("/unidades", data),
  findById: (id: number) => apiClient.get<UnidadeDTOResponse>(`/unidades/${id}`),
  update: (id: number, data: UnidadeDTO) => apiClient.put<UnidadeDTOResponse>(`/unidades/${id}`, data),
  delete: (id: number) => apiClient.delete<{ message?: string } | any>(`/unidades/${id}`),
};

export const ReservaService = {
  findAll: (data: string) => apiClient.get<ReservaDTOResponse[]>(`/reservas?data=${data}`),
  create: (data: ReservaDTO) => apiClient.post<ReservaDTOResponse>("/reservas", data),
  findById: (id: number) => apiClient.get<ReservaDTOResponse>(`/reservas/${id}`),
  update: (id: number, data: ReservaDTO) => apiClient.put<ReservaDTOResponse>(`/reservas/${id}`, data),
  cancelar: (id: number) => apiClient.delete<ReservaDTOResponse>(`/reservas/${id}`),
};

export const LocalService = {
  findAll: () => apiClient.get<LocalDTOResponse[]>("/locais"),
  create: (data: LocalDTO) => apiClient.post<LocalDTOResponse>("/locais", data),
  findById: (id: number) => apiClient.get<LocalDTOResponse>(`/locais/${id}`),
  update: (id: number, data: LocalDTO) => apiClient.put<LocalDTOResponse>(`/locais/${id}`, data),
  delete: (id: number) => apiClient.delete<{ message?: string } | any>(`/locais/${id}`),
  atualizarFotoLocal: (id: number, formData: FormData) => apiClient.patch<LocalDTOResponse>(`/locais/${id}/foto`, formData),
};

export const EnderecoService = {
  findAll: () => apiClient.get<EnderecoDTOResponse[]>("/enderecos"),
  create: (data: EnderecoDTO) => apiClient.post<EnderecoDTOResponse>("/enderecos", data),
  findById: (id: number) => apiClient.get<EnderecoDTOResponse>(`/enderecos/${id}`),
  update: (id: number, data: EnderecoDTO) => apiClient.put<EnderecoDTOResponse>(`/enderecos/${id}`, data),
  delete: (id: number) => apiClient.delete<{ message?: string } | any>(`/enderecos/${id}`),
};

export const ArquivoService = {
  servirArquivo: (nomeArquivo: string) => apiClient.get<Blob>(`/arquivos/${nomeArquivo}`),
};
