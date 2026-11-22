import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import Portal from './Portal';
import './Portal.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Portal />
  </StrictMode>,
);
import './PortalMestre.css';
