import type { ReactElement } from "react";
export default function StorySeedPreviewPlaceholder(): ReactElement {
  return (
    <section aria-labelledby="seed">
      <h1 id="seed" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>
        Story seed preview
      </h1>
      <p style={{ color: 'var(--color-foreground-muted)' }}>
        The admin tooling will publish declarative story-seed packs that
        preview their entity graph here before they ship. This viewer is
        wired into the play SPA so authors can step into a draft run.
      </p>
    </section>
  );
}
