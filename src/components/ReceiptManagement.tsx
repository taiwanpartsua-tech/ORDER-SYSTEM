import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Check, ChevronDown, ChevronRight, Plus, X } from 'lucide-react';

type Receipt = {
  id: string;
  receipt_number: string;
  receipt_date: string;
  status: 'draft' | 'approved' | 'sent_for_settlement' | 'settled';
  supplier_id: string;
  total_pln: number;
  total_usd: number;
  parts_cost_pln: number;
  delivery_cost_pln: number;
  receipt_cost_pln: number;
  cash_on_delivery_pln: number;
  transport_cost_usd: number;
  approved_at?: string;
  settlement_date?: string;
  settled_date?: string;
  supplier?: {
    name: string;
  };
};

type OrderInReceipt = {
  id: string;
  order_number: string;
  client_id: string;
  title: string;
  link: string;
  tracking_pl: string;
  part_price: number;
  delivery_cost: number;
  total_cost: number;
  part_number: string;
  payment_type: string;
  cash_on_delivery: number;
  order_date: string;
  received_pln: number;
  transport_cost_usd: number;
  weight_kg: number;
  snapshot?: {
    original_weight_kg: number;
    original_part_price: number;
    original_delivery_cost: number;
    original_received_pln: number;
    original_cash_on_delivery: number;
    original_transport_cost_usd: number;
  };
};

type EditableOrder = OrderInReceipt & {
  editableWeight: number;
  editableParts: number;
  editableDelivery: number;
  editableReceipt: number;
  editableCash: number;
  editableTransport: number;
};

type AvailableOrder = {
  id: string;
  order_number: string;
  client_id: string;
  title: string;
  payment_type: string;
  order_date: string;
  part_price: number;
  delivery_cost: number;
  total_cost: number;
};

export default function ReceiptManagement() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [orders, setOrders] = useState<{ [receiptId: string]: EditableOrder[] }>({});
  const [showAddOrders, setShowAddOrders] = useState<string | null>(null);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);

  useEffect(() => {
    loadReceipts();
  }, []);

  async function loadReceipts() {
    const { data } = await supabase
      .from('active_receipts')
      .select(`
        *,
        supplier:suppliers(name)
      `)
      .in('status', ['draft', 'approved'])
      .order('created_at', { ascending: false });

    if (data) {
      setReceipts(data);
    }
  }

  async function loadOrdersForReceipt(receiptId: string) {
    const { data: receiptOrders } = await supabase
      .from('receipt_orders')
      .select('order_id')
      .eq('receipt_id', receiptId);

    if (!receiptOrders) return;

    const orderIds = receiptOrders.map(ro => ro.order_id);

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .in('id', orderIds);

    const { data: snapshotsData } = await supabase
      .from('receipt_order_snapshots')
      .select('*')
      .eq('receipt_id', receiptId);

    if (ordersData) {
      const ordersWithSnapshots: EditableOrder[] = ordersData.map(order => {
        const snapshot = snapshotsData?.find(s => s.order_id === order.id);
        return {
          ...order,
          snapshot: snapshot ? {
            original_weight_kg: snapshot.original_weight_kg,
            original_part_price: snapshot.original_part_price,
            original_delivery_cost: snapshot.original_delivery_cost,
            original_received_pln: snapshot.original_received_pln,
            original_cash_on_delivery: snapshot.original_cash_on_delivery,
            original_transport_cost_usd: snapshot.original_transport_cost_usd
          } : undefined,
          editableWeight: order.weight_kg || 0,
          editableParts: order.part_price || 0,
          editableDelivery: order.delivery_cost || 0,
          editableReceipt: order.received_pln || 0,
          editableCash: order.cash_on_delivery || 0,
          editableTransport: order.transport_cost_usd || 0
        };
      });

      setOrders(prev => ({ ...prev, [receiptId]: ordersWithSnapshots }));
    }
  }

  async function loadAvailableOrders(receiptId: string) {
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return;

    const { data: existingOrderIds } = await supabase
      .from('receipt_orders')
      .select('order_id')
      .eq('receipt_id', receiptId);

    const excludeIds = existingOrderIds?.map(ro => ro.order_id) || [];

    let query = supabase
      .from('orders')
      .select('id, order_number, client_id, title, link, tracking_pl, payment_type, order_date, part_price, delivery_cost, total_cost, received_pln, cash_on_delivery, transport_cost_usd')
      .eq('supplier_id', receipt.supplier_id)
      .not('status', 'in', '("проблемні","анульовано","повернення")');

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data } = await query;

    if (data) {
      setAvailableOrders(data);
    }
  }

  function toggleReceipt(receiptId: string) {
    if (expandedReceipt === receiptId) {
      setExpandedReceipt(null);
    } else {
      setExpandedReceipt(receiptId);
      if (!orders[receiptId]) {
        loadOrdersForReceipt(receiptId);
      }
    }
  }

  function updateOrderField(receiptId: string, orderId: string, field: keyof EditableOrder, value: number) {
    setOrders(prev => ({
      ...prev,
      [receiptId]: prev[receiptId].map(order =>
        order.id === orderId ? { ...order, [field]: value } : order
      )
    }));
  }

  function hasChanges(order: EditableOrder): boolean {
    if (!order.snapshot) return false;
    return (
      order.editableWeight !== order.snapshot.original_weight_kg ||
      order.editableParts !== order.snapshot.original_part_price ||
      order.editableDelivery !== order.snapshot.original_delivery_cost ||
      order.editableReceipt !== order.snapshot.original_received_pln ||
      order.editableCash !== order.snapshot.original_cash_on_delivery ||
      order.editableTransport !== order.snapshot.original_transport_cost_usd
    );
  }

  function isFieldChanged(order: EditableOrder, field: string): boolean {
    if (!order.snapshot) return false;
    const map: { [key: string]: keyof typeof order.snapshot } = {
      editableWeight: 'original_weight_kg',
      editableParts: 'original_part_price',
      editableDelivery: 'original_delivery_cost',
      editableReceipt: 'original_received_pln',
      editableCash: 'original_cash_on_delivery',
      editableTransport: 'original_transport_cost_usd'
    };
    const originalField = map[field];
    return order[field as keyof EditableOrder] !== order.snapshot[originalField];
  }

  async function saveChanges(receiptId: string) {
    const receiptOrders = orders[receiptId];
    if (!receiptOrders) return;

    for (const order of receiptOrders) {
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

    const totals = receiptOrders.reduce((acc, order) => {
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

    await supabase
      .from('active_receipts')
      .update({
        parts_cost_pln: totals.parts_cost_pln,
        delivery_cost_pln: totals.delivery_cost_pln,
        receipt_cost_pln: totals.receipt_cost_pln,
        cash_on_delivery_pln: totals.cash_on_delivery_pln,
        transport_cost_usd: totals.transport_cost_usd,
        total_pln,
        total_usd: totals.transport_cost_usd
      })
      .eq('id', receiptId);

    alert('Зміни збережено');
    loadReceipts();
  }

  async function sendToSupplier(receiptId: string) {
    await saveChanges(receiptId);

    const { error } = await supabase
      .from('active_receipts')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', receiptId);

    if (!error) {
      alert('Прийомку затверджено');
      loadReceipts();
    }
  }

  async function confirmReceipt(receipt: Receipt) {
    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', receipt.supplier_id)
      .single();

    if (!supplierData) {
      alert('Помилка: постачальник не знайдений');
      return;
    }

    const { data: receiptOrderLinks } = await supabase
      .from('receipt_orders')
      .select('order_id')
      .eq('receipt_id', receipt.id);

    let cardPartsCost = 0;
    let cardDeliveryCost = 0;

    if (receiptOrderLinks && receiptOrderLinks.length > 0) {
      const orderIds = receiptOrderLinks.map(ro => ro.order_id);
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds);

      if (ordersData) {
        ordersData.forEach(order => {
          if (order.payment_type === 'оплачено') {
            cardPartsCost += order.part_price || 0;
            cardDeliveryCost += order.delivery_cost || 0;
          }
        });
      }
    }

    const { error: receiptError } = await supabase
      .from('active_receipts')
      .update({
        status: 'sent_for_settlement',
        settlement_date: new Date().toISOString(),
        settled_date: null
      })
      .eq('id', receipt.id);

    if (receiptError) {
      alert('Помилка переведення на розрахунок');
      return;
    }

    const receiptCashPln = (receipt.receipt_cost_pln || 0) + (receipt.cash_on_delivery_pln || 0);
    const transportUsd = receipt.transport_cost_usd || 0;

    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        transaction_type: 'debit',
        amount_pln: 0,
        amount_usd: 0,
        cash_on_delivery_pln: receiptCashPln,
        transport_cost_usd: transportUsd,
        parts_delivery_pln: (receipt.parts_cost_pln || 0) + (receipt.delivery_cost_pln || 0),
        description: `Нарахування за накладну №${receipt.receipt_number}`,
        transaction_date: new Date().toISOString().split('T')[0],
        receipt_id: receipt.id,
        created_by: 'system'
      });

    if (txError) {
      console.error('Помилка при створенні транзакції:', txError);
    }

    if (cardPartsCost > 0 || cardDeliveryCost > 0) {
      const cardTotalAmount = cardPartsCost + cardDeliveryCost;
      const { error: cardTxError } = await supabase
        .from('card_transactions')
        .insert({
          transaction_type: 'charge',
          amount: cardTotalAmount,
          description: `Нарахування за накладну №${receipt.receipt_number} (картка)`,
          transaction_date: new Date().toISOString().split('T')[0],
          receipt_id: receipt.id,
          created_by: 'system'
        });

      if (cardTxError) {
        console.error('Помилка при створенні картової транзакції:', cardTxError);
      }
    }

    await supabase.from('supplier_transactions').insert([{
      supplier_id: receipt.supplier_id,
      receipt_id: receipt.id,
      amount_pln: receipt.total_pln,
      amount_usd: receipt.transport_cost_usd,
      parts_cost_pln: receipt.parts_cost_pln,
      delivery_cost_pln: receipt.delivery_cost_pln,
      receipt_cost_pln: receipt.receipt_cost_pln,
      cash_on_delivery_pln: receipt.cash_on_delivery_pln,
      transport_cost_usd: receipt.transport_cost_usd,
      notes: `Прийомка ${receipt.receipt_number}`
    }]);

    await supabase
      .from('suppliers')
      .update({
        balance_pln: Number(supplierData.balance_pln) + Number(receipt.total_pln),
        balance_usd: Number(supplierData.balance_usd) + Number(receipt.transport_cost_usd),
        balance_parts_pln: Number(supplierData.balance_parts_pln) + Number(receipt.parts_cost_pln),
        balance_delivery_pln: Number(supplierData.balance_delivery_pln) + Number(receipt.delivery_cost_pln),
        balance_receipt_pln: Number(supplierData.balance_receipt_pln) + Number(receipt.receipt_cost_pln),
        balance_cash_on_delivery_pln: Number(supplierData.balance_cash_on_delivery_pln) + Number(receipt.cash_on_delivery_pln),
        balance_transport_usd: Number(supplierData.balance_transport_usd) + Number(receipt.transport_cost_usd),
        card_balance_parts_pln: Number(supplierData.card_balance_parts_pln || 0) + Number(cardPartsCost),
        card_balance_delivery_pln: Number(supplierData.card_balance_delivery_pln || 0) + Number(cardDeliveryCost)
      })
      .eq('id', receipt.supplier_id);

    alert('Прийомку передано на розрахунок!');
    loadReceipts();
  }

  async function addOrderToReceipt(receiptId: string, orderId: string) {
    try {
      console.log('Починаємо додавання замовлення:', { receiptId, orderId });
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      console.log('Результат запиту замовлення:', { orderData, orderError });

      if (orderError) {
        console.error('Помилка при отриманні замовлення:', orderError);
        alert(`Помилка при отриманні замовлення: ${orderError.message}`);
        return;
      }

      if (!orderData) {
        alert('Замовлення не знайдено');
        return;
      }

      await supabase
        .from('orders')
        .update({
          previous_status: orderData.status,
          status: 'в активному прийомі'
        })
        .eq('id', orderId);

      console.log('Додаємо зв\'язок receipt_orders...');
      const { error: receiptOrderError } = await supabase.from('receipt_orders').insert({
        receipt_id: receiptId,
        order_id: orderId,
        amount: (orderData.part_price || 0) + (orderData.delivery_cost || 0)
      });

      if (receiptOrderError) {
        console.error('Помилка при додаванні зв\'язку:', receiptOrderError);
        alert(`Помилка при додаванні зв'язку: ${receiptOrderError.message}`);
        return;
      }

      console.log('Створюємо snapshot...');
      const { error: snapshotError } = await supabase.from('receipt_order_snapshots').insert({
        receipt_id: receiptId,
        order_id: orderId,
        original_weight_kg: orderData.weight_kg || 0,
        original_part_price: orderData.part_price || 0,
        original_delivery_cost: orderData.delivery_cost || 0,
        original_received_pln: orderData.received_pln || 0,
        original_cash_on_delivery: orderData.cash_on_delivery || 0,
        original_transport_cost_usd: orderData.transport_cost_usd || 0
      });

      if (snapshotError) {
        console.error('Помилка при створенні snapshot:', snapshotError);
        alert(`Помилка при створенні snapshot: ${snapshotError.message}`);
        return;
      }

      console.log('Замовлення успішно додано!');
      alert('Замовлення додано до прийомки');
      setShowAddOrders(null);
      loadOrdersForReceipt(receiptId);
      loadReceipts();
    } catch (err) {
      console.error('Помилка при створенні замовлення (catch):', err);
      alert(`Помилка при створенні замовлення: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function removeOrderFromReceipt(receiptId: string, orderId: string) {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('previous_status, status')
        .eq('id', orderId)
        .single();

      if (!orderData) {
        alert('Замовлення не знайдено');
        return;
      }

      await supabase
        .from('orders')
        .update({
          status: orderData.previous_status || orderData.status,
          previous_status: null
        })
        .eq('id', orderId);

      await supabase
        .from('receipt_orders')
        .delete()
        .eq('receipt_id', receiptId)
        .eq('order_id', orderId);

      await supabase
        .from('receipt_order_snapshots')
        .delete()
        .eq('receipt_id', receiptId)
        .eq('order_id', orderId);

      loadOrdersForReceipt(receiptId);
      loadReceipts();
      if (showAddOrders === receiptId) {
        loadAvailableOrders(receiptId);
      }
    } catch (err) {
      console.error('Помилка при видаленні замовлення:', err);
      alert(`Помилка при видаленні замовлення: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function formatNumber(num: number) {
    return new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  }

  const draftReceipts = receipts.filter(r => r.status === 'draft');
  const approvedReceipts = receipts.filter(r => r.status === 'approved');

  return (
    <div className="max-w-[98%] mx-auto px-4 py-6 space-y-6">
      {draftReceipts.map(receipt => (
        <div key={receipt.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleReceipt(receipt.id)}
                className="flex items-center gap-2 text-left flex-1"
              >
                {expandedReceipt === receipt.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Чернетка #{receipt.receipt_number} - {receipt.supplier?.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    PLN: {formatNumber(receipt.total_pln)} | USD: {formatNumber(receipt.total_usd)}
                  </p>
                </div>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddOrders(showAddOrders === receipt.id ? null : receipt.id);
                    if (showAddOrders !== receipt.id) loadAvailableOrders(receipt.id);
                  }}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition flex items-center gap-1"
                >
                  <Plus size={14} />
                  Додати замовлення
                </button>
                <button
                  onClick={() => saveChanges(receipt.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Зберегти зміни
                </button>
                <button
                  onClick={() => sendToSupplier(receipt.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-1"
                >
                  <Check size={14} />
                  Затвердити
                </button>
              </div>
            </div>
          </div>

          {showAddOrders === receipt.id && (
            <div className="p-4 bg-blue-50 border-b">
              <h4 className="font-medium mb-2">Доступні замовлення для додавання:</h4>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                {availableOrders.length > 0 ? (
                  <table className="w-full text-xs bg-white dark:bg-gray-800 rounded table-fixed">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="w-40 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Назва</th>
                        <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Запч. (zl)</th>
                        <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Дост. (zl)</th>
                        <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Прийом (zl)</th>
                        <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Побр. (zl)</th>
                        <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Перев. ($)</th>
                        <th className="w-24 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Тип оплати</th>
                        <th className="w-16 px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200">Дія</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {availableOrders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                          <td className="px-2 py-2 truncate">{order.title || '-'}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.part_price)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.delivery_cost)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.received_pln || 0)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.cash_on_delivery || 0)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.transport_cost_usd || 0)}</td>
                          <td className="px-2 py-2 truncate">{order.payment_type}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => addOrderToReceipt(receipt.id, order.id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                            >
                              Додати
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">Немає доступних замовлень</p>
                )}
              </div>
            </div>
          )}

          {expandedReceipt === receipt.id && orders[receipt.id] && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs table-fixed">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="w-20 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">ID клієнта</th>
                    <th className="w-28 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">№ запчастини</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Вага (кг)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Запч. (zl)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Дост. (zl)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Прийом (zl)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Побр. (zl)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Перев. ($)</th>
                    <th className="w-36 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Назва</th>
                    <th className="w-20 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Посилання</th>
                    <th className="w-24 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Трекінг PL</th>
                    <th className="w-24 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Тип оплати</th>
                    <th className="w-24 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Дата</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Всього</th>
                    <th className="w-12 px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200">Дія</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders[receipt.id].map(order => (
                    <tr key={order.id} className={hasChanges(order) ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                      <td className="px-2 py-2">{order.client_id}</td>
                      <td className="px-2 py-2 truncate">{order.part_number}</td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.001"
                          value={order.editableWeight}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableWeight', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableWeight') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableParts}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableParts', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableParts') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableDelivery}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableDelivery', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableDelivery') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableReceipt}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableReceipt', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableReceipt') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableCash}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableCash', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableCash') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableTransport}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableTransport', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableTransport') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 truncate">{order.title}</td>
                      <td className="px-2 py-2">
                        {order.link && <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Посилання</a>}
                      </td>
                      <td className="px-2 py-2 truncate">{order.tracking_pl}</td>
                      <td className="px-2 py-2 truncate">{order.payment_type}</td>
                      <td className="px-2 py-2">{order.order_date}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.total_cost)}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => removeOrderFromReceipt(receipt.id, order.id)}
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
          )}
        </div>
      ))}

      {approvedReceipts.map(receipt => (
        <div key={receipt.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border-2 border-green-300">
          <div className="p-4 border-b bg-green-50">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleReceipt(receipt.id)}
                className="flex items-center gap-2 text-left flex-1"
              >
                {expandedReceipt === receipt.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Підтверджено #{receipt.receipt_number} - {receipt.supplier?.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    PLN: {formatNumber(receipt.total_pln)} | USD: {formatNumber(receipt.total_usd)}
                  </p>
                </div>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => confirmReceipt(receipt)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-1"
                >
                  <Send size={16} />
                  Передати на розрахунок
                </button>
              </div>
            </div>
          </div>

          {showAddOrders === receipt.id && (
            <div className="p-4 bg-blue-50 border-b">
              <h4 className="font-medium mb-2">Доступні замовлення для додавання:</h4>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                {availableOrders.length > 0 ? (
                  <table className="w-full text-xs bg-white dark:bg-gray-800 rounded table-fixed">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="w-40 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Назва</th>
                        <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Запч. (zl)</th>
                        <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Дост. (zl)</th>
                        <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Прийом (zl)</th>
                        <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Побр. (zl)</th>
                        <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Перев. ($)</th>
                        <th className="w-24 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Тип оплати</th>
                        <th className="w-16 px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200">Дія</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {availableOrders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                          <td className="px-2 py-2 truncate">{order.title || '-'}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.part_price)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.delivery_cost)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.received_pln || 0)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.cash_on_delivery || 0)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.transport_cost_usd || 0)}</td>
                          <td className="px-2 py-2 truncate">{order.payment_type}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => addOrderToReceipt(receipt.id, order.id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                            >
                              Додати
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">Немає доступних замовлень</p>
                )}
              </div>
            </div>
          )}

          {expandedReceipt === receipt.id && orders[receipt.id] && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs table-fixed">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="w-20 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">ID клієнта</th>
                    <th className="w-28 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">№ запчастини</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Вага (кг)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Запч. (zl)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Дост. (zl)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Прийом (zl)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Побр. (zl)</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Перев. ($)</th>
                    <th className="w-36 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Назва</th>
                    <th className="w-20 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Посилання</th>
                    <th className="w-24 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Трекінг PL</th>
                    <th className="w-24 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Тип оплати</th>
                    <th className="w-24 px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Дата</th>
                    <th className="w-24 px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Всього</th>
                    <th className="w-12 px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200">Дія</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders[receipt.id].map(order => (
                    <tr key={order.id} className={hasChanges(order) ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                      <td className="px-2 py-2">{order.client_id}</td>
                      <td className="px-2 py-2 truncate">{order.part_number}</td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.001"
                          value={order.editableWeight}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableWeight', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableWeight') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableParts}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableParts', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableParts') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableDelivery}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableDelivery', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableDelivery') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableReceipt}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableReceipt', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableReceipt') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableCash}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableCash', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableCash') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableTransport}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableTransport', parseFloat(e.target.value) || 0)}
                          className={`w-full px-1 py-1 border rounded text-right tabular-nums ${isFieldChanged(order, 'editableTransport') ? 'bg-yellow-100 border-yellow-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-2 truncate">{order.title}</td>
                      <td className="px-2 py-2">
                        {order.link && <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Посилання</a>}
                      </td>
                      <td className="px-2 py-2 truncate">{order.tracking_pl}</td>
                      <td className="px-2 py-2 truncate">{order.payment_type}</td>
                      <td className="px-2 py-2">{order.order_date}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatNumber(order.total_cost)}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => removeOrderFromReceipt(receipt.id, order.id)}
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
          )}
        </div>
      ))}


      {receipts.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
          Немає прийомок для обробки
        </div>
      )}
    </div>
  );
}
