import type { ReactElement } from "react";
/**
 * Placeholder play surface. Real timeline + composer land in S2.
 *
 * The page already mirrors the eventual data shape: narrative,
 * choices, and a composer. Designers/implementers can iterate
 * against fixture data before the backend lands.
 */
export default function PlaySurfacePlaceholder(): ReactElement {
  return (
    <section aria-labelledby="play" style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <h1 id="play" style={{ fontSize: 'var(--text-2xl)' }}>
        Play surface
      </h1>
      <article
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
        }}
      >
        <p style={{ marginBottom: 'var(--space-3)' }}>
          You step out of the carriage into the salt-wind market. Lanterns sway
          overhead and someone is calling your name — but not in warning.
        </p>
        <ul style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <li>
            <button type="button" style={choiceStyle}>
              Follow the call into the marbled alley
            </button>
          </li>
          <li>
            <button type="button" style={choiceStyle}>
              Linger near the lantern-seller to gather gossip
            </button>
          </li>
        </ul>
      </article>
      <form
        onSubmit={(event) => event.preventDefault()}
        style={{
          display: 'grid',
          gap: 'var(--space-2)',
          background: 'var(--color-surface-muted)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <label htmlFor="composer" style={{ fontWeight: 500 }}>
          Say or do something
        </label>
        <textarea
          id="composer"
          name="composer"
          rows={3}
          placeholder="Describe what you do…"
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2)',
            background: 'var(--color-surface)',
          }}
        />
        <button
          type="submit"
          style={{
            justifySelf: 'start',
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary)',
            color: 'var(--color-primary-foreground)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          Send
        </button>
      </form>
    </section>
  );
}

const choiceStyle: React.CSSProperties = {
  textAlign: 'left',
  width: '100%',
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
};
