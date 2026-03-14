import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary';
import { I18nProvider } from './i18n/I18nProvider';
import { isTinyFishStream } from './utils/tinyfishContext';

const isTinyFish = isTinyFishStream();

async function bootstrap() {
  const host = document.getElementById('root')!;
  let container: HTMLElement;

  if (!isTinyFish) {
    import('./index.css');
    container = host;
  } else {
    // Mode TinyFish : Shadow DOM pour isoler React des injections du viewer (curseur, overlay)
    // qui provoquent l'erreur insertBefore. Le Shadow DOM crée une frontière que les scripts
    // externes ne peuvent pas traverser.
    if (host.shadowRoot) {
      let existing = host.shadowRoot.getElementById('react-root');
      if (!existing) {
        existing = document.createElement('div');
        existing.id = 'react-root';
        existing.style.cssText = 'height: 100%; min-height: 100%; overflow: hidden;';
        host.shadowRoot.appendChild(existing);
      }
      container = existing;
    } else {
      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      const { default: cssString } = await import('./index.css?inline');
      style.textContent =
        cssString + '\n\n:host { display: block; height: 100%; min-height: 100%; overflow: hidden; }';
      shadow.appendChild(style);
      container = document.createElement('div');
      container.id = 'react-root';
      container.style.cssText = 'height: 100%; min-height: 100%; overflow: hidden;';
      shadow.appendChild(container);
    }
  }

  const root = createRoot(container);
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
}

bootstrap();
