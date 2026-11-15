import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function Placeholder() {
  return <h1>SOP Viewer</h1>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Placeholder />
  </StrictMode>,
);
