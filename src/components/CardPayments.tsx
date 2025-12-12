import { useState, useEffect } from 'react';
import { supabase, Supplier, CardTransaction, Order, ActiveReceipt } from '../lib/supabase';
import { CreditCard, Plus, Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface ReceiptSummary {
  receipt: ActiveReceipt;
  totalPartPrice: number;
  totalDeliveryCost: number;
}

export default function CardPayments() {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [pendingCardOrders, setPendingCardOrders] = useState<Order[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<ReceiptSummary[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDescription, setPaymentDescription] = useState('');

  const [showChargeForm, setShowChargeForm] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [chargeDescription, setChargeDescription] = useState('');

  const [calculatedBalance, setCalculatedBalance] = useState(0);

  function formatNumber(num: number): string {
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (supplier) {
      calculateBalance();
    }
  }, [supplier, pendingCardOrders, pendingReceipts]);

  function calculateBalance() {
    if (!supplier) return;

    let balance = (supplier.balance_parts_pln || 0) + (supplier.balance_delivery_pln || 0);

    pendingCardOrders.forEach(order => {
      balance += order.part_price + order.delivery_cost;
    });

    pendingReceipts.forEach(summary => {
      if (!summary.receipt.settled_date) {
        balance += summary.totalPartPrice + summary.totalDeliveryCost;
      }
    });

    setCalculatedBalance(balance);
  }

  async function loadData() {
    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at')
      .limit(1)
      .maybeSingle();

    if (supplierData) {
      setSupplier(supplierData);
    }

    const { data: transactionsData } = await supabase
      .from('card_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (transactionsData) {
      setTransactions(transactionsData);
    }

    const { data: pendingCardOrdersData } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_type', 'оплачено')
      .eq('verified', false)
      .order('order_date', { ascending: false });

    if (pendingCardOrdersData) {
      setPendingCardOrders(pendingCardOrdersData);
    }

    const { data: receiptsForSettlement } = await supabase
      .from('active_receipts')
      .select('*')
      .eq('status', 'sent_for_settlement')
      .order('settlement_date', { ascending: false });

    if (receiptsForSettlement && receiptsForSettlement.length > 0) {
      const receiptSummaries: ReceiptSummary[] = [];

      for (const receipt of receiptsForSettlement) {
        const { data: receiptOrderLinks } = await supabase
          .from('receipt_orders')
          .select('order_id')
          .eq('receipt_id', receipt.id);

        if (receiptOrderLinks && receiptOrderLinks.length > 0) {
          const orderIds = receiptOrderLinks.map(ro => ro.order_id);
          const { data: ordersData } = await supabase
            .from('orders')
            .select('*')
            .in('id', orderIds)
            .eq('verified', true)
            .eq('payment_type', 'оплачено');

          if (ordersData && ordersData.length > 0) {
            const totalPartPrice = ordersData.reduce((sum, order) => sum + order.part_price, 0);
            const totalDeliveryCost = ordersData.reduce((sum, order) => sum + order.delivery_cost, 0);

            receiptSummaries.push({
              receipt,
              totalPartPrice,
              totalDeliveryCost
            });
          }
        }
      }

      setPendingReceipts(receiptSummaries);
    } else {
      setPendingReceipts([]);
    }
  }

  async function markOrderAsPaid(orderId: string) {
    if (!supplier) {
      alert('Помилка: постачальник не знайдений');
      return;
    }

    const order = pendingCardOrders.find(o => o.id === orderId);
    if (!order) {
      alert('Помилка: замовлення не знайдене');
      return;
    }

    const totalAmount = order.part_price + order.delivery_cost;

    const { error: transactionError } = await supabase.from('card_transactions').insert([{
      transaction_type: 'payment',
      amount: totalAmount,
      description: `Оплата замовлення №${order.order_number}`,
      transaction_date: new Date().toISOString().split('T')[0],
      order_id: orderId
    }]);

    if (transactionError) {
      alert('Помилка створення транзакції');
      console.error(transactionError);
      return;
    }

    const newPartsBalance = Number(supplier.balance_parts_pln || 0) + Number(order.part_price);
    const newDeliveryBalance = Number(supplier.balance_delivery_pln || 0) + Number(order.delivery_cost);
    const newTotalPln = Number(supplier.balance_pln || 0) + Number(totalAmount);

    const { error: supplierError } = await supabase
      .from('suppliers')
      .update({
        balance_parts_pln: newPartsBalance,
        balance_delivery_pln: newDeliveryBalance,
        balance_pln: newTotalPln
      })
      .eq('id', supplier.id);

    if (supplierError) {
      alert('Помилка оновлення балансу');
      console.error(supplierError);
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ verified: true })
      .eq('id', orderId);

    if (error) {
      alert('Помилка оновлення статусу замовлення');
      console.error(error);
      return;
    }

    alert('Замовлення успішно оплачено!');
    loadData();
  }

  async function handlePayment() {
    if (!supplier) {
      alert('Помилка: постачальник не знайдений');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Введіть коректну суму');
      return;
    }

    if (amount > calculatedBalance) {
      const confirmed = confirm(
        `Сума оплати (${formatNumber(amount)} zł) перевищує баланс (${formatNumber(calculatedBalance)} zł). Продовжити?`
      );
      if (!confirmed) return;
    }

    const { error: transactionError } = await supabase.from('card_transactions').insert([{
      transaction_type: 'payment',
      amount: amount,
      description: paymentDescription || 'Оплата карткою',
      transaction_date: paymentDate
    }]);

    if (transactionError) {
      alert('Помилка створення транзакції');
      console.error(transactionError);
      return;
    }

    const newPartsBalance = (supplier.balance_parts_pln || 0) - amount;
    const newTotalPln = (supplier.balance_pln || 0) - amount;

    const { error: supplierError } = await supabase
      .from('suppliers')
      .update({
        balance_parts_pln: newPartsBalance,
        balance_pln: newTotalPln
      })
      .eq('id', supplier.id);

    if (supplierError) {
      alert('Помилка оновлення балансу');
      console.error(supplierError);
      return;
    }

    setPaymentAmount('');
    setPaymentDescription('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setShowPaymentForm(false);
    alert('Оплату успішно проведено!');
    loadData();
  }

  async function handleCharge() {
    if (!supplier) {
      alert('Помилка: постачальник не знайдений');
      return;
    }

    const amount = parseFloat(chargeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Введіть коректну суму');
      return;
    }

    const { error: transactionError } = await supabase.from('card_transactions').insert([{
      transaction_type: 'refund',
      amount: amount,
      description: chargeDescription || 'Нарахування по картці',
      transaction_date: chargeDate
    }]);

    if (transactionError) {
      alert('Помилка створення транзакції');
      console.error(transactionError);
      return;
    }

    const newPartsBalance = (supplier.balance_parts_pln || 0) + amount;
    const newTotalPln = (supplier.balance_pln || 0) + amount;

    const { error: supplierError } = await supabase
      .from('suppliers')
      .update({
        balance_parts_pln: newPartsBalance,
        balance_pln: newTotalPln
      })
      .eq('id', supplier.id);

    if (supplierError) {
      alert('Помилка оновлення балансу');
      console.error(supplierError);
      return;
    }

    setChargeAmount('');
    setChargeDescription('');
    setChargeDate(new Date().toISOString().split('T')[0]);
    setShowChargeForm(false);
    alert('Нарахування успішно проведено!');
    loadData();
  }

  async function settleReceipt(summary: ReceiptSummary) {
    if (!supplier) {
      alert('Помилка: постачальник не знайдений');
      return;
    }

    const totalAmount = summary.totalPartPrice + summary.totalDeliveryCost;

    const { error: transactionError } = await supabase.from('card_transactions').insert([{
      transaction_type: 'payment',
      amount: totalAmount,
      description: `Розрахунок за накладну №${summary.receipt.receipt_number}`,
      transaction_date: new Date().toISOString().split('T')[0],
      receipt_id: summary.receipt.id
    }]);

    if (transactionError) {
      alert('Помилка створення транзакції');
      console.error(transactionError);
      return;
    }

    const newPartsBalance = Number(supplier.balance_parts_pln || 0) + Number(summary.totalPartPrice);
    const newDeliveryBalance = Number(supplier.balance_delivery_pln || 0) + Number(summary.totalDeliveryCost);
    const newTotalPln = Number(supplier.balance_pln || 0) + Number(totalAmount);

    const { error: supplierError } = await supabase
      .from('suppliers')
      .update({
        balance_parts_pln: newPartsBalance,
        balance_delivery_pln: newDeliveryBalance,
        balance_pln: newTotalPln
      })
      .eq('id', supplier.id);

    if (supplierError) {
      alert('Помилка оновлення балансу');
      console.error(supplierError);
      return;
    }

    const { error: receiptError } = await supabase
      .from('active_receipts')
      .update({
        settled_date: new Date().toISOString()
      })
      .eq('id', summary.receipt.id);

    if (receiptError) {
      alert('Помилка оновлення статусу накладної');
      console.error(receiptError);
      return;
    }

    alert('Накладну успішно розраховано!');
    loadData();
  }

  async function reverseTransaction(tx: CardTransaction) {
    const typeText = tx.transaction_type === 'payment' ? 'оплату' : 'повернення';
    const confirmed = confirm(`Ви впевнені, що хочете сторнувати цю операцію (${typeText})?\n\nОпис: ${tx.description}\nСума: ${formatNumber(tx.amount)} zł\n\nЦя дія незворотна!`);
    if (!confirmed) return;

    if (!supplier) {
      alert('Помилка: постачальник не знайдений');
      return;
    }

    if (tx.order_id) {
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', tx.order_id)
        .maybeSingle();

      if (order) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({ verified: false })
          .eq('id', tx.order_id);

        if (orderError) {
          console.error('Помилка оновлення статусу замовлення:', orderError);
        }

        const newPartsBalance = Number(supplier.balance_parts_pln || 0) - Number(order.part_price);
        const newDeliveryBalance = Number(supplier.balance_delivery_pln || 0) - Number(order.delivery_cost);
        const newTotalPln = Number(supplier.balance_pln || 0) - Number(order.part_price + order.delivery_cost);

        const { error: supplierError } = await supabase
          .from('suppliers')
          .update({
            balance_parts_pln: newPartsBalance,
            balance_delivery_pln: newDeliveryBalance,
            balance_pln: newTotalPln
          })
          .eq('id', supplier.id);

        if (supplierError) {
          console.error('Помилка оновлення балансу:', supplierError);
        }
      }
    } else if (tx.receipt_id) {
      const { data: receipt } = await supabase
        .from('active_receipts')
        .select('*')
        .eq('id', tx.receipt_id)
        .maybeSingle();

      if (receipt && receipt.settled_date) {
        const { error: receiptError } = await supabase
          .from('active_receipts')
          .update({
            settled_date: null
          })
          .eq('id', tx.receipt_id);

        if (receiptError) {
          console.error('Помилка оновлення статусу накладної:', receiptError);
        }

        const { data: receiptOrderLinks } = await supabase
          .from('receipt_orders')
          .select('order_id')
          .eq('receipt_id', receipt.id);

        if (receiptOrderLinks && receiptOrderLinks.length > 0) {
          const orderIds = receiptOrderLinks.map(ro => ro.order_id);
          const { data: ordersData } = await supabase
            .from('orders')
            .select('*')
            .in('id', orderIds)
            .eq('verified', true)
            .eq('payment_type', 'оплачено');

          if (ordersData && ordersData.length > 0) {
            const totalPartPrice = ordersData.reduce((sum, order) => sum + order.part_price, 0);
            const totalDeliveryCost = ordersData.reduce((sum, order) => sum + order.delivery_cost, 0);

            const newPartsBalance = Number(supplier.balance_parts_pln || 0) - Number(totalPartPrice);
            const newDeliveryBalance = Number(supplier.balance_delivery_pln || 0) - Number(totalDeliveryCost);
            const newTotalPln = Number(supplier.balance_pln || 0) - Number(totalPartPrice + totalDeliveryCost);

            const { error: supplierError } = await supabase
              .from('suppliers')
              .update({
                balance_parts_pln: newPartsBalance,
                balance_delivery_pln: newDeliveryBalance,
                balance_pln: newTotalPln
              })
              .eq('id', supplier.id);

            if (supplierError) {
              console.error('Помилка оновлення балансу:', supplierError);
            }
          }
        }
      }
    } else {
      const amountChange = tx.transaction_type === 'payment' ? tx.amount : -tx.amount;
      const newTotalPln = (supplier.balance_pln || 0) + amountChange;
      const newPartsBalance = (supplier.balance_parts_pln || 0) + amountChange;

      const { error: supplierError } = await supabase
        .from('suppliers')
        .update({
          balance_parts_pln: newPartsBalance,
          balance_pln: newTotalPln
        })
        .eq('id', supplier.id);

      if (supplierError) {
        alert('Помилка оновлення балансу постачальника');
        console.error(supplierError);
        return;
      }
    }

    const { error: deleteError } = await supabase
      .from('card_transactions')
      .delete()
      .eq('id', tx.id);

    if (deleteError) {
      alert('Помилка при сторнуванні транзакції');
      console.error(deleteError);
      return;
    }

    alert('Операцію успішно сторновано');
    loadData();
  }

  return (
    <div className="h-full flex flex-col p-4 max-w-[98%] mx-auto">
      <div className="flex-1 overflow-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Розрахунки по картам</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Оплата за запчастини та доставку</p>
              </div>
              <CreditCard size={40} className="text-green-600" />
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-8 text-white shadow-lg">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-sm opacity-90 mb-2">Баланс до оплати</div>
                  <div className="text-5xl font-bold">{formatNumber(calculatedBalance)} zł</div>
                  <div className="text-sm opacity-90 mt-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-white dark:bg-gray-800 rounded-full"></span>
                      Запчастини: {formatNumber(supplier?.balance_parts_pln || 0)} zł
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-white dark:bg-gray-800 rounded-full"></span>
                      Доставка: {formatNumber(supplier?.balance_delivery_pln || 0)} zł
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="bg-white dark:bg-gray-800 text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition flex items-center gap-2 shadow-md"
                  >
                    <Plus size={20} />
                    Провести оплату
                  </button>
                  <button
                    onClick={() => setShowChargeForm(!showChargeForm)}
                    className="bg-white dark:bg-gray-800 text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition flex items-center gap-2 shadow-md"
                  >
                    <Plus size={20} />
                    Провести нарахування
                  </button>
                </div>
              </div>
            </div>

            {showPaymentForm && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border-2 border-green-200">
                <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Нова оплата</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Сума (zł) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Дата оплати *
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Опис
                    </label>
                    <input
                      type="text"
                      value={paymentDescription}
                      onChange={(e) => setPaymentDescription(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Коментар до оплати"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handlePayment}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Провести оплату
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentForm(false);
                      setPaymentAmount('');
                      setPaymentDescription('');
                      setPaymentDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="px-6 py-2 bg-gray-300 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 transition font-medium"
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}

            {showChargeForm && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border-2 border-red-200">
                <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Нове нарахування</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Сума (zł) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Дата нарахування *
                    </label>
                    <input
                      type="date"
                      value={chargeDate}
                      onChange={(e) => setChargeDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Опис
                    </label>
                    <input
                      type="text"
                      value={chargeDescription}
                      onChange={(e) => setChargeDescription(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Коментар до нарахування"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleCharge}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    Провести нарахування
                  </button>
                  <button
                    onClick={() => {
                      setShowChargeForm(false);
                      setChargeAmount('');
                      setChargeDescription('');
                      setChargeDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="px-6 py-2 bg-gray-300 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 transition font-medium"
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2.5">
          <h3 className="text-sm font-semibold text-amber-700 mb-2">На розрахунку ({pendingCardOrders.length + pendingReceipts.length})</h3>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {pendingCardOrders.map(order => (
                <div key={order.id} className="p-2 bg-amber-50 rounded border border-amber-200">
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <div className="text-sm font-medium">№{order.order_number}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">{order.order_date}</div>
                      {order.title && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{order.title}</div>
                      )}
                    </div>
                    <button
                      onClick={() => markOrderAsPaid(order.id)}
                      className="px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700 transition flex items-center gap-0.5"
                    >
                      <CheckCircle2 size={12} />
                      ОК
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                      <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-[10px]">Запчастини</div>
                      <div className="font-semibold text-blue-700">{formatNumber(order.part_price)} zł</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                      <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-[10px]">Доставка</div>
                      <div className="font-semibold text-blue-700">{formatNumber(order.delivery_cost)} zł</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                      <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-[10px]">Всього</div>
                      <div className="font-bold text-amber-700">{formatNumber(order.total_cost)} zł</div>
                    </div>
                  </div>
                </div>
              ))}
              {pendingReceipts.map(summary => {
                const isConfirmed = !!summary.receipt.settled_date;
                return (
                  <div
                    key={summary.receipt.id}
                    className={`p-2 rounded border ${
                      isConfirmed
                        ? 'bg-green-50 border-green-300'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <div className="text-sm font-medium flex items-center gap-1">
                          №{summary.receipt.receipt_number}
                          {isConfirmed && (
                            <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded">
                              Підтверджено
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {summary.receipt.settlement_date ? new Date(summary.receipt.settlement_date).toLocaleDateString('uk-UA') : ''}
                        </div>
                      </div>
                      {!isConfirmed && (
                        <button
                          onClick={() => settleReceipt(summary)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700 transition flex items-center gap-0.5"
                        >
                          <CheckCircle2 size={12} />
                          ОК
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                        <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-[10px]">Запчастини</div>
                        <div className="font-semibold text-blue-700">{formatNumber(summary.totalPartPrice)} zł</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                        <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-[10px]">Доставка</div>
                        <div className="font-semibold text-blue-700">{formatNumber(summary.totalDeliveryCost)} zł</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-1.5 rounded">
                        <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-[10px]">Всього</div>
                        <div className={`font-bold ${isConfirmed ? 'text-green-700' : 'text-amber-700'}`}>
                          {formatNumber(summary.totalPartPrice + summary.totalDeliveryCost)} zł
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {pendingCardOrders.length === 0 && pendingReceipts.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 text-center py-3">Немає замовлень</p>
              )}
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-600 dark:text-gray-300" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Історія транзакцій</h3>
            </div>
          </div>

          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Дата</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Тип</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Опис</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Сума (zł)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {new Date(transaction.transaction_date).toLocaleDateString('uk-UA')}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-1 rounded font-medium ${
                          transaction.transaction_type === 'payment'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {transaction.transaction_type === 'payment' ? 'Оплата' : 'Повернення'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{transaction.description}</td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${
                        transaction.transaction_type === 'payment' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'payment' ? '-' : '+'}{formatNumber(transaction.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => reverseTransaction(transaction)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-[10px]"
                          title="Сторнувати операцію"
                        >
                          <XCircle size={12} />
                          Сторнувати
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100" colSpan={3}>
                      Всього оплачено:
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                      -{formatNumber(transactions.filter(t => t.transaction_type === 'payment').reduce((sum, t) => sum + t.amount, 0))}
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100" colSpan={3}>
                      Всього повернень:
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                      +{formatNumber(transactions.filter(t => t.transaction_type === 'refund').reduce((sum, t) => sum + t.amount, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
              <p>Історія оплат порожня</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
