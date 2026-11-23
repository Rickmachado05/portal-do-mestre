# Baixa o cloudflared oficial APENAS com consentimento do usuário.
$ErrorActionPreference = 'Stop'
$Raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$Destino = Join-Path $Raiz 'cloudflared.exe'
$Url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
Write-Host 'Cloudflare Tunnel (Windows x64) — download oficial' -ForegroundColor Cyan
Write-Host $Url
if (Test-Path $Destino) { Write-Host 'cloudflared.exe ja existe. Nada foi substituido.'; exit 0 }
$Resposta = Read-Host 'Deseja baixar o executavel oficial? [S/N]'
if ($Resposta -notin @('s','S','sim','SIM')) { Write-Host 'Download cancelado.'; exit 0 }
$Temporario = Join-Path $Raiz 'cloudflared-download.tmp'
try {
  Invoke-WebRequest -Uri $Url -OutFile $Temporario -MaximumRedirection 8 -UseBasicParsing
  if ((Get-Item $Temporario).Length -lt 100000) { throw 'Download incompleto.' }
  Move-Item $Temporario $Destino
  & $Destino --version
  if ($LASTEXITCODE -ne 0) { throw 'Falha na verificacao da versao do executavel.' }
  Write-Host 'cloudflared.exe pronto.' -ForegroundColor Green
} catch {
  Remove-Item $Temporario -Force -ErrorAction SilentlyContinue
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host 'Baixe manualmente em https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/'
  exit 1
}
