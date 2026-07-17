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

function formatarDuracao(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatarTamanho(bytes: number | null): string {
  if (!bytes) return '';
  return ` (${(bytes / 1024 / 1024).toFixed(1)} MB)`;
}

export default function Home() {
  const [link, setLink] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [linkBuscado, setLinkBuscado] = useState('');
  const [segundos, setSegundos] = useState(59);
  const [baixandoParte, setBaixandoParte] = useState<number | null>(null);

  const totalPartes = video ? Math.max(1, Math.ceil(video.duration / segundos)) : 0;

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

  async function baixarParte(n: number) {
    if (baixandoParte !== null) return;
    setBaixandoParte(n);
    setErro('');
    try {
      const res = await fetch(
        `/api/parte?parte=${n}&dur=${segundos}&url=` + encodeURIComponent(linkBuscado),
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || 'Falha ao gerar a parte.');
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Parte ${String(n).padStart(2, '0')} de ${String(totalPartes).padStart(2, '0')}.mp4`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado ao gerar a parte.');
    } finally {
      setBaixandoParte(null);
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
                disabled={baixandoParte !== null}
              />
              <span className="valor-segundos">{segundos}s</span>
            </div>

            <span className="partes">
              {totalPartes === 1
                ? 'Com essa duração, o vídeo cabe em 1 parte única.'
                : `Com ${segundos}s por parte, o vídeo vira ${totalPartes} partes.`}
            </span>

            <div className="acoes lista-partes">
              {Array.from({ length: totalPartes }, (_, i) => i + 1).map((n) => {
                const ini = (n - 1) * segundos;
                const fim = Math.min(n * segundos, video.duration);
                const ocupado = baixandoParte === n;
                return (
                  <button
                    key={n}
                    className="botao botao-parte"
                    onClick={() => baixarParte(n)}
                    disabled={baixandoParte !== null}
                  >
                    {ocupado ? (
                      <>
                        <span className="girando girando-roxo" /> Gerando...
                      </>
                    ) : (
                      <>
                        Parte {n}
                        <small>
                          {formatarDuracao(ini)}–{formatarDuracao(fim)}
                        </small>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

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
