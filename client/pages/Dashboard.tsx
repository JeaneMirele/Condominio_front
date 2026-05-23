import { useState, useEffect, useMemo } from "react";
import { getReservas } from "@/services/api";
import type { ReservaDTOResponse } from "@/services/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar, Clock, MapPin, Activity, Filter, RefreshCw } from "lucide-react";

export default function Dashboard() {
  const [reservas, setReservas] = useState<ReservaDTOResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroLocal, setFiltroLocal] = useState<string>("TODOS");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  async function fetchData() {
    setLoading(true);
    try {
      const data = await getReservas();
      setReservas(data || []);
    } catch (err) {
      console.error("Erro ao carregar reservas:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const locaisDisponiveis = useMemo(() => {
    const locais = new Set<string>();
    reservas.forEach(r => {
      if (r.local?.nome) locais.add(r.local.nome);
    });
    return Array.from(locais).sort();
  }, [reservas]);

  const reservasFiltradas = useMemo(() => {
    return reservas.filter(r => {
      if (r.status === "CANCELADA") return false;

      if (filtroLocal !== "TODOS" && r.local?.nome !== filtroLocal) {
        return false;
      }

      if (r.data) {
        const dataReserva = r.data as string; 
        if (dataInicio && dataReserva < dataInicio) return false;
        if (dataFim && dataReserva > dataFim) return false;
      }

      return true;
    });
  }, [reservas, filtroLocal, dataInicio, dataFim]);

  const { areasData, diasData, horasData } = useMemo(() => {
    const areasCount: Record<string, number> = {};
    const diasCount: Record<string, number> = {
      "Domingo": 0, "Segunda": 0, "Terça": 0, "Quarta": 0, "Quinta": 0, "Sexta": 0, "Sábado": 0
    };
    const horasCount: Record<string, number> = {};

    reservasFiltradas.forEach(r => {
      const local = r.local?.nome || "Desconhecido";
      areasCount[local] = (areasCount[local] || 0) + 1;

      if (r.data) {
        const [ano, mes, dia] = (r.data as string).split("-").map(Number);
        const dataObj = new Date(ano, mes - 1, dia);
        const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
        const diaCapitalized = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1).split('-')[0];
        if (diasCount[diaCapitalized] !== undefined) {
          diasCount[diaCapitalized]++;
        }
      }

      if (r.horaEntrada) {
        const hora = r.horaEntrada.substring(0, 5);
        horasCount[hora] = (horasCount[hora] || 0) + 1;
      }
    });

    const areas = Object.entries(areasCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const dias = Object.entries(diasCount).map(([name, value]) => ({ name, value }));

    const horas = Object.entries(horasCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { areasData: areas, diasData: dias, horasData: horas };
  }, [reservasFiltradas]);

  function limparFiltros() {
    setFiltroLocal("TODOS");
    setDataInicio("");
    setDataFim("");
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
          <p className="font-bold text-gray-800 text-sm mb-1">{label}</p>
          <p className="text-blue-600 text-sm font-semibold">{payload[0].value} reservas</p>
        </div>
      );
    }
    return null;
  };

  const maxDias = useMemo(() => Math.max(...diasData.map(d => d.value), 1), [diasData]);
  const maxHoras = useMemo(() => Math.max(...horasData.map(h => h.value), 1), [horasData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-inter">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl flex-shrink-0 shadow-lg shadow-blue-600/20">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 truncate sm:text-2xl tracking-tight">
                Estatísticas de Uso
              </h1>
            </div>
            <button 
              onClick={fetchData}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Painel de Filtros */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold text-sm tracking-wide uppercase">
            <Filter className="w-4 h-4 text-gray-500" />
            <span>Filtros de Pesquisa</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 px-1">Área Comum</label>
              <select
                value={filtroLocal}
                onChange={(e) => setFiltroLocal(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="TODOS">Todos os locais</option>
                {locaisDisponiveis.map(local => (
                  <option key={local} value={local}>{local}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 px-1">Data Inicial</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 px-1">Data Final</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {(filtroLocal !== "TODOS" || dataInicio || dataFim) && (
                  <button
                    onClick={limparFiltros}
                    className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 mt-4 font-medium">Carregando estatísticas...</p>
          </div>
        ) : reservasFiltradas.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Nenhuma reserva localizada para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Áreas mais reservadas */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Áreas Mais Reservadas</h2>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Total de agendamentos por local</p>
                  </div>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={areasData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }} width={90} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                        {areasData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dias de mais uso */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-purple-50 text-purple-500 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Dias de Mais Uso</h2>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Distribuição semanal das reservas</p>
                  </div>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={diasData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24}>
                        {diasData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value === maxDias && entry.value > 0 ? '#7c3aed' : '#a78bfa'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Horários de mais uso */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Horários de Mais Uso</h2>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Picos de início dos agendamentos</p>
                  </div>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={horasData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24}>
                        {horasData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value === maxHoras && entry.value > 0 ? '#ea580c' : '#ff9d5c'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}