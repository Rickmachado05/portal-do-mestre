import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import Convidado from './Convidado';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Convidado />
  </StrictMode>,
);
