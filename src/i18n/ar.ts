// كل نصوص الواجهة في ملف واحد (الدارجة التونسية).
import type { Duration, EatWith, Frequency, Meal, Protein, Season, Vegetable } from '../domain/types'
import type { Reason, Relaxed } from '../domain/suggest'

const meals: Record<Meal, string> = { ftour: 'فطور', acha: 'عشاء' }
const proteins: Record<Protein, string> = { meat: 'لحم', chicken: 'دجاج', fish: 'سمك', egg: 'بيض', tuna: 'تن' }
/** Vegetables, as people say them in Tunisia. */
export const vegetables: Record<Vegetable, string> = {
  potato: 'بطاطا',
  squash: 'قرعة',
  spinach: 'سبناخ',
  peas: 'جلبانة',
  carrot: 'جزر',
  cabbage: 'كرنب',
  pepper: 'فلفل',
  beans: 'لوبيا',
  okra: 'قناوية',
  tomato: 'طماطم',
  onion: 'بصل',
  parsley: 'معدنوس',
  celery: 'كرافص',
}
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
    vegetables: 'خضر عندك؟ (اختياري)',
    eatWith: 'كيفاش تاكلوها؟',
    time: 'الوقت',
    lead: 'جاوب على أسئلة صغار ونقترحو عليك.',
    submit: 'اقترح عليّ',
    leftovers: 'عندنا باقي',
    meals,
    proteins,
    vegetableNames: vegetables,
    eatWithOptions: eatWith,
    durations: durationsAsk,
  },
  suggestions: {
    lead: 'اختار وحدة منهم، ولا اطلب غيرها.',
    pick: 'هذي',
    another: 'غيرها',
    back: 'رجوع',
    emptyTitle: 'ما لقينا حتى طبخة',
    emptyHelp: 'بدّل الاختيارات وجرّب مرة أخرى.',
    emptyShort: 'ما فما حتى طبخة',
    backToAsk: 'ارجع للأسئلة',
    durations: durationsCard,
  },
  history: {
    empty: 'ما فما حتى طبخة مسجلة.',
    unknownDish: 'طبخة محذوفة',
    leftovers: 'باقي أكل',
    lastDays: 'آخر 30 يوم',
    remove: 'حذف',
    removeConfirm: 'تحذف هذا السطر من السجل؟',
    add: 'زيد طبخة طيّبتوها',
    date: 'التاريخ',
    dish: 'الطبخة',
    save: 'سجّل',
    cancel: 'إلغاء',
  },
  dishes: {
    lead: (n: number) => `${n} طبخة في القائمة. زيد، بدّل، ولا خبّي اللي ما تحبوهاش.`,
    search: 'ابحث باسم الطبخة',
    add: 'طبخة جديدة',
    none: 'ما لقينا حتى طبخة.',
    favorite: 'مفضلة',
    hide: 'إخفاء',
    show: 'إظهار',
    hidden: 'مخفية',
    mine: 'من عندكم',
    edit: 'تعديل',
    remove: 'حذف',
    removeConfirm: 'تحذف هذه الطبخة نهائيا؟',
    form: {
      newTitle: 'طبخة جديدة',
      editTitle: 'تعديل الطبخة',
      name: 'الاسم',
      meal: 'الوجبة',
      mealBoth: 'الاثنين',
      requires: 'البروتين اللازم',
      requiresHelp:
        'لازم يكون عندك واحد على الأقل من كل مجموعة. لحم ودجاج في نفس المجموعة تعني: لحم أو دجاج. بدون مجموعات: ما تحتاج حتى بروتين.',
      group: 'مجموعة',
      addGroup: 'زيد مجموعة',
      removeGroup: 'احذف المجموعة',
      eatWith: 'كيفاش تتاكل؟',
      family: 'العائلة',
      duration: 'مدة التحضير',
      season: 'الفصل',
      fresh: 'تحتاج حوت أو خضرة من السوق',
      vegetables: 'الخضر الأساسية (اختياري)',
      frequency: 'كم مرة تطبخوها؟',
      heavy: 'دسمة وثقيلة (ما تنفعش للعشاء)',
      description: 'المكونات الأساسية',
      descriptionPlaceholder: 'مثال: كسكسي، لحم، حمص، خضرة',
      days: 'نهار مفضل (اختياري)',
      daysHelp: 'اختار النهارات اللي تحبوا فيها هذه الطبخة، مثلا كسكسي نهار الجمعة. تطلع أكثر في هذا النهار.',
      save: 'سجّل',
      cancel: 'إلغاء',
      reset: 'رجّع الأصل',
      defaultFamily: 'أخرى',
    },
    durations: { quick: 'سريعة', normal: 'عادية', long: 'طويلة' } as Record<Duration, string>,
    seasons: { all: 'الكل', winter: 'شتاء', summer: 'صيف' } as Record<Season, string>,
    frequencies: { often: 'برشا', normal: 'عادي', rare: 'من وقت لوقت' } as Record<Frequency, string>,
  },
  settings: {
    lead: 'ظبّط التطبيق على عادات الدار.',
    marketDay: 'يوم السوق',
    marketDayHelp: 'الطبخات اللي تحتاج حوت أو خضرة تطلع أكثر في يوم السوق واليوم اللي بعده.',
    noMarketDay: 'ما عنديش',
    weekdays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    backup: 'نسخة احتياطية',
    backupHelp: 'بياناتك محفوظة في هاتفك فقط. نزّل نسخة من وقت لوقت باش ما تضيعش.',
    export: 'نزّل النسخة',
    import: 'استرجع نسخة',
    importConfirm: 'الاسترجاع يعوّض السجل والإعدادات والطبخات اللي بدّلتوها بمحتوى الملف. نكملو؟',
    importDone: (c: { history: number; added: number; edited: number }) =>
      `تمّ الاسترجاع: ${c.history} سطر في السجل، ${c.added} طبخة مضافة، ${c.edited} طبخة معدّلة.`,
    importErrors: {
      'not-json': 'الملف موش صالح.',
      'invalid-format': 'هذا موش ملف نسخة احتياطية من دبارة، أو فيه خطأ.',
      'duplicate-id': 'الملف فيه طبخة بمعرّف مكرر.',
      'write-failed': 'ما نجمناش نكتبو البيانات (يمكن الذاكرة عامرة). ما تبدّل شيء.',
    },
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
    case 'vegetable':
      return `فيها ${vegetables[r.vegetable]} من عندكم`
    case 'weekday':
      return `عادتكم نهار ${ar.settings.weekdays[r.day]}`
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
