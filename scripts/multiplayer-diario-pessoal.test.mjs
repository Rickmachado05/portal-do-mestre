import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const fonte=(rel)=>readFileSync(new URL(rel,import.meta.url),'utf8');
const diario=fonte('../src/multiplayer/DiarioConvidado.tsx');
const biblioteca=fonte('../src/hexatombe/DiarioCampanha.tsx');
const tela=fonte('../src/multiplayer/MesaConvidado2D.tsx');
const entrada=fonte('../src/multiplayer/Convidado.tsx');
const armazenamento=fonte('../src/multiplayer/diarioLocalJogador.ts');

test('convidado entra direto na mesa e sai pelo cabeçalho, sem painel de participantes',()=>{
  assert.match(entrada,/if\(credencial\)\{\s*return <MesaConvidado2D/);
  assert.doesNotMatch(entrada,/setMesaCompleta|setAba\(|Sala \/ Participantes/);
  assert.match(tela,/onClick=\{onSair\} className="pm-jogo-sair">Sair da sala/);
  assert.doesNotMatch(tela,/>Participantes</);
});
test('Diário do convidado fica na esquerda e oferece Meu conteúdo e Compartilhado comigo',()=>{
  assert.match(tela,/className="atalhos-esquerda pm-jogo-atalhos-esquerda"/);
  assert.ok(tela.indexOf("abrir('chat')")<tela.indexOf("abrir('diario')"));
  assert.match(diario,/>◈ Meu conteúdo</);
  assert.match(diario,/>⇄ Compartilhado comigo</);
  assert.match(diario,/<DiarioCampanha pessoalJogador compacto/);
  assert.match(diario,/secao==='compartilhados'&&ativa&&createPortal/);
  assert.match(biblioteca,/pessoalJogador\?'Anotação salva neste navegador/);
  assert.match(biblioteca,/dono&&<button type="button" role="tab" aria-selected=\{modo==='compartilhar'\}/);
});
test('Diário privado é persistido localmente por identidade e não integra a campanha do mestre',()=>{
  assert.match(armazenamento,/indexedDB\.open\(BANCO,1\)/);
  assert.match(armazenamento,/campanha\.trim\(\)\.normalize/);
  assert.doesNotMatch(armazenamento,/return `\$\{codigo\}:\$\{id\}`/);
  assert.match(armazenamento,/aplicarOperacaoDiario\(paginas,operacao\)/);
  assert.match(diario,/compartilhadoCom/);
  assert.match(diario,/guardarDiarioJogador\(chave,atual\)/);
  assert.match(biblioteca,/pessoalJogador\?original\.replaceAll/);
  assert.match(biblioteca,/↓ Exportar/);
  assert.doesNotMatch(entrada,/importar.*\.md|Importar Markdown/);
});
