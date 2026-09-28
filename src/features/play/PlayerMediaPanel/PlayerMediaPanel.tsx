/**
 * `<PlayerMediaPanel>` — the player's *own* media folder for the current
 * adventure, rendered next to `<ImagePanel>` inside the "Visuals" section.
 *
 * The two panels are deliberately different surfaces:
 *  - `<ImagePanel>` is the story's generated artwork. Server-owned,
 *    read-only, produced from a prompt, browsed as a carousel.
 *  - this panel is the player's private folder. They upload it, they
 *    delete it, and nobody else can see it — the API scopes the folder to
 *    the authenticated owner and answers 404 (not 403) for anyone else's,
 *    so the SPA never has to model "forbidden" here.
 *
 * Because ownership is enforced server-side, nothing in this component
 * sends a user id: the bearer token is the only claim that matters.
 *
 * Accessibility:
 *  - the upload control is a real `<input type="file">` (not a styled
 *    `<div>`), so it is reachable by keyboard and announced natively; the
 *    scoped `:focus-visible` rule below keeps the ring visible on top of
 *    the dashed drop-zone border.
 *  - pending / success are `role="status"` live regions; every failure
 *    (load, upload, delete) is a `role="alert"` carrying the API message
 *    verbatim, including the 413 size ceiling and 422 mime rejection.
 *  - each item exposes its own delete button with an
 *    `aria-label` naming the file, so the grid is operable without
 *    seeing the thumbnail.
 */
import {
  useMemo,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactElement,
} from 'react';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  useAdventureMedia,
  useDeleteAdventureMedia,
  useUploadAdventureMedia,
} from '@/hooks';
import type { MediaItem, MediaKind } from '@/api-client';

export interface PlayerMediaPanelProps {
  readonly adventureId: number;
  /** Active branch, for context only — the folder is per-adventure. */
  readonly branchId: number | undefined;
  readonly title?: string;
}

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  marginTop: 'var(--space-4)',
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const uploadBlockStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  padding: 'var(--space-3)',
  border: '1px dashed var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
};

const labelStyle: CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--weight-medium)',
  fontFamily: 'var(--font-sans)',
};

const fileInputStyle: CSSProperties = {
  width: '100%',
  padding: 'var(--space-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface-muted)',
  color: 'var(--color-foreground)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
  minHeight: 'var(--control-touch-min)',
};

const helpStyle: CSSProperties = {
  color: 'var(--color-foreground-muted)',
  fontSize: 'var(--text-xs)',
  fontFamily: 'var(--font-sans)',
};

const statusStyle: CSSProperties = {
  margin: 0,
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-sans)',
  color: 'var(--color-foreground-muted)',
};

const alertStyle: CSSProperties = {
  ...statusStyle,
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-danger)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
  color: 'var(--color-danger)',
};

const gridStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 'var(--space-3)',
};

const tileStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  padding: 'var(--space-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  minHeight: 'var(--control-touch-min)',
};

const thumbStyle: CSSProperties = {
  width: '100%',
  height: 'auto',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface-muted)',
  display: 'block',
};

const fileFallbackStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'var(--space-8)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface-muted)',
};

const filenameStyle: CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--weight-medium)',
  overflowWrap: 'anywhere',
};

const metaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  fontSize: 'var(--text-xs)',
  color: 'var(--color-foreground-muted)',
};

/** Bytes → the shortest human label that stays readable. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The API defaults `kind` to `image`, but sending it explicitly keeps the
 * folder honest once non-image uploads exist: the server rejects a mime
 * type that does not match the declared kind with 422.
 */
function kindForMime(mimeType: string): MediaKind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'generic';
}

function Thumbnail({ item }: { readonly item: MediaItem }): ReactElement {
  // `url` is opaque: a short-lived signed S3 URL or a gateway-relative
  // path to local bytes. Render it verbatim — never rebuild a storage path.
  if (item.kind === 'image') {
    return (
      <img
        src={item.url}
        alt={item.filename}
        width={item.width ?? undefined}
        height={item.height ?? undefined}
        loading="lazy"
        draggable={false}
        style={thumbStyle}
        data-testid={`media-thumb-${item.id}`}
      />
    );
  }
  // Non-image kinds (the upload control is `image/*`, but the API accepts
  // more) get a labelled placeholder rather than a broken <img>.
  return (
    <div style={fileFallbackStyle} aria-hidden>
      <Pill intent="muted">{item.kind}</Pill>
    </div>
  );
}

export function PlayerMediaPanel({
  adventureId,
  branchId,
  title = 'My media',
}: PlayerMediaPanelProps): ReactElement {
  const folderQuery = useAdventureMedia(adventureId);
  const upload = useUploadAdventureMedia(adventureId);
  const remove = useDeleteAdventureMedia(adventureId);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  const items: ReadonlyArray<MediaItem> = useMemo(
    () => folderQuery.data?.items ?? [],
    [folderQuery.data],
  );

  const inputId = `player-media-upload-${adventureId}`;
  const helpId = `player-media-upload-help-${adventureId}`;

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the control first so re-picking the same file still fires a
    // change event (otherwise a retry after a 413 silently does nothing).
    event.target.value = '';
    if (!file) return;
    setUploadedName(null);
    setPendingName(file.name);
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kindForMime(file.type));
    upload.mutate(form, {
      onSuccess: (created) => {
        setPendingName(null);
        setUploadedName(created.filename);
      },
      onError: () => setPendingName(null),
    });
  };

  return (
    <section
      aria-label="My media for this adventure"
      data-testid="player-media-panel"
      style={sectionStyle}
    >
      <Card
        tone="muted"
        title={title}
        subtitle={
          <span style={headerRowStyle}>
            <Pill intent="muted" title="Adventure id">
              #{adventureId}
            </Pill>
            {branchId !== undefined && (
              <Pill intent="muted" title="Branch id">
                #{branchId}
              </Pill>
            )}
            <Pill intent="info" title="Who can see this folder">
              {folderQuery.data?.folder.scope ?? 'adventure'}
            </Pill>
          </span>
        }
      >
        <ErrorBoundary>
          <div style={uploadBlockStyle}>
            <label htmlFor={inputId} style={labelStyle}>
              Add an image to your folder
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="player-media-file-input"
              disabled={upload.isPending}
              aria-describedby={helpId}
              onChange={onFileChange}
              data-testid="media-upload-input"
              style={fileInputStyle}
            />
            <span id={helpId} style={helpStyle}>
              Uploads land in your private folder for this run. Only you can see or delete them;
              the story&rsquo;s generated artwork stays in the panel above.
            </span>
          </div>

          {pendingName !== null && (
            <p role="status" aria-live="polite" style={statusStyle} data-testid="media-upload-pending">
              Uploading {pendingName}&hellip;
            </p>
          )}
          {uploadedName !== null && !upload.isPending && (
            <p role="status" aria-live="polite" style={statusStyle} data-testid="media-upload-success">
              Added {uploadedName} to your folder.
            </p>
          )}
          {upload.error && (
            <p role="alert" style={alertStyle} data-testid="media-upload-error">
              {upload.error.message}
              {upload.error.fields && (
                <span style={helpStyle}>
                  {' '}
                  {Object.entries(upload.error.fields)
                    .map(([field, message]) => `${field}: ${message}`)
                    .join(' ')}
                </span>
              )}
            </p>
          )}
          {remove.error && (
            <p role="alert" style={alertStyle} data-testid="media-delete-error">
              {remove.error.message}
            </p>
          )}

          {folderQuery.isPending && !folderQuery.data ? (
            <p role="status" style={statusStyle} data-testid="media-loading">
              Loading your folder&hellip;
            </p>
          ) : folderQuery.error ? (
            <p role="alert" style={alertStyle} data-testid="media-load-error">
              {folderQuery.error.message}
            </p>
          ) : items.length === 0 ? (
            <EmptyState
              title="Nothing in your folder yet"
              description="This folder is yours alone for this run. Drop in portraits of your character, hand-drawn maps, or reference art — the story's own illustrations live in the generated-art panel above."
            />
          ) : (
            <ul
              aria-label="Images you uploaded for this adventure"
              data-testid="media-grid"
              style={gridStyle}
            >
              {items.map((item) => (
                <li key={item.id} data-testid={`media-item-${item.id}`} style={tileStyle}>
                  <Thumbnail item={item} />
                  <div style={metaStyle}>
                    <span style={filenameStyle}>{item.filename}</span>
                    <span>
                      {formatBytes(item.size_bytes)}
                      {item.width !== null && item.height !== null
                        ? ` · ${item.width}×${item.height}`
                        : ''}
                    </span>
                  </div>
                  <Button
                    intent="danger"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(item.id)}
                    aria-label={`Delete ${item.filename}`}
                    data-testid={`media-delete-${item.id}`}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ErrorBoundary>
      </Card>
      <style>{`
        .player-media-file-input:focus-visible {
          outline: var(--focus-ring-width) solid var(--color-ring);
          outline-offset: var(--focus-ring-offset);
        }
      `}</style>
    </section>
  );
}
