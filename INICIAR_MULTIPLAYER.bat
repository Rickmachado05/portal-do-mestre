@echo off
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Instalando dependencias do Portal do Mestre...
  call npm install
  if errorlevel 1 (
    echo Nao foi possivel instalar as dependencias. Confira o Node.js e a conexao.
    pause
    exit /b 1
  )
)
echo Iniciando Portal do Mestre com multiplayer local...
call npm run dev:multiplayer
pause
