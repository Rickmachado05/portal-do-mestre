# Portal do Mestre

Portal virtual para mesas de RPG, com mesas 2D e 3D, personagens, inventário, fichas, diário, música, chat e multiplayer de convidados.

**Versão de referência:** v29.15.30.25 (auxiliar local para iniciar o multiplayer pelo botão da Vercel). Projeto pessoal de portfólio.

## Organização

- `src/`: aplicação React/TypeScript, componentes e lógica do Portal.
- `public/`: imagens, ícones, dados e recursos estáticos utilizados pelo site.
- `scripts/`: servidor de sessão, integração Cloudflare e testes.
- `tests/`, `_tests/`, `testes/`: verificações automatizadas e ferramentas de homologação.
- `*.config.*`, `package*.json`, `vercel.json`: configurações de compilação/publicação.
- `0*.bat`: iniciadores para uso local no Windows.

Os relatórios antigos de desenvolvimento foram **separados deste repositório**, sem apagar seu histórico. O pacote de arquivo histórico é independente.

## Executar localmente

Requer Node.js compatível com as dependências instaladas pelo npm.

```bash
npm install
npm run dev
```

Para simular o servidor multiplayer na sua rede, use os scripts existentes definidos em `package.json`.

## Iniciar multiplayer pelo Portal (preferencial: v29.15.30.25)

No PC do mestre, execute uma única vez `INSTALAR_AUXILIAR_DO_MESTRE.ps1` conforme as instruções de `GUIA_v29_15_30_25_AUXILIAR_NO_WINDOWS.md`. Isso instala um auxiliar para este usuário do Windows; **o Tunnel não é iniciado automaticamente no login**. Depois, abra o Portal na Vercel e clique em **Iniciar sala multiplayer**. O auxiliar inicia Node, Cloudflare e entrega a URL ao navegador para gerar o convite. Se solicitado, autorize o acesso do site a aplicativos na própria máquina (loopback) no navegador.

O método antigo com `.bat` continua disponível como alternativa. O auxiliar não deve rodar simultaneamente com o servidor iniciado pelo `02` ou pelo iniciador unificado anterior, pois ambos usam a mesma porta 8787.

## Sessão pública via Cloudflare Tunnel (PC do mestre)

No Windows, use os iniciadores na seguinte ordem:

1. `01_COMPILAR_PORTAL_CLOUDFLARE.bat`
2. `02_INICIAR_SERVIDOR_CLOUDFLARE.bat`
3. `03_ABRIR_TUNNEL_GRATUITO.bat`

O executável `cloudflared.exe` **não faz parte deste repositório**. Instale-o separadamente com a distribuição oficial da Cloudflare ou deixe-o na pasta do Portal. Em redes com bloqueio UDP, pode ser necessário usar `--protocol http2` (o iniciador já foi ajustado para essa possibilidade).

O servidor local utiliza `http://127.0.0.1:8787` por padrão. Mantenha as janelas do servidor e do túnel abertas durante a sessão.

## Publicação na Vercel

Configurações incluídas em `vercel.json`:

- Framework: **Vite**
- Build Command: `npm run cloudflare:build`
- Output Directory: `dist`
- Root Directory: pasta que contém `package.json`

Depois de publicar, execute `04_CONFIGURAR_VERCEL.bat` no PC do mestre para autorizar o domínio do frontend no servidor local. Consulte `GUIA_v29_15_30_23_VERCEL_PUBLICACAO.md` para o fluxo completo de convites e conexão ao Tunnel.

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
