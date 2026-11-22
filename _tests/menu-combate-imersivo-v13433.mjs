import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listarAcoesDaFicha } from '../src/hexatombe/acoesFichaDados.ts';
import { precisaTesteContraCA, permiteRolarEfeito } from '../src/hexatombe/logicaAcoesDaFicha.ts';
import { formulaRolavelDaFicha } from '../src/hexatombe/rolagensDaFicha.ts';
const app=readFileSync(new URL('../src/App.tsx', import.meta.url),'utf8');
const menu=readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.tsx', import.meta.url),'utf8');
const css=readFileSync(new URL('../src/hexatombe/MenuCombateImersivo.css', import.meta.url),'utf8');
const ficha={basicName:'Lança simples',basicDamage:'1d6+2',basicIcon:'⚔️',skills:[
 {name:'Corrente de Água',type:'Ofensiva',cost:20,damage:'2d8+6',effect:'Ataque a distância',icon:'💧'},
 {name:'Vela Aquática',type:'Buff',cost:12,damage:'+2 CA',effect:'Aumenta a defesa',icon:'🛡️'},
 {name:'Maré Curativa',type:'Cura',cost:10,damage:'2d6',effect:'Cura um aliado'},
 {name:'Queda',type:'Condição',cost:3,damage:'1d4',effect:'Derruba o oponente'},
 ],passiveName:'Água Restauradora',passiveEffect:'Recupera mana.'};

test('catálogo único exibe ataque, cinco? habilidades cadastradas e passiva sem perder dados',()=>{
 const acoes=listarAcoesDaFicha(ficha);
 assert.equal(acoes.length,6);
 assert.equal(acoes[0].titulo,'Lança simples');
 assert.equal(acoes[1].icone,'💧');
 assert.equal(acoes[2].categoria,'buff');
 assert.equal(acoes.at(-1).categoria,'passiva');
});
test('acerto d20 aparece em ataques e controle, não em buffs, cura ou passivas',()=>{
 const acoes=listarAcoesDaFicha(ficha);
 for(const a of acoes)assert.equal(precisaTesteContraCA(a.categoria),['basico','ofensiva','controle'].includes(a.categoria),a.titulo);
});
test('rolagens usam apenas fórmula explícita, sem converter bônus fixo em dado',()=>{
 const acoes=listarAcoesDaFicha(ficha);
 assert.equal(formulaRolavelDaFicha(acoes[1].valor),'2d8+6');
 assert.equal(permiteRolarEfeito(acoes[2].categoria),false);
 assert.equal(formulaRolavelDaFicha(acoes[2].valor),null);
 assert.equal(formulaRolavelDaFicha(acoes[3].valor),'2d6');
});
test('menu só aparece com combate ativo e câmera de personagem, lendo ficha do foco',()=>{
 assert.match(app,/cameraDestaque\?\.modo==='personagem' && campanha\.combateAtivo/);
 assert.match(app,/personagemId/);
 assert.match(app,/fichas\.find\(f=>f\.id===foco\.fichaId\)\?\.dados/);
 assert.match(app,/lancarDados\(expressao,`\$\{foco\.nome\}/);
});
test('menu usa motor atual, sem modificar recursos nem rolar passivas',()=>{
 assert.match(menu,/onRolar\('1d20'/);
 assert.match(menu,/permiteRolarEfeito\(acao\.categoria\)/);
 assert.match(menu,/precisaTesteContraCA\(acao\.categoria\)/);
 assert.doesNotMatch(menu,/atualizarUnidade|setCampanha|Math\.random/);
});
test('menu inclui inventário e acesso à ficha sem sistema de itens duplicado',()=>{
 assert.match(menu,/onAbrirInventario/);
 assert.match(menu,/onAbrirFicha/);
 assert.match(app,/setAbaFicha\('inventario'\)/);
});
test('estilo usa faixas e se adapta à resolução',()=>{
 assert.match(css,/skewX\(-7deg\)/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/prefers-reduced-motion/);
});
