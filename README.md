# GHDash example

An [EmDash](https://github.com/Digital-Defiance/ghdash) blog that runs entirely on GitHub Pages. There is no server and no database service: the content lives as JSON in `content/`, and a GitHub Action builds it into a static site on every push.

Design and progress: [SPEC.md and TODO.md in the main repo](https://github.com/Digital-Defiance/ghdash/tree/spike/ghpages-phase0/ghpages-port).

## How it works

```
content/*.json  ──►  ghdash-pages build-db  ──►  data.db (SQLite)  ──►  astro build  ──►  dist/client  ──►  Pages
 (this repo)         emdash init + import        throwaway, in CI       static pages
```

- `content/` is the source of truth: one JSON file per post or page in `content/ec_*/`, plus the schema, settings, menus, and taxonomies. Edit a file, push, and the site rebuilds.
- `data.db` is rebuilt from `content/` on every build and is not committed.
- `.github/workflows/pages.yml` builds and deploys. It sets `BASE_PATH` so links work under `/<repo>/`.

## Edit from the browser

Open `https://<owner>.github.io/<repo>/admin/`, paste a fine-grained personal access token (Contents: read and write, this repo only), and edit. Each save is one commit; the Action then rebuilds the site.

- Create and edit posts and pages: title, excerpt, plain-paragraph body, draft or published.
- Posts that use headings, links, images or lists have a read-only body here, so saving never damages them.
- The token is kept in the browser tab's session storage and is only sent to `api.github.com`.
- If someone else pushed in the meantime, the editor refuses to save and asks you to reload.

## Run it locally

```bash
npm install
npm run build        # builds data.db from content/, then the static site into dist/client
npm run preview
```

## Turn on Pages (once)

Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Experimental: the real EmDash admin at /studio/

`https://<owner>.github.io/<repo>/studio/` runs EmDash's own admin in the browser, with no server. Its API runs in the page on SQLite compiled to WebAssembly, loaded from `content/`. Edits collect as pending changes: a toolbar icon shows the count, and its dropdown lists every new, edited or deleted item with a Discard button. Paste a fine-grained token (Contents: read and write, this repo only; kept in the tab) and Commit writes all of them as one commit. The Action then rebuilds the site. If someone else pushed meanwhile, your changes are kept and "Update my copy" folds theirs in.

The admin and the browser API are installed from the `pages-v*` release assets on `Digital-Defiance/ghdash` (see `package.json` `overrides` and the `ghdash-pages` package, which holds the build scripts). Pending changes survive a reload (IndexedDB).

Limits: schema changes (new content types or fields) can be committed but not merged or discarded, media upload is untested, and users, passkeys and other server-only screens do nothing here. Run `npm test` for unit tests and `npm run test:e2e` for the browser suite.

## Known gaps (see TODO.md Phases 1 to 3)

- The search page is not available yet. It needs Pagefind.
- Lists show the first page only, because `?cursor=` pagination needs a server.
- Media is not copied or optimised at build time yet.
- Comments are not wired up yet. They will use giscus.
- `/admin/` is a minimal editor; `/studio/` (above) is the full admin and is still experimental.

Live site: https://digital-defiance.github.io/GHDash-example/

Regenerate `content/` from a local EmDash database with `npm run export-content` after editing in `emdash dev` or the CLI.
