import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Check, ChevronDown, ChevronRight, Plus, X, FileText, ExternalLink, Search, XCircle, FileDown, Archive } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { ExportButton } from './ExportButton';
import { exportToCSV } from '../utils/exportData';
import { getCurrentProjectId } from '../utils/projectAccess';

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
  created_by?: string;
  approved_by?: string;
  settled_by?: string;
  supplier?: {
    name: string;
  };
  created_by_profile?: {
    full_name: string | null;
    email: string;
  };
  approved_by_profile?: {
    full_name: string | null;
    email: string;
  };
  settled_by_profile?: {
    full_name: string | null;
    email: string;
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
  tracking_pl?: string;
  part_number?: string;
  payment_type: string;
  order_date: string;
  part_price: number;
  delivery_cost: number;
  total_cost: number;
  received_pln?: number;
  cash_on_delivery?: number;
  transport_cost_usd?: number;
};

export default function ReceiptManagement() {
  const { showSuccess, showError, showWarning, confirm, prompt } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [orders, setOrders] = useState<{ [receiptId: string]: EditableOrder[] }>({});
  const [loadingOrders, setLoadingOrders] = useState<{ [receiptId: string]: boolean }>({});
  const [showAddOrders, setShowAddOrders] = useState<string | null>(null);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReceipts();
  }, []);

  async function loadReceipts() {
    const { data } = await supabase
      .from('active_receipts')
      .select(`
        *,
        supplier:suppliers(name),
        created_by_profile:user_profiles!active_receipts_created_by_fkey(full_name, email),
        approved_by_profile:user_profiles!active_receipts_approved_by_fkey(full_name, email),
        settled_by_profile:user_profiles!active_receipts_settled_by_fkey(full_name, email)
      `)
      .in('status', ['draft', 'approved'])
      .order('created_at', { ascending: false });

    if (data) {
      setReceipts(data);
    }
  }

  async function loadOrdersForReceipt(receiptId: string) {
    setLoadingOrders(prev => ({ ...prev, [receiptId]: true }));

    try {
      const receipt = receipts.find(r => r.id === receiptId);
      const isDraft = receipt?.status === 'draft';

      if (isDraft) {
        const { data: draftOrders } = await supabase
          .from('draft_orders')
          .select('*')
          .eq('receipt_id', receiptId);

        if (draftOrders && draftOrders.length > 0) {
          const ordersWithEditable: EditableOrder[] = draftOrders.map(order => ({
            ...order,
            editableWeight: order.weight_kg || 0,
            editableParts: order.part_price || 0,
            editableDelivery: order.delivery_cost || 0,
            editableReceipt: order.received_pln || 0,
            editableCash: order.cash_on_delivery || 0,
            editableTransport: order.transport_cost_usd || 0
          }));

          setOrders(prev => ({ ...prev, [receiptId]: ordersWithEditable }));
        } else {
          setOrders(prev => ({ ...prev, [receiptId]: [] }));
        }
      } else {
        const { data: receiptOrders } = await supabase
          .from('receipt_orders')
          .select('order_id')
          .eq('receipt_id', receiptId);

        if (!receiptOrders || receiptOrders.length === 0) {
          setOrders(prev => ({ ...prev, [receiptId]: [] }));
          setLoadingOrders(prev => ({ ...prev, [receiptId]: false }));
          return;
        }

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
    } catch (error) {
      console.error('Помилка завантаження замовлень:', error);
      setOrders(prev => ({ ...prev, [receiptId]: [] }));
    } finally {
      setLoadingOrders(prev => ({ ...prev, [receiptId]: false }));
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
      .select('id, order_number, client_id, title, link, tracking_pl, part_number, payment_type, order_date, part_price, delivery_cost, total_cost, received_pln, cash_on_delivery, transport_cost_usd')
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
      setLoadingOrders(prev => ({ ...prev, [receiptId]: true }));
      loadOrdersForReceipt(receiptId);
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

    const paidOrdersWithCash = receiptOrders.filter(order =>
      order.payment_type?.toLowerCase().includes('оплачено') && order.editableCash !== 0
    );

    if (paidOrdersWithCash.length > 0) {
      const ordersList = paidOrdersWithCash.map(o => `- ${o.client_id}: ${o.title}`).join('\n');
      const reason = await prompt(
        `УВАГА! Наступні замовлення мають тип оплати "оплачено", але встановлено побрання:\n\n${ordersList}\n\nЯкщо це не помилка, опишіть причину:`,
        ''
      );

      if (reason === null) {
        return;
      }

      if (!reason || reason.trim() === '') {
        const confirmed = await confirm(
          'Ви не вказали причину. Ви впевнені, що хочете продовжити без пояснення?'
        );
        if (!confirmed) {
          return;
        }
      }
    }

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

    showSuccess('Зміни збережено');
    loadReceipts();
  }

  async function sendToSupplier(receiptId: string) {
    await saveChanges(receiptId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('Помилка авторизації. Увійдіть знову.');
      return;
    }

    const { data: receipt } = await supabase
      .from('active_receipts')
      .select('receipt_number')
      .eq('id', receiptId)
      .single();

    if (!receipt) {
      showError('Помилка: прийомку не знайдено');
      return;
    }

    const { data: receiptOrders } = await supabase
      .from('receipt_orders')
      .select('order_id, orders(*)')
      .eq('receipt_id', receiptId);

    if (receiptOrders && receiptOrders.length > 0) {
      const acceptedOrdersData = receiptOrders
        .filter((ro: any) => ro.orders)
        .map((ro: any) => ({
          order_id: ro.order_id,
          receipt_id: receiptId,
          receipt_number: receipt.receipt_number,
          order_number: ro.orders.order_number,
          tracking_number: ro.orders.tracking_number,
          supplier_id: ro.orders.supplier_id,
          title: ro.orders.title,
          client_id: ro.orders.client_id,
          part_number: ro.orders.part_number,
          link: ro.orders.link,
          weight_kg: ro.orders.weight_kg,
          part_price: ro.orders.part_price,
          delivery_cost: ro.orders.delivery_cost,
          received_pln: ro.orders.received_pln,
          cash_on_delivery: ro.orders.cash_on_delivery,
          transport_cost_usd: ro.orders.transport_cost_usd,
          payment_type: ro.orders.payment_type,
          accepted_at: new Date().toISOString()
        }));

      const { error: acceptedError } = await supabase
        .from('accepted_orders')
        .insert(acceptedOrdersData);

      if (acceptedError) {
        console.error('Помилка створення прийнятих замовлень:', acceptedError);
        showError('Помилка при збереженні прийнятих замовлень');
        return;
      }

      const orderIds = receiptOrders.map((ro: any) => ro.order_id);
      const { error: statusError } = await supabase
        .from('orders')
        .update({ status: 'прийнято' })
        .in('id', orderIds);

      if (statusError) {
        console.error('Помилка оновлення статусу замовлень:', statusError);
        showError('Помилка при оновленні статусу замовлень');
        return;
      }
    }

    const { error } = await supabase
      .from('active_receipts')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id
      })
      .eq('id', receiptId);

    if (!error) {
      showSuccess('Прийомку затверджено! Замовлення переміщено до вкладки "Прийняті"');
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
      showError('Помилка: постачальник не знайдений');
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
      showError('Помилка переведення на розрахунок');
      return;
    }

    if (receiptOrderLinks && receiptOrderLinks.length > 0) {
      const orderIds = receiptOrderLinks.map(ro => ro.order_id);
      console.log('Оновлення статусу для замовлень:', orderIds);

      for (const orderId of orderIds) {
        const { data: otherReceipts } = await supabase
          .from('receipt_orders')
          .select('receipt_id, active_receipts(status)')
          .eq('order_id', orderId)
          .neq('receipt_id', receipt.id);

        const hasOtherActiveReceipts = otherReceipts?.some((ro: any) =>
          ro.active_receipts?.status === 'draft' || ro.active_receipts?.status === 'approved'
        );

        if (!hasOtherActiveReceipts) {
          const { error: orderError } = await supabase
            .from('orders')
            .update({
              status: 'на звірці',
              previous_status: null
            })
            .eq('id', orderId);

          if (orderError) {
            console.error(`Помилка при оновленні замовлення ${orderId}:`, orderError);
          } else {
            console.log(`Замовлення ${orderId} переведено на звірку`);
          }
        } else {
          console.log(`Замовлення ${orderId} залишається в активному прийомі (є в інших прийомках)`);
        }
      }
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

    showSuccess('Прійомку передано на розрахунок!');
    loadReceipts();
  }

  async function addOrderToReceipt(receiptId: string, orderId: string) {
    try {
      console.log('Починаємо додавання замовлення:', { receiptId, orderId });
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      const { data: receiptData } = await supabase
        .from('active_receipts')
        .select('status')
        .eq('id', receiptId)
        .single();

      if (!receiptData) {
        showError('Прійомку не знайдено');
        return;
      }

      if (receiptData.status === 'sent_for_settlement' || receiptData.status === 'settled') {
        showWarning('Неможливо додати замовлення до прийомки, яка вже на розрахунку');
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      console.log('Результат запиту замовлення:', { orderData, orderError });

      if (orderError) {
        console.error('Помилка при отриманні замовлення:', orderError);
        showError(`Помилка при отриманні замовлення: ${orderError.message}`);
        return;
      }

      if (!orderData) {
        showError('Замовлення не знайдено');
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
        showError(`Помилка при додаванні зв'язку: ${receiptOrderError.message}`);
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
        showError(`Помилка при створенні snapshot: ${snapshotError.message}`);
        return;
      }

      console.log('Замовлення успішно додано!');
      showSuccess('Замовлення додано до прийомки');
      setShowAddOrders(null);
      loadOrdersForReceipt(receiptId);
      loadReceipts();
    } catch (err) {
      console.error('Помилка при створенні замовлення (catch):', err);
      showError(`Помилка при створенні замовлення: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function removeOrderFromReceipt(receiptId: string, orderId: string) {
    try {
      const { data: receiptData } = await supabase
        .from('active_receipts')
        .select('status')
        .eq('id', receiptId)
        .single();

      if (!receiptData) {
        showError('Прійомку не знайдено');
        return;
      }

      const { data: orderData } = await supabase
        .from('orders')
        .select('previous_status, status')
        .eq('id', orderId)
        .single();

      if (!orderData) {
        showError('Замовлення не знайдено');
        return;
      }

      const { data: otherReceipts } = await supabase
        .from('receipt_orders')
        .select('receipt_id, active_receipts(status)')
        .eq('order_id', orderId)
        .neq('receipt_id', receiptId);

      const hasOtherActiveReceipts = otherReceipts?.some((ro: any) =>
        ro.active_receipts?.status === 'draft' || ro.active_receipts?.status === 'approved'
      );

      let newStatus = orderData.status;
      if (receiptData.status === 'sent_for_settlement' || receiptData.status === 'settled') {
        if (!hasOtherActiveReceipts) {
          newStatus = 'на звірці';
        }
      } else {
        newStatus = orderData.previous_status || orderData.status;
      }

      await supabase
        .from('orders')
        .update({
          status: newStatus,
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

      const { data: remainingOrders } = await supabase
        .from('receipt_orders')
        .select('id')
        .eq('receipt_id', receiptId);

      if (!remainingOrders || remainingOrders.length === 0) {
        await archiveDraftReceipt(receiptId);
        showSuccess('Чернетка порожня і була автоматично архівована');
        return;
      }

      loadOrdersForReceipt(receiptId);
      loadReceipts();
      if (showAddOrders === receiptId) {
        loadAvailableOrders(receiptId);
      }
    } catch (err) {
      console.error('Помилка при видаленні замовлення:', err);
      showError(`Помилка при видаленні замовлення: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function archiveDraftReceipt(receiptId: string) {
    try {
      const projectId = await getCurrentProjectId();
      if (!projectId) {
        showError('Не знайдено project_id');
        return;
      }

      const { data: receiptData } = await supabase
        .from('active_receipts')
        .select('receipt_number, settlement_type')
        .eq('id', receiptId)
        .single();

      if (!receiptData) {
        showError('Прийомку не знайдено');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('draft_orders')
        .insert({
          receipt_number: receiptData.receipt_number,
          payment_type: receiptData.settlement_type || 'не обрано',
          archived: true,
          archived_at: new Date().toISOString(),
          project_id: projectId,
          created_by: user?.id
        });

      if (error) {
        console.error('Помилка архівування:', error);
        showError('Помилка при архівуванні чернетки');
        return;
      }

      await supabase
        .from('active_receipts')
        .delete()
        .eq('id', receiptId);

      loadReceipts();
      showSuccess('Чернетку архівовано!');
    } catch (err) {
      console.error('Помилка при архівуванні:', err);
      showError('Помилка при архівуванні чернетки');
    }
  }

  async function returnToDraft(receiptId: string) {
    const confirmed = confirm('Повернути прийомку в статус чернетки?');
    if (!confirmed) return;

    const { data: receiptOrders } = await supabase
      .from('receipt_orders')
      .select('order_id')
      .eq('receipt_id', receiptId);

    if (receiptOrders && receiptOrders.length > 0) {
      const orderIds = receiptOrders.map(ro => ro.order_id);

      await supabase
        .from('accepted_orders')
        .delete()
        .eq('receipt_id', receiptId);

      for (const orderId of orderIds) {
        await supabase
          .from('orders')
          .update({
            status: 'в активному прийомі',
            previous_status: null
          })
          .eq('id', orderId);
      }
    }

    await supabase
      .from('active_receipts')
      .update({
        status: 'draft',
        approved_at: null
      })
      .eq('id', receiptId);

    showSuccess('Прийомку повернуто в чернетку');
    loadReceipts();
  }

  function formatNumber(num: number) {
    return new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  }

  const filteredAvailableOrders = availableOrders.filter(order => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase().trim();
    return (
      (order.order_number && order.order_number.toLowerCase().includes(searchLower)) ||
      (order.client_id && order.client_id.toLowerCase().includes(searchLower)) ||
      (order.title && order.title.toLowerCase().includes(searchLower)) ||
      (order.link && order.link.toLowerCase().includes(searchLower)) ||
      (order.tracking_pl && order.tracking_pl.toLowerCase().includes(searchLower)) ||
      (order.part_number && order.part_number.toLowerCase().includes(searchLower)) ||
      (order.notes && order.notes.toLowerCase().includes(searchLower)) ||
      (order.status && order.status.toLowerCase().includes(searchLower)) ||
      (order.payment_type && order.payment_type.toLowerCase().includes(searchLower)) ||
      (order.part_price && order.part_price.toString().includes(searchLower)) ||
      (order.delivery_cost && order.delivery_cost.toString().includes(searchLower)) ||
      (order.total_cost && order.total_cost.toString().includes(searchLower)) ||
      (order.cash_on_delivery && order.cash_on_delivery.toString().includes(searchLower)) ||
      (order.received_pln && order.received_pln.toString().includes(searchLower)) ||
      (order.transport_cost_usd && order.transport_cost_usd.toString().includes(searchLower)) ||
      (order.weight_kg && order.weight_kg.toString().includes(searchLower)) ||
      (order.order_date && order.order_date.includes(searchLower))
    );
  });

  const draftReceipts = receipts.filter(r => r.status === 'draft');
  const approvedReceipts = receipts.filter(r => r.status === 'approved');

  async function exportReceiptDetails(receiptId: string) {
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) {
      showError('Прийомку не знайдено');
      return;
    }

    if (!orders[receiptId]) {
      await loadOrdersForReceipt(receiptId);
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const receiptOrders = orders[receiptId] || [];
    if (receiptOrders.length === 0) {
      showWarning('Прийомка не містить замовлень');
      return;
    }

    const dataToExport = receiptOrders.map(order => ({
      client_id: order.client_id || '',
      order_number: order.order_number || '',
      title: order.title || '',
      part_number: order.part_number || '',
      tracking_pl: order.tracking_pl || '',
      weight_kg: order.editableWeight || 0,
      part_price: order.editableParts || 0,
      delivery_cost: order.editableDelivery || 0,
      received_pln: order.editableReceipt || 0,
      cash_on_delivery: order.editableCash || 0,
      transport_cost_usd: order.editableTransport || 0,
      payment_type: order.payment_type || '',
      order_date: order.order_date || '',
      total: (order.editableParts || 0) + (order.editableDelivery || 0) + (order.editableReceipt || 0) + (order.editableCash || 0)
    }));

    const headers = {
      client_id: 'ID Клієнта',
      order_number: '№ Замовлення',
      title: 'Назва',
      part_number: 'Артикул',
      tracking_pl: 'Трекінг PL',
      weight_kg: 'Вага (кг)',
      part_price: 'Деталі (zł)',
      delivery_cost: 'Доставка (zł)',
      received_pln: 'Прийом (zł)',
      cash_on_delivery: 'Побранє (zł)',
      transport_cost_usd: 'Транспорт ($)',
      payment_type: 'Тип оплати',
      order_date: 'Дата',
      total: 'Всього (zł)'
    };

    const statusText = receipt.status === 'draft' ? 'chernetka' : 'pidtverdzheno';
    exportToCSV(dataToExport, `priyomka_${receipt.receipt_number}_${statusText}`, headers);
    showSuccess('Документ експортовано');
  }

  const handleExportReceipts = () => {
    const dataToExport = receipts.map(receipt => ({
      receipt_number: receipt.receipt_number,
      receipt_date: receipt.receipt_date,
      status: receipt.status === 'draft' ? 'Чернетка' : receipt.status === 'approved' ? 'Затверджено' : receipt.status === 'sent_for_settlement' ? 'Відправлено' : 'Розраховано',
      supplier: receipt.supplier?.name || '',
      parts_cost_pln: receipt.parts_cost_pln,
      delivery_cost_pln: receipt.delivery_cost_pln,
      receipt_cost_pln: receipt.receipt_cost_pln,
      cash_on_delivery_pln: receipt.cash_on_delivery_pln,
      transport_cost_usd: receipt.transport_cost_usd,
      total_pln: receipt.total_pln,
      total_usd: receipt.total_usd
    }));

    const headers = {
      receipt_number: '№ Прийомки',
      receipt_date: 'Дата',
      status: 'Статус',
      supplier: 'Постачальник',
      parts_cost_pln: 'Деталі PLN',
      delivery_cost_pln: 'Доставка PLN',
      receipt_cost_pln: 'Прийомка PLN',
      cash_on_delivery_pln: 'Побранє PLN',
      transport_cost_usd: 'Транспорт USD',
      total_pln: 'Всього PLN',
      total_usd: 'Всього USD'
    };

    exportToCSV(dataToExport, 'upravlinnya_priyomkamy', headers);
  };

  return (
    <div className="max-w-[98%] mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Управління прийомками</h2>
        <ExportButton onClick={handleExportReceipts} disabled={receipts.length === 0} />
      </div>
      {draftReceipts.map(receipt => (
        <div key={receipt.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b bg-gray-50 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-750 dark:border-gray-700">
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
                    {receipt.created_by_profile && (
                      <span className="ml-3 text-blue-600 dark:text-blue-400">
                        Створив: {receipt.created_by_profile.full_name || receipt.created_by_profile.email}
                      </span>
                    )}
                  </p>
                </div>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => exportReceiptDetails(receipt.id)}
                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-500 transition flex items-center gap-1"
                  title="Експортувати чернетку"
                >
                  <FileDown size={14} />
                  Експорт
                </button>
                <button
                  onClick={() => {
                    const isOpening = showAddOrders !== receipt.id;
                    setShowAddOrders(isOpening ? receipt.id : null);
                    if (isOpening) {
                      loadAvailableOrders(receipt.id);
                    } else {
                      setSearchTerm('');
                    }
                  }}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600 transition flex items-center gap-1"
                >
                  <Plus size={14} />
                  Додати замовлення
                </button>
                <button
                  onClick={() => saveChanges(receipt.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-gradient-to-br dark:from-blue-800 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-600 transition"
                >
                  Зберегти зміни
                </button>
                <button
                  onClick={() => {
                    if (confirm('Архівувати чернетку? Вона буде доступна в архіві на сторінці "Активні прийомки".')) {
                      archiveDraftReceipt(receipt.id);
                    }
                  }}
                  className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 dark:bg-gradient-to-br dark:from-orange-800 dark:to-orange-700 dark:hover:from-orange-700 dark:hover:to-orange-600 transition flex items-center gap-1"
                  title="Архівувати чернетку"
                >
                  <Archive size={14} />
                  Архівувати
                </button>
                <button
                  onClick={() => sendToSupplier(receipt.id)}
                  className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-700 dark:bg-gradient-to-br dark:from-green-800 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-600 transition flex items-center gap-1"
                >
                  <Check size={14} />
                  Затвердити
                </button>
              </div>
            </div>
          </div>

          {showAddOrders === receipt.id && (
            <div className="p-4 bg-blue-50 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-900 border-b dark:border-blue-800">
              <h4 className="font-medium mb-2 text-gray-900 dark:text-blue-200">Доступні замовлення для додавання:</h4>
              <div className="mb-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  type="text"
                  placeholder="Пошук за ID клієнта, назвою, трекінгом або номером запчастини..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                {filteredAvailableOrders.length > 0 ? (
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
                      {filteredAvailableOrders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                          <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.title || '***'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{order.part_price ? formatNumber(order.part_price) : '***'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{order.delivery_cost ? formatNumber(order.delivery_cost) : '***'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{order.received_pln ? formatNumber(order.received_pln) : '***'}</td>
                          <td className={`px-2 py-2 text-right tabular-nums ${
                            order.payment_type?.toLowerCase().includes('оплачено') && (order.cash_on_delivery || 0) !== 0
                              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>{order.cash_on_delivery ? formatNumber(order.cash_on_delivery) : '***'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{order.transport_cost_usd ? formatNumber(order.transport_cost_usd) : '***'}</td>
                          <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.payment_type || '***'}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => addOrderToReceipt(receipt.id, order.id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-gradient-to-br dark:from-blue-800 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-600 text-xs"
                            >
                              Додати
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Немає доступних замовлень</p>
                )}
              </div>
            </div>
          )}

          {expandedReceipt === receipt.id && (
            <div>
              {loadingOrders[receipt.id] === true ? (
                <div className="px-4 py-8 bg-gray-50 dark:bg-gray-750 border-t border-b dark:border-gray-700 text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Завантаження замовлень...</div>
                </div>
              ) : (orders[receipt.id] && orders[receipt.id].length > 0) ? (
                <>
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-t border-b dark:border-gray-700 flex justify-between items-center">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Замовлень у документі: <span className="font-semibold">{orders[receipt.id].length}</span>
                    </div>
                    <button
                      onClick={() => exportReceiptDetails(receipt.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-gradient-to-br dark:from-blue-800 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-600 transition flex items-center gap-2 shadow-sm"
                      title="Експортувати документ в CSV"
                    >
                      <FileDown size={16} />
                      <span className="font-medium">Експортувати документ</span>
                    </button>
                  </div>
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
                    <tr key={order.id} className={hasChanges(order) ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}>
                      <td className="px-2 py-2 text-gray-900 dark:text-gray-100">{order.client_id || '***'}</td>
                      <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.part_number || '***'}</td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.001"
                          value={order.editableWeight}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableWeight', parseFloat(e.target.value) || 0)}
                          className={`w-20 px-1 py-1 border rounded text-right tabular-nums bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isFieldChanged(order, 'editableWeight') ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-500' : 'border-gray-300 dark:border-gray-600'}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableParts}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableParts', parseFloat(e.target.value) || 0)}
                          className={`w-20 px-1 py-1 border rounded text-right tabular-nums bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isFieldChanged(order, 'editableParts') ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-500' : 'border-gray-300 dark:border-gray-600'}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableDelivery}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableDelivery', parseFloat(e.target.value) || 0)}
                          className={`w-20 px-1 py-1 border rounded text-right tabular-nums bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isFieldChanged(order, 'editableDelivery') ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-500' : 'border-gray-300 dark:border-gray-600'}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableReceipt}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableReceipt', parseFloat(e.target.value) || 0)}
                          className={`w-20 px-1 py-1 border rounded text-right tabular-nums bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isFieldChanged(order, 'editableReceipt') ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-500' : 'border-gray-300 dark:border-gray-600'}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableCash}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableCash', parseFloat(e.target.value) || 0)}
                          className={`w-20 px-1 py-1 border rounded text-right tabular-nums bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                            order.payment_type?.toLowerCase().includes('оплачено') && order.editableCash !== 0
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/30 dark:border-red-400'
                              : isFieldChanged(order, 'editableCash')
                              ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableTransport}
                          onChange={(e) => updateOrderField(receipt.id, order.id, 'editableTransport', parseFloat(e.target.value) || 0)}
                          className={`w-20 px-1 py-1 border rounded text-right tabular-nums bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${isFieldChanged(order, 'editableTransport') ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-500' : 'border-gray-300 dark:border-gray-600'}`}
                        />
                      </td>
                      <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.title || '***'}</td>
                      <td className="px-2 py-2 text-center">
                        {order.link ? <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex"><ExternalLink size={16} /></a> : <span className="text-gray-900 dark:text-gray-100">***</span>}
                      </td>
                      <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.tracking_pl || '***'}</td>
                      <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.payment_type || '***'}</td>
                      <td className="px-2 py-2 text-gray-900 dark:text-gray-100">{order.order_date || '***'}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{order.total_cost ? formatNumber(order.total_cost) : '***'}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => removeOrderFromReceipt(receipt.id, order.id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded transition"
                          title="Видалити з прийомки"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
                </>
              ) : (
                <div className="px-4 py-8 bg-gray-50 dark:bg-gray-750 border-t border-b dark:border-gray-700 text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">В цій прийомці немає замовлень</div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {approvedReceipts.map(receipt => (
        <div key={receipt.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border-2 border-green-300 dark:border-green-800">
          <div className="p-4 border-b bg-green-50 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 dark:border-green-800">
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
                    {receipt.created_by_profile && (
                      <span className="ml-3 text-blue-600 dark:text-blue-400">
                        Створив: {receipt.created_by_profile.full_name || receipt.created_by_profile.email}
                      </span>
                    )}
                    {receipt.approved_by_profile && (
                      <span className="ml-3 text-green-600 dark:text-green-400">
                        Затвердив: {receipt.approved_by_profile.full_name || receipt.approved_by_profile.email}
                      </span>
                    )}
                  </p>
                </div>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => exportReceiptDetails(receipt.id)}
                  className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-500 transition flex items-center gap-1"
                  title="Експортувати підтверджений документ"
                >
                  <FileDown size={16} />
                  Експорт
                </button>
                <button
                  onClick={() => returnToDraft(receipt.id)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600 transition flex items-center gap-1"
                >
                  Повернути в чернетку
                </button>
                <button
                  onClick={() => confirmReceipt(receipt)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-gradient-to-br dark:from-blue-800 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-600 transition flex items-center gap-1"
                >
                  <Send size={16} />
                  Передати на розрахунок
                </button>
              </div>
            </div>
          </div>

          {showAddOrders === receipt.id && (
            <div className="p-4 bg-blue-50 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-900 border-b dark:border-blue-800">
              <h4 className="font-medium mb-2 text-gray-900 dark:text-blue-200">Доступні замовлення для додавання:</h4>
              <div className="mb-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  type="text"
                  placeholder="Пошук за ID клієнта, назвою, трекінгом або номером запчастини..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                {filteredAvailableOrders.length > 0 ? (
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
                      {filteredAvailableOrders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                          <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.title || '***'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{order.part_price ? formatNumber(order.part_price) : '***'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{order.delivery_cost ? formatNumber(order.delivery_cost) : '***'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{order.received_pln ? formatNumber(order.received_pln) : '***'}</td>
                          <td className={`px-2 py-2 text-right tabular-nums ${
                            order.payment_type?.toLowerCase().includes('оплачено') && (order.cash_on_delivery || 0) !== 0
                              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>{order.cash_on_delivery ? formatNumber(order.cash_on_delivery) : '***'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{order.transport_cost_usd ? formatNumber(order.transport_cost_usd) : '***'}</td>
                          <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.payment_type || '***'}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => addOrderToReceipt(receipt.id, order.id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-gradient-to-br dark:from-blue-800 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-600 text-xs"
                            >
                              Додати
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Немає доступних замовлень</p>
                )}
              </div>
            </div>
          )}

          {expandedReceipt === receipt.id && (
            <div>
              {loadingOrders[receipt.id] === true ? (
                <div className="px-4 py-8 bg-green-50 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 border-t border-b dark:border-green-800 text-center">
                  <div className="text-sm text-green-700 dark:text-green-300">Завантаження замовлень...</div>
                </div>
              ) : (orders[receipt.id] && orders[receipt.id].length > 0) ? (
                <>
                  <div className="px-4 py-3 bg-green-50 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 border-t border-b dark:border-green-800 flex justify-between items-center">
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Замовлень у документі: <span className="font-semibold">{orders[receipt.id].length}</span>
                    </div>
                    <button
                      onClick={() => exportReceiptDetails(receipt.id)}
                      className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-700 dark:bg-gradient-to-br dark:from-green-800 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-600 transition flex items-center gap-2 shadow-sm"
                      title="Експортувати підтверджений документ в CSV"
                    >
                      <FileDown size={16} />
                      <span className="font-medium">Експортувати документ</span>
                    </button>
                  </div>
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
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-2 py-2 text-gray-900 dark:text-gray-100">{order.client_id || '***'}</td>
                      <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.part_number || '***'}</td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.001"
                          value={order.editableWeight}
                          disabled
                          className="w-20 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-right tabular-nums bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 cursor-not-allowed"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableParts}
                          disabled
                          className="w-20 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-right tabular-nums bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 cursor-not-allowed"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableDelivery}
                          disabled
                          className="w-20 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-right tabular-nums bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 cursor-not-allowed"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableReceipt}
                          disabled
                          className="w-20 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-right tabular-nums bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 cursor-not-allowed"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableCash}
                          disabled
                          className={`w-20 px-1 py-1 border rounded text-right tabular-nums cursor-not-allowed text-gray-500 dark:text-gray-300 ${
                            order.payment_type?.toLowerCase().includes('оплачено') && order.editableCash !== 0
                              ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30'
                              : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600'
                          }`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.editableTransport}
                          disabled
                          className="w-20 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-right tabular-nums bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 cursor-not-allowed"
                        />
                      </td>
                      <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.title || '***'}</td>
                      <td className="px-2 py-2 text-center">
                        {order.link ? <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex"><ExternalLink size={16} /></a> : <span className="text-gray-900 dark:text-gray-100">***</span>}
                      </td>
                      <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.tracking_pl || '***'}</td>
                      <td className="px-2 py-2 truncate text-gray-900 dark:text-gray-100">{order.payment_type || '***'}</td>
                      <td className="px-2 py-2 text-gray-900 dark:text-gray-100">{order.order_date || '***'}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{order.total_cost ? formatNumber(order.total_cost) : '***'}</td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-gray-400 dark:text-gray-500 text-xs">Заблоковано</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
                </>
              ) : (
                <div className="px-4 py-8 bg-green-50 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 border-t border-b dark:border-green-800 text-center">
                  <div className="text-sm text-green-700 dark:text-green-300">В цій прийомці немає замовлень</div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}


      {receipts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-12 shadow-lg border border-blue-100 dark:border-gray-700 max-w-md w-full">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
                <FileText size={48} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 text-center mb-3">
              Немає прийомок
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center text-sm leading-relaxed">
              Наразі немає жодної прийомки для обробки. Прийомки з'являться тут після створення.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
