import { StrictMode, Component, type ReactNode, type ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error boundary — prevents black screen on uncaught errors
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crash:', error, info);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{
          minHeight: '100dvh',
          background: '#050505',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          padding: '24px',
          textAlign: 'center',
          gap: '16px',
        }}>
          <div style={{
            background: '#ffd700',
            color: '#000',
            fontWeight: 800,
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '1rem',
            letterSpacing: '0.1em',
          }}>STEA</div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#ff6b6b' }}>Something went wrong</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', maxWidth: '400px' }}>
            {err.message || 'An unexpected error occurred. Please refresh the page.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px',
              padding: '10px 24px',
              background: '#ffd700',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
