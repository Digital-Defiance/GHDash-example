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

## 9. Optional: a contact form

Static sites have no server to receive a form, so the form posts to a service. Nothing is stored in your repository.

1. Pick where the form goes. Either a form service (Formspree, Web3Forms, Basin and similar: create a form there and copy its HTTPS address), or the small Worker in `worker/` (below).
2. Copy `contact.example.json` to `contact.json`, put the address in `endpoint`, and commit it. The site then has a `/contact` page. Without `contact.json` there is no page.
3. Link to `/contact` from your menu in the studio.

Or, to stay entirely on GitHub, set `issueRepo` instead of `endpoint` in `contact.json`, for example `{ "issueRepo": "your-name/your-repo" }`. The page then asks for a subject and message and opens a pre-filled **public** GitHub issue (labelled `contact`, change it with `issueLabel`). Visitors need a GitHub account, and anyone can read what they write, so this suits questions and feedback rather than private messages.

To use your own Worker (free Cloudflare plan, email through a free Resend account):

1. Copy `worker/wrangler.example.toml` to `worker/wrangler.toml` and fill in your site's address (`https://your-name.github.io`, no path), the address that receives mail and the sender address from a domain you verified in Resend.
2. From `worker/`, run `npx wrangler secret put RESEND_API_KEY`, paste the key at the prompt, then `npx wrangler deploy`. Never put the key in a file or in chat.
3. Use the Worker's address as `endpoint`.
4. To block bots harder, create a Cloudflare Turnstile widget, add its site key to `contact.json` as `turnstileSiteKey`, and run `npx wrangler secret put TURNSTILE_SECRET`.

The Worker accepts posts only from your site's address, limits field sizes, ignores submissions that fill the hidden trap field, and sends one email per message.

## 10. Optional: "Sign in with GitHub" in the studio

Without this, editors paste a fine-grained token. With it, the studio also shows a **Sign in with GitHub** button, and the token option stays. It needs a GitHub App and a small Cloudflare Worker, because GitHub's sign-in must be finished with a secret that can't live in a public site.

1. On GitHub: Settings, Developer settings, GitHub Apps, **New GitHub App**. Callback URL: your studio address, for example `https://your-name.github.io/your-repo/studio/`. Untick **Webhook**. Repository permissions: **Contents: Read and write**. Create the app, copy its **Client ID**, and generate a **client secret** (keep the page open for the next step).
2. Install the app on your site's repository (the app's **Install App** tab). A signed-in editor can then only change repositories they can write to and the app is installed on.
3. From your site folder, deploy the Worker. Replace the two values:
   `npx wrangler deploy node_modules/@digitaldefiance/ghdash-pages/worker/github-oauth.mjs --name ghdash-sign-in --var ALLOWED_ORIGIN:https://your-name.github.io --var GITHUB_CLIENT_ID:<client id>`
   Then run `npx wrangler secret put GITHUB_CLIENT_SECRET --name ghdash-sign-in` and paste the client secret at the prompt. Don't put it in a file, a commit or a chat.
4. Copy `github-oauth.example.json` to `github-oauth.json`, fill in the client ID and the Worker's address (it ends in `.workers.dev`), and commit it. Both are public.

GitHub App tokens last eight hours, then the studio asks the editor to sign in again. Pending edits stay in the browser meanwhile.

## 11. Optional: import from WordPress

Open the studio at `/studio/import/wordpress`, choose "Upload WordPress export file", and pick the `.xml` export from WordPress (Tools, Export). The studio analyzes the file, creates any missing fields, and imports posts and pages into the pending changes tray. Nothing is written to GitHub until you commit the tray, so you can review the new entries and discard any you don't want.

Limits in the static studio:

- Use the file upload. The "migration key" and "check site by URL" options need a server and a WordPress plugin, which a static site doesn't have.
- Images are not downloaded from the old site. Browsers block those requests (CORS), so image links keep pointing at the old site until you upload copies through the media library.
- Authors can't be mapped to users, because there is no user list on a static site. Posts are imported unassigned.

## Keep it current

The admin and browser API come from release assets named in `package.json`. To upgrade, change those URLs to a newer `pages-v*` release and run `npm install`.

## Run the tests

`npm test` runs the unit tests. For the browser suite, build with `BASE_PATH=/site` and run `BASE_PATH=/site npm run test:e2e`. The suite uses `/site` when `BASE_PATH` is unset.
