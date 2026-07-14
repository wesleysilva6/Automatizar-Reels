# NovaWave – Automação de Stories

Sistema que automatiza a preparação de vídeos do TikTok para os stories do Instagram:
baixa o vídeo, corta em partes de até 59 segundos e adiciona o título da história
e a marcação "Parte X de Y" em cada pedaço.

## Como usar (dia a dia)

1. Dê **dois cliques** em `NovaWave.bat` — abre uma janela do programa
2. **Cole o link** do vídeo do TikTok no primeiro campo
3. Digite o **título da história** no segundo campo (ou deixe em branco)
4. Clique em **Gerar vídeos** e acompanhe o progresso na tela
5. Quando terminar, a pasta com os vídeos prontos abre sozinha

Os vídeos ficam em `Prontos\<Título> (<data>)\Parte 01.mp4`, `Parte 02.mp4`, etc.
É só passar para o celular (WhatsApp, cabo ou Google Drive) e postar nos stories na ordem.

## O que tem em cada pasta

| Pasta / arquivo | O que é |
|---|---|
| `NovaWave.bat` | O atalho que você usa (dois cliques) |
| `novawave-gui.ps1` | A janela do programa (não precisa mexer) |
| `novawave.ps1` | O "motor" do sistema (não precisa mexer) |
| `tools\` | Programas usados internamente (yt-dlp e ffmpeg) |
| `downloads\` | Área temporária do download (pode ignorar) |
| `Prontos\` | **Seus vídeos prontos ficam aqui** |

## Uso avançado (opcional)

Também dá para chamar pelo terminal, sem perguntas:

```powershell
powershell -ExecutionPolicy Bypass -File .\novawave.ps1 -Link "https://www.tiktok.com/..." -Titulo "Nome da História"
```

Ou processar um vídeo que já está no computador (sem baixar):

```powershell
powershell -ExecutionPolicy Bypass -File .\novawave.ps1 -ArquivoLocal "C:\caminho\video.mp4" -Titulo "Nome da História"
```

## Detalhes técnicos

- Partes de até **59s** (limite dos stories é 60s)
- Título centralizado no topo (fora da área coberta pela interface do Instagram)
- "Parte X de Y" aparece só quando o vídeo gera mais de uma parte
- Qualidade: H.264 CRF 21 + AAC 128k (ótima para o Instagram)
- Para atualizar o baixador quando o TikTok mudar algo: baixe o novo `yt-dlp.exe`
  em https://github.com/yt-dlp/yt-dlp/releases e substitua o de `tools\`
