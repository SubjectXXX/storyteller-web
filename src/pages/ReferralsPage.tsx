import type { ReactElement } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { Pill, type PillIntent } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { REFERRAL_FIXTURE } from '@/fixtures/data';

const TIER_LABEL: Record<typeof REFERRAL_FIXTURE.tier, string> = {
  lantern: 'Lantern Bearer',
  cartographer: 'Cartographer',
  wayfinder: 'Wayfinder',
};

const STATUS_PILL: Record<typeof REFERRAL_FIXTURE.inviterStatus, PillIntent> = {
  active: 'success',
  paused: 'warning',
  revoked: 'danger',
};

export default function ReferralsPage(): ReactElement {
  return (
    <div>
      <PageHeader
        eyebrow="Referrals"
        title="Bring another traveler"
        description="Share your link. When a friend converts, both of you receive a credits grant posted through the verified payment webhook \u2014 not the browser return URL."
      />

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
          <Pill intent={STATUS_PILL[REFERRAL_FIXTURE.inviterStatus]} title={`Status: ${REFERRAL_FIXTURE.inviterStatus}`}>
            {REFERRAL_FIXTURE.inviterStatus}
          </Pill>
          <Pill intent="info" title={`Tier: ${TIER_LABEL[REFERRAL_FIXTURE.tier]}`}>
            {TIER_LABEL[REFERRAL_FIXTURE.tier]} tier
          </Pill>
          <Pill intent="muted" title="Granted rewards">
            {REFERRAL_FIXTURE.rewardsGranted} rewards granted
          </Pill>
        </div>

        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontWeight: 'var(--weight-medium)' }}>Your invite code</span>
            <input readOnly value={REFERRAL_FIXTURE.code} style={inputStyle} aria-label="Invite code" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontWeight: 'var(--weight-medium)' }}>Shareable link</span>
            <input readOnly value={REFERRAL_FIXTURE.link} style={inputStyle} aria-label="Shareable link" />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button intent="primary">Copy invite link</Button>
          <Button intent="secondary">Share via email</Button>
        </div>
      </section>
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
