import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getUnidades,
  criarUnidade,
  atualizarUnidade,
  deletarUnidade,
  getUsuarios,
  criarUsuario,
  atualizarUsuario,
  deletarUsuario,
  getMeuPerfil,
  uploadFotoPerfil,
  alterarSenha,
  clearSession,
  BASE_URL
} from "@/services/api";
import { Users, Clock, Settings, LogOut, Menu, X, Camera, User, LayoutDashboard, Home, Building2, UserCheck, ShieldAlert } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import type {
  UnidadeDTOResponse,
  UsuarioDTOResponse
} from "@/services/types";

export default function ManagerHome() {
  const navigate = useNavigate();

  // ─── ESTADOS ──────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioDTOResponse | null>(null);

  const [unidades, setUnidades] = useState<UnidadeDTOResponse[]>([]);
  const [moradores, setMoradores] = useState<UsuarioDTOResponse[]>([]);

  type ActiveTab = "overview" | "units" | "residents" | "perfil";
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [selectedUnidade, setSelectedUnidade] = useState<UnidadeDTOResponse | null>(null);

  // ─── MENUS E MODAIS ──────────────────────────────────
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showEditUnitModal, setShowEditUnitModal] = useState(false);
  const [showDeleteUnitModal, setShowDeleteUnitModal] = useState(false);

  const [showAddResidentModal, setShowAddResidentModal] = useState(false);
  const [showEditResidentModal, setShowEditResidentModal] = useState(false);
  const [showDeleteResidentModal, setShowDeleteResidentModal] = useState(false);

  const [selectedResident, setSelectedResident] = useState<UsuarioDTOResponse | null>(null);
  const [showConfirmMoveModal, setShowConfirmMoveModal] = useState(false);
  const [residentToMove, setResidentToMove] = useState<UsuarioDTOResponse | null>(null);
  const [senhaGerada, setSenhaGerada] = useState("");

  // ─── FORMULÁRIOS ─────────────────────────────────────
  // Perfil Gerente
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ nome: "", email: "", telefone: "" });
  const [passwordForm, setPasswordForm] = useState({ atual: "", nova: "", confirmacao: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // Unidade
  const [unitFormData, setUnitFormData] = useState({ bloco: "", apartamento: "" });

  // Morador
  const [residentFormData, setResidentFormData] = useState({
    nome: "", email: "", cpf: "", telefone: "", id_unidade: ""
  });

  // Sorting state
  const [residentSortBy, setResidentSortBy] = useState<"name" | "email">("name");

  const [searchTerm, setSearchTerm] = useState("");
  // Helper Errors
  const [actionError, setActionError] = useState("");

  // ─── CARREGAMENTO INICIAL ────────────────────────────
  useEffect(() => {
    carregarTudo();
  }, []);

  useEffect(() => {
    if (activeTab === "perfil" && usuarioLogado) {
      setEditProfileForm({
        nome: usuarioLogado.nome || "",
        email: usuarioLogado.email || "",
        telefone: usuarioLogado.telefone || ""
      });
      setActionError("");
    }
  }, [activeTab, usuarioLogado]);

  async function carregarTudo() {
    setLoading(true);
    try {
      const [perfil, resUnidades, resUsuarios] = await Promise.all([
        getMeuPerfil(),
        getUnidades(),
        getUsuarios()
      ]);
      setUsuarioLogado(perfil);
      setUnidades(resUnidades || []);

      // Filtramos apenas as roles MORADOR e gerenciados pela unidade
      setMoradores(resUsuarios?.filter((u) => u.roles?.some(r => r.toUpperCase().includes("MORADOR"))) || []);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  // ─── HELPERS ─────────────────────────────────────────

  const handleSignOut = () => {
    clearSession();
    navigate("/");
  };

  const getMoradoresPorUnidade = (unidadeId: number) => {
    return moradores.filter((m) => m.unidade?.id === unidadeId);
  };

  const sortResidents = (list: UsuarioDTOResponse[], sortBy: "name" | "email") => {
    return [...list].sort((a, b) => {
      if (sortBy === "name") return (a.nome || "").localeCompare(b.nome || "");
      return (a.email || "").localeCompare(b.email || "");
    });
  };

  const NavItem = ({ id, label, icon: Icon }: { id: ActiveTab, label: string, icon: any }) => (
    <button
      onClick={() => { setActiveTab(id); setShowSidebar(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === id
        ? "bg-accent text-white shadow-lg shadow-accent/20 font-bold"
        : "text-gray-500 hover:bg-gray-100 font-medium"
        }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  // ─── PERFIL DO GERENTE ───────────────────────────────

  async function handleTrocarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }
    setUploadingFoto(true);
    try {
      await uploadFotoPerfil(arquivo);
      toast.success("Foto do gerente atualizada!");
      await carregarTudo();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar foto.");
    } finally {
      setUploadingFoto(false);
    }
  }

  function openEditProfile() {
    setEditProfileForm({
      nome: usuarioLogado?.nome || "",
      email: usuarioLogado?.email || "",
      telefone: usuarioLogado?.telefone || ""
    });
    setActionError("");
    setShowEditProfileModal(true);
    setShowProfileMenu(false);
  }

  async function handleSalvarPerfil() {
    if (!usuarioLogado?.id) return;
    setSavingProfile(true);
    setActionError("");
    try {
      // 1. Validar troca de senha if filled
      const trocandoSenha = passwordForm.nova || passwordForm.atual || passwordForm.confirmacao;
      if (trocandoSenha) {
        if (!passwordForm.atual) throw new Error("Informe a senha atual para prosseguir.");
        if (passwordForm.nova.length < 6) throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
        if (passwordForm.nova !== passwordForm.confirmacao) throw new Error("As novas senhas não coincidem.");
      }

      const cleanTelefone = editProfileForm.telefone.replace(/\D/g, "");
      // 2. Atualizar Perfil
      const payload = {
        nome: editProfileForm.nome.trim(),
        email: editProfileForm.email.trim(),
        cpf: usuarioLogado.cpf,
        telefone: cleanTelefone || undefined,
        roles: usuarioLogado.roles || ["GERENTE"]
      };
      await atualizarUsuario(usuarioLogado.id, payload);

      // 3. Atualizar Senha
      if (trocandoSenha) {
        await alterarSenha({
          senhaAtual: passwordForm.atual,
          novaSenha: passwordForm.nova
        });
        setPasswordForm({ atual: "", nova: "", confirmacao: "" });
      }

      toast.success("Perfil e segurança atualizados!");
      carregarTudo();
    } catch (err: any) {
      setActionError(err.message || "Erro ao salvar alterações.");
    } finally {
      setSavingProfile(false);
    }
  }

  // ─── UNIDADES CRUD ───────────────────────────────────

  async function handleAddUnidade() {
    setActionError("");
    if (!unitFormData.bloco || !unitFormData.apartamento) {
      setActionError("Preencha o Bloco e o Apartamento."); return;
    }
    try {
      await criarUnidade({
        bloco: unitFormData.bloco,
        apartamento: unitFormData.apartamento
      });
      toast.success("Unidade criada com sucesso!");
      setShowAddUnitModal(false);
      setUnitFormData({ bloco: "", apartamento: "" });
      carregarTudo();
    } catch (err: any) {
      setActionError(err.message || "Erro ao criar Unidade.");
    }
  }

  async function handleEditUnidade() {
    if (!selectedUnidade?.id) return;
    setActionError("");
    try {
      await atualizarUnidade(selectedUnidade.id, {
        bloco: unitFormData.bloco,
        apartamento: unitFormData.apartamento
      });
      toast.success("Unidade atualizada!");
      setShowEditUnitModal(false);
      carregarTudo();
      setSelectedUnidade(null);
    } catch (err: any) {
      setActionError(err.message || "Erro ao editar Unidade.");
    }
  }

  async function handleDeleteUnidade() {
    if (!selectedUnidade?.id) return;
    try {
      const idToDelete = selectedUnidade.id;
      const moradoresNaUnidade = moradores.filter(m => m.unidade?.id === idToDelete);

      if (moradoresNaUnidade.length > 0) {
        await Promise.all(moradoresNaUnidade.map(m =>
          atualizarUsuario(m.id, {
            nome: m.nome || "", email: m.email || "", cpf: m.cpf, telefone: m.telefone,
            id_unidade: undefined as any, roles: m.roles || ["MORADOR"]
          })
        ));
      }

      await deletarUnidade(idToDelete);
      toast.success("Unidade removida com sucesso.");
      setShowDeleteUnitModal(false);
      setSelectedUnidade(null);
      await carregarTudo();
    } catch (err: any) {
      toast.error(err.message || "Falha ao deletar unidade.");
    }
  }

  // ─── MORADORES CRUD ──────────────────────────────────

  async function handleAddResident() {
    setActionError("");
    const tIdUnidade = parseInt(residentFormData.id_unidade);

    if (!residentFormData.nome || !residentFormData.email || !residentFormData.cpf || !tIdUnidade) {
      setActionError("Preencha Nome, Email, CPF e assegure-se de selecionar uma Unidade.");
      return;
    }

    // Validação estrita: Limite de max. 2 moradores por unidade
    const countExistentes = getMoradoresPorUnidade(tIdUnidade).length;
    if (countExistentes >= 2) {
      setActionError("Limite por unidade atingido!");
      return;
    }

    const cleanCpf = residentFormData.cpf.replace(/\D/g, "");
    const cleanTelefone = residentFormData.telefone.replace(/\D/g, "");

    try {
      const resp = await criarUsuario({
        nome: residentFormData.nome,
        email: residentFormData.email,
        cpf: cleanCpf,
        telefone: cleanTelefone,
        id_unidade: tIdUnidade,
        roles: ["MORADOR"]
      });

      setSenhaGerada(resp.senha ?? "");
      await carregarTudo();
    } catch (err: any) {
      setActionError(err.message || "Erro ao cadastrar Morador.");
    }
  }

  async function handleEditResident() {
    if (!selectedResident?.id) return;
    setActionError("");
    const tIdUnidade = parseInt(residentFormData.id_unidade);

    if (!residentFormData.nome || !residentFormData.email || !residentFormData.cpf || !tIdUnidade) {
      setActionError("Preencha os dados e a Unidade vinculada."); return;
    }

    // Regra dos 2 moradores, liberando atualizar o próprio morador atual sem explodir max
    const moradoresAtuaisNaUnidadeMuda = getMoradoresPorUnidade(tIdUnidade).filter(m => m.id !== selectedResident.id);
    if (moradoresAtuaisNaUnidadeMuda.length >= 2) {
      setActionError("A unidade destino já possui 2 moradores.");
      return;
    }

    const cleanCpf = residentFormData.cpf.replace(/\D/g, "");
    const cleanTelefone = residentFormData.telefone.replace(/\D/g, "");

    try {
      await atualizarUsuario(selectedResident.id, {
        nome: residentFormData.nome,
        email: residentFormData.email,
        cpf: cleanCpf,
        telefone: cleanTelefone || undefined,
        id_unidade: tIdUnidade,
        roles: ["MORADOR"]
      });
      // Atualização otimista para feedback instantâneo nas tabelas
      setMoradores(prev => prev.map(m =>
        m.id === selectedResident.id
          ? {
            ...m,
            nome: residentFormData.nome,
            email: residentFormData.email,
            cpf: cleanCpf,
            telefone: cleanTelefone,
            unidade: unidades.find(u => u.id === tIdUnidade)
          }
          : m
      ));

      toast.success("Morador atualizado.");
      setShowEditResidentModal(false);
      await carregarTudo();
    } catch (err: any) {
      setActionError(err.message || "Falha ao editar morador.");
    }
  }

  async function handleDeleteResident() {
    if (!selectedResident?.id) return;
    try {
      await deletarUsuario(selectedResident.id);
      toast.success("Morador deletado permanentemente.");
      setShowDeleteResidentModal(false);
      setSelectedResident(null);
      await carregarTudo();
    } catch (err: any) {
      toast.error(err.message || "Falha ao excluir.");
    }
  }

  // ─── UI SCREENS ──────────────────────────────────────

  if (loading && !usuarioLogado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-inter">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Carregando informações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-inter">
      {/* Sidebar / Drawer Overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity animate-in fade-in duration-300" onClick={() => setShowSidebar(false)} />
      )}

      {/* Sidebar / Drawer */}
      <aside className={`fixed top-0 left-0 h-full w-80 bg-white z-[70] shadow-2xl transition-transform duration-300 transform ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="p-8 border-b border-gray-100 flex flex-col items-center text-center bg-gray-50/50">
            <button onClick={() => setShowSidebar(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>

            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mb-4 bg-white group">
              <img
                src={usuarioLogado?.foto ? (usuarioLogado.foto.startsWith('http') ? usuarioLogado.foto : `${BASE_URL}${usuarioLogado.foto}`) : "/icone.png"}
                className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${uploadingFoto ? 'opacity-30' : ''}`}
                alt="Perfil"
              />
              <button
                onClick={() => { setActiveTab("perfil"); setShowSidebar(false); }}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>

            <h3 className="font-bold text-gray-900 text-lg mb-0.5">{usuarioLogado?.nome}</h3>
            <p className="text-[10px] font-bold text-accent uppercase tracking-widest">{usuarioLogado?.roles?.[0] || 'Gerente'}</p>
          </div>

          {/* Drawer Links */}
          <nav className="flex-1 p-4 space-y-2 mt-4">
            <NavItem id="perfil" label="Configurações de Perfil" icon={Settings} />
          </nav>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-gray-100 mt-auto">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-bold transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </div>
      </aside>

      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={() => setShowSidebar(true)}
                className="inline-flex items-center justify-center w-10 h-10 bg-gray-50 border border-gray-100 text-gray-600 rounded-xl flex-shrink-0 hover:bg-accent hover:text-white hover:border-accent transition-all duration-300"
              >
                <Menu className="w-6 h-6" />
              </button>

              <h1 className="text-lg font-bold text-gray-900 truncate sm:text-2xl tracking-tight">
                Portal do Gerente
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Botões removidos do header global */}
            </div>
          </div>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 sm:py-12">
        <div className="flex gap-2 mb-10 border-b border-gray-200 overflow-x-auto pb-px">
          {(["overview", "units", "residents"] as ActiveTab[]).map((tab) => {
            const labels: Record<ActiveTab, string> = {
              overview: "Dashboard Geral",
              units: `Unidades (${unidades.length})`,
              residents: `Moradores (${moradores.length})`,
              perfil: "Perfil"
            };
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === tab ? "border-accent text-accent" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* ===================== OVERVIEW DASHBOARD ===================== */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Total de Unidades", value: unidades.length, color: "text-blue-500", bg: "bg-blue-50" },
                { label: "Total de Moradores", value: moradores.length, color: "text-purple-500", bg: "bg-purple-50" },
                { label: "Aptos Ocupados", value: unidades.filter(u => getMoradoresPorUnidade(u.id!).length > 0).length, color: "text-orange-500", bg: "bg-orange-50" },
                { label: "Aptos Vazios", value: unidades.filter(u => getMoradoresPorUnidade(u.id!).length === 0).length, color: "text-accent", bg: "bg-accent/5" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                  <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <span className={`text-2xl font-black ${color}`}>{value}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>

            {/* Occupancy Table/Chart Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* STATUS GRÁFICO (PIE) */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-8 text-center sm:text-left">Ocupação das Unidades</h3>
                <div className="flex-1 min-h-[300px] relative">
                  {unidades.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm italic">Sem dados de unidades</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Ocupadas', value: unidades.filter(u => getMoradoresPorUnidade(u.id!).length > 0).length, color: '#10b981' },
                            { name: 'Vazias', value: unidades.filter(u => getMoradoresPorUnidade(u.id!).length === 0).length, color: '#f59e0b' },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {
                            [
                              { name: 'Ocupadas', value: unidades.filter(u => getMoradoresPorUnidade(u.id!).length > 0).length, color: '#10b981' },
                              { name: 'Vazias', value: unidades.filter(u => getMoradoresPorUnidade(u.id!).length === 0).length, color: '#f59e0b' },
                            ].filter(d => d.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} className="outline-none" />
                            ))
                          }
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          formatter={(value: number) => [`${value} Unidades`, 'Quantidade']}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* QUICK INFO */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-8 text-center sm:text-left">Informações Gerais</h3>
                <div className="space-y-4">
                  <div className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center">
                        <Home className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-sm font-bold text-gray-600">Total de Unidades</span>
                    </div>
                    <span className="text-lg font-black text-gray-900">{unidades.length}</span>
                  </div>
                  <div className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-orange-500" />
                      </div>
                      <span className="text-sm font-bold text-gray-600">Moradores Ativos</span>
                    </div>
                    <span className="text-lg font-black text-gray-900">{moradores.length}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ===================== VIEW UNITS / LIST ===================== */}
        {activeTab === "units" && !selectedUnidade && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Unidades e Ocupação</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setUnitFormData({ bloco: "", apartamento: "" }); setActionError(""); setShowAddUnitModal(true); }}
                  className="bg-accent hover:bg-accent/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-accent/20 active:scale-95"
                >
                  Nova Unidade
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {unidades.map((unit) => {
                const ativos = getMoradoresPorUnidade(unit.id!).length;
                return (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedUnidade(unit)}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center hover:shadow-lg transition-all cursor-pointer hover:border-accent group"
                  >
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Bloco {unit.bloco}</p>
                    <p className="text-3xl font-black text-gray-800 mb-3">{unit.apartamento}</p>
                    <div className="space-y-1 text-xs text-gray-600 border-t border-gray-100 pt-3">
                      <p><span className={`font-semibold ${ativos > 0 ? 'text-green-600' : 'text-gray-400'}`}>{ativos}</span> / 2 Moradores</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {unidades.length === 0 && (
              <div className="p-16 text-center bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">0 Unidades cadastradas.</p>
              </div>
            )}


          </div>
        )}

        {/* ===================== VIEW INSIDE SELECTED UNIT ===================== */}
        {activeTab === "units" && selectedUnidade && (
          <div className="space-y-4 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900"> Bloco {selectedUnidade.bloco} - Apt {selectedUnidade.apartamento}</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setUnitFormData({ bloco: selectedUnidade.bloco || "", apartamento: selectedUnidade.apartamento || "" });
                    setActionError("");
                    setShowEditUnitModal(true);
                  }}
                  className="px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Editar Dados
                </button>
                {/*<button
                  onClick={() => setShowDeleteUnitModal(true)}
                  className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Deletar Unidade
                </button>*/}
                <button onClick={() => setSelectedUnidade(null)} className="px-6 py-3 bg-orange-100 hover:bg-orange-200 text-orange-600 font-bold text-xs uppercase tracking-widest rounded-xl transition-all">
                  Voltar
                </button>
              </div>
            </div>

            {getMoradoresPorUnidade(selectedUnidade.id!).length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-12 text-center ring-1 ring-inset ring-gray-100/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Unidade Vazia</h3>
                <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">Esta unidade ainda não possui moradores vinculados. Cadastre um morador através da aba Moradores.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-white rounded-t-lg shadow-sm border-b border-gray-100 px-6 py-4">
                  <h3 className="text-xs font-bold text-gray-900 uppercase">Moradores</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-semibold uppercase">Ordenar:</span>
                    <select
                      value={residentSortBy}
                      onChange={(e) => setResidentSortBy(e.target.value as "name" | "email")}
                      className="text-xs bg-gray-50 border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="name">Por Nome</option>
                      <option value="email">Por Email</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-b-lg shadow-sm border border-t-0 border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Perfil Registrado</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Email/Telefone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortResidents(getMoradoresPorUnidade(selectedUnidade.id!), residentSortBy).map((resident) => (
                        <tr key={resident.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                              {resident.nome ? resident.nome.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{resident.nome}</p>
                              <p className="text-xs text-gray-500">CPF: {resident.cpf || "—"}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700">{resident.email}</p>
                            <p className="text-xs text-gray-400">{resident.telefone || "Sem telefone"}</p>
                            {resident.senha && (
                              <p className="text-xs text-green-600 font-mono mt-1 bg-green-50 px-2 py-1 rounded inline-block border border-green-100">
                                Provisória: <b>{resident.senha}</b>
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===================== VIEW ALL RESIDENTS ===================== */}
        {activeTab === "residents" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Gestão de Moradores</h2>
              <button
                onClick={() => {
                  setResidentFormData({ nome: "", email: "", cpf: "", telefone: "", id_unidade: "" });
                  setActionError("");
                  setShowAddResidentModal(true);
                }}
                className="bg-accent hover:bg-accent/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-accent/20 active:scale-95"
              >
                Cadastrar Morador
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all focus-within:shadow-md">
              <div className="relative w-full sm:max-w-md">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar morador por e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none"
                />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                {moradores.filter(m => m.email.toLowerCase().includes(searchTerm.toLowerCase())).length} de {moradores.length} registros
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Morador</th>
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Contato</th>
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Unidade</th>
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moradores
                      .filter(m => m.email.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((res) => (
                        <tr key={res.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                                {res.nome ? res.nome.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                              </div>
                              <span className="text-sm font-bold text-gray-900">{res.nome}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-700">{res.email}</span>
                              <span className="text-xs text-gray-400">{res.telefone || 'Sem telefone'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            {res.unidade ? (
                              <span className="inline-block px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-black uppercase tracking-wider">
                                B{res.unidade.bloco} - A{res.unidade.apartamento}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-[10px] font-bold uppercase">Sem Unidade</span>
                            )}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedResident(res);
                                  setResidentFormData({
                                    nome: res.nome,
                                    email: res.email,
                                    cpf: res.cpf || "",
                                    telefone: res.telefone || "",
                                    id_unidade: res.unidade?.id?.toString() || ""
                                  });
                                  setShowEditResidentModal(true);
                                }}
                                className="p-2.5 bg-gray-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all active:scale-95"
                              >
                                <Settings className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => { setSelectedResident(res); setShowDeleteResidentModal(true); }}
                                className="p-2.5 bg-gray-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-95"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {moradores.filter(m => m.email.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-gray-400 text-sm italic">
                          Nenhum morador encontrado com esse e-mail.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAIS ================= */}

      {/* Add / Edit UNIDADE */}
      {(showAddUnitModal || showEditUnitModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300 relative">
            <button
              onClick={() => { setShowAddUnitModal(false); setShowEditUnitModal(false); }}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">
              {showAddUnitModal ? "Criar Unidade" : "Editar Unidade"}
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Bloco</label>
                <input type="text" value={unitFormData.bloco} onChange={(e) => setUnitFormData({ ...unitFormData, bloco: e.target.value })} placeholder="Ex: A" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">N° Apartamento</label>
                <input type="text" value={unitFormData.apartamento} onChange={(e) => setUnitFormData({ ...unitFormData, apartamento: e.target.value })} placeholder="Ex: 101" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none" />
              </div>

              {actionError && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl"><p className="text-xs text-red-700 font-bold">{actionError}</p></div>}

              <div className="flex gap-4 pt-4">
                <button onClick={() => { setShowAddUnitModal(false); setShowEditUnitModal(false); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm py-4 rounded-2xl transition-all">Voltar</button>
                <button onClick={showAddUnitModal ? handleAddUnidade : handleEditUnidade} className="flex-[2] bg-accent hover:bg-accent/90 text-white font-bold text-sm py-4 rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete UNIDADE */}
      {showDeleteUnitModal && selectedUnidade && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogOut className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Excluir Unidade</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">Excluir Bloco {selectedUnidade.bloco} Apt {selectedUnidade.apartamento} permanentemente?</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteUnitModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-all">Voltar</button>
              <button onClick={handleDeleteUnidade} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95">Deletar</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit MORADOR */}
      {(showAddResidentModal || showEditResidentModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className={`bg-white rounded-3xl ${(showAddResidentModal && !senhaGerada && activeTab === 'residents') ? 'max-w-2xl' : 'max-w-md'} w-full overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]`}>
            {/* Modal Header */}
            <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50">
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                {activeTab === 'units' && showAddResidentModal ? "Vincular Morador" : (showAddResidentModal ? "Cadastrar Morador" : "Editar Ficha")}
              </h3>
              <button
                onClick={() => { setShowAddResidentModal(false); setShowEditResidentModal(false); setSenhaGerada(""); }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {senhaGerada ? (
                <div className="space-y-6 py-4 animate-in zoom-in-95 duration-300">
                  <div className="p-8 bg-green-50 border border-green-200 rounded-3xl text-center">
                    <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                      <UserCheck className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-bold text-green-900 mb-2">Sucesso!</p>
                    <p className="text-sm text-green-700 mb-6 font-medium">O morador foi cadastrado com sucesso. Esta é a senha de acesso:</p>
                    <div className="bg-white border border-green-200 p-6 rounded-2xl shadow-sm inline-block min-w-[200px]">
                      <code className="text-3xl font-black text-green-600 tracking-[0.2em]">{senhaGerada}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowAddResidentModal(false); setSenhaGerada(""); }}
                    className="w-full bg-accent text-white font-bold text-sm py-4 rounded-2xl shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all active:scale-95"
                  >
                    Concluir e Voltar
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-10">

                  {/* FORMULÁRIO: Apenas na aba Moradores ou se for Edição */}
                  {(activeTab === 'residents' || showEditResidentModal) && (
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Informações do Cadastro</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Nome Completo</label>
                          <input type="text" value={residentFormData.nome} onChange={(e) => setResidentFormData({ ...residentFormData, nome: e.target.value })} placeholder="Nome do morador" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none shadow-sm" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">E-mail</label>
                            <input type="email" value={residentFormData.email} onChange={(e) => setResidentFormData({ ...residentFormData, email: e.target.value })} disabled={showEditResidentModal} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none shadow-sm disabled:opacity-50" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">CPF</label>
                            <input type="text" value={residentFormData.cpf} onChange={(e) => setResidentFormData({ ...residentFormData, cpf: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none shadow-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Telefone</label>
                          <input type="text" value={residentFormData.telefone} onChange={(e) => setResidentFormData({ ...residentFormData, telefone: e.target.value })} placeholder="(00) 00000-0000" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none shadow-sm" />
                        </div>

                        {actionError && (
                          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-700 font-bold">
                            {actionError}
                          </div>
                        )}

                        <div className="pt-4">
                          <button
                            onClick={showAddResidentModal ? handleAddResident : handleEditResident}
                            className="w-full bg-accent hover:bg-accent/90 text-white font-bold text-sm py-4 rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95"
                          >
                            {showAddResidentModal ? "Confirmar Cadastro" : "Salvar Alterações"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete MORADOR */}
      {showDeleteResidentModal && selectedResident && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Excluir Morador</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">Esta operação cancelará todo o vínculo e reservas de <b>{selectedResident.nome}</b>. Confirmar?</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteResidentModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-all">Cancelar</button>
              <button onClick={handleDeleteResident} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "perfil" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto relative px-4">
          <div className="flex justify-center mb-16 border-b border-gray-100 pb-12">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-white flex-shrink-0 group">
                <img
                  src={usuarioLogado?.foto ? (usuarioLogado.foto.startsWith('http') ? usuarioLogado.foto : `${BASE_URL}${usuarioLogado.foto}`) : "/icone.png"}
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${uploadingFoto ? 'opacity-30' : ''}`}
                  alt="Perfil"
                />
                {uploadingFoto && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm">
                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Camera className="text-white w-8 h-8" />
                </div>
                <input type="file" id="foto-upload-page-ger" hidden accept="image/*" onChange={handleTrocarFoto} disabled={uploadingFoto} />
                <label htmlFor="foto-upload-page-ger" className="absolute inset-0 cursor-pointer" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Toque para alterar a foto</p>
            </div>
          </div>

          <div className="space-y-8">
            <section className="pb-8">
              <div className="space-y-8 text-left">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-600 uppercase ml-1">Nome Completo</label>
                  <input type="text" value={editProfileForm.nome} onChange={(e) => setEditProfileForm({ ...editProfileForm, nome: e.target.value })} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-600 uppercase ml-1">E-mail</label>
                    <input type="email" value={editProfileForm.email} disabled className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-500 cursor-not-allowed" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-600 uppercase ml-1">Telefone Comercial</label>
                    <input type="tel" value={editProfileForm.telefone} onChange={(e) => setEditProfileForm({ ...editProfileForm, telefone: e.target.value })} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-600 uppercase ml-1">Senha Atual</label>
                  <input type="password" value={passwordForm.atual} onChange={(e) => setPasswordForm({ ...passwordForm, atual: e.target.value })} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-600 uppercase ml-1">Nova Senha</label>
                  <input type="password" value={passwordForm.nova} onChange={(e) => setPasswordForm({ ...passwordForm, nova: e.target.value })} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-600 uppercase ml-1">Confirmar Nova Senha</label>
                  <input type="password" value={passwordForm.confirmacao} onChange={(e) => setPasswordForm({ ...passwordForm, confirmacao: e.target.value })} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 italic ml-1">* Preencha os campos acima apenas se desejar alterar sua senha de acesso.</p>
            </section>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-end gap-4 sm:gap-6">
              {actionError && <p className="text-xs text-red-500 font-bold">{actionError}</p>}
              <button
                onClick={() => setActiveTab("units")}
                className="w-full sm:w-auto px-8 py-5 bg-white border border-gray-200 text-gray-600 rounded-2xl text-xs font-bold uppercase hover:bg-gray-50 hover:text-accent hover:border-accent transition-all active:scale-95"
              >
                Voltar
              </button>
              <button
                onClick={handleSalvarPerfil}
                disabled={savingProfile}
                className="w-full sm:w-auto px-12 py-5 bg-accent text-white rounded-2xl text-sm font-bold uppercase hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 active:scale-95 disabled:opacity-50"
              >
                {savingProfile ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
