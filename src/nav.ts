import { ar } from './i18n/ar'

// أزرار شريط التنقل السفلي: اليوم، السجل، الطبخات، الإعدادات.
// شاشة الاقتراحات لا تظهر هنا: نصل إليها من شاشة الأسئلة.
export const TABS = [
  { id: 'today', label: ar.nav.today },
  { id: 'history', label: ar.nav.history },
  { id: 'dishes', label: ar.nav.dishes },
  { id: 'settings', label: ar.nav.settings },
] as const

export type TabId = (typeof TABS)[number]['id']
