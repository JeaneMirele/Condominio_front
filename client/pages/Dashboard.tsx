import { useState, useEffect } from "react";
import { getReservas } from "@/services/api";
import type { ReservaDTOResponse } from "@/services/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar, Clock, MapPin, Activity } from "lucide-react";

export default function Dashboard() {
  const [reservas, setReservas] = useState<ReservaDTOResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getReservas();
        setReservas(data || []);
      } catch (err) {
        console.error("Erro ao carregar reservas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Processamento de dados
  const areasCount: Record<string, number> = {};
  const diasCount: Record<string, number> = {
    "Domingo": 0, "Segunda": 0, "Terça": 0, "Quarta": 0, "Quinta": 0, "Sexta": 0, "Sábado": 0
  };
  const horasCount: Record<string, number> = {};

  reservas.forEach(r => {
    if (r.status === "CANCELADA") return;

    // Áreas
    const local = r.local?.nome || "Desconhecido";
    areasCount[local] = (areasCount[local] || 0) + 1;

    // Dias
    if (r.data) {
      // Usar a data local para evitar fuso horário errado
      const [ano, mes, dia] = (r.data as string).split("-").map(Number);
      const dataObj = new Date(ano, mes - 1, dia);
      const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
      const diaCapitalized = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1).split('-')[0]; // ex: "Segunda"
      if (diasCount[diaCapitalized] !== undefined) {
        diasCount[diaCapitalized]++;
      } else {
        diasCount[diaCapitalized] = 1;
      }
    }

    // Horários
    if (r.horaEntrada) {
      const hora = r.horaEntrada.substring(0, 5);
      horasCount[hora] = (horasCount[hora] || 0) + 1;
    }
  });

  const areasData = Object.entries(areasCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const diasData = Object.entries(diasCount).map(([name, value]) => ({ name, value }));
  const horasData = Object.entries(horasCount).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
          <p className="font-bold text-gray-800 text-sm mb-1">{label}</p>
          <p className="text-accent text-sm font-semibold">{payload[0].value} reservas</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-inter">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-accent rounded-xl flex-shrink-0 shadow-lg shadow-accent/20">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 truncate sm:text-2xl tracking-tight">
                Estatísticas de Uso
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 mt-4 font-medium">Carregando estatísticas...</p>
          </div>
        ) : reservas.filter(r => r.status !== "CANCELADA").length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Nenhuma reserva programada.</p>
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
                  <h2 className="font-bold text-gray-900">Áreas Mais Reservadas</h2>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={areasData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }} width={100} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                        {areasData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#93c5fd'} />
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
                  <h2 className="font-bold text-gray-900">Dias de Mais Uso</h2>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={diasData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 500 }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {diasData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value === Math.max(...diasData.map(d => d.value)) ? '#8b5cf6' : '#c4b5fd'} />
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
                  <h2 className="font-bold text-gray-900">Horários de Mais Uso</h2>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={horasData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 500 }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]}>
                        {horasData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value === Math.max(...horasData.map(d => d.value)) ? '#f97316' : '#fdba74'} />
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
