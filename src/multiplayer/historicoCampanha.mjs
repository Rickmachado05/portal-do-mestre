/** Integra resultados do servidor multiplayer ao histórico já usado pelas Mesas 2D e 3D.
 * O ID do sorteio é estável: reconexões e consultas retrospectivas não duplicam entradas.
 * Este módulo não lê a ficha nem envia registros locais para os convidados.
 */
const PREFIXO = 'mp-rolagem:';
const LIMITE = 150;

export function registroDaRolagemMultiplayer(rolagem) {
  const hora = new Date(rolagem.hora);
  const horaLocal = Number.isFinite(hora.getTime())
    ? hora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})
    : '—';
  const modificador = rolagem.modificador > 0
    ? ` + ${rolagem.modificador}`
    : rolagem.modificador < 0 ? ` - ${Math.abs(rolagem.modificador)}` : '';
  const detalhes = `[${rolagem.dados.join(', ')}]${modificador}`;
  return {
    id: `${PREFIXO}${rolagem.id}`,
    hora: horaLocal,
    tipo: 'dado',
    visibilidade: rolagem.visibilidade === 'mestre' ? 'mestre' : 'publica',
    texto: `${rolagem.personagem} (${rolagem.participante}) · ${rolagem.acaoNome}: ${rolagem.formula} → ${detalhes} = ${rolagem.total}`,
  };
}

export function incorporarRolagensMultiplayer(registros, rolagens) {
  if (!Array.isArray(rolagens) || !rolagens.length) return registros;
  const identificadores = new Set(registros.map(registro => registro.id));
  const novos = [];
  for (const rolagem of rolagens) {
    if(rolagem?.origem==='mestre')continue; // A Mesa do Mestre já gravou o resultado local.
    if (!rolagem || typeof rolagem.id !== 'string' || !rolagem.id ||
      !Array.isArray(rolagem.dados) || !Number.isFinite(rolagem.total)) continue;
    const registro = registroDaRolagemMultiplayer(rolagem);
    if (identificadores.has(registro.id)) continue;
    identificadores.add(registro.id);
    novos.push(registro);
  }
  return novos.length ? [...registros, ...novos].slice(-LIMITE) : registros;
}
