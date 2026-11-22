@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "CLOUDFLARED=cloudflared"
if exist "%~dp0cloudflared.exe" set "CLOUDFLARED=%~dp0cloudflared.exe"
if /I "%CLOUDFLARED%"=="cloudflared" (
 where cloudflared >nul 2>nul
 if errorlevel 1 (
   echo Cloudflared nao encontrado. Instale pelo site oficial Cloudflare.
   echo https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/
   echo Alternativa: copie o cloudflared.exe para esta pasta.
   pause & exit /b 1
 )
)
echo.
echo ATENCAO: compartilhe o link do Tunnel apenas com pessoas confiaveis.
echo Copie o endereco https://...trycloudflare.com que aparecera abaixo.
echo Mantenha esta janela aberta durante a sessao.
"%CLOUDFLARED%" tunnel --url http://127.0.0.1:8787 --protocol http2
pause
