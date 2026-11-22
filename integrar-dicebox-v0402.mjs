import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
// Execute na raiz do hexatombe-mesa: node integrar-dicebox-v0402.mjs
// Atualiza somente src/App.tsx; cria backup antes de gravar.
// node integrar-dicebox-v0402.mjs --verificar confere sem alterar.
const src = resolve('src/App.tsx');
if (!existsSync(src)) throw new Error('Nao encontrei src/App.tsx. Abra o terminal na raiz do hexatombe-mesa.');
const original = readFileSync(src,'utf8');
let novo = original;
const jaConectado = /<Dados3D\b[\s\S]*?\bonResultado\s*=\s*\{/m.test(original);
if (process.argv.includes('--verificar')) {
  console.log(jaConectado ? 'OK: App.tsx passa onResultado ao Dados3D.' : 'PENDENTE: falta onResultado no App.tsx.');
  process.exit(jaConectado ? 0 : 1);
}
if (jaConectado) {
  console.log('App.tsx ja contem <Dados3D onResultado={...}>. Nenhuma alteracao necessaria.');
  process.exit(0);
}
if (!original.includes('<Dados3D') && !original.includes('<DadoMesa')) {
  throw new Error('Nao encontrei os dados antigos nem o componente Dados3D no App.tsx. Nao alterei o arquivo.');
}
const trocarUma = (trecho, substituto, nome) => {
  const n = novo.split(trecho).length - 1;
  if(n !== 1) throw new Error(nome + ': esperava 1 ocorrencia, achei ' + n + '. Nenhum arquivo alterado.');
  novo = novo.replace(trecho, substituto);
};
const regexUma = (re, substituto, nome) => {
  const matches = [...novo.matchAll(re)];
  if(matches.length !== 1) throw new Error(nome + ': esperava 1 trecho, achei ' + matches.length + '. Nenhum arquivo alterado.');
  novo = novo.replace(re, substituto);
};
if (original.includes('function concluirRolagemFisica(')) {
  regexUma(/<Dados3D\b(?:(?!\/>)[\s\S])*?\/>/g, (tag) => tag.replace(/\/>$/, 'onResultado={valores => concluirRolagemFisica(rolagemDestacada.id, valores)} />'), 'Conexao do Dice Box');
} else {
  if (jaConectado) throw new Error('App contem onResultado mas nao tem concluirRolagemFisica; precisa de revisao manual.');
  // O fluxo antigo sorteia previamente os numeros. Trocaremos por requisicoes pendentes.
  regexUma(/type ResultadoVisual = ResultadoDados & \{[^\n]+\};/g,
    'type ResultadoVisual = ResultadoDados & { id: string; formula: string; autor: string; visibilidade: VisibilidadeRolagem; pendente: boolean; iniciativaId?: string };',
    'Tipo de rolagem');
  const begin = novo.indexOf('function rolar(formula: string): ResultadoDados {');
  const end = novo.indexOf('\nfunction App() {', begin);
  if(begin < 0 || end < 0) throw new Error('Nao localizei o trecho da funcao rolar(). Nenhum arquivo alterado.');
  novo = novo.slice(0, begin) + "// v0401-dicebox-integracao: a rolagem so recebe valor apos a animacao do Dice Box.\nfunction rolar(formula: string): ResultadoDados {\n  const normalizada = formula.replace(/\\s+/g, '').toLowerCase();\n  const match = /^(\\d{1,2})d(\\d{1,4})([+-]\\d{1,4})?$/.exec(normalizada);\n  if (!match) throw new Error('Use uma expressao como 1d20, 2d6+6 ou 1d8-2.');\n  const quantia = Number(match[1]);\n  const faces = Number(match[2]);\n  const modificador = Number(match[3] || '0');\n  if (![4,6,8,10,12,20,100].includes(faces)) throw new Error('Dados 3D disponiveis: d4, d6, d8, d10, d12, d20 e d100.');\n  if (quantia < 1 || quantia > 8) throw new Error('Limite temporario: de 1 a 8 dados por rolagem.');\n  return { total: 0, detalhes: 'Rolando...', faces, valores: Array(quantia).fill(0), modificador };\n}" + '\n\n' + novo.slice(end);
  trocarUma('  const [rolagemDestacada, setRolagemDestacada] = useState<ResultadoVisual | null>(null);',
    '  const [rolagemDestacada, setRolagemDestacada] = useState<ResultadoVisual | null>(null);\n  const [filaRolagens, setFilaRolagens] = useState<ResultadoVisual[]>([]);',
    'Fila de rolagens');
  regexUma(/  useEffect\(\(\) => \{\s*if \(!rolagemDestacada\) return;[\s\S]*?\}, \[rolagemDestacada\?\.id\]\);/g,
    "  // Uma rolagem por vez: protege a iniciativa de varios personagens.\n  useEffect(() => {\n    if (rolagemDestacada || !filaRolagens.length) return;\n    setRolagemDestacada(filaRolagens[0]);\n    setFilaRolagens(fila => fila.slice(1));\n  }, [rolagemDestacada, filaRolagens]);\n  useEffect(() => {\n    if (!rolagemDestacada || rolagemDestacada.pendente) return;\n    const handle = window.setTimeout(() => setRolagemDestacada(atual =>\n      atual?.id === rolagemDestacada.id ? null : atual), filaRolagens.length ? 1400 : 6500);\n    return () => window.clearTimeout(handle);\n  }, [rolagemDestacada?.id, rolagemDestacada?.pendente, filaRolagens.length]);", 'Temporizador de rolagem');
  const fstart = novo.indexOf('  function exibirDado(');
  const fend = novo.indexOf('  function iniciarCombate()',fstart);
  if (fstart < 0 || fend < 0) throw new Error('Nao localizei funcoes de dados/iniciativa. Nenhum arquivo alterado.');
  novo = novo.slice(0,fstart) + "  // v0401: solicita um lancamento; nao sorteia dados antes do motor 3D.\n  function exibirDado(expressao: string, resultado: ResultadoDados, autor: string, iniciativaId?: string) {\n    const visibilidade = visibilidadeRolagem;\n    setFilaRolagens(fila => [...fila, {\n      id: id(), formula: expressao, ...resultado, autor, visibilidade,\n      pendente: true, iniciativaId,\n    }]);\n  }\n  function concluirRolagemFisica(rolagemId: string, valores: number[]) {\n    const atual = rolagemDestacada;\n    if (!atual || atual.id !== rolagemId || !atual.pendente) return;\n    if (valores.length !== atual.valores.length) {\n      setErro('O motor 3D retornou uma quantidade inesperada de dados.');\n      setRolagemDestacada(null);\n      return;\n    }\n    if (valores.some(v => !Number.isInteger(v) || v < 1 || v > atual.faces)) {\n      setErro('O motor 3D retornou uma face invalida.');\n      setRolagemDestacada(null);\n      return;\n    }\n    const total = valores.reduce((soma, v) => soma + v, atual.modificador);\n    const modificador = atual.modificador;\n    const parte = modificador ? ' ' + (modificador > 0 ? '+' : '−') + ' ' + Math.abs(modificador) : '';\n    const detalhes = '[' + valores.join(', ') + ']' + parte;\n    adicionarRegistro(atual.iniciativaId\n      ? 'Iniciativa de ' + atual.autor + ': ' + total + (atual.visibilidade === 'mestre' ? ' (reservada ao mestre).' : ' (publica).')\n      : atual.autor + ' rolou ' + atual.formula + ': ' + detalhes + ' = ' + total,\n      'dado', atual.visibilidade);\n    if (atual.iniciativaId) {\n      atualizarUnidade(atual.iniciativaId, u => ({ ...u, iniciativa: total }));\n    }\n    setRolagemDestacada(antiga => antiga?.id === rolagemId ? {\n      ...antiga, total, detalhes, valores, pendente: false,\n    } : antiga);\n    setErro('');\n  }\n  function lancarDados(expressao = formula, nome?: string) {\n    try {\n      exibirDado(expressao, rolar(expressao), nome || selecionado?.nome || 'Mestre');\n      setErro('');\n    } catch (e) { setErro(e instanceof Error ? e.message : 'Expressao invalida.'); }\n  }\n  function rolarIniciativa(unidade: Unidade) {\n    exibirDado('1d20', rolar('1d20'), unidade.nome, unidade.id);\n  }\n" + novo.slice(fend);
  regexUma(/\{rolagemDestacada && \(!preverJogador \|\| rolagemDestacada\.visibilidade === 'publica'\) && <div className="rolagem-sobre-mapa" role="status" aria-live="polite" key=\{rolagemDestacada\.id\}>/g,
    `{rolagemDestacada && <div className="rolagem-sobre-mapa" role="status" aria-live="polite" key={rolagemDestacada.id} style={preverJogador && rolagemDestacada.visibilidade === 'mestre' ? {opacity:0,pointerEvents:'none'} : undefined}>`,
    'Previa jogador');
  if (/<Dados3D\b/.test(novo)) {
    regexUma(/<Dados3D\b(?:(?!\/>)[\s\S])*?\/>/g,
      '<Dados3D faces={rolagemDestacada.faces} valores={rolagemDestacada.valores} acabamento={acabamentoDados} onResultado={valores => concluirRolagemFisica(rolagemDestacada.id, valores)} />',
      'Componente Dados3D');
  } else {
    // Caso o App ainda esteja usando dados em SVG, trocamos apenas a renderizacao.
    regexUma(/\{rolagemDestacada\.valores\.slice\(0, 12\)\.map\(\(valor, indice\) => <DadoMesa[\s\S]*?\/\>\)\}/g,
      '<Dados3D faces={rolagemDestacada.faces} valores={rolagemDestacada.valores} acabamento={acabamentoDados} onResultado={valores => concluirRolagemFisica(rolagemDestacada.id, valores)} />',
      'Dados antigos em SVG');
  }
  if (!novo.includes("import Dados3D from './Dados3D';")) {
    const apos = "import './App.css';";
    trocarUma(apos, apos + "\nimport Dados3D from './Dados3D';", 'Import do modulo 3D');
  }
  // As versoes antigas que ja usam acabamentos importam esse estado.
  if (!novo.includes('const [acabamentoDados, setAcabamentoDados]') && !novo.includes('const [acabamentoDados,setAcabamentoDados]')) {
    trocarUma('function App() {', `function App() {\n  const acabamentoDados = 'classico' as const;`, 'Acabamento padrao');
  }
  trocarUma('<strong className="rolagem-numero">{rolagemDestacada.total}</strong>',
    `<strong className="rolagem-numero">{rolagemDestacada.pendente ? 'Rolando…' : rolagemDestacada.total}</strong>`,
    'Placar depois da fisica');
}
if(!/<Dados3D\b[\s\S]*?\bonResultado=\{valores => concluirRolagemFisica\(/m.test(novo)) throw new Error('Falha ao conectar o callback. Nada gravado.');
if(novo === original) { console.log('Sem alteracoes.'); process.exit(0); }
novo = novo.replace(/^\s*const proporcaoMapa = palcoLargura \/ Math\.max\(1, palcoAltura\);\r?\n/m, '\n');
const backup = resolve('src/App.tsx.backup-antes-dicebox-' + new Date().toISOString().replace(/[:.]/g, '-'));
copyFileSync(src,backup);
writeFileSync(src,novo,'utf8');
console.log('INTEGRACAO APLICADA: onResultado configurado.');
console.log('Backup:', backup);
console.log('Verifique: node integrar-dicebox-v0402.mjs --verificar');
console.log('Compile: npm run build');
