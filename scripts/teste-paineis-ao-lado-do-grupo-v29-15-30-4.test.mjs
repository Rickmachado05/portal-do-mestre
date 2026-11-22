import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const app = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
const emb = readFileSync(new URL('../src/mesa3d/visualizadorEmbutido.css', import.meta.url), 'utf8')
const lastApp = app.split('/* v29.15.30.4 — os editores inferiores ficam AO LADO da galeria de personagens. */')[1]
const lastEmb = emb.split('/* v29.15.30.4 — posicionamento lateral para não sobrepor a galeria do mestre. */')[1]

test('Painéis 2D ficam ao lado do grupo, sem cobrir galeria longa', () => {
 assert.ok(lastApp, 'regras novas 2D presentes')
 assert.match(lastApp, /\.mesa-app\s*\{\s*--hx-editor-left-safe:\s*140px/)
 for (const klass of ['barreira-editor-flutuante','hx-anotacao-editor-flutuante','hx-luz-editor-flutuante']) {
  assert.ok(lastApp.includes(`.mesa-app .${klass}`), `painel ${klass} contemplado`)
 }
 assert.match(lastApp, /left:\s*var\(--hx-editor-left-safe\)/)
 assert.match(lastApp, /max-width:\s*calc\(100vw\s*-\s*var\(--hx-editor-left-safe\)\s*-\s*18px\)/)
 assert.match(lastApp, /@media\(max-width:780px\)[\s\S]*--hx-editor-left-safe:\s*90px/)
})

test('Painéis 3D dentro do iframe deixam livre a coluna de fichas do mestre', () => {
 assert.ok(lastEmb, 'regras novas 3D presentes')
 assert.match(lastEmb, /\.m3d-embutido,\s*\.m3d-paridade\s*\{\s*--m3d-editor-left-safe:\s*140px/)
 assert.match(lastEmb, /\.m3d-selection-hud\.m3d-barreira-editor298/)
 assert.match(lastEmb, /left:\s*var\(--m3d-editor-left-safe,\s*140px\)/)
 assert.match(lastEmb, /max-width:\s*calc\(100%\s*-\s*var\(--m3d-editor-left-safe,\s*140px\)\s*-\s*18px\)/)
 assert.match(lastEmb, /@media\(max-width:780px\)[\s\S]*--m3d-editor-left-safe:\s*90px/)
})

test('Margem segura respeita dimensões reais da galeria em telas largas e estreitas', () => {
 // .galeria-personagens: left 12 + width 112 (desktop), left 5 + width 72 (compacto)
 assert.match(app, /\.galeria-personagens\{[^}]*left:12px;width:112px/)
 assert.match(app, /@media\(max-width:780px\)[^{]*\{[\s\S]*?\.galeria-personagens\{width:72px;left:5px/)
 assert.ok(140 > 12+112, 'desktop: margem fora da galeria')
 assert.ok(90 > 5+72, 'janela estreita: margem fora da galeria')
})
