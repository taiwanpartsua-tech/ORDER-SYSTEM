export type ColumnViewType = 'paska' | 'monday';

export interface ColumnConfig {
  key: string;
  label: string;
  isEditable?: boolean;
  renderType?: 'text' | 'number' | 'link' | 'tracking' | 'status' | 'verified' | 'payment' | 'date' | 'actions';
}

export const paskaColumns: ColumnConfig[] = [
  { key: 'status', label: 'Статус', renderType: 'status' },
  { key: 'verified', label: 'V', renderType: 'verified' },
  { key: 'client_id', label: 'ID клієнта', isEditable: true, renderType: 'text' },
  { key: 'title', label: 'Назва', isEditable: true, renderType: 'text' },
  { key: 'link', label: '', renderType: 'link' },
  { key: 'tracking_pl', label: 'Трекінг PL', isEditable: true, renderType: 'tracking' },
  { key: 'part_price', label: 'Вартість запч.', isEditable: true, renderType: 'number' },
  { key: 'delivery_cost', label: 'Доставка', isEditable: true, renderType: 'number' },
  { key: 'total_cost', label: 'Всього', renderType: 'number' },
  { key: 'part_number', label: '№ запчастини', isEditable: true, renderType: 'text' },
  { key: 'payment_type', label: 'Тип оплати', renderType: 'payment' },
  { key: 'cash_on_delivery', label: 'Побранє', isEditable: true, renderType: 'number' },
  { key: 'actions', label: 'Дії', renderType: 'actions' }
];

export const mondayColumns: ColumnConfig[] = [
  { key: 'title', label: 'Назва', isEditable: true, renderType: 'text' },
  { key: 'link', label: '', renderType: 'link' },
  { key: 'status', label: 'Статус', renderType: 'status' },
  { key: 'verified', label: 'Вортекс', renderType: 'verified' },
  { key: 'tracking_pl', label: 'Трекінг', isEditable: true, renderType: 'tracking' },
  { key: 'part_price', label: 'Вартість', isEditable: true, renderType: 'number' },
  { key: 'delivery_cost', label: 'Доставка', isEditable: true, renderType: 'number' },
  { key: 'total_cost', label: 'Сума', renderType: 'number' },
  { key: 'part_number', label: 'Номер запчастини', isEditable: true, renderType: 'text' },
  { key: 'client_id', label: 'Клієнт', isEditable: true, renderType: 'text' },
  { key: 'order_date', label: 'Дата оформлення', isEditable: true, renderType: 'date' },
  { key: 'actions', label: 'Дії', renderType: 'actions' }
];

export function getColumns(viewType: ColumnViewType): ColumnConfig[] {
  return viewType === 'paska' ? paskaColumns : mondayColumns;
}

export function saveColumnView(viewType: ColumnViewType): void {
  localStorage.setItem('ordersColumnView', viewType);
}

export function loadColumnView(): ColumnViewType {
  const saved = localStorage.getItem('ordersColumnView');
  return (saved === 'monday' ? 'monday' : 'paska') as ColumnViewType;
}
