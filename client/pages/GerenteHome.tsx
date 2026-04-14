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
} from "@/services/api";
import type {
  UnidadeDTOResponse,
  UsuarioDTOResponse
} from "@/services/types";

export default function ManagerHome() {
  const navigate = useNavigate();

  // ─── STADOS ──────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioDTOResponse | null>(null);

  const [unidades, setUnidades] = useState<UnidadeDTOResponse[]>([]);
  const [moradores, setMoradores] = useState<UsuarioDTOResponse[]>([]);

  const [activeTab, setActiveTab] = useState<"units">("units");
  const [selectedUnidade, setSelectedUnidade] = useState<UnidadeDTOResponse | null>(null);

  // ─── MENUS E MODAIS ──────────────────────────────────
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

  // Helper Errors
  const [actionError, setActionError] = useState("");

  // ─── CARREGAMENTO INICIAL ────────────────────────────
  useEffect(() => {
    carregarTudo();
  }, []);

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
      setMoradores(resUsuarios?.filter((u) => u.roles?.includes("MORADOR")) || []);
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

  async function handleUpdateProfile() {
    if (!usuarioLogado) return;
    setSavingProfile(true);
    setActionError("");
    try {
      const payload = {
        nome: editProfileForm.nome.trim(),
        email: editProfileForm.email.trim(),
        cpf: usuarioLogado.cpf,
        telefone: editProfileForm.telefone.trim() || null,
        roles: usuarioLogado.roles || ["GERENTE"]
      };
      await atualizarUsuario(usuarioLogado.id!, payload);
      toast.success("Perfil do Gerente atualizado!");
      setShowEditProfileModal(false);
      carregarTudo();
    } catch (err: any) {
      setActionError(err.message || "Falha ao salvar dados do perfil");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    setActionError("");
    if (!passwordForm.atual || !passwordForm.nova || !passwordForm.confirmacao) {
      setActionError("Preencha todos os campos."); return;
    }
    if (passwordForm.nova.length < 6) {
      setActionError("A nova senha deve ter pelo menos 6 caracteres."); return;
    }
    if (passwordForm.nova !== passwordForm.confirmacao) {
      setActionError("As senhas não coincidem."); return;
    }

    try {
      await alterarSenha({ senhaAtual: passwordForm.atual, novaSenha: passwordForm.nova });
      toast.success("Senha alterada com sucesso!");
      setShowChangePasswordModal(false);
      setPasswordForm({ atual: "", nova: "", confirmacao: "" });
    } catch (err: any) {
      setActionError(err.message || "Falha ao alterar senha.");
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
      await deletarUnidade(selectedUnidade.id);
      toast.success("Unidade removida com sucesso.");
      setShowDeleteUnitModal(false);
      setSelectedUnidade(null);
      carregarTudo();
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
      setActionError("Limite atingido! Esta unidade já possui 2 moradores mapeados.");
      return;
    }

    try {
      const resp = await criarUsuario({
        nome: residentFormData.nome,
        email: residentFormData.email,
        cpf: residentFormData.cpf,
        telefone: residentFormData.telefone || undefined,
        id_unidade: tIdUnidade,
        roles: ["MORADOR"]
      });

      setSenhaGerada(resp.senha ?? "");
      carregarTudo();
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

    try {
      await atualizarUsuario(selectedResident.id, {
        nome: residentFormData.nome,
        email: residentFormData.email,
        cpf: residentFormData.cpf,
        telefone: residentFormData.telefone || undefined,
        id_unidade: tIdUnidade,
        roles: ["MORADOR"]
      });
      toast.success("Morador atualizado.");
      setShowEditResidentModal(false);
      carregarTudo();
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
      carregarTudo();
    } catch (err: any) {
      toast.error(err.message || "Falha ao excluir.");
    }
  }

  // ─── UI SCREENS ──────────────────────────────────────

  if (loading && !usuarioLogado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Carregando informações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8 sm:py-6">
          <div className="flex items-center justify-between gap-3">

            {/* Header / Config Gerente */}
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
                        className={`w-full h-full object-cover bg-white ${uploadingFoto ? 'opacity-30' : ''}`}
                        alt="Perfil"
                      />
                      {uploadingFoto && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {!uploadingFoto && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-[10px] font-bold opacity-0 hover:opacity-100 cursor-pointer transition-opacity leading-tight">
                          <input type="file" accept="image/*" className="hidden" onChange={handleTrocarFoto} />
                          ALTERAR<br/>FOTO
                        </label>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{usuarioLogado?.nome}</h3>
                    <p className="text-xs font-semibold text-accent uppercase tracking-wider">{usuarioLogado?.roles?.[0]}</p>
                  </div>
                  <div className="p-3 bg-gray-50 flex flex-col gap-2">
                    <button
                      onClick={openEditProfile}
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

              <h1 className="text-lg font-bold text-gray-900 truncate sm:text-2xl">
                Portal do Gerente
              </h1>
            </div>

            {/* Actions globais */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setResidentFormData({ nome: "", email: "", cpf: "", telefone: "", id_unidade: "" });
                  setActionError("");
                  setShowAddResidentModal(true);
                }}
                className="bg-accent hover:bg-accent/90 text-white font-medium text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Adicionar Morador
              </button>
              <button
                onClick={handleSignOut}
                className="text-accent hover:text-accent/80 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 sm:py-12">
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("units")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === "units" ? "border-accent text-accent" : "border-transparent text-gray-600 hover:text-gray-900"}`}
          >
            Unidades Residenciais ({unidades.length})
          </button>
        </div>

        {/* ===================== VIEW UNITS / LIST ===================== */}
        {activeTab === "units" && !selectedUnidade && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {unidades.map((unit) => {
                const ativos = getMoradoresPorUnidade(unit.id!).length;
                return (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedUnidade(unit)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-all cursor-pointer hover:border-accent"
                  >
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Bloco {unit.bloco}</p>
                    <p className="text-3xl font-black text-gray-800 mb-3"># {unit.apartamento}</p>
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

            <button
              onClick={() => { setUnitFormData({ bloco: "", apartamento: "" }); setActionError(""); setShowAddUnitModal(true); }}
              className="w-full bg-accent hover:bg-accent/90 text-white font-medium text-sm py-3 rounded-lg transition-colors border border-transparent"
            >
              Adicionar Nova Unidade
            </button>
          </div>
        )}

        {/* ===================== VIEW INSIDE SELECTED UNIT ===================== */}
        {activeTab === "units" && selectedUnidade && (
          <div className="space-y-4 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedUnidade(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-sm rounded-lg transition-colors">
                  &lt; Voltar
                </button>
                <h2 className="text-2xl font-bold text-gray-900">Bloco {selectedUnidade.bloco} - Apt {selectedUnidade.apartamento}</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setUnitFormData({ bloco: selectedUnidade.bloco || "", apartamento: selectedUnidade.apartamento || "" });
                    setActionError("");
                    setShowEditUnitModal(true);
                  }}
                  className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-semibold"
                >
                  Editar Dados
                </button>
                <button
                  onClick={() => setShowDeleteUnitModal(true)}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold"
                >
                  Deletar Unidade
                </button>
              </div>
            </div>

            {getMoradoresPorUnidade(selectedUnidade.id!).length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center ring-1 ring-inset ring-gray-100">
                <p className="text-gray-500 text-sm mb-4">A unidade está desocupada.</p>
                <button
                  onClick={() => {
                    setResidentFormData({ nome: "", email: "", cpf: "", telefone: "", id_unidade: selectedUnidade.id!.toString() });
                    setActionError("");
                    setShowAddResidentModal(true);
                  }}
                  className="bg-accent text-white font-bold text-sm px-6 py-2.5 rounded-lg inline-block hover:opacity-90 transition-opacity"
                >
                  Adicionar Morador
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-white rounded-t-lg shadow-sm border-b border-gray-100 px-6 py-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase">Moradores</h3>
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
                        <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Perfil Registrado</th>
                        <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Contato / Credenciais</th>
                        <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Definições</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortResidents(getMoradoresPorUnidade(selectedUnidade.id!), residentSortBy).map((resident) => (
                        <tr key={resident.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                              <img src={resident.foto || "/icone.png"} className="w-full h-full object-cover" alt="" />
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
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedResident(resident);
                                  setResidentFormData({
                                    nome: resident.nome!, email: resident.email!, cpf: resident.cpf || "", telefone: resident.telefone || "", id_unidade: resident.unidade?.id?.toString() || ""
                                  });
                                  setActionError("");
                                  setShowEditResidentModal(true);
                                }}
                                className="bg-white border border-gray-200 hover:border-blue-400 text-blue-600 font-bold text-xs py-2 px-4 rounded transition-all"
                              >
                                Alterar
                              </button>
                              <button
                                onClick={() => { setSelectedResident(resident); setShowDeleteResidentModal(true); }}
                                className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs py-2 px-4 rounded transition-colors border border-red-100"
                              >
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Footer Adicionar caso < 2 */}
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    {getMoradoresPorUnidade(selectedUnidade.id!).length < 2 ? (
                      <button
                        onClick={() => {
                          setResidentFormData({ nome: "", email: "", cpf: "", telefone: "", id_unidade: selectedUnidade.id!.toString() });
                          setActionError("");
                          setShowAddResidentModal(true);
                        }}
                        className="w-full text-center border-2 border-dashed border-gray-300 hover:border-accent text-gray-500 hover:text-accent font-bold text-sm py-3 rounded-lg transition-colors cursor-pointer"
                      >
                        Incluir Morador
                      </button>
                    ) : (
                      <p className="w-full text-center text-xs font-bold text-gray-400 uppercase tracking-widest py-3">Lotação Máxima Atingida (2/2)</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ================= MODAIS ================= */}

      {/* Add / Edit UNIDADE */}
      {(showAddUnitModal || showEditUnitModal) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 my-8 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {showAddUnitModal ? "Criar Unidade" : "Editar Unidade"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Bloco</label>
                <input type="text" value={unitFormData.bloco} onChange={(e) => setUnitFormData({ ...unitFormData, bloco: e.target.value })} placeholder="Ex: A" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide"> N° Apartamento </label>
                <input type="text" value={unitFormData.apartamento} onChange={(e) => setUnitFormData({ ...unitFormData, apartamento: e.target.value })} placeholder="Ex: 101" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>

              {actionError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-xs text-red-700 font-medium">{actionError}</p></div>}

              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowAddUnitModal(false); setShowEditUnitModal(false); }} className="flex-[1] bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-sm py-3 rounded-lg">Voltar</button>
                <button onClick={showAddUnitModal ? handleAddUnidade : handleEditUnidade} className="flex-[2] bg-accent hover:opacity-90 text-white font-bold text-sm py-3 rounded-lg">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete UNIDADE */}
      {showDeleteUnitModal && selectedUnidade && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Atenção</h3>
            <p className="text-sm text-gray-600 mb-6">Excluir Bloco {selectedUnidade.bloco} Apt {selectedUnidade.apartamento} permanentemente?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteUnitModal(false)} className="flex-1 bg-gray-100 text-gray-900 font-bold py-3 rounded-lg">Voltar</button>
              <button onClick={handleDeleteUnidade} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700">Deletar</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit MORADOR */}
      {(showAddResidentModal || showEditResidentModal) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 my-8 shadow-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {showAddResidentModal ? "Matricular Morador" : "Modificar Ficha do Morador"}
            </h3>

            {senhaGerada ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm font-bold text-green-900 mb-2">Morador cadastrado com sucesso!</p>
                  <p className="text-xs text-green-700 mb-4">Anote a senha provisória gerada:</p>
                  <div className="bg-white border border-green-200 p-4 rounded-lg shadow-sm">
                    <code className="text-2xl font-black text-green-600 tracking-widest">{senhaGerada}</code>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAddResidentModal(false); setSenhaGerada(""); }}
                  className="w-full bg-accent text-white font-bold text-sm py-3 rounded-lg mt-4 shadow-lg shadow-accent/30 hover:opacity-90 transition-opacity"
                >
                  Concluir
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Nome Completo</label>
                    <input type="text" value={residentFormData.nome} onChange={(e) => setResidentFormData({ ...residentFormData, nome: e.target.value })} placeholder="Jose Fernandes Da Silva" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">E-mail</label>
                      <input type="email" value={residentFormData.email} onChange={(e) => setResidentFormData({ ...residentFormData, email: e.target.value })} placeholder="usuario@condominio.com" disabled={showEditResidentModal} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">CPF</label>
                      <input type="text" value={residentFormData.cpf} onChange={(e) => setResidentFormData({ ...residentFormData, cpf: e.target.value })} placeholder="000.000.000-00" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Telefone (Opcional)</label>
                    <input type="text" value={residentFormData.telefone} onChange={(e) => setResidentFormData({ ...residentFormData, telefone: e.target.value })} placeholder="(00) 90000-0000" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>

                  {/* UNIDADE SELECTOR */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide border-t border-gray-100 pt-4">Unidade</label>
                    <select
                      value={residentFormData.id_unidade}
                      onChange={(e) => setResidentFormData({ ...residentFormData, id_unidade: e.target.value })}
                      className="w-full px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg text-sm font-bold text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                    >
                      <option value="">Selecione</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>Bloco {u.bloco} - Apto {u.apartamento}</option>
                      ))}
                    </select>
                  </div>

                  {actionError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
                      <p className="text-xs text-red-700 font-semibold">{actionError}</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => { setShowAddResidentModal(false); setShowEditResidentModal(false); setSenhaGerada(""); }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm py-3 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={showAddResidentModal ? handleAddResident : handleEditResident}
                    className="flex-[2] bg-accent hover:opacity-90 text-white font-bold text-sm py-3 rounded-lg transition-colors shadow-lg shadow-accent/30"
                  >
                    Salvar Cadastro
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete MORADOR */}
      {showDeleteResidentModal && selectedResident && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center border-t-4 border-red-500">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Morador</h3>
            <p className="text-sm text-gray-600 mb-6">Esta operação cancelará todo o vínculo e reservas do morador <b>{selectedResident.nome}</b>. Confirmar?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteResidentModal(false)} className="flex-1 bg-gray-100 text-gray-900 font-bold py-3 rounded-lg">Cancelar</button>
              <button onClick={handleDeleteResident} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT GERENTE Perfil Modals */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Dados do Gerente</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Nome</label>
                <input type="text" value={editProfileForm.nome} onChange={(e) => setEditProfileForm({ ...editProfileForm, nome: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">E-mail Corporativo</label>
                <input type="email" value={editProfileForm.email} disabled className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Telefone Comercial</label>
                <input type="tel" value={editProfileForm.telefone} onChange={(e) => setEditProfileForm({ ...editProfileForm, telefone: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              {actionError && <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">{actionError}</p>}
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowEditProfileModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 font-medium text-sm py-2.5 rounded-lg transition-colors">Voltar</button>
                <button onClick={handleUpdateProfile} disabled={savingProfile} className="flex-[2] bg-accent hover:opacity-90 text-white font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60">
                  {savingProfile ? "Salvando..." : "Atualizar Cadastro"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Alterar Senha de Acesso</h3>
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Senha Atual</label>
                <input type="password" value={passwordForm.atual} onChange={(e) => setPasswordForm({ ...passwordForm, atual: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Nova Senha</label>
                <input type="password" value={passwordForm.nova} onChange={(e) => setPasswordForm({ ...passwordForm, nova: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Confirmar Senha</label>
                <input type="password" value={passwordForm.confirmacao} onChange={(e) => setPasswordForm({ ...passwordForm, confirmacao: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              {actionError && <p className="text-xs text-red-700 bg-red-50 p-2 rounded-lg">{actionError}</p>}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowChangePasswordModal(false)} className="flex-1 bg-gray-100 text-sm font-bold py-3 rounded-lg">Cancelar</button>
              <button onClick={handleChangePassword} className="flex-1 bg-accent text-white font-bold py-3 text-sm rounded-lg hover:opacity-90">Salvar Mudança</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
