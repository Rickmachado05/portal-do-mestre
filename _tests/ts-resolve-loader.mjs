/** Facilita testes de módulos TS com imports sem extensão no Node, sem alterar os fontes Vite. */
export async function resolve(specifier, context, nextResolve) {
  try {return await nextResolve(specifier,context);} catch(error) {
    if(specifier.startsWith('.') && !/\.(ts|tsx|js|mjs|json)$/.test(specifier))return nextResolve(specifier+'.ts',context);
    throw error;
  }
}
