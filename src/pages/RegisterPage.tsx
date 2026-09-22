import type { CSSProperties, ReactElement } from 'react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useAuth } from '@/auth/useAuth';
import { ApiError } from '@/api-client';

interface RegisterErrors {
  email?: string;
  password?: string;
  password_confirmation?: string;
  name?: string;
  attests_adult?: string;
}

export default function RegisterPage(): ReactElement {
  const { signUp, token, ready } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [attestsAdult, setAttestsAdult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  if (ready && token !== null) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors(null);
    setGlobalError(null);

    const localErrors: RegisterErrors = {};
    if (!name.trim()) localErrors.name = 'Name is required.';
    if (!email.trim()) localErrors.email = 'Email is required.';
    if (password.length < 8) localErrors.password = 'Password must be at least 8 characters.';
    if (password !== passwordConfirmation)
      localErrors.password_confirmation = 'Password confirmation does not match.';
    if (!attestsAdult) localErrors.attests_adult = 'You must attest you are an adult to play.';
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
        attests_adult: true,
      });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setErrors((err.fields as RegisterErrors | undefined) ?? {});
        setGlobalError(err.message);
      } else {
        setGlobalError(err instanceof Error ? err.message : 'Could not register.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (key: keyof RegisterErrors): string | undefined => errors?.[key];

  return (
    <div>
      <PageHeader
        eyebrow="Register"
        title="Create your storyteller account"
        description="An adult attestation is required to align with our content warnings and age-gated scenarios."
      />

      {ready && !token ? (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
          style={formStyle}
        >
          <label style={fieldStyle}>
            <span style={labelStyle}>Display name</span>
            <input
              type="text"
              required
              minLength={1}
              maxLength={120}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={inputStyle}
              aria-invalid={Boolean(fieldError('name'))}
              aria-label="Display name"
            />
            {fieldError('name') && <span style={hintError}>{fieldError('name')}</span>}
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={inputStyle}
              aria-invalid={Boolean(fieldError('email'))}
              aria-label="Email address"
            />
            {fieldError('email') && <span style={hintError}>{fieldError('email')}</span>}
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={inputStyle}
              aria-invalid={Boolean(fieldError('password'))}
              aria-label="Password"
            />
            {fieldError('password') && <span style={hintError}>{fieldError('password')}</span>}
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Confirm password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              style={inputStyle}
              aria-invalid={Boolean(fieldError('password_confirmation'))}
              aria-label="Confirm password"
            />
            {fieldError('password_confirmation') && (
              <span style={hintError}>{fieldError('password_confirmation')}</span>
            )}
          </label>

          <label style={checkboxRow}>
            <input
              type="checkbox"
              required
              checked={attestsAdult}
              onChange={(event) => setAttestsAdult(event.target.checked)}
              aria-label="Adult attestation"
            />
            <span>I attest that I am 18 years of age or older.</span>
          </label>
          {fieldError('attests_adult') && (
            <span style={hintError}>{fieldError('attests_adult')}</span>
          )}

          {globalError && (
            <p role="alert" style={errorStyle}>
              {globalError}
            </p>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Button intent="primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
            <Link to="/login" style={{ marginLeft: 'var(--space-2)' }}>
              Already have an account? Sign in
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
  maxWidth: 480,
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

const checkboxRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  fontSize: 'var(--text-sm)',
};

const hintError: CSSProperties = {
  color: 'var(--color-danger)',
  fontSize: 'var(--text-xs)',
  margin: 0,
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
