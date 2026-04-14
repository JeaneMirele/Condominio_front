import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { login, primeiroAcesso, trocarRoleAtiva } from "@/services/api";

const ROLE_CONFIG: Record<string, { label: string; icon: JSX.Element; route: string; description: string }> = {
  SINDICO: {
    label: "Síndico",
    route: "/owner",
    description: "Administração de Reservas, Áreas, Síndicos e Gerentes",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  GERENTE: {
    label: "Gerente",
    route: "/manager",
    description: "Gestão de Moradores e Unidades",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  MORADOR: {
    label: "Morador",
    route: "/resident",
    description: "Reservas e Área do Morador",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
};

export default function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [precisaTrocar, setPrecisaTrocar] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmNovaSenha, setConfirmNovaSenha] = useState("");

  const [rolesDisponiveis, setRolesDisponiveis] = useState<string[]>([]);

  function redirecionarPorRole(role: string) {
    const config = ROLE_CONFIG[role];
    if (config) navigate(config.route);
    else navigate("/resident");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!email || !password) {
        setError("Por favor preencha todos os campos");
        setIsLoading(false);
        return;
      }

      const { roles } = await login(email, password);

      if (roles.length > 1) {
        setRolesDisponiveis(roles);
      } else {
        redirecionarPorRole(roles[0] ?? "MORADOR");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "";
      if (msg.includes("TROCA_SENHA_OBRIGATORIA") || err.response?.status === 403) {
        setPrecisaTrocar(true);
      } else {
        setError("Email ou senha inválidos.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrimeiroAcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (novaSenha !== confirmNovaSenha) {
      setError("As senhas não coincidem.");
      return;
    }
    if (novaSenha.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      await primeiroAcesso(email, password, novaSenha);
      
      const { roles } = await login(email, novaSenha);
      if (roles.length > 1) {
        setRolesDisponiveis(roles);
        setPrecisaTrocar(false);
      } else {
        redirecionarPorRole(roles[0] ?? "MORADOR");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao trocar a senha.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscolherPerfil = (role: string) => {
    trocarRoleAtiva(role);
    redirecionarPorRole(role);
  };

  const getTitle = () => {
    if (rolesDisponiveis.length > 0) return "Escolha seu Perfil";
    if (precisaTrocar) return "Primeiro Acesso";
    return "Bem-vindo de Volta";
  };

  const getSubtitle = () => {
    if (rolesDisponiveis.length > 0) return "Com qual perfil deseja entrar hoje?";
    if (precisaTrocar) return "Atualize suas credenciais de acesso";
    return "Faça login no portal da comunidade";
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden sm:py-0 sm:px-6"
      style={{
        backgroundImage: "url('https://images.pexels.com/photos/35877516/pexels-photo-35877516.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6 sm:mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-accent rounded-lg mb-3 sm:mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.581m0 0H9m5.581 0m0 0H7m5.581 0v-5.5c0-.465-.122-.883-.35-1.5M7 10.5v5.5m0 0H4.581m0 0H2m2.581 0v-5.5c0-.465.122-.883.35-1.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 sm:text-4xl sm:mb-2">
            {getTitle()}
          </h1>
          <p className="text-gray-100 text-xs sm:text-base">
            {getSubtitle()}
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-2xl shadow-lg border border-gray-200 p-5 sm:p-8">

          {rolesDisponiveis.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 text-center mb-4">
                Logado como <strong className="text-gray-800">{email}</strong>
              </p>
              {rolesDisponiveis.map((role) => {
                const config = ROLE_CONFIG[role] ?? {
                  label: role,
                  description: "",
                  icon: null,
                  route: "/resident",
                };
                return (
                  <button
                    key={role}
                    onClick={() => handleEscolherPerfil(role)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-accent hover:bg-accent/5 transition-all text-left group"
                  >
                    <div className="text-gray-400 group-hover:text-accent transition-colors">
                      {config.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 group-hover:text-accent transition-colors">
                        {config.label}
                      </p>
                      <p className="text-xs text-gray-500">{config.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-accent ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
              <button
                onClick={() => { setRolesDisponiveis([]); setEmail(""); setPassword(""); }}
                className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Entrar com outra conta
              </button>
            </div>

          ) : precisaTrocar ? (
            <form onSubmit={handlePrimeiroAcesso} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 sm:text-sm">
                  Confirmar Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm focus:outline-none cursor-not-allowed"
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 sm:text-sm">
                  Senha Provisória
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-accent outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700 sm:text-sm">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700 sm:text-sm">
                    Confirmar Nova
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmNovaSenha}
                    onChange={(e) => setConfirmNovaSenha(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-accent outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setPrecisaTrocar(false)}
                  className="flex-1 h-12 text-sm"
                >
                  Voltar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-[2] h-12 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg text-sm"
                >
                  {isLoading ? "Salvando..." : "Atualizar e Entrar"}
                </Button>
              </div>
            </form>

          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-2 sm:text-sm">
                  Endereço de Email
                </label>
                <input
                  id="email" type="email" placeholder="usuario@sistema.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-3 sm:px-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all disabled:opacity-50 text-sm sm:text-base"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-2 sm:text-sm">
                  Senha
                </label>
                <input
                  id="password" type="password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-3 sm:px-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all disabled:opacity-50 text-sm sm:text-base"
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 sm:text-sm">{error}</p>
                </div>
              )}
              <Button type="submit" disabled={isLoading}
                className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition-all text-sm sm:text-base">
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          )}

          <div className="mt-5 pt-5 border-t border-gray-100 text-center sm:mt-8 sm:pt-8">
            <p className="text-xs text-gray-600">
              Precisa de Ajuda?{" "}
              <a href="#" className="text-accent hover:text-accent/80 font-medium transition-colors">
                Falar com suporte.
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-200 mt-4 sm:mt-8">
          &copy; {new Date().getFullYear()} Portal da Comunidade. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}