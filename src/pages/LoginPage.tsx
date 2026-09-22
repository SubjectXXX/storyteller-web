import type { CSSProperties, ReactElement } from 'react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useAuth } from '@/auth/useAuth';
import { ApiError } from '@/api-client';

export default function LoginPage(): ReactElement {
  const { signIn, token, error, ready } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Already signed in? Bounce home (or wherever they were going).
  if (ready && token !== null) {
    const next = search.get('next');
    return <Navigate to={next && next.startsWith('/') ? next : '/'} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await signIn({ email, password });
      const next = search.get('next');
      navigate(next && next.startsWith('/') ? next : '/', { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 422
            ? 'Invalid email or password.'
            : err.message
          : err instanceof Error
            ? err.message
            : 'Could not sign in.';
      setLocalError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Sign in"
        title="Welcome back"
        description="Sign in to resume an adventure, manage your wallet, or invite a friend."
      />

      {ready && !token ? (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
          style={formStyle}
          aria-describedby={localError ? 'login-error' : undefined}
        >
          <label style={fieldStyle}>
            <span style={labelStyle}>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={inputStyle}
              aria-label="Email address"
            />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={inputStyle}
              aria-label="Password"
            />
          </label>

          {(localError ?? error) && (
            <p id="login-error" role="alert" style={errorStyle}>
              {localError ?? error?.message}
            </p>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Button intent="primary" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <Link to="/register" style={{ marginLeft: 'var(--space-2)' }}>
              Need an account? Register
            </Link>
          </div>
        </form>
      ) : (
        <LoadingPanel label="Resuming your session" intent="inline" />
      )}
    </div>
  );
}

const formStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--space-3)',
  maxWidth: 420,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-5)',
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)',
};

const labelStyle: CSSProperties = {
  fontWeight: 'var(--weight-medium)',
  fontSize: 'var(--text-sm)',
};

const inputStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-2) var(--space-3)',
  background: 'var(--color-surface-muted)',
  color: 'var(--color-foreground)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-base)',
  minHeight: 'var(--control-touch-min)',
};

const errorStyle: CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  border: '1px solid var(--color-danger)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-danger)',
  background: 'var(--color-surface-muted)',
  fontSize: 'var(--text-sm)',
  margin: 0,
};
