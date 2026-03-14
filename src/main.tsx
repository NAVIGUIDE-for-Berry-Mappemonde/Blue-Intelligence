import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './ErrorBoundary';
import { I18nProvider } from './i18n/I18nProvider';
import { isTinyFishStream } from './utils/tinyfishContext';

const root = createRoot(document.getElementById('root')!);
const isTinyFish = isTinyFishStream();

// Désactiver StrictMode dans le flux TinyFish pour limiter les conflits DOM (insertBefore)
root.render(
  isTinyFish ? (
    <ErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  ) : (
    <StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ErrorBoundary>
    </StrictMode>
  ),
);
