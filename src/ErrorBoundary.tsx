import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
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

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-white p-8 font-mono">
          <h1 className="text-xl font-bold text-red-400 mb-4">Erreur React</h1>
          <pre className="bg-slate-900 p-4 rounded overflow-auto text-sm text-red-300">
            {this.state.error.toString()}
          </pre>
          {this.state.error.stack && (
            <pre className="mt-4 bg-slate-900 p-4 rounded overflow-auto text-xs text-slate-400 max-h-96">
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
