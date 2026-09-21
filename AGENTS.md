# AGENTS.md — Storyteller web (`application/web`)

This nested AGENTS.md overrides the root `AGENTS.md` for paths under `application/web/**`.

## 1. Purpose

The player-facing React 19 SPA. Replaces the seed `apps/player/` path per ADR-0001.

## 2. Stack pin

| Component | Version |
|---|---|
| React | 19.2+ |
| React Router | 7.x |
| TanStack Query | 5.59+ |
| Vite | 8.3 (rolldown) |
| Vitest | 3.x (note: ships with vite 7 / rollup) |
| oxlint | 1.85+ |
| happy-dom | 15.11+ |
| TypeScript | 6.0 |
| Design tokens | `@storyteller/design-system` (file-local, resolves to `../../packages/design-system`) |

## 3. Local commands

```bash
npm install                 # installs against local design-system package
npm run dev                 # vite dev (port 5173)
npm run lint                # oxlint against src
npm run typecheck           # tsc --noEmit
npm test                    # vitest unit suite
npm run build               # vite build (production dist)
npm run preview             # serve production build (port 4173)
```

## 4. Hard rules

- Do not import from `application/admin/**` or any sibling app.
- Consume only `@storyteller/design-system` for tokens and shared primitives.
- All HTTP calls go through TanStack Query (live endpoints land in S2). For now mock fixtures live in each page file.
- Async pages use `lazy()` and keep the chunk small; pages are wrapped by `<Suspense>` via `<PageShell>`.
- Settings groups must surface an Inherited / Locked / Reset affordance when they wire up to the API.
- All interactive elements must be keyboard-reachable; rely on `focus-visible` from the design-system reset.

## 5. Test layout

```
src/
├─ components/   # presentational, storybook-ready
├─ pages/        # route-level components (lazy-loaded)
├─ router/       # React Router config + lazy loaders
├─ lib/          # API client wrappers (S2+)
└─ test/         # Vitest helpers
```

A page should ship at least one render test. Currently `ScenarioLibraryPage` does.

## 6. Vite/Vitest plugin-type quirk

Vite 8 ships rolldown types; Vitest 3 ships vite 7 (rollup) types. The `vite.config.ts` cast satisfies both. Upgrading Vitest past the next major (which aligns on rolldown) lets us drop the cast.
