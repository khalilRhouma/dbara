import { ArrowRight, Check, Clock, CookingPot, RefreshCw, SearchX, Sparkles } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { EmptyState } from '../components/EmptyState'
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
      {shown.length > 0 && <p className="lead">{ar.suggestions.lead}</p>}

      {result.relaxed.map((r) => (
        <p key={r} className="notice">
          {relaxedText(r)}
        </p>
      ))}

      {shown.length === 0 ? (
        <>
          <EmptyState icon={SearchX} title={ar.suggestions.emptyTitle}>
            <p>{ar.suggestions.emptyHelp}</p>
          </EmptyState>
          <button type="button" className="primary" onClick={onBack}>
            {ar.suggestions.backToAsk}
          </button>
        </>
      ) : (
        <>
          <ul className="cards">
            {shown.map(({ dish, reason }, i) => (
              <li key={dish.id} className="card" style={{ '--i': i } as CSSProperties}>
                <div className="card-top">
                  <span className="badge">
                    <CookingPot size={24} aria-hidden />
                  </span>
                  <div>
                    <h2>{dish.name}</h2>
                    <p className="tags">
                      <span className="tag">{dish.family}</span>
                      <span className="tag">
                        <Clock size={13} aria-hidden />
                        {ar.suggestions.durations[dish.duration]}
                      </span>
                    </p>
                  </div>
                </div>
                {dish.description && <p className="desc">{dish.description}</p>}
                <div className="card-foot">
                  {reason && (
                    <p className="reason">
                      <Sparkles size={16} aria-hidden />
                      {reasonText(reason)}
                    </p>
                  )}
                  <button type="button" className="primary compact" onClick={() => onPick(dish)}>
                    <Check size={20} aria-hidden />
                    {ar.suggestions.pick}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="actions">
            {result.suggestions.length > shown.length && (
              <button type="button" className="secondary" onClick={() => setPage((p) => p + 1)}>
                <RefreshCw size={18} aria-hidden />
                {ar.suggestions.another}
              </button>
            )}
            <button type="button" className="secondary" onClick={onBack}>
              <ArrowRight size={18} aria-hidden />
              {ar.suggestions.back}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
