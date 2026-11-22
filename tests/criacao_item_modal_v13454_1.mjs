import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const arquivo = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const inventario = arquivo('../src/hexatombe/InventarioMesa.tsx');
const modal = arquivo('../src/hexatombe/ModalCriarItem.tsx');
const estilos = arquivo('../src/hexatombe/ModalCriarItem.css');

test('Criação abre janela separada, sem formulário comprimido no inventário', () => {
  assert.match(inventario, /import ModalCriarItem from '\.\/ModalCriarItem'/);
  assert.match(inventario, /onClick=\{\(\)=>setNovoRapido\(true\)\}>＋ Criar item/);
  assert.match(inventario, /\{novoRapido&&<ModalCriarItem personagemNome=\{nome\}/);
  assert.doesNotMatch(inventario, /imp-criacao-rapida|Criar item aqui na mesa|criarRapidamente/);
  assert.match(modal, /createPortal\(/);
  assert.match(modal, /document\.body\)/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(estilos, /\.imp-modal-overlay\{position:fixed/);
  assert.match(estilos, /z-index:2147483000/);
});

test('Editor preserva imagem e conteúdo de documentos, catálogo e entrega', () => {
  assert.match(modal, /processarImagemItem\(arquivo\)/);
  assert.match(modal, /processarImagemConteudoItem\(arquivo\)/);
  assert.match(modal, /salvarItem\(/);
  assert.match(modal, /onCriado\(item,quantidade\)/);
  assert.match(modal, /onFechar\(\)/);
  assert.match(modal, /categoria==='documento'/);
});
