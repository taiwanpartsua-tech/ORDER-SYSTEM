import { useState, useEffect } from 'react';
import { supabase, CardTransaction, ActiveReceipt, Order } from '../lib/supabase';
import { Plus, TrendingDown, TrendingUp, CheckCircle2, XCircle, Undo2, ArrowLeft } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { ExportButton } from './ExportButton';
import { exportToCSV } from '../utils/exportData';

export default function CardMutualSettlement() {
  const { showSuccess, showError, showWarning, confirm } = useToast();
  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [receipts, setReceipts] = useState<ActiveReceipt[]>([]);
  const [receiptOrders, setReceiptOrders] = useState<Record<string, Order[]>>({});
  const [balancePartsPln, setBalancePartsPln] = useState(0);
  const [balanceDeliveryPln, setBalanceDeliveryPln] = useState(0);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [formData, setFormData] = useState({
    balanceType: 'parts',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [chargeData, setChargeData] = useState({
    balanceType: 'parts',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  function formatNumber(num: number | undefined | null): string {
    if (num === undefined || num === null) return '0';
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  }

  useEffect(() => {
    loadTransactions();
    loadReceipts();
  }, []);

  useEffect(() => {
    if (transactions.length >= 0 && receipts.length >= 0) {
      calculateBalance(transactions);
    }
  }, [receipts, transactions]);

  async function loadTransactions() {
    const { data } = await supabase
      .from('card_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (data) {
      setTransactions(data);
    }
  }

  async function loadReceipts() {
    const { data } = await supabase
      .from('active_receipts')
      .select('*')
      .in('status', ['sent_for_settlement', 'settled'])
      .or('settlement_type.eq.card,settlement_type.is.null')
      .order('settlement_date', { ascending: false });

    if (data) {
      const filteredData = data.filter(r => {
        if (r.status === 'sent_for_settlement') return true;
        if (r.status === 'settled') return r.settlement_type === 'card';
        return false;
      });
      setReceipts(filteredData);
      filteredData.forEach(receipt => loadReceiptOrders(receipt.id));
    }
  }

  async function loadReceiptOrders(receiptId: string) {
    const { data } = await supabase
      .from('receipt_orders')
      .select('order_id')
      .eq('receipt_id', receiptId);

    if (data && data.length > 0) {
      const orderIds = data.map(ro => ro.order_id);
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds);

      if (orders) {
        setReceiptOrders(prev => ({ ...prev, [receiptId]: orders }));
      }
    }
  }

  function calculateBalance(txns: CardTransaction[]) {
    let partsPln = 0;
    let deliveryPln = 0;

    receipts.filter(r => r.status === 'sent_for_settlement' || r.status === 'settled').forEach(receipt => {
      const orders = receiptOrders[receipt.id] || [];
      const paidOrders = orders.filter(o => o.verified && o.payment_type === 'оплачено');

      paidOrders.forEach(order => {
        partsPln += order.part_price || 0;
        deliveryPln += order.delivery_cost || 0;
      });
    });

    txns.forEach(tx => {
      if (tx.is_reversed) return;
      if (tx.receipt_id) return;

      if (tx.transaction_type === 'charge') {
        partsPln += tx.amount || 0;
      } else if (tx.transaction_type === 'payment') {
        partsPln -= tx.amount || 0;
      }
    });

    setBalancePartsPln(partsPln);
    setBalanceDeliveryPln(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      showWarning('Введіть коректну суму');
      return;
    }

    const transactionData: any = {
      transaction_type: 'payment',
      amount: amount,
      description: formData.description || 'Платіж',
      transaction_date: formData.date,
      is_reversed: false
    };

    const { error } = await supabase
      .from('card_transactions')
      .insert(transactionData);

    if (error) {
      console.error('Error adding payment:', error);
      showError('Помилка при додаванні платежу');
      return;
    }

    showSuccess('Платіж успішно додано');
    setFormData({
      balanceType: 'parts',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowPaymentForm(false);
    loadTransactions();
  }

  async function handleChargeSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(chargeData.amount);
    if (isNaN(amount) || amount <= 0) {
      showWarning('Введіть коректну суму');
      return;
    }

    if (!chargeData.description.trim()) {
      showWarning('Вкажіть причину нарахування');
      return;
    }

    const transactionData: any = {
      transaction_type: 'charge',
      amount: amount,
      description: chargeData.description,
      transaction_date: chargeData.date,
      is_reversed: false
    };

    const { error } = await supabase
      .from('card_transactions')
      .insert(transactionData);

    if (error) {
      console.error('Error adding charge:', error);
      showError('Помилка при додаванні нарахування');
      return;
    }

    showSuccess('Нарахування успішно додано');
    setChargeData({
      balanceType: 'parts',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowChargeForm(false);
    loadTransactions();
  }

  async function markAsSettled(receiptId: string) {
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('Помилка авторизації. Увійдіть знову.');
      return;
    }

    const orders = receiptOrders[receiptId] || [];
    const paidOrders = orders.filter(o => o.verified && o.payment_type === 'оплачено');

    let totalPartsPln = 0;
    let totalDeliveryPln = 0;

    paidOrders.forEach(order => {
      totalPartsPln += order.part_price || 0;
      totalDeliveryPln += order.delivery_cost || 0;
    });

    const totalAmount = totalPartsPln + totalDeliveryPln;

    const { error: txError } = await supabase
      .from('card_transactions')
      .insert({
        transaction_type: 'charge',
        amount: totalAmount,
        parts_amount: totalPartsPln,
        delivery_amount: totalDeliveryPln,
        description: `Нарахування за накладну №${receipt.receipt_number} (Запчастини: ${totalPartsPln.toFixed(2)} zł, Доставка: ${totalDeliveryPln.toFixed(2)} zł)`,
        transaction_date: new Date().toISOString().split('T')[0],
        receipt_id: receipt.id,
        created_by: user.id
      });

    if (txError) {
      showError('Помилка при створенні транзакції нарахування');
      console.error(txError);
      return;
    }

    const { error } = await supabase
      .from('active_receipts')
      .update({
        status: 'settled',
        settled_date: new Date().toISOString(),
        settlement_type: 'card',
        settled_by: user.id
      })
      .eq('id', receiptId);

    if (error) {
      showError('Помилка при позначенні як розраховано');
      return;
    }

    showSuccess('Накладну розраховано. Транзакцію додано в історію.');
    loadReceipts();
    loadTransactions();
  }

  async function returnToActive(receiptId: string) {
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return;

    const confirmed = await confirm(`Повернути накладну №${receipt.receipt_number} з розрахунку назад в активні?`);
    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from('active_receipts')
      .update({
        status: 'approved',
        settlement_date: null,
        settled_date: null,
        settlement_type: null
      })
      .eq('id', receiptId);

    if (error) {
      showError('Помилка при поверненні накладної');
      console.error(error);
      return;
    }

    const { data: existingCardTransactions } = await supabase
      .from('card_transactions')
      .select('*')
      .eq('receipt_id', receiptId)
      .eq('is_reversed', false);

    if (existingCardTransactions && existingCardTransactions.length > 0) {
      for (const tx of existingCardTransactions) {
        await supabase
          .from('card_transactions')
          .insert({
            transaction_type: tx.transaction_type === 'charge' ? 'payment' : 'charge',
            amount: tx.amount || 0,
            description: `Сторно: повернення в активні накладна №${receipt.receipt_number}`,
            transaction_date: new Date().toISOString().split('T')[0],
            receipt_id: receiptId,
            created_by: 'system'
          });

        await supabase
          .from('card_transactions')
          .update({ is_reversed: true })
          .eq('id', tx.id);
      }
    }

    const { data: receiptOrderLinks } = await supabase
      .from('receipt_orders')
      .select('order_id')
      .eq('receipt_id', receiptId);

    if (receiptOrderLinks && receiptOrderLinks.length > 0) {
      const orderIds = receiptOrderLinks.map(ro => ro.order_id);
      const { error: ordersError } = await supabase
        .from('orders')
        .update({ status: 'в активному прийомі' })
        .in('id', orderIds);

      if (ordersError) {
        console.error('Помилка при оновленні статусу замовлень:', ordersError);
      }
    }

    showSuccess('Накладну повернуто в активні');
    loadReceipts();
  }

  async function reverseTransaction(tx: CardTransaction) {
    if (tx.is_reversed) {
      showWarning('Ця транзакція вже сторнована');
      return;
    }

    const confirmed = await confirm(`Ви впевнені, що хочете сторнувати цю операцію?\n\nОпис: ${tx.description}\nСума: ${formatNumber(tx.amount)} zł\n\nТранзакція залишиться в історії з позначкою "сторновано".`);
    if (!confirmed) return;

    if (tx.receipt_id) {
      const { data: receipt } = await supabase
        .from('active_receipts')
        .select('*')
        .eq('id', tx.receipt_id)
        .maybeSingle();

      if (receipt) {
        if (receipt.status === 'settled') {
          await supabase
            .from('active_receipts')
            .update({
              status: 'sent_for_settlement',
              settled_date: null,
              settlement_type: null
            })
            .eq('id', tx.receipt_id);
        } else if (receipt.status === 'sent_for_settlement') {
          await supabase
            .from('active_receipts')
            .update({
              status: 'approved',
              settlement_date: null,
              settlement_type: null
            })
            .eq('id', tx.receipt_id);

          const { data: receiptOrderLinks } = await supabase
            .from('receipt_orders')
            .select('order_id')
            .eq('receipt_id', tx.receipt_id);

          if (receiptOrderLinks && receiptOrderLinks.length > 0) {
            const orderIds = receiptOrderLinks.map(ro => ro.order_id);
            await supabase
              .from('orders')
              .update({ status: 'в активному прийомі' })
              .in('id', orderIds);
          }
        }

        await supabase
          .from('card_transactions')
          .update({ is_reversed: true })
          .eq('receipt_id', tx.receipt_id)
          .eq('is_reversed', false);
      }
    }

    const { error } = await supabase
      .from('card_transactions')
      .update({
        is_reversed: true
      })
      .eq('id', tx.id);

    if (error) {
      showError('Помилка при сторнуванні транзакції');
      console.error(error);
      return;
    }

    showSuccess('Операцію успішно сторновано. Транзакція залишається в історії.');
    loadReceipts();
    loadTransactions();
  }

  const sentForSettlementReceipts = receipts.filter(r => r.status === 'sent_for_settlement');
  const settledReceipts = receipts.filter(r => r.status === 'settled');

  const handleExportCardSettlement = () => {
    const dataToExport = transactions.map(transaction => ({
      date: transaction.date,
      type: transaction.type === 'payment' ? 'Платіж' : 'Нарахування',
      amount_pln: transaction.amount_pln || 0,
      description: transaction.description || '',
      charge_type: transaction.charge_type === 'parts' ? 'Деталі' : 'Доставка',
      parts_balance_after: transaction.parts_balance_after || 0,
      delivery_balance_after: transaction.delivery_balance_after || 0,
      settled: transaction.settled ? 'Так' : 'Ні',
      is_reversed: transaction.is_reversed ? 'Так' : 'Ні'
    }));

    const headers = {
      date: 'Дата',
      type: 'Тип',
      amount_pln: 'Сума PLN',
      description: 'Опис',
      charge_type: 'Тип нарахування',
      parts_balance_after: 'Баланс деталей після',
      delivery_balance_after: 'Баланс доставки після',
      settled: 'Проведено',
      is_reversed: 'Скасовано'
    };

    exportToCSV(dataToExport, 'vzayemorozrahunok_kartky', headers);
  };

  return (
    <div className="h-full flex flex-col p-3 max-w-full overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Взаєморозрахунок по картках</h2>
        <div className="flex gap-2">
          <ExportButton onClick={handleExportCardSettlement} disabled={transactions.length === 0} />
          <button
            onClick={() => setShowChargeForm(!showChargeForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-rose-700 text-white rounded-lg hover:bg-rose-800 dark:bg-gradient-to-br dark:from-rose-900 dark:to-rose-800 dark:hover:from-rose-800 dark:hover:to-rose-700 transition-colors"
          >
            <TrendingUp size={16} />
            Нарахування
          </button>
          <button
            onClick={() => setShowPaymentForm(!showPaymentForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={16} />
            Платіж
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
          <div className="text-xs font-medium text-blue-600 mb-1">Баланс картки (PLN)</div>
          <div className={`text-xl font-bold ${balancePartsPln > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-green-600'}`}>
            {formatNumber(balancePartsPln)} zł
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">
            {balancePartsPln > 0 ? 'до сплати' : 'закрито'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
          <div className="text-xs font-medium text-gray-600 mb-1">Резерв</div>
          <div className="text-xl font-bold text-gray-400">
            {formatNumber(0)} zł
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            не використовується
          </div>
        </div>
      </div>

      {showChargeForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 mb-3">
          <h3 className="text-sm font-semibold mb-2">Нове нарахування</h3>
          <form onSubmit={handleChargeSubmit} className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Сума</label>
                <input
                  type="number"
                  step="0.01"
                  value={chargeData.amount}
                  onChange={(e) => setChargeData({ ...chargeData, amount: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Дата</label>
                <input
                  type="date"
                  value={chargeData.date}
                  onChange={(e) => setChargeData({ ...chargeData, date: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Причина нарахування *</label>
              <input
                type="text"
                value={chargeData.description}
                onChange={(e) => setChargeData({ ...chargeData, description: e.target.value })}
                placeholder="Вкажіть причину нарахування"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                Зберегти
              </button>
              <button type="button" onClick={() => setShowChargeForm(false)} className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400">
                Скасувати
              </button>
            </div>
          </form>
        </div>
      )}

      {showPaymentForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 mb-3">
          <h3 className="text-sm font-semibold mb-2">Новий платіж</h3>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Сума</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Дата</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Опис</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Опис платежу"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Зберегти
              </button>
              <button type="button" onClick={() => setShowPaymentForm(false)} className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400">
                Скасувати
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2.5">
          <h3 className="text-sm font-semibold text-amber-700 mb-2">На розрахунку ({sentForSettlementReceipts.length})</h3>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {sentForSettlementReceipts.map(receipt => {
              const orders = receiptOrders[receipt.id] || [];
              const paidOrders = orders.filter(o => o.verified && o.payment_type === 'оплачено');
              const totalPartPrice = paidOrders.reduce((sum, order) => sum + (order.part_price || 0), 0);
              const totalDeliveryCost = paidOrders.reduce((sum, order) => sum + (order.delivery_cost || 0), 0);
              const totalPositions = paidOrders.length;

              return (
                <div key={receipt.id} className="p-2 bg-amber-50 rounded border border-amber-200">
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <div className="text-sm font-medium">№{receipt.receipt_number}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">{receipt.receipt_date}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">Позицій: {totalPositions}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => returnToActive(receipt.id)}
                        className="px-2 py-1 bg-gradient-to-r from-orange-600 to-yellow-500 text-white rounded text-[10px] hover:from-orange-700 hover:to-yellow-600 dark:from-orange-700 dark:to-yellow-600 dark:hover:from-orange-800 dark:hover:to-yellow-700 transition flex items-center gap-0.5"
                        title="Повернути в активні"
                      >
                        <ArrowLeft size={12} />
                        Повернути
                      </button>
                      <button
                        onClick={() => markAsSettled(receipt.id)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700 transition flex items-center gap-0.5"
                      >
                        <CheckCircle2 size={12} />
                        Розрахувати
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                      <div className="text-gray-500 dark:text-gray-400 text-[10px]">Запчастини</div>
                      <div className="font-semibold text-blue-700">{formatNumber(totalPartPrice)} zł</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                      <div className="text-gray-500 dark:text-gray-400 text-[10px]">Доставка</div>
                      <div className="font-semibold text-blue-700">{formatNumber(totalDeliveryCost)} zł</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                      <div className="text-gray-500 dark:text-gray-400 text-[10px]">Всього</div>
                      <div className="font-bold text-amber-700">{formatNumber(totalPartPrice + totalDeliveryCost)} zł</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {sentForSettlementReceipts.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">Немає накладних</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2.5">
          <h3 className="text-sm font-semibold text-green-700 mb-2">Розраховано ({settledReceipts.length})</h3>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {settledReceipts.map(receipt => {
              const orders = receiptOrders[receipt.id] || [];
              const paidOrders = orders.filter(o => o.verified && o.payment_type === 'оплачено');
              const totalPartPrice = paidOrders.reduce((sum, order) => sum + (order.part_price || 0), 0);
              const totalDeliveryCost = paidOrders.reduce((sum, order) => sum + (order.delivery_cost || 0), 0);

              return (
                <div key={receipt.id} className="p-1.5 bg-green-50 rounded border border-green-200">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="font-medium text-xs">№{receipt.receipt_number}</div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-300">
                        {formatNumber(totalPartPrice + totalDeliveryCost)} zł
                      </div>
                      {receipt.settled_date && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          {new Date(receipt.settled_date).toLocaleDateString('uk-UA')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          const confirmed = await confirm(`Повернути накладну №${receipt.receipt_number} назад в "на розрахунку"?`);
                          if (confirmed) {
                            await supabase
                              .from('transactions')
                              .update({ is_reversed: true })
                              .eq('receipt_id', receipt.id)
                              .eq('is_reversed', false);

                            await supabase
                              .from('card_transactions')
                              .update({ is_reversed: true })
                              .eq('receipt_id', receipt.id)
                              .eq('is_reversed', false);

                            await supabase
                              .from('active_receipts')
                              .update({
                                status: 'sent_for_settlement',
                                settled_date: null,
                                settlement_type: null
                              })
                              .eq('id', receipt.id);
                            loadReceipts();
                            loadTransactions();
                          }
                        }}
                        className="p-0.5 hover:bg-orange-100 rounded transition"
                        title="Повернути в на розрахунку"
                      >
                        <Undo2 size={12} className="text-orange-600 dark:text-orange-400" />
                      </button>
                      <CheckCircle2 size={16} className="text-green-600" />
                    </div>
                  </div>
                </div>
              );
            })}
            {settledReceipts.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">Немає накладних</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b sticky top-0">
          Історія транзакцій
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-8">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 border-b">Дата</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 border-b">Тип</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 border-b">Опис</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 border-b">Сума (zł)</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 border-b">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className={`${tx.is_reversed ? 'bg-rose-50 dark:bg-rose-950/20 opacity-50' : 'hover:bg-gray-50'}`}
              >
                <td className={`px-3 py-2 text-xs ${tx.is_reversed ? 'text-rose-400 line-through' : 'text-gray-900'}`}>
                  {new Date(tx.transaction_date).toLocaleDateString('uk-UA')}
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="flex items-center gap-1">
                    {tx.is_reversed ? (
                      <>
                        <XCircle size={14} className="text-rose-400" />
                        <span className="text-rose-400 font-medium">Сторновано</span>
                      </>
                    ) : tx.transaction_type === 'charge' ? (
                      <>
                        <TrendingUp size={14} className="text-rose-500" />
                        <span className="text-rose-700 dark:text-rose-400 font-medium">Нарахування</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown size={14} className="text-green-500" />
                        <span className="text-green-600 font-medium">Платіж</span>
                      </>
                    )}
                  </div>
                </td>
                <td className={`px-3 py-2 text-xs ${tx.is_reversed ? 'text-rose-400 line-through' : 'text-gray-900'}`}>
                  {tx.description}
                </td>
                <td className="px-3 py-2 text-xs text-right">
                  <span className={tx.is_reversed ? 'text-rose-400 line-through' : tx.transaction_type === 'charge' ? 'text-rose-700 dark:text-rose-400 font-medium' : 'text-green-600 font-medium'}>
                    {tx.transaction_type === 'charge' ? '+' : '-'}{formatNumber(Math.abs(tx.amount || 0))}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {tx.is_reversed ? (
                    <span className="text-[10px] text-rose-400 italic">
                      Сторновано
                    </span>
                  ) : (
                    <button
                      onClick={() => reverseTransaction(tx)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 transition text-[10px]"
                      title="Сторнувати операцію"
                    >
                      <XCircle size={12} />
                      Сторнувати
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {transactions.length > 0 && (
            <tfoot className="bg-gray-100 dark:bg-gray-700 sticky bottom-0">
              <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                <td colSpan={3} className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200">
                  Підсумок:
                </td>
                <td className="px-3 py-2 text-xs text-right font-bold">
                  {(() => {
                    const total = transactions
                      .filter(tx => !tx.is_reversed)
                      .reduce((sum, tx) => {
                        const amount = tx.amount || 0;
                        return sum + (tx.transaction_type === 'charge' ? amount : -amount);
                      }, 0);
                    return (
                      <span className={total > 0 ? 'text-rose-700 dark:text-rose-400' : total < 0 ? 'text-green-600' : 'text-gray-700 dark:text-gray-200'}>
                        {formatNumber(total)} zł
                      </span>
                    );
                  })()}
                </td>
                <td className="px-3 py-2"></td>
              </tr>
            </tfoot>
          )}
        </table>

        {transactions.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            <p>Немає транзакцій</p>
          </div>
        )}
      </div>
    </div>
  );
}
