/** Correção v29.15.30.25.1: Tunnel dinâmico + credencial do mestre na origem correta.
 * Execute na raiz do projeto: node CORRIGIR_RECONEXAO.mjs
 * Não envia dados à internet e não altera backups, senhas ou campanhas.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = process.cwd();
const apiPath = resolve(raiz, 'src/multiplayer/api.ts');
const mestrePath = resolve(raiz, 'src/multiplayer/MultiplayerMestre.tsx');
if (!existsSync(apiPath) || !existsSync(mestrePath)) {
  console.error('Erro: abra o terminal na pasta do Portal do Mestre (onde fica package.json).');
  process.exit(1);
}
const apiOriginal = readFileSync(apiPath, 'utf8');
const mestreOriginal = readFileSync(mestrePath, 'utf8');

const raizCongelada = /^\s*const\s+raiz\s*=\s*raizServidorMultiplayer\(\);\s*\r?\n/m;
const definirSala = /^([^\r\n]*\bexport\s+const\s+urlSala\s*=\s*[^\r\n]*);\s*$/m;
let apiNovo = apiOriginal;
const linhaSala = apiOriginal.match(definirSala)?.[0];
if (!linhaSala) throw new Error('Não encontrei a definição de urlSala. Nenhum arquivo foi alterado.');
if (linhaSala.includes('${raiz}') && raizCongelada.test(apiOriginal)) {
  apiNovo = apiNovo.replace(raizCongelada, '\n');
  apiNovo = apiNovo.replace(definirSala, (linha) => linha.replace('${raiz}', '${raizServidorMultiplayer()}'));
} else if (!linhaSala.includes('${raizServidorMultiplayer()}')) {
  throw new Error('A estrutura de urlSala é diferente do esperado. Nenhum arquivo foi alterado.');
}
if (/^\s*const\s+raiz\s*=\s*raizServidorMultiplayer\(\);/m.test(apiNovo) ||
    !/export\s+const\s+urlSala\s*=\s*[^\r\n]*\$\{raizServidorMultiplayer\(\)\}/m.test(apiNovo)) {
  throw new Error('Verificação da URL dinâmica falhou. Nenhum arquivo foi alterado.');
}

let mestreNovo = mestreOriginal;
if (mestreNovo.includes('salvarCredencial(chave,nova)')) {
  mestreNovo = mestreNovo.replace('salvarCredencial(chave,nova)', 'salvarCredencial(chaveMestre(campanhaId),nova)');
} else if (!mestreNovo.includes('salvarCredencial(chaveMestre(campanhaId),nova)')) {
  throw new Error('Não encontrei a gravação da credencial. Nenhum arquivo foi alterado.');
}
if (mestreNovo.includes('salvarCredencial(chave,nova)')) {
  throw new Error('Verificação da credencial falhou. Nenhum arquivo foi alterado.');
}
if (apiNovo !== apiOriginal) writeFileSync(apiPath, apiNovo, 'utf8');
if (mestreNovo !== mestreOriginal) writeFileSync(mestrePath, mestreNovo, 'utf8');
console.log('Correção de reconexão aplicada com sucesso (v29.15.30.25.1).');
console.log('- API da sala: lê o Tunnel atual em cada conexão.');
console.log('- Credencial do mestre: salva com a origem atualizada.');
console.log('Próximo: node --test scripts/multiplayer-reconexao-v29-15-30-25-1.test.mjs');
