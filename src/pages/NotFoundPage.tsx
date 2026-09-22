import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '@/ui/EmptyState';
import { Button } from '@/ui/Button';

export default function NotFoundPage(): ReactElement {
  return (
    <div style={{ padding: 'var(--space-8)', display: 'flex', justifyContent: 'center' }}>
      <EmptyState
        title="404 \u2014 page not found"
        description="The route you tried does not exist in this build. Return home to pick a scenario."
        icon={<span aria-hidden>{'\u{1F50D}'}</span>}
        action={
          <Link to="/">
            <Button intent="primary">Return home</Button>
          </Link>
        }
      />
    </div>
  );
}
