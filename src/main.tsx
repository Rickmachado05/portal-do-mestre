import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// O ambiente de desenvolvimento do React remonta efeitos dentro de StrictMode.
// A mesa já executa limpeza própria para WebGL, GIFs e IndexedDB; remontá-los
// duas vezes torna a abertura local desnecessariamente lenta (também no 2D).
// As demais páginas mantêm a checagem rigorosa de efeitos no desenvolvimento.
const paginaMesa = /^\/(?:mesa|mesa3d|mesa3dviewer)\//.test(window.location.pathname);
createRoot(document.getElementById('root')!).render(
  paginaMesa ? (
    <App />
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  ),
);
