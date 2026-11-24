import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ATRIBUTOS,GRUPOS,PERICIAS,TALENTOS,VANTAGENS,PADRAO,LIMITES,EFEITOS,CLASSES_PX,DADOS,novaFicha,habilidade,custoAtributo,custoAtiva,custoPassiva,custoExploracao,energiaAtiva,energiaExploracao,detalharCusto,recursosFinais,totais,revisar,importar} from './regras.mjs';
import './style.css';
import {buscarFicha,salvarOuAtualizarFicha} from '../hexatombe/fichasLibrary';
import {converterUniversal} from '../impeto/universal.mjs';

const STORAGE='portal-criador-impeto-universal-rascunho-v1';
const EDIT_ID=new URLSearchParams(location.search).get('ficha');
const TABS=['Identidade','Capacidades','Recursos','Combate','Exploração','Revisão'];
const CONFIG=[
 ['baseAtributo','Base de cada atributo'],['tetoAtributo','Teto de atributo'],['pa','Pontos de Atributos (PA)'],['pr','Pontos de Recursos (PR)'],['pt','Pontos de Treinamento (PT)'],['pc','Pontos de Combate (PC)'],['px','Pontos de Exploração (PX)'],
 ['hp','HP inicial'],['en','Energia de referência'],['ca','CA inicial'],['tetoCa','Teto inicial de CA'],['dadosAtaque','Dados d6 do ataque base'],['fixoAtaque','Dano fixo do ataque base'],['regen','Regeneração base'],
 ['ativas','Espaços de ativas'],['passivas','Espaços de passivas'],['exploracao','Espaços de exploração'],['tetoAtiva','Teto PC por ativa'],['tetoPassiva','Teto PC por passiva'],['tetoPX','Teto PX por técnica'],['vantagens','Espaços de vantagens']
];
const nfmt=n=>Number.isFinite(n)?String(n):'—';
const safeFile=n=>n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'personagem';
const pairs=obj=>Object.entries(obj);
function Num({label,value,onChange,min=0,max=Infinity}){
 const [draft,setDraft]=useState(null);
 const parse=s=>{if(s.trim()==='')return null;const n=Number(s);return Number.isSafeInteger(n)&&n>=min&&n<=max?n:null;};
 return <label className="iu-field"><span>{label}</span><input type="number" inputMode="numeric" step={1} min={min} max={Number.isFinite(max)?max:undefined} value={draft===null?value:draft} onFocus={()=>setDraft(String(value))} onChange={e=>{const s=e.target.value;setDraft(s);const n=parse(s);if(n!==null)onChange(n);}} onBlur={()=>{setDraft(null);}} aria-invalid={draft!==null&&parse(draft)===null?true:undefined}/></label>;
}
function Field({label,value,onChange,area=false,placeholder='',max=16000}){
 return <label className="iu-field"><span>{label}</span>{area?<textarea rows={3} value={value} maxLength={max} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>:<input value={value} maxLength={max} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>}</label>;
}
function Select({label,value,onChange,options,number=false}){
 return <label className="iu-field"><span>{label}</span><select value={value} onChange={e=>onChange(number?Number(e.target.value):e.target.value)}>{options.map(o=>{const [key,name]=Array.isArray(o)?o:[o,o];return <option key={key} value={key}>{name}</option>})}</select></label>;
}
function Check({label,value,onChange}){return <label className="iu-check"><input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)}/>{label}</label>;}
function Heading({eyebrow,title,description}){return <header className="iu-section-head"><small>{eyebrow}</small><h2>{title}</h2>{description&&<p>{description}</p>}</header>;}
function Saldo({code,used,max}){return <div className={'iu-balance'+(used>max?' iu-danger':'')}><span>{code}</span><strong>{nfmt(max-used)}<small> restantes</small></strong><div className="iu-meter"><i style={{width:Math.max(0,Math.min(100,max?used/max*100:used?100:0))+'%'}}/></div><small>{used} de {max} utilizados</small></div>;}
const EFEITO_AJUDA={
 dano:'Cause dano próprio da técnica. Não some o ataque básico automaticamente.',
 cura:'Recupere HP, sem ultrapassar o HP máximo. Custa 1,5× os dados e bônus.',
 escudo:'Crie uma reserva temporária que absorve dano. Custa 1,25× o valor equivalente.',
 mitigacao:'Reduza o dano de um impacto coberto. Custa 1,25× por impacto.',
 empurrao:'Desloque um alvo. Efeito base de 4 PC.',
 imobilizacao:'Restrinja o movimento do alvo. Efeito base de 8 PC.',
 atordoamento:'Controle C02 de até duas ativações afetadas, com escape. Efeito base de 19 PC.',
 buffCa1:'Aumente temporariamente a CA efetiva em 1. Base de 8 PC.',
 buffCa2:'Aumente temporariamente a CA efetiva em 2. Base de 16 PC.'
};
const PX_AJUDA={pontual:'Um efeito simples e delimitado, como iluminar um local.',especializada:'Uma capacidade especial, como rastrear um vestígio oculto.',complexa:'Uma solução excepcional local, como criar uma travessia.',ampla:'Proteção de um percurso ou alteração de várias estruturas.',extraordinaria:'Superação temporária de uma restrição significativa.'};
function Habilidade({h,tipo,index,update,remove,teto,restante,onDone}){
 const ativa=tipo==='ativas',passiva=tipo==='passivas',px=tipo==='exploracao';
 const [etapa,setEtapa]=useState(0);
 const custo=ativa?custoAtiva(h):passiva?custoPassiva(h):custoExploracao(h);
 const en=ativa?energiaAtiva(h):px?energiaExploracao(h):0;
 const unidade=px?'PX':'PC';
 const dados=!px&&['dano','cura','escudo','mitigacao'].includes(h.efeito);
 const reativo=['escudo','mitigacao','buffCa1','buffCa2'].includes(h.efeito);
 const rapido=h.efeito.startsWith('buffCa');
 const duravel=['escudo','imobilizacao','buffCa1','buffCa2'].includes(h.efeito);
 const set=(key,value)=>{
  const next={...h,[key]:value};
  if(key==='automatica'&&value)next.usos=1;
  if(key==='efeito'){
   if(value!=='dano')next.empurraoAdicional=false;
   if(value!=='mitigacao')next.impactos=1;
   if(!['escudo','imobilizacao','buffCa1','buffCa2'].includes(value))next.rodadasExtras=0;
   if(next.ativacao==='buff'&&!value.startsWith('buffCa')||next.ativacao==='reacao'&&!['escudo','mitigacao','buffCa1','buffCa2'].includes(value))next.ativacao='principal';
  }
  update(next);
 };
 return <article className="iu-skill iu-skill-guided">
  <div className="iu-skill-head"><div><small>{ativa?'ATIVA':passiva?'PASSIVA':'EXPLORAÇÃO'} {index+1}</small><h3>{h.nome||'Nova habilidade'}</h3></div><button className="iu-button iu-quiet" type="button" onClick={()=>{if(window.confirm('Remover esta habilidade?'))remove();}}>Remover</button></div>
  <div className="iu-skill-total" aria-live="polite"><div><small>Custo de criação</small><b>{custo} {unidade}</b><span>Teto: {teto} {unidade}</span></div><div><small>Custo ao utilizar</small><b>{h.custoAlternativo?'Alternativo':en===null?'A definir':en+' EN'}</b><span>{passiva||px&&h.automatica?'Ativação automática':'Pago durante o jogo'}</span></div><div><small>Saldo após esta técnica</small><b>{restante} {unidade}</b><span>Orçamento compartilhado</span></div></div>
  {(custo>teto||restante<0)&&<p className="iu-note" role="alert">{custo>teto?'Esta técnica ultrapassa o teto individual. ':''}{restante<0?'O orçamento total foi excedido.':''} Ajuste a técnica ou a escala de poder.</p>}
  <nav className="iu-subtabs iu-skill-steps" aria-label="Etapas da habilidade">{['1. Efeito','2. Funcionamento','3. Descrição'].map((n,i)=><button key={n} aria-pressed={etapa===i} onClick={()=>setEtapa(i)}>{n}</button>)}</nav>
  {etapa===0&&<><Field label="Nome da habilidade" value={h.nome} onChange={v=>set('nome',v)} max={100}/>
   <h4>{px?'O que a técnica permite fazer?':'O que a habilidade faz?'}</h4>
   <div className="iu-effect-grid">{(px?pairs(CLASSES_PX):pairs(EFEITOS).filter(([k])=>!passiva||['dano','escudo','mitigacao'].includes(k))).map(([k,v])=><button key={k} type="button" aria-pressed={(px?h.classe:h.efeito)===k} onClick={()=>set(px?'classe':'efeito',k)}><b>{px?k.charAt(0).toUpperCase()+k.slice(1):v}{px?' · '+v+' PX':''}</b><small>{px?PX_AJUDA[k]:EFEITO_AJUDA[k]}</small></button>)}</div>
   {dados&&<><h4>Potência do efeito</h4><div className="iu-grid iu-dice-grid"><Num label="Quantidade de dados" value={h.quantidade} min={1} onChange={v=>set('quantidade',v)}/><Select label="Tipo de dado" value={h.dado} onChange={v=>set('dado',v)} options={Object.keys(DADOS).map(d=>[Number(d),'d'+d+' · '+DADOS[d]+' PC base'])} number/><Num label="Bônus fixo (+2 PC por ponto)" value={h.fixo} onChange={v=>set('fixo',v)}/></div><p className="iu-formula-preview">Resultado: <strong>{h.quantidade}d{h.dado}{h.fixo?'+'+h.fixo:''}</strong></p></>}
   {ativa&&h.efeito==='dano'&&<Check label="Adicionar empurrão (+4 PC base)" value={h.empurraoAdicional} onChange={v=>set('empurraoAdicional',v)}/>}
   {ativa&&h.efeito==='mitigacao'&&<Select label="Impactos cobertos" value={h.impactos} onChange={v=>set('impactos',v)} options={[1,2]} number/>}
  </>}
  {etapa===1&&<><h4>Como a habilidade funciona?</h4><div className="iu-grid">
   {ativa&&<><Select label="Quando usar" value={h.ativacao} onChange={v=>set('ativacao',v)} options={[['principal','Ação principal (×1)'],...(rapido||h.ativacao==='buff'?[['buff','Buff rápido (×1,5)']]:[]),...(reativo||h.ativacao==='reacao'?[['reacao','Reação (×1,5)']]:[])]}/><Select label="Quantidade de alvos" value={h.alvos} onChange={v=>set('alvos',v)} options={[[1,'Um alvo (×1)'],[2,'Dois alvos (×1,5)'],[3,'Três alvos (×2)'],[4,'Quatro alvos (×2,5; avançado)']]} number/><Select label="Alcance" value={h.distante?'distante':'normal'} onChange={v=>set('distante',v==='distante')} options={[[ 'normal','Normal (×1)'],['distante','Distante (×1,25)']]}/>{(duravel||h.rodadasExtras>0)&&<Num label="Rodadas extras (+3 PC cada)" value={h.rodadasExtras} onChange={v=>set('rodadasExtras',v)}/>}</>}
   {passiva&&<Select label="Ativações por combate" value={h.usos} onChange={v=>set('usos',v)} options={[[1,'1 vez (×1)'],[2,'2 vezes (×1,8)'],[3,'3 vezes (×2,5)']]} number/>}
   {px&&<><Select label="Alvos" value={h.alvosPX} onChange={v=>set('alvosPX',v)} options={[[1,'Um'],[2,'Dois (+2 PX)'],[6,'Grupo até 6 (+4 PX)']]} number/><Select label="Alcance" value={h.alcance} onChange={v=>set('alcance',v)} options={[['proximo','Próximo'],['distante','Distante (+2 PX)'],['remoto','Remoto (+6 PX)']]}/><Select label="Duração" value={h.duracao} onChange={v=>set('duracao',v)} options={[['cena','Até uma cena'],['duasCenas','Duas cenas (+4 PX)'],['dia','Até um dia (+8 PX)']]}/>{!h.automatica&&<Select label="Ativações especiais por cena" value={h.usos} onChange={v=>set('usos',v)} options={[[1,'1 vez'],[2,'2 vezes (+3 PX)'],[3,'3 vezes (+6 PX)']]} number/>}</>}
   </div>{px&&<Check label="Automática, uma vez por cena (×1,5 PX)" value={h.automatica} onChange={v=>set('automatica',v)}/>}
   {(passiva||ativa&&h.ativacao==='reacao'||px&&h.automatica)&&<Field label="Quando dispara? (gatilho)" value={h.gatilho} onChange={v=>set('gatilho',v)} area placeholder="Ex.: após receber um acerto."/>}
   {ativa&&h.efeito==='atordoamento'&&<p className="iu-note">C02: até duas ativações afetadas, teste de escape ao final de cada uma; sem redução automática de CA. Chefes: no máximo uma ativação afetada por rodada.</p>}
  </>}
  {etapa===2&&<><h4>Descreva a habilidade no jogo</h4>
   {px&&<Field label="Categoria de exploração" value={h.categoria} onChange={v=>set('categoria',v)} placeholder="Ex.: Deslocamento e acesso" max={100}/>}
   <Field label="Descrição e resultado" value={h.descricao} onChange={v=>set('descricao',v)} area placeholder="O que acontece quando o personagem utiliza a técnica?"/>
   <Field label="Teste, defesa ou escape" value={h.teste} onChange={v=>set('teste',v)} area placeholder="Quando houver risco ou resistência, explique como resolver."/>
   <Field label="Limitações e condições" value={h.limites} onChange={v=>set('limites',v)} area placeholder="O que a técnica não pode fazer?"/>
   {!passiva&&<details className="iu-details" open={h.custoAlternativo||en===null?true:undefined}><summary>Custo de uso alternativo (opcional)</summary><Field label="Aprovado pelo mestre" value={h.custoAlternativo} onChange={v=>set('custoAlternativo',v)} placeholder="Ex.: 50 EN, material consumido, HP ou tempo."/>{en===null&&<p className="iu-note">O livro não define um custo de EN automático para esta faixa. Combine um custo com o mestre.</p>}</details>}
  </>}
  <details className="iu-details iu-cost-breakdown"><summary>Entenda como o custo foi calculado</summary><div>{detalharCusto(h,tipo).map(([k,v])=><span key={k}><small>{k}</small><b>{v}</b></span>)}</div><p>Total arredondado conforme o livro: <b>{custo} {unidade}</b>. PC/PX constroem a habilidade; EN é o custo de uso.</p></details>
  <div className="iu-skill-nav"><button className="iu-button iu-quiet" disabled={etapa===0} onClick={()=>setEtapa(etapa-1)}>← Voltar</button>{etapa<2?<button className="iu-button iu-primary" onClick={()=>setEtapa(etapa+1)}>Próximo →</button>:<button className="iu-button iu-primary" onClick={onDone}>Concluir edição</button>}</div>
 </article>;
}
function SkillList({f,tipo,onChange}){
 const list=f[tipo],limit=f.config[tipo],individual=f.config[tipo==='ativas'?'tetoAtiva':tipo==='passivas'?'tetoPassiva':'tetoPX'];
 const [editing,setEditing]=useState(null);
 const title=tipo==='ativas'?'Habilidades ativas':tipo==='passivas'?'Passivas de combate':'Técnicas de exploração';
 const calc=tipo==='ativas'?custoAtiva:tipo==='passivas'?custoPassiva:custoExploracao;
 return <section className="iu-list"><div className="iu-list-head"><div><h3>{title}</h3><small>{list.length} / {limit} espaços · teto individual {individual} {tipo==='exploracao'?'PX':'PC'}</small></div><button className="iu-button" disabled={list.length>=limit} onClick={()=>{setEditing(list.length);onChange([...list,habilidade(tipo==='passivas'?'passiva':tipo==='exploracao'?'exploracao':'ativa')]);}}>＋ Adicionar</button></div>
  {!list.length&&<div className="iu-empty">Nenhuma técnica criada. Use Adicionar para começar.</div>}
  <div className="iu-skill-selector">{list.map((h,i)=><button key={i} aria-pressed={editing===i} onClick={()=>setEditing(editing===i?null:i)}><span>{i+1}. {h.nome||'Nova habilidade'}</span><small>{calc(h)} {tipo==='exploracao'?'PX':'PC'} {editing===i?'▴':'▾'}</small></button>)}</div>
  {editing!==null&&list[editing]&&<Habilidade key={editing} h={list[editing]} tipo={tipo} index={editing} teto={individual} restante={tipo==='exploracao'?f.config.px-totais(f).px:f.config.pc-totais(f).pc} onDone={()=>setEditing(null)} update={next=>onChange(list.map((a,j)=>editing===j?next:a))} remove={()=>{onChange(list.filter((_,j)=>j!==editing));setEditing(null);}}/>}
 </section>;
}
function Resumo({f}){
 const e=recursosFinais(f),t=totais(f);
 const rows=[['Ambientação',f.ambientacao],['Manifestação / poder',f.manifestacao],['Conceito',f.conceito],['Histórico',f.historia],['Objetivo',f.objetivo],['Motivações',f.motivacoes],['Aprendizados',f.aprendizados],['Relações',f.relacoes],['Desvantagens narrativas',f.desvantagens],['Equipamentos',f.equipamentos]];
 return <article className="iu-paper" id="impeto-ficha-final">
  <div className="iu-paper-brand">✦ ÍMPETO RPG 1.0 · FICHA DE PERSONAGEM · PLAYTEST</div>
  <div className="iu-paper-identity">{f.foto&&<img src={f.foto} alt="Retrato"/>}<div><h2>{f.nome||'Personagem sem nome'}</h2><p>{[f.ambientacao,f.config.talento&&f.arquetipo,f.manifestacao].filter(Boolean).join(' · ')||'Sistema de RPG universal'}</p></div></div>
  <div className="iu-paper-stats">{[['HP máximo',e.hp],['EN de referência',e.en],['CA Base',e.ca],['Ataque Base',e.dados+'d6+'+e.fixo],['Regeneração',e.regen+'/rodada']].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
  <h3>Atributos</h3><div className="iu-paper-attrs">{ATRIBUTOS.map(n=><div key={n}><span>{n}</span><b>{f.atributos[n]}</b></div>)}</div>
  <h3>Perícias</h3><div className="iu-paper-skills">{PERICIAS.map(n=><div key={n}><span>{n}</span><b>+{f.pericias[n]*2}</b></div>)}</div>
  <h3>Escolhas e vantagens</h3>{f.config.talento&&f.arquetipo&&<p><strong>{f.arquetipo} — {f.talento}</strong><br/>{TALENTOS[f.arquetipo]?.[f.talento]}</p>}{f.vantagens.map(v=><p key={v}><strong>{v}</strong><br/>{VANTAGENS[v]}</p>)}{f.config.derivacao&&f.derivacao.tipo&&<p>Derivação D01: {f.derivacao.tipo} · {f.derivacao.atributo}. {f.derivacao.justificativa}</p>}
  <h3>Ataque básico — {f.ataqueNome}</h3><p>{e.dados}d6+{e.fixo}. {f.ataqueDescricao}</p>
  {['ativas','passivas','exploracao'].map(tipo=><section key={tipo}><h3>{tipo==='ativas'?'Habilidades ativas':tipo==='passivas'?'Passivas':'Técnicas de exploração'}</h3>{!f[tipo].length&&<p>Não cadastradas.</p>}{f[tipo].map((h,i)=><div className="iu-paper-tech" key={i}><h4>{h.nome||'Sem nome'} · {tipo==='ativas'?custoAtiva(h)+' PC':tipo==='passivas'?custoPassiva(h)+' PC':custoExploracao(h)+' PX'}</h4><p>{tipo==='exploracao'?h.classe+' · '+h.alcance+' · '+h.duracao+(h.automatica?' · automática':' · '+h.usos+' uso(s)/cena'):(EFEITOS[h.efeito]||h.efeito)+' · '+(['dano','cura','escudo','mitigacao'].includes(h.efeito)?h.quantidade+'d'+h.dado+'+'+h.fixo:'')+' · '+(tipo==='passivas'?h.usos+' uso(s)/combate':h.ativacao+' · '+h.alvos+' alvo(s)'+(h.distante?' · distante':'')+(h.rodadasExtras?' · '+h.rodadasExtras+' rodadas extras':''))}</p><p><strong>Uso:</strong> {h.custoAlternativo||((tipo==='passivas'?0:tipo==='ativas'?energiaAtiva(h):energiaExploracao(h))??'A definir')+' EN'}</p><p>{h.descricao}</p>{h.gatilho&&<p>Gatilho: {h.gatilho}</p>}{h.teste&&<p>Resolução: {h.teste}</p>}{h.limites&&<p>Limites: {h.limites}</p>}</div>)}</section>)}
  <h3>Histórico e identidade</h3>{rows.filter(([,v])=>v).map(([k,v])=><p key={k}><strong>{k}:</strong> {v}</p>)}
  <h3>Orçamentos de criação</h3><p>{Object.keys(t).map(k=>k.toUpperCase()+' '+t[k]+'/'+f.config[k]).join(' · ')}</p>
  <footer>Ímpeto RPG 1.0 · Edição de playtest · Valores de referência configuráveis e sujeitos à aprovação do mestre.</footer>
 </article>;
}
function carregar(){try{const s=localStorage.getItem(STORAGE);return s?importar(JSON.parse(s)):novaFicha()}catch{return novaFicha()}}
function App(){
 const [f,setF]=useState(carregar),[tab,setTab]=useState(0),[notice,setNotice]=useState(''),[saved,setSaved]=useState(true);
 const [fichaId,setFichaId]=useState(EDIT_ID),[carregando,setCarregando]=useState(Boolean(EDIT_ID)),[salvando,setSalvando]=useState(false);
 const [cap,setCap]=useState('atributos'),[escala,setEscala]=useState(null),[secaoEscala,setSecaoEscala]=useState('pontos');
 const dialogRef=useRef(null);
 const abrirEscala=()=>{setEscala({...f.config});setSecaoEscala('pontos');};
 useEffect(()=>{if(escala&&!dialogRef.current.open)dialogRef.current.showModal();},[escala]);
 const fecharEscala=()=>{dialogRef.current?.close();setEscala(null);};
 const fileRef=useRef(null);
 const update=(key,value)=>setF(prev=>({...prev,[key]:value}));
 const cfg=(key,value)=>setEscala(prev=>({...prev,[key]:value}));
 const rec=(key,value)=>setF(prev=>({...prev,recursos:{...prev.recursos,[key]:value}}));
 const deriv=(key,value)=>setF(prev=>({...prev,derivacao:{...prev.derivacao,[key]:value}}));
 const field=(key,label,area=false,placeholder='')=><Field label={label} value={f[key]} onChange={v=>update(key,v)} area={area} placeholder={placeholder}/>;
 const t=totais(f),e=recursosFinais(f),issues=revisar(f);
 useEffect(()=>{if(!EDIT_ID)return;let ativo=true;void buscarFicha(EDIT_ID).then(r=>{if(!ativo)return;if(r?.dados.impeto?.escala!=='universal-v1')throw Error('Ficha universal não encontrada.');const base=importar(r.dados.impeto.origem);if(/^data:image\/(png|jpeg|webp);base64,/i.test(r.dados.photo||''))base.foto=r.dados.photo;try{const draft=JSON.parse(localStorage.getItem(STORAGE+':'+EDIT_ID)||'null');setF(draft?.atualizadoEm>r.atualizadoEm?importar(draft.ficha):base);}catch{setF(base);}setNotice('Editando '+r.nome+' na biblioteca.');}).catch(e=>{if(ativo){setNotice(e.message);setFichaId(null);}}).finally(()=>{if(ativo)setCarregando(false)});return()=>{ativo=false};},[]);
 useEffect(()=>{if(carregando)return;try{localStorage.setItem(fichaId?STORAGE+':'+fichaId:STORAGE,JSON.stringify(fichaId?{atualizadoEm:new Date().toISOString(),ficha:f}:f));setSaved(true)}catch{setSaved(false)}},[f,fichaId,carregando]);
 async function salvarPortal(voltar=false){
  if(salvando||carregando)return;
  if(!f.nome.trim()){setNotice('Preencha o nome antes de salvar na biblioteca.');navigate(0);return;}
  if(issues.length&&!window.confirm('Esta ficha contém '+issues.length+' pendência(s). Salvar como ficha em revisão para o mestre conferir?')){navigate(TABS.length-1);return;}
  setSalvando(true);
  try{
   const anterior=fichaId?await buscarFicha(fichaId):undefined;
   if(fichaId&&anterior?.dados.impeto?.escala!=='universal-v1')throw Error('Ficha não encontrada ou incompatível.');
   const dados=converterUniversal(f);
   const prev=anterior?.dados;
   const registro=await salvarOuAtualizarFicha({...prev,...dados,...(prev?{papel:prev.papel,temTokenPadrao:prev.temTokenPadrao,tokenPadraoAnimado:prev.tokenPadraoAnimado,retratoAjuste:prev.retratoAjuste,...(prev.photo?.startsWith('data:image/gif;')&&f.foto===(anterior.dados.impeto.origem.foto||'')?{photo:prev.photo}:{}),basicIcon:prev.basicIcon,passiveIcon:prev.passiveIcon,skills:dados.skills.map((h,i)=>({...h,icon:prev.skills?.[i]?.icon})),hpCurrent:Math.min(prev.hpCurrent,dados.hpMax),manaCurrent:prev.manaCurrent}: {})},fichaId||undefined);
   setFichaId(registro.id);history.replaceState(null,'','/criador/?ficha='+encodeURIComponent(registro.id));try{localStorage.removeItem(STORAGE);localStorage.removeItem(STORAGE+':'+registro.id);}catch{}
   setNotice('Ficha '+registro.nome+' salva na biblioteca.'+(issues.length?' Aguardando revisão do mestre.':''));
   if(voltar)location.assign('/personagens/');
  }catch(e){setNotice(e.message||'Não foi possível salvar a ficha.');}finally{setSalvando(false);}
 }
 function desvincularEdicao(){setFichaId(null);history.replaceState(null,'','/criador/');}

 const navigate=i=>{setTab(i);window.scrollTo({top:0,behavior:'auto'});};
 async function loadFile(file){
  if(!file)return;
  try{if(file.size>4000000)throw Error('JSON acima do limite de 4 MB.');const data=importar(JSON.parse(await file.text()));desvincularEdicao();setF(data);setNotice('Ficha importada para edição como novo personagem.');navigate(0)}catch(e){setNotice(e.message||'Não foi possível importar.')}
 }
 async function photo(file){
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1400000){setNotice('Escolha PNG, JPEG ou WebP de até 1,4 MB.');return;}
  const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==='string')update('foto',reader.result)};reader.onerror=()=>setNotice('Falha ao ler imagem.');reader.readAsDataURL(file);
 }
 function exportar(){
  const url=URL.createObjectURL(new Blob([JSON.stringify(f,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='Impeto_'+safeFile(f.nome)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setNotice(issues.length?'Rascunho JSON exportado. Ainda há pendências na revisão.':'Ficha JSON exportada.');
 }
 function imprimir(){navigate(TABS.length-1);setTimeout(()=>window.print(),100);}
 if(carregando)return <main className="iu-panel"><p>Carregando ficha da biblioteca…</p></main>;
 return <div className="iu-app">
  <header className="iu-header"><a href="/personagens/">← Personagens do Portal</a><div className="iu-brand"><span>✦</span> ÍMPETO <small>RPG</small></div><button className="iu-button iu-quiet iu-scale-button" onClick={abrirEscala}>⚙ Escala de poder</button></header>
  <div className="iu-shell">
   <section className="iu-workbar"><div className="iu-work-title"><div className="iu-kicker">ÍMPETO RPG 1.0 · EDIÇÃO DE PLAYTEST</div><h1>Criador de personagens</h1><div className="iu-draft"><strong>{f.nome||'Novo personagem'}</strong><span>{saved?'· Rascunho salvo':'· Armazenamento indisponível'}</span></div></div><div className="iu-actions"><button className="iu-button iu-quiet" onClick={()=>{if(window.confirm('Iniciar nova ficha? Exporte o rascunho atual antes de apagar, se quiser preservá-lo.')){desvincularEdicao();setF(novaFicha());navigate(0);setCap('atributos');setNotice('Nova ficha iniciada.')}}}>＋ Nova ficha</button><button className="iu-button" onClick={()=>fileRef.current?.click()}>↥ Importar JSON</button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e=>{void loadFile(e.target.files?.[0]);e.target.value=''}}/><button className="iu-button" onClick={exportar}>↓ Exportar JSON</button><button className="iu-button" onClick={imprimir}>Salvar PDF</button><button className="iu-button iu-primary" disabled={salvando} onClick={()=>void salvarPortal(false)}>{salvando?'Salvando…':fichaId?'Atualizar ficha':'Salvar no Portal'}</button><button className="iu-button" disabled={salvando} onClick={()=>void salvarPortal(true)}>Salvar e voltar</button></div></section>
   {notice&&<p className="iu-message" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Fechar aviso">×</button></p>}
   <div className="iu-budgets">{['pa','pr','pt','pc','px'].map(k=><Saldo key={k} code={k.toUpperCase()} used={t[k]} max={f.config[k]}/>)}</div>
   <nav className="iu-tabs" aria-label="Etapas da criação">{TABS.map((n,i)=><button key={n} aria-current={tab===i?'step':undefined} onClick={()=>navigate(i)}><span>{String(i+1).padStart(2,'0')}</span>{n}</button>)}</nav>
   <div className="iu-layout"><main className="iu-panel">
   {tab===0&&<><Heading eyebrow="01 · O PERSONAGEM" title="Identidade e conceito" description="O personagem começa como uma ideia, antes dos números. Nenhuma ambientação é obrigatória."/><div className="iu-portrait-row"><div className="iu-portrait">{f.foto?<img src={f.foto} alt="Retrato do personagem"/>:<span>✧</span>}</div><div className="iu-portrait-actions"><label className="iu-button">Escolher retrato<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>void photo(e.target.files?.[0])}/></label>{f.foto&&<button className="iu-button iu-quiet" onClick={()=>update('foto','')}>Remover retrato</button>}</div></div><div className="iu-grid">{field('nome','Nome do personagem',false,'Ex.: Selene')}{field('ambientacao','Ambientação / campanha',false,'Fantasia, ficção científica, mistério…')}{field('manifestacao','Manifestação / especialidade',false,'Magia, tecnologia, espada, medicina…')}{field('conceito','Conceito')}</div>{field('historia','Histórico e trajetória',true)}<div className="iu-grid">{field('objetivo','Objetivos',true)}{field('motivacoes','Motivações',true)}</div><details className="iu-details"><summary>Detalhes narrativos e equipamentos</summary><div className="iu-grid">{field('aprendizados','Aprendizados',true)}{field('relacoes','Relações e vínculos',true)}{field('desvantagens','Desvantagens narrativas (não geram pontos)',true)}{field('equipamentos','Equipamentos e observações',true)}</div></details></>}
   {tab===1&&<><Heading eyebrow="02 · CAPACIDADES" title="Capacidades do personagem" description="Testes gerais: 1d20 + atributo pertinente + bônus de perícia. A abordagem determina o atributo."/><nav className="iu-subtabs" aria-label="Capacidades">{[["atributos","Atributos"],["pericias","Perícias"],["escolhas","Arquétipo e vantagens"]].map(([k,label])=><button key={k} type="button" aria-pressed={cap===k} onClick={()=>setCap(k)}>{label}</button>)}</nav>{cap==='atributos'&&<><div className="iu-attrs">{ATRIBUTOS.map(n=><div className="iu-attr" key={n}><Num label={n} value={f.atributos[n]} min={f.config.baseAtributo} max={Math.max(f.config.baseAtributo,f.config.tetoAtributo)} onChange={v=>update('atributos',{...f.atributos,[n]:v})}/><small>{custoAtributo(f.atributos[n],f.config.baseAtributo)} PA</small></div>)}</div><p className="iu-note">Os custos aumentam progressivamente conforme o valor do atributo. Use a escala da campanha para configurar a base e o teto.</p></>}{cap==='pericias'&&<><h3>Perícias</h3><div className="iu-pergroups">{pairs(GRUPOS).map(([group,names])=><section className="iu-pergroup" key={group}><h4>{group}</h4><div className="iu-grid">{names.map(n=><Select key={n} label={n} value={f.pericias[n]} onChange={v=>update('pericias',{...f.pericias,[n]:v})} number options={[[0,'Não treinado (+0)'],[1,'Treinado (+2 · 1 PT)'],...(f.config.especialista||f.pericias[n]===2?[[2,'Especialista (+4 · 2 PT)']]:[])]}/>)}</div></section>)}</div></>}{cap==='escolhas'&&<>{f.config.talento&&<><h3>Arquétipo e talento exclusivo</h3><div className="iu-grid"><Select label="Arquétipo" value={f.arquetipo} onChange={v=>setF(p=>({...p,arquetipo:v,talento:''}))} options={[[ '','Selecione'],...Object.keys(TALENTOS)]}/><Select label="Talento T02" value={f.talento} onChange={v=>update('talento',v)} options={[[ '','Selecione'],...Object.keys(TALENTOS[f.arquetipo]||{})]}/></div>{f.talento&&<p className="iu-note">{TALENTOS[f.arquetipo]?.[f.talento]}</p>}</>}<h3>Vantagens universais · {f.vantagens.length}/{f.config.vantagens}</h3><div className="iu-advantages">{pairs(VANTAGENS).map(([v,d])=><label key={v}><input type="checkbox" checked={f.vantagens.includes(v)} disabled={!f.vantagens.includes(v)&&f.vantagens.length>=f.config.vantagens} onChange={ev=>update('vantagens',ev.target.checked?[...f.vantagens,v]:f.vantagens.filter(a=>a!==v))}/><span><b>{v}</b><small>{d}</small></span></label>)}</div></>}</>}
   {tab===2&&<><Heading eyebrow="03 · RECURSOS" title="HP, Energia e combate" description="Distribua PR separadamente dos atributos. CA Base é comprada na criação e permanece fixa na campanha."/><div className="iu-resource-summary" aria-label="Recursos finais do personagem">{[['HP máximo',e.hp],['Energia de referência',e.en],['CA Base',e.ca],['Ataque Base',e.dados+'d6+'+e.fixo],['Regeneração/rodada','+'+e.regen]].map(([label,value])=><div key={label}><small>{label}</small><b>{value}</b></div>)}</div><div className="iu-grid"><Num label="PR em HP (+3 HP cada)" value={f.recursos.hp} onChange={v=>rec('hp',v)}/><Num label="PR em Energia (+5 EN cada)" value={f.recursos.en} onChange={v=>rec('en',v)}/><Select label="CA Base" value={f.recursos.ca} number onChange={v=>rec('ca',v)} options={Array.from({length:6},(_,i)=>i+8).filter(v=>v>=f.config.ca&&v<=f.config.tetoCa||v===f.recursos.ca).map(v=>[v,String(v)])}/><Select label="Dados d6 adicionais do Ataque Base" value={f.recursos.ataque} number onChange={v=>rec('ataque',v)} options={[[0,'Nenhum'],[1,'+1d6 (5 PR)'],[2,'+2d6 (13 PR total)']]}/><Select label="Regeneração adicional por rodada" value={f.recursos.regen} number onChange={v=>rec('regen',v)} options={[[0,'Nenhuma'],[1,'+1 EN (3 PR)'],[2,'+2 EN (9 PR total)']]}/></div><p className="iu-note">CA02: CA 8/9/10/11/12/13 custa 0/1/3/6/10/15 PR acumulados a partir de CA 8. Energia pode superar a referência; cura não supera HP máximo.</p>{f.config.derivacao&&<><h3>Derivação D01 (opcional)</h3><div className="iu-grid"><Select label="Derivação" value={f.derivacao.tipo} onChange={v=>deriv('tipo',v)} options={[[ '','Nenhuma'],['resistencia','Resistência (+3 HP)'],['reserva','Reserva (+5 EN)'],['potencia','Potência (+1 dano fixo)']]}/><Select label="Atributo de apoio (12+)" value={f.derivacao.atributo} onChange={v=>deriv('atributo',v)} options={[[ '','Selecione'],...ATRIBUTOS.filter(n=>f.atributos[n]>=12||n===f.derivacao.atributo)]}/></div>{f.derivacao.tipo&&<Field label="Justificativa" value={f.derivacao.justificativa} onChange={v=>deriv('justificativa',v)} area/>}</>}<h3>Identidade do ataque básico</h3>{field('ataqueNome','Nome do ataque básico')}{field('ataqueDescricao','Descrição',true)}</>}
   {tab===3&&<><Heading eyebrow="04 · PONTOS DE COMBATE" title="Construtor de combate" description="Ativas e passivas compartilham PC. Os preços H06/H04.1 são referências candidatas de playtest; efeitos especiais precisam da avaliação do mestre."/><SkillList f={f} tipo="ativas" onChange={v=>update('ativas',v)}/><SkillList f={f} tipo="passivas" onChange={v=>update('passivas',v)}/><p className="iu-note">Neste editor inicial estão os efeitos com tabela curta do livro. Outros buffs, debuffs, múltiplos componentes e poderes extraordinários precisam de avaliação específica; não são precificados automaticamente.</p></>}
   {tab===4&&<><Heading eyebrow="05 · PONTOS DE EXPLORAÇÃO" title="Construtor de exploração" description="PX compra capacidades especiais, não atos cotidianos. Ações de exploração não geram ações extras nem substituem o orçamento de combate."/><SkillList f={f} tipo="exploracao" onChange={v=>update('exploracao',v)}/><p className="iu-note">Classes: Pontual 4 PX, Especializada 8 PX, Complexa 12 PX, Ampla 18 PX e Extraordinária 28 PX. Alcance, alvo, duração e repetição aumentam o preço; resultados amplos exigem aprovação.</p></>}
   {tab===5&&<><Heading eyebrow="06 · CONFERÊNCIA" title="Revise a sua ficha" description="Confirme os orçamentos, as escolhas e as técnicas com o mestre. A ficha é um documento de playtest."/><div className={issues.length?'iu-review-alert':'iu-review-ok'}><h3>{issues.length?issues.length+' pendência(s) de criação':'Nenhuma pendência detectada pelos cálculos'}</h3>{issues.length?<ul>{issues.map((s,i)=><li key={i}>{s}</li>)}</ul>:<p>Os limites automáticos foram respeitados. A aprovação final das habilidades continua sendo do mestre.</p>}</div><Resumo f={f}/></>}
   <div className="iu-bottom"><button className="iu-button iu-quiet" disabled={tab===0} onClick={()=>navigate(tab-1)}>← Anterior</button><span>{tab+1} de {TABS.length}</span>{tab<TABS.length-1?<button className="iu-button iu-primary" onClick={()=>navigate(tab+1)}>Continuar →</button>:<button className="iu-button iu-primary" disabled={salvando} onClick={()=>void salvarPortal(true)}>Salvar no Portal e voltar</button>}</div>
   </main></div>
   <footer className="iu-footer">✦ Ímpeto RPG 1.0 — Sistema de RPG Universal · Edição de playtest · Portal do Mestre</footer>
  </div>
  <dialog ref={dialogRef} className="iu-scale-dialog" onCancel={()=>setEscala(null)} onClose={()=>setEscala(null)} aria-labelledby="iu-scale-title">
  {escala&&<div className="iu-scale-inner"><header><div><small className="iu-kicker">CONFIGURAÇÃO DA CAMPANHA</small><h2 id="iu-scale-title">Escala de poder</h2><p>Defina os valores iniciais e os limites antes de criar os personagens.</p></div><button className="iu-button iu-quiet" onClick={fecharEscala} aria-label="Fechar">×</button></header>
  <nav className="iu-subtabs" aria-label="Configurações da escala">{[['pontos','Pontos e atributos'],['recursos','Recursos iniciais'],['habilidades','Habilidades e módulos']].map(([k,label])=><button key={k} aria-pressed={secaoEscala===k} onClick={()=>setSecaoEscala(k)}>{label}</button>)}</nav>
  <div className="iu-scale-body"><div className="iu-grid iu-config-grid">{CONFIG.filter(([k])=>(secaoEscala==='pontos'?['baseAtributo','tetoAtributo','pa','pr','pt','pc','px']:secaoEscala==='recursos'?['hp','en','ca','tetoCa','dadosAtaque','fixoAtaque','regen']:['ativas','passivas','exploracao','tetoAtiva','tetoPassiva','tetoPX','vantagens']).includes(k)).map(([k,l])=><Num key={k} label={l} value={escala[k]} min={LIMITES[k][0]} max={LIMITES[k][1]} onChange={v=>cfg(k,v)}/>)}</div>
  {secaoEscala==='habilidades'&&<div className="iu-checks"><Check label="Arquétipos e talento T02" value={escala.talento} onChange={v=>cfg('talento',v)}/><Check label="Derivação D01" value={escala.derivacao} onChange={v=>cfg('derivacao',v)}/><Check label="Permitir Especialista na criação" value={escala.especialista} onChange={v=>cfg('especialista',v)}/></div>}
  <p className="iu-note">HP, Energia, orçamentos, potência e espaços não têm teto artificial. Atributos e CA02 conservam as faixas do módulo atual. As escolhas existentes são preservadas; a revisão avisa quando excedem os limites da campanha.</p>{(escala.baseAtributo>escala.tetoAtributo||escala.ca>escala.tetoCa)&&<p className="iu-note" role="alert">O teto precisa ser maior ou igual ao valor inicial.</p>}</div>
  <footer><button className="iu-button iu-quiet" onClick={()=>setEscala({...PADRAO})}>Restaurar padrão</button><div><button className="iu-button iu-quiet" onClick={fecharEscala}>Cancelar</button><button className="iu-button iu-primary" disabled={escala.baseAtributo>escala.tetoAtributo||escala.ca>escala.tetoCa} onClick={()=>{setF(p=>({...p,config:{...escala}}));fecharEscala();setNotice('Escala de poder atualizada. Confira os pontos e a revisão.');}}>Aplicar escala</button></div></footer></div>}
  </dialog>
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
