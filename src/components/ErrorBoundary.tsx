import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { captureFrontendError } from '@/lib/monitoring';

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void captureFrontendError(error, {
      source: 'react_error_boundary',
      metadata: { componentStack: info.componentStack },
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 'var(--space-5)',
          background: 'var(--color-bg)',
          color: 'var(--color-text-1)',
        }}
      >
        <section
          className="card"
          style={{
            width: 'min(100%, 420px)',
            padding: 'var(--space-6)',
            textAlign: 'center',
            borderColor: 'var(--color-warning)',
          }}
        >
          <AlertTriangle size={32} style={{ margin: '0 auto var(--space-3)', color: 'var(--color-warning)' }} />
          <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>Erreur d'affichage</h1>
          <p style={{ color: 'var(--color-text-2)', fontSize: 'var(--text-sm)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
            L'incident a été enregistré. Rechargez la page pour reprendre.
          </p>
          <button className="btn btn-primary btn-full" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Recharger
          </button>
        </section>
      </main>
    );
  }
}
