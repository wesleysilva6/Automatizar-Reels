// Provedor do YouTube.
//
// Ao contrário do TikTok — que tem uma API pública (tikwm) devolvendo URLs de CDN
// prontas —, o YouTube só libera os streams para quem resolve o desafio de
// assinatura do player. Nenhuma biblioteca JS pura consegue mais fazer isso
// (todos os clientes da API interna passaram a exigir PO Token), então aqui usamos
// o **yt-dlp**: o mesmo binário que o programa do Windows já usa em `tools/`.

import { spawn } from 'node:child_process';
import type { InfoVideo } from './tipos';

const YOUTUBE_URL_RE =
  /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?|shorts\/|live\/|embed\/|v\/)|youtu\.be\/)\S+/i;

// Acima de 1080p o arquivo cresce muito mais do que os stories aproveitam.
const ALTURA_MAX = 1080;
const TIMEOUT_MS = 90_000;

export const ERRO_SEM_YTDLP =
  'O suporte a YouTube depende do yt-dlp, que não está disponível neste servidor. ' +
  'Rode o NovaWave no seu PC (npm run dev) — ele acha sozinho o tools/yt-dlp.exe — ' +
  'ou aponte a variável YTDLP_PATH para o binário.';

export function isYoutubeUrl(url: string): boolean {
  return YOUTUBE_URL_RE.test(url);
}

// ---------------------------------------------------------------- binário ----

const NOMES_BINARIO = process.platform === 'win32' ? ['yt-dlp.exe'] : ['yt-dlp', 'yt-dlp_linux'];

let ytDlpEncontrado: Promise<string> | null = null;

// Onde procurar, em ordem: a variável de ambiente ganha de tudo; depois o tools/
// do projeto (rodando localmente o processo sobe em `web/`, daí também o `..`);
// por último o PATH do sistema.
//
// Os caminhos do projeto são relativos de propósito — o sistema operacional já os
// resolve a partir do diretório do processo. Montá-los com `path.join` e
// `process.cwd()` faz o rastreador de arquivos do build supor que vamos ler algo
// imprevisível ali dentro e, por precaução, empacotar o projeto inteiro junto da
// função serverless.
function caminhosCandidatos(): string[] {
  const lista: string[] = [];
  if (process.env.YTDLP_PATH) lista.push(process.env.YTDLP_PATH);
  for (const raiz of ['tools', '../tools']) {
    for (const nome of NOMES_BINARIO) lista.push(`${raiz}/${nome}`);
  }
  lista.push('yt-dlp');
  return lista;
}

// Sonda cada candidato rodando "--version". Testar assim, em vez de checar o
// arquivo com fs.access, é de propósito: uma leitura de disco em caminho montado
// em tempo de execução faz o rastreador do build empacotar o projeto inteiro
// junto da função, por não conseguir prever o que vai ser lido.
async function localizarYtDlp(): Promise<string> {
  if (ytDlpEncontrado) return ytDlpEncontrado;
  const busca = (async () => {
    for (const caminho of caminhosCandidatos()) {
      try {
        await executar(caminho, ['--version'], 15_000);
        return caminho;
      } catch {
        /* não está aqui: tenta o próximo */
      }
    }
    throw new Error(ERRO_SEM_YTDLP);
  })();
  ytDlpEncontrado = busca;
  try {
    return await busca;
  } catch (e) {
    // Não memoriza a falha: o binário pode ser instalado depois, sem reiniciar.
    ytDlpEncontrado = null;
    throw e;
  }
}

function executar(
  bin: string,
  args: string[],
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { signal });
    let saida = '';
    let erro = '';
    const relogio = setTimeout(() => {
      proc.kill();
      reject(new Error('o yt-dlp demorou demais para responder'));
    }, timeoutMs);
    proc.stdout.on('data', (d) => {
      saida += String(d);
    });
    proc.stderr.on('data', (d) => {
      erro += String(d);
    });
    proc.on('error', (e) => {
      clearTimeout(relogio);
      reject(e);
    });
    proc.on('close', (code) => {
      clearTimeout(relogio);
      if (code === 0) resolve(saida);
      // A última linha do stderr costuma ser a mensagem útil ("Video unavailable").
      else reject(new Error(erro.trim().split('\n').pop()?.trim() || `yt-dlp saiu com código ${code}`));
    });
  });
}

// ---------------------------------------------------------------- extração ---

interface FormatoYtDlp {
  format_id?: string;
  url?: string;
  ext?: string;
  protocol?: string;
  vcodec?: string;
  acodec?: string;
  width?: number;
  height?: number;
  abr?: number;
  tbr?: number;
  filesize?: number;
  filesize_approx?: number;
}

interface DumpYtDlp {
  id?: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  uploader?: string;
  uploader_id?: string;
  channel?: string;
  live_status?: string;
  is_live?: boolean;
  formats?: FormatoYtDlp[];
}

const ARGS_DUMP = ['--no-playlist', '--no-warnings', '--dump-single-json'];

// O yt-dlp moderno precisa de um runtime JS para decifrar as assinaturas do
// YouTube; apontamos para o próprio Node que já está rodando.
async function dump(url: string, signal?: AbortSignal): Promise<DumpYtDlp> {
  const bin = await localizarYtDlp();
  const comRuntime = ['--js-runtimes', `node:${process.execPath}`, ...ARGS_DUMP, '--', url];
  try {
    return JSON.parse(await executar(bin, comRuntime, TIMEOUT_MS, signal));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    // Binário antigo não conhece --js-runtimes: tenta sem ele (pode faltar formato).
    if (!/no such option|unrecognized/i.test(msg)) throw e;
    return JSON.parse(await executar(bin, [...ARGS_DUMP, '--', url], TIMEOUT_MS, signal));
  }
}

const temUrlHttps = (f: FormatoYtDlp) => f.protocol === 'https' && Boolean(f.url);
const soVideo = (f: FormatoYtDlp) => Boolean(f.vcodec && f.vcodec !== 'none') && (!f.acodec || f.acodec === 'none');
const soAudio = (f: FormatoYtDlp) => Boolean(f.acodec && f.acodec !== 'none') && (!f.vcodec || f.vcodec === 'none');
const completo = (f: FormatoYtDlp) =>
  Boolean(f.vcodec && f.vcodec !== 'none') && Boolean(f.acodec && f.acodec !== 'none');

function bytes(f?: FormatoYtDlp): number | null {
  return f?.filesize ?? f?.filesize_approx ?? null;
}

// Prefere H.264: é o que todo player abre e o que o ffmpeg reencoda mais rápido.
// Se o vídeo só tiver VP9/AV1, aceita mesmo assim (o corte reencoda de qualquer jeito).
function melhorVideo(formatos: FormatoYtDlp[]): FormatoYtDlp | undefined {
  const candidatos = formatos.filter(
    (f) => temUrlHttps(f) && soVideo(f) && (f.height ?? 0) <= ALTURA_MAX,
  );
  const h264 = candidatos.filter((f) => (f.vcodec ?? '').startsWith('avc1'));
  const alvo = h264.length ? h264 : candidatos;
  return alvo.sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? 0) - (a.tbr ?? 0))[0];
}

function melhorAudio(formatos: FormatoYtDlp[]): FormatoYtDlp | undefined {
  const candidatos = formatos.filter((f) => temUrlHttps(f) && soAudio(f));
  const m4a = candidatos.filter((f) => f.ext === 'm4a');
  const alvo = m4a.length ? m4a : candidatos;
  return alvo.sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0))[0];
}

function melhorCompleto(formatos: FormatoYtDlp[]): FormatoYtDlp | undefined {
  return formatos
    .filter((f) => temUrlHttps(f) && completo(f))
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
}

// As URLs do YouTube são temporárias e presas ao IP, mas valem horas — guardar por
// alguns minutos evita rodar o yt-dlp de novo a cada parte ao gerar um vídeo longo.
const CACHE_MS = 5 * 60_000;
const cache = new Map<string, { em: number; info: InfoVideo }>();

export async function obterInfoYoutube(url: string, signal?: AbortSignal): Promise<InfoVideo> {
  const guardado = cache.get(url);
  if (guardado && Date.now() - guardado.em < CACHE_MS) return guardado.info;

  const d = await dump(url, signal);
  if (d.is_live || (d.live_status && d.live_status !== 'not_live' && d.live_status !== 'was_live')) {
    throw new Error('Transmissões ao vivo não podem ser cortadas em partes.');
  }
  const duracao = Math.floor(d.duration ?? 0);
  if (!duracao) throw new Error('Não consegui descobrir a duração desse vídeo.');

  const formatos = d.formats ?? [];
  const video = melhorVideo(formatos);
  const audio = melhorAudio(formatos);
  const juntos = melhorCompleto(formatos);
  if (!video && !juntos) throw new Error('Esse vídeo não tem nenhum formato que dê para baixar.');

  // Sem faixa de áudio separada, o "HD" mudo não serve — cai para o formato completo.
  const usarSeparado = Boolean(video && audio);
  const tamanhoHd = usarSeparado ? (bytes(video) ?? 0) + (bytes(audio) ?? 0) || null : null;

  // O canal já vem como "@nome"; a interface põe o "@" na frente.
  const autor = (d.uploader_id ?? d.uploader ?? d.channel ?? '').replace(/^@/, '');

  const escolhido = usarSeparado ? video : juntos;

  const info: InfoVideo = {
    id: d.id ?? 'youtube',
    origem: 'youtube',
    titulo: d.title || '(sem título)',
    capa: d.thumbnail ?? '',
    duracao,
    autor,
    largura: escolhido?.width || 1080,
    altura: escolhido?.height || 1920,
    hd: usarSeparado ? video?.url : juntos?.url,
    sd: juntos?.url,
    faixaAudio: usarSeparado ? audio?.url : undefined,
    musica: audio?.url,
    extMusica: '.m4a',
    tamanhoHd: usarSeparado ? tamanhoHd : bytes(juntos),
    tamanhoSd: bytes(juntos),
    leitura: 'remoto',
  };

  cache.set(url, { em: Date.now(), info });
  return info;
}
