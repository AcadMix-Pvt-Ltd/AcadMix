// @ts-nocheck
import React from 'react';

/**
 * ErrorBoundary — catches uncaught errors in child components.
 * 
 * Prevents a crash in one page from taking down the entire app.
 * Reports errors to Sentry automatically.
 * 
 * Usage:
 *   <ErrorBoundary>
 *     <StudentDashboard />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // ── VITE CHUNK LOAD ERROR AUTO-RECOVERY ──
    // When a new version is deployed, old chunks 404. Auto-reload to fetch the new index.html.
    const isChunkError = error?.message?.includes('Failed to fetch dynamically imported module') || 
                         error?.name === 'ChunkLoadError';
    
    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem('chunk_error_reloaded');
      if (!hasReloaded) {
        console.warn('ChunkLoadError detected: Auto-reloading to fetch latest deployment...');
        sessionStorage.setItem('chunk_error_reloaded', 'true');
        window.location.reload();
        return;
      }
    } else {
      // Clear flag on successful mount of healthy components
      sessionStorage.removeItem('chunk_error_reloaded');
    }

    this.setState({ errorInfo });
    // Report to Sentry
    if (window.Sentry?.captureException) {
      window.Sentry.captureException(error, {
        extra: { componentStack: errorInfo?.componentStack },
      });
    }
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    sessionStorage.removeItem('chunk_error_reloaded');
    // If it is a chunk error and they manually click Try Again, a simple state reset won't work.
    if (this.state.error?.message?.includes('Failed to fetch dynamically imported module')) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };

  handleGoHome = () => {
    sessionStorage.removeItem('chunk_error_reloaded');
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.handleReset,
        });
      }

      // Default fallback
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '420px',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😵</div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
              color: '#1e293b',
            }}>
              Something went wrong
            </h2>
            <p style={{
              color: '#64748b',
              marginBottom: '1.5rem',
              lineHeight: 1.5,
            }}>
              {this.state.error?.message || 'An unexpected error occurred. Our team has been notified.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#334155',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
