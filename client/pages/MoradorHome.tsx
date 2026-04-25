import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getLocais,
  getReservas,
  getMeuPerfil,
  deletarReserva,
  criarReserva,
  atualizarReserva,
  atualizarUsuario,
  uploadFotoPerfil,
  alterarSenha,
  clearSession,
  BASE_URL
} from "@/services/api";
import { Users, Clock, Calendar, Menu, X, LogOut, Settings, User, Camera, Lock, ChevronLeft } from "lucide-react";
import type { UsuarioDTOResponse, LocalDTOResponse, ReservaDTOResponse } from "@/services/types";

type ActiveTab = "locais" | "reservas" | "perfil";

export default function ResidentHome() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>("locais");
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioDTOResponse | null>(null);
  const [reservas, setReservas] = useState<ReservaDTOResponse[]>([]);
  const [selectedReserva, setSelectedReserva] = useState<ReservaDTOResponse | null>(null);
  const [showEditReservation, setShowEditReservation] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [loadingSenha, setLoadingSenha] = useState(false);
  const [locaisDB, setLocaisDB] = useState<LocalDTOResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [showMakeReservation, setShowMakeReservation] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReservaForCancel, setSelectedReservaForCancel] = useState<ReservaDTOResponse | null>(null);
  const [filtroData, setFiltroData] = useState("");

  const [formData, setFormData] = useState({ facilityId: "", date: "", startTime: "", endTime: "" });
  const [editForm, setEditForm] = useState({ 
    nome: "", email: "", telefone: "",
    senhaAtual: "", novaSenha: "", confirmarSenha: "" 
  });

  useEffect(() => {
    if (activeTab === "perfil" && usuarioLogado) {
      setEditForm({
        nome: usuarioLogado.nome || "",
        email: usuarioLogado.email || "",
        telefone: usuarioLogado.telefone || "",
        senhaAtual: "",
        novaSenha: "",
        confirmarSenha: ""
      });
    }
  }, [activeTab, usuarioLogado]);

  const [editError, setEditError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    try {
      const [perfil, resList, locList] = await Promise.all([getMeuPerfil(), getReservas(), getLocais()]);
      setUsuarioLogado(perfil);
      setLocaisDB(locList || []);
      
      // Filtro mais robusto para evitar problemas de tipo (String vs Number)
      const minhasReservas = Array.isArray(resList) 
        ? resList.filter((r) => String(r?.morador?.id) === String(perfil?.id))
        : [];
        
      setReservas(minhasReservas);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

function prepararEdicao(res: ReservaDTOResponse) {
  setSelectedReserva(res);
  setFormData({
    facilityId: res.local.id.toString(),
    date: res.data,
    startTime: res.horaEntrada.substring(0, 5),
    endTime: res.horaSaida.substring(0, 5)
  });
  setShowEditReservation(true);
}



const handleUpdateReservation = async () => {
  if (!selectedReserva) return;
  try {
    await atualizarReserva(selectedReserva.id, {
      id_local: parseInt(formData.facilityId),
      id_morador: usuarioLogado!.id,
      data: formData.date,
      horaEntrada: formData.startTime + ":00",
      horaSaida: formData.endTime + ":00",
    });
    toast.success("Reserva atualizada com sucesso!");
    setShowEditReservation(false);
    setFormData({ facilityId: "", date: "", startTime: "", endTime: "" });
    carregarDados();
  } catch (err: any) {
    toast.error(err?.message || "Erro ao atualizar reserva.");
  }
};

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
    toast.success("Foto atualizada com sucesso!");
    carregarDados(); 
  } catch (err: any) {
    toast.error(err?.message || "Erro ao fazer upload da foto.");
  } finally {
    setUploadingFoto(false);
  }
}
  const handleMakeReservation = async () => {
    if (!formData.facilityId || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error("Preencha todos os campos da reserva.");
      return;
    }
    try {
      await criarReserva({
        id_local: parseInt(formData.facilityId),
        id_morador: usuarioLogado!.id,
        data: formData.date,
        horaEntrada: formData.startTime + ":00",
        horaSaida: formData.endTime + ":00",
      });
      toast.success("Reserva realizada com sucesso!");
      setShowMakeReservation(false);
      setFormData({ facilityId: "", date: "", startTime: "", endTime: "" });
      carregarDados();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar reserva.");
    }
  };

  async function handleSalvarPerfil() {
    if (!usuarioLogado?.id) return;
    setSavingProfile(true);
    setEditError("");
    try {
      // 1. Validar troca de senha se houver algo preenchido
      const trocandoSenha = editForm.novaSenha || editForm.senhaAtual || editForm.confirmarSenha;
      if (trocandoSenha) {
        if (!editForm.senhaAtual) throw new Error("Informe a senha atual para prosseguir.");
        if (editForm.novaSenha.length < 6) throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
        if (editForm.novaSenha !== editForm.confirmarSenha) throw new Error("As novas senhas não coincidem.");
      }

      // 2. Atualizar Dados do Perfil
      const payload = {
        nome: editForm.nome.trim(),
        email: editForm.email.trim(),
        cpf: usuarioLogado.cpf,
        telefone: editForm.telefone.trim() || undefined,
        roles: usuarioLogado.roles || ["MORADOR"]
      };

      await atualizarUsuario(usuarioLogado.id, payload);

      // 3. Atualizar Senha se necessário
      if (trocandoSenha) {
        await alterarSenha({ 
          senhaAtual: editForm.senhaAtual, 
          novaSenha: editForm.novaSenha 
        });
        setEditForm(prev => ({ ...prev, senhaAtual: "", novaSenha: "", confirmarSenha: "" }));
      }

      toast.success("Perfil e segurança atualizados!");
      setShowSidebar(false);
      carregarDados();
    } catch (err: any) {
      setEditError(err?.message || "Erro ao salvar alterações.");
    } finally {
      setSavingProfile(false);
    }
  }

  function handleSignOut() { clearSession(); navigate("/"); }

  const NavItem = ({ id, label, icon: Icon }: { id: ActiveTab, label: string, icon: any }) => (
    <button
      onClick={() => { setActiveTab(id); setShowSidebar(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        activeTab === id 
        ? "bg-accent text-white shadow-lg shadow-accent/20 font-bold" 
        : "text-gray-500 hover:bg-gray-100 font-medium"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  const hojeString = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

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
            <p className="text-[10px] font-bold text-accent uppercase">{usuarioLogado?.roles?.[0] || 'Morador'}</p>
          </div>

          {/* Drawer Links */}
          <nav className="flex-1 p-4 space-y-2 mt-4">
            <NavItem id="perfil" label="Alterações de Perfil" icon={Settings} />
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

      {/* Header */}
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

              <h1 className="text-lg font-bold text-gray-900 truncate sm:text-2xl">Portal do Morador</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Horizontal Navigation (Fallback for quick access) */}
        {activeTab !== "perfil" && (
          <div className="flex gap-2 mb-10 border-b border-gray-200 overflow-x-auto pb-px">
            {(["locais", "reservas"] as ActiveTab[]).map((tab) => {
              const labels: Record<ActiveTab, string> = {
                locais: `Ambientes`,
                reservas: `Reservas`,
                perfil: `Perfil`
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab ? "border-accent text-accent" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "locais" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {locaisDB.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-400">Nenhum local disponível no momento.</p>
              </div>
            ) : (
              locaisDB.map((local) => (
                <div key={local.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-accent/30 transition-all duration-300 flex flex-col">
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    <img 
                      src={local.fotoUrl ? (local.fotoUrl.startsWith('http') ? local.fotoUrl : `${BASE_URL}${local.fotoUrl}`) : "/icone.png"} 
                      alt={local.nome} 
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${!local.fotoUrl && "p-12 opacity-20"}`}
                    />
                    <div className="absolute top-3 right-3">
                      <span className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-accent shadow-sm">
                        R$ {local.taxaReserva.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-accent transition-colors">{local.nome}</h3>
                    <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      {local.localizacao}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                        <Users className="w-4 h-4 text-accent" />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Capacidade</span>
                          <span className="text-xs font-bold text-gray-700">{local.capacidade} <span className="font-normal text-[10px]">pessoas</span></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                        <Clock className="w-4 h-4 text-accent" />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Disponível</span>
                          <span className="text-xs font-bold text-gray-700">{local.horarioInicio.substring(0, 5)} - {local.horarioFim.substring(0, 5)}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setFormData({ 
                          facilityId: local.id.toString(), 
                          date: "", 
                          startTime: local.horarioInicio.substring(0, 5), 
                          endTime: local.horarioFim.substring(0, 5) 
                        });
                        setShowMakeReservation(true);
                      }}
                      className="w-full mt-auto bg-accent hover:bg-accent/90 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-accent/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Reservar Espaço
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "reservas" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900">Minhas Reservas ({reservas.filter(r => !filtroData || r.data === filtroData).length})</h2>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">Filtrar por data:</label>
                <input 
                  type="date" 
                  value={filtroData} 
                  onChange={(e) => setFiltroData(e.target.value)} 
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent" 
                />
                {filtroData && <button onClick={() => setFiltroData("")} className="text-xs text-gray-500 hover:text-red-500">Limpar</button>}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                {reservas.filter(r => !filtroData || r.data === filtroData).length === 0 ? (
                  <div className="p-20 text-center">
                    <p className="text-gray-400 italic">Nenhuma reserva encontrada{filtroData ? ' para esta data' : ''}.</p>
                    <button onClick={() => setActiveTab("locais")} className="mt-4 bg-accent hover:bg-accent/90 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors">
                      Ver Locais Disponíveis
                    </button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Local</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Horário</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reservas.filter(r => !filtroData || r.data === filtroData).map((res) => (
                        <tr key={res.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-gray-900 group-hover:text-accent transition-colors">{res.local?.nome}</div>
                            <div className="text-[10px] text-gray-500 font-medium">{res.local?.localizacao}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                            {new Date((res.data as string) + "T00:00:00").toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                            {res.horaEntrada?.substring(0, 5)} - {res.horaSaida?.substring(0, 5)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
                              ${res.status === "APROVADA" ? "bg-green-100 text-green-700" 
                              : res.status === "CANCELADA" ? "bg-red-100 text-red-700" 
                              : "bg-yellow-100 text-yellow-700"}`}>
                              {res.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              {(res.status !== "CANCELADA" && (!res.data || res.data >= hojeString)) && (
                                <>
                                  <button onClick={() => prepararEdicao(res)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-50" title="Editar">
                                    <span className="text-xs font-bold uppercase tracking-wider">Editar</span>
                                  </button>
                                  <button 
                                    onClick={() => { 
                                      setSelectedReservaForCancel(res);
                                      setShowCancelModal(true);
                                    }} 
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-50"
                                    title="Cancelar"
                                  >
                                    <span className="text-xs font-bold uppercase tracking-wider">Cancelar</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "perfil" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto relative">
            
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
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="text-white w-8 h-8" />
                  </div>
                  <input type="file" id="foto-upload-page" hidden accept="image/*" onChange={handleTrocarFoto} disabled={uploadingFoto} />
                  <label htmlFor="foto-upload-page" className="absolute inset-0 cursor-pointer" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Toque para alterar a foto</p>
              </div>
            </div>

            <div className="space-y-8">
              <section>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-600 uppercase ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      value={editForm.nome} 
                      onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} 
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" 
                      placeholder="Ex: Maria Silva" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-600 uppercase ml-1">E-mail</label>
                      <input 
                        type="email" 
                        value={editForm.email} 
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" 
                        placeholder="seu@email.com" 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-600 uppercase ml-1">Telefone</label>
                      <input 
                        type="tel" 
                        value={editForm.telefone} 
                        onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} 
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" 
                        placeholder="(00) 00000-0000" 
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-600 uppercase ml-1">Senha Atual</label>
                    <input 
                      type="password" 
                      value={editForm.senhaAtual} 
                      onChange={(e) => setEditForm({ ...editForm, senhaAtual: e.target.value })} 
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" 
                      placeholder="••••••••" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-600 uppercase ml-1">Nova Senha</label>
                    <input 
                      type="password" 
                      value={editForm.novaSenha} 
                      onChange={(e) => setEditForm({ ...editForm, novaSenha: e.target.value })} 
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" 
                      placeholder="••••••••" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-600 uppercase ml-1">Confirmar Nova Senha</label>
                    <input 
                      type="password" 
                      value={editForm.confirmarSenha} 
                      onChange={(e) => setEditForm({ ...editForm, confirmarSenha: e.target.value })} 
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 italic ml-1">* Preencha os campos acima apenas se desejar alterar sua senha de acesso.</p>
              </section>

              <div className="pt-8 flex flex-col sm:flex-row items-center justify-end gap-4 sm:gap-6">
                {editError && <p className="text-xs text-red-500 font-bold">{editError}</p>}
                
                <button 
                  onClick={() => setActiveTab("locais")}
                  className="w-full sm:w-auto px-8 py-5 bg-white border border-gray-200 text-gray-600 rounded-2xl text-xs font-bold uppercase hover:bg-gray-50 hover:text-accent hover:border-accent transition-all active:scale-95"
                >
                  Voltar
                </button>

                <button 
                  onClick={() => handleSalvarPerfil()} 
                  disabled={savingProfile}
                  className="w-full sm:w-auto px-12 py-5 bg-accent text-white rounded-2xl text-sm font-bold uppercase hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 active:scale-95 disabled:opacity-50"
                >
                  {savingProfile ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {(showMakeReservation || showEditReservation) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                {showEditReservation ? "Editar Reserva" : "Reservar Espaço"}
              </h3>
              <button 
                onClick={() => { setShowMakeReservation(false); setShowEditReservation(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Local Selecionado</label>
                <select 
                  value={formData.facilityId} 
                  onChange={e => setFormData({...formData, facilityId: e.target.value})} 
                  className="w-full px-0 bg-transparent border-none text-gray-900 font-bold focus:ring-0 text-lg cursor-pointer appearance-none"
                >
                  <option value="" disabled>Escolha um local...</option>
                  {locaisDB.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </select>
                {formData.facilityId && (
                  <p className="text-[10px] text-accent font-bold mt-1">
                    {locaisDB.find(l => l.id.toString() === formData.facilityId)?.horarioInicio.substring(0,5)} às {locaisDB.find(l => l.id.toString() === formData.facilityId)?.horarioFim.substring(0,5)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Data da Reserva</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-accent outline-none transition-all shadow-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Entrada</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="time" 
                      value={formData.startTime} 
                      onChange={e => setFormData({...formData, startTime: e.target.value})} 
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-accent outline-none transition-all shadow-sm" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Saída</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="time" 
                      value={formData.endTime} 
                      onChange={e => setFormData({...formData, endTime: e.target.value})} 
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-accent outline-none transition-all shadow-sm" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button 
                  onClick={() => { setShowMakeReservation(false); setShowEditReservation(false); }} 
                  className="flex-1 py-3.5 bg-gray-50 text-gray-500 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={showEditReservation ? handleUpdateReservation : handleMakeReservation} 
                  className="flex-[2] py-3.5 bg-accent text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 active:scale-[0.98]"
                >
                  {showEditReservation ? "Salvar Alterações" : "Confirmar Reserva"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && selectedReservaForCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cancelar Reserva?</h3>
              <p className="text-sm text-gray-500 px-4">
                Tem certeza que deseja cancelar sua reserva no(a) <strong>{selectedReservaForCancel.local?.nome}</strong> para o dia {new Date((selectedReservaForCancel.data as string) + "T00:00:00").toLocaleDateString("pt-BR")}?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelModal(false)} 
                className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors"
                disabled={loading}
              >
                Voltar
              </button>
              <button 
                onClick={async () => {
                  try {
                    setLoading(true);
                    await deletarReserva(selectedReservaForCancel.id!);
                    toast.success("Reserva cancelada com sucesso.");
                    setShowCancelModal(false);
                    carregarDados();
                  } catch (e: any) {
                    toast.error(e?.message || "Erro ao cancelar.");
                  } finally {
                    setLoading(false);
                  }
                }} 
                className="flex-[1.5] py-3 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Cancelando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
