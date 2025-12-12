import { useState, useEffect } from 'react';
import { supabase, Order, Supplier } from '../lib/supabase';
import { ChevronRight, Send, X, AlertCircle } from 'lucide-react';

type OrderWithSupplier = Order & { supplier: Supplier };

type EditableOrder = OrderWithSupplier & {
  editableParts: number;
  editableDelivery: number;
  editableReceipt: number;
  editableCash: number;
  editableTransport: number;
  editableWeight: number;
};

type PaymentGroup = 'cash_on_delivery' | 'paid';

type ActiveReceiptsProps = {
  onNavigateToManagement: () => void;
};

export default function ActiveReceipts({ onNavigateToManagement }: ActiveReceiptsProps) {
  const [availableOrders, setAvailableOrders] = useState<OrderWithSupplier[]>([]);
  const [cashOnDeliveryOrders, setCashOnDeliveryOrders] = useState<EditableOrder[]>([]);
  const [paidOrders, setPaidOrders] = useState<EditableOrder[]>([]);

  const [cashOnDeliveryReceiptNumber, setCashOnDeliveryReceiptNumber] = useState<string>('');
  const [paidReceiptNumber, setPaidReceiptNumber] = useState<string>('');

  function generateReceiptNumber(group: PaymentGroup): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const prefix = group === 'cash_on_delivery' ? 'ПС' : 'О';
    return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  function formatNumber(num: number): string {
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  }

  useEffect(() => {
    loadAvailableOrders();
  }, []);

  async function loadAvailableOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, supplier:suppliers(*)')
      .not('status', 'in', '(повернення,проблемні,анульовано)')
      .order('created_at', { ascending: false });

    if (data) {
      setAvailableOrders(data as OrderWithSupplier[]);
    }
  }

  function getOrderGroup(order: OrderWithSupplier | EditableOrder): PaymentGroup {
    const paymentType = order.payment_type?.toLowerCase() || '';
    if (paymentType.includes('побран') || paymentType.includes('самовив')) {
      return 'cash_on_delivery';
    }
    return 'paid';
  }

  const availableCashOnDeliveryOrders = availableOrders.filter(order => getOrderGroup(order) === 'cash_on_delivery');
  const availablePaidOrders = availableOrders.filter(order => getOrderGroup(order) === 'paid');

  function moveToActiveReceipt(order: OrderWithSupplier, group: PaymentGroup) {
    const editableOrder: EditableOrder = {
      ...order,
      editableParts: order.part_price || 0,
      editableDelivery: order.delivery_cost || 0,
      editableReceipt: order.received_pln || 0,
      editableCash: order.cash_on_delivery || 0,
      editableTransport: order.transport_cost_usd || 0,
      editableWeight: order.weight_kg || 0
    };

    setAvailableOrders(prev => prev.filter(o => o.id !== order.id));

    if (group === 'cash_on_delivery') {
      setCashOnDeliveryOrders(prev => [...prev, editableOrder]);
      if (!cashOnDeliveryReceiptNumber) {
        setCashOnDeliveryReceiptNumber(generateReceiptNumber('cash_on_delivery'));
      }
    } else {
      setPaidOrders(prev => [...prev, editableOrder]);
      if (!paidReceiptNumber) {
        setPaidReceiptNumber(generateReceiptNumber('paid'));
      }
    }
  }

  function removeFromActiveReceipt(order: EditableOrder, group: PaymentGroup) {
    if (group === 'cash_on_delivery') {
      setCashOnDeliveryOrders(prev => prev.filter(o => o.id !== order.id));
    } else {
      setPaidOrders(prev => prev.filter(o => o.id !== order.id));
    }

    const originalOrder: OrderWithSupplier = {
      ...order,
      supplier: order.supplier
    };
    setAvailableOrders(prev => [...prev, originalOrder]);
  }

  function updateOrderField(orderId: string, field: keyof EditableOrder, value: number, group: PaymentGroup) {
    if (group === 'cash_on_delivery') {
      setCashOnDeliveryOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, [field]: value } : order
        )
      );
    } else {
      setPaidOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, [field]: value } : order
        )
      );
    }
  }

  async function handleSaveReceipt(group: PaymentGroup) {
    try {
      console.log('handleSaveReceipt викликано для групи:', group);
      const orders = group === 'cash_on_delivery' ? cashOnDeliveryOrders : paidOrders;
      const receiptNumber = group === 'cash_on_delivery' ? cashOnDeliveryReceiptNumber : paidReceiptNumber;

      console.log('Замовлень:', orders.length);
      console.log('Номер прійомки:', receiptNumber);

      if (orders.length === 0) {
        alert('Додайте замовлення до прійомки');
        return;
      }

      if (!receiptNumber || receiptNumber.trim() === '') {
        alert('Номер прійомки порожній. Спробуйте перезавантажити сторінку.');
        return;
      }

      let supplier = orders[0].supplier;

      if (!supplier) {
        console.log('Постачальник не завантажений, перезавантажуємо замовлення...');
        const { data: orderData } = await supabase
          .from('orders')
          .select('*, supplier:suppliers(*)')
          .eq('id', orders[0].id)
          .maybeSingle();

        if (orderData && orderData.supplier) {
          supplier = orderData.supplier;
        } else {
          console.error('Не вдалося завантажити постачальника для замовлення:', orders[0]);
          alert('Помилка: замовлення не має інформації про постачальника. Спробуйте перезавантажити сторінку.');
          return;
        }
      }
      const receiptDate = new Date().toISOString().split('T')[0];

      const totals = orders.reduce((acc, order) => {
        acc.parts_cost_pln += order.editableParts;
        acc.delivery_cost_pln += order.editableDelivery;
        acc.receipt_cost_pln += order.editableReceipt;
        acc.cash_on_delivery_pln += order.editableCash;
        acc.transport_cost_usd += order.editableTransport;
        return acc;
      }, {
        parts_cost_pln: 0,
        delivery_cost_pln: 0,
        receipt_cost_pln: 0,
        cash_on_delivery_pln: 0,
        transport_cost_usd: 0
      });

      const total_pln = totals.parts_cost_pln + totals.delivery_cost_pln +
                        totals.receipt_cost_pln + totals.cash_on_delivery_pln;

      console.log('Створення прійомки з даними:', {
        receipt_number: receiptNumber,
        supplier_id: supplier.id,
        totals
      });

      const { data: receipt, error } = await supabase
        .from('active_receipts')
        .insert([{
          receipt_number: receiptNumber,
          receipt_date: receiptDate,
          status: 'draft',
          supplier_id: supplier.id,
          parts_cost_pln: totals.parts_cost_pln,
          delivery_cost_pln: totals.delivery_cost_pln,
          receipt_cost_pln: totals.receipt_cost_pln,
          cash_on_delivery_pln: totals.cash_on_delivery_pln,
          transport_cost_usd: totals.transport_cost_usd,
          total_pln,
          total_usd: totals.transport_cost_usd
        }])
        .select()
        .single();

      if (error || !receipt) {
        console.error('Помилка створення прійомки:', error);
        alert('Помилка створення прійомки: ' + (error?.message || 'невідома помилка'));
        return;
      }

      console.log('Прійомка створена:', receipt);

      const receiptOrdersData = orders.map(order => ({
        receipt_id: receipt.id,
        order_id: order.id,
        amount: (order.part_price || 0) + (order.delivery_cost || 0)
      }));

      const { error: receiptOrdersError } = await supabase.from('receipt_orders').insert(receiptOrdersData);

      if (receiptOrdersError) {
        console.error('Помилка додавання замовлень до прійомки:', receiptOrdersError);
      }

      const snapshotsData = orders.map(order => ({
        receipt_id: receipt.id,
        order_id: order.id,
        original_weight_kg: order.weight_kg || 0,
        original_part_price: order.part_price || 0,
        original_delivery_cost: order.delivery_cost || 0,
        original_received_pln: order.received_pln || 0,
        original_cash_on_delivery: order.cash_on_delivery || 0,
        original_transport_cost_usd: order.transport_cost_usd || 0
      }));

      const { error: snapshotsError } = await supabase.from('receipt_order_snapshots').insert(snapshotsData);

      if (snapshotsError) {
        console.error('Помилка збереження знімків замовлень:', snapshotsError);
      }

      for (const order of orders) {
        await supabase
          .from('orders')
          .update({
            weight_kg: order.editableWeight,
            part_price: order.editableParts,
            delivery_cost: order.editableDelivery,
            received_pln: order.editableReceipt,
            cash_on_delivery: order.editableCash,
            transport_cost_usd: order.editableTransport
          })
          .eq('id', order.id);
      }

      if (group === 'cash_on_delivery') {
        setCashOnDeliveryOrders([]);
        setCashOnDeliveryReceiptNumber('');
      } else {
        setPaidOrders([]);
        setPaidReceiptNumber('');
      }

      loadAvailableOrders();

      alert('Прійомку передано постачальнику на звірку.');
      onNavigateToManagement();
    } catch (error) {
      console.error('Помилка в handleSaveReceipt:', error);
      alert('Помилка збереження прійомки: ' + (error instanceof Error ? error.message : 'невідома помилка'));
    }
  }

  const cashOnDeliveryTotals = cashOnDeliveryOrders.reduce((acc, order) => {
    acc.parts += order.editableParts;
    acc.delivery += order.editableDelivery;
    acc.receipt += order.editableReceipt;
    acc.cash += order.editableCash;
    acc.transport += order.editableTransport;
    return acc;
  }, { parts: 0, delivery: 0, receipt: 0, cash: 0, transport: 0 });

  const cashOnDeliveryTotalPln = cashOnDeliveryTotals.parts + cashOnDeliveryTotals.delivery +
                                  cashOnDeliveryTotals.receipt + cashOnDeliveryTotals.cash;

  const paidTotals = paidOrders.reduce((acc, order) => {
    acc.parts += order.editableParts;
    acc.delivery += order.editableDelivery;
    acc.receipt += order.editableReceipt;
    acc.cash += order.editableCash;
    acc.transport += order.editableTransport;
    return acc;
  }, { parts: 0, delivery: 0, receipt: 0, cash: 0, transport: 0 });

  const paidTotalPln = paidTotals.parts + paidTotals.delivery + paidTotals.receipt + paidTotals.cash;

  return (
    <div className="h-full flex flex-col p-4 max-w-[98%] mx-auto">
      <div className="grid gap-4 flex-1 overflow-hidden min-h-0" style={{ gridTemplateColumns: '380px 1fr' }}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col overflow-hidden">
          <div className="p-4 border-b flex-shrink-0">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Доступні замовлення ({availableOrders.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {availableCashOnDeliveryOrders.length > 0 && (
              <div className="mb-4">
                <div className="bg-amber-100 px-3 py-2 font-semibold text-sm text-amber-900 sticky top-0 z-20">
                  Побрання / Самовивіз ({availableCashOnDeliveryOrders.length})
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-8 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">ID клієнта</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Номер запч.</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Вага</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {availableCashOnDeliveryOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{order.client_id || '-'}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{order.part_number || '-'}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{order.weight_kg ? `${formatNumber(order.weight_kg)} кг` : '-'}</td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => moveToActiveReceipt(order, 'cash_on_delivery')}
                            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-1 rounded transition"
                            title="Додати до прійомки"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {availablePaidOrders.length > 0 && (
              <div>
                <div className="bg-green-100 px-3 py-2 font-semibold text-sm text-green-900 sticky top-0 z-20">
                  Оплачені ({availablePaidOrders.length})
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-8 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">ID клієнта</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Номер запч.</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Вага</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {availablePaidOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{order.client_id || '-'}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{order.part_number || '-'}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{order.weight_kg ? `${formatNumber(order.weight_kg)} кг` : '-'}</td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => moveToActiveReceipt(order, 'paid')}
                            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-1 rounded transition"
                            title="Додати до прійомки"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto">
          {cashOnDeliveryOrders.length === 0 && paidOrders.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex items-center justify-center p-12 text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <AlertCircle size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Оберіть замовлення з лівої панелі</p>
                <p className="text-xs mt-1">Побрання/Самовивіз та Оплачені зберігаються окремими документами</p>
              </div>
            </div>
          )}

          {cashOnDeliveryOrders.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col">
              <div className="p-4 bg-amber-50 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-amber-900">Побрання / Самовивіз ({cashOnDeliveryOrders.length})</h3>
                  <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                    {cashOnDeliveryReceiptNumber}
                  </span>
                </div>
                <button
                  onClick={() => handleSaveReceipt('cash_on_delivery')}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-700 transition"
                >
                  <Send size={18} />
                  Передати на звірку
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Назва</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Запч. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Дост. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Прийом (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Побр. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Перев. ($)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Тип оплати</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cashOnDeliveryOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300 max-w-[150px] truncate">{order.title || '-'}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableParts}
                            onChange={(e) => updateOrderField(order.id, 'editableParts', Number(e.target.value), 'cash_on_delivery')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableDelivery}
                            onChange={(e) => updateOrderField(order.id, 'editableDelivery', Number(e.target.value), 'cash_on_delivery')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableReceipt}
                            onChange={(e) => updateOrderField(order.id, 'editableReceipt', Number(e.target.value), 'cash_on_delivery')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableCash}
                            onChange={(e) => updateOrderField(order.id, 'editableCash', Number(e.target.value), 'cash_on_delivery')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableTransport}
                            onChange={(e) => updateOrderField(order.id, 'editableTransport', Number(e.target.value), 'cash_on_delivery')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{order.payment_type || '-'}</td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => removeFromActiveReceipt(order, 'cash_on_delivery')}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded transition"
                            title="Видалити з прійомки"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t bg-amber-50">
                <table className="w-full text-sm">
                  <tfoot>
                    <tr className="bg-amber-100 font-bold">
                      <td className="px-2 py-3 text-left">Всього</td>
                      <td className="px-2 py-3 text-right">{formatNumber(cashOnDeliveryTotals.parts)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(cashOnDeliveryTotals.delivery)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(cashOnDeliveryTotals.receipt)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(cashOnDeliveryTotals.cash)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(cashOnDeliveryTotals.transport)} $</td>
                      <td className="px-2 py-3"></td>
                      <td className="px-2 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {paidOrders.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col">
              <div className="p-4 bg-green-50 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-green-900">Оплачені ({paidOrders.length})</h3>
                  <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                    {paidReceiptNumber}
                  </span>
                </div>
                <button
                  onClick={() => handleSaveReceipt('paid')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition"
                >
                  <Send size={18} />
                  Передати на звірку
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Назва</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Запч. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Дост. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Прийом (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Побр. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Перев. ($)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Тип оплати</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paidOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300 max-w-[150px] truncate">{order.title || '-'}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableParts}
                            onChange={(e) => updateOrderField(order.id, 'editableParts', Number(e.target.value), 'paid')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableDelivery}
                            onChange={(e) => updateOrderField(order.id, 'editableDelivery', Number(e.target.value), 'paid')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableReceipt}
                            onChange={(e) => updateOrderField(order.id, 'editableReceipt', Number(e.target.value), 'paid')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableCash}
                            onChange={(e) => updateOrderField(order.id, 'editableCash', Number(e.target.value), 'paid')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableTransport}
                            onChange={(e) => updateOrderField(order.id, 'editableTransport', Number(e.target.value), 'paid')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{order.payment_type || '-'}</td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => removeFromActiveReceipt(order, 'paid')}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded transition"
                            title="Видалити з прійомки"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t bg-green-50">
                <table className="w-full text-sm">
                  <tfoot>
                    <tr className="bg-green-100 font-bold">
                      <td className="px-2 py-3 text-left">Всього</td>
                      <td className="px-2 py-3 text-right">{formatNumber(paidTotals.parts)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(paidTotals.delivery)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(paidTotals.receipt)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(paidTotals.cash)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(paidTotals.transport)} $</td>
                      <td className="px-2 py-3"></td>
                      <td className="px-2 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
