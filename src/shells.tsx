interface ErrorShellProps {
  onRetry: () => void;
}

export function LoadingShell() {
  return (
    <main className="shell" aria-labelledby="loading-title">
      <div role="status" aria-live="polite" aria-labelledby="loading-title">
        <p className="eyebrow">Player</p>
        <h1 id="loading-title">Loading your story…</h1>
        <p>Please wait while the next page is prepared.</p>
      </div>
    </main>
  );
}

export function ErrorShell({ onRetry }: ErrorShellProps) {
  return (
    <main className="shell" aria-labelledby="error-title">
      <div role="alert">
        <p className="eyebrow">Player</p>
        <h1 id="error-title">The story paused unexpectedly.</h1>
        <p>Your progress is safe. Try loading this page again.</p>
      </div>
      <button type="button" onClick={onRetry}>Try again</button>
    </main>
  );
}

export function NotFoundShell() {
  return (
    <main className="shell" aria-labelledby="not-found-title">
      <p className="eyebrow">404</p>
      <h1 id="not-found-title">This path is not part of the story.</h1>
      <p>The page may have moved, or the address may be incomplete.</p>
      <a href="/">Return to the player home</a>
    </main>
  );
}
