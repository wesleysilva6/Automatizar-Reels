import { NextRequest, NextResponse } from 'next/server';
import { fetchVideoInfo, isTikTokUrl } from '@/lib/tikwm';

export async function GET(req: NextRequest) {
  const url = (req.nextUrl.searchParams.get('url') ?? '').trim();
  if (!url || !isTikTokUrl(url)) {
    return NextResponse.json({ error: 'Cole um link válido do TikTok.' }, { status: 400 });
  }

  try {
    const d = await fetchVideoInfo(url);
    const partes = Math.max(1, Math.ceil(d.duration / 59));
    return NextResponse.json({
      id: d.id,
      title: d.title || '(sem descrição)',
      cover: d.cover,
      duration: d.duration,
      partes,
      author: d.author?.unique_id ?? '',
      temHd: Boolean(d.hdplay),
      temMusica: Boolean(d.music),
      tamanhoHd: d.hd_size ?? null,
      tamanhoSd: d.size ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Não foi possível buscar o vídeo (${msg}). Tente de novo em instantes.` },
      { status: 502 },
    );
  }
}
