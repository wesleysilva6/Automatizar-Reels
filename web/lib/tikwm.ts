// Cliente da API pública tikwm.com — a mesma usada por sites como ssstik.io.
// Ela resolve o link do TikTok e devolve URLs diretas do CDN (HD, SD e áudio).

const TIKTOK_URL_RE = /^https?:\/\/(www\.|vm\.|vt\.|m\.)?tiktok\.com\/\S+/i;

export interface TikwmData {
  id: string;
  title: string;
  cover: string;
  duration: number;
  play: string;
  hdplay?: string;
  music?: string;
  size?: number;
  hd_size?: number;
  author?: { unique_id: string; nickname: string };
}

export function isTikTokUrl(url: string): boolean {
  return TIKTOK_URL_RE.test(url);
}

export async function fetchVideoInfo(url: string): Promise<TikwmData> {
  const api = 'https://www.tikwm.com/api/?hd=1&url=' + encodeURIComponent(url);
  const res = await fetch(api, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Serviço de download respondeu ${res.status}`);
  }
  const json = await res.json();
  if (json.code !== 0 || !json.data) {
    throw new Error(json.msg || 'Vídeo não encontrado');
  }
  return json.data as TikwmData;
}
