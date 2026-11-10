import type { LucideIcon } from 'lucide-react'

// A labelled row of pill buttons. Used for the four questions and in the forms.
interface Option<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface Props<T extends string> {
  label: string
  options: Option<T>[]
  isSelected: (value: T) => boolean
  onSelect: (value: T) => void
  /** Extra button after the options (e.g. "none" for the protein question). */
  extra?: { label: string; icon?: LucideIcon; selected: boolean; onSelect: () => void }
}

export function Choice<T extends string>({ label, options, isSelected, onSelect, extra }: Props<T>) {
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      <div className="chips">
        {options.map(({ value, label: text, icon: Icon }) => (
          <button key={value} type="button" className="chip" aria-pressed={isSelected(value)} onClick={() => onSelect(value)}>
            {Icon && <Icon size={18} aria-hidden />}
            {text}
          </button>
        ))}
        {extra && (
          <button type="button" className="chip" aria-pressed={extra.selected} onClick={extra.onSelect}>
            {extra.icon && <extra.icon size={18} aria-hidden />}
            {extra.label}
          </button>
        )}
      </div>
    </fieldset>
  )
}
