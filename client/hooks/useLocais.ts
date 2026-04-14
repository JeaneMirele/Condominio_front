import { useState, useEffect } from "react";
import {
  getLocais,
  criarLocal,
  atualizarLocal,
  deletarLocal,
  uploadFotoLocal,
} from "@/services/api";
import { LocalDTOResponse, LocalDTO } from "@/services/types";

export function useLocais() {
  const [locais, setLocais] = useState<LocalDTOResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLocais();
      setLocais(data);
    } catch (e: any) {
      setError("Erro ao carregar locais.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const criar = async (data: Omit<LocalDTOResponse, "id" | "fotoUrl">) => {
    const novo = await criarLocal(data);
    setLocais((prev) => [...prev, novo]);
    return novo;
  };

  const atualizar = async (id: number, data: Omit<LocalDTOResponse, "id" | "fotoUrl">) => {
    const atualizado = await atualizarLocal(id, data);
    setLocais((prev) => prev.map((l) => (l.id === id ? atualizado : l)));
    return atualizado;
  };

  const deletar = async (id: number) => {
    await deletarLocal(id);
    setLocais((prev) => prev.filter((l) => l.id !== id));
  };

  const uploadFoto = async (id: number, arquivo: File) => {
    const atualizado = await uploadFotoLocal(id, arquivo);
    setLocais((prev) => prev.map((l) => (l.id === id ? atualizado : l)));
    return atualizado;
  };

  return { locais, loading, error, criar, atualizar, deletar, uploadFoto, recarregar: carregar };
}
