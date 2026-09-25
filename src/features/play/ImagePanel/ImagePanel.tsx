/**
 * `<ImagePanel>` - visual generation surface for the active
 * adventure. Renders the latest image generated for the current turn
 * (or the carousel's first asset if no fresh job is in flight) plus
 * the full history via `<ImageCarousel>`.
 *
 * The panel is presentation-only: the data flows through
 * `useImageJob` (kick off + poll + timeout) and `useImageCarousel`
 * (history). Tests inject a fetcher to drive the state machine
 * without a real backend.
 */
import { useMemo, type CSSProperties, type ReactElement } from 'react';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  DEFAULT_IMAGE_PROMPT,
  SAMPLE_IMAGE_ALT,
  type ImageAsset,
} from '@/fixtures/data';
import { useImageCarousel, useImageJob } from '@/hooks';
import { ImageCarousel } from './ImageCarousel';

export interface ImagePanelProps {
  readonly adventureId: number;
  readonly branchId: number | undefined;
  readonly turnId: number | undefined;
  readonly title?: string;
  /**
   * Override the default prompt. The Regenerate button uses this
   * verbatim; pages can wire a textarea in front if they want.
   */
  readonly initialPrompt?: string;
}

const imageStyle: CSSProperties = {
  width: '100%',
  height: 'auto',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-muted)',
  display: 'block',
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const promptRowStyle: CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-foreground-muted)',
  marginTop: 'var(--space-2)',
  fontFamily: 'var(--font-sans)',
};

const actionsRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  justifyContent: 'flex-end',
  marginTop: 'var(--space-3)',
  flexWrap: 'wrap',
};

const skeletonStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '16 / 9',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background:
    'linear-gradient(90deg, var(--color-surface-muted), var(--color-surface), var(--color-surface-muted))',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.2s linear infinite',
};

const errorPanelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  padding: 'var(--space-3) var(--space-4)',
  border: '1px solid var(--color-danger)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
  color: 'var(--color-danger)',
  fontSize: 'var(--text-sm)',
};

function statusIntent(
  status: ReturnType<typeof useImageJob>['status'],
): 'info' | 'success' | 'warning' | 'danger' | 'muted' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'queued':
    case 'generating':
      return 'info';
    case 'idle':
    default:
      return 'muted';
  }
}

function statusLabel(
  status: ReturnType<typeof useImageJob>['status'],
): string {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'generating':
      return 'Generating';
    case 'completed':
      return 'Ready';
    case 'failed':
      return 'Failed';
    case 'idle':
    default:
      return 'Idle';
  }
}

/**
 * Tiny shimmer placeholder used while the image-generation job is in flight.
 * inline a `@keyframes` block so the panel does not need to ship a
 * global stylesheet for one animation.
 */
function GeneratingSkeleton(): ReactElement {
  return (
    <div aria-hidden style={skeletonStyle}>
      <style>{`@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
    </div>
  );
}

export function ImagePanel({
  adventureId,
  branchId,
  turnId,
  title = 'Visuals',
  initialPrompt = DEFAULT_IMAGE_PROMPT,
}: ImagePanelProps): ReactElement {
  const job = useImageJob(adventureId, branchId, turnId, initialPrompt);
  const carouselQuery = useImageCarousel(adventureId);
  const carouselAssets: ReadonlyArray<ImageAsset> = useMemo(
    () => carouselQuery.data?.assets ?? [],
    [carouselQuery.data],
  );

  // Choose the asset to display: prefer the freshly-generated one,
  // fall back to the most recent carousel entry.
  const displayedAsset: ImageAsset | null = job.asset
    ? job.asset
    : carouselAssets.length > 0
      ? (carouselAssets[carouselAssets.length - 1] ?? null)
      : null;

  return (
    <Card
      title={title}
      subtitle={
        <span style={headerRowStyle}>
          <Pill intent="muted" title="Adventure id">
            #{adventureId}
          </Pill>
          <Pill intent={statusIntent(job.status)} title={`Image job status: ${job.status}`}>
            {statusLabel(job.status)}
          </Pill>
        </span>
      }
    >
      <ErrorBoundary>
        {job.error && job.status === 'failed' ? (
          <div role="alert" data-testid="image-error" style={errorPanelStyle}>
            <strong>Image generation failed</strong>
            <span>{job.error.message}</span>
            {job.error.code && (
              <span style={{ fontSize: 'var(--text-xs)' }}>Code: {job.error.code}</span>
            )}
            <div style={actionsRowStyle}>
              <Button
                intent="secondary"
                size="sm"
                onClick={() => job.regenerate()}
                data-testid="image-retry"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : job.isLoading ? (
          <>
            <GeneratingSkeleton />
            <p style={promptRowStyle} role="status" aria-live="polite">
              {job.status === 'queued' ? 'Queued\u2026' : 'Generating\u2026'}
            </p>
          </>
        ) : displayedAsset ? (
          <>
            <img
              src={displayedAsset.url}
              alt={displayedAsset.alt || SAMPLE_IMAGE_ALT}
              width={displayedAsset.width}
              height={displayedAsset.height}
              loading="lazy"
              style={imageStyle}
              data-testid="image-current"
            />
            <p style={promptRowStyle} data-testid="image-prompt">
              Prompt: <em>{job.status === 'idle' ? initialPrompt : '\u2014'}</em>
            </p>
          </>
        ) : (
          <EmptyState
            title="No image yet"
            description="Press Regenerate to render a fresh illustration for the current turn. The visual worker calls the model and surfaces the result here."
          />
        )}
        <div style={actionsRowStyle}>
          <Button
            intent="primary"
            size="sm"
            disabled={job.isLoading || branchId === undefined || turnId === undefined}
            onClick={() => job.regenerate()}
            data-testid="image-regenerate"
            aria-label="Regenerate image for the current turn"
          >
            {job.isLoading ? 'Regenerating\u2026' : 'Regenerate'}
          </Button>
        </div>
        <ImageCarousel
          assets={carouselAssets}
          title="All images for this adventure"
          sectionId={`image-carousel-${adventureId}`}
        />
      </ErrorBoundary>
    </Card>
  );
}