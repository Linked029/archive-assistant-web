﻿import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/theme/tokens.css';

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
