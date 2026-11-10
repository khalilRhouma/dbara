import { BookOpen, Clock, Eye, EyeOff, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react'
import { useReducer, useState, type CSSProperties } from 'react'
import { EmptyState } from '../components/EmptyState'
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
      <p className="lead">{ar.dishes.lead(dishes.length)}</p>

      <div className="search">
        <Search size={20} aria-hidden />
        <input type="search" placeholder={ar.dishes.search} aria-label={ar.dishes.search} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <button type="button" className="primary" onClick={() => setEditing('new')}>
        <Plus size={22} aria-hidden />
        {ar.dishes.add}
      </button>

      {shown.length === 0 ? (
        <EmptyState icon={BookOpen} title={ar.dishes.none} />
      ) : (
        <ul className="cards" style={{ marginTop: 18 }}>
          {shown.map((d, i) => (
            <li key={d.id} className={d.hidden ? 'card dim' : 'card'} style={{ '--i': Math.min(i, 8) } as CSSProperties}>
              <div className="card-head">
                <div>
                  <h2>{d.name}</h2>
                  <p className="tags">
                    <span className="tag">{d.family}</span>
                    <span className="tag">
                      <Clock size={13} aria-hidden />
                      {ar.dishes.durations[d.duration]}
                    </span>
                    {d.custom && <span className="tag">{ar.dishes.mine}</span>}
                    {d.hidden && <span className="tag">{ar.dishes.hidden}</span>}
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-pressed={d.favorite === true}
                  aria-label={ar.dishes.favorite}
                  onClick={() => change(() => store.updateDish(d.id, { favorite: !d.favorite }))}
                >
                  <Star size={22} fill={d.favorite ? 'currentColor' : 'none'} aria-hidden />
                </button>
              </div>
              {d.description && <p className="desc">{d.description}</p>}
              <div className="actions">
                <button type="button" className="secondary small" onClick={() => setEditing(d)}>
                  <Pencil size={16} aria-hidden />
                  {ar.dishes.edit}
                </button>
                {d.custom ? (
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() => window.confirm(ar.dishes.removeConfirm) && change(() => store.removeDish(d.id))}
                  >
                    <Trash2 size={16} aria-hidden />
                    {ar.dishes.remove}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() => change(() => store.updateDish(d.id, { hidden: !d.hidden }))}
                  >
                    {d.hidden ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
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
