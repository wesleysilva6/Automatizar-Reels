'use client';

import Link from 'next/link';
import { esvaziarLixeira, excluirVideoDefinitivo, restaurarVideo } from '@/lib/projetos/store';
import { useLixeira, useMapaProjetos } from '@/hooks/useProjetos';
import { tempoRelativo } from '@/lib/formato';

export default function PaginaLixeira() {
  const itens = useLixeira();
  const mapa = useMapaProjetos();

  function excluir(id: string) {
    if (confirm('Excluir este vídeo definitivamente? Não dá para desfazer.')) {
      excluirVideoDefinitivo(id);
    }
  }

  function esvaziar() {
    if (confirm('Esvaziar a Lixeira? Todos os itens serão apagados definitivamente.')) {
      esvaziarLixeira();
    }
  }

  return (
    <div className="pagina-conteudo">
      <header className="cabecalho">
        <div>
          <h1 className="titulo">🗑️ Lixeira</h1>
          <p className="subtitulo">Vídeos excluídos ficam aqui e podem ser restaurados.</p>
        </div>
        {itens.length > 0 && (
          <button className="botao botao-perigo" onClick={esvaziar}>
            Esvaziar lixeira
          </button>
        )}
      </header>

      {itens.length === 0 ? (
        <div className="vazio">
          <span className="vazio-icone">🗑️</span>
          <h2>Lixeira vazia</h2>
          <p>Nada por aqui.</p>
          <Link href="/" className="botao botao-baixar">
            Ver projetos
          </Link>
        </div>
      ) : (
        <div className="grade-videos lista">
          {itens.map((v) => (
            <div key={v.id} className="video-card lista">
              <div className="video-capa">
                {v.capa ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.capa} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="video-capa-vazia">🎬</span>
                )}
              </div>
              <div className="video-info">
                <span className="video-titulo">{v.titulo}</span>
                <span className="video-sub">
                  {mapa[v.projetoId]?.nome ?? 'Projeto excluído'} • excluído{' '}
                  {v.excluidoEm ? tempoRelativo(v.excluidoEm) : ''}
                </span>
              </div>
              <div className="video-acoes">
                <button className="botao botao-secundario" onClick={() => restaurarVideo(v.id)}>
                  Restaurar
                </button>
                <button className="botao botao-perigo" onClick={() => excluir(v.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
