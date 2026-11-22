import type { RolagemCompartilhada } from './api';
export type RegistroDoHistorico = {
  id: string;
  hora: string;
  texto: string;
  tipo: 'dado' | 'evento' | 'sistema';
  visibilidade?: 'publica' | 'mestre';
  iconeAcao?: string;
};
export function registroDaRolagemMultiplayer(rolagem: RolagemCompartilhada): RegistroDoHistorico;
export function incorporarRolagensMultiplayer<T extends RegistroDoHistorico>(
  registros: T[], rolagens: RolagemCompartilhada[]
): RegistroDoHistorico[];
