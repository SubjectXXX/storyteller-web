import type { ReactElement } from "react";
interface ReferralFixture {
  code: string;
  link: string;
  inviterStatus: 'active' | 'paused' | 'revoked';
  rewardsGranted: number;
}

const FIXTURE: ReferralFixture = {
  code: 'WANDER-7821',
  link: 'https://storyteller.test/r/WANDER-7821',
  inviterStatus: 'active',
  rewardsGranted: 2,
};

export default function ReferralsPage(): ReactElement {
  return (
    <section aria-labelledby="referrals" style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <h1 id="referrals" style={{ fontSize: 'var(--text-2xl)' }}>
        Referrals
      </h1>
      <p style={{ color: 'var(--color-foreground-muted)' }}>
        Share your link. When a friend converts, both of you receive a
        credits grant posted through the verified payment webhook — not
        the browser return URL.
      </p>

      <div
        style={{
          padding: 'var(--space-4)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          display: 'grid',
          gap: 'var(--space-3)',
        }}
      >
        <label>
          <span style={{ fontWeight: 500 }}>Your invite code</span>
          <input readOnly value={FIXTURE.code} style={inputStyle} />
        </label>
        <label>
          <span style={{ fontWeight: 500 }}>Shareable link</span>
          <input readOnly value={FIXTURE.link} style={inputStyle} />
        </label>
        <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
          Status: {FIXTURE.inviterStatus}. Granted rewards: {FIXTURE.rewardsGranted}.
        </p>
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 'var(--space-1)',
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
  fontFamily: 'var(--font-mono)',
};
