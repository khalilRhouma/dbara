// كل نصوص الواجهة في ملف واحد (الدارجة التونسية).
import type { Duration, EatWith, Meal, Protein } from '../domain/types'
import type { Reason, Relaxed } from '../domain/suggest'

const meals: Record<Meal, string> = { ftour: 'فطور', acha: 'عشاء' }
const proteins: Record<Protein, string> = { meat: 'لحم', chicken: 'دجاج', fish: 'سمك', egg: 'بيض', tuna: 'تن' }
const eatWith: Record<EatWith | 'any', string> = { spoon: 'بالملعقة', bread: 'بالخبز', any: 'ما يهمش' }
const durationsAsk: Record<Duration, string> = { quick: 'سريع', normal: 'عادي', long: 'على مهل' }
const durationsCard: Record<Duration, string> = { quick: 'سريعة', normal: 'عادية', long: 'طويلة' }

/** "يوم" for 1, "أيام" for 2 to 10, "يوم" again for 11 and more (Tunisian usage). */
export function daysText(n: number): string {
  return n === 1 ? 'يوم' : n <= 10 ? `${n} أيام` : `${n} يوم`
}

export const ar = {
  appName: 'دبارة اليوم',
  nav: {
    today: 'اليوم',
    history: 'السجل',
    dishes: 'الطبخات',
    settings: 'الإعدادات',
  },
  screens: {
    ask: 'شنوة نطيّبو اليوم؟',
    suggestions: 'نقترحو عليك',
    history: 'السجل',
    dishes: 'الطبخات',
    settings: 'الإعدادات',
  },
  ask: {
    meal: 'الوجبة',
    protein: 'شنوة عندك؟',
    noProtein: 'بدون',
    eatWith: 'كيفاش تاكلوها؟',
    time: 'الوقت',
    submit: 'اقترح عليّ',
    meals,
    proteins,
    eatWithOptions: eatWith,
    durations: durationsAsk,
  },
  suggestions: {
    pick: 'هذي',
    another: 'غيرها',
    back: 'رجوع',
    emptyTitle: 'ما لقينا حتى طبخة',
    emptyHelp: 'بدّل الاختيارات وجرّب مرة أخرى.',
    backToAsk: 'ارجع للأسئلة',
    durations: durationsCard,
  },
  history: {
    empty: 'ما فما حتى طبخة مسجلة.',
    unknownDish: 'طبخة محذوفة',
  },
  soon: 'قريبا',
} as const

/** Message shown when a limit had to be dropped to find enough dishes. */
export function relaxedText(r: Relaxed): string {
  return r === 'eatWith'
    ? 'ما لقيناش برشا طبخات، خليناها مهما كانت طريقة الأكل.'
    : 'ما لقيناش برشا طبخات، خليناها مهما كان الوقت.'
}

/** One short sentence saying why a dish is suggested. */
export function reasonText(r: Reason): string {
  switch (r.kind) {
    case 'notCookedFor':
      return `ما طيبتوهاش من ${daysText(r.days)}`
    case 'neverCooked':
      return 'ما طيبتوهاش من قبل'
    case 'freshMarket':
      return 'طازجة من السوق'
    case 'favorite':
      return 'من المفضلة'
    case 'season':
      return r.season === 'winter' ? 'تنفع للشتاء' : 'تنفع للصيف'
  }
}
