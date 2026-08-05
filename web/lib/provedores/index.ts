// Ponto único de entrada dos provedores: as rotas de API falam só com este
// módulo e não precisam saber de onde o vídeo veio.

import { fetchVideoInfo, isTikTokUrl } from '@/lib/tikwm';
import { isYoutubeUrl, obterInfoYoutube } from './youtube';
import type { InfoVideo, Origem } from './tipos';

export const ERRO_LINK = 'Cole um link válido do TikTok ou do YouTube.';

export function detectarOrigem(url: string): Origem | null {
  if (isTikTokUrl(url)) return 'tiktok';
  if (isYoutubeUrl(url)) return 'youtube';
  return null;
}

// Por segurança as rotas só aceitam os domínios que sabemos tratar — nada de
// virar proxy de URL qualquer.
export function urlSuportada(url: string): boolean {
  return detectarOrigem(url) !== null;
}

export async function obterInfo(url: string, signal?: AbortSignal): Promise<InfoVideo> {
  switch (detectarOrigem(url)) {
    case 'youtube':
      return obterInfoYoutube(url, signal);
    case 'tiktok': {
      const d = await fetchVideoInfo(url);
      return {
        id: d.id,
        origem: 'tiktok',
        titulo: d.title || '(sem descrição)',
        capa: d.cover,
        duracao: Math.floor(d.duration),
        autor: d.author?.unique_id ?? '',
        // A tikwm não informa a resolução; o TikTok entrega vertical 9:16.
        largura: 1080,
        altura: 1920,
        // O TikTok entrega o vídeo já com o áudio embutido nos dois formatos.
        hd: d.hdplay || d.play,
        sd: d.play,
        musica: d.music,
        extMusica: '.mp3',
        tamanhoHd: d.hd_size ?? null,
        tamanhoSd: d.size ?? null,
        leitura: 'arquivo',
      };
    }
    default:
      throw new Error(ERRO_LINK);
  }
}
