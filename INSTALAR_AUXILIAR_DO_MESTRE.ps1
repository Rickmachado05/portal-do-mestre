# Instala SOMENTE para o usuário atual, sem privilégios de administrador.
# Registra o protocolo portalmestre://; a abertura é sob demanda.
$ErrorActionPreference = 'Stop'
$Raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$Abrir = Join-Path $Raiz 'scripts\auxiliar-mestre\abrir-auxiliar.ps1'
$Agente = Join-Path $Raiz 'scripts\auxiliar-mestre\auxiliar-mestre.mjs'
if (!(Test-Path $Abrir) -or !(Test-Path $Agente)) { throw 'Arquivos do auxiliar ausentes. Extraia a atualização preservando a estrutura de pastas.' }
$Node = (Get-Command node.exe -ErrorAction Stop).Source
# O usuário iniciou o instalador conscientemente; libera somente o lançador deste pacote.
Unblock-File -Path $Abrir -ErrorAction SilentlyContinue
$PS = Join-Path $PSHOME 'powershell.exe'
if (!(Test-Path $PS)) { $PS = (Get-Command powershell.exe -ErrorAction Stop).Source }

# HKCU: não altera permissões de todo o sistema.
$Classe = 'HKCU:\Software\Classes\portalmestre'
New-Item -Path $Classe -Force | Out-Null
Set-Item -Path $Classe -Value 'URL:Portal do Mestre' -Force
New-ItemProperty -Path $Classe -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
$Comando = Join-Path $Classe 'shell\open\command'
New-Item -Path $Comando -Force | Out-Null
$AbrirCmd = '"{0}" -NoProfile -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File "{1}"' -f $PS, $Abrir
Set-Item -Path $Comando -Value $AbrirCmd -Force

# Remove a inicializacao automatica das instalacoes anteriores.
Remove-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'PortalDoMestreAuxiliar' -ErrorAction SilentlyContinue
# Encerra somente a instancia desta pasta antes de carregar a nova versao.
$Encerrar = Join-Path $Raiz 'ENCERRAR_AUXILIAR_DO_MESTRE.ps1'
if (Test-Path $Encerrar) { & $Encerrar }
Start-Process -FilePath $PS -ArgumentList ('-NoProfile -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File "{0}"' -f $Abrir) -WorkingDirectory $Raiz -WindowStyle Hidden

# Registrar o protocolo nao comprova que o processo Node iniciou. Validar a API real.
# A API exige cabecalho Origin mesmo na rota de status.
$Origem = 'https://portal-do-mestre.vercel.app'
$ArquivoOrigem = Join-Path $Raiz '.portal-vercel-origem.local'
if (Test-Path $ArquivoOrigem) { $Origem = (Get-Content -Path $ArquivoOrigem -Raw).Trim() }
$Detectado = $false
for ($Tentativa = 0; $Tentativa -lt 10; $Tentativa++) {
    try {
        $Resposta = Invoke-RestMethod -Uri 'http://127.0.0.1:8790/v1/status' -Headers @{ Origin = $Origem } -Method Get -TimeoutSec 2 -ErrorAction Stop
        if ($Resposta.estado -in @('parado', 'iniciando', 'pronto', 'erro')) {
            $Detectado = $true
            break
        }
    } catch { Start-Sleep -Milliseconds 350 }
}
if (-not $Detectado) {
    Write-Host ''
    Write-Warning 'Instalacao registrada, mas o auxiliar NAO respondeu em 127.0.0.1:8790.'
    Write-Host 'Abra o PowerShell nesta pasta e execute para visualizar o erro:'
    Write-Host ('  & "{0}" "{1}"' -f $Node, $Agente)
    Write-Host ('Log: {0}' -f (Join-Path $Raiz '.portal-multiplayer-sessoes\auxiliar-mestre.log'))
    exit 1
}
Write-Host ''
Write-Host 'Auxiliar do Portal do Mestre instalado e DETECTADO em 127.0.0.1:8790.' -ForegroundColor Green
Write-Host ('Node.js: {0}' -f $Node)
Write-Host 'O auxiliar abre sob demanda, sem iniciar junto com o Windows. Use Encerrar auxiliar completamente ao terminar.'
Write-Host 'Se mover a pasta do Portal, execute este instalador novamente na nova pasta.'
Write-Host 'Para remover a integracao, execute DESINSTALAR_AUXILIAR_DO_MESTRE.ps1.'
