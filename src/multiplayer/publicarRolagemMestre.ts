/** Envia o resultado físico original do mestre à sala ativa, sem um segundo sorteio. */
import { autorizar, chaveMestre, lerCredencial, solicitar, urlSala } from './api';
import { capturarAparenciaDados } from './aparenciaDados';

export async function publicarRolagemMestre(
  campanhaId: string,
  rolagemId: string,
  formula: string,
  dados: number[],
  personagem = 'Mestre',
  visibilidade: 'publica' | 'mestre' = 'publica',
  acaoNome = 'Rolagem livre',
): Promise<void> {
  const credencial = lerCredencial(chaveMestre(campanhaId));
  if (!credencial || credencial.papel !== 'mestre') return;
  const aparencia = await capturarAparenciaDados(formula).catch(() => undefined);
  await solicitar(`${urlSala(credencial.codigo)}/rolar`, {
    method: 'POST',
    headers: autorizar(credencial.token),
    body: JSON.stringify({
      tipo: 'mestre',
      rolagemId,
      formula,
      dados,
      personagem,
      acaoNome,
      visibilidade,
      aparencia,
    }),
  });
}
