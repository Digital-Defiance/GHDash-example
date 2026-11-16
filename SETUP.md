# Set up your own site from this template

This repository is a complete EmDash site that builds and runs on GitHub Pages, and also on Netlify, Cloudflare Pages or GitLab Pages (see "Other hosts" below). Nothing in it is tied to one repository name, so you can start your own copy in a few minutes.

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

From the root of your site, run `npx gitdash-pages import-markdown ../your-old-site --dry-run` to see what it finds, then run it again without `--dry-run`. It writes posts, drafts and pages (with tags, dates and local images) into `content/` and `media/`. Look over `git diff`, commit, and the Action publishes them. Running it twice is safe: entries that already exist are skipped. Liquid tags that have no static equivalent are removed and listed as warnings.

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
   `npx wrangler deploy node_modules/@digitaldefiance/gitdash-pages/worker/github-oauth.mjs --name gitdash-sign-in --var ALLOWED_ORIGIN:https://your-name.github.io --var GITHUB_CLIENT_ID:<client id>`
   Then run `npx wrangler secret put GITHUB_CLIENT_SECRET --name gitdash-sign-in` and paste the client secret at the prompt. Don't put it in a file, a commit or a chat.
4. Copy `github-oauth.example.json` to `github-oauth.json`, fill in the client ID and the Worker's address (it ends in `.workers.dev`), and commit it. Both are public.

GitHub App tokens last eight hours, then the studio asks the editor to sign in again. Pending edits stay in the browser meanwhile.

## 11. Optional: import from WordPress

Open the studio at `/studio/import/wordpress`, choose "Upload WordPress export file", and pick the `.xml` export from WordPress (Tools, Export). The studio analyzes the file, creates any missing fields, and imports posts and pages into the pending changes tray. Nothing is written to GitHub until you commit the tray, so you can review the new entries and discard any you don't want.

Limits in the static studio:

- Use the file upload. The "migration key" and "check site by URL" options need a server and a WordPress plugin, which a static site doesn't have.
- Images are not downloaded from the old site. Browsers block those requests (CORS), so image links keep pointing at the old site until you upload copies through the media library.
- Authors can't be mapped to users, because there is no user list on a static site. Posts are imported unassigned.

## 12. Optional: a team page

The `@digitaldefiance/gitdash-team` package (already installed here) gives you a `team` collection, a `TeamGrid` component, `/team` and a page per member. Edit members in the studio like any other content. To add it to another site:

```sh
npm install @digitaldefiance/gitdash-team
npx gitdash-team        # adds the collection and three sample members to content/
cp -r node_modules/@digitaldefiance/gitdash-team/templates/team src/pages/team
```

See the [package README](https://github.com/Digital-Defiance/gitdash-plugins/tree/main/packages/team) for the fields and component options.

## 13. Optional: choose fonts

The `@digitaldefiance/gitdash-fonts` package lets you pick Google Fonts, sizes, colors and per-element rules in the studio (the "Fonts" collection). The build downloads the font files into your site, so visitors make no requests to Google.

```sh
npm install @digitaldefiance/gitdash-fonts
npx gitdash-fonts init   # adds the "fonts" collection with one entry
```

Then add `<FontStyles />` before `</head>` in your layout and put `gitdash-fonts build &&` before `astro build` in the `build` script, as this demo does. It also supports Adobe Fonts (loaded from Adobe) and your own font files, which you put in a `custom-fonts/` folder. See the [package README](https://github.com/Digital-Defiance/gitdash-plugins/tree/main/packages/fonts).

## Other hosts: Netlify, Cloudflare Pages, GitLab Pages

GitHub Pages is the default, but the same site builds on other hosts. The address and base path come from the host (see `astro.config.mjs`), and the studio commits to wherever the repository lives, GitHub or GitLab. Scheduled posts, plugin after-hooks and cron need a commit back to the repository, so they keep running in the repository's own CI (GitHub Actions or GitLab CI).

Which one to pick: all four serve the same site, and the studio and comments follow wherever the repository lives, not where the site is served.

| Host | Pick it when | Where scheduled posts, hooks and cron run | Comments |
| --- | --- | --- | --- |
| GitHub Pages | Your repository is on GitHub and you want the simplest setup (steps 1 to 3 above). | GitHub Actions | giscus |
| Netlify or Cloudflare Pages | You want real redirects, branch previews or your own build settings. The repository can be on GitHub or GitLab. | The repository's own CI | giscus for a GitHub repository, GitLab issues for a GitLab one |
| GitLab Pages | Your repository is on GitLab. | GitLab CI, from an hourly pipeline schedule | GitLab issues |

Steps 1 to 3 above are written for GitHub. On GitLab, import or push the repository instead of using the template button, and follow the GitLab section below.

### Hosting on Netlify

1. Netlify → **Add new site → Import an existing project**, pick this repository (on GitHub or GitLab). `netlify.toml` already sets the build command (`npm run build`), the output folder (`dist/client`) and Node 22, so leave the form as it is.
2. The site is served from the root of its Netlify address or your custom domain. The studio is at `/studio/` and commits to the repository Netlify builds from.
3. If the repository is on GitHub, add a repository variable (Settings → Secrets and variables → Actions → Variables) `GITDASH_HOST` = `netlify`. The workflow then stops deploying to GitHub Pages but still publishes scheduled posts and runs hooks and cron; its commits make Netlify rebuild. On GitLab, set the same CI/CD variable.
4. Redirects from the studio become Netlify `_redirects` rules, so they are real 301s.

### Hosting on Cloudflare Pages

1. Run `npx gitdash-pages add-host cloudflare` and set `name` in the new `wrangler.toml` to your Pages project's name. Commit it.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, pick this repository. Build command `npm run build`, build output directory `dist/client`. Environment variables: `NODE_VERSION` = `22`, `NODE_OPTIONS` = `--max-old-space-size=4096`, and `SITE_URL` = your production address (for example `https://my-site.pages.dev`), because Cloudflare only tells the build each deployment's own address.
3. Cloudflare doesn't tell the build which repository it cloned. If the studio says it doesn't know where to commit, add `STUDIO_REPO` = `owner/repo` (and `STUDIO_PROVIDER` = `gitlab` for a GitLab project).
4. As for Netlify, set `GITDASH_HOST` = `cloudflare-pages` on the repository so its CI keeps doing scheduled posts, hooks and cron without deploying.

### Hosting on GitLab Pages

1. Push this repository to a GitLab project (or import it). `.gitlab-ci.yml` builds the site on every push to the default branch and publishes it with GitLab Pages. The site appears at the address under **Deploy → Pages**: `https://<namespace>.gitlab.io/<project>/`, or a unique domain at the root. Either works without editing anything.
   Make the site public: Settings → General → Visibility, project features, permissions → **Pages** → **Everyone With Access**. A project can be public and still have Pages set to "Only Project Members", and then GitLab answers every request that isn't logged in with a 404, so the site loads for you but the studio's own files fail with 404s in the browser console (and a message about `projects.gitlab.io/auth`). If **Pages** is greyed out, make the project public first (the project must be public for the site to be).
2. Editing: open `/studio/` and paste a GitLab **personal access token** with the **api** scope (User settings → Access tokens; the studio's "What token do I need?" link opens the form filled in). Your account must be allowed to push to the default branch, which by default means Maintainer. A project access token (Settings → Access tokens, role Maintainer, scope api) works too. The token stays in the browser tab and is only sent to your GitLab's API.
3. Optional, scheduled posts, plugin hooks and cron: create a project access token with role **Maintainer** and scope **write_repository**, add it as a masked CI/CD variable `GITDASH_PUSH_TOKEN`, and add an hourly pipeline schedule (Build → Pipeline schedules) on the default branch. Webhook secrets such as `WEBHOOK_URL` are CI/CD variables too.
4. Comments: they live in GitLab issues. Nothing to configure: the build reads every issue titled `Comments: <post id>`, and a post with no issue yet shows a "Comment on GitLab" link that opens GitLab's new-issue form with the title filled in. Commenters need a GitLab account, and new comments show after the next build (the hourly schedule from step 3, or any push). For a private project, add a CI/CD variable `GITLAB_TOKEN` with the `read_api` scope. To use giscus or turn comments off instead, put `{ "provider": "giscus" }` or `{ "provider": "off" }` in `comments.json`. Contact form: set `"issueProject": "group/project"` in `contact.json` (and `"issueHost"` for a self-managed GitLab) to take messages as public GitLab issues.
5. Optional, "Sign in with GitLab" instead of pasting a token: User settings → Applications → **Add new application**. Redirect URI: the site's `/studio/` address. Untick **Confidential**, tick the **api** scope. Copy `gitlab-oauth.example.json` to `gitlab-oauth.json` and put the Application ID in `clientId`. No Worker or secret is needed. Sign-ins last two hours.

## Keep it current

The admin and browser API come from release assets named in `package.json`. To upgrade, change those URLs to a newer `pages-v*` release and run `npm install`.

## Run the tests

`npm test` runs the unit tests. For the browser suite, build with `BASE_PATH=/site` and run `BASE_PATH=/site npm run test:e2e`. The suite uses `/site` when `BASE_PATH` is unset.
