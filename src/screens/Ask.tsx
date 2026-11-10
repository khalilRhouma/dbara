import { Ban, Recycle, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Choice } from '../components/Choice'
import { DURATION_ICON, EAT_WITH_ICON, MEAL_ICON, PROTEIN_ICON } from '../components/icons'
import { defaultMeal } from '../domain/dates'
import { DURATIONS, EAT_WITH, MEALS, PROTEINS, VEGETABLES, type AskInput, type Protein, type Vegetable } from '../domain/types'
import { ar } from '../i18n/ar'
import { store } from '../storage/instance'

interface Props {
  onSubmit: (input: AskInput) => void
  /** "We have leftovers": record that meal without choosing a dish. */
  onLeftovers: (meal: AskInput['meal']) => void
}

export function Ask({ onSubmit, onLeftovers }: Props) {
  // Meal comes from the clock; protein and eat-with come from the last time.
  const [input, setInput] = useState<AskInput>(() => {
    const last = store.getLastChoices()
    return { meal: defaultMeal(new Date()), available: last.available, vegetables: [], eatWith: last.eatWith, maxDuration: 'long' }
  })

  const toggleProtein = (p: Protein) =>
    setInput((i) => ({
      ...i,
      available: i.available.includes(p) ? i.available.filter((x) => x !== p) : [...i.available, p],
    }))

  const toggleVegetable = (v: Vegetable) =>
    setInput((i) => {
      const current = i.vegetables ?? []
      return { ...i, vegetables: current.includes(v) ? current.filter((x) => x !== v) : [...current, v] }
    })

  function submit() {
    store.setLastChoices({ available: input.available, eatWith: input.eatWith })
    onSubmit(input)
  }

  return (
    <section>
      <h1>{ar.screens.ask}</h1>
      <p className="lead">{ar.ask.lead}</p>

      <Choice
        label={ar.ask.meal}
        options={MEALS.map((m) => ({ value: m, label: ar.ask.meals[m], icon: MEAL_ICON[m] }))}
        isSelected={(m) => input.meal === m}
        onSelect={(meal) => setInput((i) => ({ ...i, meal }))}
      />

      <Choice
        label={ar.ask.protein}
        options={PROTEINS.map((p) => ({ value: p, label: ar.ask.proteins[p], icon: PROTEIN_ICON[p] }))}
        isSelected={(p) => input.available.includes(p)}
        onSelect={toggleProtein}
        extra={{
          label: ar.ask.noProtein,
          icon: Ban,
          selected: input.available.length === 0,
          onSelect: () => setInput((i) => ({ ...i, available: [] })),
        }}
      />

      <Choice
        label={ar.ask.vegetables}
        options={VEGETABLES.map((v) => ({ value: v, label: ar.ask.vegetableNames[v] }))}
        isSelected={(v) => (input.vegetables ?? []).includes(v)}
        onSelect={toggleVegetable}
      />

      <Choice
        label={ar.ask.eatWith}
        options={[...EAT_WITH, 'any' as const].map((e) => ({ value: e, label: ar.ask.eatWithOptions[e], icon: EAT_WITH_ICON[e] }))}
        isSelected={(e) => input.eatWith === e}
        onSelect={(eatWith) => setInput((i) => ({ ...i, eatWith }))}
      />

      <Choice
        label={ar.ask.time}
        options={DURATIONS.map((d) => ({ value: d, label: ar.ask.durations[d], icon: DURATION_ICON[d] }))}
        isSelected={(d) => input.maxDuration === d}
        onSelect={(maxDuration) => setInput((i) => ({ ...i, maxDuration }))}
      />

      <button type="button" className="primary" onClick={submit}>
        <Sparkles size={22} aria-hidden />
        {ar.ask.submit}
      </button>
      <button type="button" className="secondary wide" onClick={() => onLeftovers(input.meal)}>
        <Recycle size={18} aria-hidden />
        {ar.ask.leftovers}
      </button>
    </section>
  )
}
