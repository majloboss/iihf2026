import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Keď service worker prevezme kontrolu (nová verzia), stránka sa automaticky reloadne
// Na /register a hneď po registrácii nerobiť reload
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (window.location.pathname.startsWith('/register')) return;
    if (sessionStorage.getItem('just_registered')) {
      sessionStorage.removeItem('just_registered');
      return;
    }
    window.location.reload();
  });
}
