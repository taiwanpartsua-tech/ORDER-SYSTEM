import { useState, useEffect } from 'react';
import { supabase, Transaction, ActiveReceipt, Order } from '../lib/supabase';
import { Plus, TrendingDown, TrendingUp, CheckCircle2, XCircle, Undo2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function MutualSettlement() {
  const { showSuccess, showError, showWarning, confirm } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipts, setReceipts] = useState<ActiveReceipt[]>([]);
  const [receiptOrders, setReceiptOrders] = useState<Record<string, Order[]>>({});
  const [balanceReceiptPln, setBalanceReceiptPln] = useState(0);
  const [balanceTransportUsd, setBalanceTransportUsd] = useState(0);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [formData, setFormData] = useState({
    balanceType: 'receipt',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [chargeData, setChargeData] = useState({
    balanceType: 'receipt',
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
      .from('transactions')
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
      .or('settlement_type.eq.cash,settlement_type.is.null')
      .order('settlement_date', { ascending: false });

    if (data) {
      const filteredData = data.filter(r => {
        if (r.status === 'sent_for_settlement') return true;
        if (r.status === 'settled') return r.settlement_type === 'cash';
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

  function calculateBalance(txns: Transaction[]) {
    let receiptPln = 0;
    let transportUsd = 0;

    receipts.filter(r => r.status === 'sent_for_settlement' || r.status === 'settled').forEach(receipt => {
      receiptPln += (receipt.receipt_cost_pln || 0) + (receipt.cash_on_delivery_pln || 0);
      transportUsd += receipt.transport_cost_usd || 0;
    });

    txns.forEach(tx => {
      if (tx.is_reversed) return;
      if (tx.receipt_id) return;

      if (tx.transaction_type === 'debit') {
        receiptPln += tx.cash_on_delivery_pln || 0;
        transportUsd += tx.transport_cost_usd || 0;
      } else {
        receiptPln -= tx.cash_on_delivery_pln || 0;
        transportUsd -= tx.transport_cost_usd || 0;
      }
    });

    setBalanceReceiptPln(receiptPln);
    setBalanceTransportUsd(transportUsd);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      showWarning('Введіть коректну суму');
      return;
    }

    const transactionData: any = {
      transaction_type: 'credit',
      amount_pln: 0,
      amount_usd: 0,
      cash_on_delivery_pln: 0,
      transport_cost_usd: 0,
      parts_delivery_pln: 0,
      description: formData.description || 'Платіж',
      transaction_date: formData.date,
      created_by: 'user'
    };

    if (formData.balanceType === 'receipt') {
      transactionData.cash_on_delivery_pln = amount;
    } else if (formData.balanceType === 'transport') {
      transactionData.transport_cost_usd = amount;
    }

    const { error } = await supabase
      .from('transactions')
      .insert(transactionData);

    if (error) {
      console.error('Error adding payment:', error);
      showError('Помилка при додаванні платежу');
      return;
    }

    showSuccess('Платіж успішно додано');
    setFormData({
      balanceType: 'receipt',
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
      transaction_type: 'debit',
      amount_pln: 0,
      amount_usd: 0,
      cash_on_delivery_pln: 0,
      transport_cost_usd: 0,
      parts_delivery_pln: 0,
      description: chargeData.description,
      transaction_date: chargeData.date,
      created_by: 'user'
    };

    if (chargeData.balanceType === 'receipt') {
      transactionData.cash_on_delivery_pln = amount;
      transactionData.amount_pln = amount;
    } else if (chargeData.balanceType === 'transport') {
      transactionData.transport_cost_usd = amount;
      transactionData.amount_usd = amount;
    }

    const { error } = await supabase
      .from('transactions')
      .insert(transactionData);

    if (error) {
      console.error('Error adding charge:', error);
      showError('Помилка при додаванні нарахування');
      return;
    }

    showSuccess('Нарахування успішно додано');
    setChargeData({
      balanceType: 'receipt',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowChargeForm(false);
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

    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('receipt_id', receiptId)
      .eq('is_reversed', false);

    if (existingTransactions && existingTransactions.length > 0) {
      for (const tx of existingTransactions) {
        await supabase
          .from('transactions')
          .insert({
            transaction_type: tx.transaction_type === 'debit' ? 'credit' : 'debit',
            amount_pln: tx.amount_pln || 0,
            amount_usd: tx.amount_usd || 0,
            cash_on_delivery_pln: tx.cash_on_delivery_pln || 0,
            transport_cost_usd: tx.transport_cost_usd || 0,
            parts_delivery_pln: tx.parts_delivery_pln || 0,
            description: `Сторно: повернення в активні накладна №${receipt.receipt_number}`,
            transaction_date: new Date().toISOString().split('T')[0],
            receipt_id: receiptId,
            created_by: 'system'
          });

        await supabase
          .from('transactions')
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

  async function markAsSettled(receiptId: string) {
    const receipt = receipts.find(r => r.id === receiptId);
    if (!receipt) return;

    const { error } = await supabase
      .from('active_receipts')
      .update({
        status: 'settled',
        settled_date: new Date().toISOString(),
        settlement_type: 'cash'
      })
      .eq('id', receiptId);

    if (error) {
      showError('Помилка при позначенні як розраховано');
      return;
    }

    showSuccess('Накладну розраховано.');
    loadReceipts();
    loadTransactions();
  }

  async function reverseTransaction(tx: Transaction) {
    if (tx.is_reversed) {
      showWarning('Ця транзакція вже сторнована');
      return;
    }

    const totalPln = tx.cash_on_delivery_pln || 0;
    const totalUsd = tx.transport_cost_usd || 0;
    const confirmed = await confirm(`Ви впевнені, що хочете сторнувати цю операцію?\n\nОпис: ${tx.description}\nСума: ${formatNumber(totalPln)} zl / ${formatNumber(totalUsd)} $\n\nТранзакція залишиться в історії з позначкою "сторновано".`);
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

        const { data: supplierTx } = await supabase
          .from('supplier_transactions')
          .select('*')
          .eq('receipt_id', tx.receipt_id)
          .maybeSingle();

        if (supplierTx) {
          await supabase
            .from('supplier_transactions')
            .update({ is_reversed: true })
            .eq('id', supplierTx.id);
        }
      }
    }

    const { error } = await supabase
      .from('transactions')
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

  return (
    <div className="h-full flex flex-col p-3 max-w-full overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Взаєморозрахунок</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowChargeForm(!showChargeForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
          <div className="text-xs font-medium text-blue-600 mb-1">Прийом і побраня (PLN)</div>
          <div className={`text-xl font-bold ${balanceReceiptPln > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatNumber(balanceReceiptPln)} zł
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">
            {balanceReceiptPln > 0 ? 'до сплати' : 'закрито'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
          <div className="text-xs font-medium text-green-600 mb-1">Перевезення (USD)</div>
          <div className={`text-xl font-bold ${balanceTransportUsd > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatNumber(balanceTransportUsd)} $
          </div>
          <div className="text-[10px] text-green-600 mt-0.5">
            {balanceTransportUsd > 0 ? 'до сплати' : 'закрито'}
          </div>
        </div>
      </div>

      {showChargeForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 mb-3">
          <h3 className="text-sm font-semibold mb-2">Нове нарахування</h3>
          <form onSubmit={handleChargeSubmit} className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Тип балансу</label>
                <select
                  value={chargeData.balanceType}
                  onChange={(e) => setChargeData({ ...chargeData, balanceType: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="receipt">Прийом і побраня</option>
                  <option value="transport">Перевезення</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Сума</label>
                <input
                  type="number"
                  step="0.01"
                  value={chargeData.amount}
                  onChange={(e) => setChargeData({ ...chargeData, amount: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Дата</label>
                <input
                  type="date"
                  value={chargeData.date}
                  onChange={(e) => setChargeData({ ...chargeData, date: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500"
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
                className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-500"
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Тип балансу</label>
                <select
                  value={formData.balanceType}
                  onChange={(e) => setFormData({ ...formData, balanceType: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="receipt">Прийом і побраня</option>
                  <option value="transport">Перевезення</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Сума</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Дата</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
                className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
              const totalPositions = orders.length;
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
                        className="px-2 py-1 bg-orange-600 text-white rounded text-[10px] hover:bg-orange-700 transition flex items-center gap-0.5"
                        title="Повернути в активні"
                      >
                        <Undo2 size={12} />
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
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                      <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-[10px]">Прийом</div>
                      <div className="font-semibold text-blue-700">{formatNumber(receipt.receipt_cost_pln)} zł</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                      <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-[10px]">Побране</div>
                      <div className="font-semibold text-blue-700">{formatNumber(receipt.cash_on_delivery_pln)} zł</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                      <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-[10px]">Перевезення</div>
                      <div className="font-semibold text-green-700">{formatNumber(receipt.transport_cost_usd)} $</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                      <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-[10px]">Всього</div>
                      <div className="font-bold text-amber-700">{formatNumber((receipt.receipt_cost_pln || 0) + (receipt.cash_on_delivery_pln || 0))} zł</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {sentForSettlementReceipts.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 text-center py-3">Немає накладних</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2.5">
          <h3 className="text-sm font-semibold text-green-700 mb-2">Розраховано ({settledReceipts.length})</h3>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {settledReceipts.map(receipt => (
              <div key={receipt.id} className="p-1.5 bg-green-50 rounded border border-green-200">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="font-medium text-xs">№{receipt.receipt_number}</div>
                    <div className="text-[10px] text-gray-600 dark:text-gray-300">
                      {formatNumber((receipt.receipt_cost_pln || 0) + (receipt.cash_on_delivery_pln || 0))} zł | {formatNumber(receipt.transport_cost_usd)} $
                    </div>
                    {receipt.settled_date && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500">
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
                      <Undo2 size={12} className="text-orange-600" />
                    </button>
                    <CheckCircle2 size={16} className="text-green-600" />
                  </div>
                </div>
              </div>
            ))}
            {settledReceipts.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 text-center py-3">Немає накладних</p>
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
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 border-b">Злоті (zł)</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 border-b">Долари ($)</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 border-b">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className={`${tx.is_reversed ? 'bg-red-50 opacity-50' : 'hover:bg-gray-50'}`}
              >
                <td className={`px-3 py-2 text-xs ${tx.is_reversed ? 'text-red-400 line-through' : 'text-gray-900'}`}>
                  {new Date(tx.transaction_date).toLocaleDateString('uk-UA')}
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="flex items-center gap-1">
                    {tx.is_reversed ? (
                      <>
                        <XCircle size={14} className="text-red-400" />
                        <span className="text-red-400 font-medium">Сторновано</span>
                      </>
                    ) : tx.transaction_type === 'debit' ? (
                      <>
                        <TrendingUp size={14} className="text-red-500" />
                        <span className="text-red-600 font-medium">Нарахування</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown size={14} className="text-green-500" />
                        <span className="text-green-600 font-medium">Платіж</span>
                      </>
                    )}
                  </div>
                </td>
                <td className={`px-3 py-2 text-xs ${tx.is_reversed ? 'text-red-400 line-through' : 'text-gray-900'}`}>
                  {tx.description}
                </td>
                <td className="px-3 py-2 text-xs text-right">
                  {(tx.cash_on_delivery_pln || 0) !== 0 && (
                    <span className={tx.is_reversed ? 'text-red-400 line-through' : tx.transaction_type === 'debit' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {tx.transaction_type === 'debit' ? '+' : '-'}{formatNumber(Math.abs(tx.cash_on_delivery_pln || 0))}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-right">
                  {(tx.transport_cost_usd || 0) !== 0 && (
                    <span className={tx.is_reversed ? 'text-red-400 line-through' : tx.transaction_type === 'debit' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {tx.transaction_type === 'debit' ? '+' : '-'}{formatNumber(Math.abs(tx.transport_cost_usd || 0))}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {tx.is_reversed ? (
                    <span className="text-[10px] text-red-400 italic">
                      Сторновано
                    </span>
                  ) : (
                    <button
                      onClick={() => reverseTransaction(tx)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-[10px]"
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
                    const totalPln = transactions
                      .filter(tx => !tx.is_reversed)
                      .reduce((sum, tx) => {
                        const amount = tx.cash_on_delivery_pln || 0;
                        return sum + (tx.transaction_type === 'debit' ? amount : -amount);
                      }, 0);
                    return (
                      <span className={totalPln > 0 ? 'text-red-600' : totalPln < 0 ? 'text-green-600' : 'text-gray-700 dark:text-gray-200'}>
                        {formatNumber(totalPln)} zł
                      </span>
                    );
                  })()}
                </td>
                <td className="px-3 py-2 text-xs text-right font-bold">
                  {(() => {
                    const totalUsd = transactions
                      .filter(tx => !tx.is_reversed)
                      .reduce((sum, tx) => {
                        const amount = tx.transport_cost_usd || 0;
                        return sum + (tx.transaction_type === 'debit' ? amount : -amount);
                      }, 0);
                    return (
                      <span className={totalUsd > 0 ? 'text-red-600' : totalUsd < 0 ? 'text-green-600' : 'text-gray-700 dark:text-gray-200'}>
                        {formatNumber(totalUsd)} $
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
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">
            <p>Немає транзакцій</p>
          </div>
        )}
      </div>
    </div>
  );
}
