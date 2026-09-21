# Storyteller web (player SPA)

React 19 + Vite + TypeScript.

## Quick start

```bash
npm install
npm run dev
```

The dev server prints a URL on stdout. The Storyteller docker compose gateway proxies `http://web.storyteller.test` to this Vite dev server.

## Documentation

- `AGENTS.md` — coding conventions, layer boundaries, per-folder rules.
- `../seed/IMPLEMENTATION_PLAN.md` — feature spec.
- `../../docs/agent/TASKS.yaml` — durable task ledger.
