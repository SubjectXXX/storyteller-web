import type { ReactElement } from 'react';
import { useState } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { Pill, type PillIntent } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useReferral } from '@/hooks';
import { REFERRAL_FIXTURE, type ReferralFixture } from '@/fixtures/data';

const TIER_LABEL: Record<ReferralFixture['tier'], string> = {
  lantern: 'Lantern Bearer',
  cartographer: 'Cartographer',
  wayfinder: 'Wayfinder',
};

const STATUS_PILL: Record<ReferralFixture['inviterStatus'], PillIntent> = {
  active: 'success',
  paused: 'warning',
  revoked: 'danger',
};

export default function ReferralsPage(): ReactElement {
  // S2-T01 contract: `GET /api/referrals/me` returns the player's invite
  // code/link/status. POST `/api/referrals/share` records a share event so
  // rewards can be attributed — for now we just optimistically update the
  // local reward counter; S2-T01 will replace it with a server-side counter.
  const referralQuery = useReferral();
  const referral: ReferralFixture = referralQuery.data ?? REFERRAL_FIXTURE;
  const [localRewardsGranted, setLocalRewardsGranted] = useState<number | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const rewardsGranted = localRewardsGranted ?? referral.rewardsGranted;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(referral.link);
        setCopyState('copied');
      } else {
        setCopyState('failed');
      }
    } catch {
      setCopyState('failed');
    }
  };

  const handleShare = () => {
    // TODO(S2-T01): POST /api/referrals/share — bumps `rewardsGranted`
    // server-side and returns the new total.
    setLocalRewardsGranted((prev) => (prev ?? referral.rewardsGranted) + 1);
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
            borderRadius: 'var(--radius-lg)',
            display: 'grid',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Pill intent={STATUS_PILL[referral.inviterStatus]} title={`Status: ${referral.inviterStatus}`}>
              {referral.inviterStatus}
            </Pill>
            <Pill intent="info" title={`Tier: ${TIER_LABEL[referral.tier]}`}>
              {TIER_LABEL[referral.tier]} tier
            </Pill>
            <Pill intent="muted" title="Granted rewards">
              {rewardsGranted} rewards granted
            </Pill>
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <span style={{ fontWeight: 'var(--weight-medium)' }}>Your invite code</span>
              <input readOnly value={referral.code} style={inputStyle} aria-label="Invite code" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <span style={{ fontWeight: 'var(--weight-medium)' }}>Shareable link</span>
              <input readOnly value={referral.link} style={inputStyle} aria-label="Shareable link" />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button intent="primary" onClick={handleCopy} aria-label="Copy invite link to clipboard">
              {copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Copy failed' : 'Copy invite link'}
            </Button>
            <Button intent="secondary" onClick={handleShare}>
              Share via email
            </Button>
            <span role="status" aria-live="polite" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-foreground-muted)' }}>
              {copyState === 'copied' ? 'Invite link copied to clipboard.' : null}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
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
