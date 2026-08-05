'use client';

// Gera, no navegador, um PNG transparente com o título para o servidor sobrepor
// no vídeo (via ffmpeg "overlay"). Assim não dependemos do filtro "drawtext", que
// não existe no build de ffmpeg do servidor.

let fontePronta: Promise<void> | null = null;

// Carrega a fonte Anton uma única vez (para desenhar no canvas).
function garantirFonte(): Promise<void> {
  if (fontePronta) return fontePronta;
  fontePronta = (async () => {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    try {
      const fonte = new FontFace('Anton', 'url(/fonts/Anton-Regular.ttf)');
      await fonte.load();
      document.fonts.add(fonte);
    } catch {
      /* se a fonte falhar, o canvas cai numa fonte padrão */
    }
  })();
  return fontePronta;
}

// PNG transparente com o título no topo (branco + contorno preto), do MESMO
// tamanho do vídeo — assim o servidor sobrepõe sem redimensionar, e o texto sai
// com a proporção certa tanto num vídeo em pé (TikTok) quanto deitado (YouTube).
export async function gerarOverlayTitulo(
  texto: string,
  largura = 1080,
  altura = 1920,
): Promise<Blob> {
  await garantirFonte();

  // Larguras/alturas ímpares atrapalham o encode em yuv420p.
  const L = Math.max(2, Math.round(largura / 2) * 2);
  const A = Math.max(2, Math.round(altura / 2) * 2);
  const canvas = document.createElement('canvas');
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');

  const t = texto.toUpperCase();
  // Medidas proporcionais ao menor lado: num vídeo 1080x1920 dão exatamente os
  // valores originais (fonte 78, margem 60), e num 16:9 o título não sai gigante.
  const menorLado = Math.min(L, A);
  const margem = Math.round(L * 0.0556);
  const minimo = Math.round(menorLado * 0.037);
  let tamanho = Math.round(menorLado * 0.0722);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Reduz a fonte até caber na largura (com margem), evitando transbordar.
  for (; tamanho > minimo; tamanho -= 2) {
    ctx.font = `${tamanho}px Anton, Arial, sans-serif`;
    if (ctx.measureText(t).width <= L - margem * 2) break;
  }

  const x = L / 2;
  const y = A * 0.06;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = Math.round(tamanho * 0.18);
  ctx.strokeText(t, x, y);
  ctx.fillStyle = 'white';
  ctx.fillText(t, x, y);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem do título.'))),
      'image/png',
    );
  });
}
