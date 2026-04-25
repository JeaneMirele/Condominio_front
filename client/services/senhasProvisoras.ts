/**
 * Utilitário para persistir senhas provisórias geradas no cadastro de usuários.
 * As senhas são salvas no localStorage e removidas automaticamente quando o
 * usuário realiza o primeiro acesso e troca a senha.
 */

const STORAGE_KEY = "senhas_provisoras";

export type SenhasMap = Record<number, string>; // { userId: senha }

export function getSenhasProvisoras(): SenhasMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function salvarSenhaProvisora(userId: number, senha: string): void {
  const map = getSenhasProvisoras();
  map[userId] = senha;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function removerSenhaProvisora(userId: number): void {
  const map = getSenhasProvisoras();
  delete map[userId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/**
 * Recebe a lista de usuários do backend e remove do localStorage
 * as senhas de usuários que já realizaram o primeiro acesso.
 */
export function sincronizarSenhas(usuarios: { id?: number; precisaTrocarSenha?: boolean }[]): void {
  const map = getSenhasProvisoras();
  let changed = false;
  for (const u of usuarios) {
    if (u.id && u.id in map && u.precisaTrocarSenha === false) {
      delete map[u.id];
      changed = true;
    }
  }
  if (changed) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }
}
