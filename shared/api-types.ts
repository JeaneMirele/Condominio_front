export type Role = "MORADOR" | "SINDICO" | "GERENTE";

export interface EnderecoDTO {
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  numero?: string;
}

export interface EnderecoDTOResponse extends EnderecoDTO {
  id?: number;
}

export interface UnidadeDTO {
  bloco?: string;
  apartamento?: string;
  moradores?: UsuarioDTO[];
}

export interface UnidadeDTOResponse {
  id?: number;
  bloco?: string;
  apartamento?: string;
  moradores?: any[];
}

export interface UsuarioDTO {
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  endereco?: EnderecoDTOResponse;
  id_unidade?: number;
  roles: Role[];
}

export interface UsuarioDTOResponse {
  id?: number;
  nome?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  endereco?: EnderecoDTOResponse;
  unidade?: UnidadeDTOResponse;
  foto?: string;
  roles?: Role[];
  senha?: string;
  precisaTrocarSenha?: boolean;
}

export interface CadastroDTOResponse {
  id?: number;
  nome?: string;
  email?: string;
  senha?: string;
  cpf?: string;
  telefone?: string;
  precisaTrocarSenha?: boolean;
  roles?: Role[];
}

export interface LocalDTO {
  nome?: string;
  capacidade?: number;
  duracao?: string;
  taxaReserva?: number;
  horarioInicio?: string;
  horarioFim?: string;
  localizacao?: string;
}

export interface LocalDTOResponse extends LocalDTO {
  id?: number;
  fotoUrl?: string;
}

export type ReservaStatus = "APROVADA" | "PENDENTE" | "CANCELADA";

export interface ReservaDTO {
  id_local?: number;
  horaEntrada?: string;
  horaSaida?: string;
  data?: string;
  id_morador?: number;
}

export interface ReservaDTOResponse {
  id?: number;
  local?: LocalDTOResponse;
  horaEntrada?: string;
  horaSaida?: string;
  data?: string;
  morador?: UsuarioDTOResponse;
  status?: ReservaStatus;
}

export interface AlterarSenhaDTO {
  senhaAtual: string;
  novaSenha: string;
}

export interface TokenResponseDTO {
  JwtToken?: string;
  refreshToken?: string;
  tipo?: string;
}

export interface PrimeiroAcessoDTO {
  email: string;
  senhaProvisoria: string;
  novaSenha: string;
}

export interface LoginDTO {
  email?: string;
  senha?: string;
}
