import { Check, Plus, ShoppingBasket, Snowflake, Sun, Calendar, Utensils } from 'lucide-react'
import { useState } from 'react'
import { Choice } from '../components/Choice'
import { DURATION_ICON, EAT_WITH_ICON, MEAL_ICON, PROTEIN_ICON } from '../components/icons'
import { cleanRequires, type DishFields } from '../domain/dishFields'
import { DURATIONS, EAT_WITH, MEALS, PROTEINS, SEASONS, type Dish, type Protein } from '../domain/types'
import { ar } from '../i18n/ar'

interface Props {
  /** The dish being edited, or undefined for a new one. */
  initial?: Dish
  families: string[]
  onSave: (fields: DishFields) => void
  onCancel: () => void
  /** Only for built-in dishes the user has changed. */
  onReset?: () => void
}

const t = ar.dishes.form
const SEASON_ICON = { all: Calendar, winter: Snowflake, summer: Sun }

export function DishForm({ initial, families, onSave, onCancel, onReset }: Props) {
  const [fields, setFields] = useState<DishFields>(() => ({
    name: initial?.name ?? '',
    meal: initial?.meal ?? 'both',
    requires: initial?.requires.map((g) => [...g]) ?? [],
    eatWith: initial?.eatWith ?? 'spoon',
    family: initial?.family ?? ar.dishes.form.defaultFamily,
    duration: initial?.duration ?? 'normal',
    season: initial?.season ?? 'all',
    fresh: initial?.fresh ?? false,
  }))
  const set = <K extends keyof DishFields>(key: K, value: DishFields[K]) => setFields((f) => ({ ...f, [key]: value }))

  const toggleInGroup = (index: number, p: Protein) =>
    set(
      'requires',
      fields.requires.map((g, i) => (i !== index ? g : g.includes(p) ? g.filter((x) => x !== p) : [...g, p])),
    )

  const canSave = fields.name.trim() !== '' && fields.family.trim() !== ''

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSave) onSave({ ...fields, name: fields.name.trim(), family: fields.family.trim(), requires: cleanRequires(fields.requires) })
      }}
    >
      <h2>{initial ? t.editTitle : t.newTitle}</h2>

      <div className="field">
        <label htmlFor="d-name">{t.name}</label>
        <input id="d-name" value={fields.name} onChange={(e) => set('name', e.target.value)} />
      </div>

      <Choice
        label={t.meal}
        options={[...MEALS, 'both' as const].map((m) => ({ value: m, label: m === 'both' ? t.mealBoth : ar.ask.meals[m], icon: m === 'both' ? Utensils : MEAL_ICON[m] }))}
        isSelected={(m) => fields.meal === m}
        onSelect={(m) => set('meal', m)}
      />

      <fieldset className="choice">
        <legend>{t.requires}</legend>
        <p className="help">{t.requiresHelp}</p>
        {fields.requires.map((group, i) => (
          <div key={i} className="group">
            <Choice
              label={`${t.group} ${i + 1}`}
              options={PROTEINS.map((p) => ({ value: p, label: ar.ask.proteins[p], icon: PROTEIN_ICON[p] }))}
              isSelected={(p) => group.includes(p)}
              onSelect={(p) => toggleInGroup(i, p)}
            />
            <button type="button" className="link" onClick={() => set('requires', fields.requires.filter((_, j) => j !== i))}>
              {t.removeGroup}
            </button>
          </div>
        ))}
        <button type="button" className="secondary" onClick={() => set('requires', [...fields.requires, []])}>
          <Plus size={18} aria-hidden />
          {t.addGroup}
        </button>
      </fieldset>

      <Choice
        label={t.eatWith}
        options={EAT_WITH.map((e) => ({ value: e, label: ar.ask.eatWithOptions[e], icon: EAT_WITH_ICON[e] }))}
        isSelected={(e) => fields.eatWith === e}
        onSelect={(e) => set('eatWith', e)}
      />

      <div className="field">
        <label htmlFor="d-family">{t.family}</label>
        <input id="d-family" list="families" value={fields.family} onChange={(e) => set('family', e.target.value)} />
        <datalist id="families">
          {families.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </div>

      <Choice
        label={t.duration}
        options={DURATIONS.map((d) => ({ value: d, label: ar.dishes.durations[d], icon: DURATION_ICON[d] }))}
        isSelected={(d) => fields.duration === d}
        onSelect={(d) => set('duration', d)}
      />

      <Choice
        label={t.season}
        options={SEASONS.map((s) => ({ value: s, label: ar.dishes.seasons[s], icon: SEASON_ICON[s] }))}
        isSelected={(s) => fields.season === s}
        onSelect={(s) => set('season', s)}
      />

      <div className="chips">
        <button type="button" className="chip" aria-pressed={fields.fresh} onClick={() => set('fresh', !fields.fresh)}>
          <ShoppingBasket size={18} aria-hidden />
          {t.fresh}
        </button>
      </div>

      <div className="actions">
        <button type="submit" className="primary" disabled={!canSave}>
          <Check size={22} aria-hidden />
          {t.save}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
      {onReset && (
        <button type="button" className="link" onClick={onReset}>
          {t.reset}
        </button>
      )}
    </form>
  )
}
