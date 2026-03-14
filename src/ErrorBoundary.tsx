import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Si true, affiche un fallback compact au lieu de remplacer tout le contenu */
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const isInsertBefore = this.state.error.message?.includes("insertBefore");
      const isTinyFishContext = isInsertBefore;

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-white p-8 font-mono flex flex-col">
          <h1 className="text-xl font-bold text-red-400 mb-2">Erreur React</h1>
          {isTinyFishContext && (
            <p className="text-slate-400 text-sm mb-4 max-w-xl">
              L&apos;inspecteur TinyFish modifie le DOM et peut provoquer ce conflit. Rechargez la page pour continuer.
            </p>
          )}
          <pre className="bg-slate-900 p-4 rounded overflow-auto text-sm text-red-300 flex-1 min-h-0">
            {this.state.error.toString()}
          </pre>
          <div className="mt-4 flex gap-3">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium text-sm"
            >
              Recharger la page
            </button>
            {!isInsertBefore && (
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-medium text-sm"
              >
                Réessayer
              </button>
            )}
          </div>
          {this.state.error.stack && (
            <details className="mt-4">
              <summary className="text-xs text-slate-500 cursor-pointer">Détails techniques</summary>
              <pre className="mt-2 bg-slate-900 p-4 rounded overflow-auto text-xs text-slate-500 max-h-48">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
