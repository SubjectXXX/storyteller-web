import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import {
  ApiError,
  type BillingCheckoutRequest,
  type BillingCheckoutResponse,
  type BillingLocalConfirmRequest,
  type BillingOutcomeResponse,
} from '@/api-client';
import { walletKeys } from '@/hooks/useWallet';

/**
 * Stage 8-T02 — Stripe (Cashier-style) billing top-up.
 *
 * Wraps `POST /api/billing/checkout` so a {@see CreditPackageResource}
 * can be turned into a redirect URL. In local dev the URL points at
 * `/api/billing/local-checkout/{session}`; in production (real Stripe
 * keys present in the api env) it points at `https://checkout.stripe.com/...`.
 *
 * The mutation also refreshes the wallet query on success because the
 * api may have credited the user (idempotency-keyed) before the SPA
 * returns to `/web/wallet` — surfacing the new balance immediately.
 */
export function useCreateBillingCheckout(): UseMutationResult<
  BillingCheckoutResponse,
  ApiError,
  BillingCheckoutRequest
> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<BillingCheckoutResponse, ApiError, BillingCheckoutRequest>({
    mutationFn: (body) => api.createBillingCheckout(body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
}

/**
 * Stage 8-T02 — Local-checkout Confirm.
 *
 * Drives the same idempotent ledger-credit path as the Stripe webhook.
 * The local-checkout HTML form posts to this endpoint and so does the
 * programmatic confirm the SPA fires after navigating back from the
 * external checkout (real Stripe path).
 */
export function useConfirmBillingLocalCheckout(): UseMutationResult<
  BillingOutcomeResponse,
  ApiError,
  BillingLocalConfirmRequest
> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<BillingOutcomeResponse, ApiError, BillingLocalConfirmRequest>({
    mutationFn: (body) => api.confirmBillingLocalCheckout(body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
}
