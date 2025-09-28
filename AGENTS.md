# Repository Guidelines

This guide outlines how to develop, test, and contribute to this repository.

## Project Structure & Module Organization
- `src/` — React + TypeScript app.
  - `src/components/` reusable UI; `src/components/ui/` primitives (shadcn-style).
  - `src/components/screens/` route-level views.
  - `src/styles/` and `src/index.css` — Tailwind v4 utilities and globals.
- `server/` — optional Express API workspace (see `server/package.json`).
- `vite.config.ts` — Vite config; `index.html` app entry.
- `.env.development` — local config (e.g., `VITE_API_BASE=http://localhost:8787`).

## Build, Test, and Development Commands
- `npm i` — install dependencies for root and workspaces.
- `npm run dev` — start Vite dev server (UI at `http://localhost:3000`).
- `npm run dev:all` — run UI and API together (expects `server/index.js`).
- `npm run build` — production build to `dist/`.
- API only: `npm --workspace server run start` — start Express server.

## Coding Style & Naming Conventions
- Language: TypeScript + React functional components; 2-space indentation; keep lines <100 chars.
- Components in PascalCase (e.g., `ActionCard.tsx`); hooks `useX.ts`.
- Imports: group external → internal; avoid deep relative chains.
- Styling: prefer Tailwind utility classes; keep one concern per component.

## Testing Guidelines
- No harness configured yet. If adding tests:
  - Prefer Vitest + React Testing Library.
  - Co-locate as `*.test.ts(x)` next to source files.
  - Target fast unit tests for components and pure utils.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject (≤72 chars). Conventional Commits optional
  (e.g., `feat(ui): add DebtTable sorting`).
- PRs: include clear description, linked issues, and screenshots for UI changes.
  Add steps to reproduce and any config notes (e.g., `VITE_API_BASE`).

## Security & Configuration Tips
- Never commit secrets; use `.env.*` locally and environment variables in CI/CD.
- Ensure CORS/ports align with `VITE_API_BASE` when running the API.
- When handling uploads (multer/pdf-parse), do not check in sample PII.

