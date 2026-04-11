import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler for debugging
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', message, 'at', source, ':', lineno);
  const root = document.getElementById('root');
  if (root && root.innerHTML.includes('جاري تحميل')) {
    root.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      خطأ في التحميل: ${message}<br/>
      يرجى محاولة تحديث الصفحة.
    </div>`;
  }
};

// Register Service Worker for notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
