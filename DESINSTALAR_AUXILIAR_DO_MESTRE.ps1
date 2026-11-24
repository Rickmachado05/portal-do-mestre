# Remove o protocolo e a inicialização automática do usuário atual.
$ErrorActionPreference = 'Stop'
Remove-Item 'HKCU:\Software\Classes\portalmestre' -Recurse -Force -ErrorAction SilentlyContinue
Remove-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'PortalDoMestreAuxiliar' -ErrorAction SilentlyContinue
$Encerrar = Join-Path $PSScriptRoot 'ENCERRAR_AUXILIAR_DO_MESTRE.ps1'
if (Test-Path $Encerrar) { & $Encerrar }
Write-Host 'Atalhos removidos e processos do auxiliar encerrados.'
