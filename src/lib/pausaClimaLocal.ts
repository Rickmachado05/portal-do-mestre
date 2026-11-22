import { useSyncExternalStore } from 'react';

/** Pausa local do clima: afeta apenas este navegador, nunca a configuração da campanha. */
const CHAVE = 'portal-do-mestre:clima-visual-pausado:v1';
const EVENTO = 'portal-do-mestre:pausa-clima-atualizada';
let cache: boolean | undefined;

export function lerPausaClimaLocal(): boolean {
  if (cache === undefined) {
    try {
      cache = window.localStorage.getItem(CHAVE) === '1';
    } catch {
      cache = false;
    }
  }
  return cache;
}
export function definirPausaClimaLocal(pausar: boolean): void {
  const valor = Boolean(pausar);
  if (lerPausaClimaLocal() === valor) return;
  cache = valor;
  try {
    window.localStorage.setItem(CHAVE, valor ? '1' : '0');
  } catch {
    /* Modo privado: manter no estado em memória. */
  }
  window.dispatchEvent(new Event(EVENTO));
}
function assinar(callback: () => void): () => void {
  const aoAlterar = () => callback();
  const aoArmazenar = (event: StorageEvent) => {
    if (event.key === CHAVE || event.key === null) {
      cache = event.key === null ? undefined : event.newValue === '1';
      callback();
    }
  };
  window.addEventListener(EVENTO, aoAlterar);
  window.addEventListener('storage', aoArmazenar);
  return () => {
    window.removeEventListener(EVENTO, aoAlterar);
    window.removeEventListener('storage', aoArmazenar);
  };
}
export function usePausaClimaLocal(): readonly [boolean, (pausar: boolean) => void] {
  const pausado = useSyncExternalStore(assinar, lerPausaClimaLocal, () => false);
  return [pausado, definirPausaClimaLocal] as const;
}
