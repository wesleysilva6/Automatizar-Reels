// Nomeação automática de arquivos a partir de um modelo com placeholders.
// Placeholders: {titulo} {data} {hora} {contador} {projeto}

export const MODELO_PADRAO = '{titulo}_{contador}';

export interface ContextoNome {
  titulo: string;
  projeto?: string;
  contador: number;
}

function limpar(txt: string): string {
  return (txt || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^\w\s-]/g, '') // remove símbolos inválidos em nome de arquivo
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

export function montarNome(modelo: string, ctx: ContextoNome): string {
  const agora = new Date();
  const data = agora.toISOString().slice(0, 10); // AAAA-MM-DD
  const hora = agora.toTimeString().slice(0, 5).replace(':', 'h'); // 14h05

  const base = (modelo || MODELO_PADRAO)
    .replace(/\{titulo\}/gi, limpar(ctx.titulo) || 'video')
    .replace(/\{projeto\}/gi, limpar(ctx.projeto ?? '') || 'projeto')
    .replace(/\{data\}/gi, data)
    .replace(/\{hora\}/gi, hora)
    .replace(/\{contador\}/gi, String(ctx.contador).padStart(2, '0'));

  const seguro = limpar(base) || 'video';
  return `${seguro}.mp4`;
}

export const PLACEHOLDERS: { chave: string; descricao: string }[] = [
  { chave: '{titulo}', descricao: 'título do vídeo' },
  { chave: '{projeto}', descricao: 'nome do projeto' },
  { chave: '{contador}', descricao: 'número sequencial' },
  { chave: '{data}', descricao: 'data (AAAA-MM-DD)' },
  { chave: '{hora}', descricao: 'hora (14h05)' },
];
