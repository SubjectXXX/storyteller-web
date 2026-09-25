import type { ReactElement } from 'react';
import { cva, type VariantProps } from '@storyteller/design-system';

const loadingPanel = cva(
  'flex w-full flex-col items-center justify-center gap-2 text-center',
  {
    variants: {
      intent: {
        page: 'min-h-[40vh] p-8',
        inline: 'min-h-[40vh] p-4',
      },
    },
    defaultVariants: { intent: 'page' },
  },
);

type LoadingPanelProps = VariantProps<typeof loadingPanel> & { label?: string };

export function LoadingPanel({ label = 'Loading', intent }: LoadingPanelProps): ReactElement {
  return (
    <div role="status" aria-live="polite" data-loading-state="loading" className={loadingPanel({ intent })}>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '3px solid var(--color-surface-muted)',
          borderTopColor: 'var(--color-primary)',
          animation: 'spin 0.9s linear infinite',
        }}
      />
      <p style={{ color: 'var(--color-foreground-muted)' }}>{label}…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
