$ErrorActionPreference = 'Stop'
$Raiz = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Script = Join-Path $PSScriptRoot 'auxiliar-mestre.mjs'
$Node = (Get-Command node.exe -ErrorAction Stop).Source
# O iniciador recebe apenas caminhos locais fixos, sem argumentos vindos de páginas web.
$Argumentos = ('"{0}"' -f $Script)
# Evita abrir uma segunda instancia enquanto a porta local ja estiver ocupada.
if (Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 8790 -State Listen -ErrorAction SilentlyContinue) { exit 0 }
Start-Process -FilePath $Node -ArgumentList $Argumentos -WorkingDirectory $Raiz -WindowStyle Hidden
