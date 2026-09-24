import type { CSSProperties, ReactElement } from 'react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useAuth } from '@/auth/useAuth';
import { ApiError } from '@/api-client';

export default function LoginPage(): ReactElement {
  const { signIn, signOut, token, user, ready } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Authenticated users see a "Signed in" panel instead of the email form
  // so the page is always testable: an unauthenticated user can sign in, a
  // signed-in user can sign out and try a different account.
  const signedIn = ready && token !== null && user !== null;
  if (signedIn) {
    const next = search.get('next');
    return (
      <SignedInPanel
        name={user?.name ?? user?.email ?? 'your account'}
        signingOut={signingOut}
        onContinueHome={() => navigate(next && next.startsWith('/') ? next : '/', { replace: true })}
        onSignOut={async () => {
          setSigningOut(true);
          try {
            await signOut();
            navigate('/login', { replace: true });
          } finally {
            setSigningOut(false);
          }
        }}
      />
    );
  }

  // `ready` is true but `token` is null: bootstrap rejected the stored
  // token and cleared it. Fall through to the form.
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

      {ready ? (
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

          {localError && (
            <p id="login-error" role="alert" style={errorStyle}>
              {localError}
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

interface SignedInPanelProps {
  readonly name: string;
  readonly signingOut: boolean;
  readonly onContinueHome: () => void;
  readonly onSignOut: () => void | Promise<void>;
}

function SignedInPanel({
  name,
  signingOut,
  onContinueHome,
  onSignOut,
}: SignedInPanelProps): ReactElement {
  return (
    <div>
      <PageHeader
        eyebrow="Signed in"
        title="You're already signed in"
        description="Use a different account? Sign out below, or continue to the home page."
      />
      <div
        role="region"
        aria-label="Current session"
        style={{
          ...formStyle,
          gap: 'var(--space-3)',
        }}
      >
        <p
          data-testid="login-signed-in-name"
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: 'var(--text-lg)',
          }}
        >
          Signed in as <strong>{name}</strong>.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button intent="primary" onClick={onContinueHome}>
            Continue to home
          </Button>
          <Button
            intent="secondary"
            onClick={() => void onSignOut()}
            disabled={signingOut}
            aria-label="Sign out and return to login form"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </div>
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
