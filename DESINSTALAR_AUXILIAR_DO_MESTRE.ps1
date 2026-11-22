# Remove o protocolo e a inicialização automática do usuário atual.
$ErrorActionPreference = 'Stop'
Remove-Item 'HKCU:\Software\Classes\portalmestre' -Recurse -Force -ErrorAction SilentlyContinue
Remove-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'PortalDoMestreAuxiliar' -ErrorAction SilentlyContinue
Write-Host 'Atalhos do auxiliar removidos. O processo já aberto pode ser encerrado no Gerenciador de Tarefas.'
