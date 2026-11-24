import test from 'node:test';
import assert from 'node:assert/strict';
import {novaFicha,custoAtributo,custoAtiva,custoPassiva,custoExploracao,energiaAtiva,energiaExploracao,recursosFinais,totais,habilidade,importar,revisar} from '../src/criador-impeto/regras.mjs';
test('configuração de referência do livro e compra progressiva',()=>{
 const f=novaFicha();assert.deepEqual(totais(f),{pa:0,pr:0,pt:0,pc:0,px:0});assert.deepEqual(recursosFinais(f),{hp:40,en:30,ca:8,dados:2,fixo:2,regen:0});assert.equal(custoAtributo(14),8);assert.equal(custoAtributo(20),32);
});
test('exemplo de Suporte técnico 2.10',()=>{
 const f=novaFicha();for(const n of ['Agilidade','Destreza','Vigor','Intelecto','Percepção'])f.atributos[n]=12;f.atributos.Vontade=14;
 f.recursos={hp:5,en:9,ca:10,ataque:0,regen:1};f.derivacao={tipo:'reserva',atributo:'Vontade',justificativa:'Disciplina'};
 for(const n of ['Medicina','Engenharia','Sobrevivência','Persuasão'])f.pericias[n]=1;
 assert.equal(totais(f).pa,28);assert.equal(totais(f).pr,20);assert.equal(totais(f).pt,4);assert.deepEqual(recursosFinais(f),{hp:55,en:80,ca:10,dados:2,fixo:2,regen:1});
});
test('H06: combate, exceções reativas e exploração',()=>{
 let h={...habilidade('ativa'),quantidade:3,fixo:2};assert.equal(custoAtiva(h),19);assert.equal(energiaAtiva(h),10);
 h={...habilidade('ativa'),efeito:'escudo',fixo:2,ativacao:'reacao'};assert.equal(custoAtiva(h),17);assert.equal(energiaAtiva(h),12);
 h={...habilidade('ativa'),efeito:'mitigacao',impactos:2,ativacao:'reacao'};assert.equal(custoAtiva(h),19);assert.equal(energiaAtiva(h),12);
 h={...habilidade('passiva'),dado:4};assert.equal(custoPassiva(h),6);
 h={...habilidade('exploracao'),classe:'especializada',automatica:true};assert.equal(custoExploracao(h),12);assert.equal(energiaExploracao(h),0);
});
test('JSON próprio, dados inválidos e orçamentos',()=>{
 const f=novaFicha();assert.deepEqual(importar(JSON.parse(JSON.stringify(f))),f);assert.throws(()=>importar({formato:'hexatombe-avatar-ficha'}));f.atributos.Força=99;assert.throws(()=>importar(f));f.atributos.Força=14;f.config.pa=1;assert(revisar(f).includes('PA: orçamento excedido.'));
});

test('alterar a escala de CA não concede PR negativos',()=>{
 const f=novaFicha();f.config.ca=10;assert.equal(totais(f).pr,0);assert(revisar(f).includes('CA Base fora da escala escolhida.'));
});

test('escala alta e recursos acima de 9999 sobrevivem exportação e importação',()=>{
 const f=novaFicha();Object.assign(f.config,{hp:1000000,en:2500000,pr:100000,pc:200000,px:300000,ativas:25,tetoAtiva:100000,dadosAtaque:100,fixoAtaque:500,regen:1000});f.recursos.hp=15000;f.recursos.en=20000;f.ativas=[{...habilidade('ativa'),quantidade:200,fixo:500}];const copy=importar(JSON.parse(JSON.stringify(f)));assert.deepEqual(copy,f);assert.equal(recursosFinais(copy).hp,1045000);assert.equal(recursosFinais(copy).en,2600000);assert.equal(custoAtiva(copy.ativas[0]),2000);assert.equal(energiaAtiva(copy.ativas[0]),null);assert.throws(()=>importar({...f,config:{...f.config,hp:Number.MAX_SAFE_INTEGER+1}}));
});
