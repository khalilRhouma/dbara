import { useReducer, useState } from 'react'
import { diffFields, type DishFields } from '../domain/dishFields'
import type { Dish } from '../domain/types'
import { ar } from '../i18n/ar'
import { store } from '../storage/instance'
import { DishForm } from './DishForm'

export function Dishes() {
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const [query, setQuery] = useState('')
  // 'new' = the add form is open; a Dish = that dish is being edited.
  const [editing, setEditing] = useState<Dish | 'new' | null>(null)

  const dishes = store.getDishes()
  const edited = new Set(Object.keys(store.getUserDishes().edits))
  const families = [...new Set(dishes.map((d) => d.family))].sort((a, b) => a.localeCompare(b, 'ar'))
  const q = query.trim()
  const shown = q === '' ? dishes : dishes.filter((d) => d.name.includes(q))

  function save(fields: DishFields) {
    if (editing === 'new') store.addDish(fields)
    else if (editing) store.updateDish(editing.id, diffFields(editing, fields))
    setEditing(null)
    refresh()
  }

  function change(fn: () => void) {
    fn()
    refresh()
  }

  if (editing) {
    return (
      <section>
        <h1>{ar.screens.dishes}</h1>
        <DishForm
          initial={editing === 'new' ? undefined : editing}
          families={families}
          onSave={save}
          onCancel={() => setEditing(null)}
          onReset={
            editing !== 'new' && edited.has(editing.id)
              ? () => {
                  store.resetDish(editing.id)
                  setEditing(null)
                  refresh()
                }
              : undefined
          }
        />
      </section>
    )
  }

  return (
    <section>
      <h1>{ar.screens.dishes}</h1>

      <div className="field">
        <input type="search" placeholder={ar.dishes.search} aria-label={ar.dishes.search} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <button type="button" className="primary" onClick={() => setEditing('new')}>
        {ar.dishes.add}
      </button>

      {shown.length === 0 ? (
        <p className="muted">{ar.dishes.none}</p>
      ) : (
        <ul className="cards list">
          {shown.map((d) => (
            <li key={d.id} className={d.hidden ? 'card dim' : 'card'}>
              <div className="card-head">
                <h2>{d.name}</h2>
                <button
                  type="button"
                  className="star"
                  aria-pressed={d.favorite === true}
                  aria-label={ar.dishes.favorite}
                  onClick={() => change(() => store.updateDish(d.id, { favorite: !d.favorite }))}
                >
                  {d.favorite ? '★' : '☆'}
                </button>
              </div>
              <p className="muted">
                {d.family} · {ar.dishes.durations[d.duration]}
                {d.custom && ` · ${ar.dishes.mine}`}
                {d.hidden && ` · ${ar.dishes.hidden}`}
              </p>
              <div className="actions">
                <button type="button" className="secondary small" onClick={() => setEditing(d)}>
                  {ar.dishes.edit}
                </button>
                {d.custom ? (
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() => window.confirm(ar.dishes.removeConfirm) && change(() => store.removeDish(d.id))}
                  >
                    {ar.dishes.remove}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() => change(() => store.updateDish(d.id, { hidden: !d.hidden }))}
                  >
                    {d.hidden ? ar.dishes.show : ar.dishes.hide}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
