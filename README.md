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
- [ ] Step 3: suggestion logic
- [ ] Step 4: storage
- [ ] Step 5: daily flow
- [ ] Step 6: secondary screens
- [ ] Step 7: deploy

## Commands

```bash
npm install        # .npmrc sets legacy-peer-deps (npm 10 bug with vitest 4 peers)
npm run dev        # dev server
npm test           # vitest
npm run lint       # oxlint
npm run build      # tsc + vite build
```
