export const statusColors: Record<string, string> = {
  'в роботі на сьогодні': 'bg-blue-50 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  'на броні': 'bg-purple-50 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  'очікується': 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  'прийнято сьогодні': 'bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  'прийнято': 'bg-green-100 text-green-900 dark:bg-green-800/50 dark:text-green-100',
  'на складі': 'bg-teal-50 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  'в дорозі': 'bg-orange-50 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  'в вигрузці': 'bg-cyan-50 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
  'готово до відправки': 'bg-lime-50 text-lime-800 dark:bg-lime-900/50 dark:text-lime-200',
  'в активному прийомі': 'bg-indigo-50 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
  'на звірці': 'bg-violet-50 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  'повернення': 'bg-amber-50 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  'проблемні': 'bg-red-50 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  'анульовано': 'bg-gray-50 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
};

export const paymentTypeColors: Record<string, string> = {
  'не обрано': 'bg-gray-50 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
  'оплачено': 'bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  'побранє': 'bg-orange-50 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  'самовивіз pl': 'bg-blue-50 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  'оплачено по перерахунку': 'bg-teal-50 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200'
};

export const substatusColors: Record<string, string> = {
  'В Арта в хелмі': 'bg-purple-50 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  'В Луцьку': 'bg-blue-50 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  'В клієнта': 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  'В нас на складі': 'bg-teal-50 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  'В дорозі до поляка': 'bg-orange-50 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  'В дорозі до Пачки': 'bg-cyan-50 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
  'В пачки': 'bg-lime-50 text-lime-800 dark:bg-lime-900/50 dark:text-lime-200',
  'В дорозі до Арта': 'bg-pink-50 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200'
};

export const refundStatusColors: Record<string, string> = {
  'оплачено поляком': 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  'надіслано реквізити для повернення': 'bg-blue-50 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  'кошти повернено': 'bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200'
};

export const verifiedColors: Record<string, string> = {
  'verified': 'bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  'not_verified': 'bg-gray-50 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
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
