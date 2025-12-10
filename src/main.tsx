import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ProjectorView } from './components/ProjectorView';

/**
 * Entry point for YouRoke application
 *
 * Routes:
 * - Default: Main app with controls
 * - ?projector=true: Projector view (fullscreen display for external monitor)
 */

// Check if we're in projector mode
const urlParams = new URLSearchParams(window.location.search);
const isProjectorMode = urlParams.has('projector');

// Render appropriate component
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    {isProjectorMode ? <ProjectorView /> : <App />}
  </StrictMode>
);
