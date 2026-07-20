# NovaWave

Sistema para baixar vídeos do TikTok **em HD, sem marca d'água e com áudio**, e
prepará-los para os stories do Instagram (cortados em partes de até 59s).

Existem **duas formas de usar**:

| Forma | Onde | Para quê |
|---|---|---|
| 🌐 **Site** | https://novawave.vercel.app | Baixar de qualquer lugar (celular ou PC), inclusive já cortado em partes |
| 🖥️ **Programa do Windows** | `NovaWave.bat` nesta pasta | Gerar as partes com o **título e "Parte X de Y" escritos no vídeo** |

---

## 🌐 O site (novawave.vercel.app)

### Como usar

1. Abra o TikTok, toque em **Compartilhar → Copiar link** no vídeo desejado
2. Entre em **novawave.vercel.app** e clique em **Colar** (ou cole com Ctrl+V e clique em **Buscar**)
3. Aparece a prévia do vídeo: capa, descrição, autor e duração
4. Escolha o que baixar:
   - **Baixar tudo em HD** — o vídeo inteiro, 1080p, sem marca d'água, com áudio
   - **Qualidade menor** — arquivo menor, para internet lenta
   - **Só a música (MP3)** — apenas o áudio
5. Ou use o cartão **"Baixar em partes já cortadas"**:
   - Ajuste no controle deslizante a **duração de cada parte** (10s a 120s; padrão 59s, o limite dos stories)
   - Clique no botão da parte desejada (**Parte 1**, **Parte 2**...) — cada botão mostra o trecho exato do vídeo
   - A parte é cortada na hora no servidor e baixa pronta (ex.: `Parte 03 de 04.mp4`)
   - ⏳ Uma **barra de progresso real** mostra o download e o corte enquanto a parte é gerada (leva de 45s a 1min30)
   - Botão **"Baixar todas as partes"**: gera e baixa todas de uma vez, uma após a outra
   - Campos de **numeração** (`começar na parte` / `de N no total`): se o vídeo for a **continuação** de outro, ajuste para a contagem seguir certa entre os vídeos. Ex.: o vídeo 1 tem 4 partes (1 a 4 de 9); no vídeo 2, coloque "começar na parte 5" e as partes saem como `Parte 05 de 09.mp4`, `Parte 06 de 09.mp4`... (o total se ajusta sozinho, mas dá para forçar)

### Como funciona por dentro

O site é um app **Next.js 16 + TypeScript** (pasta [web/](web/)) com três rotas de API:

| Rota | O que faz |
|---|---|
| `/api/video` | Busca a prévia: consulta a API pública **tikwm.com** (a mesma que sites como o ssstik.io usam), que resolve o link do TikTok e devolve título, capa, duração e as URLs diretas do CDN |
| `/api/download` | Baixa o arquivo: recebe o link do TikTok, resolve a URL do CDN (HD `hdplay`, SD `play` ou música) e repassa o arquivo em streaming para o navegador com nome amigável |
| `/api/parte` | Corta no servidor: baixa o vídeo HD para o `/tmp` da função (reaproveitado entre chamadas), roda o **ffmpeg** (`ffmpeg-static`) reencodando em H.264 CRF 21 + AAC 128k para o corte cair **exatamente** no segundo pedido, e devolve a parte pronta. Com `?stream=1` responde em **SSE**, relatando o progresso real (download e corte) e entregando o arquivo no evento final; aceita `pnum`/`ptot` para o nome refletir a numeração escolhida |

Por segurança, as APIs só aceitam links do domínio `tiktok.com` (não fazem proxy de URL qualquer).

### Como rodar/atualizar o site

```powershell
cd web
npm install
npm run dev      # testar em http://localhost:3000
npm run build    # conferir se compila antes de publicar
```

Publicação: projeto **novawave** na Vercel (team wesleywagner999-9195s-projects).
Importante: deploys de **preview** da Vercel ficam atrás de login; para o público
usar, o deploy precisa ser de **produção** (aí atualiza o novawave.vercel.app).

### Limitações do site

- Depende da API gratuita **tikwm.com** (limite de ~1 requisição/segundo). Se ela
  estiver fora do ar, o site mostra erro pedindo para tentar de novo em instantes.
- O corte em partes **não escreve** o título nem o "Parte X de Y" no vídeo — isso
  só o programa do Windows faz.

---

## 🖥️ O programa do Windows

Instruções de uso no dia a dia: veja o [LEIA-ME.md](LEIA-ME.md).
Resumo: dois cliques em `NovaWave.bat`, cole o link, dê um título, **Gerar**.
Os vídeos saem em `Prontos\<Título> (<data>)\Parte 01.mp4`, já com o título e o
"Parte X de Y" escritos por cima — prontos para postar em sequência.

### Como o motor (`novawave.ps1`) funciona

1. **Download em HD**: tenta primeiro a API tikwm (1080p, com áudio, sem marca
   d'água — a mesma do site)
2. **Plano B**: se o HD falhar, usa o `yt-dlp` preferindo formatos **h264**
   (os h265/bytevc1 do TikTok chegam **sem áudio**, apesar de a lista de formatos
   dizer que têm), com até 3 tentativas — o TikTok recusa de forma intermitente
3. **Trava de segurança**: confere com o ffprobe se o arquivo baixado tem áudio;
   se vier mudo, para com erro claro em vez de gerar partes mudas
4. Mede a duração, calcula as partes de 59s e corta cada uma com o ffmpeg
   (H.264 CRF 21 + AAC 128k), desenhando o título e o "Parte X de Y"

⚠️ **Use o programa a partir desta pasta do projeto.** Se existir uma cópia antiga
em outro lugar (ex.: extraída de um ZIP em Downloads), ela não recebe as correções —
apague-a ou substitua os `.ps1` pelos desta pasta.

---

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| Vídeo baixado **mudo** | Era o TikTok entregando h265 sem áudio; já corrigido (o sistema prefere HD/h264). Se aparecer o erro "veio SEM AUDIO", espere alguns minutos e tente de novo |
| "HD indisponivel agora... usando metodo alternativo" | A API tikwm está fora do ar ou limitou; o vídeo sai em 540p pelo yt-dlp. Normal, é o plano B |
| "Unable to extract universal data for rehydration" | Recusa intermitente do TikTok; o motor já tenta 3 vezes sozinho. Se persistir, aguarde uns minutos |
| TikTok mudou algo e nada baixa | Atualize o yt-dlp: `tools\yt-dlp.exe -U` (ou baixe em https://github.com/yt-dlp/yt-dlp/releases e substitua em `tools\`) |
| Acentos quebrados nos scripts | Os `.ps1` precisam estar salvos em **UTF-8 com BOM** (o PowerShell 5.1 lê sem BOM como ANSI) |

## Estrutura do repositório

| Pasta / arquivo | O que é |
|---|---|
| `NovaWave.bat` | Atalho do programa do Windows (dois cliques) |
| `novawave-gui.ps1` | A janela do programa |
| `novawave.ps1` | O motor: baixa, valida áudio, corta e legenda |
| `tools\` | yt-dlp, ffmpeg e ffprobe usados pelo programa |
| `web\` | O site (Next.js), publicado em novawave.vercel.app |
| `downloads\` | Área temporária de download (fora do git) |
| `Prontos\` | Vídeos gerados pelo programa (fora do git) |
