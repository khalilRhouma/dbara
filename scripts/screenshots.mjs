// Makes the README images in docs/images/ from the real app.
//   npm run screenshots
// Needs Chrome. Set CHROME_PATH if it is not in the default place.
// The app is built first and served with `vite preview`; the demo data below is written into
// localStorage before the page loads, so the images are the same every time.
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'
import { preview } from 'vite'

const root = resolve(import.meta.dirname, '..')
const outDir = join(root, 'docs', 'images')
const chromePath =
  process.env.CHROME_PATH ??
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : '/usr/bin/google-chrome')

const SCHEMES = ['light', 'dark']
const SCREENS = ['ask', 'suggestions', 'history', 'dishes', 'settings']
const SCALE = 2

// ---- Demo data ----
const iso = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const demoStorage = {
  'dbara.v1.history': [
    { date: iso(-1), meal: 'acha', dishId: 'chakchouka' },
    { date: iso(-1), meal: 'ftour', dishId: 'makrouna-chicken' },
    { date: iso(-2), meal: 'acha', dishId: 'lablabi' },
    { date: iso(-2), meal: 'ftour', dishId: 'couscous-chicken' },
    { date: iso(-3), meal: 'acha', dishId: 'brik-tuna-egg' },
    { date: iso(-4), meal: 'ftour', dishId: 'marqa-batata' },
    { date: iso(-9), meal: 'ftour', dishId: 'marqa-loubia' },
    { date: iso(-11), meal: 'ftour', dishId: 'marqa-sbanekh' },
    { date: iso(-13), meal: 'acha', dishId: 'tajine-parsley' },
  ],
  'dbara.v1.settings': { marketDay: new Date().getDay() }, // today is market day: fresh dishes get a bonus
  'dbara.v1.last': { available: ['meat', 'chicken'], eatWith: 'any' },
  'dbara.v1.dishes': { added: [], edits: { kammounia: { favorite: true }, 'couscous-allouch': { favorite: true } } },
}

const seedScript = `
  // fixed "random" numbers so the suggestions are the same on every run
  let a = 123456789;
  Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const data = ${JSON.stringify(demoStorage)};
  for (const [k, v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v));
`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = (page, selector, text) =>
  page.evaluate(
    (sel, txt) => {
      const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim() === txt)
      if (!el) throw new Error(`No "${txt}" in ${sel}`)
      el.click()
    },
    selector,
    text,
  )

async function captureScheme(browser, url, scheme) {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true })
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }])
  await page.evaluateOnNewDocument(seedScript)
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.evaluateHandle('document.fonts.ready')

  const shot = async (name) => {
    await sleep(1400) // let the entrance animations finish
    await page.screenshot({ path: join(outDir, `${name}-${scheme}.png`) })
    console.log(`  ${name}-${scheme}.png`)
  }

  await clickText(page, '.chip', 'فطور') // fix the meal, the default depends on the clock
  await shot('ask')
  await clickText(page, 'button', 'اقترح عليّ')
  await shot('suggestions')
  await clickText(page, '.tabbar button', 'السجل')
  await shot('history')
  await clickText(page, '.tabbar button', 'الطبخات')
  await shot('dishes')
  await clickText(page, '.tabbar button', 'الإعدادات')
  await shot('settings')
  await page.close()
}

// ---- Composite images (phone frames on a soft background) ----
const fontUrl = (file) => pathToFileURL(join(root, 'node_modules/@fontsource/tajawal/files', file)).href
const img = (name) => pathToFileURL(join(outDir, name)).href
const baseCss = `
  @font-face { font-family: Tajawal; font-weight: 400; src: url(${fontUrl('tajawal-latin-400-normal.woff2')}); unicode-range: U+0000-00FF; }
  @font-face { font-family: Tajawal; font-weight: 700; src: url(${fontUrl('tajawal-latin-700-normal.woff2')}); unicode-range: U+0000-00FF; }
  @font-face { font-family: Tajawal; font-weight: 400; src: url(${fontUrl('tajawal-arabic-400-normal.woff2')}); unicode-range: U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF; }
  @font-face { font-family: Tajawal; font-weight: 700; src: url(${fontUrl('tajawal-arabic-700-normal.woff2')}); unicode-range: U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Tajawal, system-ui, sans-serif; color: #2b1d14; }
  .phone { position: absolute; border: 7px solid #1c1511; border-radius: 40px; overflow: hidden; background: #000;
           box-shadow: 0 30px 60px -20px rgba(60,30,10,.45), 0 8px 18px rgba(60,30,10,.2); }
  .phone img { display: block; width: 100%; }
`

const socialHtml = `<style>${baseCss}
  body { width: 1280px; height: 640px; overflow: hidden; position: relative;
         background: radial-gradient(90% 120% at 100% 0%, #fbd9c4 0%, transparent 60%), #fbf6f0; }
  .text { position: absolute; left: 80px; top: 120px; width: 560px; }
  .brand { display: flex; align-items: center; gap: 14px; font-weight: 700; font-size: 30px; }
  .mark { width: 54px; height: 54px; border-radius: 18px; background: #bf4f25; display: grid; place-items: center;
          box-shadow: 0 10px 22px -10px rgba(191,79,37,.8); }
  h1 { font-size: 68px; line-height: 1.08; margin: 34px 0 18px; letter-spacing: -0.02em; }
  h1 span { color: #bf4f25; }
  p { font-size: 26px; line-height: 1.5; color: #7b6a5c; }
  .ar { margin-top: 8px; font-size: 30px; color: #2b1d14; font-weight: 700; }
  .chips { margin-top: 34px; display: flex; gap: 10px; flex-wrap: wrap; }
  .chips b { font-weight: 400; font-size: 19px; padding: 8px 16px; border-radius: 999px; background: #fff; border: 1.5px solid #ecdfd1; }
</style>
<div class="text">
  <div class="brand"><span class="mark"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/></svg></span>Dbara</div>
  <h1>What do we <span>cook</span> today?</h1>
  <p class="ar" dir="rtl">دبارة اليوم</p>
  <p>Tunisian meal suggestions from your own dish list. A few taps, three ideas.</p>
  <div class="chips"><b>Arabic · RTL</b><b>No account</b><b>Private by design</b><b>Free</b></div>
</div>
<div class="phone" style="left:700px; top:90px; width:230px; transform: rotate(-6deg)"><img src="${img('ask-light.png')}"></div>
<div class="phone" style="left:880px; top:40px; width:260px; z-index:2"><img src="${img('suggestions-light.png')}"></div>
<div class="phone" style="left:1080px; top:110px; width:230px; transform: rotate(6deg)"><img src="${img('dishes-dark.png')}"></div>`

const rowHtml = `<style>${baseCss}
  body { width: 1500px; height: 600px; overflow: hidden; position: relative;
         background: radial-gradient(80% 120% at 50% 0%, #fbd9c4 0%, transparent 70%), #fbf6f0; }
</style>
${SCREENS.map((s, i) => `<div class="phone" style="left:${40 + i * 292}px; top:50px; width:250px"><img src="${img(`${s}-light.png`)}"></div>`).join('\n')}`

async function composite(browser, name, html, width, height) {
  const file = join(tmpdir(), `dbara-${name}.html`)
  await writeFile(file, `<!doctype html><meta charset="utf-8">${html}`)
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle0' })
  await page.evaluateHandle('document.fonts.ready')
  await page.screenshot({ path: join(outDir, `${name}.png`) })
  console.log(`  ${name}.png`)
  await page.close()
}

// ---- Run ----
await mkdir(outDir, { recursive: true })
const server = await preview({ root, logLevel: 'error', preview: { port: 4173, strictPort: true, open: false } })
const url = server.resolvedUrls.local[0]
const browser = await puppeteer.launch({ executablePath: chromePath, headless: true })
try {
  for (const scheme of SCHEMES) {
    console.log(`Screens (${scheme}):`)
    await captureScheme(browser, url, scheme)
  }
  console.log('Composites:')
  await composite(browser, 'social-preview', socialHtml, 1280, 640)
  await composite(browser, 'screens-row', rowHtml, 1500, 600)
} finally {
  await browser.close()
  await server.close()
}
