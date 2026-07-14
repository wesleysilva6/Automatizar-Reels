# ============================================================
#  NovaWave - Interface grafica
#  Janela simples que chama o motor (novawave.ps1)
# ============================================================
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$Root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$Engine = Join-Path $Root 'novawave.ps1'
$ProntosDir = Join-Path $Root 'Prontos'

$form = New-Object System.Windows.Forms.Form
$form.Text = 'NovaWave - Automação de Stories'
$form.ClientSize = New-Object System.Drawing.Size(600, 540)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.StartPosition = 'CenterScreen'
$form.BackColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$lblHeader = New-Object System.Windows.Forms.Label
$lblHeader.Text = 'NovaWave'
$lblHeader.Font = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Bold)
$lblHeader.ForeColor = [System.Drawing.Color]::FromArgb(30, 100, 200)
$lblHeader.Location = New-Object System.Drawing.Point(20, 15)
$lblHeader.AutoSize = $true

$lblSub = New-Object System.Windows.Forms.Label
$lblSub.Text = 'Cole o link do TikTok, dê um título e clique em Gerar.'
$lblSub.ForeColor = [System.Drawing.Color]::Gray
$lblSub.Location = New-Object System.Drawing.Point(22, 52)
$lblSub.AutoSize = $true

$lblLink = New-Object System.Windows.Forms.Label
$lblLink.Text = 'Link do TikTok:'
$lblLink.Location = New-Object System.Drawing.Point(20, 88)
$lblLink.AutoSize = $true

$txtLink = New-Object System.Windows.Forms.TextBox
$txtLink.Location = New-Object System.Drawing.Point(22, 112)
$txtLink.Size = New-Object System.Drawing.Size(556, 28)

$lblTitulo = New-Object System.Windows.Forms.Label
$lblTitulo.Text = 'Título da história (opcional):'
$lblTitulo.Location = New-Object System.Drawing.Point(20, 150)
$lblTitulo.AutoSize = $true

$txtTitulo = New-Object System.Windows.Forms.TextBox
$txtTitulo.Location = New-Object System.Drawing.Point(22, 174)
$txtTitulo.Size = New-Object System.Drawing.Size(556, 28)

$btnGerar = New-Object System.Windows.Forms.Button
$btnGerar.Text = 'Gerar vídeos'
$btnGerar.Location = New-Object System.Drawing.Point(22, 216)
$btnGerar.Size = New-Object System.Drawing.Size(180, 40)
$btnGerar.BackColor = [System.Drawing.Color]::FromArgb(30, 100, 200)
$btnGerar.ForeColor = [System.Drawing.Color]::White
$btnGerar.FlatStyle = 'Flat'
$btnGerar.FlatAppearance.BorderSize = 0
$btnGerar.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)

$btnPasta = New-Object System.Windows.Forms.Button
$btnPasta.Text = 'Abrir pasta Prontos'
$btnPasta.Location = New-Object System.Drawing.Point(214, 216)
$btnPasta.Size = New-Object System.Drawing.Size(180, 40)
$btnPasta.FlatStyle = 'Flat'

$barra = New-Object System.Windows.Forms.ProgressBar
$barra.Location = New-Object System.Drawing.Point(22, 268)
$barra.Size = New-Object System.Drawing.Size(556, 10)
$barra.Style = 'Marquee'
$barra.MarqueeAnimationSpeed = 30
$barra.Visible = $false

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Location = New-Object System.Drawing.Point(22, 290)
$txtLog.Size = New-Object System.Drawing.Size(556, 200)
$txtLog.Multiline = $true
$txtLog.ReadOnly = $true
$txtLog.ScrollBars = 'Vertical'
$txtLog.BackColor = [System.Drawing.Color]::FromArgb(20, 20, 25)
$txtLog.ForeColor = [System.Drawing.Color]::FromArgb(200, 220, 200)
$txtLog.Font = New-Object System.Drawing.Font('Consolas', 9)

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = 'Pronto para começar.'
$lblStatus.Location = New-Object System.Drawing.Point(22, 500)
$lblStatus.Size = New-Object System.Drawing.Size(556, 28)
$lblStatus.ForeColor = [System.Drawing.Color]::Gray

$form.Controls.AddRange(@($lblHeader, $lblSub, $lblLink, $txtLink, $lblTitulo, $txtTitulo,
                          $btnGerar, $btnPasta, $barra, $txtLog, $lblStatus))

$script:proc    = $null
$script:logFile = $null
$script:errFile = $null
$script:logPos  = 0

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 400

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
    $btnGerar.Enabled  = -not $ocupado
    $txtLink.Enabled   = -not $ocupado
    $txtTitulo.Enabled = -not $ocupado
    $barra.Visible     = $ocupado
}

$timer.Add_Tick({
    Read-NovoLog
    if ($script:proc -and $script:proc.HasExited) {
        $timer.Stop()
        Start-Sleep -Milliseconds 300
        Read-NovoLog
        $codigo = $script:proc.ExitCode
        if ($codigo -eq 0) {
            $lblStatus.Text = 'PRONTO! Os vídeos estão na pasta Prontos.'
            $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 140, 60)
            $txtLink.Clear()
            $txtTitulo.Clear()
        } else {
            $erro = ''
            if ($script:errFile -and (Test-Path $script:errFile)) {
                $erro = [System.IO.File]::ReadAllText($script:errFile, [System.Text.Encoding]::UTF8)
            }
            if ($erro.Trim()) { $txtLog.AppendText("`r`nERRO:`r`n" + $erro.Trim() + "`r`n") }
            $lblStatus.Text = 'Deu erro. Veja a mensagem acima e tente de novo.'
            $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(190, 30, 30)
        }
        $script:proc = $null
        Set-Ocupado $false
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
    $lblStatus.ForeColor = [System.Drawing.Color]::Gray
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

$btnPasta.Add_Click({
    if (-not (Test-Path $ProntosDir)) { New-Item -ItemType Directory -Force $ProntosDir | Out-Null }
    explorer.exe $ProntosDir
})

$form.Add_Shown({ $txtLink.Focus() })
[void]$form.ShowDialog()
