import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@storyteller/design-system/tokens.css';
import { App } from './App';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Web application root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
