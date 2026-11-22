/**
 * Iniciador unico para hospedar o Portal do Mestre no PC (Windows).
 * Mantem o frontend na Vercel; Node e Cloudflare Quick Tunnel ficam neste PC.
 * Nao envia tokens, backups ou campanhas para Vercel/GitHub.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const URL_VERCEL_PADRAO = 'https://portal-do-mestre.vercel.app';
const PORTA = 8787;
const FILHOS = new Set();
let encerrando = false;

export function validarOrigemPortal(valor) {
  try {
    const url = new URL(String(valor).trim());
    if (url.protocol !== 'https:' || url.origin !== String(valor).trim() || url.username || url.password) return '';
    return url.origin;
  } catch { return ''; }
}

export function extrairUrlTunnel(texto) {
  const encontrada = String(texto).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/i);
  return encontrada ? encontrada[0] : '';
}

export function criarUrlPortal(origemPortal, origemTunnel) {
  const portal = validarOrigemPortal(origemPortal);
  const tunnel = extrairUrlTunnel(origemTunnel);
  if (!portal || !tunnel) throw new Error('Endereco do Portal ou do Tunnel invalido.');
  const url = new URL('/', portal);
  url.searchParams.set('servidor', tunnel);
  return url.toString();
}

function fecharFilhos() {
  if (encerrando) return;
  encerrando = true;
  for (const processo of [...FILHOS].reverse()) {
    try { if (processo && !processo.killed) processo.kill(); } catch { /* Ja encerrado. */ }
  }
  FILHOS.clear();
}

function erro(mensagem) { throw new Error(mensagem); }

function validarConfiguracao() {
  const arquivo = join(RAIZ, '.portal-vercel-origem.local');
  if (!existsSync(arquivo)) {
    writeFileSync(arquivo, `${URL_VERCEL_PADRAO}\n`, 'utf8');
    console.log(`[Configuracao] Domínio autorizado: ${URL_VERCEL_PADRAO}`);
  }
  const portal = validarOrigemPortal(readFileSync(arquivo, 'utf8').trim());
  if (!portal) erro('A configuracao .portal-vercel-origem.local e invalida. Execute 04_CONFIGURAR_VERCEL.bat.');
  return portal;
}

function localizarCloudflared() {
  for (const arquivo of ['cloudflared.exe', 'cloudflared-windows-amd64.exe']) {
    const caminho = join(RAIZ, arquivo);
    if (existsSync(caminho)) return caminho;
  }
  const comando = process.platform === 'win32' ? 'where.exe' : 'which';
  const busca = spawnSync(comando, [process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared'], { encoding: 'utf8', windowsHide: true });
  if (busca.status === 0 && busca.stdout?.trim()) return busca.stdout.trim().split(/\r?\n/)[0];
  erro('Cloudflared nao encontrado. Copie cloudflared.exe para a pasta do Portal ou adicione-o ao PATH.');
}

async function portaDisponivel(porta) {
  return new Promise(resolveResultado => {
    const verificador = createServer();
    verificador.once('error', () => resolveResultado(false));
    verificador.listen(porta, '127.0.0.1', () => verificador.close(() => resolveResultado(true)));
  });
}

function executarComandoNpm(comando) {
  console.log(`[Preparacao] ${comando}`);
  // No Windows, o npm usa npm.cmd, que deve ser executado pelo cmd.exe.
  const executavel = process.platform === 'win32' ? 'cmd.exe' : 'sh';
  const argumentos = process.platform === 'win32'
    ? ['/d', '/s', '/c', comando]
    : ['-c', comando];
  const saida = spawnSync(executavel, argumentos, { cwd: RAIZ, stdio: 'inherit', windowsHide: false });
  if (saida.error || saida.status !== 0) erro(`Comando falhou: ${comando}`);
}

function garantirDist() {
  if (existsSync(join(RAIZ, 'dist', 'index.html'))) return;
  console.log('[Primeiro uso] O site local ainda nao foi compilado. Preparando os arquivos do servidor...');
  if (!existsSync(join(RAIZ, 'node_modules', 'vite'))) executarComandoNpm('npm ci');
  executarComandoNpm('npm run cloudflare:build');
  if (!existsSync(join(RAIZ, 'dist', 'index.html'))) erro('A compilacao nao gerou dist/index.html.');
}

function iniciarProcesso(arquivo, argumentos, rotulo) {
  const processo = spawn(arquivo, argumentos, {
    cwd: RAIZ,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: { ...process.env, PORTAL_MULTIPLAYER_PORT: String(PORTA) },
  });
  FILHOS.add(processo);
  processo.on('exit', () => FILHOS.delete(processo));
  processo.on('error', () => FILHOS.delete(processo));
  // Repassa as mensagens mais importantes ao console, sem abrir outras janelas.
  processo.stdout.setEncoding('utf8');
  processo.stderr.setEncoding('utf8');
  console.log(`[${rotulo}] Iniciando...`);
  return processo;
}

function acompanhar(processo, rotulo, timeoutMs) {
  return new Promise((resolvePronto, rejeitar) => {
    let acumulado = '';
    let concluido = false;
    let urlConhecida = '';
    const finalizar = (resultado, falha) => {
      if (concluido) return;
      concluido = true;
      clearTimeout(limite);
      processo.off('exit', saiu);
      processo.off('error', falhou);
      if (falha) rejeitar(falha); else resolvePronto(resultado);
    };
    const receber = texto => {
      acumulado = (acumulado + String(texto)).slice(-96_000);
      // Em Quick Tunnel, a URL e o registro da conexao chegam por stderr.
      const achada = extrairUrlTunnel(acumulado);
      if (achada && !urlConhecida) {
        urlConhecida = achada;
        console.log(`[${rotulo}] Link encontrado: ${achada}`);
      }
      if (rotulo === 'Servidor' && /Servidor local em http:\/\/127\.0\.0\.1:8787/i.test(acumulado)) {
        finalizar(true);
      }
      if (rotulo === 'Cloudflare' && urlConhecida && /Registered tunnel connection|Connection registered/i.test(acumulado)) {
        finalizar(urlConhecida);
      }
    };
    const saiu = codigo => finalizar(null, new Error(`${rotulo} encerrou inesperadamente (codigo ${codigo ?? '?'}). ${acumulado.slice(-2000)}`));
    const falhou = causa => finalizar(null, new Error(`Falha ao iniciar ${rotulo}: ${causa.message}`));
    const limite = setTimeout(() => finalizar(null, new Error(`${rotulo} nao confirmou a inicializacao. ${acumulado.slice(-2000)}`)), timeoutMs);
    processo.stdout.on('data', receber);
    processo.stderr.on('data', receber);
    processo.once('exit', saiu);
    processo.once('error', falhou);
  });
}

function abrirNavegador(url) {
  if (process.platform === 'win32') {
    // Sem cmd /c start: preserva os % da URL codificada e evita interpretacao de &.
    const navegador = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
      detached: true, windowsHide: true, stdio: 'ignore',
    });
    navegador.on('error', e => console.warn(`[Portal] Nao foi possivel abrir o navegador: ${e.message}`));
    navegador.unref();
    return;
  }
  console.log('[Portal] Abra a URL acima no navegador.');
}

async function executar() {
  process.chdir(RAIZ);
  console.log('===========================================');
  console.log('       PORTAL DO MESTRE - SESSAO ONLINE     ');
  console.log('===========================================');
  const portal = validarConfiguracao();
  const cloudflared = localizarCloudflared();
  if (!(await portaDisponivel(PORTA))) erro('A porta 8787 ja esta ocupada. Feche o servidor antigo (arquivo 02) antes de iniciar a sessao unificada.');
  garantirDist();
  const servidor = iniciarProcesso(process.execPath, ['scripts/iniciar-cloudflare.mjs'], 'Servidor');
  await acompanhar(servidor, 'Servidor', 30_000);
  const tunnel = iniciarProcesso(cloudflared, ['tunnel', '--url', `http://127.0.0.1:${PORTA}`, '--protocol', 'http2'], 'Cloudflare');
  const endereco = await acompanhar(tunnel, 'Cloudflare', 90_000);
  const acesso = criarUrlPortal(portal, endereco);
  console.log('\n[PRONTO] Servidor e Cloudflare conectados!');
  console.log(`[SERVIDOR] ${endereco}`);
  console.log(`[PORTAL]   ${acesso}`);
  console.log('\nO navegador abrira o Portal com o servidor salvo automaticamente.');
  console.log('Depois abra sua campanha e clique em Iniciar sala multiplayer.');
  console.log('Os jogadores entram pelo link de convite gerado DENTRO do Portal.');
  abrirNavegador(acesso);
  // Se algum processo cair durante a sessao, encerra o outro tambem.
  for (const [processo, nome] of [[servidor, 'Servidor'], [tunnel, 'Cloudflare']]) {
    processo.once('exit', codigo => {
      if (encerrando) return;
      console.error(`\n[ERRO] ${nome} encerrou durante a sessao (codigo ${codigo ?? '?'}).`);
      fecharFilhos();
      process.exit(1);
    });
  }
  const leitura = createInterface({ input: process.stdin, output: process.stdout });
  try { await leitura.question('\nPressione ENTER para encerrar a sessao e desligar o Tunnel...\n'); }
  finally { leitura.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const sinal of ['SIGINT', 'SIGTERM']) {
    process.once(sinal, () => { fecharFilhos(); process.exit(0); });
  }
  try { await executar(); }
  catch (e) { console.error(`\n[ERRO] ${e instanceof Error ? e.message : String(e)}`); process.exitCode = 1; }
  finally { fecharFilhos(); }
}
