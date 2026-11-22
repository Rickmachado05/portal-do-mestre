import {useEffect,useState,useRef} from 'react';
import {aguardarVideoRolagem} from './videoRolagem';
import {assinarDadosAoVivo,receberEventoDadosAoVivo,type DadosAoVivoRecebidos} from './dadosAoVivo';
import DadosAoVivoOverlay from './DadosAoVivoOverlay';
import {createPortal} from 'react-dom';
import {
  assinarPresenca,autorizar,chaveMestre,credencialRevogada,limparCredencial,lerCredencial,
  salvarCredencial,solicitar,urlConvite,urlSala,urlRaizMultiplayer,
  type CredencialSala,type ResumoSala,type MesaPublica,type RolagemCompartilhada,
} from './api';
import HistoricoRolagens from './HistoricoRolagens';
import Rolagem3DMultiplayer from './Rolagem3DMultiplayer';
import './Multiplayer.css';
import {atualizarOrigemServidorMultiplayer,origemServidorMultiplayer} from './configuracaoServidor.mjs';
import {abrirAuxiliarInstalado,iniciarSessaoPeloAuxiliar,pararSessaoPeloAuxiliar,suportaAuxiliarMestre,type StatusAuxiliar} from './auxiliarMestre';

type Props={campanhaId:string;campanha:string;modo?:'cartao'|'cabecalho'};
/** O mestre guarda a credencial na sessão da aba; ela acompanha a navegação entre as mesas. */
export default function MultiplayerMestre({campanhaId,campanha,modo='cabecalho'}:Props){
  const chave=chaveMestre(campanhaId);
  const [aberto,setAberto]=useState(false);
  const [credencial,setCredencial]=useState<CredencialSala|null>(()=>lerCredencial(chave));
  const [sala,setSala]=useState<ResumoSala|null>(null);
  const [mesa,setMesa]=useState<MesaPublica|null>(null);
  const [rolagens,setRolagens]=useState<RolagemCompartilhada[]>([]);
  const [ultimaAnimacao,setUltimaAnimacao]=useState<RolagemCompartilhada|null>(null);
  const [videoAtual,setVideoAtual]=useState<{rolagemId:string;url:string}|null>(null);
  const [aoVivo,setAoVivo]=useState<DadosAoVivoRecebidos|null>(null);
  const [resultadoAoVivo,setResultadoAoVivo]=useState<RolagemCompartilhada|null>(null);
  const assistidasAoVivo=useRef(new Set<string>());
  const rolagensRef=useRef<RolagemCompartilhada[]>([]);
  const videoRef=useRef<string|null>(null);
  const [atribuindo,setAtribuindo]=useState<string|null>(null);
  const [status,setStatus]=useState('Desconectado');
  const [erro,setErro]=useState('');
  const [servidorDigitado,setServidorDigitado]=useState(()=>origemServidorMultiplayer());
  const [processando,setProcessando]=useState(false);
  const [auxiliar,setAuxiliar]=useState<StatusAuxiliar|null>(null);
  const [auxiliarIndisponivel,setAuxiliarIndisponivel]=useState(false);
  const [desligandoAuxiliar,setDesligandoAuxiliar]=useState(false);
  const [copiado,setCopiado]=useState(false);
  const [pedidosItens,setPedidosItens]=useState(0);
  useEffect(()=>{
    const aoMudar=(evento:Event)=>setPedidosItens((evento as CustomEvent<{quantidade:number}>).detail?.quantidade||0);
    window.addEventListener('portal-mp-pedidos',aoMudar);
    return()=>window.removeEventListener('portal-mp-pedidos',aoMudar);
  },[]);

  useEffect(()=>{
    if(!ultimaAnimacao||videoAtual?.rolagemId===ultimaAnimacao.id)return;
    const tempo=window.setTimeout(()=>setUltimaAnimacao(atual=>atual?.id===ultimaAnimacao.id?null:atual),17500);
    return()=>window.clearTimeout(tempo);
  },[ultimaAnimacao?.id,videoAtual?.rolagemId]);
  // A reprodução usa sempre o vídeo do lançamento físico original.
  // Aguardar o upload evita corrida entre 'rolagem' e 'video-rolagem' do SSE.
  useEffect(()=>{
    if(!credencial||!ultimaAnimacao||ultimaAnimacao.origem==='mestre'||
      videoAtual?.rolagemId===ultimaAnimacao.id)return;
    let ativo=true;
    const controller=new AbortController();
    const id=ultimaAnimacao.id;
    void aguardarVideoRolagem(credencial,id,controller.signal).then(url=>{
      if(!ativo){URL.revokeObjectURL(url);return;}
      if(videoRef.current)URL.revokeObjectURL(videoRef.current);
      videoRef.current=url;setVideoAtual({rolagemId:id,url});
    }).catch(e=>{if(ativo)console.warn('[Portal/Dados] Gravação do convidado não recebida:',e);});
    return()=>{ativo=false;controller.abort();};
  },[credencial?.codigo,credencial?.token,ultimaAnimacao?.id,videoAtual?.rolagemId]);
  useEffect(()=>()=>{if(videoRef.current)URL.revokeObjectURL(videoRef.current);},[]);
  useEffect(()=>{
    if(!aberto)return;
    const aoTeclado=(evento:KeyboardEvent)=>{if(evento.key==='Escape')setAberto(false);};
    document.addEventListener('keydown',aoTeclado);
    return()=>document.removeEventListener('keydown',aoTeclado);
  },[aberto]);
  useEffect(()=>{
    if(!credencial)return;
    let ativo=true;
    void solicitar<{sala:ResumoSala}>(`${urlSala(credencial.codigo)}/eu`,{headers:autorizar(credencial.token)})
      .then((res:{sala:ResumoSala})=>{if(ativo)setSala(res.sala);})
      .catch((e:unknown)=>{if(!ativo)return;if(credencialRevogada(e)){limparCredencial(chave);setCredencial(null);setSala(null);setStatus('Desconectado');window.dispatchEvent(new Event('portal-multiplayer-sala'));}else setStatus('Reconectando…');});
    return ()=>{ativo=false;};
  },[credencial?.codigo,credencial?.token,chave]);
  useEffect(()=>{
    if(!credencial)return;
    setStatus('Conectando…');
    void solicitar<{mesa:MesaPublica|null}>(`${urlSala(credencial.codigo)}/mesa`,{headers:autorizar(credencial.token)})
      .then(res=>setMesa(res.mesa)).catch(()=>undefined);
    let ativo=true;
    void solicitar<{rolagens:RolagemCompartilhada[]}>(`${urlSala(credencial.codigo)}/rolagens`,{headers:autorizar(credencial.token)})
      .then(res=>{if(ativo)setRolagens(prev=>[...new Map([...res.rolagens,...prev].map(r=>[r.id,r])).values()].slice(-80));}).catch(()=>undefined);
    const desassinarAoVivo=assinarDadosAoVivo(credencial,(estado,encerradaId)=>{
      setAoVivo(atual=>estado||(atual?.id===encerradaId?null:atual));
      if(estado)setResultadoAoVivo(null);
    });
    const desassinar=assinarPresenca(credencial,evento=>{
      if(evento.tipo==='dados-ao-vivo'){
        receberEventoDadosAoVivo(credencial,evento);return;
      }
      if(evento.tipo==='encerrada'){
        limparCredencial(chave);setCredencial(null);setSala(null);setRolagens([]);setUltimaAnimacao(null);setAoVivo(null);setStatus('Encerrada');window.dispatchEvent(new Event('portal-multiplayer-sala'));return;
      }
      if(evento.tipo==='mesa'){setMesa(evento.mesa);return;}
      if(evento.tipo==='presenca')setSala(evento.sala);
      if(evento.tipo==='rolagem'){
        rolagensRef.current=[...rolagensRef.current.filter(r=>r.id!==evento.rolagem.id),evento.rolagem].slice(-80);
        setRolagens(prev=>prev.some(r=>r.id===evento.rolagem.id)?prev:[...prev,evento.rolagem].slice(-80));
        if(assistidasAoVivo.current.has(evento.rolagem.origemId||evento.rolagem.id)){
          setResultadoAoVivo(evento.rolagem);
        }else if(evento.rolagem.origem!=='mestre'){
          setUltimaAnimacao(evento.rolagem);
        }
      }
    },conexao=>setStatus(conexao==='conectado'?'Conectado':'Reconectando…'));
    return()=>{ativo=false;desassinar();desassinarAoVivo();};
  },[credencial?.codigo,credencial?.token,chave]);

  async function criar(){
    setErro('');setProcessando(true);
    try{
      // Na Vercel, primeiro tentamos iniciar automaticamente o servidor no PC do mestre.
      // Se o auxiliar não estiver instalado ou acessível, o modo manual continua funcionando.
      if(suportaAuxiliarMestre() && /\.vercel\.app$/i.test(window.location.hostname)){
        try{
          const tunnel=await iniciarSessaoPeloAuxiliar(status=>{setAuxiliar(status);setAuxiliarIndisponivel(false);});
          atualizarOrigemServidorMultiplayer(tunnel);
          setServidorDigitado(tunnel);
          setAuxiliarIndisponivel(false);
        }catch(falha){
          setAuxiliarIndisponivel(true);
          // Não substituímos um Tunnel manual válido por erro do programa local.
          if(!origemServidorMultiplayer()){
            const detalhe=falha instanceof Error?falha.message:'O auxiliar não respondeu.';
            throw new Error(`O auxiliar do mestre não está disponível. Instale-o uma vez no Windows e clique em "Abrir auxiliar", ou configure o Cloudflare manualmente. Detalhe: ${detalhe}`);
          }
        }
      }
      if(/\.vercel\.app$/i.test(window.location.hostname)&&!origemServidorMultiplayer())
        throw new Error('Configure o auxiliar do mestre ou informe o endereço HTTPS do Cloudflare Tunnel.');
      const resposta=await solicitar<{codigo:string;token:string;sala:ResumoSala}>(`${urlRaizMultiplayer()}/salas`,{
        method:'POST',body:JSON.stringify({campanhaId,campanha}),
      });
      const nova:CredencialSala={codigo:resposta.codigo,token:resposta.token,papel:'mestre'};
      salvarCredencial(chave,nova);setCredencial(nova);setSala(resposta.sala);window.dispatchEvent(new Event('portal-multiplayer-sala'));
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível criar a sala.');}
    finally{setProcessando(false);}
  }
  async function desligarServidor(){
    if(credencial||!window.confirm('Desligar o servidor e o Cloudflare? Encerre primeiro a sala e avise os convidados.'))return;
    setDesligandoAuxiliar(true);setErro('');
    try{
      const resposta=await pararSessaoPeloAuxiliar();
      setAuxiliar(resposta);setAuxiliarIndisponivel(false);
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível desligar o servidor local.');}
    finally{setDesligandoAuxiliar(false);}
  }
  async function encerrar(){
    if(!credencial)return;
    setProcessando(true);setErro('');
    try{
      await solicitar(`${urlSala(credencial.codigo)}/encerrar`,{method:'POST',headers:autorizar(credencial.token)});
      limparCredencial(chave);setCredencial(null);setSala(null);setRolagens([]);setUltimaAnimacao(null);setAoVivo(null);setStatus('Encerrada');window.dispatchEvent(new Event('portal-multiplayer-sala'));
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível encerrar a sala.');}
    finally{setProcessando(false);}
  }
  async function atribuir(pessoaId:string,personagemId:string){
    if(!credencial||atribuindo)return;
    setErro('');setAtribuindo(pessoaId);
    try{
      const resposta=await solicitar<{sala:ResumoSala}>(`${urlSala(credencial.codigo)}/atribuir`,{
        method:'POST',headers:autorizar(credencial.token),
        body:JSON.stringify({pessoaId,personagemId:personagemId||null}),
      });
      setSala(resposta.sala);
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível atribuir o personagem.');}
    finally{setAtribuindo(null);}
  }
  async function copiar(){
    if(!credencial)return;
    try{await navigator.clipboard.writeText(urlConvite(credencial.codigo));setCopiado(true);setTimeout(()=>setCopiado(false),1800);}
    catch{setErro('Não foi possível copiar automaticamente. Selecione o endereço e copie com Ctrl+C.');}
  }
  const convidados=sala?.participantes.filter(p=>p.papel==='convidado')||[];
  return <>
    {credencial&&aoVivo&&createPortal(<DadosAoVivoOverlay key={aoVivo.id} stream={aoVivo.stream} resultado={resultadoAoVivo} onPrimeiroFrame={()=>{assistidasAoVivo.current.add(aoVivo.id);setUltimaAnimacao(null);}} onFechar={()=>setAoVivo(null)}/>,document.body)}
    {credencial&&ultimaAnimacao&&createPortal(<Rolagem3DMultiplayer key={ultimaAnimacao.id} rolagem={ultimaAnimacao} videoUrl={videoAtual?.rolagemId===ultimaAnimacao.id?videoAtual.url:undefined} onFechar={()=>{setUltimaAnimacao(null);setVideoAtual(null);if(videoRef.current){URL.revokeObjectURL(videoRef.current);videoRef.current=null;}}}/>,document.body)}
    <button type="button" className={`pm-mp-trigger ${modo==='cartao'?'pm-mp-trigger-cartao':''}`} onClick={()=>setAberto(true)} title="Hospedar sala multiplayer de teste">◉ <span>{credencial?'Multiplayer ativo':'Multiplayer'}{pedidosItens>0?` · ${pedidosItens} pedido(s)`:''}</span></button>
    {aberto&&createPortal(<div className="pm-mp-sobreposicao" onMouseDown={e=>{if(e.currentTarget===e.target)setAberto(false);}}>
      <section className="pm-mp-modal" role="dialog" aria-modal="true" aria-label="Multiplayer — painel do mestre">
        <header className="pm-mp-topo"><div><small>PORTAL DO MESTRE · MULTIPLAYER</small><h2>Sala de teste</h2></div><button type="button" aria-label="Fechar painel" onClick={()=>setAberto(false)}>×</button></header>
        <p className="pm-mp-campanha">Campanha: <strong>{campanha}</strong></p>
        <div className="pm-mp-config-servidor">
          <label className="pm-mp-link">Servidor da sessão (Cloudflare Tunnel)
            <input value={servidorDigitado} onChange={e=>setServidorDigitado(e.target.value)}
              placeholder="https://exemplo.trycloudflare.com" aria-label="Endereço HTTPS do servidor multiplayer" spellCheck={false}/>
          </label>
          <button type="button" className="pm-mp-copiar" onClick={()=>{
            try{atualizarOrigemServidorMultiplayer(servidorDigitado);window.location.reload();}
            catch(e){setErro(e instanceof Error?e.message:'Endereço inválido.');}
          }}>Salvar endereço do servidor</button>
          <p className="pm-mp-nota">Método manual alternativo: na Vercel, cole aqui o endereço HTTPS exibido pelo cloudflared.
            Salve antes de iniciar a sala. Deixe em branco apenas ao usar o Portal e o servidor na mesma origem.
            Cada novo Quick Tunnel tem um endereço diferente.</p>
        </div>
        <p className="pm-mp-explicacao">Os convidados utilizam a mesma biblioteca de dados do Portal, com Ateliê, física e rolagens 3D de resultados oficiais do servidor. Tokens, fichas, rolagens e inventários autorizados continuam disponíveis. Cenas com neblina ainda bloqueiam movimento remoto.</p>
        {!credencial?<div className="pm-mp-vazio">
          {suportaAuxiliarMestre()&&<div className="pm-mp-auxiliar" role="status">
            <strong>Hospedagem no seu PC</strong>
            <p>{auxiliar?.estado==='pronto'?'Servidor e Cloudflare conectados.':auxiliar?.estado==='iniciando'?auxiliar.mensagem:auxiliarIndisponivel?'Auxiliar local não encontrado. Instale-o uma vez ou abra-o pelo botão abaixo.':'Ao iniciar a sala, o Portal tentará ligar seu servidor e Cloudflare automaticamente.'}</p>
            {auxiliarIndisponivel&&<button type="button" className="pm-mp-auxiliar-abrir" onClick={abrirAuxiliarInstalado}>Abrir auxiliar instalado no Windows</button>}
            {auxiliar?.estado==='pronto'&&<button type="button" className="pm-mp-auxiliar-desligar" disabled={desligandoAuxiliar||processando} onClick={()=>void desligarServidor()}>{desligandoAuxiliar?'Desligando…':'Desligar servidor e Tunnel'}</button>}
          </div>}
          <p>Inicie uma sala para gerar o convite. O mestre precisa manter o PC ligado durante a sessão.</p>
          <button type="button" disabled={processando} onClick={()=>void criar()}>{processando?'Iniciando servidor e sala…':'＋ Iniciar sala multiplayer'}</button>
        </div>:<>
          <div className="pm-mp-indicadores"><span><i className={status==='Conectado'?'online':''}/> {status}</span><span>Código: <strong>{credencial.codigo}</strong></span></div>
          <label className="pm-mp-link">Link de convite<input readOnly value={urlConvite(credencial.codigo)} onFocus={e=>e.currentTarget.select()} aria-label="Link para os convidados"/></label>
          <button type="button" className="pm-mp-copiar" onClick={()=>void copiar()}>{copiado?'✓ Link copiado':'▣ Copiar link'}</button>
          <div className="pm-mp-lista-titulo"><h3>Participantes</h3><span>{convidados.filter(p=>p.conectado).length} online</span></div>
          <ul className="pm-mp-participantes">
            {(sala?.participantes||[]).map(p=><li key={p.id}><i className={p.conectado?'online':''}/><span>{p.apelido}</span><small>{p.papel==='mestre'?'Mestre':p.conectado?'Conectado':'Desconectado'}</small></li>)}
          </ul>
          <div className="pm-mp-atribuicoes">
            <h3>Personagens e fichas dos convidados</h3>
            <p>O mestre decide quem controla cada personagem e quem recebe sua ficha. Um personagem só pode ser atribuído a um convidado por vez.</p>
            {convidados.map(p=><label key={p.id} className="pm-mp-atribuicao">
              <span>{p.apelido}</span>
              <select aria-label={`Personagem de ${p.apelido}`} value={p.personagemId||''}
                disabled={!mesa||Boolean(atribuindo)} onChange={e=>void atribuir(p.id,e.target.value)}>
                <option value="">Sem personagem</option>
                {mesa?.tokens.map(t=><option key={t.id} value={t.id}
                  disabled={convidados.some(outro=>outro.id!==p.id&&outro.personagemId===t.id)}>{t.nome}</option>)}
                {p.personagemId&&!mesa?.tokens.some(t=>t.id===p.personagemId)&&
                  <option value={p.personagemId} disabled>Personagem fora da cena atual</option>}
              </select>
            </label>)}
            {!mesa&&<p className="pm-mp-nota">Abra a Mesa 2D para disponibilizar os personagens da cena.</p>}
          </div>
          {pedidosItens>0&&<div className="pm-mp-pedidos-link" role="status">
            <strong>⚔ {pedidosItens} solicitação(ões) de itens aguardando aprovação</strong>
            <button type="button" onClick={()=>{setAberto(false);window.dispatchEvent(new Event('portal-mp-abrir-pedidos'));}}>Analisar pedidos</button>
          </div>}
          <p className="pm-mp-nota">✉ Use o botão <strong>Chat</strong> da Mesa 2D ou 3D para conversar com todos os participantes da sala.</p>
          <HistoricoRolagens rolagens={rolagens} compacto/>
          <button type="button" className="pm-mp-encerrar" disabled={processando} onClick={()=>void encerrar()}>Encerrar sala de teste</button>
        </>}
        {erro&&<p role="alert" className="pm-mp-erro">{erro}</p>}
        <p className="pm-mp-nota">Teste local: abra o convite no Firefox ou Edge e atribua um personagem acima. O mestre deve manter a mesa aberta. A ficha permanece protegida contra edição remota. Os números das rolagens são compartilhados, mas não atualizam HP ou Mana. As transferências e o uso de itens são processados na campanha do mestre. Animações 3D sincronizadas e integração completa da visão individual virão depois.</p>
      </section>
    </div>,document.body)}
  </>;
}
