import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { access, readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import ffmpegPath from 'ffmpeg-static';
import { fetchVideoInfo, isTikTokUrl } from '@/lib/tikwm';

// Baixar o vídeo + reencodar uma parte pode passar de 1 minuto.
export const maxDuration = 300;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

async function existe(caminho: string): Promise<boolean> {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}

function rodarFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('ffmpeg não está disponível neste ambiente'));
      return;
    }
    const proc = spawn(ffmpegPath, args);
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += String(d);
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg saiu com código ${code}: ${stderr.slice(-400)}`));
    });
  });
}

export async function GET(req: NextRequest) {
  const url = (req.nextUrl.searchParams.get('url') ?? '').trim();
  if (!url || !isTikTokUrl(url)) {
    return NextResponse.json({ error: 'Cole um link válido do TikTok.' }, { status: 400 });
  }
  const dur = Math.min(600, Math.max(5, parseInt(req.nextUrl.searchParams.get('dur') ?? '59', 10) || 59));
  const parte = parseInt(req.nextUrl.searchParams.get('parte') ?? '1', 10);

  try {
    const d = await fetchVideoInfo(url);
    const total = Math.max(1, Math.ceil(d.duration / dur));
    if (!Number.isFinite(parte) || parte < 1 || parte > total) {
      return NextResponse.json(
        { error: `Parte inválida: esse vídeo tem ${total} parte(s) de ${dur}s.` },
        { status: 400 },
      );
    }
    const link = d.hdplay || d.play;
    if (!link) {
      return NextResponse.json({ error: 'Vídeo indisponível para download.' }, { status: 404 });
    }

    // Baixa o vídeo inteiro uma vez para o /tmp; execuções seguintes na
    // mesma instância reaproveitam o arquivo.
    const origem = join(tmpdir(), `nw_${d.id}.mp4`);
    if (!(await existe(origem))) {
      const upstream = await fetch(link, { headers: { 'User-Agent': UA } });
      if (!upstream.ok || !upstream.body) {
        return NextResponse.json({ error: `O CDN do TikTok respondeu ${upstream.status}.` }, { status: 502 });
      }
      const web = upstream.body as unknown as import('node:stream/web').ReadableStream;
      await pipeline(Readable.fromWeb(web), createWriteStream(origem));
    }

    // Reencoda (como o NovaWave desktop) para o corte cair exatamente no
    // segundo pedido — com "-c copy" o corte cairia no keyframe mais próximo.
    const inicio = (parte - 1) * dur;
    const saida = join(tmpdir(), `nw_${d.id}_${dur}_${parte}.mp4`);
    await rodarFfmpeg([
      '-hide_banner', '-loglevel', 'error', '-y',
      '-ss', String(inicio), '-t', String(dur), '-i', origem,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
      saida,
    ]);

    const buf = await readFile(saida);
    unlink(saida).catch(() => {});

    const nome = `Parte ${String(parte).padStart(2, '0')} de ${String(total).padStart(2, '0')}.mp4`;
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${nome}"`,
        'Content-Length': String(buf.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Falha ao gerar a parte (${msg}). Tente de novo em instantes.` },
      { status: 502 },
    );
  }
}
