$ErrorActionPreference = 'Stop'
$Raiz = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Script = Join-Path $PSScriptRoot 'auxiliar-mestre.mjs'
$Node = (Get-Command node.exe -ErrorAction Stop).Source
# O iniciador recebe apenas caminhos locais fixos, sem argumentos vindos de páginas web.
$Argumentos = ('"{0}"' -f $Script)
Start-Process -FilePath $Node -ArgumentList $Argumentos -WorkingDirectory $Raiz -WindowStyle Hidden
