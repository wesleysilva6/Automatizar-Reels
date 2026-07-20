'use client';

import { useState } from 'react';

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

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export default function Home() {
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

  const totalPartesLocal = video ? Math.max(1, Math.ceil(video.duration / segundos)) : 0;
  const totalExibido =
    totalManual.trim() && parseInt(totalManual, 10) > 0
      ? parseInt(totalManual, 10)
      : inicioParte - 1 + totalPartesLocal;

  const ocupado = baixandoParte !== null || baixandoTodas;

  function numExibido(localN: number): number {
    return inicioParte - 1 + localN;
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
      setVideo(json as VideoInfo);
      setLinkBuscado(alvo);
      setInicioParte(1);
      setTotalManual('');
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

  function dispararDownload(blob: Blob, nome: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Gera uma parte lendo o progresso em tempo real (SSE) e devolve o arquivo pronto.
  async function gerarParte(
    localN: number,
    onProgresso: (p: Progresso) => void,
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
    const res = await fetch('/api/parte?' + params.toString());
    if (!res.ok || !res.body) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error || 'Falha ao gerar a parte.');
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let erroMsg: string | null = null;
    let final: { nome: string; mime?: string; dados: string } | null = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const bloco = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const linha = bloco.split('\n').find((l) => l.startsWith('data:'));
        if (!linha) continue;
        const evento = JSON.parse(linha.slice(5).trim());
        if (evento.tipo === 'progresso') {
          onProgresso({ parte: localN, pct: evento.pct, rotulo: evento.rotulo });
        } else if (evento.tipo === 'erro') {
          erroMsg = evento.mensagem;
        } else if (evento.tipo === 'fim') {
          final = evento;
        }
      }
    }

    if (erroMsg) throw new Error(erroMsg);
    if (!final) throw new Error('A geração não foi concluída. Tente de novo.');

    const bin = atob(final.dados);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: final.mime || 'video/mp4' });
    const nome = `Parte ${pad2(numero)} de ${pad2(totalExibido)}.mp4`;
    return { blob, nome };
  }

  async function baixarParte(localN: number) {
    if (ocupado) return;
    setBaixandoParte(localN);
    setErro('');
    setProgresso({ parte: localN, pct: 0, rotulo: 'Iniciando...' });
    try {
      const { blob, nome } = await gerarParte(localN, setProgresso);
      dispararDownload(blob, nome);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado ao gerar a parte.');
    } finally {
      setBaixandoParte(null);
      setProgresso(null);
    }
  }

  async function baixarTodas() {
    if (ocupado) return;
    setBaixandoTodas(true);
    setErro('');
    try {
      for (let n = 1; n <= totalPartesLocal; n++) {
        setProgresso({ parte: n, pct: 0, rotulo: `Parte ${n} de ${totalPartesLocal}...` });
        const { blob, nome } = await gerarParte(n, (p) =>
          setProgresso({ ...p, rotulo: `(${n}/${totalPartesLocal}) ${p.rotulo}` }),
        );
        dispararDownload(blob, nome);
        await esperar(500); // deixa o navegador processar cada download antes do próximo
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado ao gerar as partes.');
    } finally {
      setBaixandoTodas(false);
      setProgresso(null);
    }
  }

  return (
    <main className="pagina">
      <div className="hero">
        <h1>NovaWave</h1>
        <p>Baixe vídeos do TikTok em HD, sem marca d&rsquo;água e com áudio.</p>
      </div>

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
              </div>
            )}

            <span className="meta">
              Cada parte é cortada na hora no servidor — pode levar até 1 minuto.
            </span>
          </div>
        </div>
      )}

      <p className="rodape">
        Sem marca d&rsquo;água • Com áudio • Grátis
        <br />
        Uso pessoal: respeite os direitos autorais dos criadores.
      </p>
    </main>
  );
}
