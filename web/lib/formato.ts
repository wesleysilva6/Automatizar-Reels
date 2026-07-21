// Formatação de data/tempo relativo em pt-BR, sem dependências.

export function tempoRelativo(ts: number): string {
  const diff = Date.now() - ts;
  const seg = Math.round(diff / 1000);
  if (seg < 60) return 'agora mesmo';
  const min = Math.round(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  const meses = Math.round(d / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  const anos = Math.round(meses / 12);
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

export function dataCurta(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function horaCurta(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function duracaoMMSS(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
