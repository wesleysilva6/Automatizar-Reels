'use client';

import { useEffect, useState } from 'react';
import { atualizarProjeto, criarProjeto } from '@/lib/projetos/store';
import { CORES, ICONES, type Projeto } from '@/lib/projetos/tipos';

interface ModalProjetoProps {
  aberto: boolean;
  projeto?: Projeto | null; // presente => modo edição
  aoFechar: () => void;
  aoCriar?: (id: string) => void;
}

export default function ModalProjeto({ aberto, projeto, aoFechar, aoCriar }: ModalProjetoProps) {
  const editando = Boolean(projeto);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [icone, setIcone] = useState(ICONES[0]);

  useEffect(() => {
    if (!aberto) return;
    setNome(projeto?.nome ?? '');
    setDescricao(projeto?.descricao ?? '');
    setCor(projeto?.cor ?? CORES[0]);
    setIcone(projeto?.icone ?? ICONES[0]);
  }, [aberto, projeto]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') aoFechar();
    }
    if (aberto) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  function salvar() {
    if (!nome.trim()) return;
    const dados = { nome, descricao, cor, icone };
    if (projeto) {
      atualizarProjeto(projeto.id, dados);
    } else {
      const novo = criarProjeto(dados);
      aoCriar?.(novo.id);
    }
    aoFechar();
  }

  return (
    <div className="overlay" onClick={aoFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-titulo">{editando ? 'Editar projeto' : 'Novo projeto'}</h2>

        <div className="modal-preview">
          <span className="preview-icone" style={{ background: cor }}>
            {icone}
          </span>
          <span className="preview-nome">{nome.trim() || 'Nome do projeto'}</span>
        </div>

        <label className="campo">
          <span>Nome</span>
          <input
            autoFocus
            value={nome}
            maxLength={60}
            placeholder="Ex.: Cine Histórias"
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') salvar();
            }}
          />
        </label>

        <label className="campo">
          <span>Descrição (opcional)</span>
          <input
            value={descricao}
            maxLength={140}
            placeholder="Do que é esse projeto?"
            onChange={(e) => setDescricao(e.target.value)}
          />
        </label>

        <div className="campo">
          <span>Cor</span>
          <div className="opcoes-cor">
            {CORES.map((c) => (
              <button
                key={c}
                className={`opcao-cor${c === cor ? ' ativa' : ''}`}
                style={{ background: c }}
                onClick={() => setCor(c)}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="campo">
          <span>Ícone</span>
          <div className="opcoes-icone">
            {ICONES.map((ic) => (
              <button
                key={ic}
                className={`opcao-icone${ic === icone ? ' ativa' : ''}`}
                onClick={() => setIcone(ic)}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-acoes">
          <button className="botao botao-secundario" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="botao botao-baixar" onClick={salvar} disabled={!nome.trim()}>
            {editando ? 'Salvar' : 'Criar projeto'}
          </button>
        </div>
      </div>
    </div>
  );
}
