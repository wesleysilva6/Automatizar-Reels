// Store externo (dep-free) sobre o localStorage, consumível via useSyncExternalStore.
// Mutações produzem um novo objeto de estado (imutável) para o React detectar mudança.

import {
  CHAVE_STORE,
  VERSAO_STORE,
  type EstadoProjetos,
  type Projeto,
  type VideoEntry,
} from './tipos';

const VAZIO: EstadoProjetos = { projetos: [], videos: [] };

const noNavegador = (): boolean => typeof window !== 'undefined';

function carregar(): EstadoProjetos {
  if (!noNavegador()) return VAZIO;
  try {
    const bruto = window.localStorage.getItem(CHAVE_STORE);
    if (!bruto) return VAZIO;
    const dados = JSON.parse(bruto) as Partial<EstadoProjetos>;
    return {
      projetos: Array.isArray(dados.projetos) ? dados.projetos : [],
      videos: Array.isArray(dados.videos) ? dados.videos : [],
    };
  } catch {
    // localStorage corrompido: começa limpo em vez de derrubar a UI.
    return VAZIO;
  }
}

let estado: EstadoProjetos = carregar();
const ouvintes = new Set<() => void>();

function persistir(): void {
  if (!noNavegador()) return;
  window.localStorage.setItem(
    CHAVE_STORE,
    JSON.stringify({ versao: VERSAO_STORE, ...estado }),
  );
}

function definir(proximo: EstadoProjetos): void {
  estado = proximo;
  persistir();
  for (const ouvir of ouvintes) ouvir();
}

// ----- Interface para useSyncExternalStore -----

export function subscribe(ouvir: () => void): () => void {
  ouvintes.add(ouvir);
  return () => ouvintes.delete(ouvir);
}

export function getSnapshot(): EstadoProjetos {
  return estado;
}

export function getServerSnapshot(): EstadoProjetos {
  return VAZIO;
}

// Sincroniza entre abas: uma aba grava, a outra recarrega.
if (noNavegador()) {
  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE_STORE) definir(carregar());
  });
}

const agora = (): number => Date.now();
const novoId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ----- Mutações de projetos -----

export interface DadosProjeto {
  nome: string;
  cor: string;
  icone: string;
  descricao?: string;
}

export function criarProjeto(dados: DadosProjeto): Projeto {
  const t = agora();
  const projeto: Projeto = {
    id: novoId(),
    nome: dados.nome.trim() || 'Sem nome',
    cor: dados.cor,
    icone: dados.icone,
    descricao: (dados.descricao ?? '').trim(),
    criadoEm: t,
    atualizadoEm: t,
    acessadoEm: t,
    favorito: false,
  };
  definir({ ...estado, projetos: [projeto, ...estado.projetos] });
  return projeto;
}

export function atualizarProjeto(id: string, dados: DadosProjeto): void {
  definir({
    ...estado,
    projetos: estado.projetos.map((p) =>
      p.id === id
        ? {
            ...p,
            nome: dados.nome.trim() || p.nome,
            cor: dados.cor,
            icone: dados.icone,
            descricao: (dados.descricao ?? '').trim(),
            atualizadoEm: agora(),
          }
        : p,
    ),
  });
}

export function excluirProjeto(id: string): void {
  const t = agora();
  // Não apaga os vídeos de vez: manda pra Lixeira, reversível.
  definir({
    projetos: estado.projetos.filter((p) => p.id !== id),
    videos: estado.videos.map((v) =>
      v.projetoId === id && v.excluidoEm === null ? { ...v, excluidoEm: t } : v,
    ),
  });
}

export function alternarFavoritoProjeto(id: string): void {
  definir({
    ...estado,
    projetos: estado.projetos.map((p) =>
      p.id === id ? { ...p, favorito: !p.favorito } : p,
    ),
  });
}

export function tocarProjeto(id: string): void {
  definir({
    ...estado,
    projetos: estado.projetos.map((p) =>
      p.id === id ? { ...p, acessadoEm: agora() } : p,
    ),
  });
}

// ----- Mutações de vídeos -----

export interface DadosVideo {
  projetoId: string;
  url: string;
  titulo: string;
  capa: string;
  autor: string;
  duracao: number;
}

// Salva na biblioteca do projeto; evita duplicar a mesma URL no mesmo projeto.
export function salvarVideo(dados: DadosVideo): VideoEntry {
  const existente = estado.videos.find(
    (v) => v.projetoId === dados.projetoId && v.url === dados.url && v.excluidoEm === null,
  );
  const t = agora();
  if (existente) {
    const atualizado: VideoEntry = { ...existente, ...dados, atualizadoEm: t };
    definir({
      ...estado,
      videos: estado.videos.map((v) => (v.id === existente.id ? atualizado : v)),
    });
    marcarProjeto(dados.projetoId, t);
    return atualizado;
  }
  const video: VideoEntry = {
    id: novoId(),
    ...dados,
    criadoEm: t,
    atualizadoEm: t,
    favorito: false,
    excluidoEm: null,
  };
  definir({ ...estado, videos: [video, ...estado.videos] });
  marcarProjeto(dados.projetoId, t);
  return video;
}

function marcarProjeto(id: string, t: number): void {
  definir({
    ...estado,
    projetos: estado.projetos.map((p) =>
      p.id === id ? { ...p, atualizadoEm: t, acessadoEm: t } : p,
    ),
  });
}

export function moverVideos(ids: string[], projetoId: string): void {
  const alvo = new Set(ids);
  const t = agora();
  definir({
    ...estado,
    videos: estado.videos.map((v) =>
      alvo.has(v.id) ? { ...v, projetoId, atualizadoEm: t } : v,
    ),
  });
  marcarProjeto(projetoId, t);
}

export function alternarFavoritoVideo(id: string): void {
  definir({
    ...estado,
    videos: estado.videos.map((v) =>
      v.id === id ? { ...v, favorito: !v.favorito } : v,
    ),
  });
}

export function enviarParaLixeira(id: string): void {
  definir({
    ...estado,
    videos: estado.videos.map((v) =>
      v.id === id ? { ...v, excluidoEm: agora() } : v,
    ),
  });
}

export function restaurarVideo(id: string): void {
  definir({
    ...estado,
    videos: estado.videos.map((v) =>
      v.id === id ? { ...v, excluidoEm: null, atualizadoEm: agora() } : v,
    ),
  });
}

export function excluirVideoDefinitivo(id: string): void {
  definir({ ...estado, videos: estado.videos.filter((v) => v.id !== id) });
}

export function esvaziarLixeira(): void {
  definir({ ...estado, videos: estado.videos.filter((v) => v.excluidoEm === null) });
}

// ----- Backup local -----

export function exportarDados(): string {
  return JSON.stringify({ versao: VERSAO_STORE, ...estado }, null, 2);
}

export function importarDados(texto: string): void {
  const dados = JSON.parse(texto) as Partial<EstadoProjetos>;
  definir({
    projetos: Array.isArray(dados.projetos) ? dados.projetos : [],
    videos: Array.isArray(dados.videos) ? dados.videos : [],
  });
}

export function limparTudo(): void {
  definir({ projetos: [], videos: [] });
}
