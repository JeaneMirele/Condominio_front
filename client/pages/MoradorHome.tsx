import { useState, useEffect, useRef } from "react";
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
  getHorariosDoLocal,
  BASE_URL
} from "@/services/api";
import { Users, Clock, Calendar, Menu, X, LogOut, Settings, Camera, Eye, EyeOff, History } from "lucide-react";
import type { UsuarioDTOResponse, LocalDTOResponse, ReservaDTOResponse } from "@/services/types";

type ActiveTab = "locais" | "reservas" | "perfil";

export default function ResidentHome() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>("locais");
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioDTOResponse | null>(null);
  const [reservas, setReservas] = useState<ReservaDTOResponse[]>([]);
  const [todasReservas, setTodasReservas] = useState<ReservaDTOResponse[]>([]);
  const [horariosOcupadosBackend, setHorariosOcupadosBackend] = useState<string[]>([]);
  const [selectedReserva, setSelectedReserva] = useState<ReservaDTOResponse | null>(null);
  const [showEditReservation, setShowEditReservation] = useState(false);

  const [locaisDB, setLocaisDB] = useState<LocalDTOResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [showMakeReservation, setShowMakeReservation] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReservaForCancel, setSelectedReservaForCancel] = useState<ReservaDTOResponse | null>(null);
  const [filtroData, setFiltroData] = useState("");
  const [filtroLocal, setFiltroLocal] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
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
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  useEffect(() => { carregarDados(); }, []);

  useEffect(() => {
    if (formData.facilityId && formData.date) {
      getHorariosDoLocal(Number(formData.facilityId), formData.date)
        .then(res => {
          if (Array.isArray(res)) {
            const ocupados: string[] = [];
            res.forEach(item => {
              if (Array.isArray(item) && typeof item[0] === 'string') {
                const start = item[0].substring(0, 5);
                const end = item[1].substring(0, 5);

                const hStart = parseInt(start.split(":")[0]);
                const hEnd = parseInt(end.split(":")[0]);
                for (let h = hStart; h < hEnd; h++) {
                  ocupados.push(`${h.toString().padStart(2, '0')}:00`);
                }
              }
            });
            setHorariosOcupadosBackend(ocupados);
          }
        })
        .catch(err => console.error("Erro", err));
    } else {
      setHorariosOcupadosBackend([]);
    }
  }, [formData.facilityId, formData.date]);

  async function carregarDados() {
    try {
      const [perfil, resList, locList] = await Promise.all([getMeuPerfil(), getReservas(), getLocais()]);
      setUsuarioLogado(perfil);
      setLocaisDB(locList || []);

      const minhasReservas = Array.isArray(resList)
        ? resList.filter((r) => String(r?.morador?.id) === String(perfil?.id))
        : [];

      setReservas(minhasReservas);
      setTodasReservas(Array.isArray(resList) ? resList : []);
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
      date: res.data as string,
      startTime: (res.horaEntrada as string).substring(0, 5),
      endTime: (res.horaSaida as string).substring(0, 5)
    });
    setShowEditReservation(true);
  }

  const handleUpdateReservation = async () => {
    if (!selectedReserva) return;
    try {
      await atualizarReserva(selectedReserva.id!, {
        id_local: parseInt(formData.facilityId),
        id_morador: usuarioLogado!.id!,
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
      toast.error("Carregue uma imagem com menos mbs");
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

  const getHorarios = () => {
    if (!formData.facilityId) return [];
    const local = locaisDB.find(l => l.id?.toString() === formData.facilityId);
    if (!local) return [];

    const inicioStr = local.horarioInicio || "08:00";
    const fimStr = local.horarioFim || "22:00";

    const startHour = parseInt(inicioStr.split(":")[0]);
    const endHour = parseInt(fimStr.split(":")[0]);

    const horarios = [];
    for (let h = startHour; h <= endHour; h++) {
      horarios.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return horarios;
  };

  const getHorariosEntradaDisponiveis = () => {
    const todosHorarios = getHorarios();
    if (todosHorarios.length > 0) todosHorarios.pop();

    if (!formData.date) return todosHorarios;

    const reservasDoDia = todasReservas.filter(r =>
      r.local?.id?.toString() === formData.facilityId &&
      r.data === formData.date &&
      r.status !== "CANCELADA" &&
      (!showEditReservation || r.id !== selectedReserva?.id)
    );

    return todosHorarios.filter(horaStr => {
      if (formData.date && formData.date < hojeString) return false;

      if (formData.date === hojeString) {
        const agora = new Date();
        const h = agora.getHours().toString().padStart(2, '0');
        const m = agora.getMinutes().toString().padStart(2, '0');
        const horaAtual = `${h}:${m}`;
        
        const timeToMins = (t: string) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
        if (timeToMins(horaStr) <= timeToMins(horaAtual)) return false;
      }

      if (horariosOcupadosBackend.includes(horaStr)) return false;

      return !reservasDoDia.some(r => {
        const resStart = (r.horaEntrada as string || "00:00:00").substring(0, 5);
        const resEnd = (r.horaSaida as string || "23:59:59").substring(0, 5);
        
        const timeToMins = (t: string) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
        const strMins = timeToMins(horaStr);
        return strMins >= timeToMins(resStart) && strMins < timeToMins(resEnd);
      });
    });
  };

  const getHorariosSaidaDisponiveis = (start = formData.startTime) => {
    if (!start) return [];
    const todosHorarios = getHorarios();

    const reservasDoDia = todasReservas.filter(r =>
      r.local?.id?.toString() === formData.facilityId &&
      r.data === formData.date &&
      r.status !== "CANCELADA" &&
      (!showEditReservation || r.id !== selectedReserva?.id)
    );

    const timeToMins = (t: string) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1] || "0");

    let maxEnd = todosHorarios[todosHorarios.length - 1];

    reservasDoDia.forEach(r => {
      const resStart = (r.horaEntrada as string || "00:00:00").substring(0, 5);
      if (timeToMins(resStart) > timeToMins(start) && timeToMins(resStart) < timeToMins(maxEnd)) {
        maxEnd = resStart;
      }
    });

    horariosOcupadosBackend.forEach(horaStr => {
      if (timeToMins(horaStr) > timeToMins(start) && timeToMins(horaStr) < timeToMins(maxEnd)) {
        maxEnd = horaStr;
      }
    });

    return todosHorarios.filter(horaStr => {
      const strMins = timeToMins(horaStr);
      return strMins > timeToMins(start) && strMins <= timeToMins(maxEnd);
    });
  };

  const handleMakeReservation = async () => {
    if (!formData.facilityId || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error("Preencha todos os campos da reserva.");
      return;
    }
    try {
      await criarReserva({
        id_local: parseInt(formData.facilityId),
        id_morador: usuarioLogado!.id!,
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
      const trocandoSenha = editForm.novaSenha || editForm.senhaAtual || editForm.confirmarSenha;
      if (trocandoSenha) {
        if (!editForm.senhaAtual) throw new Error("Informe a senha atual para prosseguir.");
        if (editForm.novaSenha.length < 6) throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
        if (editForm.novaSenha !== editForm.confirmarSenha) throw new Error("As novas senhas não coincidem.");
      }

      const payload = {
        nome: editForm.nome.trim(),
        email: editForm.email.trim(),
        cpf: usuarioLogado.cpf,
        telefone: editForm.telefone.trim() || undefined,
        roles: usuarioLogado.roles || ["MORADOR"]
      };

      await atualizarUsuario(usuarioLogado.id, payload);

      if (trocandoSenha) {
        await alterarSenha({
          senhaAtual: editForm.senhaAtual,
          novaSenha: editForm.novaSenha
        });
        setEditForm(prev => ({ ...prev, senhaAtual: "", novaSenha: "", confirmarSenha: "" }));
      }

      toast.success("Perfil e segurança updated!");
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === id
        ? "bg-accent text-white shadow-lg shadow-accent/20 font-bold"
        : "text-gray-500 hover:bg-gray-100 font-medium"
        }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  const hojeString = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const formatarData = (data: string) => {
    const d = new Date(data + "T00:00:00");
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

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

      {showSidebar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity animate-in fade-in duration-300" onClick={() => setShowSidebar(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-full w-80 bg-white z-[70] shadow-2xl transition-transform duration-300 transform ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
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

          <nav className="flex-1 p-4 space-y-2 mt-4">
            <NavItem id="perfil" label="Alterações de Perfil" icon={Settings} />
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

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

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
                  className={`px-6 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === tab ? "border-accent text-accent" : "border-transparent text-gray-400 hover:text-gray-600"
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
                      src={(() => {
                        const url = local.fotoUrl || (local as any).foto;
                        if (!url) return "/icone.png";
                        if (url.startsWith('http')) return url;
                        let path = url.startsWith('/') ? url : '/' + url;
                        if (!path.includes('/arquivos/')) path = '/arquivos' + path;
                        return `${BASE_URL}${path}`;
                      })()}
                      alt={local.nome}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${(!local.fotoUrl && !(local as any).foto) && "p-12 opacity-20"}`}
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
                          facilityId: local.id!.toString(),
                          date: "",
                          startTime: "",
                          endTime: ""
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
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900">Minhas Reservas</h2>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="text-xs font-bold py-2.5 px-4 rounded-xl transition-all bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-2 h-10 shadow-sm"
                >
                  <History className="w-4 h-4" />
                  Ver Histórico
                </button>
                
                <div className="flex items-center gap-2 h-10">
                  <select
                    value={filtroLocal}
                    onChange={(e) => setFiltroLocal(e.target.value)}
                    className="h-full px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                  >
                    <option value="">Todos os Locais</option>
                    {locaisDB.map(l => <option key={l.id} value={l.id!.toString()}>{l.nome}</option>)}
                  </select>
                  {filtroLocal && <button onClick={() => setFiltroLocal("")} className="text-xs text-red-500 font-semibold hover:underline">Limpar</button>}
                </div>

                <div className="flex items-center gap-2 h-10">
                  <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Filtrar por data:</span>
                  <div className="w-40 h-full">
                    <InputData
                      value={filtroData}
                      onChange={(val) => setFiltroData(val)}
                      className="h-full w-full bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                    />
                  </div>
                  {filtroData && <button onClick={() => setFiltroData("")} className="text-xs text-red-500 font-semibold hover:underline">Limpar</button>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                {(() => {
                  const reservasFiltradas = reservas
                    .filter(r => !filtroData || r.data === filtroData)
                    .filter(r => !filtroLocal || r.local?.id!.toString() === filtroLocal)
                    .filter(r => (r.data as string) >= hojeString && r.status !== "CANCELADA")
                    .sort((a, b) => {
                      const dateA = new Date((a.data as string || "") + "T" + (a.horaEntrada as string || "00:00"));
                      const dateB = new Date((b.data as string || "") + "T" + (b.horaEntrada as string || "00:00"));
                      return dateA.getTime() - dateB.getTime();
                    });

                  if (reservasFiltradas.length === 0) {
                    return (
                      <div className="p-20 text-center">
                        <p className="text-gray-400 italic">Nenhuma reserva programada{filtroData ? ' para esta data' : ''}{filtroLocal ? ' neste local' : ''}.</p>
                        <button onClick={() => setActiveTab("locais")} className="mt-4 bg-accent hover:bg-accent/90 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors">
                          Ver Locais Disponíveis
                        </button>
                      </div>
                    );
                  }

                  return (
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
                        {reservasFiltradas.map((res) => (
                          <tr key={res.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-gray-900 group-hover:text-accent transition-colors">{res.local?.nome}</div>
                              <div className="text-[10px] text-gray-500 font-medium">{res.local?.localizacao}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                              {formatarData(res.data as string)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                              {(res.horaEntrada as string)?.substring(0, 5)} - {(res.horaSaida as string)?.substring(0, 5)}
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
                                {res.status !== "CANCELADA" && !isReservaExpirada(res) && (
                                  <>
                                    {podeEditar(res) && (
                                      <button onClick={() => prepararEdicao(res)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-50" title="Editar">
                                        <span className="text-xs font-bold uppercase tracking-wider">Editar</span>
                                      </button>
                                    )}
                                    {podeCancelar(res) && (
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
                                    )}
                                  </>
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
                  <div className="flex items-center gap-3 h-10">
                    <select
                      value={filtroLocal}
                      onChange={(e) => setFiltroLocal(e.target.value)}
                      className="h-full px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                    >
                      <option value="">Todos os Locais</option>
                      {locaisDB.map(l => <option key={l.id} value={l.id!.toString()}>{l.nome}</option>)}
                    </select>
                    {filtroLocal && <button onClick={() => setFiltroLocal("")} className="text-xs text-red-500 font-semibold hover:underline">Limpar</button>}
                  </div>
                  <div className="flex items-center gap-3 h-10">
                    <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Filtrar por data:</span>
                    <div className="w-40 h-full">
                      <InputData
                        value={filtroData}
                        onChange={(val) => setFiltroData(val)}
                        className="h-full w-full bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
                      />
                    </div>
                    {filtroData && <button onClick={() => setFiltroData("")} className="text-xs text-red-500 font-semibold hover:underline">Limpar</button>}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    {(() => {
                      const reservasFiltradas = reservas
                        .filter(r => !filtroData || r.data === filtroData)
                        .filter(r => !filtroLocal || r.local?.id!.toString() === filtroLocal)
                        .filter(r => (r.data as string) < hojeString || r.status === "CANCELADA")
                        .sort((a, b) => {
                          const dateA = new Date((a.data as string || "") + "T" + (a.horaEntrada as string || "00:00"));
                          const dateB = new Date((b.data as string || "") + "T" + (b.horaEntrada as string || "00:00"));
                          return dateB.getTime() - dateA.getTime();
                        });

                      if (reservasFiltradas.length === 0) {
                        return (
                          <div className="p-12 text-center">
                            <p className="text-gray-400 italic">Nenhuma reserva passada encontrada{filtroData ? ' para esta data' : ''}.</p>
                          </div>
                        );
                      }

                      return (
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Local</th>
                              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Horário</th>
                              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {reservasFiltradas.map((res) => (
                              <tr key={res.id} className="hover:bg-gray-50/50 transition-colors group opacity-80">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="font-semibold text-gray-900 group-hover:text-accent transition-colors">{res.local?.nome}</div>
                                  <div className="text-[10px] text-gray-500 font-medium">{res.local?.localizacao}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                  {formatarData(res.data as string)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                  {(res.horaEntrada as string)?.substring(0, 5)} - {(res.horaSaida as string)?.substring(0, 5)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
                                  ${res.status === "APROVADA" ? "bg-green-100 text-green-700"
                                      : res.status === "CANCELADA" ? "bg-red-100 text-red-700"
                                        : "bg-yellow-100 text-yellow-700"}`}>
                                    {res.status}
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

        {activeTab === "perfil" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto relative">

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
                        onChange={(e) => {
                          const formatTelefone = (val: string) => {
                            const clean = val.replace(/\D/g, "");
                            const truncated = clean.slice(0, 11);
                            if (truncated.length === 0) return "";
                            if (truncated.length <= 2) return `(${truncated}`;
                            if (truncated.length <= 6) return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`;
                            if (truncated.length <= 10) return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 6)}-${truncated.slice(6)}`;
                            return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`;
                          };
                          setEditForm({ ...editForm, telefone: formatTelefone(e.target.value) });
                        }}
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
                    <div className="relative">
                      <input
                        type={showSenhaAtual ? "text" : "password"}
                        value={editForm.senhaAtual}
                        onChange={(e) => setEditForm({ ...editForm, senhaAtual: e.target.value })}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all pr-12"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors"
                      >
                        {showSenhaAtual ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-600 uppercase ml-1">Nova Senha</label>
                    <div className="relative">
                      <input
                        type={showNovaSenha ? "text" : "password"}
                        value={editForm.novaSenha}
                        onChange={(e) => setEditForm({ ...editForm, novaSenha: e.target.value })}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all pr-12"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNovaSenha(!showNovaSenha)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors"
                      >
                        {showNovaSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-600 uppercase ml-1">Confirmar Nova Senha</label>
                    <div className="relative">
                      <input
                        type={showConfirmarSenha ? "text" : "password"}
                        value={editForm.confirmarSenha}
                        onChange={(e) => setEditForm({ ...editForm, confirmarSenha: e.target.value })}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none shadow-sm transition-all pr-12"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors"
                      >
                        {showConfirmarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
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
                  onChange={e => setFormData({ ...formData, facilityId: e.target.value })}
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
                    {locaisDB.find(l => l.id!.toString() === formData.facilityId)?.horarioInicio.substring(0, 5)} às {locaisDB.find(l => l.id!.toString() === formData.facilityId)?.horarioFim.substring(0, 5)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Data da Reserva</label>
                <div className="relative">
                  <InputData
                    value={formData.date}
                    min={hojeString}
                    onChange={(val) => setFormData({ ...formData, date: val })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-accent outline-none transition-all shadow-sm pl-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ml-1 ${(!formData.date || getHorariosEntradaDisponiveis().length === 0) ? 'text-gray-300' : 'text-gray-400'}`}>Entrada</label>
                  <div className="relative">
                    <Clock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${(!formData.date || getHorariosEntradaDisponiveis().length === 0) ? 'text-gray-300' : 'text-gray-400'}`} />
                    <select
                      value={formData.startTime}
                      onChange={e => {
                        const newStart = e.target.value;
                        setFormData({ ...formData, startTime: newStart, endTime: "" });
                      }}
                      disabled={!!formData.date && getHorariosEntradaDisponiveis().length === 0}
                      className={`w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-accent outline-none transition-all shadow-sm appearance-none ${((!!formData.date && getHorariosEntradaDisponiveis().length === 0)) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                    >
                      <option value="" disabled>Selecione</option>
                      {getHorariosEntradaDisponiveis().map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ml-1 ${(!formData.startTime || (!!formData.date && getHorariosEntradaDisponiveis().length === 0)) ? 'text-gray-300' : 'text-gray-400'}`}>Saída</label>
                  <div className="relative">
                    <Clock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${(!formData.startTime || (!!formData.date && getHorariosEntradaDisponiveis().length === 0)) ? 'text-gray-300' : 'text-gray-400'}`} />
                    <select
                      value={formData.endTime}
                      onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-accent outline-none transition-all shadow-sm appearance-none ${(!formData.startTime || (!!formData.date && getHorariosEntradaDisponiveis().length === 0)) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                      disabled={!formData.startTime || formData.startTime === "" || (!!formData.date && getHorariosEntradaDisponiveis().length === 0)}
                    >
                      <option value="" disabled>Selecione</option>
                      {formData.startTime && getHorariosSaidaDisponiveis().map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {formData.date && getHorariosEntradaDisponiveis().length === 0 && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-xs text-red-700 font-bold text-center w-full leading-tight">Não há horários disponíveis nessa data</p>
                </div>
              )}

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
                Tem certeza que deseja cancelar sua reserva no(a) <strong>{selectedReservaForCancel.local?.nome}</strong> para o dia {formatarData(selectedReservaForCancel.data as string)}?
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

function isReservaExpirada(r: ReservaDTOResponse) {
  if (!r.data) return false;
  const agora = new Date();
  const dateStr = (r.data as string) + "T" + (r.horaEntrada as string || "00:00:00");
  const resDate = new Date(dateStr);
  return resDate.getTime() < agora.getTime();
}

function podeEditar(r: ReservaDTOResponse) {
  if (!r.data) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataRes = new Date(r.data as string + "T00:00:00");
  const diffTime = dataRes.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 7;
}

function podeCancelar(r: ReservaDTOResponse) {
  if (!r.data) return false;
  const agora = new Date();
  const dataHoraRes = new Date(`${r.data}T${r.horaEntrada || "00:00:00"}`);
  const diffTime = dataHoraRes.getTime() - agora.getTime();
  const diffHours = diffTime / (1000 * 60 * 60);
  return diffHours >= 24;
}

interface InputDataProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  min?: string;
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
        placeholder={isMonthSelect ? "mm/aaaa" : "dd/mm/yyyy"}
        className={`${className} w-full h-full pl-3 pr-10 cursor-pointer text-left relative z-0`}
      />
      
      <svg
        onClick={handleDisplayClick}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 cursor-pointer z-10"
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
        className="absolute inset-0 w-full h-full cursor-pointer pointer-events-none z-10 opacity-0"
        style={{ opacity: 0, color: "transparent", background: "transparent" }}
      />

      <style>
        {`
          input[type="date"]::-webkit-calendar-picker-indicator,
          input[type="month"]::-webkit-calendar-picker-indicator {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
          }
          input[type="date"]::-webkit-datetime-edit,
          input[type="date"]::-webkit-datetime-edit-fields-wrapper,
          input[type="date"]::-webkit-datetime-edit-text,
          input[type="date"]::-webkit-datetime-edit-month-field,
          input[type="date"]::-webkit-datetime-edit-day-field,
          input[type="date"]::-webkit-datetime-edit-year-field,
          input[type="month"]::-webkit-datetime-edit,
          input[type="month"]::-webkit-datetime-edit-fields-wrapper,
          input[type="month"]::-webkit-datetime-edit-text,
          input[type="month"]::-webkit-datetime-edit-month-field,
          input[type="month"]::-webkit-datetime-edit-year-field {
            color: transparent;
          }
        `}
      </style>
    </div>
  );
}