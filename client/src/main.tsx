import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './contexts/AuthContext'

// ── ErrorBoundary ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'Arial, sans-serif',
          background: '#0a0a0a',
          color: '#ffffff',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#d32f2f', letterSpacing: '-2px', marginBottom: '0.5rem' }}>
            箱 hako
          </div>
          <h2 style={{ marginBottom: '0.75rem', fontSize: '1.5rem' }}>Algo salió mal</h2>
          <p style={{ color: '#888', marginBottom: '2rem', maxWidth: 420 }}>
            Ocurrió un error inesperado en la aplicación. Por favor recarga la página.
            Si el problema persiste, contacta a soporte.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              padding: '0.75rem 2.5rem',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Recargar página
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: '2rem',
              padding: '1rem',
              background: '#1a1a1a',
              borderRadius: '8px',
              color: '#ff6b6b',
              fontSize: '0.75rem',
              textAlign: 'left',
              maxWidth: '90vw',
              overflow: 'auto',
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ── App render ────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
