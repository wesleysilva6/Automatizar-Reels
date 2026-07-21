'use client';

import { useEffect, useRef, useState } from 'react';
import { zip } from 'fflate';
import { salvarVideo } from '@/lib/projetos/store';
import { baixarBlob, executarParteSSE } from '@/lib/exportar/stream';

interface VideoInfo {
  id: string;
  title: string;
  cover: string;
  duration: number;
  partes: number;
  author: string;
  temHd: boolean;
  temMusica: boolean;
  tamanhoHd: number | null;
  tamanhoSd: number | null;
}

interface Progresso {
  parte: number;
  pct: number;
  rotulo: string;
}

interface DownloaderProps {
  // Quando definido, cada vídeo buscado é salvo na biblioteca desse projeto.
  projetoId?: string;
  // Esconde o hero/rodapé para uso embutido dentro de um projeto.
  compacto?: boolean;
  // Notifica a tela pai que um vídeo foi salvo (ex.: fechar o painel de importar).
  onSalvar?: () => void;
}

function formatarDuracao(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatarTamanho(bytes: number | null): string {
  if (!bytes) return '';
  return ` (${(bytes / 1024 / 1024).toFixed(1)} MB)`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Empacota as partes num único .zip. Modo "store" (level 0): mp4 já é comprimido,
// então recomprimir só gastaria CPU sem reduzir o tamanho.
function ziparPartes(arquivos: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(arquivos, { level: 0 }, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

export default function Downloader({ projetoId, compacto, onSalvar }: DownloaderProps) {
  const [link, setLink] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [linkBuscado, setLinkBuscado] = useState('');
  const [segundos, setSegundos] = useState(59);
  const [baixandoParte, setBaixandoParte] = useState<number | null>(null);
  const [baixandoTodas, setBaixandoTodas] = useState(false);
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  // Numeração: permite continuar a contagem quando um vídeo é sequência de outro.
  const [inicioParte, setInicioParte] = useState(1);
  const [totalManual, setTotalManual] = useState('');
  // Permite cancelar a geração de parte(s) em andamento (aborta o fetch, e o
  // servidor mata o download/ffmpeg ao ver a conexão cair).
  const abortRef = useRef<AbortController | null>(null);

  // Duração de cada parte é uma preferência: lê a salva depois de montar (evita
  // divergência de hidratação) e regrava sempre que muda.
  useEffect(() => {
    const salvo = parseInt(localStorage.getItem('nw:segundos') ?? '', 10);
    if (Number.isFinite(salvo) && salvo >= 10 && salvo <= 120) setSegundos(salvo);
  }, []);
  useEffect(() => {
    localStorage.setItem('nw:segundos', String(segundos));
  }, [segundos]);

  const totalPartesLocal = video ? Math.max(1, Math.ceil(video.duration / segundos)) : 0;
  const totalExibido =
    totalManual.trim() && parseInt(totalManual, 10) > 0
      ? parseInt(totalManual, 10)
      : inicioParte - 1 + totalPartesLocal;

  const ocupado = baixandoParte !== null || baixandoTodas;

  function numExibido(localN: number): number {
    return inicioParte - 1 + localN;
  }

  function nomeZip(): string {
    const base = (video?.title || 'NovaWave')
      .replace(/[\\/:*?"<>|#%&{}$!'@+`=\r\n]/g, '')
      .trim()
      .slice(0, 60);
    return `${base || 'NovaWave'} - partes.zip`;
  }

  async function buscar(url: string) {
    const alvo = url.trim();
    if (!alvo) {
      setErro('Cole o link do TikTok primeiro.');
      return;
    }
    setCarregando(true);
    setErro('');
    setVideo(null);
    try {
      const res = await fetch('/api/video?url=' + encodeURIComponent(alvo));
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao buscar o vídeo.');
      }
      const info = json as VideoInfo;
      setVideo(info);
      setLinkBuscado(alvo);
      setInicioParte(1);
      setTotalManual('');
      // Dentro de um projeto: registra o vídeo na biblioteca local (só metadados).
      if (projetoId) {
        salvarVideo({
          projetoId,
          url: alvo,
          titulo: info.title || '(sem título)',
          capa: info.cover || '',
          autor: info.author || '',
          duracao: info.duration || 0,
        });
        onSalvar?.();
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado. Tente de novo.');
    } finally {
      setCarregando(false);
    }
  }

  async function colar() {
    try {
      const texto = (await navigator.clipboard.readText()).trim();
      if (texto) {
        setLink(texto);
        buscar(texto);
      }
    } catch {
      setErro('Não consegui ler a área de transferência. Cole com Ctrl+V.');
    }
  }

  function urlDownload(tipo: string): string {
    return '/api/download?tipo=' + tipo + '&url=' + encodeURIComponent(linkBuscado);
  }

  const dispararDownload = baixarBlob;

  // Gera uma parte lendo o progresso em tempo real (SSE) e devolve o arquivo pronto.
  async function gerarParte(
    localN: number,
    onProgresso: (p: Progresso) => void,
    signal: AbortSignal,
  ): Promise<{ blob: Blob; nome: string }> {
    const numero = numExibido(localN);
    const params = new URLSearchParams({
      stream: '1',
      parte: String(localN),
      dur: String(segundos),
      pnum: String(numero),
      ptot: String(totalExibido),
      url: linkBuscado,
    });
    const { blob } = await executarParteSSE(
      params,
      (p) => onProgresso({ parte: localN, pct: p.pct, rotulo: p.rotulo }),
      signal,
    );
    const nome = `Parte ${pad2(numero)} de ${pad2(totalExibido)}.mp4`;
    return { blob, nome };
  }

  function cancelar() {
    abortRef.current?.abort();
  }

  async function baixarParte(localN: number) {
    if (ocupado) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBaixandoParte(localN);
    setErro('');
    setProgresso({ parte: localN, pct: 0, rotulo: 'Iniciando...' });
    try {
      const { blob, nome } = await gerarParte(localN, setProgresso, controller.signal);
      dispararDownload(blob, nome);
    } catch (e) {
      // Cancelamento do usuário não é erro.
      if (!controller.signal.aborted) {
        setErro(e instanceof Error ? e.message : 'Erro inesperado ao gerar a parte.');
      }
    } finally {
      abortRef.current = null;
      setBaixandoParte(null);
      setProgresso(null);
    }
  }

  async function baixarTodas() {
    if (ocupado) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBaixandoTodas(true);
    setErro('');
    try {
      // Gera cada parte (com progresso real) e acumula em memória; no fim entrega
      // tudo num único .zip — evita os N downloads separados que o navegador bloqueia.
      const arquivos: Record<string, Uint8Array> = {};
      for (let n = 1; n <= totalPartesLocal; n++) {
        setProgresso({ parte: n, pct: 0, rotulo: `Parte ${n} de ${totalPartesLocal}...` });
        const { blob, nome } = await gerarParte(
          n,
          (p) => setProgresso({ ...p, rotulo: `(${n}/${totalPartesLocal}) ${p.rotulo}` }),
          controller.signal,
        );
        arquivos[nome] = new Uint8Array(await blob.arrayBuffer());
      }
      setProgresso({ parte: totalPartesLocal, pct: 100, rotulo: 'Compactando as partes...' });
      const zipBytes = await ziparPartes(arquivos);
      // Cópia para um Uint8Array respaldado por ArrayBuffer (o fflate devolve
      // ArrayBufferLike, que o construtor do Blob não aceita direto no TS atual).
      dispararDownload(new Blob([new Uint8Array(zipBytes)], { type: 'application/zip' }), nomeZip());
    } catch (e) {
      // Cancelamento do usuário não é erro.
      if (!controller.signal.aborted) {
        setErro(e instanceof Error ? e.message : 'Erro inesperado ao gerar as partes.');
      }
    } finally {
      abortRef.current = null;
      setBaixandoTodas(false);
      setProgresso(null);
    }
  }

  return (
    <div className={compacto ? 'downloader downloader-compacto' : 'pagina'}>
      {!compacto && (
        <div className="hero">
          <h1>NovaWave</h1>
          <p>Baixe vídeos do TikTok em HD, sem marca d&rsquo;água e com áudio.</p>
        </div>
      )}

      <div className="busca">
        <input
          type="url"
          placeholder="Cole aqui o link do TikTok..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') buscar(link);
          }}
          disabled={carregando}
        />
        <button className="botao botao-colar" onClick={colar} disabled={carregando}>
          Colar
        </button>
        <button className="botao botao-baixar" onClick={() => buscar(link)} disabled={carregando}>
          Buscar
        </button>
      </div>

      {carregando && (
        <div className="carregando">
          <span className="girando" />
          Buscando informações do vídeo...
        </div>
      )}

      {erro && <div className="erro">{erro}</div>}

      {video && (
        <div className="cartao">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={video.cover} alt="Capa do vídeo" referrerPolicy="no-referrer" />
          <div className="info">
            <h2>{video.title}</h2>
            <span className="meta">
              @{video.author} &nbsp;•&nbsp; {formatarDuracao(video.duration)} de duração
            </span>
            <div className="acoes">
              <a className="botao botao-baixar" href={urlDownload('hd')}>
                Baixar tudo{video.temHd ? ' em HD' : ''}
                {formatarTamanho(video.tamanhoHd ?? video.tamanhoSd)}
              </a>
              <a className="botao botao-secundario" href={urlDownload('sd')}>
                Qualidade menor{formatarTamanho(video.tamanhoSd)}
              </a>
              {video.temMusica && (
                <a className="botao botao-secundario" href={urlDownload('musica')}>
                  Só a música (MP3)
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {video && (
        <div className="cartao cartao-partes">
          <div className="info">
            <h2>Baixar em partes já cortadas</h2>
            <span className="meta">
              Perfeito para stories: cada parte sai pronta, no tempo que você escolher.
            </span>

            <div className="ajuste">
              <label htmlFor="segundos">Duração de cada parte:</label>
              <input
                id="segundos"
                type="range"
                min={10}
                max={120}
                step={1}
                value={segundos}
                onChange={(e) => setSegundos(parseInt(e.target.value, 10))}
                disabled={ocupado}
              />
              <span className="valor-segundos">{segundos}s</span>
            </div>

            <div className="numeracao">
              <span className="numeracao-titulo">Numeração das partes:</span>
              <label>
                começar na parte
                <input
                  type="number"
                  min={1}
                  value={inicioParte}
                  onChange={(e) => setInicioParte(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  disabled={ocupado}
                />
              </label>
              <label>
                de
                <input
                  type="number"
                  min={1}
                  placeholder={String(inicioParte - 1 + totalPartesLocal)}
                  value={totalManual}
                  onChange={(e) => setTotalManual(e.target.value.replace(/\D/g, ''))}
                  disabled={ocupado}
                />
                no total
              </label>
            </div>
            {inicioParte > 1 && (
              <span className="dica-numeracao">
                Este vídeo é continuação: as partes vão de{' '}
                <strong>
                  Parte {inicioParte} de {totalExibido}
                </strong>{' '}
                até{' '}
                <strong>
                  Parte {inicioParte - 1 + totalPartesLocal} de {totalExibido}
                </strong>
                .
              </span>
            )}

            <span className="partes">
              {totalPartesLocal === 1
                ? 'Com essa duração, o vídeo cabe em 1 parte única.'
                : `Com ${segundos}s por parte, o vídeo vira ${totalPartesLocal} partes.`}
            </span>

            <div className="acoes lista-partes">
              {Array.from({ length: totalPartesLocal }, (_, i) => i + 1).map((n) => {
                const ini = (n - 1) * segundos;
                const fim = Math.min(n * segundos, video.duration);
                const gerandoEsta = baixandoParte === n || (baixandoTodas && progresso?.parte === n);
                return (
                  <button
                    key={n}
                    className="botao botao-parte"
                    onClick={() => baixarParte(n)}
                    disabled={ocupado}
                  >
                    {gerandoEsta ? (
                      <>
                        <span className="girando girando-roxo" /> Gerando...
                      </>
                    ) : (
                      <>
                        Parte {numExibido(n)}
                        <small>
                          {formatarDuracao(ini)}–{formatarDuracao(fim)}
                        </small>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {totalPartesLocal > 1 && (
              <button className="botao botao-todas" onClick={baixarTodas} disabled={ocupado}>
                {baixandoTodas ? 'Gerando todas as partes...' : `Baixar todas as ${totalPartesLocal} partes`}
              </button>
            )}

            {progresso && (
              <div className="progresso">
                <div className="rotulo-prog">
                  <span>{progresso.rotulo}</span>
                  <span>{progresso.pct}%</span>
                </div>
                <div className="barra-prog">
                  <i style={{ width: `${progresso.pct}%` }} />
                </div>
                <button className="botao botao-cancelar" onClick={cancelar}>
                  Cancelar
                </button>
              </div>
            )}

            <span className="meta">
              Cada parte é cortada na hora no servidor — pode levar até 1 minuto.
            </span>
          </div>
        </div>
      )}

      {!compacto && (
        <p className="rodape">
          Sem marca d&rsquo;água • Com áudio • Grátis
          <br />
          Uso pessoal: respeite os direitos autorais dos criadores.
        </p>
      )}
    </div>
  );
}
