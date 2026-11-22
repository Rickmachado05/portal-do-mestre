# Portal do Mestre v29.15.30.25 — Iniciar o multiplayer pelo site

O frontend continua hospedado na Vercel. O servidor Node e o Cloudflare Quick Tunnel continuam no computador do mestre; nenhum recurso de campanha é enviado ao GitHub por este auxiliar.

## Atualização (uma vez)

1. Feche as janelas antigas do servidor (02), Tunnel (03) e iniciador unificado da v29.15.30.24, caso estejam abertas.
2. Extraia o ZIP de correção por cima da pasta que você abre no VS Code, preservando a estrutura `src/` e `scripts/`.
3. No VS Code, confira e teste o código. Faça commit e **Push** na branch `main` para a Vercel atualizar a interface.
4. Mantenha o `cloudflared.exe` na pasta do Portal no **PC do mestre**, ou instale no `PATH` como antes. O arquivo não é enviado ao GitHub.
5. Abra o terminal PowerShell na pasta do projeto e execute **uma única vez**:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\INSTALAR_AUXILIAR_DO_MESTRE.ps1
   ```

   Execute somente se você confia nos arquivos da atualização. Este comando muda a política de execução **apenas para a execução do instalador**, não a configuração permanente do Windows. O instalador registra um aplicativo por usuário (HKCU) e uma inicialização automática leve após login. Não exige administrador.

6. Acesse `https://portal-do-mestre.vercel.app` no **mesmo PC onde instalou o auxiliar**. Abra uma campanha, vá a **Multiplayer** e clique em **Iniciar sala multiplayer**.
7. Se o Chrome/Edge perguntar se o Portal pode acessar aplicativos/dispositivos neste computador (permissão de rede local/loopback), escolha **Permitir**. Isso é necessário para a página HTTPS conversar com o auxiliar em `127.0.0.1:8790`. Não é preciso desativar a segurança do navegador.
8. O Portal liga Node e Cloudflare, obtém o endereço `https://...trycloudflare.com`, guarda a origem e cria a sala. Copie o convite dentro do painel para os jogadores.

**Encerrar:** use **Encerrar sala de teste** primeiro. Depois, quando não houver mais salas ativas, clique em **Desligar servidor e Tunnel**. O auxiliar permanece aguardando novas sessões; não ocupa a porta 8787 enquanto está parado.

## Se não conectar

- Não deixe o iniciador v29.15.30.24 ou o arquivo `02` rodando ao tentar iniciar pelo site: ambos usam a porta `8787`.
- Se aparecer `Auxiliar local não encontrado`, verifique a instalação e clique em **Abrir auxiliar instalado no Windows**. O navegador pode mostrar uma confirmação para abrir o aplicativo local. Depois clique em **Iniciar sala multiplayer** novamente.
- Se a permissão de rede local foi negada, permita-a nas configurações do site do Chrome/Edge. Não mude flags de segurança.
- Os logs da inicialização ficam em `.portal-multiplayer-sessoes/auxiliar-mestre.log`, arquivo ignorado pelo Git.
- Se o domínio Vercel mudar, execute o `04_CONFIGURAR_VERCEL.bat` novamente e reinicie o auxiliar ou o Windows.
- O método manual com os arquivos `02`, `03` e o campo de endereço do Tunnel continua disponível como alternativa.
- Se mover a pasta do Portal para outra localização, execute novamente o instalador para atualizar o caminho.

## Desinstalar

No PowerShell, dentro da pasta do Portal:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\DESINSTALAR_AUXILIAR_DO_MESTRE.ps1
```

Isso remove o registro de inicialização e o protocolo deste usuário. Se houver um auxiliar já ativo, desligue a sessão no Portal e encerre a sessão do Windows para finalizar o processo.

## Como funciona e segurança

- O auxiliar atende **apenas `127.0.0.1:8790`**, não fica aberto para a rede local ou internet.
- Somente a origem Vercel autorizada pode chamar suas rotas para status, iniciar e parar, e nenhuma delas aceita comandos, caminhos ou executáveis arbitrários.
- O servidor da sessão usa `127.0.0.1:8787`, protegido pelas regras existentes de autenticação e autorização; o Cloudflare expõe essa API via Tunnel com HTTPS.
- Dados do Portal permanecem no navegador/backup e, durante sessões, na pasta local ignorada pelo Git.
- Se o auxiliar não for instalado, o Portal ainda permite usar o método manual anterior.

Esta versão tem testes automatizados do agente (inclusive um Tunnel simulado) e dos fluxos existentes. A instalação real no Windows e a permissão de loopback do navegador precisam ser testadas e aprovadas pelo mestre.
