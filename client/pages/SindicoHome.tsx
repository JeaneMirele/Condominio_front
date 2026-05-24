import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getUsuarios,
  criarUsuario,
  atualizarUsuario,
  deletarUsuario,
  getLocais,
  getLocaisfiltroId,
  criarLocal,
  atualizarLocal,
  deletarLocal,
  uploadFotoLocal,
  getReservas,
  deletarReserva,
  getMeuPerfil,
  clearSession,
  uploadFotoPerfil,
  alterarSenha,
  BASE_URL
} from "@/services/api";
import type { UsuarioDTOResponse, LocalDTO, LocalDTOResponse, ReservaDTOResponse } from "@/services/types";
import { getSenhasProvisoras, salvarSenhaProvisora, removerSenhaProvisora, sincronizarSenhas, type SenhasMap } from "@/services/senhasProvisoras";
import { Users, Clock, Settings, LogOut, Menu, X, Camera, User, LayoutDashboard, ShieldAlert, ListChecks, Calendar, Eye, EyeOff, History } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

type ActiveTab = "managers" | "syndics" | "reservations" | "areas" | "overview" | "perfil";

const emptyLocalForm = {
  nome: "", localizacao: "", capacidade: "1",
  duracao: "PT1H", taxaReserva: "0",
  horarioInicio: "", horarioFim: "",
  foto: null as File | null,
};

export default function OwnerHome() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioDTOResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [gerentes, setGerentes] = useState<UsuarioDTOResponse[]>([]);
  const [sindicos, setSindicos] = useState<UsuarioDTOResponse[]>([]);
  const [locais, setLocais] = useState<LocalDTOResponse[]>([]);
  const [reservas, setReservas] = useState<ReservaDTOResponse[]>([]);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioDTOResponse | null>(null);
  const [userFormData, setUserFormData] = useState({ nome: "", email: "", cpf: "", telefone: "" });
  const [addingRole, setAddingRole] = useState<"GERENTE" | "SINDICO">("GERENTE");
  const [senhaGerada, setSenhaGerada] = useState("");
  const [senhasProvisoras, setSenhasProvisoras] = useState<SenhasMap>({});

  const [showAddLocalModal, setShowAddLocalModal] = useState(false);
  const [showEditLocalModal, setShowEditLocalModal] = useState(false);
  const [showDeleteLocalModal, setShowDeleteLocalModal] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState<LocalDTOResponse | null>(null);
  const [localFormData, setLocalFormData] = useState(emptyLocalForm);

  const [showDeleteReservaModal, setShowDeleteReservaModal] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState<ReservaDTOResponse | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [filtroDataSindico, setFiltroDataSindico] = useState("");
  const [filtroLocalSindico, setFiltroLocalSindico] = useState("");
  const [filtroDataHistorico, setFiltroDataHistorico] = useState("");
  const [filtroLocalHistorico, setFiltroLocalHistorico] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ nome: "", email: "", telefone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formError, setFormError] = useState("");

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
      setFormError("");
    }
  }, [activeTab, usuarioLogado]);

  async function carregarTudo() {
    setLoading(true);
    try {
      const [perfil, usuarios, locaisList, reservasList] = await Promise.all([
        getMeuPerfil(),
        getUsuarios(),
        getLocais(),
        getReservas(),
      ]);

      setUsuarioLogado(perfil);
      setGerentes(usuarios.filter((u) => u.roles?.some((r) => r.toUpperCase().includes("GERENTE"))));
      setSindicos(usuarios.filter((u) => u.roles?.some((r) => r.toUpperCase().includes("SINDICO"))));
      sincronizarSenhas(usuarios);
      setSenhasProvisoras(getSenhasProvisoras());
      setLocais(locaisList);
      setReservas(reservasList);
    } catch (err) {
      toast.error("Erro ao sincronizar com o banco de dados.");
    } finally {
      setLoading(false);
    }
  }

  function abrirAddUser(role: "GERENTE" | "SINDICO") {
    setAddingRole(role);
    setUserFormData({ nome: "", email: "", cpf: "", telefone: "" });
    setFormError("");
    setSenhaGerada("");
    setShowAddUserModal(true);
  }

  function abrirEditUser(user: UsuarioDTOResponse) {
    setSelectedUser(user);
    setUserFormData({ nome: user.nome, email: user.email, cpf: user.cpf, telefone: user.telefone ?? "" });
    setFormError("");
    setShowEditUserModal(true);
  }

  async function handleAddUser() {
    setFormError("");
    if (!userFormData.nome.trim() || !userFormData.email || !userFormData.cpf) {
      setFormError("Preencha nome, email e CPF.");
      return;
    }

    const cleanCpf = userFormData.cpf.replace(/\D/g, "");
    const cleanTelefone = userFormData.telefone.replace(/\D/g, "");

    try {
      const resp = await criarUsuario({
        node: userFormData.nome,
        email: userFormData.email,
        cpf: cleanCpf,
        telefone: cleanTelefone || undefined,
        roles: [addingRole],
      });
      const senha = resp.senha ?? "";
      setSenhaGerada(senha);
      if (resp.id && senha) salvarSenhaProvisora(resp.id, senha);
      setSenhasProvisoras(getSenhasProvisoras());
      await carregarTudo();
      toast.success(`${addingRole === "GERENTE" ? "Gerente" : "Síndico"} criado com sucesso!`);
    } catch (err: any) {
      setFormError(err.message ?? "Erro ao salvar no banco. Verifique se o e-mail ou CPF já existem.");
    }
  }

  async function handleEditUser() {
    if (!selectedUser) return;
    setFormError("");
    const cleanCpf = userFormData.cpf.replace(/\D/g, "");
    const cleanTelefone = userFormData.telefone.replace(/\D/g, "");

    try {
      await atualizarUsuario(selectedUser.id, {
        nome: userFormData.nome,
        email: userFormData.email,
        cpf: cleanCpf,
        telefone: cleanTelefone || null,
        roles: selectedUser.roles,
      });
      setShowEditUserModal(false);
      await carregarTudo();
      toast.success("Dados updated!");
    } catch (err: any) {
      setFormError(err.message ?? "Erro ao atualizar.");
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) return;
    try {
      await deletarUsuario(selectedUser.id);
      setShowDeleteUserModal(false);
      await carregarTudo();
      toast.success("Usuário removido do sistema.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao remover.");
    }
  }

  function abrirEditLocal(local: LocalDTOResponse) {
    setSelectedLocal(local);
    setLocalFormData({
      nome: local.nome,
      localizacao: local.localizacao,
      capacidade: String(local.capacidade),
      duracao: local.duracao ?? "PT1H",
      taxaReserva: String(local.taxaReserva),
      horarioInicio: local.horarioInicio?.substring(0, 5) ?? "",
      horarioFim: local.horarioFim?.substring(0, 5) ?? "",
      foto: null,
    });
    setFormError("");
    setShowEditLocalModal(true);
  }

  async function handleAddLocal() {
    setFormError("");
    if (!localFormData.nome || !localFormData.horarioInicio || !localFormData.horarioFim) {
      setFormError("Preencha nome, horário de início e fim.");
      return;
    }
    if (localFormData.foto && localFormData.foto.size > 2 * 1024 * 1024) {
      setFormError("Carregue uma imagem de até 1MB");
      return;
    }
    try {
      const novoLocal = await criarLocal({
        nome: localFormData.nome,
        localizacao: localFormData.localizacao,
        capacidade: parseInt(localFormData.capacidade),
        duracao: localFormData.duracao,
        taxaReserva: parseFloat(localFormData.taxaReserva),
        horarioInicio: localFormData.horarioInicio + ":00",
        horarioFim: localFormData.horarioFim + ":00",
      });
      if (localFormData.foto && novoLocal.id) {
        await uploadFotoLocal(novoLocal.id, localFormData.foto);
      }
      await carregarTudo();
      setShowAddLocalModal(false);
      setLocalFormData(emptyLocalForm);
      toast.success("Área de lazer criada!");
    } catch (err: any) {
      setFormError(err.message ?? "Erro ao criar área.");
    }
  }

  async function handleEditLocal() {
    if (!selectedLocal) return;
    setFormError("");
    if (localFormData.foto && localFormData.foto.size > 2 * 1024 * 1024) {
      setFormError("Carregue uma imagem de até 2MB");
      return;
    }
    try {
      await atualizarLocal(selectedLocal.id, {
        nome: localFormData.nome,
        localizacao: localFormData.localizacao,
        capacidade: parseInt(localFormData.capacidade),
        duracao: localFormData.duracao,
        taxaReserva: parseFloat(localFormData.taxaReserva),
        horarioInicio: localFormData.horarioInicio + ":00",
        horarioFim: localFormData.horarioFim + ":00",
      });
      if (localFormData.foto) {
        await uploadFotoLocal(selectedLocal.id, localFormData.foto);
      }
      await carregarTudo();
      setShowEditLocalModal(false);
      toast.success("Área atualizada!");
    } catch (err: any) {
      setFormError(err.message ?? "Erro ao atualizar área.");
    }
  }

  async function handleDeleteLocal() {
    if (!selectedLocal) return;
    try {
      await deletarLocal(selectedLocal.id);
      await carregarTudo();
      setShowDeleteLocalModal(false);
      toast.success("Área removida.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao remover área.");
    }
  }

  async function handleCancelarReserva() {
    if (!selectedReserva) return;
    try {
      await deletarReserva(selectedReserva.id);
      await carregarTudo();
      setShowDeleteReservaModal(false);
      toast.success("Reserva cancelada.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao cancelar reserva.");
    }
  }

  function handleSignOut() {
    clearSession();
    navigate("/");
  }

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

  async function handleSalvarPerfil() {
    if (!usuarioLogado?.id) return;
    setSavingProfile(true);
    setFormError("");
    try {
      const trocandoSenha = newPassword || confirmPassword;
      if (trocandoSenha) {
        if (newPassword.length < 6) throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
        if (newPassword !== confirmPassword) throw new Error("As novas senhas não coincidem.");
      }

      const payload = {
        nome: editProfileForm.nome.trim(),
        email: usuarioLogado.email,
        cpf: usuarioLogado.cpf,
        telefone: editProfileForm.telefone.trim() || undefined,
        roles: usuarioLogado.roles || ["SINDICO"]
      };

      await atualizarUsuario(usuarioLogado.id, payload as any);

      if (trocandoSenha) {
        if (!currentPassword) throw new Error("Informe a senha atual para prosseguir.");
        await alterarSenha({
          senhaAtual: currentPassword,
          novaSenha: newPassword
        });
        setCurrentPassword("");
        setNewPassword("");
        confirmPassword !== "" && setConfirmPassword("");
      }

      toast.success("Perfil e configurações atualizados!");
      const novoPerfil = await getMeuPerfil();
      setUsuarioLogado(novoPerfil);
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar alterações.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Carregue uma imagem de até 2MB");
      return;
    }
    setUploadingFoto(true);
    try {
      await uploadFotoPerfil(file);
      toast.success("Foto updated com sucesso!");
      const novoPerfil = await getMeuPerfil();
      setUsuarioLogado(novoPerfil);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar foto.");
    } finally {
      setUploadingFoto(false);
    }
  }

  function formatarData(data: string) {
    const d = new Date(data + "T00:00:00");
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  function formatarHora(hora: string) {
    return hora?.substring(0, 5) ?? "";
  }

  function badgeStatus(status: string) {
    const map: Record<string, string> = {
      APROVADA: "bg-green-100 text-green-800",
      PENDENTE: "bg-yellow-100 text-yellow-800",
      CANCELADA: "bg-red-100 text-red-800",
    };
    return map[status] ?? "bg-gray-100 text-gray-800";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Sincronizando com o banco...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-inter">

      {showSidebar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity animate-in fade-in duration-300" onClick={() => setShowSidebar(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-full w-80 bg-white z-[70] shadow-2xl transition-transform duration-300 transform ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full font-inter">
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
            <p className="text-[10px] font-bold text-accent uppercase">{usuarioLogado?.roles?.[0] || 'Síndico'}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 mt-4">
            <NavItem id="perfil" label="Configurações de Perfil" icon={Settings} />
          </nav>

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
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8 sm:py-5 font-inter">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={() => setShowSidebar(true)}
                className="inline-flex items-center justify-center w-10 h-10 bg-gray-50 border border-gray-100 text-gray-600 rounded-xl flex-shrink-0 hover:bg-accent hover:text-white hover:border-accent transition-all duration-300"
              >
                <Menu className="w-6 h-6" />
              </button>

              <h1 className="text-lg font-bold text-gray-900 truncate sm:text-2xl tracking-tight">
                Portal do Síndico
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3"></div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 sm:py-12">

        <div className="flex gap-2 mb-10 border-b border-gray-200 overflow-x-auto pb-px">
          {(["overview", "areas", "reservations", "managers", "syndics"] as ActiveTab[]).map((tab) => {
            const labels: Record<ActiveTab, string> = {
              overview: "Dashboard Geral",
              areas: `Lazer (${locais.length})`,
              reservations: `Reservas (${reservas.length})`,
              managers: `Gerentes (${gerentes.length})`,
              syndics: `Síndicos (${sindicos.length})`,
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

        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
              <h2 className="text-xl font-bold text-gray-900">Métricas Estatísticas</h2>
              <div className="flex flex-wrap items-center gap-4">
                
                <div className="flex items-center gap-2 h-10">
                  <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Local:</span>
                  <select
                    value={filtroLocalSindico}
                    onChange={(e) => setFiltroLocalSindico(e.target.value)}
                    className="h-full px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                  >
                    <option value="">Todas as áreas</option>
                    {locais.map(l => <option key={l.id} value={l.id.toString()}>{l.nome}</option>)}
                  </select>
                  {filtroLocalSindico && <button onClick={() => setFiltroLocalSindico("")} className="text-xs text-red-500 font-semibold hover:underline">Limpar</button>}
                </div>

                <div className="flex items-center gap-2 h-10">
                  <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Mês:</span>
                  <div className="w-44 h-full">
                    <InputData
                      value={filtroDataSindico}
                      onChange={(val) => setFiltroDataSindico(val)}
                      isMonthSelect={true}
                      className="h-full w-full px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                    />
                  </div>
                  {filtroDataSindico && <button onClick={() => setFiltroDataSindico("")} className="text-xs text-red-500 font-semibold hover:underline">Limpar</button>}
                </div>

              </div>
            </div>

            {(() => {
              const reservasFiltradasDashboard = reservas.filter(r => {
                const isAprovada = r.status === 'APROVADA';
                const matchesLocal = !filtroLocalSindico || r.local?.id.toString() === filtroLocalSindico;
                const matchesMes = !filtroDataSindico || r.data?.startsWith(filtroDataSindico);
                return isAprovada && matchesLocal && matchesMes;
              });

              const contagemLocais = reservasFiltradasDashboard.reduce((acc, r) => {
                const nome = r.local?.nome || 'Desconhecido';
                acc[nome] = (acc[nome] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              const dadosGraficoBarras = Object.entries(contagemLocais)
                .map(([name, count]) => ({ name, Quantidade: count }))
                .sort((a, b) => b.Quantidade - a.Quantidade);

              const areaMaisReservada = dadosGraficoBarras[0]?.name || "—";
              const qtdAreaMaisReservada = dadosGraficoBarras[0]?.Quantidade || 0;

              const diasSemanaNome = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
              const contagemDias = reservasFiltradasDashboard.reduce((acc, r) => {
                if (!r.data) return acc;
                const diaSemana = new Date(r.data + "T00:00:00").getDay();
                acc[diaSemana] = (acc[diaSemana] || 0) + 1;
                return acc;
              }, {} as Record<number, number>);

              const diaMaisUsoIndex = Object.entries(contagemDias).sort((a, b) => b[1] - a[1])[0]?.[0];
              const diaMaisUso = diaMaisUsoIndex !== undefined ? diasSemanaNome[parseInt(diaMaisUsoIndex)] : "—";

              const contagemHorarios = reservasFiltradasDashboard.reduce((acc, r) => {
                if (!r.horaEntrada) return acc;
                const hora = r.horaEntrada.substring(0, 5);
                acc[hora] = (acc[hora] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              const horarioMaisUso = Object.entries(contagemHorarios).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

              const dadosGraficoDias = diasSemanaNome.map((nome, index) => ({
                name: nome.substring(0, 3),
                Quantidade: contagemDias[index] || 0
              }));

              return (
                <div className="space-y-8">
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                      <div className="min-w-[48px] h-12 px-3 bg-accent/5 rounded-xl flex items-center justify-center mb-3">
                        <span className="text-2xl font-black text-accent">{reservasFiltradasDashboard.length}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reservas Aprovadas</span>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                      <div className="min-w-[48px] min-h-[48px] py-2 px-4 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                        <span className="text-sm font-black text-blue-600 whitespace-normal break-all line-clamp-2 max-w-[140px]">{areaMaisReservada}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mais Reservada ({qtdAreaMaisReservada})</span>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                      <div className="min-w-[48px] h-12 px-4 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                        <span className="text-sm font-black text-purple-600 whitespace-nowrap">{diaMaisUso}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dia de Pico</span>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                      <div className="min-w-[48px] h-12 px-4 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
                        <span className="text-base font-black text-orange-600 whitespace-nowrap">{horarioMaisUso}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Horário de Pico</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8 text-center sm:text-left">Quantidade por Área de Lazer</h3>
                      <div className="flex-1 min-h-[300px] relative">
                        {dadosGraficoBarras.length === 0 ? (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm italic">Sem dados aprovados no filtro selecionado</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosGraficoBarras} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                              <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                              <Bar dataKey="Quantidade" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={32} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8 text-center sm:text-left">Frequência por Dia da Semana</h3>
                      <div className="flex-1 min-h-[300px] relative">
                        {reservasFiltradasDashboard.length === 0 ? (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm italic">Sem dados aprovados no filtro selecionado</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosGraficoDias} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                              <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                              <Bar dataKey="Quantidade" fill="#10b981" radius={[8, 8, 0, 0]} barSize={32} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>
        )}
        

        {activeTab === "managers" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Gestão de Gerentes</h2>
              <button
                onClick={() => {
                  setAddingRole("GERENTE");
                  setSelectedUser(null);
                  setUserFormData({ nome: "", email: "", cpf: "", telefone: "" });
                  setFormError("");
                  setShowEditUserModal(false);
                  setShowAddUserModal(true);
                }}
                className="bg-accent hover:bg-accent/90 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Cadastrar Gerente
              </button>
            </div>
            <TabelaUsuarios usuarios={gerentes} senhasProvisoras={senhasProvisoras}
              onRefreshSenhas={() => setSenhasProvisoras(getSenhasProvisoras())}
              onEdit={abrirEditUser}
              onDelete={(u) => { setSelectedUser(u); setShowDeleteUserModal(true); }} />
          </div>
        )}

        {activeTab === "syndics" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Gestão de Síndicos</h2>
              <button
                onClick={() => {
                  setAddingRole("SINDICO");
                  setSelectedUser(null);
                  setUserFormData({ nome: "", email: "", cpf: "", telefone: "" });
                  setFormError("");
                  setShowEditUserModal(false);
                  setShowAddUserModal(true);
                }}
                className="bg-accent hover:bg-accent/90 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                Cadastrar Síndico
              </button>
            </div>
            <TabelaUsuarios usuarios={sindicos} senhasProvisoras={senhasProvisoras}
              onRefreshSenhas={() => setSenhasProvisoras(getSenhasProvisoras())}
              onEdit={abrirEditUser}
              onDelete={(u) => { setSelectedUser(u); setShowDeleteUserModal(true); }} />
          </div>
        )}

        {activeTab === "reservations" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900">Reservas</h2>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => {setFiltroLocalHistorico("");
                                  setFiltroDataHistorico("");
                                  setShowHistoryModal(true)}
                          }
                  className="text-xs font-bold py-2.5 px-4 rounded-xl transition-all bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-2 h-10 shadow-sm"
                >
                  <History className="w-4 h-4" />
                  Ver Histórico
                </button>
                
                <div className="flex items-center gap-2 h-10">
                  <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Local:</span>
                  <select
                    value={filtroLocalHistorico}
                    onChange={e => setFiltroLocalHistorico(e.target.value)}
                    className="h-full px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                  >
                    <option value="">Todos</option>
                    {locais.map(l => <option key={l.id} value={l.id.toString()}>{l.nome}</option>)}
                  </select>
                  {filtroLocalHistorico && <button onClick={() => setFiltroLocalHistorico("")} className="text-xs text-red-500 font-semibold hover:underline">Limpar</button>}
                </div>
                
                <div className="flex items-center gap-2 h-10">
                  <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Filtrar por data:</span>
                  <div className="w-40 h-full">
                    <InputData
                      value={filtroDataHistorico}
                      onChange={(val) => setFiltroDataHistorico(val)}
                      className="h-full w-full px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                    />
                  </div>
                  {filtroDataHistorico && <button onClick={() => setFiltroDataHistorico("")} className="text-xs text-red-500 font-semibold hover:underline">Limpar</button>}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                {(() => {
                  const hojeString = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                  const reservasFiltradas = reservas
                    .filter(r => (r.data as string) >= hojeString && r.status !== 'CANCELADA')
                    .filter(r => !filtroDataHistorico || r.data === filtroDataHistorico)
                    .filter(r => !filtroLocalHistorico || r.local?.id.toString() === filtroLocalHistorico)
                    .sort((a, b) => {
                      const dateA = new Date((a.data as string || "") + "T" + (a.horaEntrada as string || "00:00"));
                      const dateB = new Date((b.data as string || "") + "T" + (b.horaEntrada as string || "00:00"));
                      return dateA.getTime() - dateB.getTime();
                    });

                  if (reservasFiltradas.length === 0) {
                    return <p className="text-gray-500 text-sm text-center py-12">Nenhuma reserva programada{filtroDataHistorico ? ' para esta data' : ''}{filtroLocalHistorico ? ' neste local' : ''}.</p>;
                  }

                  return (
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                          {["Morador", "Local", "Data", "Hora", "Status", "Ações"].map((h) => (
                            <th key={h} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {reservasFiltradas.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {r.morador?.nome}<br />
                              <span className="text-gray-500 text-xs font-normal">{r.morador?.email}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">{r.local?.nome}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatarData(r.data)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                              {formatarHora(r.horaEntrada as string)} – {formatarHora(r.horaSaida as string)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badgeStatus(r.status)}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end gap-2">
                                {r.status !== 'CANCELADA' && !isReservaExpirada(r) && (
                                  <button
                                    onClick={() => {
                                      setSelectedReserva(r);
                                      setShowDeleteReservaModal(true);
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-50"
                                    title="Cancelar Reserva"
                                  >
                                    <span className="text-xs font-bold uppercase tracking-wider">Cancelar</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {showHistoryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
              <div className="p-6 sm:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                  <History className="w-6 h-6 text-accent" />
                  Histórico de Reservas
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto">
                
                <div className="flex flex-wrap justify-end mb-6 gap-4">
                  <div className="flex items-center gap-2 h-10">
                    <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Local:</span>
                    <select
                      value={filtroLocalSindico}
                      onChange={(e) => setFiltroLocalSindico(e.target.value)}
                      className="h-full px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                    >
                      <option value="">Todos</option>
                      {locais.map(l => <option key={l.id} value={l.id.toString()}>{l.nome}</option>)}
                    </select>
                    {filtroLocalSindico && <button onClick={() => setFiltroLocalSindico("")} className="text-xs text-red-500 font-semibold hover:underline">Limpar</button>}
                  </div>
                  
                  <div className="flex items-center gap-2 h-10">
                    <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Filtrar por data:</span>
                    <div className="w-40 h-full">
                      <InputData
                        value={filtroDataSindico}
                        onChange={(val) => setFiltroDataSindico(val)}
                        className="h-full w-full px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                      />
                    </div>
                    {filtroDataSindico && <button onClick={() => setFiltroDataSindico("")} className="text-xs text-red-500 font-semibold hover:underline">Limpar</button>}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    {(() => {
                      const hojeString = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                      const reservasFiltradas = reservas
                        .filter(r => (r.data as string) < hojeString || r.status === 'CANCELADA')
                        .filter(r => !filtroDataSindico || r.data === filtroDataSindico)
                        .filter(r => !filtroLocalSindico || r.local?.id.toString() === filtroLocalSindico)
                        .sort((a, b) => {
                          const dateA = new Date((a.data as string || "") + "T" + (a.horaEntrada as string || "00:00"));
                          const dateB = new Date((b.data as string || "") + "T" + (b.horaEntrada as string || "00:00"));
                          return dateB.getTime() - dateA.getTime();
                        });

                      if (reservasFiltradas.length === 0) {
                        return <p className="text-gray-500 text-sm text-center py-12">Nenhuma reserva passada encontrada.</p>;
                      }

                      return (
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-200 text-left">
                              {["Morador", "Local", "Data", "Hora", "Status"].map((h) => (
                                <th key={h} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {reservasFiltradas.map((r) => (
                              <tr key={r.id} className="hover:bg-gray-50/50 transition-colors group opacity-85">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {r.morador?.nome}<br />
                                  <span className="text-gray-500 text-xs font-normal">{r.morador?.email}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.local?.nome}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatarData(r.data)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                  {formatarHora(r.horaEntrada as string)} – {formatarHora(r.horaSaida as string)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badgeStatus(r.status)}`}>
                                    {r.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "areas" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Áreas de Lazer</h2>
              <button
                onClick={() => { setLocalFormData(emptyLocalForm); setFormError(""); setShowAddLocalModal(true); }}
                className="bg-accent hover:bg-accent/90 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95 flex items-center gap-2"
              >
                Cadastrar Área de Lazer
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {locais.length === 0 ? (
                <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-16 text-center">
                  <p className="text-gray-400 italic">Nenhuma área cadastrada.</p>
                </div>
              ) : (
                locais.map((l) => (
                  <div key={l.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-accent hover:shadow-md transition-all flex flex-col">
                    <div className="w-full h-48 bg-gray-100 relative">
                      <img
                        src={(() => {
                          const url = l.fotoUrl || (l as any).foto;
                          if (!url) return "/icone.png";
                          if (url.startsWith('http')) return url;
                          let path = url.startsWith('/') ? url : '/' + url;
                          if (!path.includes('/arquivos/')) path = '/arquivos' + path;
                          return `${BASE_URL}${path}`;
                        })()}
                        alt={l.nome}
                        className={`w-full h-full object-cover ${(!l.fotoUrl && !(l as any).foto) && "p-6 opacity-30"}`}
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">{l.nome}</h3>
                        <span className="bg-accent/10 text-accent text-xs font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider">R$ {l.taxaReserva?.toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{l.localizacao}</p>
                      <div className="space-y-2 mb-4 flex-1 mt-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50/70 p-2.5 rounded-2xl border border-gray-100">
                          <Users className="w-4 h-4 text-accent" />
                          <span className="font-medium">Capacidade</span>
                          <span className="text-gray-900 font-bold ml-auto">{l.capacidade} <span className="font-normal text-xs text-gray-500">pessoas</span></span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50/70 p-2.5 rounded-2xl border border-gray-100">
                          <Clock className="w-4 h-4 text-accent" />
                          <span className="font-medium">Disponibilidade</span>
                          <span className="text-gray-900 font-bold ml-auto">{formatarHora(l.horarioInicio as string)} - {formatarHora(l.horarioFim as string)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-gray-100 mt-auto">
                        <button onClick={() => abrirEditLocal(l)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-xs py-2 rounded-lg transition-colors">
                          Editar
                        </button>
                        <button onClick={() => { setSelectedLocal(l); setShowDeleteLocalModal(true); }} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs py-2 rounded-lg transition-colors">
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {(showAddUserModal || showEditUserModal) && (
        <Modal
          title={showAddUserModal ? `Adicionar ${addingRole === "GERENTE" ? "Gerente" : "Síndico"}` : "Editar Usuário"}
          onClose={() => { setShowAddUserModal(false); setShowEditUserModal(false); setSenhaGerada(""); }}
        >
          {senhaGerada ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-sm font-semibold text-green-800 mb-1">Usuário criado com sucesso!</p>
                <p className="text-xs text-green-700 mb-3">Senha provisória (anote agora):</p>
                <code className="text-lg font-bold text-green-900 bg-green-100 px-4 py-2 rounded">{senhaGerada}</code>
              </div>
              <button onClick={() => { setShowAddUserModal(false); setSenhaGerada(""); }} className="w-full bg-accent text-white font-medium text-sm py-3 rounded-lg">Fechar</button>
            </div>
          ) : (
            <FormUsuario data={userFormData} onChange={setUserFormData} error={formError}
              onCancel={() => { setShowAddUserModal(false); setShowEditUserModal(false); }}
              onSubmit={showAddUserModal ? handleAddUser : handleEditUser}
              submitLabel={showAddUserModal ? "Criar Usuário" : "Salvar Alterações"} />
          )}
        </Modal>
      )}

      {showDeleteUserModal && selectedUser && (
        <Modal title="Remover Usuário?" onClose={() => setShowDeleteUserModal(false)}>
          <p className="text-sm text-gray-600 mb-4">Tem certeza que deseja remover <strong>{selectedUser.nome}</strong>?</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteUserModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm py-4 rounded-2xl transition-all">Cancelar</button>
            <button onClick={handleDeleteUser} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-4 rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95">Remover</button>
          </div>
        </Modal>
      )}

      {showAddLocalModal && (
        <Modal title="Adicionar Área de Lazer" onClose={() => setShowAddLocalModal(false)}>
          <FormLocal data={localFormData} onChange={setLocalFormData} error={formError}
            onCancel={() => setShowAddLocalModal(false)} onSubmit={handleAddLocal} submitLabel="Salvar Área" />
        </Modal>
      )}

      {showEditLocalModal && selectedLocal && (
        <Modal title="Editar Área de Lazer" onClose={() => setShowEditLocalModal(false)}>
          <FormLocal data={localFormData} onChange={setLocalFormData} error={formError}
            onCancel={() => setShowEditLocalModal(false)} onSubmit={handleEditLocal} submitLabel="Salvar Alterações" />
        </Modal>
      )}

      {showDeleteLocalModal && selectedLocal && (
        <Modal title="Remover Área de Lazer?" onClose={() => setShowDeleteLocalModal(false)}>
          <p className="text-sm text-gray-600 mb-4">Tem certeza que deseja remover <strong>{selectedLocal.nome}</strong>?</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteLocalModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm py-4 rounded-2xl transition-all">Cancelar</button>
            <button onClick={handleDeleteLocal} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-4 rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95">Remover</button>
          </div>
        </Modal>
      )}

      {showDeleteReservaModal && selectedReserva && (
        <Modal title="Cancelar Reserva?" onClose={() => setShowDeleteReservaModal(false)}>
          <p className="text-sm text-gray-600 mb-1">Morador: <strong>{selectedReserva.morador?.nome}</strong></p>
          <p className="text-sm text-gray-600 mb-4">Local: <strong>{selectedReserva.local?.nome}</strong> — {formatarData(selectedReserva.data as string)} às {formatarHora(selectedReserva.horaEntrada as string)}</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteReservaModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm py-4 rounded-2xl transition-all">Voltar</button>
            <button onClick={handleCancelarReserva} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-4 rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95">Cancelar Reserva</button>
          </div>
        </Modal>
      )}

      {activeTab === "perfil" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto relative px-4 pt-12">
          <div className="flex justify-center mb-16 border-b border-gray-100 pb-12">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-white flex-shrink-0 group">
                <img
                  src={(() => {
                    if (!usuarioLogado?.foto) return "/icone.png";
                    if (usuarioLogado.foto.startsWith('http')) return usuarioLogado.foto;
                    let path = usuarioLogado.foto.startsWith('/') ? usuarioLogado.foto : '/' + usuarioLogado.foto;
                    if (!path.includes('/arquivos/')) path = '/arquivos' + path;
                    return `${BASE_URL}${path}`;
                  })()}
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${uploadingFoto ? 'opacity-30' : ''}`}
                  alt="Perfil"
                />
                {uploadingFoto && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm">
                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Camera className="text-white w-8 h-8" size={32} />
                </div>
                <input type="file" id="foto-upload-page-sin" hidden accept="image/*" onChange={handleUploadFoto} disabled={uploadingFoto} />
                <label htmlFor="foto-upload-page-sin" className="absolute inset-0 cursor-pointer" />
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
                    <input type="tel" value={editProfileForm.telefone} onChange={(e) => {
                      const formatTelefone = (val: string) => {
                        const clean = val.replace(/\D/g, "");
                        const truncated = clean.slice(0, 11);
                        if (truncated.length === 0) return "";
                        if (truncated.length <= 2) return `(${truncated}`;
                        if (truncated.length <= 6) return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`;
                        if (truncated.length <= 10) return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 6)}-${truncated.slice(6)}`;
                        return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`;
                      };
                      setEditProfileForm({ ...editProfileForm, telefone: formatTelefone(e.target.value) });
                    }} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-8 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-600 uppercase ml-1">Senha Atual</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-600 uppercase ml-1">Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-600 uppercase ml-1">Confirmar Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 italic ml-1">* Preencha os campos acima apenas se desejar alterar sua senha de acesso.</p>
            </section>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-end gap-4 sm:gap-6 pb-12">
              {formError && <p className="text-xs text-red-500 font-bold">{formError}</p>}
              <button
                onClick={() => setActiveTab("managers")}
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

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function isReservaExpirada(r: ReservaDTOResponse) {
  if (!r.data) return false;
  const agora = new Date();
  const dateStr = (r.data as string) + "T" + (r.horaEntrada as string || "00:00:00");
  const resDate = new Date(dateStr);
  return resDate.getTime() < agora.getTime();
}

function InputData({ value, onChange, className, min, isMonthSelect = false }: { value: string, onChange: (v: string) => void, className?: string, min?: string, isMonthSelect?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const formatDateToBRL = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 2) {
      return `${parts[1]}/${parts[0]}`;
    }
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handleDisplayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        inputRef.current.showPicker();
      } else {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className="relative w-full h-full inline-block">
      <input
        type="text"
        value={formatDateToBRL(value)}
        onClick={handleDisplayClick}
        readOnly
        placeholder={isMonthSelect ? "mm/aaaa" : "dd/mm/aaaa"}
        className={`${className} w-full h-full pl-3 pr-10 cursor-pointer text-left`}
      />
      
      <svg
        onClick={handleDisplayClick}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 cursor-pointer pointer-events-auto"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>

      <input
        ref={inputRef}
        type={isMonthSelect ? "month" : "date"}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-none"
      />
    </div>
  );
}

function TabelaUsuarios({ usuarios, senhasProvisoras, onRefreshSenhas, onEdit, onDelete }: {
  usuarios: UsuarioDTOResponse[];
  senhasProvisoras: SenhasMap;
  onRefreshSenhas: () => void;
  onEdit: (u: UsuarioDTOResponse) => void;
  onDelete: (u: UsuarioDTOResponse) => void;
}) {
  const [senhaVisivel, setSenhaVisivel] = useState<number | null>(null);
  if (usuarios.length === 0) return <p className="text-gray-500 text-sm text-center py-12">Nenhum usuário encontrado.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Nome", "Email", "CPF", "Telefone", "Senha Provisória", "Ações"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 sm:text-sm">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => {
            const senhaGuardada = u.id ? senhasProvisoras[u.id] : undefined;
            return (
              <tr key={u.id} className="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 text-sm font-medium text-gray-900">{u.nome}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{u.email}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{u.cpf}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{u.telefone ?? "—"}</td>
                <td className="px-4 py-4">
                  {senhaGuardada ? (
                    <div className="flex items-center gap-2">
                      {senhaVisivel === u.id ? (
                        <>
                          <code className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg text-xs font-bold tracking-wider">
                            {senhaGuardada}
                          </code>
                          <button
                            onClick={() => { removerSenhaProvisora(u.id!); onRefreshSenhas(); setSenhaVisivel(null); }}
                            title="Marcar como anotada"
                            className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors px-1"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setSenhaVisivel(u.id!)}
                          className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-xl transition-all"
                        >
                          🔑 Ver senha
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-300 text-[10px] font-bold">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(u)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] uppercase tracking-wider py-2 px-4 rounded-xl transition-all active:scale-95 border border-blue-100">Editar</button>
                    <button onClick={() => onDelete(u)} className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] uppercase tracking-wider py-2 px-4 rounded-xl transition-all active:scale-95 border border-red-100">Excluir</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FormUsuario({ data, onChange, error, onCancel, onSubmit, submitLabel }: {
  data: { nome: string; email: string; cpf: string; telefone: string };
  onChange: (d: any) => void;
  error: string;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-5">
      {[
        { label: "Nome Completo", key: "nome", type: "text", placeholder: "João Silva" },
        { label: "Email", key: "email", type: "email", placeholder: "jose@condominio.com" },
        { label: "CPF", key: "cpf", type: "text", placeholder: "123-456-789-90" },
        { label: "Telefone", key: "telefone", type: "text", placeholder: "(84) 99999-9999" },
      ].map(({ label, key, type, placeholder }) => (
        <div key={key}>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{label}</label>
          <input type={type} value={(data as any)[key]} placeholder={placeholder}
            onChange={(e) => {
              let val = e.target.value;
              if (key === "telefone") {
                const formatTelefone = (v: string) => {
                  const clean = v.replace(/\D/g, "");
                  const truncated = clean.slice(0, 11);
                  if (truncated.length === 0) return "";
                  if (truncated.length <= 2) return `(${truncated}`;
                  if (truncated.length <= 6) return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`;
                  if (truncated.length <= 10) return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 6)}-${truncated.slice(6)}`;
                  return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`;
                };
                val = formatTelefone(val);
              }
              onChange({ ...data, [key]: val });
            }}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none" />
        </div>
      ))}
      {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl"><p className="text-xs text-red-700 font-bold">{error}</p></div>}
      <div className="flex gap-4 pt-4">
        <button onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm py-4 rounded-2xl transition-all">Cancelar</button>
        <button onClick={onSubmit} className="flex-1 bg-accent hover:bg-accent/90 text-white font-bold text-sm py-4 rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95">{submitLabel}</button>
      </div>
    </div>
  );
}

function FormLocal({ data, onChange, error, onCancel, onSubmit, submitLabel }: {
  data: typeof emptyLocalForm;
  onChange: (d: typeof emptyLocalForm) => void;
  error: string;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const TIME_SLOTS = Array.from({ length: 23 - 7 + 1 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);
  return (
    <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Nome</label>
        <input type="text" value={data.nome} onChange={(e) => onChange({ ...data, nome: e.target.value })}
          placeholder="Piscina" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none" />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Localização</label>
        <input type="text" value={data.localizacao} onChange={(e) => onChange({ ...data, localizacao: e.target.value })}
          placeholder="Térreo" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none" />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Imagem do Local</label>
        {(data as any).fotoUrl && !data.foto && (
          <div className="mb-3 relative w-full h-32 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
            <img
              src={(() => {
                const url = (data as any).fotoUrl || (data as any).foto;
                if (!url || typeof url !== 'string') return "/icone.png";
                if (url.startsWith('http')) return url;
                let path = url.startsWith('/') ? url : '/' + url;
                if (!path.includes('/arquivos/')) path = '/arquivos' + path;
                return `${BASE_URL}${path}`;
              })()}
              className="w-full h-full object-cover opacity-60"
              alt="Preview"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/80 px-3 py-1 rounded-lg">Imagem Atual</span>
            </div>
          </div>
        )}
        <input type="file" accept="image/*" onChange={(e) => onChange({ ...data, foto: e.target.files?.[0] || null })}
          className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none cursor-pointer" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Capacidade</label>
          <input type="number" min="1" value={data.capacidade} onChange={(e) => onChange({ ...data, capacidade: e.target.value })}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Taxa Reserva (R$)</label>
          <input type="number" min="0" step="0.01" value={data.taxaReserva} onChange={(e) => onChange({ ...data, taxaReserva: e.target.value })}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Abertura</label>
          <select value={data.horarioInicio} onChange={(e) => onChange({ ...data, horarioInicio: e.target.value })}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none cursor-pointer">
            <option value="">Selecione</option>
            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Fechamento</label>
          <select value={data.horarioFim} onChange={(e) => onChange({ ...data, horarioFim: e.target.value })}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none cursor-pointer">
            <option value="">Selecione</option>
            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl"><p className="text-xs text-red-700 font-bold">{error}</p></div>}
      <div className="flex gap-4 pt-4 pb-2">
        <button onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm py-4 rounded-2xl transition-all">Cancelar</button>
        <button onClick={onSubmit} className="flex-1 bg-accent hover:bg-accent/90 text-white font-bold text-sm py-4 rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95">{submitLabel}</button>
      </div>
    </div>
  );
}