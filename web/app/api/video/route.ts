import { NextRequest, NextResponse } from 'next/server';
import { ERRO_LINK, obterInfo, urlSuportada } from '@/lib/provedores';

// Resolver um link do YouTube roda o yt-dlp, que leva alguns segundos.
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const url = (req.nextUrl.searchParams.get('url') ?? '').trim();
  if (!url || !urlSuportada(url)) {
    return NextResponse.json({ error: ERRO_LINK }, { status: 400 });
  }

  try {
    const d = await obterInfo(url, req.signal);
    const partes = Math.max(1, Math.ceil(d.duracao / 59));
    return NextResponse.json({
      id: d.id,
      origem: d.origem,
      title: d.titulo,
      cover: d.capa,
      duration: d.duracao,
      partes,
      author: d.autor,
      largura: d.largura,
      altura: d.altura,
      temHd: Boolean(d.hd),
      temMusica: Boolean(d.musica),
      extMusica: d.extMusica,
      tamanhoHd: d.tamanhoHd,
      tamanhoSd: d.tamanhoSd,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Não foi possível buscar o vídeo (${msg}). Tente de novo em instantes.` },
      { status: 502 },
    );
  }
}
