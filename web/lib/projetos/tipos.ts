// Domínio da organização por projetos. Tudo mora no localStorage (sem backend):
// projetos agrupam entradas de vídeo, que guardam apenas metadados (não o arquivo).

export interface Projeto {
  id: string;
  nome: string;
  cor: string; // hex
  icone: string; // emoji
  descricao: string;
  criadoEm: number;
  atualizadoEm: number;
  acessadoEm: number; // usado em "Recentes"
  favorito: boolean;
}

export interface VideoEntry {
  id: string;
  projetoId: string;
  url: string; // link original do TikTok
  titulo: string;
  capa: string;
  autor: string;
  duracao: number; // segundos
  criadoEm: number;
  atualizadoEm: number;
  favorito: boolean;
  excluidoEm: number | null; // quando != null, está na Lixeira
}

export interface EstadoProjetos {
  projetos: Projeto[];
  videos: VideoEntry[];
}

export const VERSAO_STORE = 1;
export const CHAVE_STORE = 'novawave:projetos:v1';

// Paletas prontas para o modal de criação (visual consistente).
export const CORES: string[] = [
  '#7c3aed',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#06b6d4',
  '#a855f7',
];

export const ICONES: string[] = [
  '📁',
  '🎬',
  '🎙️',
  '⚡',
  '🔥',
  '💼',
  '🌙',
  '🎯',
  '📈',
  '✨',
  '🎥',
  '📱',
];
