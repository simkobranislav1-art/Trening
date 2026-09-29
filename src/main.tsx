import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';
import './index.css';

// Nová verzia sa stiahne na pozadí a hneď po prevzatí sa stránka raz načíta znova,
// takže na ploche iPhonu nezostane stará verzia. Rozpracovaný tréning je uložený v IndexedDB.
const hadController = !!navigator.serviceWorker?.controller;
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registration.update().catch(() => undefined);
    });
  },
});
let reloading = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (!hadController || reloading) return;
  reloading = true;
  window.location.reload();
});
// Požiada prehliadač, aby dáta nemazal pri nedostatku miesta.
void navigator.storage?.persist?.();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
