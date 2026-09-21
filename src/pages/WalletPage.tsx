import type { ReactElement } from "react";
interface WalletFixture {
  balanceCredits: number;
  pendingReservations: number;
  currency: 'credits';
  packages: ReadonlyArray<{
    id: string;
    name: string;
    baseCredits: number;
    bonus: number;
    priceLabel: string;
    eligible: boolean;
    reason?: string;
  }>;
}

const FIXTURE: WalletFixture = {
  balanceCredits: 12,
  pendingReservations: 1,
  currency: 'credits',
  packages: [
    {
      id: 'pkg-starter',
      name: 'Starter Pack',
      baseCredits: 100,
      bonus: 0,
      priceLabel: '$5.00 USD',
      eligible: true,
    },
    {
      id: 'pkg-explorer',
      name: 'Explorer Pack',
      baseCredits: 500,
      bonus: 10,
      priceLabel: '$22.00 USD',
      eligible: true,
    },
    {
      id: 'pkg-vault',
      name: 'Vault Pack',
      baseCredits: 2400,
      bonus: 15,
      priceLabel: '$99.00 USD',
      eligible: false,
      reason: 'Currently available in EU, US, CA, AU only.',
    },
  ],
};

export default function WalletPage(): ReactElement {
  return (
    <section aria-labelledby="wallet" style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <h1 id="wallet" style={{ fontSize: 'var(--text-2xl)' }}>
        Wallet & credits
      </h1>
      <div
        style={{
          padding: 'var(--space-4)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          display: 'grid',
          gap: 'var(--space-2)',
        }}
      >
        <p style={{ fontSize: 'var(--text-4xl)', fontWeight: 600 }}>
          {FIXTURE.balanceCredits}
          <span style={{ fontSize: 'var(--text-md)', color: 'var(--color-foreground-muted)' }}> credits</span>
        </p>
        <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
          {FIXTURE.pendingReservations} reservation in flight.
        </p>
      </div>

      <h2 style={{ fontSize: 'var(--text-lg)', marginTop: 'var(--space-4)' }}>Credit packages</h2>
      <ul style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {FIXTURE.packages.map((pkg) => (
          <li
            key={pkg.id}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              opacity: pkg.eligible ? 1 : 0.7,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong>{pkg.name}</strong>
              <span style={{ color: 'var(--color-foreground-muted)' }}>{pkg.priceLabel}</span>
            </div>
            <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
              {pkg.baseCredits + pkg.bonus} credits{pkg.bonus > 0 && <em> (+{pkg.bonus}% bonus)</em>}
            </p>
            {! pkg.eligible && (
              <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
                {pkg.reason}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
