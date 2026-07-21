'use client';

import { useEffect, useState } from 'react';
import { useExport, type JobExport } from '@/contexts/ExportContext';
import { formatarBytes, presetPorId } from '@/lib/exportar/presets';

const STATUS_INFO: Record<JobExport['status'], { icone: string; rotulo: string; classe: string }> = {
  aguardando: { icone: '⏳', rotulo: 'Aguardando', classe: 'aguardando' },
  exportando: { icone: '🟡', rotulo: 'Exportando', classe: 'exportando' },
  concluido: { icone: '✅', rotulo: 'Concluído', classe: 'concluido' },
  erro: { icone: '⚠️', rotulo: 'Erro', classe: 'erro' },
  cancelado: { icone: '⛔', rotulo: 'Cancelado', classe: 'cancelado' },
};

function formatarTempo(seg: number): string {
  if (!Number.isFinite(seg) || seg < 0) return '—';
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function LinhaJob({ job, agora }: { job: JobExport; agora: number }) {
  const { cancelarJob, removerJob } = useExport();
  const info = STATUS_INFO[job.status];
  const preset = presetPorId(job.presetId);

  const decorrido = job.iniciadoEm ? (agora - job.iniciadoEm) / 1000 : 0;
  const restante =
    job.status === 'exportando' && job.pct > 1
      ? (decorrido * (100 - job.pct)) / job.pct
      : NaN;
  const parcial = (job.tamanhoEstimado * job.pct) / 100;

  return (
    <div className={`job ${info.classe}`}>
      <div className="job-topo">
        <span className="job-status">
          <span>{info.icone}</span>
          <strong>{job.titulo}</strong>
        </span>
        <div className="job-acoes">
          {(job.status === 'exportando' || job.status === 'aguardando') && (
            <button className="icone-btn perigo" onClick={() => cancelarJob(job.id)} title="Cancelar">
              ✕
            </button>
          )}
          {job.status !== 'exportando' && (
            <button className="icone-btn" onClick={() => removerJob(job.id)} title="Remover da fila">
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="job-sub">
        <span>{preset.icone} {preset.nome}</span>
        <span className="job-arquivo">{job.nomeArquivo}</span>
      </div>

      {(job.status === 'exportando' || job.status === 'concluido') && (
        <>
          <div className="barra-prog">
            <i style={{ width: `${job.pct}%` }} />
          </div>
          <div className="job-meta">
            <span className="job-etapa">{job.etapa}</span>
            <span>{job.pct}%</span>
          </div>
          <div className="job-numeros">
            <span>⏱ {formatarTempo(decorrido)} decorrido</span>
            {job.status === 'exportando' && <span>⌛ {formatarTempo(restante)} restante</span>}
            <span>
              {formatarBytes(parcial)} / {formatarBytes(job.tamanhoEstimado)}
            </span>
          </div>
        </>
      )}

      {job.status === 'aguardando' && (
        <div className="job-meta">
          <span>{info.rotulo}</span>
          <span>~ {formatarBytes(job.tamanhoEstimado)}</span>
        </div>
      )}

      {job.status === 'erro' && <div className="job-erro">{job.erro}</div>}
    </div>
  );
}

export default function FilaExport() {
  const { fila } = useExport();
  const [agora, setAgora] = useState(() => Date.now());

  // Ticker de 1s apenas enquanto há algo exportando (para ETA/tempo decorrido).
  const exportando = fila.some((j) => j.status === 'exportando');
  useEffect(() => {
    if (!exportando) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [exportando]);

  if (fila.length === 0) {
    return (
      <div className="vazio pequeno">
        <span className="vazio-icone">📤</span>
        <p>Fila vazia. Adicione vídeos pela ação “Exportar” em um projeto.</p>
      </div>
    );
  }

  return (
    <div className="fila">
      {fila.map((job) => (
        <LinhaJob key={job.id} job={job} agora={agora} />
      ))}
    </div>
  );
}
