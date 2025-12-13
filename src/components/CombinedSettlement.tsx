import { useState, useEffect } from 'react';
import { supabase, Transaction, CardTransaction, ActiveReceipt, Order } from '../lib/supabase';
import { Plus, TrendingDown, TrendingUp, CheckCircle2, XCircle, Undo2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

type SettlementType = 'cash' | 'card';

export default function CombinedSettlement() {
  const { showSuccess, showError, showWarning, confirm } = useToast();
  const [settlementType, setSettlementType] = useState<SettlementType>('cash');
  const [cashTransactions, setCashTransactions] = useState<Transaction[]>([]);
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [cashReceipts, setCashReceipts] = useState<ActiveReceipt[]>([]);
  const [cardReceipts, setCardReceipts] = useState<ActiveReceipt[]>([]);
  const [receiptOrders, setReceiptOrders] = useState<Record<string, Order[]>>({});

  const [balanceReceiptPln, setBalanceReceiptPln] = useState(0);
  const [balanceTransportUsd, setBalanceTransportUsd] = useState(0);
  const [balanceCardPln, setBalanceCardPln] = useState(0);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showChargeForm, setShowChargeForm] = useState(false);

  const [cashFormData, setCashFormData] = useState({
    balanceType: 'receipt',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [cashChargeData, setCashChargeData] = useState({
    balanceType: 'receipt',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [cardFormData, setCardFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [cardChargeData, setCardChargeData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  function formatNumber(num: number | undefined | null): string {
    if (num === undefined || num === null) return '0';
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  }

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (cashTransactions.length >= 0 && cashReceipts.length >= 0) {
      calculateCashBalance();
    }
  }, [cashReceipts, cashTransactions]);

  useEffect(() => {
    if (cardTransactions.length >= 0 && cardReceipts.length >= 0) {
      calculateCardBalance();
    }
  }, [cardReceipts, cardTransactions, receiptOrders]);

  async function loadAllData() {
    await Promise.all([
      loadCashTransactions(),
      loadCardTransactions(),
      loadCashReceipts(),
      loadCardReceipts()
    ]);
  }

  async function loadCashTransactions() {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (data) {
      setCashTransactions(data);
    }
  }

  async function loadCardTransactions() {
    const { data } = await supabase
      .from('card_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (data) {
      setCardTransactions(data);
    }
  }

  async function loadCashReceipts() {
    const { data } = await supabase
      .from('active_receipts')
      .select('*')
      .in('status', ['sent_for_settlement', 'settled'])
      .order('settlement_date', { ascending: false });

    if (data) {
      setCashReceipts(data);
      data.forEach(receipt => loadReceiptOrders(receipt.id));
    }
  }

  async function loadCardReceipts() {
    const { data } = await supabase
      .from('active_receipts')
      .select('*')
      .in('status', ['sent_for_settlement', 'settled'])
      .order('settlement_date', { ascending: false });

    if (data) {
      setCardReceipts(data);
      data.forEach(receipt => loadReceiptOrders(receipt.id));
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

  function calculateCashBalance() {
    let receiptPln = 0;
    let transportUsd = 0;

    cashReceipts.filter(r => r.status === 'sent_for_settlement' || r.status === 'settled').forEach(receipt => {
      receiptPln += (receipt.receipt_cost_pln || 0) + (receipt.cash_on_delivery_pln || 0);
      transportUsd += receipt.transport_cost_usd || 0;
    });

    cashTransactions.forEach(tx => {
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

  function calculateCardBalance() {
    let partsPln = 0;

    cardReceipts.filter(r => r.status === 'sent_for_settlement' || r.status === 'settled').forEach(receipt => {
      const orders = receiptOrders[receipt.id] || [];
      const paidOrders = orders.filter(o => o.verified && o.payment_type === 'оплачено');

      paidOrders.forEach(order => {
        partsPln += order.part_price || 0;
        partsPln += order.delivery_cost || 0;
      });
    });

    cardTransactions.forEach(tx => {
      if (tx.is_reversed) return;
      if (tx.receipt_id) return;

      if (tx.transaction_type === 'charge') {
        partsPln += tx.amount || 0;
      } else if (tx.transaction_type === 'payment') {
        partsPln -= tx.amount || 0;
      }
    });

    setBalanceCardPln(partsPln);
  }

  async function handleCashPaymentSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(cashFormData.amount);
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
      description: cashFormData.description || 'Платіж',
      transaction_date: cashFormData.date,
      created_by: 'user'
    };

    if (cashFormData.balanceType === 'receipt') {
      transactionData.cash_on_delivery_pln = amount;
    } else if (cashFormData.balanceType === 'transport') {
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

    setCashFormData({
      balanceType: 'receipt',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowPaymentForm(false);
    loadCashTransactions();
  }

  async function handleCashChargeSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(cashChargeData.amount);
    if (isNaN(amount) || amount <= 0) {
      showWarning('Введіть коректну суму');
      return;
    }

    if (!cashChargeData.description.trim()) {
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
      description: cashChargeData.description,
      transaction_date: cashChargeData.date,
      created_by: 'user'
    };

    if (cashChargeData.balanceType === 'receipt') {
      transactionData.cash_on_delivery_pln = amount;
      transactionData.amount_pln = amount;
    } else if (cashChargeData.balanceType === 'transport') {
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

    setCashChargeData({
      balanceType: 'receipt',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowChargeForm(false);
    loadCashTransactions();
  }

  async function handleCardPaymentSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(cardFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      showWarning('Введіть коректну суму');
      return;
    }

    const transactionData: any = {
      transaction_type: 'payment',
      amount: amount,
      description: cardFormData.description || 'Платіж',
      transaction_date: cardFormData.date,
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

    setCardFormData({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowPaymentForm(false);
    loadCardTransactions();
  }

  async function handleCardChargeSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(cardChargeData.amount);
    if (isNaN(amount) || amount <= 0) {
      showWarning('Введіть коректну суму');
      return;
    }

    if (!cardChargeData.description.trim()) {
      showWarning('Вкажіть причину нарахування');
      return;
    }

    const transactionData: any = {
      transaction_type: 'charge',
      amount: amount,
      description: cardChargeData.description,
      transaction_date: cardChargeData.date,
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

    setCardChargeData({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowChargeForm(false);
    loadCardTransactions();
  }

  async function markAsSettled(receiptId: string) {
    const receipt = cashReceipts.find(r => r.id === receiptId) || cardReceipts.find(r => r.id === receiptId);
    if (!receipt) return;

    const receiptCashPln = (receipt.receipt_cost_pln || 0) + (receipt.cash_on_delivery_pln || 0);
    const transportUsd = receipt.transport_cost_usd || 0;

    const { error: cashTxError } = await supabase
      .from('transactions')
      .insert({
        transaction_type: 'debit',
        amount_pln: 0,
        amount_usd: 0,
        cash_on_delivery_pln: receiptCashPln,
        transport_cost_usd: transportUsd,
        parts_delivery_pln: 0,
        description: `Нарахування за накладну №${receipt.receipt_number}`,
        transaction_date: new Date().toISOString().split('T')[0],
        receipt_id: receipt.id,
        created_by: 'system'
      });

    if (cashTxError) {
      showError('Помилка при створенні готівкової транзакції');
      console.error(cashTxError);
      return;
    }

    const orders = receiptOrders[receiptId] || [];
    const paidOrders = orders.filter(o => o.verified && o.payment_type === 'оплачено');
    const totalCardAmount = paidOrders.reduce((sum, o) => sum + (o.part_price || 0) + (o.delivery_cost || 0), 0);

    if (totalCardAmount > 0) {
      const { error: cardTxError } = await supabase
        .from('card_transactions')
        .insert({
          transaction_type: 'charge',
          amount: totalCardAmount,
          description: `Нарахування за накладну №${receipt.receipt_number}`,
          transaction_date: new Date().toISOString().split('T')[0],
          receipt_id: receipt.id,
          is_reversed: false
        });

      if (cardTxError) {
        showError('Помилка при створенні карткової транзакції');
        console.error(cardTxError);
        return;
      }
    }

    const { error } = await supabase
      .from('active_receipts')
      .update({
        status: 'settled',
        settled_date: new Date().toISOString(),
        settlement_type: null
      })
      .eq('id', receiptId);

    if (error) {
      showError('Помилка при позначенні як розраховано');
      return;
    }

    showSuccess('Накладну розраховано синхронно по обох рахунках. Транзакції додано в історію.');
    loadCashReceipts();
    loadCardReceipts();
    loadCashTransactions();
    loadCardTransactions();
  }

  async function returnToActive(receiptId: string) {
    const confirmed = await confirm('Ви впевнені, що хочете повернути накладну в активні?');
    if (!confirmed) return;

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

    const { data: cashTxData } = await supabase
      .from('transactions')
      .select('id')
      .eq('receipt_id', receiptId)
      .eq('is_reversed', false);

    if (cashTxData && cashTxData.length > 0) {
      await supabase
        .from('transactions')
        .update({ is_reversed: true })
        .eq('receipt_id', receiptId)
        .eq('is_reversed', false);
    }

    const { data: cardTxData } = await supabase
      .from('card_transactions')
      .select('id')
      .eq('receipt_id', receiptId)
      .eq('is_reversed', false);

    if (cardTxData && cardTxData.length > 0) {
      await supabase
        .from('card_transactions')
        .update({ is_reversed: true })
        .eq('receipt_id', receiptId)
        .eq('is_reversed', false);
    }

    const { data: receiptOrderLinks } = await supabase
      .from('receipt_orders')
      .select('order_id')
      .eq('receipt_id', receiptId);

    if (receiptOrderLinks && receiptOrderLinks.length > 0) {
      const orderIds = receiptOrderLinks.map(ro => ro.order_id);
      await supabase
        .from('orders')
        .update({ status: 'в активному прийомі' })
        .in('id', orderIds);
    }

    showSuccess('Накладну повернуто в активні. Обидві транзакції сторновано.');
    loadCashReceipts();
    loadCardReceipts();
    loadCashTransactions();
    loadCardTransactions();
  }

  async function reverseCashTransaction(tx: Transaction) {
    if (tx.is_reversed) {
      showWarning('Ця транзакція вже сторнована');
      return;
    }

    const totalPln = tx.cash_on_delivery_pln || 0;
    const totalUsd = tx.transport_cost_usd || 0;
    const confirmed = await confirm(`Ви впевнені, що хочете сторнувати цю операцію?\n\nОпис: ${tx.description}\nСума: ${formatNumber(totalPln)} zl / ${formatNumber(totalUsd)} $\n\nТранзакція залишиться в історії з позначкою "сторновано".\n\nТакож буде сторновано пов'язану карткову транзакцію.`);
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
      }

      const { data: cardTxData } = await supabase
        .from('card_transactions')
        .select('id')
        .eq('receipt_id', tx.receipt_id)
        .eq('is_reversed', false);

      if (cardTxData && cardTxData.length > 0) {
        await supabase
          .from('card_transactions')
          .update({ is_reversed: true })
          .eq('receipt_id', tx.receipt_id)
          .eq('is_reversed', false);
      }
    }

    const { error } = await supabase
      .from('transactions')
      .update({ is_reversed: true })
      .eq('id', tx.id);

    if (error) {
      showError('Помилка при сторнуванні транзакції');
      console.error(error);
      return;
    }

    showSuccess('Операцію успішно сторновано синхронно по обох рахунках. Транзакції залишаються в історії.');
    loadCashReceipts();
    loadCardReceipts();
    loadCashTransactions();
    loadCardTransactions();
  }

  async function reverseCardTransaction(tx: CardTransaction) {
    if (tx.is_reversed) {
      showWarning('Ця транзакція вже сторнована');
      return;
    }

    const confirmed = await confirm(`Ви впевнені, що хочете сторнувати цю операцію?\n\nОпис: ${tx.description}\nСума: ${formatNumber(tx.amount)} zł\n\nТранзакція залишиться в історії з позначкою "сторновано".\n\nТакож буде сторновано пов'язану готівкову транзакцію.`);
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
      }

      const { data: cashTxData } = await supabase
        .from('transactions')
        .select('id')
        .eq('receipt_id', tx.receipt_id)
        .eq('is_reversed', false);

      if (cashTxData && cashTxData.length > 0) {
        await supabase
          .from('transactions')
          .update({ is_reversed: true })
          .eq('receipt_id', tx.receipt_id)
          .eq('is_reversed', false);
      }
    }

    const { error } = await supabase
      .from('card_transactions')
      .update({ is_reversed: true })
      .eq('id', tx.id);

    if (error) {
      showError('Помилка при сторнуванні транзакції');
      console.error(error);
      return;
    }

    showSuccess('Операцію успішно сторновано синхронно по обох рахунках. Транзакції залишаються в історії.');
    loadCashReceipts();
    loadCardReceipts();
    loadCashTransactions();
    loadCardTransactions();
  }

  async function returnSettledToSettlement(receiptId: string) {
    const confirmed = await confirm('Ви впевнені, що хочете повернути накладну назад на розрахунок?\n\nОбидві транзакції будуть сторновані.');
    if (!confirmed) return;

    const { data: cashTxData } = await supabase
      .from('transactions')
      .select('id')
      .eq('receipt_id', receiptId)
      .eq('is_reversed', false);

    if (cashTxData && cashTxData.length > 0) {
      await supabase
        .from('transactions')
        .update({ is_reversed: true })
        .eq('receipt_id', receiptId)
        .eq('is_reversed', false);
    }

    const { data: cardTxData } = await supabase
      .from('card_transactions')
      .select('id')
      .eq('receipt_id', receiptId)
      .eq('is_reversed', false);

    if (cardTxData && cardTxData.length > 0) {
      await supabase
        .from('card_transactions')
        .update({ is_reversed: true })
        .eq('receipt_id', receiptId)
        .eq('is_reversed', false);
    }

    const { error } = await supabase
      .from('active_receipts')
      .update({
        status: 'sent_for_settlement',
        settled_date: null,
        settlement_type: null
      })
      .eq('id', receiptId);

    if (error) {
      showError('Помилка при поверненні накладної');
      console.error(error);
      return;
    }

    showSuccess('Накладну повернуто назад на розрахунок. Обидві транзакції сторновано.');
    loadCashReceipts();
    loadCardReceipts();
    loadCashTransactions();
    loadCardTransactions();
  }

  const sentForSettlementCashReceipts = cashReceipts.filter(r => r.status === 'sent_for_settlement');
  const settledCashReceipts = cashReceipts.filter(r => r.status === 'settled');
  const sentForSettlementCardReceipts = cardReceipts.filter(r => r.status === 'sent_for_settlement');
  const settledCardReceipts = cardReceipts.filter(r => r.status === 'settled');

  return (
    <div className="h-full flex flex-col p-3 max-w-full overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Взаєморозрахунок</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:via-blue-800 dark:to-slate-900 rounded-lg p-3 border border-blue-200 dark:border-slate-600 shadow-lg">
          <div className="text-xs font-medium text-blue-900 dark:text-slate-200 mb-1">Прийом і побраня (PLN)</div>
          <div className={`text-xl font-bold ${balanceReceiptPln > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatNumber(balanceReceiptPln)} zł
          </div>
          <div className={`text-[10px] font-medium mt-0.5 ${balanceReceiptPln > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {balanceReceiptPln > 0 ? 'до сплати' : 'закрито'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-slate-700 dark:via-emerald-800 dark:to-slate-900 rounded-lg p-3 border border-emerald-200 dark:border-slate-600 shadow-lg">
          <div className="text-xs font-medium text-emerald-900 dark:text-slate-200 mb-1">Перевезення (USD)</div>
          <div className={`text-xl font-bold ${balanceTransportUsd > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatNumber(balanceTransportUsd)} $
          </div>
          <div className={`text-[10px] font-medium mt-0.5 ${balanceTransportUsd > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {balanceTransportUsd > 0 ? 'до сплати' : 'закрито'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-700 dark:via-amber-700 dark:to-slate-900 rounded-lg p-3 border border-amber-200 dark:border-slate-600 shadow-lg">
          <div className="text-xs font-semibold text-amber-900 dark:text-slate-100 mb-1">Картковий баланс (PLN)</div>
          <div className={`text-xl font-bold ${balanceCardPln > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatNumber(balanceCardPln)} zł
          </div>
          <div className={`text-[10px] font-medium mt-0.5 ${balanceCardPln > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {balanceCardPln > 0 ? 'до сплати' : 'закрито'}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 mb-3">
        <div className="flex border-b dark:border-gray-700">
          <button
            onClick={() => setSettlementType('cash')}
            className={`flex-1 px-4 py-3 font-medium transition ${
              settlementType === 'cash'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            Готівковий розрахунок
          </button>
          <button
            onClick={() => setSettlementType('card')}
            className={`flex-1 px-4 py-3 font-medium transition ${
              settlementType === 'card'
                ? 'bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/30 text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            Картковий розрахунок
          </button>
        </div>
      </div>

      {settlementType === 'cash' ? (
        <div className="flex-1 overflow-auto">
          <div className="flex justify-end gap-2 mb-3">
            <button
              onClick={() => {
                setShowChargeForm(!showChargeForm);
                setShowPaymentForm(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-rose-700 text-white rounded-lg hover:bg-rose-800 dark:bg-gradient-to-br dark:from-rose-900 dark:to-rose-800 dark:hover:from-rose-800 dark:hover:to-rose-700 transition-colors"
            >
              <TrendingUp size={16} />
              Нарахування
            </button>
            <button
              onClick={() => {
                setShowPaymentForm(!showPaymentForm);
                setShowChargeForm(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={16} />
              Платіж
            </button>
          </div>

          {showChargeForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 mb-3 border dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-2 dark:text-gray-100">Нове нарахування</h3>
              <form onSubmit={handleCashChargeSubmit} className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Тип балансу</label>
                    <select
                      value={cashChargeData.balanceType}
                      onChange={(e) => setCashChargeData({ ...cashChargeData, balanceType: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="receipt">Прийом і побраня</option>
                      <option value="transport">Перевезення</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Сума</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashChargeData.amount}
                      onChange={(e) => setCashChargeData({ ...cashChargeData, amount: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Дата</label>
                    <input
                      type="date"
                      value={cashChargeData.date}
                      onChange={(e) => setCashChargeData({ ...cashChargeData, date: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Причина нарахування *</label>
                  <input
                    type="text"
                    value={cashChargeData.description}
                    onChange={(e) => setCashChargeData({ ...cashChargeData, description: e.target.value })}
                    placeholder="Вкажіть причину нарахування"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1.5 text-sm bg-rose-700 text-white rounded-lg hover:bg-rose-800 dark:bg-gradient-to-br dark:from-rose-900 dark:to-rose-800 dark:hover:from-rose-800 dark:hover:to-rose-700">
                    Зберегти
                  </button>
                  <button type="button" onClick={() => setShowChargeForm(false)} className="px-3 py-1.5 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500">
                    Скасувати
                  </button>
                </div>
              </form>
            </div>
          )}

          {showPaymentForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 mb-3 border dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-2 dark:text-gray-100">Новий платіж</h3>
              <form onSubmit={handleCashPaymentSubmit} className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Тип балансу</label>
                    <select
                      value={cashFormData.balanceType}
                      onChange={(e) => setCashFormData({ ...cashFormData, balanceType: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="receipt">Прийом і побраня</option>
                      <option value="transport">Перевезення</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Сума</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashFormData.amount}
                      onChange={(e) => setCashFormData({ ...cashFormData, amount: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Дата</label>
                    <input
                      type="date"
                      value={cashFormData.date}
                      onChange={(e) => setCashFormData({ ...cashFormData, date: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Опис</label>
                  <input
                    type="text"
                    value={cashFormData.description}
                    onChange={(e) => setCashFormData({ ...cashFormData, description: e.target.value })}
                    placeholder="Опис платежу"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Зберегти
                  </button>
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="px-3 py-1.5 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500">
                    Скасувати
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {sentForSettlementCashReceipts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">Накладні на розрахунок ({sentForSettlementCashReceipts.length})</h3>
                <div className="space-y-2">
                  {sentForSettlementCashReceipts.map(receipt => {
                    const receiptCashPln = (receipt.receipt_cost_pln || 0) + (receipt.cash_on_delivery_pln || 0);
                    const transportUsd = receipt.transport_cost_usd || 0;

                    return (
                      <div key={receipt.id} className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-slate-700 dark:via-amber-700 dark:to-slate-800 border border-orange-200 dark:border-slate-600 rounded-lg p-3 shadow-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-slate-100">Накладна #{receipt.receipt_number}</div>
                            <div className="text-xs text-gray-600 dark:text-slate-300 mt-1">
                              Дата: {new Date(receipt.settlement_date || '').toLocaleDateString('uk-UA')}
                            </div>
                            <div className="text-sm mt-1">
                              <span className="font-medium text-gray-700 dark:text-slate-200">Прийом і побраня:</span>{' '}
                              <span className="text-red-600 dark:text-red-400 font-bold">{formatNumber(receiptCashPln)} zł</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700 dark:text-slate-200">Перевезення:</span>{' '}
                              <span className="text-red-600 dark:text-red-400 font-bold">{formatNumber(transportUsd)} $</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => markAsSettled(receipt.id)}
                              className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition"
                              title="Розраховано"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              onClick={() => returnToActive(receipt.id)}
                              className="p-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                              title="Повернути в активні"
                            >
                              <Undo2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">Історія транзакцій</h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Дата</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Опис</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Прийом (zł)</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Перевезення ($)</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">Дія</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cashTransactions.map(tx => {
                      const cashPln = tx.cash_on_delivery_pln || 0;
                      const transportUsd = tx.transport_cost_usd || 0;
                      const isDebit = tx.transaction_type === 'debit';

                      return (
                        <tr key={tx.id} className={tx.is_reversed ? 'bg-gray-100 dark:bg-gray-700/50 opacity-50' : ''}>
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                            {new Date(tx.transaction_date).toLocaleDateString('uk-UA')}
                          </td>
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                            {tx.description}
                            {tx.is_reversed && <span className="ml-1 text-xs text-rose-700 dark:text-rose-400">(сторновано)</span>}
                          </td>
                          <td className={`px-2 py-2 text-right font-medium ${isDebit ? 'text-rose-700 dark:text-rose-400' : 'text-green-600 dark:text-green-400'}`}>
                            {isDebit ? '+' : '-'}{formatNumber(cashPln)}
                          </td>
                          <td className={`px-2 py-2 text-right font-medium ${isDebit ? 'text-rose-700 dark:text-rose-400' : 'text-green-600 dark:text-green-400'}`}>
                            {isDebit ? '+' : '-'}{formatNumber(transportUsd)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {!tx.is_reversed && (
                              <button
                                onClick={() => reverseCashTransaction(tx)}
                                className="p-1 text-red-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition"
                                title="Сторнувати"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {settledCashReceipts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">Розраховані накладні ({settledCashReceipts.length})</h3>
                <div className="space-y-2">
                  {settledCashReceipts.map(receipt => {
                    const receiptCashPln = (receipt.receipt_cost_pln || 0) + (receipt.cash_on_delivery_pln || 0);
                    const transportUsd = receipt.transport_cost_usd || 0;

                    return (
                      <div key={receipt.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">Накладна #{receipt.receipt_number}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Розраховано: {new Date(receipt.settled_date || '').toLocaleDateString('uk-UA')}
                            </div>
                            <div className="text-sm mt-1">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Прийом і побраня:</span>{' '}
                              <span className="text-gray-900 dark:text-gray-100 font-bold">{formatNumber(receiptCashPln)} zł</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Перевезення:</span>{' '}
                              <span className="text-gray-900 dark:text-gray-100 font-bold">{formatNumber(transportUsd)} $</span>
                            </div>
                          </div>
                          <button
                            onClick={() => returnSettledToSettlement(receipt.id)}
                            className="p-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
                            title="Повернути на розрахунок"
                          >
                            <Undo2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="flex justify-end gap-2 mb-3">
            <button
              onClick={() => {
                setShowChargeForm(!showChargeForm);
                setShowPaymentForm(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-rose-700 text-white rounded-lg hover:bg-rose-800 dark:bg-gradient-to-br dark:from-rose-900 dark:to-rose-800 dark:hover:from-rose-800 dark:hover:to-rose-700 transition-colors"
            >
              <TrendingUp size={16} />
              Нарахування
            </button>
            <button
              onClick={() => {
                setShowPaymentForm(!showPaymentForm);
                setShowChargeForm(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={16} />
              Платіж
            </button>
          </div>

          {showChargeForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 mb-3 border dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-2 dark:text-gray-100">Нове нарахування</h3>
              <form onSubmit={handleCardChargeSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Сума (zł)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cardChargeData.amount}
                      onChange={(e) => setCardChargeData({ ...cardChargeData, amount: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Дата</label>
                    <input
                      type="date"
                      value={cardChargeData.date}
                      onChange={(e) => setCardChargeData({ ...cardChargeData, date: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Причина нарахування *</label>
                  <input
                    type="text"
                    value={cardChargeData.description}
                    onChange={(e) => setCardChargeData({ ...cardChargeData, description: e.target.value })}
                    placeholder="Вкажіть причину нарахування"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1.5 text-sm bg-rose-700 text-white rounded-lg hover:bg-rose-800 dark:bg-gradient-to-br dark:from-rose-900 dark:to-rose-800 dark:hover:from-rose-800 dark:hover:to-rose-700">
                    Зберегти
                  </button>
                  <button type="button" onClick={() => setShowChargeForm(false)} className="px-3 py-1.5 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500">
                    Скасувати
                  </button>
                </div>
              </form>
            </div>
          )}

          {showPaymentForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 mb-3 border dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-2 dark:text-gray-100">Новий платіж</h3>
              <form onSubmit={handleCardPaymentSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Сума (zł)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cardFormData.amount}
                      onChange={(e) => setCardFormData({ ...cardFormData, amount: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Дата</label>
                    <input
                      type="date"
                      value={cardFormData.date}
                      onChange={(e) => setCardFormData({ ...cardFormData, date: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Опис</label>
                  <input
                    type="text"
                    value={cardFormData.description}
                    onChange={(e) => setCardFormData({ ...cardFormData, description: e.target.value })}
                    placeholder="Опис платежу"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Зберегти
                  </button>
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="px-3 py-1.5 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500">
                    Скасувати
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {sentForSettlementCardReceipts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">Накладні на розрахунок ({sentForSettlementCardReceipts.length})</h3>
                <div className="space-y-2">
                  {sentForSettlementCardReceipts.map(receipt => {
                    const orders = receiptOrders[receipt.id] || [];
                    const paidOrders = orders.filter(o => o.verified && o.payment_type === 'оплачено');
                    const totalAmount = paidOrders.reduce((sum, o) => sum + (o.part_price || 0) + (o.delivery_cost || 0), 0);

                    return (
                      <div key={receipt.id} className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-slate-700 dark:via-amber-700 dark:to-slate-800 border border-orange-200 dark:border-slate-600 rounded-lg p-3 shadow-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-slate-100">Накладна #{receipt.receipt_number}</div>
                            <div className="text-xs text-gray-600 dark:text-slate-300 mt-1">
                              Дата: {new Date(receipt.settlement_date || '').toLocaleDateString('uk-UA')}
                            </div>
                            <div className="text-sm mt-1">
                              <span className="font-medium text-gray-700 dark:text-slate-200">Сума до оплати:</span>{' '}
                              <span className="text-red-600 dark:text-red-400 font-bold">{formatNumber(totalAmount)} zł</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => markAsSettled(receipt.id)}
                              className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition"
                              title="Розраховано"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              onClick={() => returnToActive(receipt.id)}
                              className="p-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                              title="Повернути в активні"
                            >
                              <Undo2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">Історія транзакцій</h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Дата</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Опис</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Сума (zł)</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">Дія</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cardTransactions.map(tx => {
                      const isCharge = tx.transaction_type === 'charge';

                      return (
                        <tr key={tx.id} className={tx.is_reversed ? 'bg-gray-100 dark:bg-gray-700/50 opacity-50' : ''}>
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                            {new Date(tx.transaction_date).toLocaleDateString('uk-UA')}
                          </td>
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                            {tx.description}
                            {tx.is_reversed && <span className="ml-1 text-xs text-rose-700 dark:text-rose-400">(сторновано)</span>}
                          </td>
                          <td className={`px-2 py-2 text-right font-medium ${isCharge ? 'text-rose-700 dark:text-rose-400' : 'text-green-600 dark:text-green-400'}`}>
                            {isCharge ? '+' : '-'}{formatNumber(tx.amount)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {!tx.is_reversed && (
                              <button
                                onClick={() => reverseCardTransaction(tx)}
                                className="p-1 text-red-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition"
                                title="Сторнувати"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {settledCardReceipts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">Розраховані накладні ({settledCardReceipts.length})</h3>
                <div className="space-y-2">
                  {settledCardReceipts.map(receipt => {
                    const orders = receiptOrders[receipt.id] || [];
                    const paidOrders = orders.filter(o => o.verified && o.payment_type === 'оплачено');
                    const totalAmount = paidOrders.reduce((sum, o) => sum + (o.part_price || 0) + (o.delivery_cost || 0), 0);

                    return (
                      <div key={receipt.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">Накладна #{receipt.receipt_number}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Розраховано: {new Date(receipt.settled_date || '').toLocaleDateString('uk-UA')}
                            </div>
                            <div className="text-sm mt-1">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Сума:</span>{' '}
                              <span className="text-gray-900 dark:text-gray-100 font-bold">{formatNumber(totalAmount)} zł</span>
                            </div>
                          </div>
                          <button
                            onClick={() => returnSettledToSettlement(receipt.id)}
                            className="p-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
                            title="Повернути на розрахунок"
                          >
                            <Undo2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
