@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo Portal do Mestre - Preparar acesso externo
 echo ==========================================
where npm >nul 2>nul
if errorlevel 1 (
  echo ERRO: Instale Node.js e npm antes de continuar.
  pause & exit /b 1
)
if not exist node_modules\vite\bin\vite.js (
  echo Instalando dependencias do projeto...
  call npm ci
  if errorlevel 1 (pause & exit /b 1)
)
call npm run cloudflare:build
if errorlevel 1 (
 echo Erro ao gerar o site. Veja as mensagens acima.
 pause & exit /b 1
)
echo.
echo Site preparado. Execute 02_INICIAR_SERVIDOR_CLOUDFLARE.bat.
pause
