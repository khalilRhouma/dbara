import { useState } from 'react'
import { pageOf, suggest } from '../domain/suggest'
import type { AskInput, Dish } from '../domain/types'
import { ar, reasonText, relaxedText } from '../i18n/ar'
import { store } from '../storage/instance'

interface Props {
  input: AskInput
  onPick: (dish: Dish) => void
  onBack: () => void
}

export function Suggestions({ input, onPick, onBack }: Props) {
  // Computed once, so "غيرها" shows the next dishes of the same ranking instead of reshuffling.
  const [result] = useState(() =>
    suggest(input, store.getDishes(), store.getHistory(), store.getSettings(), new Date(), Math.random),
  )
  const [page, setPage] = useState(0)
  const shown = pageOf(result.suggestions, page)

  return (
    <section>
      <h1>{ar.screens.suggestions}</h1>

      {result.relaxed.map((r) => (
        <p key={r} className="notice">
          {relaxedText(r)}
        </p>
      ))}

      {shown.length === 0 ? (
        <>
          <h2>{ar.suggestions.emptyTitle}</h2>
          <p className="muted">{ar.suggestions.emptyHelp}</p>
          <button type="button" className="primary" onClick={onBack}>
            {ar.suggestions.backToAsk}
          </button>
        </>
      ) : (
        <>
          <ul className="cards">
            {shown.map(({ dish, reason }) => (
              <li key={dish.id} className="card">
                <h2>{dish.name}</h2>
                <p className="muted">
                  {dish.family} · {ar.suggestions.durations[dish.duration]}
                </p>
                {reason && <p className="reason">{reasonText(reason)}</p>}
                <button type="button" className="primary" onClick={() => onPick(dish)}>
                  {ar.suggestions.pick}
                </button>
              </li>
            ))}
          </ul>
          <div className="actions">
            {result.suggestions.length > shown.length && (
              <button type="button" className="secondary" onClick={() => setPage((p) => p + 1)}>
                {ar.suggestions.another}
              </button>
            )}
            <button type="button" className="secondary" onClick={onBack}>
              {ar.suggestions.back}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
