# Portal do Mestre

Portal virtual para mesas de RPG, com mesas 2D e 3D, personagens, inventário, fichas, diário, música, chat e multiplayer de convidados.

**Versão de referência:** v29.15.30.26 — hospedagem comunitária pelo PC do mestre. Projeto pessoal de portfólio.

## Para jogar ou mestrar

**Jogadores:** abrem somente o link de convite enviado pelo mestre. Não instalam nada.

**Mestres:** criam campanhas e mesas em https://portal-do-mestre.vercel.app. Para disponibilizar sessões multiplayer pela internet, devem instalar uma única vez o **Auxiliar do Mestre** no próprio Windows. O site inicia o servidor e o Cloudflare Tunnel pelo botão Multiplayer; o PC do mestre precisa permanecer ligado.

- **[Baixar o Auxiliar do Mestre (.zip)](https://portal-do-mestre.vercel.app/downloads/auxiliar-do-mestre-windows.zip)**
- **[Tutorial no próprio Portal](https://portal-do-mestre.vercel.app/como-hospedar.html)**
- **[Guia de instalação para outros mestres](GUIA_HOSPEDAGEM_PUBLICA_WINDOWS.md)**

O kit inclui os scripts de hospedagem, sem o frontend React completo. **Node.js LTS 22+ e cloudflared são dependências separadas**, obtidas das fontes oficiais. Cada mesa hospedada localmente não consome capacidade de um servidor multiplayer central pago. O Quick Tunnel tem limitações e exige internet no PC do mestre.

**Privacidade:** a campanha é armazenada no navegador do mestre e as sessões podem gerar dados locais no computador dele; nenhuma campanha é enviada ao GitHub pelo instalador. Faça backups.

## Organização

- `src/`: aplicação React/TypeScript, componentes e lógica do Portal.
- `public/`: imagens, ícones, dados e recursos estáticos utilizados pelo site.
- `scripts/`: servidor de sessão, integração Cloudflare e testes.
- `tests/`, `_tests/`, `testes/`: verificações automatizadas e ferramentas de homologação.
- `*.config.*`, `package*.json`, `vercel.json`: configurações de compilação/publicação.
- `scripts/auxiliar-mestre/`: auxiliar Windows, instalador e gerador do kit de hospedagem.

Os relatórios antigos de desenvolvimento foram **separados deste repositório**, sem apagar seu histórico. O pacote de arquivo histórico é independente.

## Executar localmente

Requer Node.js compatível com as dependências instaladas pelo npm.

```bash
npm install
npm run dev
```

Para simular o servidor multiplayer na sua rede, use os scripts existentes definidos em `package.json`.

## Hospedagem multiplayer

Para um mestre que ainda não tem o projeto em seu computador, o caminho recomendado é o **kit compacto no site**, acompanhado do tutorial e do guia. O instalador funciona somente no Windows; os jogadores não o utilizam.

Para desenvolvimento, o servidor continua disponível como `npm run server:multiplayer`. A hospedagem anterior pelo Tunnel ou pelo auxiliar já instalado no seu PC continua compatível; **não execute dois servidores na porta 8787 ao mesmo tempo**.

O arquivo para download é produzido durante `npm run cloudflare:build` por `scripts/gerar-kit-publico.mjs`, diretamente das fontes versionadas. Ele é publicado pela Vercel em `/downloads/auxiliar-do-mestre-windows.zip` (não contém executáveis de terceiros).

## Publicação na Vercel

Configurações incluídas em `vercel.json`:

- Framework: **Vite**
- Build Command: `npm run cloudflare:build`
- Output Directory: `dist`
- Root Directory: pasta que contém `package.json`

O kit público autoriza o domínio oficial da Vercel. Instalações personalizadas devem configurar sua própria origem autorizada; consulte `GUIA_v29_15_30_23_VERCEL_PUBLICACAO.md` para os detalhes técnicos.

**Arquitetura atual:** Vercel serve o frontend estático; Cloudflare Tunnel expõe o servidor multiplayer executado no computador do mestre. A Vercel **não** hospeda o servidor de sessão persistente dessa versão.

## Dados e segurança

As campanhas/bibliotecas ficam no armazenamento local de cada navegador (IndexedDB/localStorage), com backup manual. Não há sincronização automática entre computadores; mudar do endereço local para o da Vercel exige importar um backup uma vez. **Guarde os backups fora da pasta do código.**

Nunca envie ao GitHub: `.env*`, `.portal-multiplayer-sessoes/`, `.portal-vercel-origem.local`, `node_modules/`, `dist/`, backups, credenciais ou arquivos de sessão. Este repositório inclui `.gitignore` e `.vercelignore` para ajudar a protegê-los.

## Testes

Os comandos de testes estão em `package.json`; por exemplo:

```bash
npm run test:musica
npm run test:vercel
npm run test:auxiliar-mestre
```

Uma publicação pela Vercel e uma sessão real (mestre + convidados) devem ser verificadas antes de considerar o site publicado e o multiplayer homologados no novo domínio.
