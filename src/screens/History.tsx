import { CalendarPlus, Check, History as HistoryIcon, Trash2 } from 'lucide-react'
import { useReducer, useState, type CSSProperties } from 'react'
import { Choice } from '../components/Choice'
import { EmptyState } from '../components/EmptyState'
import { MEAL_ICON } from '../components/icons'
import { daysBetween, defaultMeal, toISODate } from '../domain/dates'
import { LEFTOVERS_ID, MEALS, type Meal } from '../domain/types'
import { ar } from '../i18n/ar'
import { store } from '../storage/instance'

const WINDOW_DAYS = 30

export function History() {
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const [adding, setAdding] = useState(false)

  const [today] = useState(() => toISODate(new Date())) // fixed while the screen is open
  const dishes = store.getDishes()
  const names = new Map(dishes.map((d) => [d.id, d.name]))
  const entries = store
    .getHistory()
    .filter((e) => daysBetween(e.date, today) < WINDOW_DAYS)
    .reverse() // newest first

  return (
    <section>
      <h1>{ar.screens.history}</h1>
      <p className="lead">{ar.history.lastDays}</p>

      {entries.length === 0 ? (
        <EmptyState icon={HistoryIcon} title={ar.history.empty} />
      ) : (
        <ul className="cards">
          {entries.map((e, i) => {
            const MealIcon = MEAL_ICON[e.meal]
            return (
            <li key={`${e.date}|${e.meal}`} className="card row" style={{ '--i': Math.min(i, 8) } as CSSProperties}>
              <span>
                <strong>{e.dishId === LEFTOVERS_ID ? ar.history.leftovers : (names.get(e.dishId) ?? ar.history.unknownDish)}</strong>
                <span className="tags">
                  <span className="tag" dir="ltr">{e.date}</span>
                  <span className="tag">
                    <MealIcon size={13} aria-hidden />
                    {ar.ask.meals[e.meal]}
                  </span>
                </span>
              </span>
              <button
                type="button"
                className="icon-btn danger"
                aria-label={ar.history.remove}
                onClick={() => {
                  if (!window.confirm(ar.history.removeConfirm)) return
                  store.removeHistory(e.date, e.meal)
                  refresh()
                }}
              >
                <Trash2 size={20} aria-hidden />
              </button>
            </li>
            )
          })}
        </ul>
      )}

      {adding ? (
        <AddEntry
          today={today}
          dishes={dishes.map((d) => ({ id: d.id, name: d.name }))}
          onDone={() => {
            setAdding(false)
            refresh()
          }}
        />
      ) : (
        <button type="button" className="primary" onClick={() => setAdding(true)}>
          <CalendarPlus size={22} aria-hidden />
          {ar.history.add}
        </button>
      )}
    </section>
  )
}

function AddEntry({ today, dishes, onDone }: { today: string; dishes: { id: string; name: string }[]; onDone: () => void }) {
  const [date, setDate] = useState(today)
  const [meal, setMeal] = useState<Meal>(() => defaultMeal(new Date()))
  const [dishId, setDishId] = useState('')

  const sorted = [...dishes].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  const canSave = dishId !== '' && date !== '' && date <= today

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSave) return
        store.addHistory({ date, meal, dishId })
        onDone()
      }}
    >
      <div className="field">
        <label htmlFor="h-date">{ar.history.date}</label>
        <input id="h-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
      </div>
      <Choice
        label={ar.ask.meal}
        options={MEALS.map((m) => ({ value: m, label: ar.ask.meals[m], icon: MEAL_ICON[m] }))}
        isSelected={(m) => meal === m}
        onSelect={setMeal}
      />
      <div className="field">
        <label htmlFor="h-dish">{ar.history.dish}</label>
        <select id="h-dish" value={dishId} onChange={(e) => setDishId(e.target.value)}>
          <option value="" />
          <option value={LEFTOVERS_ID}>{ar.history.leftovers}</option>
          {sorted.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="actions">
        <button type="submit" className="primary" disabled={!canSave}>
          <Check size={22} aria-hidden />
          {ar.history.save}
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          {ar.history.cancel}
        </button>
      </div>
    </form>
  )
}
