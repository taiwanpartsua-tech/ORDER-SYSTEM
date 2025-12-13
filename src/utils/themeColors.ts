export const statusColors: Record<string, string> = {
  'в роботі на сьогодні': 'bg-blue-50 text-blue-800 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-900 dark:text-blue-200 dark:border dark:border-blue-800/30',
  'на броні': 'bg-purple-50 text-purple-800 dark:bg-gradient-to-br dark:from-purple-950 dark:to-purple-900 dark:text-purple-200 dark:border dark:border-purple-800/30',
  'очікується': 'bg-yellow-50 text-yellow-800 dark:bg-gradient-to-br dark:from-yellow-950 dark:to-yellow-900 dark:text-yellow-200 dark:border dark:border-yellow-800/30',
  'прийнято сьогодні': 'bg-green-50 text-green-800 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 dark:text-green-200 dark:border dark:border-green-800/30',
  'прийнято': 'bg-green-100 text-green-900 dark:bg-gradient-to-br dark:from-green-900 dark:to-green-800 dark:text-green-100 dark:border dark:border-green-700/30',
  'на складі': 'bg-teal-50 text-teal-800 dark:bg-gradient-to-br dark:from-teal-950 dark:to-teal-900 dark:text-teal-200 dark:border dark:border-teal-800/30',
  'в дорозі': 'bg-orange-50 text-orange-800 dark:bg-gradient-to-br dark:from-orange-950 dark:to-orange-900 dark:text-orange-200 dark:border dark:border-orange-800/30',
  'в вигрузці': 'bg-cyan-50 text-cyan-800 dark:bg-gradient-to-br dark:from-cyan-950 dark:to-cyan-900 dark:text-cyan-200 dark:border dark:border-cyan-800/30',
  'готово до відправки': 'bg-lime-50 text-lime-800 dark:bg-gradient-to-br dark:from-lime-950 dark:to-lime-900 dark:text-lime-200 dark:border dark:border-lime-800/30',
  'в активному прийомі': 'bg-indigo-50 text-indigo-800 dark:bg-gradient-to-br dark:from-indigo-950 dark:to-indigo-900 dark:text-indigo-200 dark:border dark:border-indigo-800/30',
  'на звірці': 'bg-violet-50 text-violet-800 dark:bg-gradient-to-br dark:from-violet-950 dark:to-violet-900 dark:text-violet-200 dark:border dark:border-violet-800/30',
  'повернення': 'bg-amber-50 text-amber-800 dark:bg-gradient-to-br dark:from-amber-950 dark:to-amber-900 dark:text-amber-200 dark:border dark:border-amber-800/30',
  'проблемні': 'bg-rose-50 text-rose-800 dark:bg-gradient-to-br dark:from-rose-950 dark:to-rose-900 dark:text-rose-200 dark:border dark:border-rose-800/30',
  'анульовано': 'bg-gray-50 text-gray-800 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 dark:text-gray-300 dark:border dark:border-gray-700/30'
};

export const paymentTypeColors: Record<string, string> = {
  'не обрано': 'bg-gray-50 text-gray-800 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 dark:text-gray-300 dark:border dark:border-gray-700/30',
  'оплачено': 'bg-green-50 text-green-800 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 dark:text-green-200 dark:border dark:border-green-800/30',
  'побранє': 'bg-orange-50 text-orange-800 dark:bg-gradient-to-br dark:from-orange-950 dark:to-orange-900 dark:text-orange-200 dark:border dark:border-orange-800/30',
  'самовивіз pl': 'bg-blue-50 text-blue-800 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-900 dark:text-blue-200 dark:border dark:border-blue-800/30',
  'оплачено по перерахунку': 'bg-teal-50 text-teal-800 dark:bg-gradient-to-br dark:from-teal-950 dark:to-teal-900 dark:text-teal-200 dark:border dark:border-teal-800/30'
};

export const substatusColors: Record<string, string> = {
  'В Арта в хелмі': 'bg-purple-50 text-purple-800 dark:bg-gradient-to-br dark:from-purple-950 dark:to-purple-900 dark:text-purple-200 dark:border dark:border-purple-800/30',
  'В Луцьку': 'bg-blue-50 text-blue-800 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-900 dark:text-blue-200 dark:border dark:border-blue-800/30',
  'В клієнта': 'bg-yellow-50 text-yellow-800 dark:bg-gradient-to-br dark:from-yellow-950 dark:to-yellow-900 dark:text-yellow-200 dark:border dark:border-yellow-800/30',
  'В нас на складі': 'bg-teal-50 text-teal-800 dark:bg-gradient-to-br dark:from-teal-950 dark:to-teal-900 dark:text-teal-200 dark:border dark:border-teal-800/30',
  'В дорозі до поляка': 'bg-orange-50 text-orange-800 dark:bg-gradient-to-br dark:from-orange-950 dark:to-orange-900 dark:text-orange-200 dark:border dark:border-orange-800/30',
  'В дорозі до Пачки': 'bg-cyan-50 text-cyan-800 dark:bg-gradient-to-br dark:from-cyan-950 dark:to-cyan-900 dark:text-cyan-200 dark:border dark:border-cyan-800/30',
  'В пачки': 'bg-lime-50 text-lime-800 dark:bg-gradient-to-br dark:from-lime-950 dark:to-lime-900 dark:text-lime-200 dark:border dark:border-lime-800/30',
  'В дорозі до Арта': 'bg-pink-50 text-pink-800 dark:bg-gradient-to-br dark:from-pink-950 dark:to-pink-900 dark:text-pink-200 dark:border dark:border-pink-800/30'
};

export const refundStatusColors: Record<string, string> = {
  'оплачено поляком': 'bg-yellow-50 text-yellow-800 dark:bg-gradient-to-br dark:from-yellow-950 dark:to-yellow-900 dark:text-yellow-200 dark:border dark:border-yellow-800/30',
  'надіслано реквізити для повернення': 'bg-blue-50 text-blue-800 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-900 dark:text-blue-200 dark:border dark:border-blue-800/30',
  'кошти повернено': 'bg-green-50 text-green-800 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 dark:text-green-200 dark:border dark:border-green-800/30'
};

export const verifiedColors: Record<string, string> = {
  'verified': 'bg-green-50 text-green-800 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 dark:text-green-200 dark:border dark:border-green-800/30',
  'not_verified': 'bg-gray-50 text-gray-800 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 dark:text-gray-300 dark:border dark:border-gray-700/30'
};

export function formatEmptyValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '***';
  }
  if (typeof value === 'number' && value === 0) {
    return '0';
  }
  return String(value);
}
