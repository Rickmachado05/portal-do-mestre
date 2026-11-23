# Portal do Mestre — hospedagem gratuita para outros mestres

Este guia explica como **hospedar sessões online a partir do seu próprio PC Windows**, sem alugar um servidor. O frontend continua em https://portal-do-mestre.vercel.app, enquanto o servidor Node.js e o Cloudflare Quick Tunnel são executados no computador do mestre.

**Jogadores NÃO precisam instalar nada.** Basta abrir o link de convite gerado pelo Portal. Somente quem deseja **hospedar como mestre** instala o auxiliar.

## 1. Baixar os arquivos

Abra https://portal-do-mestre.vercel.app/como-hospedar.html e clique em **Baixar Auxiliar do Mestre (.zip)**.

Extraia o ZIP para uma pasta permanente, por exemplo `Documentos\\PortalMestreAuxiliar`. Não execute o instalador dentro do próprio ZIP e evite mover essa pasta depois da instalação.

O pacote contém o auxiliar, scripts de servidor, instalador, desinstalador, script opcional de download do Cloudflare e orientações. **Não contém Node.js nem cloudflared.exe.** O frontend React completo não precisa ser baixado.

## 2. Instalar Node.js e cloudflared

Instale **Node.js LTS 22 ou superior** pela página oficial https://nodejs.org/en/download e confirme em um PowerShell:

```powershell
node --version
```

Instale também o Cloudflare Tunnel oficial: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/.

No ZIP há um script opcional que **pede sua confirmação** antes de baixar o executável oficial para a pasta extraída:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\\BAIXAR_CLOUDFLARED.ps1
```

**Importante ao baixar manualmente:** renomeie o executável para **`cloudflared.exe`** e coloque-o na **pasta principal do Auxiliar do Mestre extraída do ZIP**, ao lado de `INSTALAR_AUXILIAR_DO_MESTRE.ps1` e `BAIXAR_CLOUDFLARED.ps1` (não dentro da subpasta `scripts` ou outra pasta). O script de download acima já salva o arquivo com o nome e no local corretos.

## 3. Instalar o auxiliar uma vez

No **PowerShell aberto dentro da pasta extraída**, depois de conferir os arquivos:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\\INSTALAR_AUXILIAR_DO_MESTRE.ps1
```

O instalador registra `portalmestre://` e a inicialização do pequeno agente no login **somente para o usuário Windows atual** (HKCU). Não precisa de administrador. O servidor multiplayer e o Tunnel **não iniciam sozinhos** ao ligar o PC; são acionados quando você hospeda uma sala no site. O Bypass vale apenas para essa invocação do PowerShell.

## 4. Iniciar uma mesa

1. Abra https://portal-do-mestre.vercel.app **no mesmo computador onde instalou o auxiliar**.
2. Crie ou abra uma campanha e vá a **Multiplayer → Iniciar sala multiplayer**.
3. Se o Chrome/Edge solicitar acesso à rede local/loopback, permita para o domínio oficial, caso confie no software instalado. Não desative proteções do navegador.
4. Aguarde o Portal iniciar o servidor e o Quick Tunnel, mostrando o código e o link de convite.
5. Envie **o link de convite**, não o link da mesa do mestre, aos jogadores.
6. Mantenha o PC ligado e conectado à internet durante a sessão.

Cada mestre hospeda suas próprias sessões no seu computador. Isso não é uma nuvem permanente; há limites do Quick Tunnel e da conexão de internet de cada mestre.

## 5. Se não funcionar

- **Auxiliar não encontrado:** execute `Test-NetConnection 127.0.0.1 -Port 8790` no PowerShell. Deve mostrar `TcpTestSucceeded : True`.
- **Porta 8790 indisponível:** reinstale ou tente iniciar `node .\\scripts\\auxiliar-mestre\\auxiliar-mestre.mjs` no PowerShell para ver o erro.
- **Porta 8787 ocupada:** feche o antigo servidor multiplayer antes de iniciar pelo site.
- **Falha de permissão no navegador:** confirme a permissão de acesso ao próprio PC para o domínio do Portal; não desative a segurança do navegador.
- **Cloudflare não encontrado:** confira `cloudflared.exe` ou sua instalação no PATH.
- **Logs:** veja `.portal-multiplayer-sessoes\\auxiliar-mestre.log`.
- **Mudou a pasta:** execute o instalador novamente dentro da nova pasta para corrigir o caminho no registro.

Para remover a integração:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\\DESINSTALAR_AUXILIAR_DO_MESTRE.ps1
```

Encerre qualquer processo auxiliar em execução antes de apagar os arquivos.

## Privacidade e limitações

- O auxiliar aceita conexões locais somente em `127.0.0.1:8790`, de origens autorizadas.
- O servidor de sessão usa `127.0.0.1:8787`; o Quick Tunnel publica somente a API do multiplayer via HTTPS.
- Campanhas são armazenadas no navegador do mestre (IndexedDB/localStorage); arquivos de sessão ficam no computador onde a sala é hospedada. **Faça backups**.
- Não baixe o auxiliar de páginas não oficiais e não compartilhe credenciais ou links privados.
- O pacote é feito para **Windows 10/11 x64** com Chrome/Edge atualizado e conexão estável.
- O projeto é gratuito e de portfólio, sem disponibilidade garantida ou custos de hospedagem central.

**Código-fonte:** https://github.com/Rickmachado05/portal-do-mestre

**Site:** https://portal-do-mestre.vercel.app
