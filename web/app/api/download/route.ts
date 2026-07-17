import { NextRequest, NextResponse } from 'next/server';
import { fetchVideoInfo, isTikTokUrl } from '@/lib/tikwm';

// Streaming do arquivo pode levar mais que o padrão em vídeos longos.
export const maxDuration = 60;

function nomeArquivo(titulo: string, ext: string): string {
  const limpo = (titulo || 'video')
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=\r\n]/g, '')
    .trim()
    .slice(0, 80);
  return (limpo || 'video') + ext;
}

export async function GET(req: NextRequest) {
  const url = (req.nextUrl.searchParams.get('url') ?? '').trim();
  const tipo = req.nextUrl.searchParams.get('tipo') ?? 'hd';
  if (!url || !isTikTokUrl(url)) {
    return NextResponse.json({ error: 'Cole um link válido do TikTok.' }, { status: 400 });
  }

  try {
    const d = await fetchVideoInfo(url);

    let link: string | undefined;
    let ext = '.mp4';
    let mime = 'video/mp4';
    if (tipo === 'musica') {
      link = d.music;
      ext = '.mp3';
      mime = 'audio/mpeg';
    } else if (tipo === 'sd') {
      link = d.play;
    } else {
      link = d.hdplay || d.play;
    }
    if (!link) {
      return NextResponse.json({ error: 'Esse formato não está disponível para este vídeo.' }, { status: 404 });
    }

    const upstream = await fetch(link, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: `O CDN do TikTok respondeu ${upstream.status}.` }, { status: 502 });
    }

    const nome = nomeArquivo(d.title, ext);
    const headers = new Headers({
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="download${ext}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      'Cache-Control': 'no-store',
    });
    const len = upstream.headers.get('content-length');
    if (len) headers.set('Content-Length', len);

    return new Response(upstream.body, { headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Falha no download (${msg}). Tente de novo em instantes.` },
      { status: 502 },
    );
  }
}
