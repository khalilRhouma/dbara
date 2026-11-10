import { BookOpen, ChefHat, History, Settings, type LucideIcon } from 'lucide-react'
import { ar } from './i18n/ar'

// أزرار شريط التنقل السفلي: اليوم، السجل، الطبخات، الإعدادات.
// شاشة الاقتراحات لا تظهر هنا: نصل إليها من شاشة الأسئلة.
export const TABS: readonly { id: 'today' | 'history' | 'dishes' | 'settings'; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: ar.nav.today, icon: ChefHat },
  { id: 'history', label: ar.nav.history, icon: History },
  { id: 'dishes', label: ar.nav.dishes, icon: BookOpen },
  { id: 'settings', label: ar.nav.settings, icon: Settings },
]

export type TabId = (typeof TABS)[number]['id']
