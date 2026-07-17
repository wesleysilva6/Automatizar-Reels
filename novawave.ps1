# ============================================================
#  NovaWave - Automacao de Stories
#  Baixa video do TikTok, corta em partes de ate 59s e
#  adiciona titulo + "Parte X de Y". Resultado em .\Prontos\
# ============================================================
param(
    [string]$Link,
    [string]$Titulo,
    [string]$ArquivoLocal,
    [switch]$NaoAbrirPasta,
    [switch]$SemPerguntas
)

$ErrorActionPreference = 'Stop'
try { chcp 65001 | Out-Null; [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

$Root       = Split-Path -Parent $MyInvocation.MyCommand.Path
$YtDlp      = Join-Path $Root 'tools\yt-dlp.exe'
$Ffmpeg     = Join-Path $Root 'tools\ffmpeg.exe'
$Ffprobe    = Join-Path $Root 'tools\ffprobe.exe'
$DownDir    = Join-Path $Root 'downloads'
$ProntosDir = Join-Path $Root 'Prontos'

Write-Host ''
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host '   NovaWave - Automacao de Stories'           -ForegroundColor Cyan
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host ''

if (-not $ArquivoLocal -and -not $Link) {
    if ($SemPerguntas) { throw 'Nenhum link informado.' }
    $Link = Read-Host 'Cole o link do TikTok e aperte Enter'
    if (-not $Link) { Write-Host 'Nenhum link informado. Saindo.' -ForegroundColor Yellow; exit 1 }
}
if (-not $Titulo -and -not $SemPerguntas -and -not $PSBoundParameters.ContainsKey('Titulo')) {
    $Titulo = Read-Host 'Titulo da historia (ou so aperte Enter para nenhum)'
}

# ---------- 1. Obter o video ----------
if ($ArquivoLocal) {
    $videoFile = (Resolve-Path $ArquivoLocal).Path
    Write-Host "[1/3] Usando arquivo local: $videoFile"
} else {
    Write-Host '[1/3] Baixando video do TikTok...' -ForegroundColor Green
    New-Item -ItemType Directory -Force $DownDir | Out-Null
    Get-ChildItem $DownDir -File -ErrorAction SilentlyContinue | Remove-Item -Force
    $videoFile = $null

    # 1a opcao: HD (1080p, com audio, sem marca d'agua) via api.tikwm.com --
    # a mesma API usada por sites como ssstik.io.
    $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    try {
        Write-Host '   Tentando download em HD...'
        $api  = 'https://www.tikwm.com/api/?hd=1&url=' + [uri]::EscapeDataString($Link)
        $resp = Invoke-RestMethod -Uri $api -UserAgent $ua -TimeoutSec 30
        if ($resp.code -ne 0 -or -not $resp.data.hdplay) { throw "resposta da API: $($resp.msg)" }
        $destinoHd = Join-Path $DownDir 'video.mp4'
        Invoke-WebRequest -Uri $resp.data.hdplay -OutFile $destinoHd -UserAgent $ua -TimeoutSec 300
        $videoFile = $destinoHd
        Write-Host '   Download HD concluido.' -ForegroundColor Green
    } catch {
        Write-Host "   HD indisponivel agora ($($_.Exception.Message)). Usando metodo alternativo..." -ForegroundColor Yellow
    }

    # 2a opcao: yt-dlp preferindo h264 -- os formatos h265 (bytevc1) do
    # TikTok chegam sem audio, apesar de a lista de formatos indicar que tem.
    if (-not $videoFile) {
        $tentativa = 0
        do {
            $tentativa++
            if ($tentativa -gt 1) {
                Write-Host "   O TikTok recusou, tentando de novo ($tentativa de 3)..." -ForegroundColor Yellow
                Start-Sleep -Seconds 8
            }
            & $YtDlp -f 'b[vcodec^=h264]/mp4/best' --no-playlist -o (Join-Path $DownDir 'video.%(ext)s') -- $Link
        } while ($LASTEXITCODE -ne 0 -and $tentativa -lt 3)
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao baixar o video. Confira o link e a internet.' }
        $videoFile = (Get-ChildItem $DownDir -File | Select-Object -First 1).FullName
    }

    $temAudio = & $Ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 -- $videoFile
    if (-not $temAudio) { throw 'O video baixado veio SEM AUDIO (falha do TikTok). Tente de novo em alguns minutos.' }
}

# ---------- 2. Calcular as partes ----------
$durTxt = & $Ffprobe -v error -show_entries format=duration -of csv=p=0 -- $videoFile
$dur    = [double]::Parse(($durTxt | Select-Object -First 1), [Globalization.CultureInfo]::InvariantCulture)
$PartLen = 59
$nParts  = [int][math]::Ceiling($dur / $PartLen)
Write-Host ("[2/3] Video tem {0:n0} segundos -> sera cortado em {1} parte(s)" -f $dur, $nParts) -ForegroundColor Green

if ($Titulo) { $slug = ($Titulo -replace '[\\/:*?"<>|]', '').Trim() } else { $slug = 'Historia' }
if (-not $slug) { $slug = 'Historia' }
$stamp  = Get-Date -Format 'yyyy-MM-dd HH.mm'
$outDir = Join-Path $ProntosDir "$slug ($stamp)"
New-Item -ItemType Directory -Force $outDir | Out-Null

function New-TextFile([string]$text) {
    $f = [IO.Path]::Combine($env:TEMP, 'nw_' + [guid]::NewGuid().ToString('N') + '.txt')
    [IO.File]::WriteAllText($f, $text, [Text.UTF8Encoding]::new($false))
    return $f
}
function ConvertTo-FilterPath([string]$p) {
    return (($p -replace '\\', '/') -replace ':', '\:')
}

$font = ConvertTo-FilterPath 'C:\Windows\Fonts\arialbd.ttf'
$tempFiles = @()

# ---------- 3. Cortar e legendar ----------
Write-Host '[3/3] Cortando e adicionando texto...' -ForegroundColor Green
for ($i = 1; $i -le $nParts; $i++) {
    $start = ($i - 1) * $PartLen
    $filters = @()
    if ($Titulo) {
        $tf = New-TextFile $Titulo; $tempFiles += $tf
        $filters += "drawtext=fontfile='$font':textfile='$(ConvertTo-FilterPath $tf)':fontcolor=white:fontsize=56:box=1:boxcolor=black@0.6:boxborderw=22:x=(w-text_w)/2:y=250"
    }
    if ($nParts -gt 1) {
        $pf = New-TextFile ("Parte $i de $nParts"); $tempFiles += $pf
        $filters += "drawtext=fontfile='$font':textfile='$(ConvertTo-FilterPath $pf)':fontcolor=white:fontsize=46:box=1:boxcolor=black@0.6:boxborderw=18:x=(w-text_w)/2:y=h-400"
    }
    $outFile = Join-Path $outDir ("Parte {0:d2}.mp4" -f $i)

    $ffArgs = @('-hide_banner', '-loglevel', 'error', '-y', '-ss', "$start", '-t', "$PartLen", '-i', $videoFile)
    if ($filters.Count -gt 0) { $ffArgs += @('-vf', ($filters -join ',')) }
    $ffArgs += @('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21',
                 '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', $outFile)

    & $Ffmpeg @ffArgs
    if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar a parte $i." }
    Write-Host ("   Parte {0} de {1} pronta." -f $i, $nParts)
}

$tempFiles | ForEach-Object { Remove-Item $_ -Force -ErrorAction SilentlyContinue }

Write-Host ''
Write-Host 'PRONTO! Videos salvos em:' -ForegroundColor Cyan
Write-Host "  $outDir" -ForegroundColor Cyan
Write-Host 'Agora e so passar para o celular e postar nos stories.' -ForegroundColor Cyan
if (-not $NaoAbrirPasta) { explorer.exe $outDir }
