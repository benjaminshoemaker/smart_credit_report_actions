# Repository Guidelines

## Project Structure & Module Organization
- `src/` — React + TypeScript app. Key areas:
  - `src/components/` reusable UI + `ui/` primitives (shadcn-style).
  - `src/components/screens/` route-level views.
  - `src/styles/` and `src/index.css` — Tailwind v4 utilities and globals.
- `server/` — optional Express API workspace (see `server/package.json`).
- `vite.config.ts` — Vite config; `index.html` app entry.
- `.env.development` — local config (e.g., `VITE_API_BASE=http://localhost:8787`).

## Build, Test, and Development Commands
- `npm i` — install dependencies for the root and workspaces.
- `npm run dev` — start Vite dev server (UI at `http://localhost:3000`).
- `npm run dev:all` — run UI and API together (expects `server/index.js`).
- `npm run build` — production build to `dist/`.
- API only: `npm --workspace server run start` — start Express server.

## Coding Style & Naming Conventions
- Language: TypeScript + React functional components.
- Indentation: 2 spaces; keep lines concise (<100 chars when possible).
- Files: Components in PascalCase (e.g., `ActionCard.tsx`); hooks `useX.ts`.
- Imports: group external → internal; avoid deep relative chains.
- Styling: prefer Tailwind utility classes; keep one concern per component.

## Testing Guidelines
- No test harness is configured yet. If adding tests:
  - Prefer Vitest + React Testing Library.
  - Co-locate tests as `*.test.ts(x)` next to the source.
  - Aim for fast unit tests on components and pure utils.

## Commit & Pull Request Guidelines
- Commits: imperative, concise subject (≤72 chars). Optional Conventional Commits
  (e.g., `feat(ui): add DebtTable sorting`).
- PRs: clear description, linked issues, and screenshots for UI changes.
  Include steps to reproduce and any config notes (e.g., `VITE_API_BASE`).

## Security & Configuration Tips
- Never commit secrets; use `.env.*` files locally and environment variables in CI/CD.
- Ensure CORS and ports align with `VITE_API_BASE` when running the API.
- When handling uploads (multer/pdf-parse in `server/`), avoid checking in sample PII.
