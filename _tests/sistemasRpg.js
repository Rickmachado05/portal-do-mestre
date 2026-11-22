"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SISTEMAS_RPG = exports.SISTEMA_IMPETO = void 0;
exports.nomeDoSistema = nomeDoSistema;
exports.sistemaDaFicha = sistemaDaFicha;
exports.sistemaDaCampanha = sistemaDaCampanha;
exports.fichaCompativel = fichaCompativel;
/** Catálogo extensível de sistemas. A v1.3.5 registra apenas Ímpeto RPG. */
exports.SISTEMA_IMPETO = 'impeto';
exports.SISTEMAS_RPG = [
    { id: exports.SISTEMA_IMPETO, nome: 'Ímpeto RPG', descricao: 'Sistema autoral universal', geradorDisponivel: true },
];
function nomeDoSistema(id) {
    if (!id)
        return 'Sem sistema definido';
    return exports.SISTEMAS_RPG.find(s => s.id === id)?.nome || id;
}
/** O formato antigo das fichas provém integralmente do editor que hoje se chama Ímpeto. */
function sistemaDaFicha(dados) {
    return dados.sistemaId || exports.SISTEMA_IMPETO;
}
/** Migração interpretativa: não regrava os dados antigos nem classifica D&D como Ímpeto. */
function sistemaDaCampanha(meta) {
    if (typeof meta.sistemaId === 'string')
        return meta.sistemaId || null;
    const legado = (meta.sistema || '').trim().toLocaleLowerCase('pt-BR');
    if (legado === 'ímpeto' || legado === 'ímpeto rpg' || legado === 'impeto' || legado === 'impeto rpg' || legado === 'hexatombe: avatar' || legado === 'hexatombe')
        return exports.SISTEMA_IMPETO;
    // Campanhas antigas com fichas ligadas e sem sistema explícito eram do editor original.
    if (!legado && (meta.id === 'principal' || (meta.fichaIds?.length || 0) > 0))
        return exports.SISTEMA_IMPETO;
    return null;
}
function fichaCompativel(ficha, campanha) {
    const id = sistemaDaCampanha(campanha);
    return Boolean(id && id === sistemaDaFicha(ficha.dados));
}
