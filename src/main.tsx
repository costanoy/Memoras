import '@fontsource-variable/source-sans-3';
import '@fontsource-variable/source-sans-3/wght-italic.css';
import '@fontsource/source-code-pro/500.css';
import '@fontsource/source-code-pro/600.css';
import './styles.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { setupBackButton, watchAway } from './native';
import { preloadSounds } from './sounds';
import { init } from './store';
import { startSync } from './sync';
import { THEMES, THEME_MIRROR, applyTheme, type ThemeKey } from './themes';
import { startUpdates } from './updates';

try { const t = localStorage.getItem(THEME_MIRROR); if (t && Object.hasOwn(THEMES, t)) applyTheme(t as ThemeKey); } catch { /* sem localStorage: abre no tema padrão */ }
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App /></ErrorBoundary>);
setupBackButton();
watchAway();
preloadSounds();
void init().then(() => { startSync(); startUpdates(); });
