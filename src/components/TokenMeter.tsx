/**
 * `<TokenMeter>` — small badge showing the per-turn `usage` payload.
 *
 * Displays input / output tokens, total cost in credits, and the model's
 * `finish_reason` so the player can see at a glance when the model
 * truncated the response (length cap, content filter) versus returning
 * a clean stop token.
 *
 * The component is purely presentational: it does not fetch usage data
 * itself. Pages consume the `usage` field from `useAdventureStream()`
 * and pass it down. The meter renders nothing until a `usage` payload
 * arrives.
 */
import type { ReactElement } from 'react';
import { Pill } from '@/ui/Pill';
import type { TurnUsage } from '@/api-client';

export interface TokenMeterProps {
  /** Latest `usage` event from the stream. `null` hides the badge. */
  readonly usage: TurnUsage | null;
  /** Override the visible model label. Defaults to `usage.model`. */
  readonly model?: string;
  /** Optional className passthrough for layout adjustments. */
  readonly className?: string;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  // No thousand separators for very small numbers (avoids "1,024" vs
  // "1024" mismatches when copy-pasting into the wallet screen).
  return n.toLocaleString('en-US');
}

function finishReasonLabel(reason: TurnUsage['finishReason']): string {
  switch (reason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'content_filter':
      return 'filtered';
    case 'error':
      return 'error';
    default:
      return 'stop';
  }
}

function finishReasonIntent(reason: TurnUsage['finishReason']): 'success' | 'warning' | 'danger' | 'info' {
  switch (reason) {
    case 'stop':
      return 'success';
    case 'length':
      return 'warning';
    case 'content_filter':
      return 'info';
    case 'error':
      return 'danger';
    default:
      return 'info';
  }
}

export function TokenMeter({ usage, model, className }: TokenMeterProps): ReactElement | null {
  if (!usage) return null;

  return (
    <div
      role="group"
      aria-label="Token usage and cost"
      data-testid="token-meter"
      className={className}
      style={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
        alignItems: 'center',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-foreground-muted)',
      }}
    >
      <Pill intent="muted" title="Input tokens">
        in {formatNumber(usage.inputTokens)}
      </Pill>
      <Pill intent="muted" title="Output tokens">
        out {formatNumber(usage.outputTokens)}
      </Pill>
      <Pill intent="muted" title="Total tokens">
        total {formatNumber(usage.totalTokens)}
      </Pill>
      <Pill intent="info" title="Credit cost for this turn">
        {formatNumber(usage.costCredits)} credits
      </Pill>
      <Pill intent="muted" title="Model">
        {model ?? usage.model}
      </Pill>
      <Pill intent={finishReasonIntent(usage.finishReason)} title="Finish reason">
        {finishReasonLabel(usage.finishReason)}
      </Pill>
    </div>
  );
}
