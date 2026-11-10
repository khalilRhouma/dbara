import { ChefHat } from 'lucide-react'
import { useState } from 'react'
import { toISODate } from './domain/dates'
import { LEFTOVERS_ID, type AskInput, type Dish, type Meal } from './domain/types'
import { ar } from './i18n/ar'
import { TABS, type TabId } from './nav'
import { Ask } from './screens/Ask'
import { Dishes } from './screens/Dishes'
import { History } from './screens/History'
import { Settings } from './screens/Settings'
import { Suggestions } from './screens/Suggestions'
import { store } from './storage/instance'

export default function App() {
  const [tab, setTab] = useState<TabId>('today')
  // Set after "اقترح عليّ": the answers the suggestions are built from. null = show the questions.
  const [asked, setAsked] = useState<AskInput | null>(null)

  function openTab(id: TabId) {
    setTab(id)
    if (id === 'today') setAsked(null) // tapping "اليوم" always goes back to the questions
  }

  function pick(dish: Dish) {
    if (!asked) return
    store.addHistory({ date: toISODate(new Date()), meal: asked.meal, dishId: dish.id })
    setAsked(null)
    setTab('history')
  }

  function leftovers(meal: Meal) {
    store.addHistory({ date: toISODate(new Date()), meal, dishId: LEFTOVERS_ID })
    setAsked(null)
    setTab('history')
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand-mark">
          <ChefHat size={22} aria-hidden />
        </span>
        <span className="brand-name">{ar.appName}</span>
      </header>
      <main className="content">
        {tab === 'today' &&
          (asked ? (
            <Suggestions input={asked} onPick={pick} onBack={() => setAsked(null)} />
          ) : (
            <Ask onSubmit={setAsked} onLeftovers={leftovers} />
          ))}
        {tab === 'history' && <History />}
        {tab === 'dishes' && <Dishes />}
        {tab === 'settings' && <Settings />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'tab active' : 'tab'}
            aria-current={t.id === tab ? 'page' : undefined}
            onClick={() => openTab(t.id)}
          >
            <t.icon size={22} strokeWidth={t.id === tab ? 2.4 : 2} aria-hidden />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
