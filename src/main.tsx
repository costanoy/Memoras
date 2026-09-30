import '@fontsource-variable/source-sans-3';
import '@fontsource-variable/source-sans-3/wght-italic.css';
import '@fontsource/source-code-pro/500.css';
import '@fontsource/source-code-pro/600.css';
import './styles.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { setupBackButton } from './native';
import { preloadSounds } from './sounds';
import { init } from './store';
import { startSync } from './sync';

createRoot(document.getElementById('root')!).render(<App />);
setupBackButton();
preloadSounds();
void init().then(startSync);
