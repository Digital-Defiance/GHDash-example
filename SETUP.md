# Set up your own site from this template

This repository is a complete EmDash site that builds and runs on GitHub Pages. Nothing in it is tied to one repository name, so you can start your own copy in a few minutes.

## 1. Create your repository

Use **Use this template → Create a new repository** on GitHub. Make the repository public: the content lives in it as JSON and Pages on a free plan needs a public repository. (If you forked instead of using the template, everything below still applies.)

## 2. Turn on Pages

Settings → Pages → Build and deployment → Source: **GitHub Actions**. Then run Actions → *Build and deploy* once, or push any commit. The site appears at `https://<owner>.github.io/<repo>/`.

The workflow sets the base path and site URL from your repository name, so no file needs editing.

## 3. Edit from the browser

Open `https://<owner>.github.io/<repo>/studio/`. The first time it asks for a token:

1. GitHub → Settings → Developer settings → Fine-grained tokens → **Generate new token**.
2. Repository access: **Only select repositories**, pick your site's repository.
3. Permissions: **Contents: Read and write**. Nothing else is needed.
4. Paste it into the studio. It stays in that browser tab and is only sent to `api.github.com`.

Edits collect in the pending-changes tray. **Commit** writes them as one commit, and the Action rebuilds the site in a minute or two.

## 4. Optional: comments

Follow the "Comments (giscus)" steps in the README. Commenters need a GitHub account. Comments live in your repository's GitHub Discussions, so moderate them there (delete, lock or hide a comment on GitHub). The studio's Comments screen only lists comments stored by the CMS itself, so it stays empty on this setup.

## 5. Optional: scheduled posts

Schedule a post in the studio and the hourly workflow publishes it once its time passes. The workflow asks for `contents: write` itself and commits the published state back to `main`; if your organisation blocks that, set Settings → Actions → General → Workflow permissions to **Read and write**.

## 6. Optional: webhooks when content changes

`hooks.config.json` lists the plugins whose after-hooks run in the build Action. The example config runs the webhook notifier: after a deploy, every post or page that was added, changed or deleted in that push is sent to your URL. To turn it on, add two repository secrets (Settings → Secrets and variables → Actions):

- `WEBHOOK_URL`: where to send the notifications (required).
- `WEBHOOK_TOKEN`: sent as `Authorization: Bearer ...` (optional).

Without `WEBHOOK_URL` the plugin does nothing. The plugin's settings screen in the studio is not used for this: settings and secrets for hooks come from `hooks.config.json` and the Actions secrets, so no secret is ever stored in the repository. The workflow remembers the last commit it processed in a tag called `hooks-last`, so a cancelled run is caught up by the next one.

## 7. Optional: plugin cron jobs

A plugin entry in `hooks.config.json` can list `cron` jobs, for example `"cron": [{ "name": "weekly-digest", "schedule": "0 9 * * 1" }]` (UTC, five fields, or `@hourly`, `@daily`, `@weekly`). The hourly workflow runs the plugin's `cron` hook for each job that fell due since the last run, so a job fires within about an hour of its time. Only plugins whose hooks work without a server, content access or public routes can run here.

## 8. Optional: bring in an existing Jekyll or Markdown site

From the root of your site, run `npx ghdash-pages import-markdown ../your-old-site --dry-run` to see what it finds, then run it again without `--dry-run`. It writes posts, drafts and pages (with tags, dates and local images) into `content/` and `media/`. Look over `git diff`, commit, and the Action publishes them. Running it twice is safe: entries that already exist are skipped. Liquid tags that have no static equivalent are removed and listed as warnings.

## Keep it current

The admin and browser API come from release assets named in `package.json`. To upgrade, change those URLs to a newer `pages-v*` release and run `npm install`.

## Run the tests

`npm test` runs the unit tests. For the browser suite, build with `BASE_PATH=/site` and run `BASE_PATH=/site npm run test:e2e`. The suite uses `/site` when `BASE_PATH` is unset.
