import { useState, useEffect } from "react";
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
} from "@/services/api";
import type { UsuarioDTOResponse, LocalDTO, LocalDTOResponse, ReservaDTOResponse } from "@/services/types";
import { Users, Clock } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";

// ─── Tipos e constantes ────────────────────────────────────────────────────

type ActiveTab = "managers" | "syndics" | "reservations" | "areas" | "overview";

const emptyLocalForm = {
  nome: "", localizacao: "", capacidade: "1",
  duracao: "PT1H", taxaReserva: "0",
  horarioInicio: "", horarioFim: "",
  foto: null as File | null,
};

// ─── Componente principal ──────────────────────────────────────────────────

export default function OwnerHome() {
  const navigate = useNavigate();

  // ── Estado principal ──
  const [activeTab, setActiveTab] = useState<ActiveTab>("managers");
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioDTOResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Dados da API ──
  const [gerentes, setGerentes] = useState<UsuarioDTOResponse[]>([]);
  const [sindicos, setSindicos] = useState<UsuarioDTOResponse[]>([]);
  const [locais, setLocais] = useState<LocalDTOResponse[]>([]);
  const [reservas, setReservas] = useState<ReservaDTOResponse[]>([]);

  // ── Modais de usuário ──
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioDTOResponse | null>(null);
  const [userFormData, setUserFormData] = useState({ nome: "", email: "", cpf: "", telefone: "" });
  const [addingRole, setAddingRole] = useState<"GERENTE" | "SINDICO">("GERENTE");
  const [senhaGerada, setSenhaGerada] = useState("");

  // ── Modais de local ──
  const [showAddLocalModal, setShowAddLocalModal] = useState(false);
  const [showEditLocalModal, setShowEditLocalModal] = useState(false);
  const [showDeleteLocalModal, setShowDeleteLocalModal] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState<LocalDTOResponse | null>(null);
  const [localFormData, setLocalFormData] = useState(emptyLocalForm);

  // ── Modal de reserva ──
  const [showDeleteReservaModal, setShowDeleteReservaModal] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState<ReservaDTOResponse | null>(null);

  // ── Perfil ──
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ nome: "", email: "", telefone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ── Formulário ──
  const [formError, setFormError] = useState("");

  // ─── Carregamento inicial ──────────────────────────────────────────────

  useEffect(() => {
    carregarTudo();
  }, []);

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
      setGerentes(usuarios.filter((u) => u.roles?.some((r) => r.toUpperCase() === "GERENTE")));
      setSindicos(usuarios.filter((u) => u.roles?.some((r) => r.toUpperCase() === "SINDICO")));
      setLocais(locaisList);
      setReservas(reservasList);
    } catch (err) {
      toast.error("Erro ao sincronizar com o banco de dados.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Usuários ─────────────────────────────────────────────────────────

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
    try {
      const resp = await criarUsuario({
        nome: userFormData.nome,
        email: userFormData.email,
        cpf: userFormData.cpf,
        telefone: userFormData.telefone || null,
        roles: [addingRole],
      });
      setSenhaGerada(resp.senha ?? "");
      await carregarTudo();
      toast.success(`${addingRole === "GERENTE" ? "Gerente" : "Síndico"} criado com sucesso!`);
    } catch (err: any) {
      setFormError(err.message ?? "Erro ao salvar no banco.");
    }
  }

  async function handleEditUser() {
    if (!selectedUser) return;
    setFormError("");
    try {
      await atualizarUsuario(selectedUser.id, {
        nome: userFormData.nome,
        email: userFormData.email,
        cpf: userFormData.cpf,
        telefone: userFormData.telefone || null,
        roles: selectedUser.roles,
      });
      setShowEditUserModal(false);
      await carregarTudo();
      toast.success("Dados atualizados!");
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

  // ─── Locais ───────────────────────────────────────────────────────────

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

  // ─── Reservas ─────────────────────────────────────────────────────────

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

  // ─── Auth ─────────────────────────────────────────────────────────────

  function handleSignOut() {
    clearSession();
    navigate("/");
  }

  function handleChangePassword() {
    setPasswordError("");
    if (!newPassword || !confirmPassword) { setPasswordError("Preencha os dois campos."); return; }
    if (newPassword.length < 6) { setPasswordError("Mínimo 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("As senhas não coincidem."); return; }
    toast.success("Senha alterada com sucesso!");
    setShowChangePasswordModal(false);
    setNewPassword("");
    setConfirmPassword("");
  }

  function abrirEditProfile() {
    if (usuarioLogado) {
      setEditProfileForm({
        nome: usuarioLogado.nome || "",
        email: usuarioLogado.email || "",
        telefone: usuarioLogado.telefone || "",
      });
      setFormError("");
      setShowEditProfileModal(true);
      setShowProfileMenu(false);
    }
  }

  async function handleUpdateProfile() {
    if (!usuarioLogado) return;
    setSavingProfile(true);
    setFormError("");
    try {
      // O backend Java precisa do email ORIGINAL para rodar o findByEmail sem dar "Rejeitado"
      const payload = {
        nome: editProfileForm.nome.trim(),
        email: usuarioLogado.email, // Manda o original obrigatoriamente
        cpf: usuarioLogado.cpf,
        telefone: editProfileForm.telefone.trim() || null,
        roles: usuarioLogado.roles || ["SINDICO"]
      };
      
      await atualizarUsuario(usuarioLogado.id!, payload as any);

      setUsuarioLogado({ ...usuarioLogado, ...payload }); // Atualiza apenas os dados editáveis
      toast.success("Perfil atualizado com sucesso!");
      setShowEditProfileModal(false);
    } catch (err: any) {
      setFormError(err.message || "Erro ao atualizar Perfil");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      await uploadFotoPerfil(file);
      toast.success("Foto atualizada com sucesso!");
      // Atualiza o perfil sem recarregar tudo
      const novoPerfil = await getMeuPerfil();
      setUsuarioLogado(novoPerfil);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar foto.");
    } finally {
      setUploadingFoto(false);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  function formatarData(data: string) {
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
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

  // ─── Loading ──────────────────────────────────────────────────────────

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

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-accent rounded-lg flex-shrink-0 hover:bg-accent/90 transition-colors overflow-hidden"
              >
                <img src={usuarioLogado?.foto || "/icone.png"} className="w-full h-full object-cover bg-white" alt="Perfil" />
              </button>

              {showProfileMenu && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200 flex flex-col items-center text-center">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-accent mb-2 bg-gray-100">
                      <img
                        src={usuarioLogado?.foto || "/icone.png"}
                        className={`w-full h-full object-cover ${uploadingFoto ? 'opacity-30' : ''}`}
                        alt="Perfil"
                      />
                      {uploadingFoto && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {!uploadingFoto && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-[10px] font-bold opacity-0 hover:opacity-100 cursor-pointer transition-opacity leading-tight">
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadFoto} />
                          ALTERAR<br/>FOTO
                        </label>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{usuarioLogado?.nome}</h3>
                    <p className="text-xs font-semibold text-accent uppercase tracking-wider">{usuarioLogado?.roles?.[0]}</p>
                  </div>
                  <div className="p-3 bg-gray-50 flex flex-col gap-2">
                    <button
                      onClick={abrirEditProfile}
                      className="w-full bg-white border border-gray-200 hover:border-accent hover:text-accent text-gray-700 font-bold text-xs py-2.5 rounded-lg transition-colors"
                    >
                      Editar Dados do Perfil
                    </button>
                    <button
                      onClick={() => { setShowChangePasswordModal(true); setShowProfileMenu(false); }}
                      className="w-full bg-accent hover:bg-accent/90 text-white font-bold text-xs py-2.5 rounded-lg transition-colors"
                    >
                      Alterar Senha
                    </button>
                  </div>
                </div>
              )}

              <h1 className="text-lg font-bold text-gray-900 truncate sm:text-2xl">Portal do Síndico</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {activeTab === "managers" && (
                <button onClick={() => abrirAddUser("GERENTE")} className="bg-accent hover:bg-accent/90 text-white font-medium text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap">
                  Adicionar Gerente
                </button>
              )}
              {activeTab === "syndics" && (
                <button onClick={() => abrirAddUser("SINDICO")} className="bg-accent hover:bg-accent/90 text-white font-medium text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap">
                  Adicionar Síndico
                </button>
              )}
              {activeTab === "areas" && (
                <button onClick={() => { setLocalFormData(emptyLocalForm); setFormError(""); setShowAddLocalModal(true); }} className="bg-accent hover:bg-accent/90 text-white font-medium text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap">
                  Adicionar Área de Lazer
                </button>
              )}
              <button onClick={handleSignOut} className="text-accent hover:text-accent/80 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap">
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 sm:py-12">

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {(["managers", "syndics", "reservations", "areas", "overview"] as ActiveTab[]).map((tab) => {
            const labels: Record<ActiveTab, string> = {
              managers: `Gerentes (${gerentes.length})`,
              syndics: `Síndicos (${sindicos.length})`,
              reservations: `Reservas (${reservas.length})`,
              areas: `Áreas de Lazer (${locais.length})`,
              overview: "Overview",
            };
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab ? "border-accent text-accent" : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {activeTab === "managers" && (
          <TabelaUsuarios usuarios={gerentes} onEdit={abrirEditUser}
            onDelete={(u) => { setSelectedUser(u); setShowDeleteUserModal(true); }} />
        )}

        {activeTab === "syndics" && (
          <TabelaUsuarios usuarios={sindicos} onEdit={abrirEditUser}
            onDelete={(u) => { setSelectedUser(u); setShowDeleteUserModal(true); }} />
        )}

        {activeTab === "reservations" && (
          <div className="overflow-x-auto">
            {reservas.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-12">Nenhuma reserva encontrada.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Morador", "Local", "Data", "Hora", "Status", "Ações"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 sm:text-sm">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {r.morador?.nome}<br />
                        <span className="text-gray-500 text-xs">{r.morador?.email}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{r.local?.nome}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{formatarData(r.data)}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{formatarHora(r.horaEntrada as string)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badgeStatus(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button onClick={() => { setSelectedReserva(r); setShowDeleteReservaModal(true); }}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs py-1.5 px-3 rounded transition-colors">
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "areas" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {locais.length === 0 ? (
              <div className="col-span-full bg-white rounded-xl border border-gray-100 p-16 text-center">
                <p className="text-gray-400 italic">Nenhuma área cadastrada.</p>
                <button onClick={() => { setLocalFormData(emptyLocalForm); setFormError(""); setShowAddLocalModal(true); }} className="mt-4 bg-accent hover:bg-accent/90 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors">
                  Adicionar Lazer
                </button>
              </div>
            ) : (
              locais.map((l) => (
                <div key={l.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:border-accent hover:shadow-md transition-all flex flex-col">
                  <div className="w-full h-48 bg-gray-100 relative">
                    {/* Fallback pattern to user defaults properly mapped in DB fotoUrl */}
                    <img src={l.fotoUrl || "/icone.png"} alt={l.nome} className={`w-full h-full object-cover ${!l.fotoUrl && "p-6 opacity-30"}`} />
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="font-bold text-gray-900 text-lg">{l.nome}</h3>
                       <span className="bg-accent/10 text-accent text-xs font-bold px-2 py-1 rounded-lg">R$ {l.taxaReserva?.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{l.localizacao}</p>
                    <div className="space-y-2 mb-4 flex-1 mt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                        <Users className="w-4 h-4 text-accent" />
                        <span className="font-medium">Capacidade</span>
                        <span className="text-gray-900 font-bold ml-auto">{l.capacidade} <span className="font-normal text-xs text-gray-500">pessoas</span></span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
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
        )}

        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Gerentes", value: gerentes.length, color: "text-blue-600" },
                { label: "Síndicos", value: sindicos.length, color: "text-purple-600" },
                { label: "Áreas de Lazer", value: locais.length, color: "text-orange-600" },
                { label: "Total de Reservas", value: reservas.length, color: "text-accent" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-center items-center text-center">
                  <span className={`text-3xl font-black ${color} mb-1`}>{value}</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* STATUS GRÁFICO (PIE) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6">Status das Reservas</h3>
                <div className="flex-1 min-h-[250px] relative">
                  {reservas.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm italic">Sem dados de reserva</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Aprovadas', value: reservas.filter(r => r.status === 'APROVADA').length, color: '#10b981' },
                            { name: 'Pendentes', value: reservas.filter(r => r.status === 'PENDENTE').length, color: '#f59e0b' },
                            { name: 'Canceladas', value: reservas.filter(r => r.status === 'CANCELADA').length, color: '#ef4444' },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {
                            [
                              { name: 'Aprovadas', value: reservas.filter(r => r.status === 'APROVADA').length, color: '#10b981' },
                              { name: 'Pendentes', value: reservas.filter(r => r.status === 'PENDENTE').length, color: '#f59e0b' },
                              { name: 'Canceladas', value: reservas.filter(r => r.status === 'CANCELADA').length, color: '#ef4444' },
                            ].filter(d => d.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))
                          }
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} Reservas`, 'Quantidade']} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* LOCAIS MAIS RESERVADOS GRÁFICO (BAR) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6">Reservas por Local</h3>
                <div className="flex-1 min-h-[250px] relative">
                  {reservas.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm italic">Sem dados de reserva</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(reservas.reduce((acc, r) => {
                          const localName = r.local?.nome || 'Desconhecido';
                          acc[localName] = (acc[localName] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)).map(([name, count]) => ({ name, Quantidade: count }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#F3F4F6'}} />
                        <Bar dataKey="Quantidade" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* ════ MODAIS ════ */}

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
            <button onClick={() => setShowDeleteUserModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-sm py-3 rounded-lg">Cancelar</button>
            <button onClick={handleDeleteUser} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-3 rounded-lg">Remover</button>
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
            <button onClick={() => setShowDeleteLocalModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-sm py-3 rounded-lg">Cancelar</button>
            <button onClick={handleDeleteLocal} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-3 rounded-lg">Remover</button>
          </div>
        </Modal>
      )}

      {showDeleteReservaModal && selectedReserva && (
        <Modal title="Cancelar Reserva?" onClose={() => setShowDeleteReservaModal(false)}>
          <p className="text-sm text-gray-600 mb-1">Morador: <strong>{selectedReserva.morador?.nome}</strong></p>
          <p className="text-sm text-gray-600 mb-4">Local: <strong>{selectedReserva.local?.nome}</strong> — {formatarData(selectedReserva.data as string)} às {formatarHora(selectedReserva.horaEntrada as string)}</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteReservaModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-sm py-3 rounded-lg">Voltar</button>
            <button onClick={handleCancelarReserva} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-3 rounded-lg">Cancelar Reserva</button>
          </div>
        </Modal>
      )}

      {showChangePasswordModal && (
        <Modal title="Alterar Senha" onClose={() => setShowChangePasswordModal(false)}>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Nova Senha</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Confirmar Senha</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            {passwordError && <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">{passwordError}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowChangePasswordModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-sm py-3 rounded-lg">Cancelar</button>
            <button onClick={handleChangePassword} className="flex-1 bg-accent hover:bg-accent/90 text-white font-medium text-sm py-3 rounded-lg">Alterar</button>
          </div>
        </Modal>
      )}

      {showEditProfileModal && (
        <Modal title="Editar Meu Perfil" onClose={() => setShowEditProfileModal(false)}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Nome</label>
              <input type="text" value={editProfileForm.nome} onChange={(e) => setEditProfileForm({ ...editProfileForm, nome: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">E-mail</label>
              <input type="email" value={editProfileForm.email} disabled className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Telefone</label>
              <input type="text" value={editProfileForm.telefone} onChange={(e) => setEditProfileForm({ ...editProfileForm, telefone: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="(00) 90000-0000" />
            </div>
            {formError && <p className="text-xs text-red-700 bg-red-50 p-2 rounded-lg">{formError}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowEditProfileModal(false)} className="flex-1 bg-gray-100 text-gray-900 font-bold py-3 rounded-lg hover:bg-gray-200">
              Descartar
            </button>
            <button onClick={handleUpdateProfile} disabled={savingProfile} className="flex-1 bg-accent text-white font-bold py-3 rounded-lg hover:bg-accent/90 disabled:opacity-50">
              {savingProfile ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-md w-full p-6 my-8">
        <h3 className="text-lg font-bold text-gray-900 mb-5">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function TabelaUsuarios({ usuarios, onEdit, onDelete }: {
  usuarios: UsuarioDTOResponse[];
  onEdit: (u: UsuarioDTOResponse) => void;
  onDelete: (u: UsuarioDTOResponse) => void;
}) {
  if (usuarios.length === 0) return <p className="text-gray-500 text-sm text-center py-12">Nenhum usuário encontrado.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Nome", "Email", "CPF", "Telefone", "Ações"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 sm:text-sm">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
              <td className="px-4 py-4 text-sm font-medium text-gray-900">{u.nome}</td>
              <td className="px-4 py-4 text-sm text-gray-600">{u.email}</td>
              <td className="px-4 py-4 text-sm text-gray-600">{u.cpf}</td>
              <td className="px-4 py-4 text-sm text-gray-600">{u.telefone ?? "—"}</td>
              <td className="px-4 py-4">
                <div className="flex gap-2">
                  <button onClick={() => onEdit(u)} className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-xs py-1.5 px-3 rounded transition-colors">Editar</button>
                  <button onClick={() => onDelete(u)} className="bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs py-1.5 px-3 rounded transition-colors">Remover</button>
                </div>
              </td>
            </tr>
          ))}
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
    <div className="space-y-4">
      {[
        { label: "Nome Completo", key: "nome", type: "text", placeholder: "João Silva" },
        { label: "Email", key: "email", type: "email", placeholder: "joao@email.com" },
        { label: "CPF", key: "cpf", type: "text", placeholder: "000.000.000-00" },
        { label: "Telefone", key: "telefone", type: "text", placeholder: "(84) 99999-9999" },
      ].map(({ label, key, type, placeholder }) => (
        <div key={key}>
          <label className="block text-xs font-semibold text-gray-700 mb-2">{label}</label>
          <input type={type} value={(data as any)[key]} placeholder={placeholder}
            onChange={(e) => onChange({ ...data, [key]: e.target.value })}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all" />
        </div>
      ))}
      {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-sm py-3 rounded-lg">Cancelar</button>
        <button onClick={onSubmit} className="flex-1 bg-accent hover:bg-accent/90 text-white font-medium text-sm py-3 rounded-lg">{submitLabel}</button>
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
  const TIME_SLOTS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00"];
  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Nome</label>
        <input type="text" value={data.nome} onChange={(e) => onChange({ ...data, nome: e.target.value })}
          placeholder="Piscina" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Localização</label>
        <input type="text" value={data.localizacao} onChange={(e) => onChange({ ...data, localizacao: e.target.value })}
          placeholder="Térreo" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Imagem do Local</label>
        <input type="file" accept="image/*" onChange={(e) => onChange({ ...data, foto: e.target.files?.[0] || null })}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Capacidade</label>
          <input type="number" min="1" value={data.capacidade} onChange={(e) => onChange({ ...data, capacidade: e.target.value })}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Taxa de Reserva (R$)</label>
          <input type="number" min="0" step="0.01" value={data.taxaReserva} onChange={(e) => onChange({ ...data, taxaReserva: e.target.value })}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Abertura</label>
          <select value={data.horarioInicio} onChange={(e) => onChange({ ...data, horarioInicio: e.target.value })}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <option value="">Selecione</option>
            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Fechamento</label>
          <select value={data.horarioFim} onChange={(e) => onChange({ ...data, horarioFim: e.target.value })}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <option value="">Selecione</option>
            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-sm py-3 rounded-lg">Cancelar</button>
        <button onClick={onSubmit} className="flex-1 bg-accent hover:bg-accent/90 text-white font-medium text-sm py-3 rounded-lg">{submitLabel}</button>
      </div>
    </div>
  );
}
