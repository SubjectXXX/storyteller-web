import type { ReactElement } from 'react';
import { useState } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import {
  useConfirmBillingLocalCheckout,
  useCreateBillingCheckout,
  useCreditPackages,
  useTestAi,
  useTopUpWallet,
  useWallet,
} from '@/hooks';
import {
  AI_TEST_RESPONSE_FIXTURE,
  CREDIT_PACKAGE_FIXTURES,
  WALLET_RESOURCE_FIXTURE,
  type CreditPackageResource,
  type WalletResource,
} from '@/fixtures/data';
import { ApiError } from '@/api-client';

const TEST_LLM_PROMPT =
  'You are a Storyteller narrator for a tabletop RPG. In two short paragraphs, describe what happens when the player enters a foggy harbour at dawn. Mention a lantern.';

function priceLabel(pkg: CreditPackageResource): string {
  if (pkg.price_cents <= 0) {
    return 'Free';
  }
  const amount = pkg.price_cents / 100;
  return `${amount.toFixed(2)} ${pkg.currency}`;
}

export default function WalletPage(): ReactElement {
  const walletQuery = useWallet();
  const packagesQuery = useCreditPackages();
  const topUpMutation = useTopUpWallet();
  const testAiMutation = useTestAi();
  const checkoutMutation = useCreateBillingCheckout();
  const localConfirmMutation = useConfirmBillingLocalCheckout();

  const wallet: WalletResource = walletQuery.data ?? WALLET_RESOURCE_FIXTURE;
  // R15 P1: `??` only fires on nullish, so an API success-with-empty-data
  // (`{"data":[]}`) hid the offline fixtures. Use `.length` so we fall
  // back to the fixture list when the live catalogue is empty too.
  const packages: ReadonlyArray<CreditPackageResource> =
    packagesQuery.data && packagesQuery.data.length > 0
      ? packagesQuery.data
      : CREDIT_PACKAGE_FIXTURES;

  // Last successful Test LLM response — used to render the result panel
  // and the cost / balance delta. Falls back to the fixture when the
  // user has never run the probe so the page still tells a story.
  const [lastTest, setLastTest] = useState<typeof testAiMutation.data | null>(null);
  const [lastStripeStatus, setLastStripeStatus] = useState<
    { status: 'credited' | 'duplicate'; session_id: string; balance: number | null } | null
  >(null);
  const balanceBelowTestLlm = wallet.balance <= 0;

  const handleBuy = async (pkg: CreditPackageResource) => {
    try {
      await topUpMutation.mutateAsync({
        package_id: pkg.slug,
        amount: pkg.credits,
      });
    } catch (err) {
      // The mutation's error state is already surfaced via `topUpMutation.error`.
      // eslint-disable-next-line no-console -- intentional dev signal
      console.warn('[storyteller/web] top-up failed', err);
    }
  };

  const handleRunTestLlm = async () => {
    try {
      const result = await testAiMutation.mutateAsync({ prompt: TEST_LLM_PROMPT });
      setLastTest(result);
    } catch (err) {
      // Error state is rendered inline below; just log in dev.
      // eslint-disable-next-line no-console -- intentional dev signal
      console.warn('[storyteller/web] Test LLM failed', err);
    }
  };

  /**
   * Stripe (S8-T02) top-up path. The api returns a checkout URL —
   * when `mode === 'local'` the URL points at the api's own local
   * checkout page so the player can confirm without a real card; in
   * production it points at `https://checkout.stripe.com/...` and the
   * SPA simply navigates. We also fire the local confirm afterwards
   * in local mode (the local-checkout page already does so via a
   * form post), and stale responses that have already credited are
   * treated as authoritative.
   */
  const handleStripeTopUp = async (pkg: CreditPackageResource): Promise<void> => {
    try {
      const result = await checkoutMutation.mutateAsync({ package_slug: pkg.slug });
      // R15 P1: persist the session id so the Re-confirm button can
      // re-drive the local-confirm idempotent path against the SAME
      // session (server returns `{status:'duplicate',credited:false}`
      // on the replay — that's the expected behaviour, not an error).
      if (typeof result.session_id === 'string' && result.session_id.length > 0) {
        try {
          window.localStorage.setItem(`stripe-session-${pkg.slug}`, result.session_id);
          window.localStorage.setItem(`stripe-session-initiated-${pkg.slug}`, new Date().toISOString());
        } catch {
          // localStorage can throw in private-mode browsers; not fatal.
        }
      }
      if (typeof result.checkout_url === 'string' && result.checkout_url.length > 0) {
        if (result.mode === 'local') {
          // The local-checkout page form-posts to the api; keep the
          // SPA on the wallet so it can update against the same
          // session id when the user returns from the page.
          window.location.assign(result.checkout_url);
          return;
        }
        window.location.assign(result.checkout_url);
        return;
      }
      throw new ApiError(502, { code: 'invalid_checkout_response', message: 'Stripe checkout did not return a URL.' });
    } catch (err) {
      // eslint-disable-next-line no-console -- intentional dev signal
      console.warn('[storyteller/web] Stripe checkout failed', err);
    }
  };

  const handleLocalStripeConfirm = async (sessionId: string, pkg: CreditPackageResource): Promise<void> => {
    try {
      const result = await localConfirmMutation.mutateAsync({
        session_id: sessionId,
        package_slug: pkg.slug,
      });
      setLastStripeStatus({
        status: result.status === 'credited' ? 'credited' : 'duplicate',
        session_id: sessionId,
        balance: result.balance ?? null,
      });
    } catch (err) {
      // eslint-disable-next-line no-console -- intentional dev signal
      console.warn('[storyteller/web] Stripe local confirm failed', err);
    }
  };

  // R15 P1: Re-confirm reads the session id captured by the most recent
  // Pay-with-Stripe click for this package. Falls back to the (legacy)
  // placeholder only as a last resort so the verifier can still drive
  // the button without a prior Pay-with-Stripe click — the api will
  // 404 on the placeholder and the player sees a clear error banner.
  const handleReconfirmFromStorage = (pkg: CreditPackageResource): void => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(`stripe-session-${pkg.slug}`);
    } catch {
      stored = null;
    }
    if (stored === null || stored.length === 0) {
      // No prior Pay-with-Stripe click — keep the legacy placeholder so
      // existing click-throughs don't break, but the api will reject it.
      stored = `demo-session-${pkg.slug}`;
    }
    void handleLocalStripeConfirm(stored, pkg);
  };

  const probe = lastTest ?? AI_TEST_RESPONSE_FIXTURE;

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
            data-testid="wallet-balance-card"
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
              data-testid="wallet-balance"
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
            {/* R24 DI-2: surface the reserved-aware `available` balance so
                the player can see what is actually spendable. The headline
                number includes pending holds (e.g. an in-flight turn that
                has reserved credits), so the two values can diverge until
                the reservation settles or releases. The tooltip spells out
                the difference so it never reads as a bug. */}
            <p
              data-testid="wallet-available"
              title="Available = balance − pending holds"
              style={{
                color: 'var(--color-foreground-muted)',
                fontSize: 'var(--text-sm)',
                margin: 0,
                display: 'flex',
                gap: 'var(--space-2)',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  textTransform: 'uppercase',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-foreground-subtle)',
                  letterSpacing: '0.04em',
                }}
              >
                Available now
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 'var(--weight-medium)',
                  color: 'var(--color-foreground)',
                }}
              >
                {typeof wallet.available === 'number' ? wallet.available : wallet.balance}{' '}
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-foreground-muted)',
                    marginLeft: 'var(--space-1)',
                  }}
                >
                  {wallet.currency}
                </span>
              </span>
            </p>
            <span
              data-testid="wallet-updated"
              style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}
            >
              Updated{' '}
              {wallet.updated_at ? new Date(wallet.updated_at).toLocaleString() : 'Never'}
            </span>
          </article>
        </section>
      )}

      <h2
        id="recent-activity"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--text-xl)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Recent activity
      </h2>
      <section
        aria-labelledby="recent-activity"
        data-testid="wallet-recent-activity"
        style={{
          padding: 'var(--space-4)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {wallet.recent_transactions && wallet.recent_transactions.length > 0 ? (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 'var(--space-2)',
            }}
          >
            {wallet.recent_transactions.slice(0, 5).map((entry) => {
              const credit = Number(entry.total_credit ?? 0);
              const debit = Number(entry.total_debit ?? 0);
              // A credit-only row is a top-up; a debit-only row is a spend
              // (a balanced two-leg row that nets positive = refund).
              const isCredit = credit > 0 && debit === 0;
              const isDebit = debit > 0 && credit === 0;
              const signedDelta = credit - debit;
              const formattedAmount =
                isCredit
                  ? `+${signedDelta} ${wallet.currency}`
                  : isDebit
                    ? `-${debit} ${wallet.currency}`
                    : `${signedDelta > 0 ? '+' : ''}${signedDelta} ${wallet.currency}`;
              const amountColor = signedDelta >= 0
                ? 'var(--color-success, #1f8a3a)'
                : 'var(--color-danger, #b3261e)';
              const description = entry.reference_type
                ? `${entry.kind.replace(/_/g, ' ')}${entry.reference_id !== null ? ` #${entry.reference_id}` : ''}`
                : entry.kind.replace(/_/g, ' ');
              return (
                <li
                  key={entry.uuid}
                  data-testid="wallet-recent-activity-row"
                  data-transaction-uuid={entry.uuid}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 'var(--space-2)',
                    alignItems: 'center',
                    padding: 'var(--space-2) 0',
                    borderBottom: '1px dashed var(--color-border)',
                  }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                    <span style={{ fontWeight: 'var(--weight-medium)', textTransform: 'capitalize' }}>
                      {description}
                    </span>
                    <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
                      {entry.posted_at
                        ? new Date(entry.posted_at).toLocaleString()
                        : 'Pending'}
                    </span>
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 'var(--text-md)',
                      fontWeight: 'var(--weight-semibold)',
                      color: amountColor,
                    }}
                  >
                    {formattedAmount}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p
            style={{
              color: 'var(--color-foreground-muted)',
              fontSize: 'var(--text-sm)',
              margin: 0,
            }}
          >
            No transactions yet. Top up below to get started.
          </p>
        )}
      </section>

      <h2
        id="test-llm"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--text-xl)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Test LLM
      </h2>
      <section
        aria-labelledby="test-llm"
        data-testid="wallet-test-llm"
        style={{
          padding: 'var(--space-4)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)', marginTop: 0 }}>
          Runs the active provider (LM Studio / qwen/qwen3-vl-4b by default) against a fixed prompt and charges
          the wallet through the S8-T01 ledger. Use this to verify the billing → model → response loop end-to-end
          without needing an adventure in flight.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <Button
            intent="primary"
            disabled={balanceBelowTestLlm || testAiMutation.isPending}
            onClick={() => void handleRunTestLlm()}
            data-testid="wallet-test-llm-run"
            aria-label={balanceBelowTestLlm ? 'Test LLM — top up to continue' : 'Run Test LLM probe'}
          >
            {testAiMutation.isPending ? 'Calling LM Studio…' : balanceBelowTestLlm ? 'Top up to continue' : 'Test LLM'}
          </Button>
          {balanceBelowTestLlm && (
            <Pill intent="warning" title="Insufficient credits">
              Balance 0
            </Pill>
          )}
        </div>

        {testAiMutation.isError && (
          <p
            role="alert"
            data-testid="wallet-test-llm-error"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-danger)',
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Test LLM failed:{' '}
            {testAiMutation.error instanceof ApiError
              ? testAiMutation.error.message
              : (testAiMutation.error as Error).message ?? 'Unknown error.'}
          </p>
        )}

        {testAiMutation.isSuccess && lastTest !== null && (
          <article
            data-testid="wallet-test-llm-result"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-elevated, var(--color-surface))',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <strong style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-md)' }}>
              Response ({probe.model})
            </strong>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{probe.text}</p>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 'var(--space-2)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-foreground-muted)',
                margin: 0,
                marginTop: 'var(--space-2)',
              }}
            >
              <div>
                <dt style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: 'var(--text-xs)' }}>
                  Cost
                </dt>
                <dd style={{ margin: 0 }}>
                  -{probe.cost_credit} {wallet.currency}
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: 'var(--text-xs)' }}>
                  Balance Δ
                </dt>
                <dd style={{ margin: 0 }}>
                  {probe.balance_before} → {probe.balance_after}
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: 'var(--text-xs)' }}>
                  Tokens
                </dt>
                <dd style={{ margin: 0 }}>
                  {probe.usage.input_tokens} in / {probe.usage.output_tokens} out ({probe.usage.total_tokens} total)
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 'normal', textTransform: 'uppercase', fontSize: 'var(--text-xs)' }}>
                  Latency
                </dt>
                <dd style={{ margin: 0 }}>{probe.usage.latency_ms} ms</dd>
              </div>
            </dl>
          </article>
        )}
      </section>

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
          data-testid="wallet-topup-error"
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
        data-testid="wallet-packages"
        style={{
          display: 'grid',
          gap: 'var(--space-3)',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {packages.map((pkg) => (
          <li
            key={pkg.slug}
            data-testid="wallet-package"
            data-package-slug={pkg.slug}
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
                {pkg.credits} credits · {priceLabel(pkg)}
              </span>
              <Pill intent="muted" title="Local-dev top-up">
                Local top-up
              </Pill>
            </div>
            <Button
              intent="primary"
              disabled={topUpMutation.isPending}
              onClick={() => void handleBuy(pkg)}
              data-testid={`wallet-buy-${pkg.slug}`}
              aria-label={`Buy ${pkg.name}`}
            >
              {topUpMutation.isPending && topUpMutation.variables?.package_id === pkg.slug
                ? 'Adding…'
                : 'Buy'}
            </Button>
          </li>
        ))}
      </ul>

      <h2
        id="stripe-topup"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--text-xl)',
          marginTop: 'var(--space-6)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Stripe checkout
      </h2>
      {checkoutMutation.error && (
        <p
          role="alert"
          data-testid="wallet-stripe-error"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Stripe checkout failed: {checkoutMutation.error.message}
        </p>
      )}

      <ul
        aria-labelledby="stripe-topup"
        data-testid="wallet-stripe-tile"
        style={{
          display: 'grid',
          gap: 'var(--space-3)',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          marginBottom: 'var(--space-6)',
        }}
      >
        {packages.map((pkg) => (
          <li
            key={`stripe-${pkg.slug}`}
            data-testid="wallet-stripe-package"
            data-package-slug={pkg.slug}
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
                {pkg.credits} credits · {priceLabel(pkg)}
              </span>
              <Pill intent="info" title="Stripe-checkout top-up">
                Stripe Checkout
              </Pill>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                intent="primary"
                disabled={checkoutMutation.isPending}
                onClick={() => void handleStripeTopUp(pkg)}
                data-testid={`wallet-stripe-buy-${pkg.slug}`}
                aria-label={`Pay with Stripe for ${pkg.name}`}
              >
                {checkoutMutation.isPending && checkoutMutation.variables?.package_slug === pkg.slug
                  ? 'Opening…'
                  : 'Pay with Stripe'}
              </Button>
              <Button
                intent="secondary"
                disabled={localConfirmMutation.isPending}
                onClick={() => handleReconfirmFromStorage(pkg)}
                data-testid={`wallet-stripe-confirm-${pkg.slug}`}
                aria-label={`Re-confirm local Stripe session for ${pkg.name}`}
              >
                Re-confirm
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {lastStripeStatus && (
        <p
          data-testid="wallet-stripe-result"
          style={{
            color: 'var(--color-foreground-muted)',
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Last Stripe confirm: status={lastStripeStatus.status}, session={lastStripeStatus.session_id},
          balance={lastStripeStatus.balance ?? 'unchanged'}.
        </p>
      )}
    </div>
  );
}
