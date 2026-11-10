// Builds src/data/dishes.json from the table in docs/dishes.md.
//   npm run dishes
// The table is what the family reviews and edits; the JSON is what the app reads.
// A test (src/data/dishes.test.ts) fails if the two are out of sync.
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

const MEAL = { فطور: 'ftour', عشاء: 'acha', الاثنان: 'both' }
const EAT = { ملعقة: 'spoon', خبز: 'bread' }
const DURATION = { سريع: 'quick', عادي: 'normal', طويل: 'long' }
const SEASON = { الكل: 'all', شتاء: 'winter', صيف: 'summer' }
const PROTEIN = { لحم: 'meat', دجاج: 'chicken', سمك: 'fish', بيض: 'egg', تن: 'tuna' }
const WEEKDAY = { الأحد: 0, الإثنين: 1, الاثنين: 1, الثلاثاء: 2, الأربعاء: 3, الخميس: 4, الجمعة: 5, السبت: 6 }

const fail = (row, msg) => {
  throw new Error(`docs/dishes.md, "${row.join(' | ').slice(0, 40)}...": ${msg}`)
}
const pick = (map, key, row, what) => map[key] ?? fail(row, `unknown ${what} "${key}"`)

/** "لحم" → [['meat']]; "لحم أو دجاج" → [['meat','chicken']]; "بيض مع لحم أو دجاج" → [['egg'],['meat','chicken']]; "بدون" → [] */
function parseRequires(text, row) {
  if (text.includes('بدون')) return [] // "none", or an optional protein
  return text.split('مع').map((group) => group.split('أو').map((p) => pick(PROTEIN, p.trim(), row, 'protein')))
}

function parseDays(text, row) {
  if (text === '') return []
  return [...new Set(text.split(/[،,]/).map((d) => pick(WEEKDAY, d.trim(), row, 'weekday')))].sort((a, b) => a - b)
}

const md = await readFile(join(root, 'docs', 'dishes.md'), 'utf8')
const rows = md
  .split('\n')
  .filter((l) => l.startsWith('| ') && !l.startsWith('| الطبخة'))
  .map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()))

const dishes = rows.map((row) => {
  if (row.length !== 11) fail(row, `expected 11 columns, found ${row.length}`)
  const [name, meal, protein, eat, family, duration, season, fresh, description, days, id] = row
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) fail(row, `bad id "${id}"`)
  const dish = {
    id,
    name,
    meal: pick(MEAL, meal, row, 'meal'),
    requires: parseRequires(protein, row),
    eatWith: pick(EAT, eat, row, 'eat-with'),
    family,
    duration: pick(DURATION, duration, row, 'duration'),
    season: pick(SEASON, season, row, 'season'),
    fresh: fresh === 'نعم',
    description,
  }
  const d = parseDays(days, row)
  if (d.length > 0) dish.days = d
  return dish
})

await writeFile(join(root, 'src', 'data', 'dishes.json'), JSON.stringify(dishes, null, 2) + '\n')
console.log(`${dishes.length} dishes written to src/data/dishes.json`)
