/**
 * `<LoreCard>` — one lore entry on the MemoryPanel lore tab. Renders
 * the title, body, the canonical key (as a small monospace badge so
 * the player can copy it for prompt debugging), and the version
 * number. On hover a "Copy key" button appears; clicking it copies
 * the key to the clipboard and surfaces an aria-live confirmation.
 *
 * The card is presentation-only: callers pass the entry and a stable
 * test id (defaults to the entry key) so tests can pin the card.
 */
import { useCallback, useState, type CSSProperties, type ReactElement } from 'react';
import type { LoreEntry } from '@/api-client';
import { Pill } from '@/ui/Pill';

export interface LoreCardProps {
  readonly entry: LoreEntry;
  /**
   * Optional override for the visible title. Defaults to the entry
   * title; some panels display the focused entry inline and want a
   * shorter heading.
   */
  readonly title?: string;
  /**
   * When true the card renders without the hover-revealed copy
   * affordance (used in the focused-entry variant on the recap tab).
   */
  readonly compact?: boolean;
}

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  padding: 'var(--space-3) var(--space-4)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  position: 'relative',
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 'var(--space-2)',
  flexWrap: 'wrap',
};

const titleStyle: CSSProperties = {
  fontWeight: 'var(--weight-medium)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-base)',
};

const keyStyle: CSSProperties = {
  fontFamily: 'ui-monospace, "SFMono-Regular", "Menlo", monospace',
  fontSize: 'var(--text-xs)',
  padding: '2px var(--space-2)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface-muted)',
  color: 'var(--color-foreground-muted)',
  border: '1px solid var(--color-border)',
};

const bodyStyle: CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--color-foreground)',
  lineHeight: 1.5,
};

const metaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  flexWrap: 'wrap',
  fontSize: 'var(--text-xs)',
  color: 'var(--color-foreground-muted)',
};

const copyButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 'var(--space-2)',
  right: 'var(--space-2)',
  background: 'var(--color-surface-elevated)',
  color: 'var(--color-foreground)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-xs)',
  padding: '2px var(--space-2)',
  cursor: 'pointer',
  opacity: 0,
  pointerEvents: 'none',
  transition: 'opacity 120ms var(--motion-easing, ease-out)',
};

const copyButtonVisibleStyle: CSSProperties = {
  ...copyButtonStyle,
  opacity: 1,
  pointerEvents: 'auto',
};

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Best-effort clipboard write. We catch the rejection silently and
 * fall back to showing "Press Ctrl+C" so the player can still copy
 * the key on browsers that block programmatic clipboard access.
 */
async function writeClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied / insecure context — fall through.
    }
  }
  return false;
}

export function LoreCard({ entry, title, compact = false }: LoreCardProps): ReactElement {
  const [copied, setCopied] = useState<boolean>(false);
  const [copyFailed, setCopyFailed] = useState<boolean>(false);

  const onCopy = useCallback(async () => {
    const ok = await writeClipboard(entry.key);
    if (ok) {
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      setCopyFailed(true);
    }
  }, [entry.key]);

  return (
    <article
      data-testid={`lore-card-${entry.key}`}
      data-compact={compact}
      style={cardStyle}
      onMouseEnter={(e) => {
        // We toggle a CSS variable rather than a className so the
        // button reveal stays inside the existing token system.
        e.currentTarget.style.setProperty('--lore-card-hover', '1');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.setProperty('--lore-card-hover', '0');
      }}
    >
      {!compact && (
        <button
          type="button"
          aria-label={`Copy key ${entry.key}`}
          onClick={() => void onCopy()}
          style={{
            ...(compact ? copyButtonStyle : copyButtonVisibleStyle),
          }}
          className="lore-card-copy"
        >
          {copied ? 'Copied' : copyFailed ? 'Press Ctrl+C' : 'Copy key'}
        </button>
      )}
      <div style={headerRowStyle}>
        <span style={titleStyle}>{title ?? entry.title}</span>
        <span style={keyStyle} aria-label={`Lore key ${entry.key}`}>
          {entry.key}
        </span>
      </div>
      <p style={bodyStyle}>{entry.body}</p>
      <div style={metaRowStyle} aria-label="Lore metadata">
        <Pill intent="muted" title={`Version ${entry.version}`}>
          v{entry.version}
        </Pill>
        {entry.tags.length > 0 && (
          <span style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
            {entry.tags.map((tag) => (
              <Pill key={tag} intent="muted" title={`Tag: ${tag}`}>
                {tag}
              </Pill>
            ))}
          </span>
        )}
        <span aria-label={`Last updated ${formatUpdatedAt(entry.updated_at)}`}>
          Updated {formatUpdatedAt(entry.updated_at)}
        </span>
      </div>
    </article>
  );
}