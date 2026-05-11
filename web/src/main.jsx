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
// Na /register nerobiť reload — SW inštalácia by zneplatnila invite link
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!window.location.pathname.startsWith('/register')) {
      window.location.reload();
    }
  });
}
