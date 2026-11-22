@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist dist\index.html (
  echo Compile o site antes: 01_COMPILAR_PORTAL_CLOUDFLARE.bat
  pause & exit /b 1
)
echo Portal do Mestre - servidor local. Nao feche esta janela durante a sessao.
call npm run cloudflare:start
echo Servidor encerrado.
pause
