"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarCampanhas = listarCampanhas;
exports.obterCampanha = obterCampanha;
exports.chaveEstadoCampanha = chaveEstadoCampanha;
exports.chaveArquivoCampanha = chaveArquivoCampanha;
exports.urlMesaCampanha = urlMesaCampanha;
exports.resolverCampanhaId = resolverCampanhaId;
exports.criarCampanha = criarCampanha;
exports.atualizarCampanha = atualizarCampanha;
exports.registrarAcessoCampanha = registrarAcessoCampanha;
exports.removerCampanha = removerCampanha;
const INDEX = 'hexatombe-campanhas-v1';
const LEGACY = 'hexatombe-mesa-v1';
const THEMES = ['fogo', 'agua', 'terra', 'ar', 'espiritual'];
const newId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `camp-${crypto.randomUUID()}` : `camp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
const isRecord = (item) => Boolean(item) && typeof item === 'object' && !Array.isArray(item);
function sanitize(item) {
    if (!isRecord(item) || typeof item.id !== 'string' || !/^(principal|camp-[a-zA-Z0-9-]+)$/.test(item.id))
        return null;
    const tema = THEMES.includes(item.tema) ? item.tema : 'espiritual';
    return {
        id: item.id,
        titulo: String(item.titulo || 'Campanha sem nome').slice(0, 80),
        descricao: String(item.descricao || '').slice(0, 700),
        tema,
        capa: typeof item.capa === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(item.capa) && item.capa.length < 700_000 ? item.capa : undefined,
        criadaEm: typeof item.criadaEm === 'string' ? item.criadaEm : now(),
        atualizadaEm: typeof item.atualizadaEm === 'string' ? item.atualizadaEm : now(),
        acessadaEm: typeof item.acessadaEm === 'string' ? item.acessadaEm : undefined,
        arquivada: Boolean(item.arquivada),
        fichaIds: Array.isArray(item.fichaIds) ? item.fichaIds.filter((s) => typeof s === 'string').slice(0, 100) : [],
        colecaoId: typeof item.colecaoId === 'string' ? item.colecaoId : undefined,
        sistema: typeof item.sistema === 'string' ? item.sistema.slice(0, 80) : undefined,
        sistemaId: typeof item.sistemaId === 'string' && /^[a-z0-9_-]{0,64}$/i.test(item.sistemaId) ? item.sistemaId : undefined,
        cenario: typeof item.cenario === 'string' ? item.cenario.slice(0, 100) : undefined,
    };
}
function persist(items) {
    // A gravação ocorre como uma operação única. Se a cota falhar, não atualiza a UI.
    localStorage.setItem(INDEX, JSON.stringify({ schemaVersion: 1, items }));
    window.dispatchEvent(new Event('hexatombe-campaigns-changed'));
}
/** Lê o índice; no primeiro uso reconhece automaticamente uma mesa existente. */
function listarCampanhas() {
    const previous = localStorage.getItem(INDEX);
    if (previous !== null) {
        try {
            const raw = JSON.parse(previous);
            if (isRecord(raw) && Array.isArray(raw.items))
                return raw.items.map(sanitize).filter((m) => m !== null);
        }
        catch { /* índice inválido: mantemos conteúdo para recuperação manual */ }
        throw new Error('Biblioteca de campanhas inválida. Exporte um backup antes de continuar.');
    }
    let existing;
    try {
        existing = JSON.parse(localStorage.getItem(LEGACY) || 'null');
    }
    catch {
        existing = null;
    }
    if (isRecord(existing) && Array.isArray(existing.unidades) && Array.isArray(existing.registros)) {
        const initial = {
            id: 'principal', titulo: String(existing.titulo || 'Minha mesa original').slice(0, 80),
            descricao: 'Campanha recuperada automaticamente da mesa anterior.', tema: 'espiritual',
            criadaEm: now(), atualizadaEm: now(), arquivada: false, fichaIds: [], sistema: 'Hexatombe: Avatar',
        };
        persist([initial]);
        return [initial];
    }
    return [];
}
function obterCampanha(id) { return listarCampanhas().find(x => x.id === id); }
function chaveEstadoCampanha(id) { return id === 'principal' ? LEGACY : `hexatombe-mesa-v2:${id}`; }
function chaveArquivoCampanha(id, chave) { return id === 'principal' ? chave : `campanha:${id}:${chave}`; }
function urlMesaCampanha(id) { return `/mesa/?campanha=${encodeURIComponent(id)}`; }
function resolverCampanhaId(id) {
    let all = [];
    try {
        all = listarCampanhas();
    }
    catch {
        return 'principal';
    }
    if (id && all.some(m => m.id === id))
        return id;
    return all.find(m => !m.arquivada)?.id || all[0]?.id || 'principal';
}
function criarCampanha(value) {
    const items = listarCampanhas();
    const stamp = now();
    const registro = {
        id: newId(), titulo: value.titulo.trim().slice(0, 80) || 'Nova campanha',
        descricao: value.descricao.trim().slice(0, 700), tema: value.tema,
        capa: value.capa, colecaoId: value.colecaoId, sistema: value.sistema?.trim().slice(0, 80) || undefined,
        sistemaId: value.sistemaId ?? 'impeto', cenario: value.cenario?.trim().slice(0, 100) || undefined,
        criadaEm: stamp, atualizadaEm: stamp, arquivada: false,
        fichaIds: [...new Set(value.fichaIds)].slice(0, 100),
    };
    persist([registro, ...items]);
    return registro;
}
function atualizarCampanha(id, value) {
    const items = listarCampanhas();
    let found;
    const updated = items.map(m => {
        if (m.id !== id)
            return m;
        found = { ...m,
            titulo: typeof value.titulo === 'string' ? (value.titulo.trim().slice(0, 80) || m.titulo) : m.titulo,
            descricao: typeof value.descricao === 'string' ? value.descricao.trim().slice(0, 700) : m.descricao,
            tema: value.tema ?? m.tema,
            sistema: typeof value.sistema === 'string' ? value.sistema.trim().slice(0, 80) : m.sistema,
            sistemaId: typeof value.sistemaId === 'string' ? value.sistemaId : m.sistemaId,
            cenario: typeof value.cenario === 'string' ? value.cenario.trim().slice(0, 100) : m.cenario,
            capa: ('capa' in value) ? value.capa : m.capa,
            colecaoId: ('colecaoId' in value) ? value.colecaoId : m.colecaoId,
            fichaIds: Array.isArray(value.fichaIds) ? [...new Set(value.fichaIds)].slice(0, 100) : m.fichaIds,
            arquivada: typeof value.arquivada === 'boolean' ? value.arquivada : m.arquivada,
            atualizadaEm: now(),
        };
        return found;
    });
    if (!found)
        throw Error('Campanha não encontrada.');
    persist(updated);
    return found;
}
function registrarAcessoCampanha(id) {
    const items = listarCampanhas();
    if (!items.some(m => m.id === id))
        return;
    persist(items.map(m => m.id === id ? { ...m, acessadaEm: now() } : m));
}
function removerCampanha(id) {
    const items = listarCampanhas();
    if (!items.some(m => m.id === id))
        throw Error('Campanha não encontrada.');
    // Primeiro remove do índice; em seguida, a aplicação apaga o estado e os anexos.
    persist(items.filter(m => m.id !== id));
    localStorage.removeItem(chaveEstadoCampanha(id));
    if (id === 'principal')
        localStorage.removeItem('hexatombe-mesa-janelas-v2');
    else
        localStorage.removeItem(`hexatombe-mesa-janelas-v2:${id}`);
    localStorage.removeItem(id === 'principal' ? 'hexatombe-mesa-musicas-v031' : `hexatombe-mesa-musicas-v031:${id}`);
    localStorage.removeItem(`rpg-painel-mestre-preparacao-v1:${id}`);
}
