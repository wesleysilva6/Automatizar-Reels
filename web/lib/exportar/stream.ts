// Runner compartilhado do streaming (SSE) da rota /api/parte: faz o fetch, lê os
// eventos de progresso e devolve o arquivo pronto. Usado tanto pelo baixador em
// partes quanto pelo Export Center — evita duplicar a leitura do stream.

export interface ProgressoSSE {
  pct: number;
  rotulo: string;
}

export async function executarParteSSE(
  params: URLSearchParams,
  onProgresso: (p: ProgressoSSE) => void,
  signal: AbortSignal,
): Promise<{ blob: Blob; nomeServidor: string }> {
  const res = await fetch('/api/parte?' + params.toString(), { signal });
  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error || 'Falha ao processar o vídeo.');
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
        onProgresso({ pct: evento.pct, rotulo: evento.rotulo });
      } else if (evento.tipo === 'erro') {
        erroMsg = evento.mensagem;
      } else if (evento.tipo === 'fim') {
        final = evento;
      }
    }
  }

  if (erroMsg) throw new Error(erroMsg);
  if (!final) throw new Error('O processamento não foi concluído. Tente de novo.');

  const bin = atob(final.dados);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: final.mime || 'video/mp4' });
  return { blob, nomeServidor: final.nome };
}

// Dispara o download de um blob no navegador (revogando a URL com folga).
export function baixarBlob(blob: Blob, nome: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
