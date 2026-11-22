const fs=require('node:fs');
const assert=require('node:assert/strict');
const ler=(p)=>fs.readFileSync(new URL('../'+p,'file://'+__filename).pathname,'utf8');
const app=ler('src/App.tsx'),skin=ler('src/lib/tokenSkins.ts');
const sala=ler('src/mesa3d/roomScene.ts'),mesa3d=ler('src/mesa3d/Mesa3DPrototipo.tsx');
const estado=ler('src/lib/mesaCompartilhada.ts'),engine=ler('src/lib/tokenIdleGif.mjs');
const checks=[
  ['GIF importável no token original',app.includes('if(arquivo.type===\'image/gif\') await validarGifImportado(arquivo)')],
  ['GIF validado antes de salvar',app.includes('decodificarGifIdle(await arquivo.arrayBuffer())')],
  ['original e skins mantêm flag independente',skin.includes('tokenIdleGif?: boolean')&&skin.includes('idleGif?: boolean')],
  ['skin e original salvos no IndexedDB existente',app.includes('salvarArquivo(`token:${selecionado.id}`')&&app.includes('salvarArquivo(chaveImagemSkin(unidadeId, novaSkin.id)')],
  ['Mesa 2D usa motor idle em vez da tag GIF nativa',app.includes('<TokenIdle src={imagemTokenCena(u,p)!} animado={tokenIdleAtivo(u,p)}')&&app.includes('parametrosIdleAtivos(u,p)')],
  ['Galeria também usa o motor',app.includes('alt="Skin original" animado={selecionado.tokenIdleGif===true}')&&app.includes('animado={skin.idleGif===true}')],
  ['Mesa 3D atualiza no próprio loop',mesa3d.includes('sala.atualizarIdle(tempo);')&&sala.includes('const atualizarIdle=(tempo:number)')],
  ['Mesa 3D usa CanvasTexture e não troca o material em cada quadro',sala.includes('new THREE.CanvasTexture(canvas)')&&sala.includes('registro.textura.needsUpdate=true')],
  ['GIFs iguais reutilizam decodificação pelo conteúdo',engine.includes("SHA-256")&&engine.includes('cachePorConteudo')],
  ['Modo de movimento reduzido respeitado',sala.includes('prefers-reduced-motion')&&ler('src/lib/TokenIdle.tsx').includes('prefers-reduced-motion')],
  ['Modelo compartilhado preserva flag no 2D/3D',estado.includes('tokenIdleGif:u.tokenIdleGif===true')],
  ['Skins antigas permanecem opcionais',skin.includes('idleGif?: boolean')&&estado.includes('tokenIdleGif?:boolean')],
];
for(const [label,ok] of checks){assert.equal(ok,true,label);}
console.log(`OK — ${checks.length} verificações de integração Token Idle v21`);
