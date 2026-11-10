// A row of buttons with a label. Used for the four questions.
interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  label: string
  options: Option<T>[]
  isSelected: (value: T) => boolean
  onSelect: (value: T) => void
  /** Extra button after the options (e.g. "none" for the protein question). */
  extra?: { label: string; selected: boolean; onSelect: () => void }
}

export function Choice<T extends string>({ label, options, isSelected, onSelect, extra }: Props<T>) {
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      <div className="chips">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className="chip"
            aria-pressed={isSelected(o.value)}
            onClick={() => onSelect(o.value)}
          >
            {o.label}
          </button>
        ))}
        {extra && (
          <button type="button" className="chip" aria-pressed={extra.selected} onClick={extra.onSelect}>
            {extra.label}
          </button>
        )}
      </div>
    </fieldset>
  )
}
