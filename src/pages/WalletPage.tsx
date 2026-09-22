import type { ReactElement } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useTopUpWallet, useWallet } from '@/hooks';
import { WALLET_RESOURCE_FIXTURE, type WalletResource } from '@/fixtures/data';

const TOP_UP_PACKAGES: ReadonlyArray<{
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly bonus: number;
}> = [
  { id: 'pkg-starter', name: 'Starter Pack', amount: 100, bonus: 0 },
  { id: 'pkg-explorer', name: 'Explorer Pack', amount: 500, bonus: 10 },
  { id: 'pkg-vault', name: 'Vault Pack', amount: 2400, bonus: 15 },
];

export default function WalletPage(): ReactElement {
  const walletQuery = useWallet();
  const topUpMutation = useTopUpWallet();

  const wallet: WalletResource = walletQuery.data ?? WALLET_RESOURCE_FIXTURE;

  const handleBuy = async (pkg: { readonly id: string; readonly amount: number }) => {
    try {
      await topUpMutation.mutateAsync({ package_id: pkg.id, amount: pkg.amount });
    } catch (err) {
      // The mutation's error state is already surfaced via `topUpMutation.error`.
      // eslint-disable-next-line no-console -- intentional dev signal
      console.warn('[storyteller/web] top-up failed', err);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Wallet"
        title="Credits & packages"
        description="Every purchase posts through the verified payment webhook, not the browser return URL. Local-dev top-ups add credits immediately for testing the S2 flow."
      />

      {walletQuery.isLoading ? (
        <LoadingPanel label="Loading wallet" intent="inline" />
      ) : (
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
            <span
              style={{
                color: 'var(--color-foreground-subtle)',
                fontSize: 'var(--text-xs)',
                textTransform: 'uppercase',
              }}
            >
              Balance
            </span>
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-4xl)',
                fontWeight: 'var(--weight-semibold)',
                margin: 0,
              }}
            >
              {wallet.balance}
              <span
                style={{
                  fontSize: 'var(--text-md)',
                  color: 'var(--color-foreground-muted)',
                  marginLeft: 'var(--space-2)',
                }}
              >
                {wallet.currency}
              </span>
            </p>
            <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
              Updated {new Date(wallet.updated_at).toLocaleString()}
            </span>
          </article>
        </section>
      )}

      <h2
        id="packages"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--text-xl)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Credit packages
      </h2>

      {topUpMutation.error && (
        <p
          role="alert"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Top-up failed: {topUpMutation.error.message}
        </p>
      )}

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
        {TOP_UP_PACKAGES.map((pkg) => (
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
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <strong style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)' }}>
                {pkg.name}
              </strong>
              <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
                {pkg.amount + Math.round((pkg.amount * pkg.bonus) / 100)} credits
                {pkg.bonus > 0 && (
                  <em style={{ marginLeft: 'var(--space-2)', color: 'var(--color-success)' }}>
                    +{pkg.bonus}% bonus
                  </em>
                )}
              </span>
              <Pill intent="muted" title="Local-dev top-up">
                Local top-up
              </Pill>
            </div>
            <Button
              intent="primary"
              disabled={topUpMutation.isPending}
              onClick={() => void handleBuy(pkg)}
              aria-label={`Buy ${pkg.name}`}
            >
              {topUpMutation.isPending && topUpMutation.variables?.package_id === pkg.id
                ? 'Adding…'
                : 'Buy'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
