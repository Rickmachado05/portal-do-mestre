
(()=>{'use strict';
const ALL_DICE_TYPES=[4,6,8,10,12,20,100],SZ=512,$=id=>document.getElementById(id), PALETTE=['#3d1822','#b73e34','#171a29','#d1a15c','#27637c','#76bfd0','#3d5741','#988962','#714678','#edb9cc','#ede0c9'];
const state={type:6,face:1,material:'obsidiana',base:'#3d1822',tool:'brush',stamp:'fire',glyph:'',painting:false,previous:null,faces:new Map(),history:new Map(),future:new Map(),borderStyle:'nenhuma',borderColor:'#d9aa70',borderWidth:15,numberStyle:'padrao',numberFont:'cerimonial',numberColor:'#ffe5b5',numberSize:100,realValueHint:true,numberOverrides:new Map(),themeBackup:null};
const drafts=new Map();
let hxEditingCollectionId = new URLSearchParams(location.search).get('collection');
let typeChanging=false;
const faceCount = type => type===100?10:type;
const faceValue = n => state.type===100?(n===10?0:n*10):n;
const numberStandard = n => state.type===100 && n===10?'00':String(faceValue(n));
const bg=$('textureCanvas'),bctx=bg.getContext('2d'); const paint=$('paintCanvas'),pctx=paint.getContext('2d',{willReadFrequently:true}); const borderLayer=$('borderCanvas'),edgeCtx=borderLayer.getContext('2d'); const numberLayer=$('numberCanvas'),numberCtx=numberLayer.getContext('2d');
function cv(){const c=document.createElement('canvas');c.width=c.height=SZ;return c;}
function faceCanvas(n){if(!state.faces.has(n))state.faces.set(n,cv());return state.faces.get(n);}
function hex(v){return /^#[0-9a-fA-F]{6}$/.test(v)?v.toLowerCase():null;}
function rgba(h,a){const x=h.replace('#','');return `rgba(${parseInt(x.slice(0,2),16)},${parseInt(x.slice(2,4),16)},${parseInt(x.slice(4,6),16)},${a})`;}
function lighten(hex,s){const v=hex.replace('#','');return '#'+[0,2,4].map(i=>Math.min(255,Math.max(0,parseInt(v.slice(i,i+2),16)+s)).toString(16).padStart(2,'0')).join('');}
function rng(seed){return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}
function drawBackground(ctx,n){const r=rng(98471+n*131+state.material.length*59),mat=state.material;ctx.clearRect(0,0,SZ,SZ);ctx.fillStyle=state.base;ctx.fillRect(0,0,SZ,SZ);
const gradient=ctx.createLinearGradient(0,0,510,510);gradient.addColorStop(0,rgba('#ffffff',mat==='metal'?.32:.15));gradient.addColorStop(.5,rgba('#000000',.06));gradient.addColorStop(1,rgba('#000000',mat==='metal'?.48:.27));ctx.fillStyle=gradient;ctx.fillRect(0,0,SZ,SZ);
if(mat==='liso')return;
if(mat==='pergaminho'){ctx.fillStyle=rgba('#fff7ce',.29);ctx.fillRect(0,0,SZ,SZ);}
let count=mat==='pedra'?2600:mat==='sangue'?110:mat==='metal'?1400:mat==='pergaminho'?1700:1650;
for(let i=0;i<count;i++){const x=r()*SZ,y=r()*SZ,rad=mat==='pedra'?r()*3.8:mat==='sangue'?r()*5: r()*2.2;ctx.globalAlpha=mat==='sangue'?.37:(.06+r()*.13);ctx.fillStyle=mat==='sangue'?'#b0080c':r()>.48?'#faf0df':'#000';ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
if(mat==='obsidiana'||mat==='pedra'){for(let j=0;j<(mat==='pedra'?17:29);j++){let x=r()*SZ,y=r()*SZ;ctx.beginPath();ctx.moveTo(x,y);for(let k=0;k<4;k++){x+=r()*65-32;y+=r()*65-32;ctx.lineTo(x,y);}ctx.strokeStyle=mat==='pedra'?rgba('#15100d',.15):rgba('#e2a39d',.08);ctx.lineWidth=1+r()*2;ctx.stroke();}}
if(mat==='metal'){for(let i=0;i<SZ;i+=3){ctx.strokeStyle=rgba(i%9?'#ffffff':'#080b10',.045);ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(SZ,i-38);ctx.stroke();}}
if(mat==='sangue'){for(let i=0;i<21;i++){const x=r()*SZ,y=r()*SZ;ctx.fillStyle=rgba('#6a0209',.2+r()*.36);ctx.beginPath();ctx.arc(x,y,r()*32+4,0,7);ctx.fill();}}
}
function drawBorder(ctx){
 const st=state.borderStyle, w=state.borderWidth, col=state.borderColor;
 if(st==='nenhuma')return;
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 const inset=22+w/2;
 const edgeRect=(i,l=1)=>{ctx.lineWidth=l;ctx.strokeRect(i,i,SZ-2*i,SZ-2*i);};
 if(st==='simples'){
  ctx.strokeStyle=col;edgeRect(inset,w);
  ctx.strokeStyle=rgba('#ffffff',.27);edgeRect(inset+w*.30,1.5);
 }else if(st==='dupla'){
  ctx.strokeStyle=col;edgeRect(inset,w*.65);edgeRect(inset+w*1.8,Math.max(2,w*.32));
  ctx.fillStyle=col;
  for(const [x,y] of [[inset,inset],[SZ-inset,inset],[inset,SZ-inset],[SZ-inset,SZ-inset]]){ctx.beginPath();ctx.arc(x,y,Math.max(3,w*.52),0,Math.PI*2);ctx.fill();}
 }else if(st==='metal'){
  ctx.strokeStyle=rgba('#000000',.54);edgeRect(inset-w*.24,w*1.5);
  const g=ctx.createLinearGradient(0,0,SZ,SZ);g.addColorStop(0,lighten(col,84));g.addColorStop(.33,col);g.addColorStop(.66,lighten(col,-65));g.addColorStop(1,lighten(col,36));
  ctx.strokeStyle=g;edgeRect(inset,w);
  ctx.strokeStyle=rgba('#ffffff',.52);edgeRect(inset+w*.45,Math.max(1,w*.13));
 }else if(st==='runa'){
  ctx.strokeStyle=col;edgeRect(inset,Math.max(2,w*.48));
  ctx.fillStyle=col;ctx.font=`${Math.round(12+w*.65)}px Georgia,serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  const symbols=['✧','◇','✦','⋄','❖','✧'];
  for(let j=0;j<6;j++){const x=58+j*(SZ-116)/5;ctx.fillText(symbols[j],x,inset+w*1.3);ctx.fillText(symbols[5-j],x,SZ-inset-w*1.3);}
  ctx.save();ctx.translate(SZ/2,SZ/2);ctx.rotate(Math.PI/2);
  for(let j=1;j<5;j++){const x=-SZ/2+58+j*(SZ-116)/5;ctx.fillText('✧',x,-SZ/2+inset+w*1.3);ctx.fillText('◇',x,SZ/2-inset-w*1.3);}ctx.restore();
 }else if(st==='fissura'){
  ctx.strokeStyle=col;ctx.setLineDash([w*2,w*.58,w*.7,w*1.4]);edgeRect(inset,Math.max(2,w*.65));ctx.setLineDash([]);
  ctx.strokeStyle=rgba(col,.75);ctx.lineWidth=Math.max(1.5,w*.17);
  for(const [x,y,sx,sy] of [[inset,inset,1,1],[SZ-inset,inset,-1,1],[inset,SZ-inset,1,-1],[SZ-inset,SZ-inset,-1,-1]]){
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+sx*w*1.8,y+sy*w*.7);ctx.lineTo(x+sx*w*1.35,y+sy*w*2.4);ctx.lineTo(x+sx*w*3,y+sy*w*3.2);ctx.stroke();
  }
 }
 ctx.restore();
}
function renderBorderLayer(){edgeCtx.clearRect(0,0,SZ,SZ);drawBorder(edgeCtx);}
const numericRoman=['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
const numeralsKanji=['','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十'];
const numeralsChina=['','壹','貳','參','肆','伍','陸','柒','捌','玖','拾','拾壹','拾貳','拾參','拾肆','拾伍','拾陸','拾柒','拾捌','拾玖','貳拾'];
const numeralsJapan=['','壱','弐','参','肆','伍','陸','漆','捌','玖','拾','拾壱','拾弐','拾参','拾肆','拾伍','拾陸','拾漆','拾捌','拾玖','弐拾'];
const decorativeRunes=['','ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛋ','ᛏ','ᛒ','ᛖ','ᛗ'];
const ritualGlyphs=['','✦','✧','❖','◈','☯','✺','✶','✷','✹','✸','✵','✻','✼','❂','❈','❉','✤','✥','✣','✢'];
function numberByStyle(n){
 const v=faceValue(n),digit=n;
 if(state.type===100 && v===0){
  if(state.numberStyle==='kanji')return '〇〇';
  if(state.numberStyle==='chines-formal'||state.numberStyle==='japones-formal')return '零零';
  if(state.numberStyle==='runas')return decorativeRunes[digit]||'ᛟ';
  if(state.numberStyle==='ritual')return ritualGlyphs[digit]||'◈';
  return state.numberStyle==='arabico-oriental'?'٠٠':state.numberStyle==='devanagari'?'००':'00';
 }
 const number=v;
 switch(state.numberStyle){
  case 'romano':{
   const parts=[[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
   let rest=number,result='';for(const [value,label] of parts){while(rest>=value){result+=label;rest-=value;}}return result;
  }
  case 'kanji':return state.type===100?(number===10?'十':'一二三四五六七八九'[number/10-1]+'十'):(numeralsKanji[number]||String(number));
  case 'chines-formal':return state.type===100?(number===10?'拾':'壹貳參肆伍陸柒捌玖'[number/10-1]+'拾'):(numeralsChina[number]||String(number));
  case 'japones-formal':return state.type===100?(number===10?'拾':'壱弐参肆伍陸漆捌玖'[number/10-1]+'拾'):(numeralsJapan[number]||String(number));
  case 'arabico-oriental':return String(number).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[+d]);
  case 'devanagari':return String(number).replace(/[0-9]/g,d=>'०१२३४५६७८९'[+d]);
  case 'runas':return decorativeRunes[digit]||String(number);
  case 'ritual':return ritualGlyphs[digit]||String(number);
  default:return String(number);
 }
}
function labelForFace(n){return state.numberOverrides.get(n)??numberByStyle(n);}
function numberingFont(){
 const fallback='"Noto Sans CJK JP", "Yu Gothic", "Microsoft YaHei", "Meiryo", "Segoe UI Symbol", "DejaVu Sans", sans-serif';
 switch(state.numberFont){
 case 'classico':return `Georgia, "Times New Roman", ${fallback}`;
 case 'moderno':return `"Segoe UI", Arial, ${fallback}`;
 case 'manuscrito':return `"Palatino Linotype", "Book Antiqua", Georgia, ${fallback}`;
 default:return `"Times New Roman", Georgia, ${fallback}`;
 }
}
function drawNumber(ctx,n){
 const label=labelForFace(n);if(!label)return;
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
 const family=numberingFont();const weight=state.numberFont==='moderno'?'700':'600';
 let size=Math.round(250*state.numberSize/100);
 ctx.font=`${weight} ${size}px ${family}`;
 const measured=Math.max(1,ctx.measureText(label).width);
 size=Math.max(22,Math.min(size,Math.floor(size*375/measured)));
 ctx.font=`${weight} ${size}px ${family}`;
 ctx.fillStyle=state.numberColor;ctx.shadowColor='#000000';ctx.shadowBlur=15;ctx.shadowOffsetY=5;
 ctx.fillText(label,256,258,390);
 const isSymbolic=label!==numberStandard(n);
 if(state.realValueHint&&isSymbolic){
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.fillStyle='rgba(0,0,0,.62)';ctx.beginPath();ctx.roundRect(402,419,75,60,13);ctx.fill();
  ctx.lineWidth=1.8;ctx.strokeStyle='rgba(255,255,255,.35)';ctx.stroke();
  ctx.font='bold 38px "Segoe UI",Arial,sans-serif';ctx.fillStyle='#fff3d6';ctx.fillText(numberStandard(n),439,450,60);
 }
 ctx.restore();
}
function renderNumberLayer(){numberCtx.clearRect(0,0,SZ,SZ);if($('showNums').checked)drawNumber(numberCtx,state.face);}
function syncNumberControls(){
 $('numberStyle').value=state.numberStyle;$('numberFont').value=state.numberFont;
 $('numberColor').value=state.numberColor;$('numberHex').value=state.numberColor;
 $('numberSize').value=state.numberSize;$('numberSizeLabel').textContent=state.numberSize+'%';
 $('realValueHint').checked=state.realValueHint;
 syncFaceNumberControl();
}
function syncFaceNumberControl(){
 $('editNumberFace').textContent=numberStandard(state.face);
 $('faceNumberCustom').value=state.numberOverrides.get(state.face)??'';
 const sample=numberByStyle(state.face);
 $('faceNumberCustom').placeholder=`Padrão atual: ${sample}`;
 $('numberExample').textContent=`Valor visual ${numberStandard(state.face)} → ${labelForFace(state.face)}. Deixe vazio para usar o estilo escolhido para o conjunto.`;
}
function setMessage(msg){$('status').textContent=msg;}
function snapshot(){return paint.toDataURL('image/png');}
function setFromData(data,canvas,cb){const c=canvas||paint,ctx=c.getContext('2d');ctx.clearRect(0,0,SZ,SZ);if(!data){cb?.();return;}const im=new Image();im.onload=()=>{ctx.drawImage(im,0,0,SZ,SZ);cb?.();};im.onerror=()=>{cb?.();};im.src=data;}
function saveCurrent(){const dest=faceCanvas(state.face),c=dest.getContext('2d');c.clearRect(0,0,SZ,SZ);c.drawImage(paint,0,0);}
function renderFaceList(){const list=$('faceList'),pick=$('facePick');list.innerHTML='';pick.innerHTML='';for(let i=1;i<=faceCount(state.type);i++){const b=document.createElement('button');b.type='button';b.textContent=state.numberOverrides.has(i)?`${numberStandard(i)} ✎`:numberStandard(i);b.className=state.face===i?'active':'';b.title=`Face ${numberStandard(i)}: ${labelForFace(i)}`;b.onclick=()=>selectFace(i);list.appendChild(b);const o=new Option('Face '+numberStandard(i),String(i),false,state.face===i);pick.append(o);} }
function selectFace(n,saveBefore=true){if(saveBefore)saveCurrent();state.face=n;const c=faceCanvas(n);pctx.clearRect(0,0,SZ,SZ);pctx.drawImage(c,0,0);$('faceTitle').textContent=numberStandard(n);syncFaceNumberControl();renderFaceList();drawBackground(bctx,n);renderBorderLayer();renderNumberLayer();updatePreview();setMessage('Editando face '+numberStandard(n)+' do D'+state.type+'.');}
function renderAll(){drawBackground(bctx,state.face);renderBorderLayer();renderNumberLayer();syncFaceNumberControl();renderFaceList();updatePreview();}
function composition(i,withNum=true){const c=cv(),ctx=c.getContext('2d');drawBackground(ctx,i);ctx.drawImage(faceCanvas(i),0,0);drawBorder(ctx);if(withNum)drawNumber(ctx,i);return c;}
function updatePreview(){const isD6=state.type===6;$('cube').style.display=isD6?'block':'none';$('flatPreview').style.display=isD6?'none':'block';$('previewMode').textContent=`D${state.type} · ${isD6?'3D ilustrativo':'face ilustrativa'}`;$('previewNote').textContent=isD6?'Gire o olhar: a prévia 3D é ilustrativa, não a física do Dice Box.':'Prévia ilustrativa da face selecionada. O dado 3D jogável continua no Dice Box.';
if(isD6){[1,6,3,4,2,5].forEach((num,k)=>{$('cube').children[k].style.backgroundImage=`url("${composition(num,$('showNums').checked).toDataURL('image/png')}")`;});}else{$('flatPreview').style.backgroundImage=`url("${composition(state.face,$('showNums').checked).toDataURL('image/png')}")`;$('flatPreview').firstElementChild.style.display='none';}}
let raf=0;function schedulePreview(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{saveCurrent();updatePreview();});}
function setTool(t){state.tool=t;document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));setMessage(t==='brush'?'Pincel selecionado.':t==='eraser'?'Borracha selecionada.':'Carimbo selecionado. Clique na face para aplicar.');}
function selectStamp(s){state.stamp=s;document.querySelectorAll('[data-stamp]').forEach(b=>b.classList.toggle('active',b.dataset.stamp===s));setTool('stamp');}
function brushSize(){return +$('brushSize').value;}function opacity(){return +$('brushOpacity').value/100;}
function point(ev){const rect=paint.getBoundingClientRect();return{x:(ev.clientX-rect.left)*SZ/rect.width,y:(ev.clientY-rect.top)*SZ/rect.height};}
function beginStroke(){const stack=state.history.get(state.face)||[];stack.push(snapshot());if(stack.length>20)stack.shift();state.history.set(state.face,stack);state.future.set(state.face,[]);}
function moveStroke(p0,p1){pctx.save();pctx.globalCompositeOperation=state.tool==='eraser'?'destination-out':'source-over';pctx.globalAlpha=state.tool==='eraser'?1:opacity();pctx.lineWidth=brushSize();pctx.lineCap='round';pctx.lineJoin='round';pctx.strokeStyle=$('brushColor').value;pctx.beginPath();pctx.moveTo(p0.x,p0.y);pctx.lineTo(p1.x,p1.y);pctx.stroke();pctx.restore();}
function drawStamp(x,y){const size=brushSize()*1.55,color=$('brushColor').value;const kind=state.stamp;pctx.save();pctx.globalAlpha=opacity();pctx.translate(x,y);pctx.fillStyle=color;pctx.strokeStyle=color;pctx.lineWidth=Math.max(2,size/13);pctx.lineJoin='round';pctx.lineCap='round';
if(kind==='heart'){pctx.beginPath();pctx.moveTo(0,size*.6);pctx.bezierCurveTo(-size*1.2,-size*.03,-size*.5,-size*.75,0,-size*.25);pctx.bezierCurveTo(size*.5,-size*.75,size*1.2,-size*.03,0,size*.6);pctx.fill();}
else if(kind==='star'){pctx.beginPath();for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,r=j%2?size*.33:size;const xx=Math.cos(a)*r,yy=Math.sin(a)*r;if(!j)pctx.moveTo(xx,yy);else pctx.lineTo(xx,yy);}pctx.closePath();pctx.fill();}
else if(kind==='fire'){pctx.beginPath();pctx.moveTo(0,-size);pctx.bezierCurveTo(size*.8,-size*.2,size*.75,size*.5,0,size);pctx.bezierCurveTo(-size*.8,size*.5,-size*.9,-size*.2,-size*.32,-size*.75);pctx.bezierCurveTo(-size*.15,-size*.1,size*.13,-size*.2,0,-size);pctx.fill();pctx.fillStyle=rgba('#1d1719',.8);pctx.beginPath();pctx.moveTo(0,-size*.2);pctx.quadraticCurveTo(size*.38,size*.45,0,size*.75);pctx.quadraticCurveTo(-size*.4,size*.45,0,-size*.2);pctx.fill();}
else if(kind==='earth'){pctx.beginPath();pctx.moveTo(0,-size);pctx.lineTo(size*.9,-size*.15);pctx.lineTo(size*.65,size*.75);pctx.lineTo(-size*.65,size*.75);pctx.lineTo(-size*.9,-size*.15);pctx.closePath();pctx.stroke();pctx.beginPath();pctx.moveTo(0,-size);pctx.lineTo(0,size*.75);pctx.moveTo(-size*.9,-size*.15);pctx.lineTo(size*.9,-size*.15);pctx.stroke();}
else if(kind==='water'||kind==='air'){for(let j=0;j<3;j++){const yy=(j-1)*size*.43;pctx.beginPath();pctx.moveTo(-size,yy);pctx.bezierCurveTo(-size*.45,yy-size*.6,size*.18,yy+size*.6,size,yy);pctx.stroke();}}
else if(kind==='blood'){const r=rng(Math.floor(x*211+y*13));pctx.beginPath();pctx.arc(0,0,size*.45,0,Math.PI*2);pctx.fill();for(let j=0;j<15;j++){const a=r()*Math.PI*2,dist=size*(.55+r()*.85),rad=size*(.035+r()*.18);pctx.beginPath();pctx.arc(Math.cos(a)*dist,Math.sin(a)*dist,rad,0,7);pctx.fill();}}
else {pctx.font=`${Math.round(size*1.7)}px serif`;pctx.textAlign='center';pctx.textBaseline='middle';pctx.fillText(kind==='glyph'?state.glyph:'𓂀',0,0);}
pctx.restore();}
paint.addEventListener('pointerdown',ev=>{if(ev.button!==undefined&&ev.button!==0)return;paint.setPointerCapture(ev.pointerId);beginStroke();state.painting=true;const p=point(ev);state.previous=p;if(state.tool==='stamp')drawStamp(p.x,p.y);else moveStroke(p,p);schedulePreview();});
paint.addEventListener('pointermove',ev=>{if(!state.painting||state.tool==='stamp')return;const p=point(ev);moveStroke(state.previous,p);state.previous=p;schedulePreview();});
const endStroke=()=>{if(!state.painting)return;state.painting=false;state.previous=null;saveCurrent();updatePreview();setMessage('Desenho atualizado na face '+state.face+'.');};paint.addEventListener('pointerup',endStroke);paint.addEventListener('pointercancel',endStroke);paint.addEventListener('lostpointercapture',endStroke);
function undoOrRedo(isRedo){const src=(isRedo?state.future:state.history).get(state.face)||[];if(!src.length)return setMessage(isRedo?'Nada para refazer.':'Nada para desfazer.');const dst=isRedo?state.history:state.future,arr=dst.get(state.face)||[];arr.push(snapshot());dst.set(state.face,arr);setFromData(src.pop(),paint,()=>{saveCurrent();updatePreview();});setMessage(isRedo?'Desenho refeito.':'Última alteração desfeita.');}
function downloadBlob(name,blob){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function slug(){return ($('designName').value.trim()||'dado').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w-]+/g,'-').slice(0,54).toLowerCase();}
function toData(){
 saveCurrent();const images={};
 for(let i=1;i<=faceCount(state.type);i++){
  const c=faceCanvas(i),rgba=c.getContext('2d').getImageData(0,0,SZ,SZ).data;
  let visible=false;for(let p=3;p<rgba.length;p+=4){if(rgba[p]){visible=true;break;}}
  if(visible)images[i]=c.toDataURL('image/png');
 }
 return{format:'hexatombe-dice-art',version:3,name:$('designName').value.trim()||`D${state.type} personalizado`,type:state.type,material:state.material,baseColor:state.base,border:{style:state.borderStyle,color:state.borderColor,width:state.borderWidth},brushColor:$('brushColor').value,showNumbers:$('showNums').checked,numbering:{style:state.numberStyle,font:state.numberFont,color:state.numberColor,size:state.numberSize,realValueHint:state.realValueHint,overrides:Object.fromEntries(state.numberOverrides)},faceValues:Array.from({length:faceCount(state.type)},(_,i)=>faceValue(i+1)),faceLabels:Array.from({length:faceCount(state.type)},(_,i)=>labelForFace(i+1)),artworkPNG:images,notes:state.type===100?'D100: faces de dezenas (10,20,...90,00); D10 é usado para as unidades.':'Arte por face física do Dice Box.'};
}
function safeData(d){
 if(!d||d.format!=='hexatombe-dice-art'||![1,2,3].includes(d.version)||!ALL_DICE_TYPES.includes(d.type)||!hex(d.baseColor)||!['obsidiana','liso','pedra','metal','pergaminho','sangue'].includes(d.material)||!d.artworkPNG||typeof d.artworkPNG!=='object'||Array.isArray(d.artworkPNG))throw Error('Este arquivo não é um dado compatível.');
 for(const [face,image] of Object.entries(d.artworkPNG)){if(!Number.isInteger(+face)||+face<1||+face>faceCount(d.type)||typeof image!=='string'||image.length>2400000||!image.startsWith('data:image/png;base64,'))throw Error('Imagem inválida na face '+face);}
 return d;
}
async function loadData(d){
 safeData(d);state.type=d.type;state.face=1;state.material=d.material;state.base=d.baseColor;
 const bd=d.border||{};state.borderStyle=['nenhuma','simples','dupla','metal','runa','fissura'].includes(bd.style)?bd.style:'nenhuma';state.borderColor=hex(bd.color||'')||'#d9aa70';state.borderWidth=Math.max(3,Math.min(40,Number(bd.width)||15));syncBorderControls();
 state.themeBackup=null;$('revertPreset').hidden=true;state.faces.clear();state.history.clear();state.future.clear();
 const nm=d.numbering||{};state.numberStyle=['padrao','romano','kanji','chines-formal','japones-formal','arabico-oriental','devanagari','runas','ritual'].includes(nm.style)?nm.style:'padrao';state.numberFont=['cerimonial','classico','moderno','manuscrito'].includes(nm.font)?nm.font:'cerimonial';state.numberColor=hex(nm.color||'')||'#ffe5b5';state.numberSize=Math.max(45,Math.min(150,Number(nm.size)||100));state.realValueHint=nm.realValueHint!==false;
 state.numberOverrides.clear();if(nm.overrides&&typeof nm.overrides==='object'){for(const [k,v] of Object.entries(nm.overrides)){const i=Number(k);if(Number.isInteger(i)&&i>=1&&i<=faceCount(d.type)&&typeof v==='string'&&v.trim()&&[...v].length<=18)state.numberOverrides.set(i,v.trim());}}
 syncNumberControls();$('designName').value=String(d.name||'Dado importado').slice(0,60);$('diceType').value=String(state.type);$('material').value=state.material;$('baseColor').value=state.base;$('baseHex').value=state.base;$('showNums').checked=d.showNumbers!==false;
 const color=hex(d.brushColor||'')||'#ffb35e';$('brushColor').value=color;$('brushHex').value=color;
 // Aguardar o carregamento das imagens antes de pintar a nova face.
 await Promise.all(Object.entries(d.artworkPNG).map(([key,data])=>new Promise(resolve=>setFromData(data,faceCanvas(+key),resolve))));
 selectFace(1,false);renderAll();
}
function newDie(type){
 return{format:'hexatombe-dice-art',version:3,type,name:`${$('collectionName').value.trim()||'Meu conjunto'} · D${type}`,material:'obsidiana',baseColor:'#3d1822',border:{style:'nenhuma',color:'#d9aa70',width:15},brushColor:'#ffb35e',showNumbers:true,numbering:{style:'padrao',font:'cerimonial',color:'#ffe5b5',size:100,realValueHint:true,overrides:{}},faceValues:Array.from({length:faceCount(type)},(_,i)=>type===100?((i+1)%10)*10:i+1),faceLabels:Array.from({length:faceCount(type)},(_,i)=>type===100?((i+1)%10?String((i+1)*10):'00'):String(i+1)),artworkPNG:{}};
}
function showSetTypes(){
 const holder=$('collectionTypes');holder.textContent='';
 for(const type of ALL_DICE_TYPES){const b=document.createElement('button');b.type='button';b.textContent='D'+type;b.className=(type===state.type?'active ':'')+(drafts.has(type)?'has-draft':'');b.title='Editar D'+type;b.onclick=()=>{void switchDie(type)};holder.append(b);}
 hxRenderQuickDice();
}
async function switchDie(type){
 if(typeChanging||!ALL_DICE_TYPES.includes(type))return;
 if(type===state.type){showSetTypes();return;}
 typeChanging=true;
 try{
  drafts.set(state.type,toData());
  await loadData(drafts.get(type)||newDie(type));
  showSetTypes();
  setMessage('D'+type+' aberto. As alterações anteriores permanecem neste conjunto.');
 }catch(e){setMessage('Falha ao trocar de dado: '+e.message)}
 finally{typeChanging=false;}
}
$('diceType').addEventListener('change',e=>{void switchDie(+e.target.value)});

$('facePick').addEventListener('change',e=>selectFace(+e.target.value));$('material').addEventListener('change',e=>{state.material=e.target.value;renderAll();});
function baseChange(v){const c=hex(v);if(!c)return;state.base=c;$('baseColor').value=c;$('baseHex').value=c;renderAll();}
function syncBorderControls(){
 $('borderStyle').value=state.borderStyle;$('borderColor').value=state.borderColor;$('borderHex').value=state.borderColor;$('borderWidth').value=state.borderWidth;$('borderWidthLabel').textContent=String(state.borderWidth);
}
function changeBorderColor(v){const c=hex(v);if(!c)return;state.borderColor=c;$('borderColor').value=c;$('borderHex').value=c;renderAll();}
$('borderStyle').addEventListener('change',e=>{state.borderStyle=e.target.value;renderAll();setMessage('Borda '+e.target.selectedOptions[0].text+' aplicada às faces.');});
$('borderColor').addEventListener('input',e=>changeBorderColor(e.target.value));
$('borderHex').addEventListener('change',e=>changeBorderColor(e.target.value));
$('borderWidth').addEventListener('input',e=>{state.borderWidth=+e.target.value;$('borderWidthLabel').textContent=e.target.value;renderAll();});
$('numberStyle').addEventListener('change',e=>{state.numberStyle=e.target.value;renderAll();setMessage('Numeração do conjunto: '+e.target.selectedOptions[0].text+'.');});
$('numberFont').addEventListener('change',e=>{state.numberFont=e.target.value;renderAll();});
function changeNumberColor(v){const c=hex(v);if(!c)return;state.numberColor=c;$('numberColor').value=c;$('numberHex').value=c;renderAll();}
$('numberColor').addEventListener('input',e=>changeNumberColor(e.target.value));
$('numberHex').addEventListener('change',e=>changeNumberColor(e.target.value));
$('numberSize').addEventListener('input',e=>{state.numberSize=+e.target.value;$('numberSizeLabel').textContent=e.target.value+'%';renderAll();});
$('realValueHint').addEventListener('change',e=>{state.realValueHint=e.target.checked;renderAll();});
$('faceNumberCustom').addEventListener('input',e=>{const v=e.target.value.trim();if(v)state.numberOverrides.set(state.face,v);else state.numberOverrides.delete(state.face);renderAll();});
$('clearNumberCustom').addEventListener('click',()=>{state.numberOverrides.delete(state.face);renderAll();setMessage('Glifo da face '+state.face+' restaurado para o estilo do conjunto.');});
$('baseColor').addEventListener('input',e=>baseChange(e.target.value));$('baseHex').addEventListener('change',e=>baseChange(e.target.value));
function brushChange(v){const c=hex(v);if(!c)return;$('brushColor').value=c;$('brushHex').value=c;}
$('brushColor').addEventListener('input',e=>brushChange(e.target.value));$('brushHex').addEventListener('change',e=>brushChange(e.target.value));
$('brushSize').addEventListener('input',e=>$('sizeLabel').textContent=e.target.value);$('brushOpacity').addEventListener('input',e=>$('opacityLabel').textContent=e.target.value+'%');
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));document.querySelectorAll('[data-stamp]').forEach(b=>b.addEventListener('click',()=>selectStamp(b.dataset.stamp)));
$('useGlyph').addEventListener('click',()=>{state.glyph=$('glyph').value.trim()||'✧';selectStamp('glyph');setMessage('Glifo personalizado selecionado: clique no dado.');});
const palette=$('palette');for(const color of PALETTE){const b=document.createElement('button');b.type='button';b.className='swatch';b.style.background=color;b.title='Aplicar cor '+color;b.addEventListener('click',()=>{baseChange(color);document.querySelectorAll('.swatch').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});palette.append(b);}document.querySelector('.swatch').setAttribute('aria-pressed','true');

const THEMES={
 fogo:{name:'Nação do Fogo',base:'#34141b',material:'obsidiana',brush:'#f4aa51',stamp:'fire',border:'metal',borderColor:'#e8a450',borderWidth:18},
 agua:{name:'Tribo da Água',base:'#214762',material:'metal',brush:'#adf2ff',stamp:'water',border:'dupla',borderColor:'#a7e8f0',borderWidth:14},
 terra:{name:'Reino da Terra',base:'#42563a',material:'pedra',brush:'#d9d096',stamp:'earth',border:'fissura',borderColor:'#c9bd82',borderWidth:19},
 ar:{name:'Nômades do Ar',base:'#c1a779',material:'pergaminho',brush:'#f4f0de',stamp:'air',border:'runa',borderColor:'#f4e7b8',borderWidth:14},
 sangue:{name:'Ritual sangrento',base:'#1b1520',material:'sangue',brush:'#b31424',stamp:'blood',border:'fissura',borderColor:'#ae1225',borderWidth:22},
 coracao:{name:'Corações',base:'#a35e88',material:'liso',brush:'#ffe1eb',stamp:'heart',border:'dupla',borderColor:'#ffe1eb',borderWidth:15},
 runa:{name:'Runas antigas',base:'#393c44',material:'pedra',brush:'#efd79d',stamp:'rune',border:'runa',borderColor:'#d1b77b',borderWidth:18}
};
function makeThemeBackup(){
 saveCurrent();const images={};
 for(let i=1;i<=faceCount(state.type);i++)images[i]=faceCanvas(i).toDataURL('image/png');
 return {images,type:state.type,name:$('designName').value,base:state.base,material:state.material,brush:$('brushColor').value,borderStyle:state.borderStyle,borderColor:state.borderColor,borderWidth:state.borderWidth,numbering:{style:state.numberStyle,font:state.numberFont,color:state.numberColor,size:state.numberSize,realValueHint:state.realValueHint,overrides:[...state.numberOverrides]}};
}
function applyTheme(){
 const preset=$('presetTheme').value, o=THEMES[preset];if(!o){setMessage('Tema não encontrado.');return;}
 state.themeBackup=makeThemeBackup();$('revertPreset').hidden=false;
 state.base=o.base;state.material=o.material;$('designName').value=o.name;
 $('baseColor').value=o.base;$('baseHex').value=o.base;$('material').value=o.material;brushChange(o.brush);
 state.borderStyle=o.border;state.borderColor=o.borderColor;state.borderWidth=o.borderWidth;syncBorderControls();
 state.faces.clear();state.history.clear();state.future.clear();
 const savedSize=$('brushSize').value,savedOpacity=$('brushOpacity').value,savedStamp=state.stamp;
 $('brushSize').value='50';$('brushOpacity').value='98';state.stamp=o.stamp;
 for(let i=1;i<=faceCount(state.type);i++){
   pctx.clearRect(0,0,SZ,SZ);
   drawStamp(107,110);drawStamp(407,400);
   if(preset==='sangue') {drawStamp(421,93);drawStamp(81,415);}
   else if(preset==='coracao') {drawStamp(405,105);drawStamp(107,405);}
   else if(preset==='runa') {drawStamp(402,104);drawStamp(106,404);}
   // Selo central discreto e transparente, por trás do número.
   pctx.save();pctx.globalAlpha=.20;pctx.translate(256,256);
   pctx.strokeStyle=o.brush;pctx.lineWidth=6;
   pctx.beginPath();pctx.arc(0,0,125,0,Math.PI*2);pctx.stroke();
   pctx.beginPath();pctx.arc(0,0,139,0,Math.PI*2);pctx.stroke();
   pctx.restore();
   const dest=faceCanvas(i),ctx=dest.getContext('2d');ctx.drawImage(paint,0,0);
 }
 $('brushSize').value=savedSize;$('sizeLabel').textContent=savedSize;
 $('brushOpacity').value=savedOpacity;$('opacityLabel').textContent=savedOpacity+'%';state.stamp=savedStamp;
 state.face=1;selectFace(1,false);renderAll();
 setMessage('✓ Tema '+o.name+' aplicado a todas as '+state.type+' faces, incluindo bordas. Use “Restaurar conjunto anterior” para desfazer.');
}
$('applyPreset').addEventListener('click',applyTheme);
$('revertPreset').addEventListener('click',()=>{
 const b=state.themeBackup;if(!b)return;
 state.type=b.type;state.face=1;state.base=b.base;state.material=b.material;
 state.borderStyle=b.borderStyle;state.borderColor=b.borderColor;state.borderWidth=b.borderWidth;if(b.numbering){state.numberStyle=b.numbering.style;state.numberFont=b.numbering.font;state.numberColor=b.numbering.color;state.numberSize=b.numbering.size;state.realValueHint=b.numbering.realValueHint;state.numberOverrides=new Map(b.numbering.overrides);}syncNumberControls();
 $('diceType').value=b.type;$('designName').value=b.name;$('material').value=b.material;
 $('baseColor').value=b.base;$('baseHex').value=b.base;brushChange(b.brush);syncBorderControls();
 state.faces.clear();state.history.clear();state.future.clear();
 let remaining=Object.keys(b.images).length;
 if(!remaining){selectFace(1,false);renderAll();setMessage('Conjunto anterior restaurado.');}
 for(const [key,img] of Object.entries(b.images)){setFromData(img,faceCanvas(+key),()=>{if(!--remaining){selectFace(1,false);renderAll();setMessage('Conjunto anterior restaurado.');}});}
 state.themeBackup=null;$('revertPreset').hidden=true;
});
$('showNums').addEventListener('change',renderAll);$('undo').onclick=()=>undoOrRedo(false);$('redo').onclick=()=>undoOrRedo(true);
document.addEventListener('keydown',ev=>{if(!(ev.ctrlKey||ev.metaKey)||!['z','y'].includes(ev.key.toLowerCase()))return;if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;ev.preventDefault();undoOrRedo(ev.key.toLowerCase()==='y'||ev.shiftKey);});
$('clearFace').onclick=()=>{if(!confirm('Remover os desenhos da face '+state.face+'?'))return;beginStroke();pctx.clearRect(0,0,SZ,SZ);schedulePreview();setMessage('Face limpa.');};
$('copyAll').onclick=()=>{if(!confirm('Copiar o desenho da face '+numberStandard(state.face)+' para as outras faces do D'+state.type+'? Os desenhos delas serão substituídos.'))return;saveCurrent();for(let i=1;i<=faceCount(state.type);i++){if(i===state.face)continue;const c=faceCanvas(i),ctx=c.getContext('2d');ctx.clearRect(0,0,SZ,SZ);ctx.drawImage(paint,0,0);}updatePreview();setMessage('Desenho copiado para todas as '+state.type+' faces.');};
$('imageBtn').onclick=()=>$('imageUpload').click();$('imageUpload').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>6*1024*1024)return setMessage('Escolha uma imagem de até 6 MB.');try{const im=await createImageBitmap(f);beginStroke();const max=420,sc=Math.min(max/im.width,max/im.height);pctx.drawImage(im,256-im.width*sc/2,256-im.height*sc/2,im.width*sc,im.height*sc);im.close();schedulePreview();setMessage('Imagem inserida no centro da face.');}catch{setMessage('Não foi possível importar esta imagem.');}e.target.value='';});
$('exportFace').onclick=()=>{saveCurrent();const c=composition(state.face,$('exportNumbers').checked);c.toBlob(blob=>{if(blob){downloadBlob(`${slug()}_d${state.type}_face-${state.face}.png`,blob);setMessage('PNG exportado.');}},'image/png');};
$('exportProject').onclick=()=>{const data=toData();downloadBlob(`${slug()}_d${state.type}_artes.json`,new Blob([JSON.stringify(data)],{type:'application/json'}));setMessage('D'+state.type+' exportado separadamente. Para salvar os sete dados num só JSON use o botão no painel esquerdo.');};
$('importProject').onclick=()=>$('jsonUpload').click();
$('jsonUpload').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;
 try{
  if(f.size>160*1024*1024)throw Error('Arquivo maior que 160 MB.');
  const data=JSON.parse(await f.text());
  if(data.format==='hexatombe-dice-collection'){
   await loadCollection(data);setMessage('✓ Conjunto completo importado: '+Object.keys(data.dice).length+' tipos de dados.');
  }else{
   safeData(data);drafts.set(state.type,toData());drafts.set(data.type,data);await loadData(data);showSetTypes();setMessage('✓ D'+data.type+' importado. Os outros dados do pacote continuam guardados.');
  }
 }catch(err){setMessage('Falha ao abrir: '+err.message);}
 e.target.value='';
});
$('resetAll').onclick=async()=>{
 if(!confirm('Limpar apenas o D'+state.type+'? A arte atual será substituída, mas os demais dados serão mantidos.'))return;
 const type=state.type;drafts.set(type,newDie(type));await loadData(drafts.get(type));showSetTypes();setMessage('D'+type+' reiniciado. Os outros dados do pacote estão intactos.');
};
syncBorderControls();syncNumberControls();selectFace(1);renderAll();

// HEXATOMBE / ATELIÊ v0.7 — dados e coleções no mesmo IndexedDB v2 da mesa.
const HX_DB_NAME='hexatombe-avatar-dados',HX_STORE='packs',HX_COLLECTION_STORE='collections',HX_ACTIVE='hexatombe-dice-active-v1',HX_SYNC='hexatombe-dice-sync-v1';
let hxEditingId = new URLSearchParams(location.search).get('edit');
function hxId(){return crypto.randomUUID?.()||`dado-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function hxOpenDB(){return new Promise((resolve,reject)=>{
 if(!('indexedDB' in window))return reject(Error('Seu navegador não disponibiliza IndexedDB.'));
 const r=indexedDB.open(HX_DB_NAME,2);
 r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(HX_STORE))r.result.createObjectStore(HX_STORE,{keyPath:'id'});if(!r.result.objectStoreNames.contains(HX_COLLECTION_STORE))r.result.createObjectStore(HX_COLLECTION_STORE,{keyPath:'id'});};
 r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Erro na biblioteca de dados.'));r.onblocked=()=>reject(Error('Feche outras abas da Mesa e atualize a página.'));
});}
async function hxGet(id,store=HX_STORE){const db=await hxOpenDB();try{return await new Promise((resolve,reject)=>{const r=db.transaction(store,'readonly').objectStore(store).get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}}
async function hxPut(item){const db=await hxOpenDB();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction(HX_STORE,'readwrite');tx.objectStore(HX_STORE).put(item);tx.oncomplete=()=>resolve(item);tx.onabort=()=>reject(tx.error||Error('Falha ao gravar o conjunto.'));tx.onerror=()=>reject(tx.error||Error('Falha ao gravar o conjunto.'));
});}finally{db.close();}}
function hxSync(){try{localStorage.setItem(HX_SYNC,String(Date.now()));}catch{} window.dispatchEvent(new Event('hexatombe-dice-library-changed'));}
function hxSetActive(map){let active={};try{active=JSON.parse(localStorage.getItem(HX_ACTIVE)||'{}')||{};}catch{}
 Object.assign(active,map);localStorage.setItem(HX_ACTIVE,JSON.stringify(active));hxSync();}
function collectionData(){
 drafts.set(state.type,toData());
 const dice={};for(const type of ALL_DICE_TYPES)dice[type]=drafts.get(type)||newDie(type);
 const name=$('collectionName').value.trim()||'Meu conjunto de dados';
 return{format:'hexatombe-dice-collection',version:1,name,dice};
}
async function loadCollection(data){
 if(!data||data.format!=='hexatombe-dice-collection'||data.version!==1||!data.dice||typeof data.dice!=='object')throw Error('Formato de coleção inválido.');
 const entries=Object.entries(data.dice);if(!entries.length||entries.length>7)throw Error('Esta coleção não contém dados válidos.');
 for(const [side,art] of entries){safeData(art);if(String(art.type)!==side)throw Error('O D'+side+' possui formato incorreto.');}
 drafts.clear();for(const [side,art] of entries)drafts.set(+side,art);
 $('collectionName').value=String(data.name||'Meu conjunto').slice(0,80);
 const first=drafts.has(20)?20:entries.length?Number(entries[0][0]):6;
 await loadData(drafts.get(first));showSetTypes();
}
async function hxSave(){
 const btn=$('saveToMesa');btn.disabled=true;
 try{
  const art=toData();drafts.set(state.type,art);
  const exists=hxEditingId?await hxGet(hxEditingId):null;
  if(JSON.stringify(art).length>30*1024*1024)throw Error('Dado maior que 30 MB.');
  const now=new Date().toISOString(),id=exists?.id||hxId();
  await hxPut({id,art,createdAt:exists?.createdAt||now,updatedAt:now});hxEditingId=id;
  const url=new URL(location.href);url.searchParams.set('edit',id);history.replaceState(null,'',url);
  hxSetActive({[art.type]:{kind:'custom',id}});
  showSetTypes();setMessage('✓ D'+art.type+' salvo na biblioteca! Para salvar o pacote inteiro, clique em “Salvar conjunto na biblioteca”.');
 }catch(e){setMessage('Não foi possível salvar o dado: '+(e.message||e));}
 finally{btn.disabled=false;}
}
$('saveToMesa').addEventListener('click',hxSave);
async function hxSaveCollection(){
 const btn=$('saveCollection');btn.disabled=true;
 try{
  const data=collectionData();for(const art of Object.values(data.dice))safeData(art);
  if(JSON.stringify(data).length>160*1024*1024)throw Error('Pacote acima de 160 MB.');
  const previous=hxEditingCollectionId?await hxGet(hxEditingCollectionId,HX_COLLECTION_STORE):null;
  if(hxEditingCollectionId&&!previous)throw Error('O pacote anterior não existe mais.');
  const now=new Date().toISOString(),coll={id:previous?.id||hxId(),name:data.name,members:{},createdAt:previous?.createdAt||now,updatedAt:now};
  const db=await hxOpenDB();
  try{await new Promise((resolve,reject)=>{
    const tx=db.transaction([HX_STORE,HX_COLLECTION_STORE],'readwrite'),store=tx.objectStore(HX_STORE);
    for(const [side,art] of Object.entries(data.dice)){
     const memberId=previous?.members?.[side]||hxId();coll.members[side]=memberId;
     const getOld=store.get(memberId);getOld.onsuccess=()=>{const old=getOld.result;store.put({id:memberId,art,collectionId:coll.id,createdAt:old?.createdAt||now,updatedAt:now});};
    }
    tx.objectStore(HX_COLLECTION_STORE).put(coll);
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('Falha ao salvar o pacote.'));tx.onerror=()=>reject(tx.error||Error('Falha ao salvar o pacote.'));
  });}finally{db.close();}
  hxEditingCollectionId=coll.id;const url=new URL(location.href);url.searchParams.set('collection',coll.id);url.searchParams.delete('edit');history.replaceState(null,'',url);
  hxEditingId=null;
  hxSetActive(Object.fromEntries(Object.entries(coll.members).map(([type,id])=>[type,{kind:'custom',id}])));
  setMessage('✓ Pacote “'+coll.name+'” salvo com os 7 dados e selecionado para uso. Você pode criar outro pacote sem apagar este.');
 }catch(e){setMessage('Não foi possível salvar o pacote: '+(e.message||e));}
 finally{btn.disabled=false;}
}
$('saveCollection').addEventListener('click',hxSaveCollection);
$('exportCollection').addEventListener('click',()=>{
 try{const pack=collectionData();const name=pack.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,50).toLowerCase();
 downloadBlob(`${name||'dados'}-pacote-completo.json`,new Blob([JSON.stringify(pack)],{type:'application/json'}));
 setMessage('✓ JSON único com todos os 7 dados exportado.');}
 catch(e){setMessage('Falha ao exportar: '+e.message)}
});
$('newCollection').addEventListener('click',async()=>{
 if(!confirm('Começar outra coleção? Salve ou exporte a atual antes para não perder alterações.'))return;
 hxEditingCollectionId=null;hxEditingId=null;drafts.clear();$('collectionName').value='Meu novo conjunto';
 const u=new URL(location.href);u.searchParams.delete('collection');u.searchParams.delete('edit');history.replaceState(null,'',u);
 await loadData(newDie(6));showSetTypes();setMessage('Nova coleção aberta. Os pacotes que você salvou continuam na biblioteca.');
});
async function hxLoadEdit(){
 if(hxEditingCollectionId){
  try{
   const coll=await hxGet(hxEditingCollectionId,HX_COLLECTION_STORE);if(!coll)throw Error('Coleção não encontrada.');
   const db=await hxOpenDB();let dice={};
   try{
    const tx=db.transaction(HX_STORE,'readonly'),s=tx.objectStore(HX_STORE);
    const items=await Promise.all(Object.entries(coll.members).map(([type,id])=>new Promise((resolve,reject)=>{const request=s.get(id);request.onsuccess=()=>resolve([type,request.result?.art]);request.onerror=()=>reject(request.error);})));for(const [type,art] of items){if(art)dice[type]=art;}
   }finally{db.close();}
   await loadCollection({format:'hexatombe-dice-collection',version:1,name:coll.name,dice});
   setMessage('✓ Editando coleção “'+coll.name+'” com '+Object.keys(dice).length+' dados.');
  }catch(e){setMessage('Erro ao abrir coleção: '+e.message);hxEditingCollectionId=null;}
  return;
 }
 if(!hxEditingId)return;
 try{const item=await hxGet(hxEditingId);if(!item)throw Error('Este dado não existe nesta biblioteca.');drafts.set(item.art.type,item.art);await loadData(item.art);showSetTypes();setMessage('✓ Editando D'+item.art.type+' · '+item.art.name+'. Você também pode criar os outros dados deste pacote.');}
 catch(e){setMessage('Não foi possível abrir para edição: '+e.message);hxEditingId=null;}
}

// Portal do Mestre v1.3.2 — navegação da oficina (somente interface).
function hxShowEditorPane(key){
 document.querySelectorAll('[data-hx-pane]').forEach(p=>{p.hidden=p.dataset.hxPane!==key;});
 document.querySelectorAll('[data-hx-tab]').forEach(b=>{const yes=b.dataset.hxTab===key;b.setAttribute('aria-selected',String(yes));b.tabIndex=yes?0:-1;});
 document.querySelector('.hx-tools-panel .controls')?.scrollTo({top:0,behavior:'instant'});
}
for(const b of document.querySelectorAll('[data-hx-tab]'))b.addEventListener('click',()=>hxShowEditorPane(b.dataset.hxTab));
$('hxQuickSave').addEventListener('click',()=>{hxShowEditorPane('conjunto');$('saveCollection').click();});
$('hxOpenSetTools').addEventListener('click',()=>{hxShowEditorPane('conjunto');document.querySelector('.hx-tools-panel')?.scrollIntoView({behavior:'smooth',block:'start'});});
function hxRenderQuickDice(){
 const area=$('hxQuickDice');area.replaceChildren();
 for(const type of ALL_DICE_TYPES){const b=document.createElement('button');b.type='button';b.textContent='D'+type;b.setAttribute('aria-pressed',String(type===state.type));b.className=drafts.has(type)?'has-draft':'';b.title='Editar D'+type;b.onclick=()=>{void switchDie(type)};area.append(b);}
}
hxShowEditorPane('aparencia');

showSetTypes();void hxLoadEdit();
})();
