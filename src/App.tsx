import { ErrorShell, LoadingShell, NotFoundShell } from './shells';

export function App() {
  switch (window.location.pathname) {
    case '/':
      return (
        <main className="shell" aria-labelledby="player-title">
          <p className="eyebrow">Player</p>
          <h1 id="player-title">Your next story starts here.</h1>
          <p>The player experience is ready for its first adventure.</p>
        </main>
      );
    case '/loading':
      return <LoadingShell />;
    case '/error':
      return <ErrorShell onRetry={() => window.location.reload()} />;
    default:
      return <NotFoundShell />;
  }
}
