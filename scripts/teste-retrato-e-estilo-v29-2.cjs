const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0;
function check(t,x){assert.ok(x,t);n++;console.log('✓',t);}
const fichas=read('src/hexatombe/fichasLibrary.ts');
const gestao=read('src/portal/GestaoPersonagens.tsx');
const editor=read('src/portal/EditorPersonagemMestre.tsx');
const valid=read('src/lib/retratoFicha.ts');
const css=read('src/lib/bibliotecaTokens.css');
check('ficha aceita GIF como foto',fichas.includes('png|jpeg|webp|gif'));
check('troca de retrato na ficha',gestao.includes('alterarRetratoFicha')&&gestao.includes('Trocar retrato'));
check('foto independe do token',gestao.includes('photo:retrato')&&gestao.includes('temTokenPadrao'));
check('fichas A01 usam mesmo editor visual',gestao.includes('hx-character-retrato-edicao'));
check('mensagens de falha visíveis',gestao.includes('role="alert" className="hx-character-retrato-erro"'));
check('upload aceita GIF',valid.includes('image/gif'));
check('limite de upload garante armazenamento',valid.includes('3_500_000'));
check('editor mestre usa upload compartilhado',editor.includes('lerArquivoRetrato')&&editor.includes('RETRATO_ACEITOS'));
check('biblioteca estilizacao escura',css.includes('background:#15171b!important'));
check('botoes com cor de tema',css.includes('background:#302b2b!important'));
check('controle checkbox mantém aparência',css.includes('accent-color:#c09c72'));
check('ficha preserva ficha no salvar',gestao.includes('...f.dados,photo:retrato'));
// detecta erros de sintaxe TypeScript/JSX nos arquivos alterados
const ts=require('typescript');for(const file of ['src/portal/GestaoPersonagens.tsx','src/portal/EditorPersonagemMestre.tsx','src/lib/retratoFicha.ts','src/lib/TokenPadraoFicha.tsx','src/lib/PainelBibliotecaTokens.tsx']){
 const txt=read(file);const sf=ts.createSourceFile(file,txt,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const errs=sf.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' '));check('sintaxe '+file,errs.length===0);if(errs.length)console.error(errs);
}
console.log(`OK: ${n} verificações v29.2`);
