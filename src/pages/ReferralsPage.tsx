import type { CSSProperties, ReactElement } from 'react';
import { useState } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useReferral, useShareReferral } from '@/hooks';
import {
  REFERRAL_RESOURCE_FIXTURE,
  type ReferralResource,
} from '@/fixtures/data';

export default function ReferralsPage(): ReactElement {
  const referralQuery = useReferral();
  const shareMutation = useShareReferral();
  const referral: ReferralResource = referralQuery.data ?? REFERRAL_RESOURCE_FIXTURE;

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [lastChannel, setLastChannel] = useState<'email' | 'sms' | 'link' | 'other' | null>(null);

  const handleCopy = async () => {
    const link = `https://storyteller.test/r/${referral.code}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        setCopyState('copied');
      } else {
        setCopyState('failed');
      }
    } catch {
      setCopyState('failed');
    }
  };

  const handleShare = async (channel: 'email' | 'sms' | 'link' | 'other') => {
    try {
      await shareMutation.mutateAsync({ channel });
      setLastChannel(channel);
    } catch (err) {
      // eslint-disable-next-line no-console -- intentional dev signal
      console.warn('[storyteller/web] share failed', err);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Referrals"
        title="Bring another traveler"
        description="Share your link. When a friend converts, both of you receive a credits grant posted through the verified payment webhook — not the browser return URL."
      />

      {referralQuery.isLoading ? (
        <LoadingPanel label="Loading invite" intent="inline" />
      ) : (
        <section
          aria-labelledby="invite"
          style={{
            padding: 'var(--space-5)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            display: 'grid',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Pill intent="success" title="Active invite">
              active
            </Pill>
            <Pill intent="muted" title={`Code: ${referral.code}`}>
              {referral.code}
            </Pill>
            <Pill intent="info" title={`Share count: ${referral.count}`}>
              {referral.count} shares
            </Pill>
            <Pill intent="muted" title={`Rewards earned: ${referral.rewards_earned}`}>
              {referral.rewards_earned} rewards
            </Pill>
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <span style={{ fontWeight: 'var(--weight-medium)' }}>Your invite code</span>
              <input readOnly value={referral.code} style={inputStyle} aria-label="Invite code" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <span style={{ fontWeight: 'var(--weight-medium)' }}>Shareable link</span>
              <input
                readOnly
                value={`https://storyteller.test/r/${referral.code}`}
                style={inputStyle}
                aria-label="Shareable link"
              />
            </label>
          </div>

          {shareMutation.error && (
            <p
              role="alert"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-danger)',
                fontSize: 'var(--text-sm)',
                margin: 0,
              }}
            >
              Share failed: {shareMutation.error.message}
            </p>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button intent="primary" onClick={() => void handleCopy()} aria-label="Copy invite link to clipboard">
              {copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Copy failed' : 'Copy invite link'}
            </Button>
            <Button
              intent="secondary"
              disabled={shareMutation.isPending}
              onClick={() => void handleShare('email')}
              aria-label="Share via email"
            >
              {shareMutation.isPending && shareMutation.variables?.channel === 'email'
                ? 'Recording…'
                : 'Share via email'}
            </Button>
            <Button
              intent="ghost"
              disabled={shareMutation.isPending}
              onClick={() => void handleShare('link')}
              aria-label="Share via link"
            >
              {shareMutation.isPending && shareMutation.variables?.channel === 'link'
                ? 'Recording…'
                : 'Share via link'}
            </Button>
            <span role="status" aria-live="polite" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-foreground-muted)' }}>
              {lastChannel ? `Last share recorded via ${lastChannel}.` : copyState === 'copied' ? 'Invite link copied to clipboard.' : null}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
  color: 'var(--color-foreground)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-base)',
  minHeight: 'var(--control-touch-min)',
};
