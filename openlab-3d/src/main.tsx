import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

// Some embedded or background contexts (e.g. an iframe that starts hidden) never deliver
// ResizeObserver callbacks; a window resize event lets the 3D canvas measure itself anyway.
const nudgeLayout = () => window.dispatchEvent(new Event('resize'));
window.addEventListener('load', () => {
  window.setTimeout(nudgeLayout, 50);
  window.setTimeout(nudgeLayout, 1000);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') nudgeLayout();
});

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
