// Presets de exportação por plataforma. Cada um vira parâmetros REAIS de ffmpeg
// (resolução, fps, bitrate de vídeo/áudio) na rota /api/parte — não são rótulos.

export interface Preset {
  id: string;
  nome: string;
  icone: string;
  descricao: string;
  largura: number;
  altura: number;
  fps: number;
  vbitrate: number; // kbps de vídeo
  abitrate: number; // kbps de áudio
  codec: string;
  formato: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'instagram',
    nome: 'Instagram Reels',
    icone: '📱',
    descricao: 'Vertical 9:16 fluido para o feed e Reels do Instagram.',
    largura: 1080,
    altura: 1920,
    fps: 30,
    vbitrate: 8000,
    abitrate: 320,
    codec: 'H.264',
    formato: 'MP4',
  },
  {
    id: 'tiktok',
    nome: 'TikTok',
    icone: '🎵',
    descricao: '60 fps e bitrate alto para máxima nitidez no For You.',
    largura: 1080,
    altura: 1920,
    fps: 60,
    vbitrate: 12000,
    abitrate: 320,
    codec: 'H.264',
    formato: 'MP4',
  },
  {
    id: 'youtube',
    nome: 'YouTube Shorts',
    icone: '▶️',
    descricao: 'Bitrate otimizado para o processamento do YouTube.',
    largura: 1080,
    altura: 1920,
    fps: 60,
    vbitrate: 12000,
    abitrate: 256,
    codec: 'H.264',
    formato: 'MP4',
  },
  {
    id: 'facebook',
    nome: 'Facebook Reels',
    icone: '📘',
    descricao: 'Equilíbrio de qualidade e tamanho para o Facebook.',
    largura: 1080,
    altura: 1920,
    fps: 30,
    vbitrate: 8000,
    abitrate: 256,
    codec: 'H.264',
    formato: 'MP4',
  },
  {
    id: 'kwai',
    nome: 'Kwai',
    icone: '📺',
    descricao: 'Leve e compatível com a rede do Kwai.',
    largura: 1080,
    altura: 1920,
    fps: 30,
    vbitrate: 6000,
    abitrate: 192,
    codec: 'H.264',
    formato: 'MP4',
  },
  {
    id: 'master',
    nome: 'Arquivo Mestre',
    icone: '🎬',
    descricao: 'Máxima qualidade para arquivar ou reeditar depois.',
    largura: 1080,
    altura: 1920,
    fps: 60,
    vbitrate: 20000,
    abitrate: 320,
    codec: 'H.264',
    formato: 'MP4',
  },
];

export function presetPorId(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

// Estimativa real do tamanho final: (bitrate total / 8) * duração.
export function tamanhoEstimadoBytes(preset: Preset, duracaoSeg: number): number {
  const kbitsTotais = (preset.vbitrate + preset.abitrate) * Math.max(1, duracaoSeg);
  return Math.round((kbitsTotais * 1000) / 8);
}

export function formatarBytes(bytes: number): string {
  if (bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
