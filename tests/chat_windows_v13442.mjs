import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';

const raiz=resolve(import.meta.dirname,'../src');
const nomeRelativo='hexatombe/ChatMesaPainel.tsx';
const armazenamento='hexatombe/historicoChatMesa.ts';
const app=readFileSync(join(raiz,'App.tsx'),'utf8');
const mesa3d=readFileSync(join(raiz,'mesa3d/Mesa3DPrototipo.tsx'),'utf8');
const componente=readFileSync(join(raiz,nomeRelativo),'utf8');

test('arquivos do chat têm nomes distintos no Windows e não conflitam com import sem extensão',()=>{
  const fontes=readdirSync(join(raiz,'hexatombe')).filter(n=>n.endsWith('.ts')||n.endsWith('.tsx'));
  const componentes=fontes.filter(n=>n.toLowerCase().replace(/\.(ts|tsx)$/,'')==='chatmesapainel');
  const armazenamentos=fontes.filter(n=>n.toLowerCase().replace(/\.(ts|tsx)$/,'')==='historicochatmesa');
  assert.deepEqual(componentes,['ChatMesaPainel.tsx']);
  assert.deepEqual(armazenamentos,['historicoChatMesa.ts']);
  assert.equal(existsSync(join(raiz,'hexatombe/ChatMesa.tsx')),false);
  assert.equal(existsSync(join(raiz,'hexatombe/chatMesa.ts')),false);
  assert.match(componente,/export default function ChatMesa\(/);
  assert.match(componente,/from '\.\/historicoChatMesa'/);
  assert.match(app,/import ChatMesa from '\.\/hexatombe\/ChatMesaPainel';/);
  assert.match(mesa3d,/import ChatMesa from '\.\.\/hexatombe\/ChatMesaPainel';/);
  assert.ok(existsSync(join(raiz,armazenamento)));
});

test('posicionamento do personagem verifica null antes de acessar o estado anterior',()=>{
  assert.match(app,/if\(anterior!==null&&anterior\.personagemId===p\.personagemId&&anterior\.visivel===p\.visivel&&/);
  assert.doesNotMatch(app,/if\(anterior\?\.personagemId===p\.personagemId&&anterior\.visivel/);
});
