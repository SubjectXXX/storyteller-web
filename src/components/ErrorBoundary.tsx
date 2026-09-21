import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console -- intentional dev signal
    console.error('[storyteller/web] runtime error', error, info);
  }

  override render(): ReactNode {
    if (! this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(new Error(this.state.message ?? 'Unknown error'), () => {
        this.setState({ hasError: false, message: null });
      });
    }

    return (
      <div
        role="alert"
        className="error-fallback"
        style={{
          margin: 'auto',
          maxWidth: 480,
          padding: 'var(--space-6)',
          color: 'var(--color-danger)',
        }}
      >
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)' }}>
          Something went wrong
        </h1>
        <p>{this.state.message ?? 'Unexpected error'}</p>
        <button
          type="button"
          onClick={() => this.setState({ hasError: false, message: null })}
          style={{
            marginTop: 'var(--space-4)',
            background: 'var(--color-primary)',
            color: 'var(--color-primary-foreground)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
