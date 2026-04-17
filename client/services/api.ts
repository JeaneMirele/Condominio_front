const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
import type {
  UsuarioDTO,
  UsuarioDTOResponse,
  LocalDTO,
  LocalDTOResponse,
  UnidadeDTO,
  UnidadeDTOResponse,
  ReservaDTO,
  ReservaDTOResponse,
  TokenResponseDTO,
  CadastroDTOResponse,
  EnderecoDTO,
  EnderecoDTOResponse,
  PrimeiroAcessoDTO
} from "@shared/api-types";

// ─── Session ───────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem("token");
}

function setSession(token: string, refreshToken: string, role: string, email: string) {
  localStorage.setItem("token", token);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("role", role);
  localStorage.setItem("email", email);
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("email");
}

export function getRole(): string | null {
  return localStorage.getItem("role");
}

export function getEmail(): string | null {
  return localStorage.getItem("email");
}

export function trocarRoleAtiva(role: string) {
  localStorage.setItem("role", role);
}

let refreshPromise: Promise<string | null> | null = null;

async function attemptRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      const jwtToken = localStorage.getItem("token");
      if (!refreshToken) throw new Error("No refresh token");
      
      const payload: TokenResponseDTO = {
        refreshToken,
        JwtToken: jwtToken ?? undefined
      };
      
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Refresh failed");
      
      const data: TokenResponseDTO = await res.json();
      
      if (data.JwtToken) {
        localStorage.setItem("token", data.JwtToken);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }
        return data.JwtToken;
      }
      return null;
    } catch (err) {
      // Só forçamos logout se o erro for explicitamente de autenticação (401/403)
      // ou se o refresh token for inválido. Erros de rede não devem deslogar.
      console.error("Erro no Refresh Token:", err);
      clearSession();
      window.location.href = "/"; 
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

// ─── HTTP helper ───────────────────────────────────────────────────────────

async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token = getToken();
  let headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Em caso de falha de token (401/403), tenta atualizar usando o endpoint de refresh
  if ((res.status === 401 || res.status === 403) && !path.includes("/auth/login") && !path.includes("/refresh")) {
    const newToken = await attemptRefresh();
    if (newToken) {
      // Repete a requisição com o novo Token recebido e válido
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const textData = await res.text();
    let errorData = null;
    try {
      errorData = textData ? JSON.parse(textData) : null;
    } catch {
      errorData = { message: textData };
    }
    const errorMessage = errorData?.message ?? errorData?.mensagem ?? `Erro ${res.status}`;
    const err: any = new Error(errorMessage);
    err.response = { status: res.status, data: errorData };
    throw err;
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }

  return res.text() as unknown as T;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export async function login(email: string, senha: string): Promise<{ roles: string[] }> {
  let data: TokenResponseDTO | undefined;
  
  // The first access or login might not return JSON properly if not standard, but let's assume it does.
  data = await http<TokenResponseDTO>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });

  if (!data?.JwtToken) {
    throw new Error("Token não recebido.");
  }

  const payload = JSON.parse(atob(data.JwtToken.split(".")[1]));
  const roles: string[] = payload.roles ?? payload.authorities ?? [];

  setSession(data.JwtToken, data.refreshToken ?? "", roles[0] ?? "MORADOR", email);

  return { roles };
}

export async function primeiroAcesso(email: string, senhaProvisoria: string, novaSenha: string) {
  const payload: PrimeiroAcessoDTO = { email, senhaProvisoria, novaSenha };
  return http("/auth/primeiro-acesso", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Usuários ──────────────────────────────────────────────────────────────

export async function getUsuarios(): Promise<UsuarioDTOResponse[]> {
  return http<UsuarioDTOResponse[]>("/usuarios");
}

export async function getMeuPerfil(): Promise<UsuarioDTOResponse> {
  const email = getEmail();
  return http<UsuarioDTOResponse>(`/usuarios/email/${email}`);
}

export async function criarUsuario(data: UsuarioDTO): Promise<CadastroDTOResponse> {
  return http<CadastroDTOResponse>("/usuarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function atualizarUsuario(id: number, data: UsuarioDTO): Promise<UsuarioDTOResponse> {
  return http<UsuarioDTOResponse>(`/usuarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletarUsuario(id: number): Promise<void> {
  return http<void>(`/usuarios/${id}`, { method: "DELETE" });
}

export async function uploadFotoPerfil(arquivo: File): Promise<UsuarioDTOResponse> {
  const form = new FormData();
  form.append("arquivo", arquivo);
  return http<UsuarioDTOResponse>("/usuarios/meu-perfil/foto", { method: "PATCH", body: form });
}

export async function alterarSenha(dados: any) {
  return http("/usuarios/alterar-senha", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

// ─── Locais ────────────────────────────────────────────────────────────────

export async function getLocais(): Promise<LocalDTOResponse[]> {
  return http<LocalDTOResponse[]>("/locais");
}

export async function getLocaisfiltroId(id: number): Promise<LocalDTOResponse[]> {
  return http<LocalDTOResponse[]>(`/locais/${id}`);
}

export async function criarLocal(data: LocalDTO): Promise<LocalDTOResponse> {
  return http<LocalDTOResponse>("/locais", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function atualizarLocal(id: number, data: LocalDTO): Promise<LocalDTOResponse> {
  return http<LocalDTOResponse>(`/locais/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletarLocal(id: number): Promise<void> {
  return http<void>(`/locais/${id}`, { method: "DELETE" });
}

export async function uploadFotoLocal(id: number, arquivo: File): Promise<LocalDTOResponse> {
  const form = new FormData();
  form.append("arquivo", arquivo);
  return http<LocalDTOResponse>(`/locais/${id}/foto`, { method: "PATCH", body: form });
}

// ─── Reservas ──────────────────────────────────────────────────────────────

export async function getReservas(): Promise<ReservaDTOResponse[]> {
  return http<ReservaDTOResponse[]>("/reservas");
}

export async function getReservasfiltroData(data: string): Promise<ReservaDTOResponse[]> {
  return http<ReservaDTOResponse[]>(`/reservas?data=${data}`);
}

export async function getReservasfiltroId(id: number): Promise<ReservaDTOResponse[]> {
  return http<ReservaDTOResponse[]>(`/reservas/${id}`);
}

export async function criarReserva(data: ReservaDTO): Promise<ReservaDTOResponse> {
  return http<ReservaDTOResponse>("/reservas", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function atualizarReserva(id: number, data: ReservaDTO): Promise<ReservaDTOResponse> {
  return http<ReservaDTOResponse>(`/reservas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletarReserva(id: number): Promise<ReservaDTOResponse> {
  return http<ReservaDTOResponse>(`/reservas/${id}`, { method: "DELETE" });
}

// ─── Unidades ──────────────────────────────────────────────────────────────

export async function getUnidades(): Promise<UnidadeDTOResponse[]> {
  return http<UnidadeDTOResponse[]>("/unidades");
}

export async function getUnidadeById(id: number): Promise<UnidadeDTOResponse> {
  return http<UnidadeDTOResponse>(`/unidades/${id}`);
}

export async function criarUnidade(data: UnidadeDTO): Promise<UnidadeDTOResponse> {
  return http<UnidadeDTOResponse>("/unidades", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function atualizarUnidade(id: number, data: UnidadeDTO): Promise<UnidadeDTOResponse> {
  return http<UnidadeDTOResponse>(`/unidades/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletarUnidade(id: number): Promise<void> {
  return http<void>(`/unidades/${id}`, { method: "DELETE" });
}
