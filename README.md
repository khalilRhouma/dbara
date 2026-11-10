# Dbara (دبارة اليوم)

A small web app that answers one question for a Tunisian family: **what do we cook today?**

It asks 3 or 4 questions by tap (meal, protein you have, how you eat it, time), then
suggests three dishes from your own dish list. It remembers what you cooked, so it does
not repeat the same dish or the same kind of dish too soon.

- Works on a phone, in Arabic (Tunisian), right-to-left.
- No server, no account. Everything stays in the phone's browser.
- Free to host (GitHub Pages).

## How the suggestions work

1. **Filter.** Remove dishes that are hidden, for another meal, need a protein you do not
   have, do not match how you eat, take too long, or were cooked in the last 3 days.
2. **Score.** Every dish starts at 10 points. Points go down if it was cooked recently or
   its family was cooked yesterday. Points go up for favorites, the current season, and
   fresh dishes near market day.
3. **Show.** Top 3, with a short reason. "غيرها" shows the next 3.

The rules are one pure function with all weights in one place:
[`src/domain/suggest.ts`](src/domain/suggest.ts). Full details are in [`docs/PLAN.md`](docs/PLAN.md).

## Getting started

You need Node.js 22 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | Lint (oxlint) |
| `npm run build` | Type check and production build into `dist/` |
| `npm run preview` | Serve the production build locally |

> `.npmrc` sets `legacy-peer-deps=true` because npm 10 crashes on Vitest 4 peer dependencies.

### Test on your phone

Phone and computer must be on the same Wi-Fi:

```bash
npm run dev -- --host
```

Open the `Network` address it prints (for example `http://192.168.1.20:5173`) in Chrome on the phone.

## Project structure

```text
src/
  domain/      Pure logic, no browser code: types, dates, suggestion rules
  data/        Built-in dishes (dishes.json) and their validation test
  storage/     localStorage store, validation of saved and imported data, backup
  screens/     One file per screen: Ask, Suggestions, History, Dishes, Settings
  components/  Small shared UI pieces
  i18n/        All interface texts (Arabic) in one file
docs/
  PLAN.md      Specification and implementation plan (Arabic)
  dishes.md    The initial dish table, the source for src/data/dishes.json
```

Dishes live in `docs/dishes.md` as a table and in `src/data/dishes.json` as data.
A test checks that both have the same dishes in the same order.

## Data and privacy

All data (history, settings, your dish edits) is saved in the browser's localStorage under
keys that start with `dbara.v1.`. Nothing is sent anywhere. Data is per browser and per
device. Use **Settings → "نزّل النسخة"** to download a backup file, and **"استرجع نسخة"**
to restore it. A bad file is rejected without changing anything.

## Deploy

Every push to `main` runs [`deploy.yml`](.github/workflows/deploy.yml): lint, tests, build,
then publish `dist/` to GitHub Pages. Pull requests run the same checks without publishing
([`ci.yml`](.github/workflows/ci.yml)). Asset paths are relative, so the site works under
`https://<user>.github.io/dbara/` without extra setup.

## Roadmap

- [x] Version 1: questions, suggestions, history, dish list, backup, free hosting
- [ ] Installable app (PWA) that works offline
- [ ] Two phones sharing the same history and dish list
- [ ] Shopping list, weekly plan, recipes

## License

[MIT](LICENSE)
