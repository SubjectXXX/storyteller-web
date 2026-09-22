import type { ReactElement } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { WALLET_FIXTURE } from '@/fixtures/data';

export default function WalletPage(): ReactElement {
  const totalCreditsWithBonus = (base: number, bonusPercent: number) =>
    base + Math.round((base * bonusPercent) / 100);

  return (
    <div>
      <PageHeader
        eyebrow="Wallet"
        title="Credits & packages"
        description="Every purchase posts through the verified payment webhook, not the browser return URL. The reservations column is the live count of in-flight purchases."
      />

      <section
        aria-labelledby="balance"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <article
          style={{
            padding: 'var(--space-5)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <span style={{ color: 'var(--color-foreground-subtle)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
            Balance
          </span>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-4xl)', fontWeight: 'var(--weight-semibold)', margin: 0 }}>
            {WALLET_FIXTURE.balanceCredits}
            <span style={{ fontSize: 'var(--text-md)', color: 'var(--color-foreground-muted)', marginLeft: 'var(--space-2)' }}>
              credits
            </span>
          </p>
          <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
            {WALLET_FIXTURE.pendingReservations} reservation in flight
          </span>
        </article>

        <article
          style={{
            padding: 'var(--space-5)',
            background: 'var(--color-surface-muted)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <span style={{ color: 'var(--color-foreground-subtle)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
            Tier
          </span>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', margin: 0 }}>Wayfinder</p>
          <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
            100 credits to next tier \u00b7 monthly bonus +5%
          </span>
        </article>
      </section>

      <h2
        id="packages"
        style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)' }}
      >
        Credit packages
      </h2>
      <ul
        aria-labelledby="packages"
        style={{
          display: 'grid',
          gap: 'var(--space-3)',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {WALLET_FIXTURE.packages.map((pkg) => (
          <li
            key={pkg.id}
            style={{
              padding: 'var(--space-4)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 'var(--space-4)',
              alignItems: 'center',
              opacity: pkg.eligible ? 1 : 0.7,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <strong style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)' }}>{pkg.name}</strong>
              <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
                {totalCreditsWithBonus(pkg.baseCredits, pkg.bonusPercent)} credits
                {pkg.bonusPercent > 0 && (
                  <em style={{ marginLeft: 'var(--space-2)', color: 'var(--color-success)' }}>
                    +{pkg.bonusPercent}% bonus
                  </em>
                )}
              </span>
              {!pkg.eligible && pkg.reason && (
                <Pill intent="warning" title={pkg.reason}>
                  Regional restriction
                </Pill>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-foreground-muted)' }}>
                {pkg.priceLabel}
              </span>
              <Button intent={pkg.eligible ? 'primary' : 'secondary'} disabled={!pkg.eligible}>
                {pkg.eligible ? 'Buy' : 'Unavailable'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
