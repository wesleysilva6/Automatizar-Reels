'use client';

import { useRef } from 'react';
import { exportarDados, importarDados, limparTudo } from '@/lib/projetos/store';
import { useContagemVideos, useProjetos } from '@/hooks/useProjetos';

export default function PaginaConfiguracoes() {
  const projetos = useProjetos();
  const contagem = useContagemVideos();
  const inputRef = useRef<HTMLInputElement>(null);

  const totalVideos = Object.values(contagem).reduce((a, b) => a + b, 0);

  function exportar() {
    const blob = new Blob([exportarDados()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `novawave-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function importar(arquivo: File) {
    try {
      const texto = await arquivo.text();
      if (
        confirm('Importar este backup vai substituir todos os projetos e vídeos atuais. Continuar?')
      ) {
        importarDados(texto);
      }
    } catch {
      alert('Arquivo de backup inválido.');
    }
  }

  function limpar() {
    if (confirm('Apagar TODOS os projetos e vídeos deste dispositivo? Não dá para desfazer.')) {
      limparTudo();
    }
  }

  return (
    <div className="pagina-conteudo">
      <header className="cabecalho">
        <div>
          <h1 className="titulo">⚙️ Configurações</h1>
          <p className="subtitulo">Seus dados ficam só neste navegador. Faça backup para não perder.</p>
        </div>
      </header>

      <section className="secao">
        <div className="painel">
          <h2 className="secao-titulo">Armazenamento</h2>
          <p className="subtitulo">
            {projetos.length} {projetos.length === 1 ? 'projeto' : 'projetos'} • {totalVideos}{' '}
            {totalVideos === 1 ? 'vídeo' : 'vídeos'} salvos localmente.
          </p>
        </div>
      </section>

      <section className="secao">
        <div className="painel">
          <h2 className="secao-titulo">Backup</h2>
          <p className="subtitulo">
            Exporte um arquivo com seus projetos, ou importe um backup em outro dispositivo.
          </p>
          <div className="acoes">
            <button className="botao botao-baixar" onClick={exportar}>
              Exportar backup
            </button>
            <button className="botao botao-secundario" onClick={() => inputRef.current?.click()}>
              Importar backup
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importar(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </section>

      <section className="secao">
        <div className="painel perigo">
          <h2 className="secao-titulo">Zona de perigo</h2>
          <p className="subtitulo">Remove todos os dados deste dispositivo.</p>
          <button className="botao botao-perigo" onClick={limpar}>
            Apagar tudo
          </button>
        </div>
      </section>
    </div>
  );
}
