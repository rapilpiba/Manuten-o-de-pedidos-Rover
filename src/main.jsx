import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// O service worker guarda a aplicação no aparelho: depois da primeira visita,
// ela abre e funciona mesmo sem internet nenhuma.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Sem service worker a aplicação continua funcionando, só não fica offline.
    });
  });
}
