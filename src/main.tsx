import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler for debugging
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', message, 'at', source, ':', lineno);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 40px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 20px; font-family: sans-serif; max-width: 500px; margin: 40px auto; text-align: center;" dir="rtl">
      <h2 style="margin-top: 0;">عذراً، حدث خطأ في التحميل</h2>
      <p style="font-weight: bold;">${message}</p>
      <p style="font-size: 12px; opacity: 0.7;">${source}:${lineno}</p>
      <button onclick="window.location.reload()" style="background: #721c24; color: white; border: none; padding: 10px 20px; rounded: 10px; cursor: pointer; font-weight: bold; margin-top: 10px;">إعادة المحاولة</button>
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
