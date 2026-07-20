# ============================================================
#  NovaWave - Interface grafica (estilo ssstik)
#  Janela que mostra a previa do video e chama o motor (novawave.ps1)
# ============================================================
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$Root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$Engine = Join-Path $Root 'novawave.ps1'
$YtDlp  = Join-Path $Root 'tools\yt-dlp.exe'
$ProntosDir = Join-Path $Root 'Prontos'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

# ---- Cores (estilo ssstik: roxo + rosa) ----
$CorRoxoEscuro = [System.Drawing.Color]::FromArgb(76, 29, 149)
$CorRoxo       = [System.Drawing.Color]::FromArgb(124, 58, 237)
$CorRosa       = [System.Drawing.Color]::FromArgb(236, 72, 153)
$CorFundo      = [System.Drawing.Color]::FromArgb(250, 245, 255)
$CorCinza      = [System.Drawing.Color]::FromArgb(120, 120, 130)

$form = New-Object System.Windows.Forms.Form
$form.Text = 'NovaWave - Automação de Stories'
$form.ClientSize = New-Object System.Drawing.Size(620, 676)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.StartPosition = 'CenterScreen'
$form.BackColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

# ---- Cabecalho com gradiente ----
$panelHeader = New-Object System.Windows.Forms.Panel
$panelHeader.Location = New-Object System.Drawing.Point(0, 0)
$panelHeader.Size = New-Object System.Drawing.Size(620, 110)
$panelHeader.Add_Paint({
    param($sender, $e)
    $rect  = $sender.ClientRectangle
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect, $CorRoxoEscuro, $CorRosa, 25)
    $e.Graphics.FillRectangle($brush, $rect)
    $brush.Dispose()
})

$lblHeader = New-Object System.Windows.Forms.Label
$lblHeader.Text = 'NovaWave'
$lblHeader.Font = New-Object System.Drawing.Font('Segoe UI', 20, [System.Drawing.FontStyle]::Bold)
$lblHeader.ForeColor = [System.Drawing.Color]::White
$lblHeader.BackColor = [System.Drawing.Color]::Transparent
$lblHeader.Location = New-Object System.Drawing.Point(22, 18)
$lblHeader.AutoSize = $true

$lblSub = New-Object System.Windows.Forms.Label
$lblSub.Text = 'Baixe vídeos do TikTok em HD, sem marca d''água, prontos para os stories.'
$lblSub.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$lblSub.ForeColor = [System.Drawing.Color]::FromArgb(235, 225, 250)
$lblSub.BackColor = [System.Drawing.Color]::Transparent
$lblSub.Location = New-Object System.Drawing.Point(24, 62)
$lblSub.AutoSize = $true

$panelHeader.Controls.AddRange(@($lblHeader, $lblSub))

# ---- Link + botao Colar ----
$lblLink = New-Object System.Windows.Forms.Label
$lblLink.Text = 'Link do TikTok:'
$lblLink.Location = New-Object System.Drawing.Point(22, 124)
$lblLink.AutoSize = $true

$txtLink = New-Object System.Windows.Forms.TextBox
$txtLink.Location = New-Object System.Drawing.Point(24, 150)
$txtLink.Size = New-Object System.Drawing.Size(438, 28)
$txtLink.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$btnColar = New-Object System.Windows.Forms.Button
$btnColar.Text = 'Colar link'
$btnColar.Location = New-Object System.Drawing.Point(472, 147)
$btnColar.Size = New-Object System.Drawing.Size(124, 31)
$btnColar.FlatStyle = 'Flat'
$btnColar.BackColor = $CorRoxo
$btnColar.ForeColor = [System.Drawing.Color]::White
$btnColar.FlatAppearance.BorderSize = 0
$btnColar.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)

# ---- Cartao de previa do video ----
$panelPrev = New-Object System.Windows.Forms.Panel
$panelPrev.Location = New-Object System.Drawing.Point(24, 190)
$panelPrev.Size = New-Object System.Drawing.Size(572, 112)
$panelPrev.BackColor = $CorFundo
$panelPrev.BorderStyle = 'FixedSingle'

$picCover = New-Object System.Windows.Forms.PictureBox
$picCover.Location = New-Object System.Drawing.Point(10, 8)
$picCover.Size = New-Object System.Drawing.Size(72, 94)
$picCover.SizeMode = 'Zoom'
$picCover.BackColor = [System.Drawing.Color]::FromArgb(235, 228, 248)

$lblVideoTitle = New-Object System.Windows.Forms.Label
$lblVideoTitle.Location = New-Object System.Drawing.Point(94, 10)
$lblVideoTitle.Size = New-Object System.Drawing.Size(466, 36)
$lblVideoTitle.AutoEllipsis = $true
$lblVideoTitle.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$lblVideoTitle.ForeColor = $CorCinza
$lblVideoTitle.Text = 'A prévia do vídeo aparece aqui depois de colar o link.'

$lblVideoMeta = New-Object System.Windows.Forms.Label
$lblVideoMeta.Location = New-Object System.Drawing.Point(94, 52)
$lblVideoMeta.Size = New-Object System.Drawing.Size(466, 22)
$lblVideoMeta.ForeColor = $CorCinza
$lblVideoMeta.Text = ''

$lblVideoParts = New-Object System.Windows.Forms.Label
$lblVideoParts.Location = New-Object System.Drawing.Point(94, 78)
$lblVideoParts.Size = New-Object System.Drawing.Size(466, 22)
$lblVideoParts.ForeColor = $CorRoxo
$lblVideoParts.Font = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
$lblVideoParts.Text = ''

$panelPrev.Controls.AddRange(@($picCover, $lblVideoTitle, $lblVideoMeta, $lblVideoParts))

# ---- Titulo ----
$lblTitulo = New-Object System.Windows.Forms.Label
$lblTitulo.Text = 'Título da história (opcional):'
$lblTitulo.Location = New-Object System.Drawing.Point(22, 312)
$lblTitulo.AutoSize = $true

$txtTitulo = New-Object System.Windows.Forms.TextBox
$txtTitulo.Location = New-Object System.Drawing.Point(24, 338)
$txtTitulo.Size = New-Object System.Drawing.Size(572, 28)
$txtTitulo.Font = New-Object System.Drawing.Font('Segoe UI', 10)

# ---- Botoes principais ----
$btnGerar = New-Object System.Windows.Forms.Button
$btnGerar.Text = 'Gerar Stories em HD'
$btnGerar.Location = New-Object System.Drawing.Point(24, 380)
$btnGerar.Size = New-Object System.Drawing.Size(280, 46)
$btnGerar.BackColor = $CorRosa
$btnGerar.ForeColor = [System.Drawing.Color]::White
$btnGerar.FlatStyle = 'Flat'
$btnGerar.FlatAppearance.BorderSize = 0
$btnGerar.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)

$btnPasta = New-Object System.Windows.Forms.Button
$btnPasta.Text = 'Abrir pasta Prontos'
$btnPasta.Location = New-Object System.Drawing.Point(316, 380)
$btnPasta.Size = New-Object System.Drawing.Size(280, 46)
$btnPasta.FlatStyle = 'Flat'
$btnPasta.ForeColor = $CorRoxo
$btnPasta.FlatAppearance.BorderColor = $CorRoxo
$btnPasta.Font = New-Object System.Drawing.Font('Segoe UI', 11)

$barra = New-Object System.Windows.Forms.ProgressBar
$barra.Location = New-Object System.Drawing.Point(24, 438)
$barra.Size = New-Object System.Drawing.Size(572, 8)
$barra.Style = 'Marquee'
$barra.MarqueeAnimationSpeed = 30
$barra.Visible = $false

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Location = New-Object System.Drawing.Point(24, 454)
$txtLog.Size = New-Object System.Drawing.Size(572, 182)
$txtLog.Multiline = $true
$txtLog.ReadOnly = $true
$txtLog.ScrollBars = 'Vertical'
$txtLog.BackColor = [System.Drawing.Color]::FromArgb(25, 20, 35)
$txtLog.ForeColor = [System.Drawing.Color]::FromArgb(215, 200, 240)
$txtLog.Font = New-Object System.Drawing.Font('Consolas', 9)

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = 'Pronto para começar.'
$lblStatus.Location = New-Object System.Drawing.Point(24, 648)
$lblStatus.Size = New-Object System.Drawing.Size(380, 26)
$lblStatus.ForeColor = $CorCinza

# ---- Botao "Atualizar baixador" (roda yt-dlp -U quando o TikTok muda algo) ----
$btnAtualizar = New-Object System.Windows.Forms.Button
$btnAtualizar.Text = 'Atualizar baixador'
$btnAtualizar.Location = New-Object System.Drawing.Point(430, 643)
$btnAtualizar.Size = New-Object System.Drawing.Size(166, 30)
$btnAtualizar.FlatStyle = 'Flat'
$btnAtualizar.ForeColor = $CorRoxo
$btnAtualizar.FlatAppearance.BorderColor = $CorRoxo
$btnAtualizar.Font = New-Object System.Drawing.Font('Segoe UI', 9)

$form.Controls.AddRange(@($panelHeader, $lblLink, $txtLink, $btnColar, $panelPrev,
                          $lblTitulo, $txtTitulo, $btnGerar, $btnPasta, $barra, $txtLog,
                          $lblStatus, $btnAtualizar))

$script:proc    = $null
$script:logFile = $null
$script:errFile = $null
$script:logPos  = 0
$script:modo    = 'gerar'   # 'gerar' ou 'atualizar'

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 400

function Reset-Previa {
    if ($picCover.Image) { $picCover.Image.Dispose() }
    $picCover.Image = $null
    $lblVideoTitle.ForeColor = $CorCinza
    $lblVideoTitle.Text = 'A prévia do vídeo aparece aqui depois de colar o link.'
    $lblVideoMeta.Text  = ''
    $lblVideoParts.Text = ''
}

function Show-Previa([string]$link) {
    if (-not $link) { return }
    $lblStatus.Text = 'Buscando informações do vídeo...'
    $lblStatus.ForeColor = $CorCinza
    $form.Cursor = 'WaitCursor'
    $form.Refresh()
    try {
        $api  = 'https://www.tikwm.com/api/?hd=1&url=' + [uri]::EscapeDataString($link)
        $resp = Invoke-RestMethod -Uri $api -UserAgent $UA -TimeoutSec 20
        if ($resp.code -ne 0) { throw $resp.msg }
        $d = $resp.data

        if ($d.title) { $tituloVideo = $d.title } else { $tituloVideo = '(sem descrição)' }
        $lblVideoTitle.ForeColor = [System.Drawing.Color]::FromArgb(40, 30, 60)
        $lblVideoTitle.Text = $tituloVideo

        $dur = [int]$d.duration
        $mm  = [math]::Floor($dur / 60)
        $ss  = $dur % 60
        $lblVideoMeta.Text = ('@{0}   •   {1}:{2:d2} de duração' -f $d.author.unique_id, $mm, $ss)

        $partes = [math]::Ceiling($dur / 59)
        if ($partes -eq 1) {
            $lblVideoParts.Text = 'Vai sair em 1 parte única.'
        } else {
            $lblVideoParts.Text = "Vai ser cortado em $partes partes de até 59s."
        }

        if ($picCover.Image) { $picCover.Image.Dispose(); $picCover.Image = $null }
        try {
            $bytes = (Invoke-WebRequest -Uri $d.cover -UserAgent $UA -TimeoutSec 20).Content
            $ms = New-Object System.IO.MemoryStream(, $bytes)
            $picCover.Image = [System.Drawing.Image]::FromStream($ms)
        } catch {}

        $lblStatus.Text = 'Vídeo encontrado! Confira a prévia e clique em Gerar.'
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 140, 60)
    } catch {
        Reset-Previa
        $lblVideoTitle.Text = 'Não deu para carregar a prévia agora (mesmo assim dá para gerar).'
        $lblStatus.Text = 'Prévia indisponível. Você ainda pode clicar em Gerar.'
        $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(190, 120, 0)
    } finally {
        $form.Cursor = 'Default'
    }
}

function Read-NovoLog {
    if (-not $script:logFile -or -not (Test-Path $script:logFile)) { return }
    try {
        $fs = [System.IO.File]::Open($script:logFile, 'Open', 'Read', 'ReadWrite')
        try {
            if ($fs.Length -gt $script:logPos) {
                $fs.Seek($script:logPos, 'Begin') | Out-Null
                $buf = New-Object byte[] ($fs.Length - $script:logPos)
                $lidos = $fs.Read($buf, 0, $buf.Length)
                $script:logPos += $lidos
                $texto = [System.Text.Encoding]::UTF8.GetString($buf, 0, $lidos)
                if ($texto) {
                    $txtLog.AppendText(($texto -replace "(?<!`r)`n", "`r`n"))
                }
            }
        } finally { $fs.Close() }
    } catch {}
}

function Set-Ocupado([bool]$ocupado) {
    $btnGerar.Enabled     = -not $ocupado
    $btnColar.Enabled     = -not $ocupado
    $btnAtualizar.Enabled = -not $ocupado
    $txtLink.Enabled      = -not $ocupado
    $txtTitulo.Enabled    = -not $ocupado
    $barra.Visible        = $ocupado
}

$timer.Add_Tick({
    Read-NovoLog
    if ($script:proc -and $script:proc.HasExited) {
        $timer.Stop()
        Start-Sleep -Milliseconds 300
        Read-NovoLog
        $codigo = $script:proc.ExitCode
        if ($codigo -eq 0) {
            if ($script:modo -eq 'atualizar') {
                $lblStatus.Text = 'Baixador atualizado! Já pode gerar seus vídeos.'
            } else {
                $lblStatus.Text = 'PRONTO! Os vídeos estão na pasta Prontos.'
                $txtLink.Clear()
                $txtTitulo.Clear()
                Reset-Previa
            }
            $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 140, 60)
        } else {
            $erro = ''
            if ($script:errFile -and (Test-Path $script:errFile)) {
                $erro = [System.IO.File]::ReadAllText($script:errFile, [System.Text.Encoding]::UTF8)
            }
            if ($erro.Trim()) { $txtLog.AppendText("`r`nERRO:`r`n" + $erro.Trim() + "`r`n") }
            if ($script:modo -eq 'atualizar') {
                $lblStatus.Text = 'Não deu para atualizar o baixador. Veja a mensagem acima.'
            } else {
                $lblStatus.Text = 'Deu erro. Veja a mensagem acima e tente de novo.'
            }
            $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(190, 30, 30)
        }
        $script:proc = $null
        Set-Ocupado $false
    }
})

$btnColar.Add_Click({
    try {
        $texto = [System.Windows.Forms.Clipboard]::GetText()
    } catch { $texto = '' }
    if ($texto.Trim()) {
        $txtLink.Text = $texto.Trim()
        Show-Previa ($txtLink.Text -replace '"', '')
    } else {
        [System.Windows.Forms.MessageBox]::Show('Copie o link do TikTok primeiro e depois clique em Colar link.',
            'NovaWave', 'OK', 'Information') | Out-Null
    }
})

$txtLink.Add_KeyDown({
    param($sender, $e)
    if ($e.KeyCode -eq 'Enter') {
        $e.SuppressKeyPress = $true
        Show-Previa ($txtLink.Text.Trim() -replace '"', '')
    }
})

$btnGerar.Add_Click({
    $link = $txtLink.Text.Trim() -replace '"', ''
    if (-not $link) {
        [System.Windows.Forms.MessageBox]::Show('Cole o link do TikTok primeiro.', 'NovaWave',
            'OK', 'Warning') | Out-Null
        return
    }
    $titulo = $txtTitulo.Text.Trim() -replace '"', ''

    $txtLog.Clear()
    $lblStatus.Text = 'Trabalhando... isso pode levar alguns minutos.'
    $lblStatus.ForeColor = $CorCinza
    $script:modo = 'gerar'
    Set-Ocupado $true

    $script:logFile = [System.IO.Path]::GetTempFileName()
    $script:errFile = [System.IO.Path]::GetTempFileName()
    $script:logPos  = 0

    $argumentos = "-NoProfile -ExecutionPolicy Bypass -File `"$Engine`" -Link `"$link`" -SemPerguntas"
    if ($titulo) { $argumentos += " -Titulo `"$titulo`"" }
    $script:proc = Start-Process -FilePath 'powershell.exe' -ArgumentList $argumentos `
        -RedirectStandardOutput $script:logFile -RedirectStandardError $script:errFile `
        -WindowStyle Hidden -PassThru
    $null = $script:proc.Handle   # garante que o ExitCode fique disponivel depois
    $timer.Start()
})

$btnAtualizar.Add_Click({
    if (-not (Test-Path $YtDlp)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Não encontrei o baixador em:`n$YtDlp", 'NovaWave', 'OK', 'Warning') | Out-Null
        return
    }
    $txtLog.Clear()
    $txtLog.AppendText("Procurando atualização do baixador (yt-dlp)...`r`n")
    $lblStatus.Text = 'Atualizando o baixador...'
    $lblStatus.ForeColor = $CorCinza
    $script:modo = 'atualizar'
    Set-Ocupado $true

    $script:logFile = [System.IO.Path]::GetTempFileName()
    $script:errFile = [System.IO.Path]::GetTempFileName()
    $script:logPos  = 0

    $script:proc = Start-Process -FilePath $YtDlp -ArgumentList '-U' `
        -RedirectStandardOutput $script:logFile -RedirectStandardError $script:errFile `
        -WindowStyle Hidden -PassThru
    $null = $script:proc.Handle
    $timer.Start()
})

$btnPasta.Add_Click({
    if (-not (Test-Path $ProntosDir)) { New-Item -ItemType Directory -Force $ProntosDir | Out-Null }
    explorer.exe $ProntosDir
})

$form.Add_Shown({ $txtLink.Focus() })
[void]$form.ShowDialog()
