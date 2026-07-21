'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { baixarBlob, executarParteSSE } from '@/lib/exportar/stream';
import { presetPorId, tamanhoEstimadoBytes } from '@/lib/exportar/presets';
import { MODELO_PADRAO, montarNome } from '@/lib/exportar/nomes';

export type StatusJob =
  | 'aguardando'
  | 'exportando'
  | 'concluido'
  | 'erro'
  | 'cancelado';

export interface JobExport {
  id: string;
  url: string;
  titulo: string;
  duracao: number;
  projetoNome?: string;
  presetId: string;
  nomeArquivo: string;
  tamanhoEstimado: number;
  status: StatusJob;
  pct: number;
  etapa: string;
  erro?: string;
  iniciadoEm?: number;
}

export interface Toast {
  id: string;
  tipo: 'sucesso' | 'erro' | 'info';
  msg: string;
}

interface EnfileirarArgs {
  url: string;
  titulo: string;
  duracao: number;
  projetoNome?: string;
  presetId?: string;
}

interface ExportContextValor {
  fila: JobExport[];
  pausado: boolean;
  presetId: string;
  modeloNome: string;
  toasts: Toast[];
  setPresetId: (id: string) => void;
  setModeloNome: (m: string) => void;
  enfileirar: (args: EnfileirarArgs) => void;
  exportarTudo: () => void;
  pausar: () => void;
  continuar: () => void;
  cancelarJob: (id: string) => void;
  removerJob: (id: string) => void;
  limparFila: () => void;
  descartarToast: (id: string) => void;
}

const Ctx = createContext<ExportContextValor | null>(null);

function novoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Traduz o rótulo real do estágio (vindo do servidor) para o contexto de export.
// São os MESMOS estágios reais — só o texto muda para fazer sentido aqui.
function rotuloExport(rotulo: string): string {
  if (/baixando/i.test(rotulo)) return 'Baixando vídeo';
  if (/cortando/i.test(rotulo)) return 'Renderizando vídeo';
  if (/finalizando/i.test(rotulo)) return 'Finalizando';
  return rotulo;
}

export function ExportProvider({ children }: { children: React.ReactNode }) {
  const [fila, setFilaState] = useState<JobExport[]>([]);
  const [pausado, setPausadoState] = useState(false);
  const [presetId, setPresetId] = useState('instagram');
  const [modeloNome, setModeloNome] = useState(MODELO_PADRAO);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Espelhos em ref para o processador não fechar sobre estado obsoleto.
  const filaRef = useRef<JobExport[]>([]);
  const pausadoRef = useRef(false);
  const processandoRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const contadorRef = useRef(0);

  const setFila = useCallback(
    (up: (prev: JobExport[]) => JobExport[]) => {
      setFilaState((prev) => {
        const next = up(prev);
        filaRef.current = next;
        return next;
      });
    },
    [],
  );

  const setPausado = useCallback((v: boolean) => {
    pausadoRef.current = v;
    setPausadoState(v);
  }, []);

  const notificar = useCallback((tipo: Toast['tipo'], msg: string) => {
    const id = novoId();
    setToasts((t) => [...t, { id, tipo, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const atualizarJob = useCallback(
    (id: string, patch: Partial<JobExport>) => {
      setFila((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
    },
    [setFila],
  );

  const processarProximo = useCallback(async () => {
    if (processandoRef.current || pausadoRef.current) return;
    const proximo = filaRef.current.find((j) => j.status === 'aguardando');
    if (!proximo) return;

    processandoRef.current = true;
    const ac = new AbortController();
    abortRef.current = ac;
    atualizarJob(proximo.id, {
      status: 'exportando',
      pct: 0,
      etapa: 'Preparando...',
      iniciadoEm: Date.now(),
    });

    try {
      const preset = presetPorId(proximo.presetId);
      const params = new URLSearchParams({
        stream: '1',
        parte: '1',
        dur: '600', // exporta o vídeo inteiro (o servidor limita à duração real)
        url: proximo.url,
        w: String(preset.largura),
        h: String(preset.altura),
        fps: String(preset.fps),
        vb: String(preset.vbitrate),
        ab: String(preset.abitrate),
      });
      const { blob } = await executarParteSSE(
        params,
        (p) => atualizarJob(proximo.id, { pct: p.pct, etapa: rotuloExport(p.rotulo) }),
        ac.signal,
      );
      baixarBlob(blob, proximo.nomeArquivo);
      atualizarJob(proximo.id, { status: 'concluido', pct: 100, etapa: 'Concluído' });
      notificar('sucesso', `Exportado: ${proximo.nomeArquivo}`);
    } catch (e) {
      if (ac.signal.aborted) {
        atualizarJob(proximo.id, { status: 'cancelado', etapa: 'Cancelado' });
      } else {
        atualizarJob(proximo.id, {
          status: 'erro',
          etapa: 'Erro',
          erro: e instanceof Error ? e.message : 'Erro desconhecido',
        });
        notificar('erro', `Falha ao exportar “${proximo.titulo}”.`);
      }
    } finally {
      abortRef.current = null;
      processandoRef.current = false;
      setTimeout(() => void processarProximo(), 400);
    }
  }, [atualizarJob, notificar]);

  const enfileirar = useCallback(
    (args: EnfileirarArgs) => {
      const pid = args.presetId ?? presetId;
      const preset = presetPorId(pid);
      contadorRef.current += 1;
      const job: JobExport = {
        id: novoId(),
        url: args.url,
        titulo: args.titulo,
        duracao: args.duracao,
        projetoNome: args.projetoNome,
        presetId: pid,
        nomeArquivo: montarNome(modeloNome, {
          titulo: args.titulo,
          projeto: args.projetoNome,
          contador: contadorRef.current,
        }),
        tamanhoEstimado: tamanhoEstimadoBytes(preset, args.duracao),
        status: 'aguardando',
        pct: 0,
        etapa: 'Na fila',
      };
      setFila((prev) => [...prev, job]);
      notificar('info', `“${args.titulo}” adicionado à fila (${preset.nome}).`);
      if (!pausadoRef.current) setTimeout(() => void processarProximo(), 50);
    },
    [presetId, modeloNome, setFila, notificar, processarProximo],
  );

  const exportarTudo = useCallback(() => {
    setPausado(false);
    setTimeout(() => void processarProximo(), 50);
  }, [setPausado, processarProximo]);

  const pausar = useCallback(() => setPausado(true), [setPausado]);

  const continuar = useCallback(() => {
    setPausado(false);
    setTimeout(() => void processarProximo(), 50);
  }, [setPausado, processarProximo]);

  const cancelarJob = useCallback(
    (id: string) => {
      const job = filaRef.current.find((j) => j.id === id);
      if (job?.status === 'exportando') {
        abortRef.current?.abort();
      } else {
        setFila((prev) => prev.filter((j) => j.id !== id));
      }
    },
    [setFila],
  );

  const removerJob = useCallback(
    (id: string) => {
      const job = filaRef.current.find((j) => j.id === id);
      if (job?.status === 'exportando') abortRef.current?.abort();
      setFila((prev) => prev.filter((j) => j.id !== id));
    },
    [setFila],
  );

  const limparFila = useCallback(() => {
    // Mantém apenas o que está exportando agora; remove o resto.
    setFila((prev) => prev.filter((j) => j.status === 'exportando'));
  }, [setFila]);

  const descartarToast = useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );

  const valor = useMemo<ExportContextValor>(
    () => ({
      fila,
      pausado,
      presetId,
      modeloNome,
      toasts,
      setPresetId,
      setModeloNome,
      enfileirar,
      exportarTudo,
      pausar,
      continuar,
      cancelarJob,
      removerJob,
      limparFila,
      descartarToast,
    }),
    [
      fila,
      pausado,
      presetId,
      modeloNome,
      toasts,
      enfileirar,
      exportarTudo,
      pausar,
      continuar,
      cancelarJob,
      removerJob,
      limparFila,
      descartarToast,
    ],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useExport(): ExportContextValor {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useExport precisa estar dentro de <ExportProvider>');
  return ctx;
}
