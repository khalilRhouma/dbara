import { ar } from '../i18n/ar'
import { store } from '../storage/instance'

// Read-only for now. Deleting and adding by hand come in step 6.
export function History() {
  const names = new Map(store.getDishes().map((d) => [d.id, d.name]))
  const entries = store.getHistory().slice(-30).reverse()

  return (
    <section>
      <h1>{ar.screens.history}</h1>
      {entries.length === 0 ? (
        <p className="muted">{ar.history.empty}</p>
      ) : (
        <ul className="cards">
          {entries.map((e) => (
            <li key={`${e.date}|${e.meal}`} className="card row">
              <span>
                {e.date} · {ar.ask.meals[e.meal]}
              </span>
              <strong>{names.get(e.dishId) ?? ar.history.unknownDish}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
