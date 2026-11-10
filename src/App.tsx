import { useState } from 'react'
import { TABS, type TabId } from './nav'
import { Ask } from './screens/Ask'
import { Dishes } from './screens/Dishes'
import { History } from './screens/History'
import { Settings } from './screens/Settings'

const SCREENS: Record<TabId, () => React.JSX.Element> = {
  today: Ask,
  history: History,
  dishes: Dishes,
  settings: Settings,
}

export default function App() {
  const [tab, setTab] = useState<TabId>('today')
  const Screen = SCREENS[tab]

  return (
    <div className="app">
      <main className="content">
        <Screen />
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'tab active' : 'tab'}
            aria-current={t.id === tab ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
