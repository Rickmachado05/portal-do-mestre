const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ts=require('typescript');
const Module=require('node:module');
const raiz=path.join(__dirname,'..');
const ler=arquivo=>fs.readFileSync(path.join(raiz,arquivo),'utf8');
const carregarTS=arquivo=>{
  const out=ts.transpileModule(ler(arquivo),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true,
  });
  assert.equal(out.diagnostics?.length,0,'Transpilação '+arquivo);
  const modulo=new Module(path.join(raiz,arquivo),module);modulo.filename=path.join(raiz,arquivo);modulo.paths=module.paths;
  modulo._compile(out.outputText,modulo.filename);return modulo.exports;
};
let passou=0;
const teste=(titulo,fn)=>{fn();passou++;console.log('✓',titulo);};
const {mudouPosicaoHud3D,intervaloHud3D,mudouFovCamera3D}=carregarTS('src/lib/estabilidadeMesa3D.ts');
teste('HUD não atualiza quando coordenadas são idênticas',()=>assert.equal(mudouPosicaoHud3D({x:1,z:2},{x:1,z:2}),false));
teste('HUD ignora flutuações imperceptíveis',()=>assert.equal(mudouPosicaoHud3D({x:1,z:2},{x:1.005,z:2.003}),false));
teste('HUD responde a movimento real nos dois eixos',()=>{
 assert.equal(mudouPosicaoHud3D({x:1,z:2},{x:1.05,z:2}),true);
 assert.equal(mudouPosicaoHud3D({x:1,z:2},{x:1,z:2.05}),true);
});
teste('HUD respeita intervalo ativo e repouso',()=>{
 assert.equal(intervaloHud3D(true),180);assert.equal(intervaloHud3D(false),500);
});
teste('Câmera não recalcula FOV estável e recalcula FOV alterado',()=>{
 assert.equal(mudouFovCamera3D(52,52),false);assert.equal(mudouFovCamera3D(52.0001,52),false);
 assert.equal(mudouFovCamera3D(47,52),true);
});
const mesa=ler('src/mesa3d/Mesa3DPrototipo.tsx');
teste('Mesa 3D compila sintaticamente com as mudanças',()=>{
 const sf=ts.createSourceFile('Mesa3DPrototipo.tsx',mesa,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(sf.parseDiagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(sf.parseDiagnostics,{getCurrentDirectory:()=>raiz,getCanonicalFileName:x=>x,getNewLine:()=>"\n"}));
});
teste('Render WebGL fica suspenso em segundo plano e volta com delta reiniciado',()=>{
 assert.ok(mesa.includes('if(document.hidden)return;'));
 assert.ok(mesa.includes('document.addEventListener(\'visibilitychange\',gerenciarVisibilidade)'));
 assert.ok(mesa.includes('document.removeEventListener(\'visibilitychange\',gerenciarVisibilidade)'));
 assert.ok(mesa.includes('prev=performance.now();cont=0;frames=0'));
});
teste('ResizeObserver não redesenha sem alteração de dimensões',()=>{
 assert.ok(mesa.includes('if(w===tamanhoAnterior.largura&&h===tamanhoAnterior.altura)return'));
});
teste('Contador de FPS só atualiza quando detalhes estão visíveis',()=>{
 assert.ok(mesa.includes('if(detalhesRef.current)setFps'));
});
console.log(`OK: ${passou} verificações v29.4`);
