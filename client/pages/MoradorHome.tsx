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
} from "@/services/api";
import type { UsuarioDTOResponse, LocalDTOResponse, ReservaDTOResponse } from "@/services/types";

export default function ResidentHome() {
  const navigate = useNavigate();

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
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [filtroData, setFiltroData] = useState("");

  const [formData, setFormData] = useState({ facilityId: "", date: "", startTime: "", endTime: "" });
  const [editForm, setEditForm] = useState({ nome: "", email: "", telefone: "", novaSenha: "", confirmarSenha: "" });
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
      setReservas(resList?.filter((r) => r?.morador?.id === perfil?.id) || []);
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

  function abrirEditPerfil() {
    setEditForm({ nome: usuarioLogado?.nome ?? "", email: usuarioLogado?.email ?? "", telefone: usuarioLogado?.telefone ?? "", novaSenha: "", confirmarSenha: "" });
    setEditError("");
    setShowEditProfileModal(true);
    setShowProfileMenu(false);
  }




async function handleAlterarSenha() {
  setPasswordError("");
  
 
  if (!senhaAtual || !newPassword || !confirmPassword) {
    setPasswordError("Preencha todos os campos.");
    return;
  }
  if (newPassword !== confirmPassword) {
    setPasswordError("As senhas não coincidem.");
    return;
  }
  if (newPassword.length < 6) {
    setPasswordError("A nova senha deve ter no mínimo 6 caracteres.");
    return;
  }

  setLoadingSenha(true);
  try {
    await alterarSenha({ senhaAtual, novaSenha: newPassword });
    toast.success("Senha alterada com sucesso!");
    
  
    setShowChangePasswordModal(false);
    setSenhaAtual("");
    setNewPassword("");
    setConfirmPassword("");
  } catch (err: any) {
  
    setPasswordError(err.message);
  } finally {
    setLoadingSenha(false);
  }
}
  async function handleSalvarPerfil() {
    if (!editForm.nome.trim() || !editForm.email.trim()) { setEditError("Nome e e-mail são obrigatórios."); return; }
    if (editForm.novaSenha && editForm.novaSenha !== editForm.confirmarSenha) { setEditError("As senhas não coincidem."); return; }
    if (!usuarioLogado) return;
    setSavingProfile(true); setEditError("");
    try {
      const payload: any = { nome: editForm.nome.trim(), email: editForm.email.trim(), cpf: usuarioLogado.cpf, telefone: editForm.telefone.trim() || null, roles: usuarioLogado.roles };
      if (editForm.novaSenha) payload.senha = editForm.novaSenha;
      await atualizarUsuario(usuarioLogado.id, payload);
      toast.success("Perfil atualizado!");
      setShowEditProfileModal(false);
      carregarDados();
    } catch (err: any) {
      setEditError(err?.message || "Erro ao salvar perfil.");
    } finally { setSavingProfile(false); }
  }




  function handleSignOut() { clearSession(); navigate("/"); }

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

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-accent rounded-lg flex-shrink-0 hover:bg-accent/90 transition-colors overflow-hidden"
              >
                <img src={usuarioLogado?.foto || "/icone.png"} className="w-full h-full object-cover" alt="Perfil" />
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
                      onClick={abrirEditPerfil}
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

              <h1 className="text-lg font-bold text-gray-900 truncate sm:text-2xl">Portal do Morador</h1>
            </div>


            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => {
                setSelectedReserva(null);  
                setFormData({ facilityId: "", date: "", startTime: "", endTime: "" }); 
                setShowMakeReservation(true);
                }} className="bg-accent hover:bg-accent/90 text-white font-medium text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap">
                Nova Reserva
              </button>
              <button onClick={handleSignOut} className="text-accent hover:text-accent/80 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap">
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 sm:py-12">
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {reservas.filter(r => !filtroData || r.data === filtroData).length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-gray-400 italic">Nenhuma reserva encontrada{filtroData ? ' para esta data' : ''}.</p>
                <button onClick={() => setShowMakeReservation(true)} className="mt-4 bg-accent hover:bg-accent/90 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors">
                  Fazer Reserva
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Local</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Horário</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reservas.filter(r => !filtroData || r.data === filtroData).map((res) => (
                    <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{res.local?.nome}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date((res.data as string) + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {res.horaEntrada?.substring(0, 5)} - {res.horaSaida?.substring(0, 5)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide
                          ${res.status === "APROVADA" ? "bg-green-100 text-green-800" 
                          : res.status === "CANCELADA" ? "bg-red-100 text-red-800" 
                          : "bg-yellow-100 text-yellow-800"}`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => prepararEdicao(res)} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors">
                            Editar
                          </button>
                          <button onClick={async () => { try { await deletarReserva(res.id); toast.success("Reserva cancelada."); carregarDados(); } catch (e: any) { toast.error(e?.message || "Erro ao cancelar."); } }} className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

    


{/* Modal: Editar Perfil */}
{showEditProfileModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
    <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl my-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Editar Perfil</h3>
        <button onClick={() => setShowEditProfileModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      
      <div className="space-y-4">
        {/* Profile Image Uploader inside Edit Modal */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-accent mb-3 bg-gray-100">
            <img 
              src={usuarioLogado?.foto || "/icone.png"} 
              className={`w-full h-full object-cover ${uploadingFoto ? 'opacity-30' : ''}`} 
              alt="Perfil" 
            />
            {uploadingFoto && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <input 
            type="file" 
            id="foto-upload-modal" 
            hidden 
            accept="image/*" 
            onChange={handleTrocarFoto} 
            disabled={uploadingFoto} 
          />
          <label 
            htmlFor="foto-upload-modal" 
            className={`text-xs font-bold text-accent uppercase cursor-pointer hover:bg-accent/10 transition-colors px-4 py-2 rounded-lg border border-accent/20 ${uploadingFoto ? 'pointer-events-none opacity-50' : ''}`}
          >
            {uploadingFoto ? "Aguarde..." : "Atualizar Foto"}
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Nome</label>
          <input 
            type="text" 
            value={editForm.nome} 
            onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} 
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" 
            placeholder="Seu nome completo" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">E-mail</label>
          <input 
            type="email" 
            value={editForm.email} 
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" 
            placeholder="seu@email.com" 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Telefone</label>
          <input 
            type="tel" 
            value={editForm.telefone} 
            onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} 
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" 
            placeholder="(00) 00000-0000" 
          />
        </div>

        {editError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{editError}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button 
            onClick={() => setShowEditProfileModal(false)} 
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium text-sm py-2.5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSalvarPerfil} 
            disabled={savingProfile} 
            className="flex-[2] bg-accent hover:bg-accent/90 text-white font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {savingProfile ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{(showMakeReservation || showEditReservation) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {showEditReservation ? "Editar Reserva" : "Nova Reserva"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Local</label>
                <select value={formData.facilityId} onChange={e => setFormData({...formData, facilityId: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 border rounded-lg text-sm">
                  <option value="">Escolha um local...</option>
                  {locaisDB.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.horarioInicio.substring(0,5)} - {l.horarioFim.substring(0,5)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Data</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-700 mb-2">Entrada</label>
                <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 border rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-semibold text-gray-700 mb-2">Saída</label>
                <input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 border rounded-lg text-sm" /></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowMakeReservation(false); setShowEditReservation(false); }} className="flex-1 py-2.5 bg-gray-100 rounded-lg text-sm font-bold">Cancelar</button>
                <button onClick={showEditReservation ? handleUpdateReservation : handleMakeReservation} className="flex-[2] py-2.5 bg-accent text-white rounded-lg text-sm font-bold">
                  {showEditReservation ? "Salvar Alterações" : "Confirmar Reserva"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
  {showChangePasswordModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Segurança da Conta</h3>
      <p className="text-xs text-gray-500 mb-6">Confirme sua identidade para alterar a senha.</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Senha Atual</label>
          <input 
            type="password" 
            value={senhaAtual} 
            onChange={(e) => setSenhaAtual(e.target.value)} 
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm" 
            placeholder="••••••••"
          />
        </div>

        <div className="h-px bg-gray-100 my-2" />

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nova Senha</label>
          <input 
            type="password" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm" 
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Confirmar Nova Senha</label>
          <input 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent outline-none text-sm" 
            placeholder="Repita a nova senha"
          />
        </div>

        {passwordError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-xs text-red-600 font-medium">{passwordError}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <button 
          onClick={() => { setShowChangePasswordModal(false); setPasswordError(""); }} 
          className="flex-1 bg-gray-50 text-gray-500 font-bold text-xs py-3 rounded-lg hover:bg-gray-100 transition-colors"
        >
          CANCELAR
        </button>
        <button 
          onClick={handleAlterarSenha} 
          disabled={loadingSenha}
          className="flex-1 bg-accent text-white font-bold text-xs py-3 rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {loadingSenha ? "PROCESSANDO..." : "CONFIRMAR TROCA"}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
