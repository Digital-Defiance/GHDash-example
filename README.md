# GHDash example

An [EmDash](https://github.com/Digital-Defiance/ghdash) blog that runs entirely on GitHub Pages. There is no server and no database service: the content lives as JSON in `content/`, and a GitHub Action builds it into a static site on every push.

Design and progress: [SPEC.md and TODO.md in the main repo](https://github.com/Digital-Defiance/ghdash/tree/spike/ghpages-phase0/ghpages-port).

## How it works

```
content/*.json  ──►  scripts/build-db.mjs  ──►  data.db (SQLite)  ──►  astro build  ──►  dist/client  ──►  Pages
 (this repo)         emdash init + import        throwaway, in CI       static pages
```

- `content/` is the source of truth: one JSON file per post or page in `content/ec_*/`, plus the schema, settings, menus, and taxonomies. Edit a file, push, and the site rebuilds.
- `data.db` is rebuilt from `content/` on every build and is not committed.
- `.github/workflows/pages.yml` builds and deploys. It sets `BASE_PATH` so links work under `/<repo>/`.

## Run it locally

```bash
npm install
npm run build        # builds data.db from content/, then the static site into dist/client
npm run preview
```

## Turn on Pages (once)

Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Known gaps (see TODO.md Phase 1–3)

- The search page is not available yet. It needs Pagefind.
- Lists show the first page only, because `?cursor=` pagination needs a server.
- Comments are not wired up yet. They will use giscus.
- Content is edited by hand for now. The browser admin comes in Phase 2.

Regenerate `content/` from a local EmDash database with `npm run export-content` after editing in `emdash dev` or the CLI.
