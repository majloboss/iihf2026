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
  // Registruje sa tu, nie cez registerSW.js od pluginu: potrebujeme
  // `updateViaCache: 'none'`. Bez neho si prehliadac cachuje samotny sw.js
  // podla vlastnej heuristiky — hosting neposiela Cache-Control a mod_headers
  // tu nie je — takze novy worker vobec nestiahne a stara verzia sa drzi dalej.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(() => {});
  });

  let obnovujem = false;

  // Rozpisaný text sa obnovením stratí. Preto sa nikdy neobnovuje, kým je
  // kurzor v poli — ani keď v ňom niečo zostalo napísané. Nová verzia počká
  // na chvíľu, keď človek nič nepíše.
  const pisePrave = () => {
    const a = document.activeElement;
    if (!a) return false;
    if (a.isContentEditable) return true;
    const t = a.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
  };

  // Rozpísaný text mimo zameraného poľa — napríklad keď človek odíde myšou.
  const maRozpisane = () => [...document.querySelectorAll('textarea, input[type="text"]')]
      .some(el => el.value && el.value.trim() !== '');

  const obnovit = () => {
    if (obnovujem) return;
    if (window.location.pathname.startsWith('/register')) return;
    if (sessionStorage.getItem('just_registered')) {
      sessionStorage.removeItem('just_registered');
      return;
    }
    // Radšej neskôr než stratiť rozpísanú správu: skúsi sa znovu o pol minúty.
    if (pisePrave() || maRozpisane()) {
      setTimeout(obnovit, 30000);
      return;
    }
    obnovujem = true;
    window.location.reload();
  };

  // Prehliadac sam kontroluje novy sw.js iba pri navigacii. Na mobile ostava
  // appka otvorena dlho, takze by o novej verzii nevedela — po navrate k nej
  // a raz za hodinu sa preto vypyta aktivne.
  const skontrolovat = () => navigator.serviceWorker.getRegistration()
      .then(reg => reg && reg.update())
      .catch(() => {});

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') skontrolovat();
  });
  setInterval(skontrolovat, 60 * 60 * 1000);

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
