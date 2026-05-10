import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { PrivacyProvider } from './context/PrivacyContext';
import { registerServiceWorker } from './utils/pwa';
import './index.css';

// Apply persisted theme before first paint to prevent a flash.
try {
  const saved = localStorage.getItem('pos.theme');
  if (saved === 'dark') document.documentElement.classList.add('dark');
  else if (!saved && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
} catch {}

// PWA: register the service worker (no-op in dev). Listens for updates and
// emits 'pwa-update' on window — handled by an in-app toast in App.jsx.
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <PrivacyProvider>
        <App />
      </PrivacyProvider>
    </ThemeProvider>
  </React.StrictMode>
);
