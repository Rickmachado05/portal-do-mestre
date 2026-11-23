import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// Portal, mesa, ateliê e criador na mesma origem, preservando as bibliotecas IndexedDB.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api/multiplayer': { target: 'http://127.0.0.1:8787', changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      input: {
        portal: fileURLToPath(new URL('./index.html', import.meta.url)),
        perfil: fileURLToPath(new URL('./perfil/index.html', import.meta.url)),
        caderno: fileURLToPath(new URL('./caderno/index.html', import.meta.url)),
        mesas: fileURLToPath(new URL('./mesas/index.html', import.meta.url)),
        convidado: fileURLToPath(new URL('./convidado/index.html', import.meta.url)),
        personagens: fileURLToPath(new URL('./personagens/index.html', import.meta.url)),
        dados: fileURLToPath(new URL('./dados/index.html', import.meta.url)),
        itens: fileURLToPath(new URL('./itens/index.html', import.meta.url)),
        tokens: fileURLToPath(new URL('./tokens/index.html', import.meta.url)),
        miniaturas: fileURLToPath(new URL('./miniaturas/index.html', import.meta.url)),
        mesa: fileURLToPath(new URL('./mesa/index.html', import.meta.url)),
        mesa3d: fileURLToPath(new URL('./mesa3d/index.html', import.meta.url)),
        mesa3dviewer: fileURLToPath(new URL('./mesa3dviewer/index.html', import.meta.url)),
        criador: fileURLToPath(new URL('./criador/index.html', import.meta.url)),
      },
    },
  },
})
