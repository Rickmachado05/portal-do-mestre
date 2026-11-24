import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer as netServer } from 'node:net';
import {
  criarAuxiliar, permitirOrigem, hostLocalValido, origemPortalSegura, extrairTunnel, RAIZ,
} from './auxiliar-mestre.mjs';

const portal = 'https://portal-do-mestre.vercel.app';

async function portaAleatoria() {
  return new Promise((ok, reject) => {
    const s = netServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const porta = s.address().port;
      s.close(() => ok(porta));
    });
  });
}
function pedir(url, metodo = 'GET', origemCabecalho = portal) {
  return fetch(url, {
    method: metodo,
    headers: { Origin: origemCabecalho, ...(metodo === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    ...(metodo === 'POST' ? { body: '{}' } : {}),
  });
}

test('auxiliar só admite a origem configurada e a sua porta em loopback', () => {
  assert.equal(origemPortalSegura(portal), portal);
  assert.equal(origemPortalSegura('https://evil.example/path'), '');
  assert.equal(origemPortalSegura('http://portal-do-mestre.vercel.app'), '');
  assert.equal(permitirOrigem(portal, portal), true);
  assert.equal(permitirOrigem('https://site-estranho.example', portal), false);
  assert.equal(hostLocalValido('127.0.0.1:8790'), true);
  assert.equal(hostLocalValido('site-estranho.example:8790'), false);
  assert.equal(extrairTunnel('Seu Tunnel: https://abc-def.trycloudflare.com'), 'https://abc-def.trycloudflare.com');
});

test('não permite iniciar servidor por origem não autorizada ou via GET', async () => {
  const porta = await portaAleatoria();
  const agente = criarAuxiliar({ portaAuxiliar: porta, portal, cloudflared: () => { throw new Error('não deveria iniciar'); } });
  await agente.escutar();
  try {
    const url = `http://127.0.0.1:${porta}`;
    const forbidden = await pedir(`${url}/v1/start`, 'POST', 'https://malicioso.example');
    assert.equal(forbidden.status, 403);
    const preflight = await fetch(`${url}/v1/start`, { method: 'OPTIONS', headers: { Origin: portal, 'Access-Control-Request-Private-Network': 'true' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), portal);
    assert.equal(preflight.headers.get('access-control-allow-private-network'), 'true');
    const get = await pedir(`${url}/v1/start`);
    assert.equal(get.status, 404);
    const status = await pedir(`${url}/v1/status`);
    assert.equal((await status.json()).estado, 'parado');
  } finally { await agente.fechar(); }
});

test('inicia Node + Cloudflare, detecta link e encerra também o auxiliar ao desligar', { skip: process.platform === 'win32' ? 'Fixture com shebang POSIX; instalação Windows requer homologação manual' : false }, async () => {
  const diretorio = mkdtempSync(join(tmpdir(), 'portal-auxiliar-test-'));
  const fake = join(diretorio, 'cloudflared');
  const tunnel = 'https://abc-def-ghi.trycloudflare.com';
  writeFileSync(fake, `#!/usr/bin/env node\nprocess.stderr.write('Quick Tunnel: ${tunnel}\\nRegistered tunnel connection connIndex=0\\n');setInterval(()=>{},1000);\n`);
  chmodSync(fake, 0o755);
  const porta = await portaAleatoria();
  const multiplayer = await portaAleatoria();
  const agente = criarAuxiliar({ raiz: RAIZ, portaAuxiliar: porta, portaMultiplayer: multiplayer, portal, cloudflared: () => fake });
  await agente.escutar();
  try {
    const url = `http://127.0.0.1:${porta}`;
    const start = await pedir(`${url}/v1/start`, 'POST');
    assert.equal(start.status, 200);
    for (let i = 0; i < 65; i++) {
      const resposta = await pedir(`${url}/v1/status`);
      const estado = await resposta.json();
      if (estado.estado === 'pronto') {
        assert.equal(estado.tunnel, tunnel);
        break;
      }
      if (estado.estado === 'erro') assert.fail(estado.mensagem);
      if (i === 64) assert.fail('O auxiliar não encontrou o túnel');
      await new Promise(r => setTimeout(r, 120));
    }
    const stop = await pedir(`${url}/v1/stop`, 'POST');
    assert.equal((await stop.json()).estado, 'parado');
    for(let i=0;i<50&&agente.httpServer.listening;i++)await new Promise(r=>setTimeout(r,20));
    assert.equal(agente.httpServer.listening,false);
    await assert.rejects(()=>pedir(`${url}/v1/status`));
    assert.equal(agente.status().tunnel,'');
    const testePorta=netServer();await new Promise((ok,reject)=>{testePorta.once('error',reject);testePorta.listen(multiplayer,'127.0.0.1',ok);});await new Promise(ok=>testePorta.close(ok));
  } finally {
    await agente.fechar();
    rmSync(diretorio, { recursive: true, force: true });
  }
});

test('recusa iniciar se o servidor antigo ocupa a porta e preserva o estado controlável', async () => {
  const porta = await portaAleatoria();
  const multiplayer = await portaAleatoria();
  const ocupante = netServer();
  await new Promise((ok, reject) => { ocupante.once('error', reject); ocupante.listen(multiplayer, '127.0.0.1', ok); });
  const agente = criarAuxiliar({ raiz: RAIZ, portaAuxiliar: porta, portaMultiplayer: multiplayer, portal, cloudflared: () => { throw new Error('não deve chegar ao tunnel'); } });
  await agente.escutar();
  try {
    const retorno = await agente.iniciar();
    assert.equal(retorno.estado, 'erro');
    assert.match(retorno.mensagem, /ocupada/);
    const desligado = await agente.parar();
    assert.equal(desligado.estado, 'parado');
  } finally {
    await agente.fechar();
    await new Promise(ok => ocupante.close(ok));
  }
});

test('instalador verifica o processo e o Portal diferencia bloqueio local de instalacao', () => {
  const install = readFileSync(join(RAIZ, 'INSTALAR_AUXILIAR_DO_MESTRE.ps1'), 'utf8');
  const painel = readFileSync(join(RAIZ, 'src', 'multiplayer', 'MultiplayerMestre.tsx'), 'utf8');
  const ponte = readFileSync(join(RAIZ, 'src', 'multiplayer', 'auxiliarMestre.ts'), 'utf8');
  assert.match(install, /Invoke-RestMethod/);
  assert.match(install, /127\.0\.0\.1:8790\/v1\/status/);
  assert.match(painel, /statusAuxiliarMestre\(\)/);
  assert.match(painel, /Verificar auxiliar/);
  assert.match(ponte, /targetAddressSpace:\s*'loopback'/);
  assert.match(ponte, /explicarFalhaAuxiliar/);
});

test('shutdown completo fecha a porta local, inclusive sem iniciar sessão',async()=>{
 const porta=await portaAleatoria(),agente=criarAuxiliar({portaAuxiliar:porta,portal});
 await agente.escutar();const url='http://127.0.0.1:'+porta;
 try{
 assert.equal((await pedir(url+'/v1/shutdown','POST','https://malicioso.example')).status,403);
 assert.equal((await pedir(url+'/v1/shutdown')).status,404);
 const resposta=await pedir(url+'/v1/shutdown','POST');assert.equal(resposta.status,200);
 assert.equal((await resposta.json()).encerramentoCompleto,true);
 for(let i=0;i<50&&agente.httpServer.listening;i++)await new Promise(r=>setTimeout(r,20));
 assert.equal(agente.httpServer.listening,false);
 await assert.rejects(()=>pedir(url+'/v1/status'));
 }finally{await agente.fechar();}
});

test('controle principal encerra sala e auxiliar em uma única operação',()=>{
 const painel=readFileSync(join(RAIZ,'src','multiplayer','MultiplayerMestre.tsx'),'utf8');
 assert.match(painel,/await solicitar\(\x60\$\{urlSala\(ativa.codigo\)\}\/encerrar/);
 assert.match(painel,/await pararSessaoPeloAuxiliar\(\)/);
 assert.match(painel,/auxiliarOrigem:tunnel|auxiliarOrigem=tunnel/);
 assert.doesNotMatch(painel,/onClick=\{\(\)=>void encerrar\(\)\}/);
});

test('iniciar sala abre o auxiliar por gesto direto e apresenta lembrete de encerramento',()=>{
 const painel=readFileSync(join(RAIZ,'src','multiplayer','MultiplayerMestre.tsx'),'utf8');
 const ponte=readFileSync(join(RAIZ,'src','multiplayer','auxiliarMestre.ts'),'utf8');
 const criar=painel.slice(painel.indexOf('async function criar(manual=false)'),painel.indexOf('function limparSalaEncerrada()'));
 assert.ok(criar.indexOf('abrirAuxiliarInstalado();')>=0);
 assert.ok(criar.indexOf('abrirAuxiliarInstalado();')<criar.indexOf('await aguardarAuxiliarMestre()'));
 assert.ok(criar.indexOf('await aguardarAuxiliarMestre()')<criar.indexOf('await iniciarSessaoPeloAuxiliar'));
 assert.match(ponte,/tempoMaximo = 25000/);
 assert.match(painel,/Fechar esta página, aba ou navegador não desliga/);
 assert.match(painel,/Desligar servidor e auxiliar/);
});

test('endereco antigo nao bloqueia abertura automatica e modo manual e explicito',()=>{
 const painel=readFileSync(join(RAIZ,'src','multiplayer','MultiplayerMestre.tsx'),'utf8');
 assert.match(painel,/const abrirAgora=usaAuxiliar&&!auxiliar;/);
 assert.match(painel,/const usaAuxiliar=!manual && suportaAuxiliarMestre/);
 assert.match(painel,/onClick=\{\(\)=>void criar\(true\)\}/);
 assert.doesNotMatch(painel,/const abrirAgora=[^;]*origemServidorMultiplayer/);
});

test('painel compacto preserva o modo manual apenas nas opções avançadas',()=>{
 const painel=readFileSync(join(RAIZ,'src','multiplayer','MultiplayerMestre.tsx'),'utf8');
 const avancado=painel.slice(painel.indexOf('<details className="pm-mp-avancado">'),painel.indexOf('</details>',painel.indexOf('<details className="pm-mp-avancado">')));
 assert.match(avancado,/Iniciar sala com servidor manual/);
 assert.match(avancado,/Verificar auxiliar/);
 assert.doesNotMatch(painel,/Abrir auxiliar instalado no Windows|Salvar endereço do servidor|Firefox ou Edge|Sala de teste/);
 assert.match(painel,/navegador de preferência/);
});
