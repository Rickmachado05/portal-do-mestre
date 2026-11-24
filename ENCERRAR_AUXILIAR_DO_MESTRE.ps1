# Encerra somente os processos do Portal nesta pasta. Nao exige administrador.
$ErrorActionPreference = 'Stop'
$Raiz = (Resolve-Path $PSScriptRoot).Path
$Agente = Join-Path $Raiz 'scripts\auxiliar-mestre\auxiliar-mestre.mjs'
$Servidor = Join-Path $Raiz 'scripts\multiplayer-server.mjs'
$Origem = 'https://portal-do-mestre.vercel.app'
$ArquivoOrigem = Join-Path $Raiz '.portal-vercel-origem.local'
if (Test-Path $ArquivoOrigem) { $Origem = (Get-Content $ArquivoOrigem -Raw).Trim() }
# A identificacao exige o caminho exato do script Node, nao apenas o nome node.exe.
function ProcessosPortal($Caminho) {
    $Padrao = '(?i)(?:^|\s)"?' + [regex]::Escape($Caminho) + '"?(?:\s|$)'
    @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine -match $Padrao })
}
$Agentes = @(ProcessosPortal $Agente)
if ($Agentes.Count -gt 0) {
    # Confere se a porta pertence a um agente desta pasta antes de enviar o comando.
    $Dono = @(Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 8790 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)
    if (@($Agentes | Where-Object { $Dono -contains $_.ProcessId }).Count -gt 0) {
        try {
            Invoke-RestMethod -Uri 'http://127.0.0.1:8790/v1/shutdown' -Method Post -Headers @{Origin=$Origem} -ContentType 'application/json' -Body '{}' -TimeoutSec 8 | Out-Null
            Start-Sleep -Milliseconds 500
        } catch {
            # Versao antiga: parar os filhos e depois encerrar o agente exato.
            try { Invoke-RestMethod -Uri 'http://127.0.0.1:8790/v1/stop' -Method Post -Headers @{Origin=$Origem} -ContentType 'application/json' -Body '{}' -TimeoutSec 4 | Out-Null } catch {}
        }
    }
}
foreach ($P in (@(ProcessosPortal $Agente) + @(ProcessosPortal $Servidor))) {
    # Revalida o PID e a linha de comando antes de encerrar a arvore.
    $Atual = Get-CimInstance Win32_Process -Filter ("ProcessId="+$P.ProcessId) -ErrorAction SilentlyContinue
    if ($Atual -and $Atual.CommandLine -eq $P.CommandLine -and $Atual.CreationDate -eq $P.CreationDate) {
        & taskkill.exe /PID $P.ProcessId /T /F | Out-Null
    }
}
if (@(ProcessosPortal $Agente).Count -or @(ProcessosPortal $Servidor).Count) { throw 'Ainda existem processos do Portal nesta pasta.' }
Write-Host 'Auxiliar e servidor desta pasta encerrados.' -ForegroundColor Green
