import { CalendarDays, Download, ShieldCheck, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toISODate } from '../domain/dates'
import type { Settings as SettingsData } from '../domain/types'
import { ar } from '../i18n/ar'
import { downloadText } from '../storage/download'
import { store } from '../storage/instance'

export function Settings() {
  const [settings, setSettings] = useState(() => store.getSettings())
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function changeMarketDay(value: string) {
    const marketDay = value === '' ? null : (Number(value) as SettingsData['marketDay'])
    store.setSettings({ marketDay })
    setSettings(store.getSettings())
  }

  function exportFile() {
    downloadText(`dbara-backup-${toISODate(new Date())}.json`, store.exportData())
  }

  async function importFile(file: File) {
    if (!window.confirm(ar.settings.importConfirm)) return
    const result = store.importData(await file.text())
    if (result.ok) {
      setSettings(store.getSettings())
      setMessage({ ok: true, text: ar.settings.importDone(result.counts) })
    } else {
      setMessage({ ok: false, text: ar.settings.importErrors[result.code] }) // result.detail is for developers, not shown
    }
    if (fileInput.current) fileInput.current.value = '' // allow choosing the same file again
  }

  return (
    <section>
      <h1>{ar.screens.settings}</h1>
      <p className="lead">{ar.settings.lead}</p>

      <div className="card field">
        <label htmlFor="market-day">
          <CalendarDays size={18} aria-hidden /> {ar.settings.marketDay}
        </label>
        <select id="market-day" value={settings.marketDay ?? ''} onChange={(e) => changeMarketDay(e.target.value)}>
          <option value="">{ar.settings.noMarketDay}</option>
          {ar.settings.weekdays.map((name, i) => (
            <option key={i} value={i}>
              {name}
            </option>
          ))}
        </select>
        <p className="help">{ar.settings.marketDayHelp}</p>
      </div>

      <div className="card">
        <h2>
          <ShieldCheck size={18} aria-hidden /> {ar.settings.backup}
        </h2>
        <p className="help">{ar.settings.backupHelp}</p>
        <div className="actions">
          <button type="button" className="secondary" onClick={exportFile}>
            <Download size={18} aria-hidden />
            {ar.settings.export}
          </button>
          <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>
            <Upload size={18} aria-hidden />
            {ar.settings.import}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importFile(file)
            }}
          />
        </div>
        {message && (
          <p className={message.ok ? 'notice ok' : 'notice error'} role="status" style={{ marginTop: 14 }}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  )
}
