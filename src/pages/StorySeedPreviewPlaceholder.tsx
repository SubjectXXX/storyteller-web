import type { ReactElement } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { EmptyState } from '@/ui/EmptyState';
import { Pill } from '@/ui/Pill';

export default function StorySeedPreviewPlaceholder(): ReactElement {
  return (
    <div>
      <PageHeader
        eyebrow="Story seed preview"
        title="Author tooling preview"
        description="The admin tooling will publish declarative story-seed packs that preview their entity graph here before they ship. The viewer wires into the play SPA so authors can step into a draft run."
        actions={<Pill intent="info">S2 author tooling</Pill>}
      />
      <EmptyState
        title="No seed pack selected"
        description="Open a story-seed pack from the admin app to preview its entity graph here. The viewer is shared between authoring and review."
        icon={<span aria-hidden>{'\u{1F4D6}'}</span>}
      />
    </div>
  );
}
