# Dbara (دبارة اليوم)

Static web app (PWA) for Tunisian families. It asks 3-4 questions by tap,
then suggests 3 dishes from the family's own dish list.

- No server, no account, free hosting.
- Stack: Vite + React + TypeScript, localStorage, Vitest, GitHub Pages.
- Language: Tunisian Arabic, RTL.

## Source of truth

Spec, dish list and implementation plan (3 tabs, in Arabic):

Local copies go in `docs/`:

- `docs/PLAN.md`   from tab "خطة التنفيذ"
- `docs/dishes.md` from tab "قائمة الطبخات"

## Status

- [x] Step 1: scaffold
- [x] Step 2: data
- [x] Step 3: suggestion logic
- [x] Step 4: storage
- [x] Step 5: daily flow
- [x] Step 6: secondary screens
- [x] Step 7: deploy (workflow ready; needs the GitHub repo, see below)

## Commands

```bash
npm install        # .npmrc sets legacy-peer-deps (npm 10 bug with vitest 4 peers)
npm run dev        # dev server
npm test           # vitest
npm run lint       # oxlint
npm run build      # tsc + vite build
```

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` runs lint, tests and build on every push to `main`,
then publishes `dist/`. Asset paths are relative, so the repo name is not hard-coded.

One-time setup:

```bash
gh repo create dbara --public --source=. --push
```

Then in the repo on GitHub: **Settings → Pages → Source: GitHub Actions**.
The site will be at `https://<your-user>.github.io/dbara/` after the first run
(Actions tab). GitHub Pages on a private repo needs a paid plan, so use a public repo
or another host.

The app stores everything in the phone's browser (localStorage). Nothing is sent to a
server. Use Settings → "نزّل النسخة" to keep a backup file.

## Try it on a phone

Open the site URL in Chrome on Android. Use the same browser each time: data is
per browser and per device.
