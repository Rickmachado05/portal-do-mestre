const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const dir=path.resolve(__dirname,'..');
const ler=file=>fs.readFileSync(path.join(dir,file),'utf8');
const fonte=ler('src/lib/tokenIdleGif.mjs');
const mesa=ler('src/mesa3d/roomScene.ts');
const app=ler('src/App.tsx');
const checks=[
  ['não reduz GIF de 512 para 192',fonte.includes('ladoRender:512')&&!fonte.includes('ladoRender:192')],
  ['resolução íntegra em quadros',fonte.includes('if(lw===w&&lh===h)return {largura:w,altura:h,pixels:pixels.slice()}')],
  ['Canvas da Mesa 3D recebe dimensões de origem',mesa.includes('canvas.width=animacao.largura;canvas.height=animacao.altura')],
  ['textura criada diretamente com Canvas 512',mesa.includes('new THREE.CanvasTexture(canvas)')],
  ['GPU recebe atualizações de quadro',mesa.includes('registro.textura.needsUpdate=true')],
  ['filtros mantêm suavidade de arte não-pixelada',mesa.includes('textura.minFilter=THREE.LinearFilter;textura.magFilter=THREE.LinearFilter;')],
  ['token original é armazenado sem conversão em imagem fixa',app.includes("if(arquivo.type==='image/gif') await validarGifImportado(arquivo)")],
  ['limites originais de bytes e quadros preservados',fonte.includes('bytes:4*1024*1024, lado:512, quadros:40')],
  ['cache controlado por memória para textura 512',fonte.includes('LIMITE_CACHE_GIF=48*1024*1024')&&fonte.includes('reduzirCacheGif()')],
];
for(const [label,ok]of checks)assert.equal(ok,true,label);
console.log(`OK — ${checks.length} verificações de nitidez e integração da Mesa 3D v22`);
