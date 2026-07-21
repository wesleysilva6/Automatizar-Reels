'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { getServerSnapshot, getSnapshot, subscribe } from '@/lib/projetos/store';
import type { Projeto, VideoEntry } from '@/lib/projetos/tipos';

function useEstado() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Nº de vídeos ativos (fora da lixeira) por projeto.
export function useContagemVideos(): Record<string, number> {
  const { videos } = useEstado();
  return useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const v of videos) {
      if (v.excluidoEm === null) mapa[v.projetoId] = (mapa[v.projetoId] ?? 0) + 1;
    }
    return mapa;
  }, [videos]);
}

// Projetos com favoritos primeiro, depois por atualização mais recente.
export function useProjetos(): Projeto[] {
  const { projetos } = useEstado();
  return useMemo(
    () =>
      [...projetos].sort((a, b) => {
        if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
        return b.atualizadoEm - a.atualizadoEm;
      }),
    [projetos],
  );
}

export function useProjeto(id: string): Projeto | undefined {
  const { projetos } = useEstado();
  return useMemo(() => projetos.find((p) => p.id === id), [projetos, id]);
}

export function useProjetosFavoritos(): Projeto[] {
  const projetos = useProjetos();
  return useMemo(() => projetos.filter((p) => p.favorito), [projetos]);
}

export function useProjetosRecentes(limite = 6): Projeto[] {
  const { projetos } = useEstado();
  return useMemo(
    () => [...projetos].sort((a, b) => b.acessadoEm - a.acessadoEm).slice(0, limite),
    [projetos, limite],
  );
}

// Vídeos ativos de um projeto (mais recentes primeiro).
export function useVideosDoProjeto(projetoId: string): VideoEntry[] {
  const { videos } = useEstado();
  return useMemo(
    () =>
      videos
        .filter((v) => v.projetoId === projetoId && v.excluidoEm === null)
        .sort((a, b) => b.atualizadoEm - a.atualizadoEm),
    [videos, projetoId],
  );
}

export function useVideosFavoritos(): VideoEntry[] {
  const { videos } = useEstado();
  return useMemo(
    () =>
      videos
        .filter((v) => v.favorito && v.excluidoEm === null)
        .sort((a, b) => b.atualizadoEm - a.atualizadoEm),
    [videos],
  );
}

export function useVideosRecentes(limite = 8): VideoEntry[] {
  const { videos } = useEstado();
  return useMemo(
    () =>
      videos
        .filter((v) => v.excluidoEm === null)
        .sort((a, b) => b.atualizadoEm - a.atualizadoEm)
        .slice(0, limite),
    [videos, limite],
  );
}

export function useLixeira(): VideoEntry[] {
  const { videos } = useEstado();
  return useMemo(
    () =>
      videos
        .filter((v) => v.excluidoEm !== null)
        .sort((a, b) => (b.excluidoEm ?? 0) - (a.excluidoEm ?? 0)),
    [videos],
  );
}

// Busca global: projetos e vídeos que batem com o termo.
export function useBuscaGlobal(termo: string): { projetos: Projeto[]; videos: VideoEntry[] } {
  const { projetos, videos } = useEstado();
  return useMemo(() => {
    const q = termo.trim().toLowerCase();
    if (!q) return { projetos: [], videos: [] };
    return {
      projetos: projetos.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q),
      ),
      videos: videos.filter(
        (v) =>
          v.excluidoEm === null &&
          (v.titulo.toLowerCase().includes(q) || v.autor.toLowerCase().includes(q)),
      ),
    };
  }, [projetos, videos, termo]);
}

// Mapa id->nome/cor para exibir a origem de um vídeo em telas globais.
export function useMapaProjetos(): Record<string, Projeto> {
  const { projetos } = useEstado();
  return useMemo(() => Object.fromEntries(projetos.map((p) => [p.id, p])), [projetos]);
}
