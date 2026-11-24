/**
 * Portal do Mestre — auxiliar LOCAL e opcional para Windows.
 * Roda sem interface na porta 8790, somente em 127.0.0.1.
 * Nenhum dado da campanha e nenhum comando remoto arbitrário passam por este HTTP.
 * Apenas a origem HTTPS aprovada do Portal pode iniciar/parar os processos fixos.
 */
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PORTA_AUXILIAR = 8790;
export const PORTA_MULTIPLAYER = 8787;
export const PORTAL_PADRAO = 'https://portal-do-mestre.vercel.app';
const LOG = join(RAIZ, '.portal-multiplayer-sessoes', 'auxiliar-mestre.log');

export function origemPortalSegura(valor) {
  try {
    const url = new URL(String(valor).trim());
    if (url.protocol !== 'https:' || url.origin !== String(valor).trim() || url.username || url.password) return '';
    return url.origin;
  } catch { return ''; }
}
export function extrairTunnel(texto) {
  return String(texto).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/i)?.[0] || '';
}
export function permitirOrigem(origem, portal) {
  return Boolean(origem) && [portal, 'http://localhost:5173', 'http://127.0.0.1:5173'].includes(origem);
}
export function hostLocalValido(host, porta = PORTA_AUXILIAR) {
  return [`127.0.0.1:${porta}`, `localhost:${porta}`].includes(String(host || '').toLowerCase());
}
function registrar(texto) {
  const linha = `${new Date().toISOString()} ${String(texto).replace(/[\r\n]+/g, ' ').slice(0, 1200)}\n`;
  try { mkdirSync(dirname(LOG), { recursive: true }); appendFileSync(LOG, linha, 'utf8'); } catch { /* log auxiliar */ }
}
function lerPortal() {
  const arquivo = join(RAIZ, '.portal-vercel-origem.local');
  const valor = existsSync(arquivo) ? readFileSync(arquivo, 'utf8').trim() : PORTAL_PADRAO;
  const seguro = origemPortalSegura(valor);
  if (!seguro) throw new Error('Origem Vercel inválida. Configure o domínio com o arquivo 04_CONFIGURAR_VERCEL.bat.');
  return seguro;
}
export function localizarCloudflared(raiz = RAIZ, plataforma = process.platform) {
  for (const nome of ['cloudflared.exe', 'cloudflared-windows-amd64.exe', 'cloudflared']) {
    const arquivo = join(raiz, nome);
    if (existsSync(arquivo)) return arquivo;
  }
  const busca = spawnSync(plataforma === 'win32' ? 'where.exe' : 'which', [plataforma === 'win32' ? 'cloudflared.exe' : 'cloudflared'], { encoding: 'utf8', windowsHide: true });
  const caminho = busca.status === 0 ? busca.stdout?.trim().split(/\r?\n/)[0] : '';
  if (caminho) return caminho;
  throw new Error('Cloudflared não encontrado. Coloque cloudflared.exe na pasta do Portal (como antes).');
}
function portaLivre(porta) {
  return new Promise(resolvePorta => {
    const teste = createNetServer();
    teste.once('error', () => resolvePorta(false));
    teste.listen(porta, '127.0.0.1', () => teste.close(() => resolvePorta(true)));
  });
}
function esperarSaida(processo, detectar, tempoMs, nome) {
  return new Promise((ok, erro) => {
    let acumulado = '';
    let terminou = false;
    const limpar = () => {
      clearTimeout(relogio);
      processo.off('error', falha);
      processo.off('exit', saiu);
      processo.stdout?.off('data', receber);
      processo.stderr?.off('data', receber);
    };
    const resolver = (valor, causa) => {
      if (terminou) return;
      terminou = true;
      limpar();
      causa ? erro(causa) : ok(valor);
    };
    const receber = dados => {
      acumulado = (acumulado + String(dados)).slice(-8000);
      try { const valor = detectar(acumulado); if (valor) resolver(valor); }
      catch (e) { resolver(null, e); }
    };
    const falha = e => resolver(null, new Error(`${nome}: ${e.message}`));
    const saiu = codigo => resolver(null, new Error(`${nome} encerrou (código ${codigo ?? '?'}). ${acumulado.slice(-900)}`));
    const relogio = setTimeout(() => resolver(null, new Error(`Tempo esgotado ao iniciar ${nome}. ${acumulado.slice(-900)}`)), tempoMs);
    processo.on('error', falha);
    processo.on('exit', saiu);
    processo.stdout?.on('data', receber);
    processo.stderr?.on('data', receber);
  });
}

export function criarAuxiliar({ raiz = RAIZ, portaAuxiliar = PORTA_AUXILIAR, portaMultiplayer = PORTA_MULTIPLAYER, portal = lerPortal(), cloudflared = localizarCloudflared } = {}) {
  let estado = 'parado';
  let tunnel = '';
  let mensagem = 'Auxiliar pronto para iniciar a sessão.';
  let servidor = null;
  let processoTunnel = null;
  let interrompendo = false;
  let iniciando = null;
  let geracao = 0;
  let parando = null;
  let fechando = false;
  let encerramento = null;

  function status() { return { estado, tunnel, mensagem, encerramentoCompleto: true }; }
  async function terminarFilho(processo) {
    if (!processo || processo.exitCode !== null || processo.signalCode !== null || !processo.pid) return;
    const aguardar = ms => new Promise(ok => {
      if (processo.exitCode !== null || processo.signalCode !== null) { ok(true); return; }
      const saiu = () => { clearTimeout(timer); processo.off('exit', saiu); ok(true); };
      const timer = setTimeout(() => { processo.off('exit', saiu); ok(false); }, ms);
      processo.once('exit', saiu);
    });
    try { processo.kill(); } catch {}
    if (await aguardar(1500)) return;
    // Somente o filho criado por este auxiliar, nunca todos os processos Node.
    if (processo.exitCode === null && processo.signalCode === null) {
      try { processo.kill('SIGKILL'); } catch {}
    }
    if (!(await aguardar(1500))) throw new Error('Não foi possível confirmar o encerramento de um processo da sessão.');
  }
  function pararProcessos() {
    interrompendo = true;
    if (parando) return parando;
    const filhos = [processoTunnel, servidor];
    parando = Promise.allSettled(filhos.map(terminarFilho)).then(resultados => {
      if(resultados[0].status==='fulfilled' && processoTunnel===filhos[0]) processoTunnel=null;
      if(resultados[1].status==='fulfilled' && servidor===filhos[1]) servidor=null;
      const falha=resultados.find(r=>r.status==='rejected');
      if(falha)throw falha.reason;
    }).finally(()=>{parando=null;});
    return parando;
  }
  function falhaProcesso(nome, codigo, processo, versao) {
    if (versao !== geracao || interrompendo || estado === 'parado' || estado === 'erro') return;
    registrar(`${nome} saiu: ${codigo ?? '?'}`);
    mensagem = `${nome} foi encerrado inesperadamente. Confira o auxiliar no PC.`;
    estado = 'erro';
    tunnel = '';
    void pararProcessos().catch(e=>registrar(e.message));
  }
  async function iniciar() {
    if (fechando || parando || estado === 'pronto') return status();
    if (servidor || processoTunnel) { if(!iniciando) { estado='erro';mensagem='Encerre os processos anteriores antes de iniciar.';return status(); } }
    if (iniciando) return iniciando;
    interrompendo = false;
    const versao = ++geracao;
    estado = 'iniciando';
    mensagem = 'Iniciando servidor e Cloudflare Tunnel...';
    tunnel = '';
    iniciando = (async () => {
      try {
        if (!(await portaLivre(portaMultiplayer))) throw new Error(`Porta ${portaMultiplayer} ocupada. Feche o servidor antigo (arquivo 02) antes de iniciar pelo site.`);
        if (interrompendo || fechando || versao !== geracao) return status();
        const caminhoCloudflared = cloudflared(raiz);
        const ambiente = { ...process.env, PORTAL_ORIGENS_VERCEL: portal, PORTAL_MULTIPLAYER_PORT: String(portaMultiplayer), PORTAL_SERVIR_SITE: '0' };
        servidor = spawn(process.execPath, [join(raiz, 'scripts', 'multiplayer-server.mjs')], {
          cwd: raiz, env: ambiente, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
        });
        const processoServidor = servidor;
        servidor.once('exit', codigo => falhaProcesso('Servidor multiplayer', codigo, processoServidor, versao));
        await esperarSaida(servidor, saida => /Servidor local em http:\/\/127\.0\.0\.1:\d+/i.test(saida), 30_000, 'servidor');
        if (interrompendo || versao !== geracao) throw new Error('A inicialização foi interrompida.');
        processoTunnel = spawn(caminhoCloudflared, ['tunnel', '--url', `http://127.0.0.1:${portaMultiplayer}`, '--protocol', 'http2'], {
          cwd: raiz, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
        });
        const tunnelIniciado = processoTunnel;
        processoTunnel.once('exit', codigo => falhaProcesso('Cloudflare Tunnel', codigo, tunnelIniciado, versao));
        const novaUrl = await esperarSaida(processoTunnel, saida => {
          const endereco = extrairTunnel(saida);
          return endereco && /Registered tunnel connection|Connection registered/i.test(saida) ? endereco : '';
        }, 90_000, 'Cloudflare Tunnel');
        if (interrompendo || versao !== geracao) throw new Error('A inicialização foi interrompida.');
        tunnel = novaUrl;
        estado = 'pronto';
        mensagem = 'Servidor multiplayer conectado ao Cloudflare.';
        registrar('Sessão iniciada, túnel conectado.');
      } catch (e) {
        if (versao !== geracao) return status();
        const motivo = e instanceof Error ? e.message : String(e);
        estado = 'erro';
        mensagem = motivo;
        tunnel = '';
        registrar(`Falha ao iniciar: ${motivo}`);
        try { await pararProcessos(); } catch(falha) { mensagem += ' '+falha.message; }
      } finally { if (versao === geracao) iniciando = null; }
      return status();
    })();
    return iniciando;
  }
  async function parar() {
    interrompendo = true;
    ++geracao;
    iniciando = null;
    tunnel = '';
    try {
      await pararProcessos();
      estado = 'parado';
      mensagem = 'Servidor e túnel desligados. Auxiliar disponível para outra sessão.';
      registrar('Sessão parada manualmente.');
    } catch(e) { estado='erro'; mensagem=e.message; registrar(mensagem); }
    return status();
  }

  const httpServer = http.createServer((req, res) => {
    const origem = req.headers.origin || '';
    const host = req.headers.host || '';
    const enderecoRemoto = req.socket.remoteAddress || '';
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(enderecoRemoto);
    if (!local || !hostLocalValido(host, portaAuxiliar) || !permitirOrigem(origem, portal)) {
      res.writeHead(403, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end('{"erro":"Origem não autorizada"}');
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origem);
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin, Access-Control-Request-Private-Network');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    const caminho = new URL(req.url || '/', 'http://127.0.0.1').pathname;
    if (caminho === '/v1/status' && req.method === 'GET') { res.end(JSON.stringify(status())); return; }
    if (req.method === 'POST' && req.headers['content-type']?.split(';')[0]?.trim() === 'application/json') {
      if (caminho === '/v1/start') {
        void iniciar();
        res.end(JSON.stringify(status()));
        return;
      }
      if (caminho === '/v1/stop') {
        void parar().then(retorno=>res.end(JSON.stringify(retorno)));
        return;
      }
      if (caminho === '/v1/shutdown') {
        fechando = true;
        void parar().then(retorno=>{
          if(retorno.estado==='erro'){fechando=false;res.writeHead(500);res.end(JSON.stringify(retorno));return;}
          res.setHeader('Connection','close');
          res.end(JSON.stringify({...retorno,mensagem:'Auxiliar encerrado completamente.'}),()=>{void fechar().catch(e=>registrar(e.message));});
        });
        return;
      }
    }
    res.writeHead(404);
    res.end('{"erro":"Rota não disponível"}');
  });
  async function escutar() {
    return new Promise((resolveEscuta, rejeitar) => {
      httpServer.once('error', rejeitar);
      httpServer.listen(portaAuxiliar, '127.0.0.1', () => {
        httpServer.off('error', rejeitar);
        registrar(`Auxiliar ativo em 127.0.0.1:${portaAuxiliar}`);
        resolveEscuta();
      });
    });
  }
  function fechar() {
    if(encerramento)return encerramento;
    fechando=true;
    encerramento=(async()=>{
      const retorno=await parar();
      if(retorno.estado==='erro'){fechando=false;throw new Error(retorno.mensagem);}
      await new Promise(resolver => {httpServer.close(()=>resolver());httpServer.closeIdleConnections?.();});
      registrar('Auxiliar encerrado completamente.');
    })().catch(e=>{encerramento=null;throw e;});
    return encerramento;
  }
  return { escutar, fechar, iniciar, parar, status, httpServer };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let auxiliar;
  try {
    auxiliar = criarAuxiliar();
    await auxiliar.escutar();
    // Por padrão o processo fica apenas aguardando; iniciar sessão é uma ação do usuário no Portal.
    if (process.argv[2]?.toLowerCase().startsWith('portalmestre://iniciar')) void auxiliar.iniciar();
    for (const sinal of ['SIGINT', 'SIGTERM']) process.once(sinal, () => void auxiliar.fechar().then(() => process.exit(0)).catch(e=>registrar(e.message)));
  } catch (e) {
    registrar(`Falha no auxiliar: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}
