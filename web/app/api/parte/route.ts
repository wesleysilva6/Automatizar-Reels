import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { access, readFile, unlink, writeFile } from 'node:fs/promises';
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

// Baixa a URL para um arquivo relatando o progresso (0..1) conforme os bytes chegam.
async function baixarComProgresso(
  link: string,
  destino: string,
  onPct: (pct: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const upstream = await fetch(link, { headers: { 'User-Agent': UA }, signal });
  if (!upstream.ok || !upstream.body) {
    throw new Error(`O CDN do TikTok respondeu ${upstream.status}`);
  }
  const total = Number(upstream.headers.get('content-length')) || 0;
  const ws = createWriteStream(destino);
  const reader = upstream.body.getReader();
  let recebido = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      recebido += value.length;
      if (!ws.write(value)) await once(ws, 'drain');
      if (total) onPct(Math.min(1, recebido / total));
    }
    ws.end();
    await once(ws, 'finish');
  } catch (e) {
    // Cliente desistiu (ou a rede caiu): descarta o arquivo parcial para a
    // próxima tentativa baixar do zero, em vez de cortar um vídeo truncado.
    ws.destroy();
    await unlink(destino).catch(() => {});
    throw e;
  }
}

// Roda o ffmpeg relatando o progresso (0..1) a partir do "-progress pipe:1".
function cortarComProgresso(
  args: string[],
  duracaoParte: number,
  onPct: (pct: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('ffmpeg não está disponível neste ambiente'));
      return;
    }
    if (signal.aborted) {
      reject(new Error('Geração cancelada.'));
      return;
    }
    const proc = spawn(ffmpegPath, args);
    // Mata o ffmpeg se o cliente desistir, para não gastar CPU à toa.
    const aoAbortar = () => proc.kill();
    signal.addEventListener('abort', aoAbortar);
    let stderr = '';
    let buf = '';
    proc.stdout.on('data', (d) => {
      buf += String(d);
      let idx: number;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const linha = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        const m = linha.match(/^out_time_us=(\d+)/);
        if (m && duracaoParte > 0) {
          onPct(Math.min(0.99, Number(m[1]) / (duracaoParte * 1_000_000)));
        }
      }
    });
    proc.stderr.on('data', (d) => {
      stderr += String(d);
    });
    proc.on('error', (e) => {
      signal.removeEventListener('abort', aoAbortar);
      reject(e);
    });
    proc.on('close', (code) => {
      signal.removeEventListener('abort', aoAbortar);
      if (signal.aborted) reject(new Error('Geração cancelada.'));
      else if (code === 0) resolve();
      else reject(new Error(`ffmpeg saiu com código ${code}: ${stderr.slice(-400)}`));
    });
  });
}

interface Preparado {
  link: string;
  origem: string;
  saida: string;
  ffArgs: string[];
  duracaoParte: number;
  nome: string;
  overlayPath: string | null;
}

// Valida os parâmetros e monta os caminhos/argumentos do ffmpeg. Quando há um
// overlayPath (PNG do título vindo do cliente), grava-o sobre o vídeo com o filtro
// nativo "overlay" — nada de "drawtext", que não existe em todo build de ffmpeg.
async function preparar(
  params: URLSearchParams,
  overlayPath: string | null,
): Promise<Preparado | { resposta: NextResponse }> {
  const url = (params.get('url') ?? '').trim();
  if (!url || !isTikTokUrl(url)) {
    return { resposta: NextResponse.json({ error: 'Cole um link válido do TikTok.' }, { status: 400 }) };
  }
  const dur = Math.min(600, Math.max(5, parseInt(params.get('dur') ?? '59', 10) || 59));
  const parte = parseInt(params.get('parte') ?? '1', 10);

  const d = await fetchVideoInfo(url);
  const total = Math.max(1, Math.ceil(d.duration / dur));
  if (!Number.isFinite(parte) || parte < 1 || parte > total) {
    return {
      resposta: NextResponse.json(
        { error: `Parte inválida: esse vídeo tem ${total} parte(s) de ${dur}s.` },
        { status: 400 },
      ),
    };
  }
  const link = d.hdplay || d.play;
  if (!link) {
    return { resposta: NextResponse.json({ error: 'Vídeo indisponível para download.' }, { status: 404 }) };
  }

  // Números exibidos no nome do arquivo (permitem continuar a contagem entre vídeos).
  const pnum = parseInt(params.get('pnum') ?? '', 10);
  const ptot = parseInt(params.get('ptot') ?? '', 10);
  const numExibido = Number.isFinite(pnum) && pnum > 0 ? pnum : parte;
  const totExibido = Number.isFinite(ptot) && ptot > 0 ? ptot : total;

  const inicio = (parte - 1) * dur;
  const duracaoParte = Math.max(1, Math.min(dur, d.duration - inicio));

  // Parâmetros de preset (opcionais). Quando "vb" (bitrate de vídeo) vem na query,
  // exporta com resolução/fps/bitrate/áudio do preset da plataforma. Sem eles, o
  // encode é exatamente o mesmo de antes (crf 21 / aac 128k) — retrocompatível.
  const larg = parseInt(params.get('w') ?? '', 10);
  const alt = parseInt(params.get('h') ?? '', 10);
  const fps = parseInt(params.get('fps') ?? '', 10);
  const vb = parseInt(params.get('vb') ?? '', 10); // kbps de vídeo
  const ab = parseInt(params.get('ab') ?? '', 10); // kbps de áudio
  const temPreset = Number.isFinite(vb) && vb > 0;
  const abFinal = temPreset && Number.isFinite(ab) && ab > 0 ? ab : 128;

  const sufixo = `${temPreset ? `_${larg || 0}x${alt || 0}_${vb}` : ''}${overlayPath ? '_ov' : ''}`;
  const origem = join(tmpdir(), `nw_${d.id}.mp4`);
  const saida = join(tmpdir(), `nw_${d.id}_${dur}_${parte}${sufixo}.mp4`);

  // Escala/fps do preset (só no modo preset).
  const filtros: string[] = [];
  if (temPreset && larg > 0 && alt > 0) {
    filtros.push(
      `scale=${larg}:${alt}:force_original_aspect_ratio=decrease`,
      `pad=${larg}:${alt}:(ow-iw)/2:(oh-ih)/2`,
      'setsar=1',
    );
  }
  if (temPreset && Number.isFinite(fps) && fps > 0) filtros.push(`fps=${fps}`);

  const cabecalho = [
    '-hide_banner', '-loglevel', 'error', '-nostats', '-progress', 'pipe:1', '-y',
    '-ss', String(inicio), '-t', String(dur), '-i', origem,
  ];
  const encodeVid = temPreset
    ? ['-b:v', `${vb}k`, '-maxrate', `${Math.round(vb * 1.5)}k`, '-bufsize', `${vb * 2}k`, '-pix_fmt', 'yuv420p']
    : ['-crf', '21'];
  const encodeAudio = ['-c:a', 'aac', '-b:a', `${abFinal}k`, '-movflags', '+faststart'];

  let ffArgs: string[];
  if (overlayPath) {
    // Sobrepõe o PNG do título. "-loop 1" transforma a imagem num fluxo contínuo
    // (senão o título só apareceria no 1º frame e o vídeo sairia quebrado);
    // scale2ref ajusta a imagem a qualquer resolução; "shortest=1" encerra junto
    // com o vídeo; "format=yuv420p" garante um pixel format que todo player abre.
    ffArgs = [
      ...cabecalho,
      '-loop', '1', '-i', overlayPath,
      '-filter_complex',
      '[1:v][0:v]scale2ref[ov][base];[base][ov]overlay=0:0:shortest=1,format=yuv420p[vout]',
      '-map', '[vout]', '-map', '0:a?',
      '-c:v', 'libx264', '-preset', 'veryfast', ...encodeVid,
      ...encodeAudio,
      saida,
    ];
  } else {
    ffArgs = [
      ...cabecalho,
      ...(filtros.length ? ['-vf', filtros.join(',')] : []),
      '-c:v', 'libx264', '-preset', 'veryfast', ...encodeVid,
      ...encodeAudio,
      saida,
    ];
  }

  const nome = `Parte ${String(numExibido).padStart(2, '0')} de ${String(totExibido).padStart(2, '0')}.mp4`;

  return { link, origem, saida, ffArgs, duracaoParte, nome, overlayPath };
}

// Executa o pipeline (download + ffmpeg) e devolve a Response (streaming SSE ou arquivo).
async function responder(
  params: URLSearchParams,
  overlayPath: string | null,
  ac: AbortController,
): Promise<Response> {
  const streaming = params.get('stream') === '1';
  const limparOverlay = () => {
    if (overlayPath) unlink(overlayPath).catch(() => {});
  };

  const prep = await preparar(params, overlayPath);
  if ('resposta' in prep) {
    limparOverlay();
    return prep.resposta;
  }
  const { link, origem, saida, ffArgs, duracaoParte, nome } = prep;

  if (!streaming) {
    if (!(await existe(origem))) {
      const upstream = await fetch(link, { headers: { 'User-Agent': UA }, signal: ac.signal });
      if (!upstream.ok || !upstream.body) {
        limparOverlay();
        return NextResponse.json({ error: `O CDN do TikTok respondeu ${upstream.status}.` }, { status: 502 });
      }
      const web = upstream.body as unknown as import('node:stream/web').ReadableStream;
      try {
        await pipeline(Readable.fromWeb(web), createWriteStream(origem));
      } catch (e) {
        await unlink(origem).catch(() => {});
        throw e;
      }
    }
    await cortarComProgresso(ffArgs, duracaoParte, () => {}, ac.signal);
    const buf = await readFile(saida);
    unlink(saida).catch(() => {});
    limparOverlay();
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${nome}"`,
        'Content-Length': String(buf.length),
        'Cache-Control': 'no-store',
      },
    });
  }

  // Modo streaming (SSE): relata progresso real e entrega o arquivo no evento final.
  const encoder = new TextEncoder();
  const precisaBaixar = !(await existe(origem));
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(o)}\n\n`));
        } catch {
          /* cliente desconectou */
        }
      };
      const progresso = (pct: number, rotulo: string) =>
        send({ tipo: 'progresso', pct: Math.round(pct * 100), rotulo });
      try {
        // Fase 1: download (só na primeira parte; as seguintes reaproveitam o /tmp).
        if (precisaBaixar) {
          progresso(0, 'Baixando vídeo...');
          await baixarComProgresso(link, origem, (p) => progresso(p * 0.4, 'Baixando vídeo...'), ac.signal);
        }
        // Fase 2: corte + reencode.
        const base = precisaBaixar ? 0.4 : 0;
        const escala = precisaBaixar ? 0.6 : 1;
        progresso(base, 'Cortando a parte...');
        await cortarComProgresso(
          ffArgs,
          duracaoParte,
          (p) => progresso(base + p * escala, 'Cortando a parte...'),
          ac.signal,
        );
        progresso(1, 'Finalizando...');
        const buf = await readFile(saida);
        unlink(saida).catch(() => {});
        limparOverlay();
        send({ tipo: 'fim', nome, mime: 'video/mp4', dados: buf.toString('base64') });
      } catch (e) {
        // Remove qualquer saída parcial deixada por um corte interrompido.
        unlink(saida).catch(() => {});
        limparOverlay();
        // Se foi o próprio cliente que desistiu, não há para quem mandar o erro.
        if (!ac.signal.aborted) {
          send({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Erro desconhecido' });
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      // Consumidor (navegador) fechou a conexão: aborta o trabalho em andamento.
      ac.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function GET(req: NextRequest) {
  const ac = new AbortController();
  const aoDesistir = () => ac.abort();
  req.signal.addEventListener('abort', aoDesistir);
  try {
    return await responder(req.nextUrl.searchParams, null, ac);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Falha ao gerar a parte (${msg}). Tente de novo em instantes.` },
      { status: 502 },
    );
  } finally {
    req.signal.removeEventListener('abort', aoDesistir);
  }
}

// POST carrega, além dos parâmetros, o PNG do título (campo "overlay") — precisa vir
// na MESMA requisição do processamento porque o /tmp não é compartilhado entre
// instâncias serverless.
export async function POST(req: NextRequest) {
  const ac = new AbortController();
  const aoDesistir = () => ac.abort();
  req.signal.addEventListener('abort', aoDesistir);
  let overlayPath: string | null = null;
  try {
    const form = await req.formData();
    const params = new URLSearchParams();
    for (const [chave, valor] of form.entries()) {
      if (typeof valor === 'string') params.set(chave, valor);
    }
    const overlay = form.get('overlay');
    if (overlay && typeof overlay !== 'string') {
      const buf = Buffer.from(await overlay.arrayBuffer());
      overlayPath = join(tmpdir(), `nw_ov_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
      await writeFile(overlayPath, buf);
    }
    return await responder(params, overlayPath, ac);
  } catch (e) {
    if (overlayPath) unlink(overlayPath).catch(() => {});
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Falha ao gerar a parte (${msg}). Tente de novo em instantes.` },
      { status: 502 },
    );
  } finally {
    req.signal.removeEventListener('abort', aoDesistir);
  }
}
