# NovaWave — site

Front web do NovaWave (Next.js 16 + TypeScript), publicado em
**https://novawave.vercel.app**. Baixa vídeos do TikTok em HD sem marca d'água,
com áudio, e corta em partes no servidor.

A documentação completa (como usar, como funciona por dentro, problemas comuns)
está no [README.md da raiz do projeto](../README.md).

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # typecheck + build de produção
```

## Rotas de API

- `GET /api/video?url=<link do TikTok>` — prévia (título, capa, duração, autor)
- `GET /api/download?tipo=hd|sd|musica&url=<link>` — baixa o arquivo em streaming
- `GET /api/parte?parte=N&dur=<segundos>&url=<link>` — corta a parte N no servidor com ffmpeg

## Deploy

Projeto **novawave** na Vercel. Deploys de preview ficam atrás de login da Vercel;
para atualizar o site público é preciso deploy de **produção**.
