// Formato comum que as rotas consomem, venha o vídeo de onde vier. Cada provedor
// (TikTok, YouTube) resolve o link do seu jeito e devolve sempre esta forma.

export type Origem = 'tiktok' | 'youtube';

export interface InfoVideo {
  /** Identificador na origem — entra no nome do cache em /tmp. */
  id: string;
  origem: Origem;
  titulo: string;
  capa: string;
  /** Duração total do vídeo, em segundos. */
  duracao: number;
  autor: string;
  /**
   * Resolução do vídeo. O cliente usa para desenhar o PNG do título exatamente do
   * tamanho do quadro — assim o ffmpeg sobrepõe sem redimensionar nada, e o texto
   * não deforma num vídeo deitado (16:9 do YouTube) nem num em pé (TikTok).
   */
  largura: number;
  altura: number;

  /**
   * Vídeo em alta qualidade. Atenção: no YouTube o 1080p é DASH e vem **sem
   * áudio** — nesse caso a trilha chega separada em `faixaAudio`.
   */
  hd?: string;
  /** Vídeo em qualidade menor, este sempre já com o áudio embutido. */
  sd?: string;
  /** Trilha de áudio separada. Só existe quando `hd` vem mudo. */
  faixaAudio?: string;
  /** Áudio isolado, para o botão "só a música". */
  musica?: string;
  /** Extensão de `musica`: o TikTok entrega mp3; o YouTube, m4a. */
  extMusica: '.mp3' | '.m4a';

  tamanhoHd: number | null;
  tamanhoSd: number | null;

  /**
   * Como a rota /api/parte deve ler a mídia:
   *
   * - `arquivo`: baixa o vídeo inteiro para o /tmp e reaproveita entre as partes.
   *   Vale a pena no TikTok, onde os vídeos são curtos e todas as partes saem do
   *   mesmo download.
   * - `remoto`: entrega a URL direto ao ffmpeg, que busca por HTTP só o intervalo
   *   pedido. É o único jeito viável no YouTube, onde um vídeo pode ter horas e
   *   baixá-lo inteiro estouraria o tempo e o disco da função.
   */
  leitura: 'arquivo' | 'remoto';
}
