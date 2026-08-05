import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import ffmpegPath from 'ffmpeg-static';
import { ERRO_LINK, obterInfo, urlSuportada } from '@/lib/provedores';
import type { InfoVideo } from '@/lib/provedores/tipos';

// Streaming do arquivo pode levar mais que o padrão em vídeos longos.
export const maxDuration = 300;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

function nomeArquivo(titulo: string, ext: string): string {
  const limpo = (titulo || 'video')
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=\r\n]/g, '')
    .trim()
    .slice(0, 80);
  return (limpo || 'video') + ext;
}

// No YouTube o 1080p vem em faixas separadas (DASH), então não dá para simplesmente
// repassar uma URL: juntamos vídeo e áudio no ffmpeg. É só remux (`-c copy`), sem
// reencodar, e o resultado sai em streaming — o navegador começa a baixar na hora.
function juntarFaixas(video: string, audio: string, nome: string, signal: AbortSignal): Response {
  if (!ffmpegPath) {
    return NextResponse.json({ error: 'ffmpeg não está disponível neste ambiente.' }, { status: 500 });
  }
  const entrada = (u: string) => [
    '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5',
    '-user_agent', UA, '-i', u,
  ];
  const proc = spawn(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error',
    ...entrada(video),
    ...entrada(audio),
    '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy',
    // Sem esses flags o mp4 só fecharia no fim (o índice fica no final do arquivo),
    // o que impede o streaming; fragmentado dá para escrever conforme sai.
    '-movflags', 'frag_keyframe+empty_moov',
    '-f', 'mp4', 'pipe:1',
  ]);

  // O corpo da resposta já começou: se o ffmpeg falhar, não há mais como trocar o
  // status. Registrar o motivo no log é o que evita um download vazio e mudo.
  let stderr = '';
  proc.stderr.on('data', (d) => {
    stderr = (stderr + String(d)).slice(-2000);
  });
  const encerrar = () => proc.kill();
  signal.addEventListener('abort', encerrar);
  proc.on('close', (code) => {
    signal.removeEventListener('abort', encerrar);
    if (code !== 0 && !signal.aborted) {
      console.error(`[download] ffmpeg saiu com código ${code}: ${stderr.trim()}`);
    }
  });

  const corpo = Readable.toWeb(proc.stdout) as unknown as ReadableStream<Uint8Array>;
  return new Response(corpo, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="download.mp4"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      'Cache-Control': 'no-store',
    },
  });
}

// Escolhe a mídia pedida. Devolve `null` quando aquele formato não existe no vídeo.
function escolher(d: InfoVideo, tipo: string): { link: string; ext: string; mime: string } | null {
  if (tipo === 'musica') {
    return d.musica ? { link: d.musica, ext: d.extMusica, mime: d.extMusica === '.mp3' ? 'audio/mpeg' : 'audio/mp4' } : null;
  }
  const link = tipo === 'sd' ? d.sd : (d.hd ?? d.sd);
  return link ? { link, ext: '.mp4', mime: 'video/mp4' } : null;
}

export async function GET(req: NextRequest) {
  const url = (req.nextUrl.searchParams.get('url') ?? '').trim();
  const tipo = req.nextUrl.searchParams.get('tipo') ?? 'hd';
  if (!url || !urlSuportada(url)) {
    return NextResponse.json({ error: ERRO_LINK }, { status: 400 });
  }

  try {
    const d = await obterInfo(url, req.signal);

    // HD com faixa de áudio separada precisa ser remuxado antes de sair.
    if (tipo === 'hd' && d.hd && d.faixaAudio) {
      return juntarFaixas(d.hd, d.faixaAudio, nomeArquivo(d.titulo, '.mp4'), req.signal);
    }

    const escolhido = escolher(d, tipo);
    if (!escolhido) {
      return NextResponse.json({ error: 'Esse formato não está disponível para este vídeo.' }, { status: 404 });
    }

    const upstream = await fetch(escolhido.link, { headers: { 'User-Agent': UA }, signal: req.signal });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: `O servidor de origem respondeu ${upstream.status}.` }, { status: 502 });
    }

    const nome = nomeArquivo(d.titulo, escolhido.ext);
    const headers = new Headers({
      'Content-Type': escolhido.mime,
      'Content-Disposition': `attachment; filename="download${escolhido.ext}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
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
