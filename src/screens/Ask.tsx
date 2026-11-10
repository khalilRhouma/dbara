import { useState } from 'react'
import { Choice } from '../components/Choice'
import { defaultMeal } from '../domain/dates'
import { DURATIONS, EAT_WITH, MEALS, PROTEINS, type AskInput, type Protein } from '../domain/types'
import { ar } from '../i18n/ar'
import { store } from '../storage/instance'

interface Props {
  onSubmit: (input: AskInput) => void
}

export function Ask({ onSubmit }: Props) {
  // Meal comes from the clock; protein and eat-with come from the last time.
  const [input, setInput] = useState<AskInput>(() => {
    const last = store.getLastChoices()
    return { meal: defaultMeal(new Date()), available: last.available, eatWith: last.eatWith, maxDuration: 'long' }
  })

  const toggleProtein = (p: Protein) =>
    setInput((i) => ({
      ...i,
      available: i.available.includes(p) ? i.available.filter((x) => x !== p) : [...i.available, p],
    }))

  function submit() {
    store.setLastChoices({ available: input.available, eatWith: input.eatWith })
    onSubmit(input)
  }

  return (
    <section>
      <h1>{ar.screens.ask}</h1>

      <Choice
        label={ar.ask.meal}
        options={MEALS.map((m) => ({ value: m, label: ar.ask.meals[m] }))}
        isSelected={(m) => input.meal === m}
        onSelect={(meal) => setInput((i) => ({ ...i, meal }))}
      />

      <Choice
        label={ar.ask.protein}
        options={PROTEINS.map((p) => ({ value: p, label: ar.ask.proteins[p] }))}
        isSelected={(p) => input.available.includes(p)}
        onSelect={toggleProtein}
        extra={{
          label: ar.ask.noProtein,
          selected: input.available.length === 0,
          onSelect: () => setInput((i) => ({ ...i, available: [] })),
        }}
      />

      <Choice
        label={ar.ask.eatWith}
        options={[...EAT_WITH, 'any' as const].map((e) => ({ value: e, label: ar.ask.eatWithOptions[e] }))}
        isSelected={(e) => input.eatWith === e}
        onSelect={(eatWith) => setInput((i) => ({ ...i, eatWith }))}
      />

      <Choice
        label={ar.ask.time}
        options={DURATIONS.map((d) => ({ value: d, label: ar.ask.durations[d] }))}
        isSelected={(d) => input.maxDuration === d}
        onSelect={(maxDuration) => setInput((i) => ({ ...i, maxDuration }))}
      />

      <button type="button" className="primary" onClick={submit}>
        {ar.ask.submit}
      </button>
    </section>
  )
}
