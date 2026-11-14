# GHDash example

An [EmDash](https://github.com/Digital-Defiance/ghdash) blog that runs entirely on GitHub Pages. There is no server and no database service: the content lives as JSON in `content/`, and a GitHub Action builds it into a static site on every push.

Design and progress: [SPEC.md and TODO.md in the main repo](https://github.com/Digital-Defiance/ghdash/tree/main/ghpages-port).

Want your own? See [SETUP.md](SETUP.md): use this repository as a template, turn on Pages, and paste a token.

## How it works

```
content/*.json  ──►  ghdash-pages build-db  ──►  data.db (SQLite)  ──►  astro build  ──►  dist/client  ──►  Pages
 (this repo)         emdash init + import        throwaway, in CI       static pages
```

- `content/` is the source of truth: one JSON file per post or page in `content/ec_*/`, plus the schema, settings, menus, and taxonomies. Edit a file, push, and the site rebuilds.
- `data.db` is rebuilt from `content/` on every build and is not committed.
- `.github/workflows/pages.yml` builds and deploys. It sets `BASE_PATH` so links work under `/<repo>/`.

## Edit from the browser

Open `https://<owner>.github.io/<repo>/studio/`. It runs EmDash's own admin in the browser with no server: its API runs in the page on SQLite compiled to WebAssembly, loaded from `content/`. Edits collect as pending changes (a toolbar icon shows the count and lists each new, edited or deleted item, with Discard). Sign in with a fine-grained token (Contents: read and write, this repo only; kept in the tab and only sent to `api.github.com`), or with GitHub if you set that up (SETUP.md section 10), and **Commit** writes everything as one commit. The Action then rebuilds the site. If someone else pushed meanwhile, your changes are kept and "Update my copy" folds theirs in. Pending changes survive a reload.

Limits: schema changes (new content types or fields) can be committed but not merged or discarded, and users, passkeys and other server-only screens do nothing here.

## Run it locally

```bash
npm install
npm run build        # builds data.db from content/, then the static site into dist/client
npm run preview
```

## Turn on Pages (once)

Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## What else it does

SETUP.md walks through each of these, all optional:

- scheduled posts (hourly workflow), webhooks and plugin cron jobs, importing a Jekyll site or Markdown folder, responsive images, search (Pagefind), sitemap, robots and redirects;
- comments (below), a contact form (below), and "Sign in with GitHub" for the studio.

The build scripts and the studio live in the npm package [`@digitaldefiance/ghdash-pages`](https://www.npmjs.com/package/@digitaldefiance/ghdash-pages); the patched admin, core and browser API come from the `pages-v*` release assets on `Digital-Defiance/ghdash` (see `package.json` `overrides`). Run `npm test` for unit tests and `npm run test:e2e` for the browser suite.

## Contact form

A `/contact` page appears when `contact.json` holds a form `endpoint` (a form service or your own Worker, `worker/contact-worker.mjs`) or an `issueRepo` (messages become public GitHub issues). Copy `contact.example.json`; see SETUP.md section 9.

## Comments (giscus)

Posts show a [giscus](https://giscus.app) discussion thread when `giscus.json` exists. Commenters need a GitHub account. To turn it on:

1. Enable Discussions on the repository and install the [giscus app](https://github.com/apps/giscus).
2. Open giscus.app, enter the repository, pick a category, and copy `data-repo-id` and `data-category-id`.
3. Copy `giscus.example.json` to `giscus.json`, fill in the four values, and commit it.

Without `giscus.json` there is no comment section.

Live site: https://digital-defiance.github.io/GHDash-example/

Regenerate `content/` from a local EmDash database with `npm run export-content` after editing in `emdash dev` or the CLI.
