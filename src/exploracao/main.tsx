import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Exploracao25D from './Exploracao25D';
import './Exploracao25D.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Exploracao25D />
  </StrictMode>,
);
