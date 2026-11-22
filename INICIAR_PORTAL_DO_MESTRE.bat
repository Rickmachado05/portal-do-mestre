@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Portal do Mestre - Sessao online
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale o Node.js para hospedar sessoes.
  echo https://nodejs.org/
  pause
  exit /b 1
)
node "%~dp0scripts\iniciar-sessao-vercel.mjs"
if errorlevel 1 (
  echo.
  echo O iniciador terminou com erro. Leia a mensagem acima.
  pause
)
endlocal
