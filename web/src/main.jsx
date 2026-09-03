import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Po nasadení novej verzie prevezme kontrolu nový service worker a stránka sa
// obnoví, aby beral nové súbory.
//
// Obnovuje sa až keď je nový SW skutočne aktivovaný. `controllerchange` sa
// spustí už pri prevzatí kontroly, teda ešte počas dopĺňania precache —
// obnovenie v tej chvíli načíta stránku uprostred výmeny a skončí bielou
// obrazovkou. Práve to sa dialo po každom deployi na mobile.
//
// Poistka proti slučke: ak by sa SW menil opakovane, obnoví sa len raz.
if ('serviceWorker' in navigator) {
  let obnovujem = false;

  const obnovit = () => {
    if (obnovujem) return;
    if (window.location.pathname.startsWith('/register')) return;
    if (sessionStorage.getItem('just_registered')) {
      sessionStorage.removeItem('just_registered');
      return;
    }
    obnovujem = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Bez kontrolóra ide o prvú inštaláciu — vtedy sa neobnovuje.
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.ready
      .then(reg => {
        const sw = reg.active;
        if (!sw) return;
        if (sw.state === 'activated') { obnovit(); return; }
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') obnovit();
        });
      })
      // Keď sa stav nedá zistiť, radšej sa obnoví — stará verzia v pamäti je
      // horšia než jedno obnovenie navyše.
      .catch(obnovit);
  });
}
