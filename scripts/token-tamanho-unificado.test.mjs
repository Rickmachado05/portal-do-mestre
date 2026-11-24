import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const ler=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('retratos e tokens topview usam o mesmo diâmetro inicial e personalizado',()=>{
 const mestre=ler('src/App.css'),jogador=ler('src/multiplayer/MesaConvidado2DParity.css'),app=ler('src/App.tsx');
 for(const regra of [mestre.match(/\.token-rosto\s*\{[^}]+\}/)?.[0],mestre.match(/\.token\.token-topview \.token-rosto\s*\{[^}]+\}/)?.[0],jogador.match(/\.pm-jogo-token:not\(\.token-topview\) > \.token-rosto\s*\{[^}]+\}/)?.[0],jogador.match(/\.pm-jogo-token\.token-topview > \.token-rosto\s*\{[^}]+\}/)?.[0]]){
 assert.ok(regra);assert.match(regra,/width:\s*var\(--tamanho-token, 70px\)/);assert.match(regra,/height:\s*var\(--tamanho-token, 70px\)/);}
 assert.match(app,/t\.tamanhoInicial \+ \(\(distancia-t\.distanciaInicial\)\*2\)\/t\.escala, 18, 300/);
 assert.match(app,/Restaurar tamanho padrão \(70 px\)/);
 assert.match(ler('src/lib/mesaCompartilhada.ts'),/tamanho: entre\(numero\(t\.tamanho, 70\), 18, 300\)/);
 assert.match(ler('scripts/multiplayer-server.mjs'),/limite\(token\.tamanho,18,300,70\)/);
});
