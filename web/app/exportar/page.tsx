'use client';

import { useMemo } from 'react';
import { useExport } from '@/contexts/ExportContext';
import { PRESETS } from '@/lib/exportar/presets';
import { MODELO_PADRAO, PLACEHOLDERS, montarNome } from '@/lib/exportar/nomes';
import { criarPerfil, excluirPerfil, usePerfis } from '@/lib/exportar/perfis';
import PresetCard from '@/components/exportar/PresetCard';
import FilaExport from '@/components/exportar/FilaExport';

export default function ExportCenter() {
  const {
    fila,
    pausado,
    presetId,
    modeloNome,
    setPresetId,
    setModeloNome,
    exportarTudo,
    pausar,
    continuar,
    limparFila,
  } = useExport();
  const perfis = usePerfis();

  const aguardando = fila.filter((j) => j.status === 'aguardando').length;
  const exportando = fila.filter((j) => j.status === 'exportando').length;
  const concluidos = fila.filter((j) => j.status === 'concluido').length;
  const ocupado = exportando > 0;

  const previa = useMemo(
    () => montarNome(modeloNome, { titulo: 'Operação Bunker', projeto: 'Cine Histórias', contador: 1 }),
    [modeloNome],
  );

  function salvarPerfil() {
    const nome = prompt('Nome do perfil (ex.: TikTok Viral):');
    if (nome?.trim()) criarPerfil({ nome: nome.trim(), presetId, modeloNome });
  }

  function aplicarPerfil(id: string) {
    const p = perfis.find((x) => x.id === id);
    if (!p) return;
    setPresetId(p.presetId);
    setModeloNome(p.modeloNome);
  }

  return (
    <div className="pagina-conteudo">
      <header className="cabecalho">
        <div>
          <h1 className="titulo">📤 Export Center</h1>
          <p className="subtitulo">
            Escolha um preset por plataforma, monte a fila e exporte — continue navegando enquanto processa.
          </p>
        </div>
      </header>

      {/* Presets */}
      <section className="secao">
        <h2 className="secao-titulo">Preset de exportação</h2>
        <div className="grade-presets">
          {PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              ativo={preset.id === presetId}
              aoSelecionar={setPresetId}
            />
          ))}
        </div>
      </section>

      {/* Perfis + nomeação */}
      <section className="secao">
        <div className="grade-config">
          <div className="painel">
            <h2 className="secao-titulo">Perfis</h2>
            <p className="subtitulo">Salve preset + modelo de nome para reusar.</p>
            <div className="perfis-lista">
              {perfis.length === 0 && <span className="meta">Nenhum perfil salvo ainda.</span>}
              {perfis.map((p) => (
                <div key={p.id} className="perfil-chip">
                  <button className="perfil-aplicar" onClick={() => aplicarPerfil(p.id)}>
                    {p.nome}
                  </button>
                  <button
                    className="icone-btn perigo"
                    onClick={() => excluirPerfil(p.id)}
                    aria-label="Excluir perfil"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button className="botao botao-secundario" onClick={salvarPerfil}>
              Salvar perfil atual
            </button>
          </div>

          <div className="painel">
            <h2 className="secao-titulo">Nome automático</h2>
            <label className="campo">
              <span>Modelo</span>
              <input
                value={modeloNome}
                onChange={(e) => setModeloNome(e.target.value)}
                placeholder={MODELO_PADRAO}
              />
            </label>
            <div className="placeholders">
              {PLACEHOLDERS.map((ph) => (
                <button
                  key={ph.chave}
                  className="placeholder-chip"
                  onClick={() => setModeloNome(modeloNome + ph.chave)}
                  title={ph.descricao}
                >
                  {ph.chave}
                </button>
              ))}
            </div>
            <p className="previa-nome">
              Prévia: <strong>{previa}</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Fila */}
      <section className="secao">
        <div className="fila-cabecalho">
          <h2 className="secao-titulo">
            Fila{' '}
            <span className="fila-contador">
              {aguardando} aguardando · {exportando} exportando · {concluidos} concluído(s)
            </span>
          </h2>
          <div className="fila-controles">
            {pausado ? (
              <button className="botao botao-baixar" onClick={continuar} disabled={aguardando === 0}>
                ▶ Continuar
              </button>
            ) : (
              <button className="botao botao-baixar" onClick={exportarTudo} disabled={aguardando === 0 && !ocupado}>
                ⏵ Exportar tudo
              </button>
            )}
            <button className="botao botao-secundario" onClick={pausar} disabled={pausado || !ocupado}>
              ⏸ Pausar
            </button>
            <button className="botao botao-perigo" onClick={limparFila} disabled={fila.length === 0}>
              Limpar fila
            </button>
          </div>
        </div>
        <FilaExport />
      </section>
    </div>
  );
}
