import { useState, useEffect } from 'react';
import { supabase, Transaction, CardTransaction, ActiveReceipt, Order } from '../lib/supabase';
import { Plus, TrendingUp, CheckCircle2, XCircle, Undo2 } from 'lucide-react';
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

    showSuccess('Накладну розраховано синхронно по обох рахунках.');
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

    showSuccess('Накладну повернуто в активні.');
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
    const confirmed = await confirm(`Сторнувати транзакцію?\n${tx.description}\n${formatNumber(totalPln)} zl / ${formatNumber(totalUsd)} $`);
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

    showSuccess('Операцію успішно сторновано.');
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

    const confirmed = await confirm(`Сторнувати транзакцію?\n${tx.description}\n${formatNumber(tx.amount)} zł`);
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

    showSuccess('Операцію успішно сторновано.');
    loadCashReceipts();
    loadCardReceipts();
    loadCashTransactions();
    loadCardTransactions();
  }

  async function returnSettledToSettlement(receiptId: string) {
    const confirmed = await confirm('Повернути накладну назад на розрахунок?');
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

    showSuccess('Накладну повернуто назад на розрахунок.');
    loadCashReceipts();
    loadCardReceipts();
    loadCashTransactions();
    loadCardTransactions();
  }

  const sentForSettlementCashReceipts = cashReceipts.filter(r => r.status === 'sent_for_settlement');
  const settledCashReceipts = cashReceipts.filter(r => r.status === 'settled');
  const sentForSettlementCardReceipts = cardReceipts.filter(r => r.status === 'sent_for_settlement');
  const settledCardReceipts = cardReceipts.filter(r => r.status === 'settled');

  const cashSummary = cashTransactions.reduce((acc, tx) => {
    if (tx.is_reversed) return acc;
    if (tx.transaction_type === 'debit') {
      acc.totalDebitPln += tx.cash_on_delivery_pln || 0;
      acc.totalDebitUsd += tx.transport_cost_usd || 0;
    } else {
      acc.totalCreditPln += tx.cash_on_delivery_pln || 0;
      acc.totalCreditUsd += tx.transport_cost_usd || 0;
    }
    return acc;
  }, { totalDebitPln: 0, totalDebitUsd: 0, totalCreditPln: 0, totalCreditUsd: 0 });

  const cardSummary = cardTransactions.reduce((acc, tx) => {
    if (tx.is_reversed) return acc;
    if (tx.transaction_type === 'charge') {
      acc.totalCharge += tx.amount || 0;
    } else {
      acc.totalPayment += tx.amount || 0;
    }
    return acc;
  }, { totalCharge: 0, totalPayment: 0 });

  return (
    <div className="h-full flex flex-col p-2 max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Взаєморозрахунок</h2>
        <div className="flex gap-2">
          <div className="bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setSettlementType('cash')}
                className={`px-3 py-1.5 text-sm font-medium transition rounded-l ${
                  settlementType === 'cash'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                Готівка
              </button>
              <button
                onClick={() => setSettlementType('card')}
                className={`px-3 py-1.5 text-sm font-medium transition rounded-r ${
                  settlementType === 'card'
                    ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                Карта
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              setShowChargeForm(!showChargeForm);
              setShowPaymentForm(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-rose-700 text-white rounded hover:bg-rose-800 transition"
          >
            <TrendingUp size={16} />
            Нарахування
          </button>
          <button
            onClick={() => {
              setShowPaymentForm(!showPaymentForm);
              setShowChargeForm(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            <Plus size={16} />
            Платіж
          </button>
        </div>
      </div>

      {showChargeForm && (
        <div className="bg-white dark:bg-gray-800 rounded shadow-lg p-3 mb-3 border dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-2 dark:text-gray-100">Нове нарахування</h3>
          <form onSubmit={settlementType === 'cash' ? handleCashChargeSubmit : handleCardChargeSubmit} className="space-y-2">
            <div className="grid gap-2" style={{ gridTemplateColumns: settlementType === 'cash' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
              {settlementType === 'cash' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Тип</label>
                  <select
                    value={cashChargeData.balanceType}
                    onChange={(e) => setCashChargeData({ ...cashChargeData, balanceType: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="receipt">Прийом</option>
                    <option value="transport">Перевезення</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Сума</label>
                <input
                  type="number"
                  step="0.01"
                  value={settlementType === 'cash' ? cashChargeData.amount : cardChargeData.amount}
                  onChange={(e) => settlementType === 'cash'
                    ? setCashChargeData({ ...cashChargeData, amount: e.target.value })
                    : setCardChargeData({ ...cardChargeData, amount: e.target.value })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Дата</label>
                <input
                  type="date"
                  value={settlementType === 'cash' ? cashChargeData.date : cardChargeData.date}
                  onChange={(e) => settlementType === 'cash'
                    ? setCashChargeData({ ...cashChargeData, date: e.target.value })
                    : setCardChargeData({ ...cardChargeData, date: e.target.value })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Причина *</label>
              <input
                type="text"
                value={settlementType === 'cash' ? cashChargeData.description : cardChargeData.description}
                onChange={(e) => settlementType === 'cash'
                  ? setCashChargeData({ ...cashChargeData, description: e.target.value })
                  : setCardChargeData({ ...cardChargeData, description: e.target.value })
                }
                placeholder="Вкажіть причину"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1.5 text-sm bg-rose-700 text-white rounded hover:bg-rose-800">
                Зберегти
              </button>
              <button type="button" onClick={() => setShowChargeForm(false)} className="px-3 py-1.5 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500">
                Скасувати
              </button>
            </div>
          </form>
        </div>
      )}

      {showPaymentForm && (
        <div className="bg-white dark:bg-gray-800 rounded shadow-lg p-3 mb-3 border dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-2 dark:text-gray-100">Новий платіж</h3>
          <form onSubmit={settlementType === 'cash' ? handleCashPaymentSubmit : handleCardPaymentSubmit} className="space-y-2">
            <div className="grid gap-2" style={{ gridTemplateColumns: settlementType === 'cash' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
              {settlementType === 'cash' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Тип</label>
                  <select
                    value={cashFormData.balanceType}
                    onChange={(e) => setCashFormData({ ...cashFormData, balanceType: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="receipt">Прийом</option>
                    <option value="transport">Перевезення</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Сума</label>
                <input
                  type="number"
                  step="0.01"
                  value={settlementType === 'cash' ? cashFormData.amount : cardFormData.amount}
                  onChange={(e) => settlementType === 'cash'
                    ? setCashFormData({ ...cashFormData, amount: e.target.value })
                    : setCardFormData({ ...cardFormData, amount: e.target.value })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Дата</label>
                <input
                  type="date"
                  value={settlementType === 'cash' ? cashFormData.date : cardFormData.date}
                  onChange={(e) => settlementType === 'cash'
                    ? setCashFormData({ ...cashFormData, date: e.target.value })
                    : setCardFormData({ ...cardFormData, date: e.target.value })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Опис</label>
              <input
                type="text"
                value={settlementType === 'cash' ? cashFormData.description : cardFormData.description}
                onChange={(e) => settlementType === 'cash'
                  ? setCashFormData({ ...cashFormData, description: e.target.value })
                  : setCardFormData({ ...cardFormData, description: e.target.value })
                }
                placeholder="Опис платежу"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                Зберегти
              </button>
              <button type="button" onClick={() => setShowPaymentForm(false)} className="px-3 py-1.5 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500">
                Скасувати
              </button>
            </div>
          </form>
        </div>
      )}

      {settlementType === 'cash' ? (
        <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">
          <div className="flex flex-col gap-2 overflow-auto">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:via-blue-800 dark:to-slate-900 rounded-lg p-3 border border-blue-200 dark:border-slate-600 shadow">
                <div className="text-xs font-medium text-blue-900 dark:text-slate-200 mb-1">Прийом</div>
                <div className={`text-lg font-bold ${balanceReceiptPln > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatNumber(balanceReceiptPln)} zł
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-slate-700 dark:via-emerald-800 dark:to-slate-900 rounded-lg p-3 border border-emerald-200 dark:border-slate-600 shadow">
                <div className="text-xs font-medium text-emerald-900 dark:text-slate-200 mb-1">Перевезення</div>
                <div className={`text-lg font-bold ${balanceTransportUsd > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatNumber(balanceTransportUsd)} $
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-700 dark:via-amber-700 dark:to-slate-900 rounded-lg p-3 border border-amber-200 dark:border-slate-600 shadow">
                <div className="text-xs font-semibold text-amber-900 dark:text-slate-100 mb-1">Карта</div>
                <div className={`text-lg font-bold ${balanceCardPln > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatNumber(balanceCardPln)} zł
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden flex flex-col">
              <h3 className="text-sm font-semibold px-3 py-2 text-gray-800 dark:text-gray-100 border-b dark:border-gray-700">Історія транзакцій</h3>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Дата</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Опис</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Прийом</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Перевезення</th>
                      <th className="px-2 py-2 text-center font-semibold text-gray-700 dark:text-gray-300 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cashTransactions.map(tx => {
                      const cashPln = tx.cash_on_delivery_pln || 0;
                      const transportUsd = tx.transport_cost_usd || 0;
                      const isDebit = tx.transaction_type === 'debit';

                      return (
                        <tr key={tx.id} className={tx.is_reversed ? 'bg-gray-100 dark:bg-gray-700/50 opacity-50' : ''}>
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {new Date(tx.transaction_date).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                            {tx.description}
                            {tx.is_reversed && <span className="ml-1 text-[10px] text-rose-700 dark:text-rose-400">(сторн.)</span>}
                          </td>
                          <td className={`px-2 py-2 text-right font-medium whitespace-nowrap ${isDebit ? 'text-rose-700 dark:text-rose-400' : 'text-green-600 dark:text-green-400'}`}>
                            {isDebit ? '+' : '-'}{formatNumber(cashPln)}
                          </td>
                          <td className={`px-2 py-2 text-right font-medium whitespace-nowrap ${isDebit ? 'text-rose-700 dark:text-rose-400' : 'text-green-600 dark:text-green-400'}`}>
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
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-3 py-2 border-t-2 border-gray-300 dark:border-gray-600">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Нарахування:</div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Прийом:</span>
                      <span className="font-bold text-rose-700 dark:text-rose-400">+{formatNumber(cashSummary.totalDebitPln)} zł</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Перевезення:</span>
                      <span className="font-bold text-rose-700 dark:text-rose-400">+{formatNumber(cashSummary.totalDebitUsd)} $</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Платежі:</div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Прийом:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">-{formatNumber(cashSummary.totalCreditPln)} zł</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Перевезення:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">-{formatNumber(cashSummary.totalCreditUsd)} $</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 overflow-auto">
            {sentForSettlementCashReceipts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
                <h3 className="text-sm font-semibold px-3 py-2 text-gray-800 dark:text-gray-100 border-b dark:border-gray-700 flex items-center gap-1.5">
                  На розрахунок
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-bold">
                    {sentForSettlementCashReceipts.length}
                  </span>
                </h3>
                <div className="p-3 space-y-2 max-h-64 overflow-auto">
                  {sentForSettlementCashReceipts.map(receipt => {
                    const receiptCashPln = (receipt.receipt_cost_pln || 0) + (receipt.cash_on_delivery_pln || 0);
                    const transportUsd = receipt.transport_cost_usd || 0;

                    return (
                      <div key={receipt.id} className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-slate-700 dark:via-amber-700 dark:to-slate-800 border border-orange-200 dark:border-slate-600 rounded-lg p-2.5 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-sm text-gray-800 dark:text-slate-100">№{receipt.receipt_number}</div>
                            <div className="text-xs text-gray-600 dark:text-slate-300">
                              {new Date(receipt.settlement_date || '').toLocaleDateString('uk-UA')}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => markAsSettled(receipt.id)}
                              className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition"
                              title="Розраховано"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              onClick={() => returnToActive(receipt.id)}
                              className="p-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                              title="Повернути"
                            >
                              <Undo2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-slate-200">Прийом:</span>
                            <span className="text-red-600 dark:text-red-400 font-bold">{formatNumber(receiptCashPln)} zł</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-slate-200">Перевезення:</span>
                            <span className="text-red-600 dark:text-red-400 font-bold">{formatNumber(transportUsd)} $</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {settledCashReceipts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
                <h3 className="text-sm font-semibold px-3 py-2 text-gray-800 dark:text-gray-100 border-b dark:border-gray-700 flex items-center gap-1.5">
                  Розраховані
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-xs font-bold">
                    {settledCashReceipts.length}
                  </span>
                </h3>
                <div className="p-3 space-y-2 max-h-64 overflow-auto">
                  {settledCashReceipts.map(receipt => {
                    const receiptCashPln = (receipt.receipt_cost_pln || 0) + (receipt.cash_on_delivery_pln || 0);
                    const transportUsd = receipt.transport_cost_usd || 0;

                    return (
                      <div key={receipt.id} className="bg-green-50 dark:bg-gradient-to-br dark:from-emerald-900 dark:via-teal-800 dark:to-slate-900 border border-green-200 dark:border-emerald-700 rounded-lg p-2.5 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-sm text-gray-900 dark:text-emerald-100">№{receipt.receipt_number}</div>
                            <div className="text-xs text-gray-600 dark:text-emerald-200">
                              {new Date(receipt.settled_date || '').toLocaleDateString('uk-UA')}
                            </div>
                          </div>
                          <button
                            onClick={() => returnSettledToSettlement(receipt.id)}
                            className="p-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
                            title="Повернути"
                          >
                            <Undo2 size={14} />
                          </button>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-emerald-200">Прийом:</span>
                            <span className="text-gray-900 dark:text-white font-bold">{formatNumber(receiptCashPln)} zł</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700 dark:text-emerald-200">Перевезення:</span>
                            <span className="text-gray-900 dark:text-white font-bold">{formatNumber(transportUsd)} $</span>
                          </div>
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
        <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">
          <div className="flex flex-col gap-2 overflow-auto">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:via-blue-800 dark:to-slate-900 rounded-lg p-3 border border-blue-200 dark:border-slate-600 shadow">
                <div className="text-xs font-medium text-blue-900 dark:text-slate-200 mb-1">Прийом</div>
                <div className={`text-lg font-bold ${balanceReceiptPln > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatNumber(balanceReceiptPln)} zł
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-slate-700 dark:via-emerald-800 dark:to-slate-900 rounded-lg p-3 border border-emerald-200 dark:border-slate-600 shadow">
                <div className="text-xs font-medium text-emerald-900 dark:text-slate-200 mb-1">Перевезення</div>
                <div className={`text-lg font-bold ${balanceTransportUsd > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatNumber(balanceTransportUsd)} $
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-700 dark:via-amber-700 dark:to-slate-900 rounded-lg p-3 border border-amber-200 dark:border-slate-600 shadow">
                <div className="text-xs font-semibold text-amber-900 dark:text-slate-100 mb-1">Карта</div>
                <div className={`text-lg font-bold ${balanceCardPln > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatNumber(balanceCardPln)} zł
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden flex flex-col">
              <h3 className="text-sm font-semibold px-3 py-2 text-gray-800 dark:text-gray-100 border-b dark:border-gray-700">Історія транзакцій</h3>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Дата</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Опис</th>
                      <th className="px-2 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Сума</th>
                      <th className="px-2 py-2 text-center font-semibold text-gray-700 dark:text-gray-300 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cardTransactions.map(tx => {
                      const isCharge = tx.transaction_type === 'charge';

                      return (
                        <tr key={tx.id} className={tx.is_reversed ? 'bg-gray-100 dark:bg-gray-700/50 opacity-50' : ''}>
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {new Date(tx.transaction_date).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td className="px-2 py-2 text-gray-900 dark:text-gray-100">
                            {tx.description}
                            {tx.is_reversed && <span className="ml-1 text-[10px] text-rose-700 dark:text-rose-400">(сторн.)</span>}
                          </td>
                          <td className={`px-2 py-2 text-right font-medium whitespace-nowrap ${isCharge ? 'text-rose-700 dark:text-rose-400' : 'text-green-600 dark:text-green-400'}`}>
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
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-3 py-2 border-t-2 border-gray-300 dark:border-gray-600">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Нарахування:</div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Загалом:</span>
                      <span className="font-bold text-rose-700 dark:text-rose-400">+{formatNumber(cardSummary.totalCharge)} zł</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Платежі:</div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Загалом:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">-{formatNumber(cardSummary.totalPayment)} zł</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 overflow-auto">
            {sentForSettlementCardReceipts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
                <h3 className="text-sm font-semibold px-3 py-2 text-gray-800 dark:text-gray-100 border-b dark:border-gray-700 flex items-center gap-1.5">
                  На розрахунок
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-bold">
                    {sentForSettlementCardReceipts.length}
                  </span>
                </h3>
                <div className="p-3 space-y-2 max-h-64 overflow-auto">
                  {sentForSettlementCardReceipts.map(receipt => {
                    const orders = receiptOrders[receipt.id] || [];
                    const paidOrders = orders.filter(o => o.verified && o.payment_type === 'оплачено');
                    const totalAmount = paidOrders.reduce((sum, o) => sum + (o.part_price || 0) + (o.delivery_cost || 0), 0);

                    return (
                      <div key={receipt.id} className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-slate-700 dark:via-amber-700 dark:to-slate-800 border border-orange-200 dark:border-slate-600 rounded-lg p-2.5 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-sm text-gray-800 dark:text-slate-100">№{receipt.receipt_number}</div>
                            <div className="text-xs text-gray-600 dark:text-slate-300">
                              {new Date(receipt.settlement_date || '').toLocaleDateString('uk-UA')}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => markAsSettled(receipt.id)}
                              className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition"
                              title="Розраховано"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              onClick={() => returnToActive(receipt.id)}
                              className="p-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                              title="Повернути"
                            >
                              <Undo2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-700 dark:text-slate-200">Сума:</span>
                          <span className="text-red-600 dark:text-red-400 font-bold">{formatNumber(totalAmount)} zł</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {settledCardReceipts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
                <h3 className="text-sm font-semibold px-3 py-2 text-gray-800 dark:text-gray-100 border-b dark:border-gray-700 flex items-center gap-1.5">
                  Розраховані
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-xs font-bold">
                    {settledCardReceipts.length}
                  </span>
                </h3>
                <div className="p-3 space-y-2 max-h-64 overflow-auto">
                  {settledCardReceipts.map(receipt => {
                    const orders = receiptOrders[receipt.id] || [];
                    const paidOrders = orders.filter(o => o.verified && o.payment_type === 'оплачено');
                    const totalAmount = paidOrders.reduce((sum, o) => sum + (o.part_price || 0) + (o.delivery_cost || 0), 0);

                    return (
                      <div key={receipt.id} className="bg-green-50 dark:bg-gradient-to-br dark:from-emerald-900 dark:via-teal-800 dark:to-slate-900 border border-green-200 dark:border-emerald-700 rounded-lg p-2.5 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-sm text-gray-900 dark:text-emerald-100">№{receipt.receipt_number}</div>
                            <div className="text-xs text-gray-600 dark:text-emerald-200">
                              {new Date(receipt.settled_date || '').toLocaleDateString('uk-UA')}
                            </div>
                          </div>
                          <button
                            onClick={() => returnSettledToSettlement(receipt.id)}
                            className="p-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
                            title="Повернути"
                          >
                            <Undo2 size={14} />
                          </button>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-700 dark:text-emerald-200">Сума:</span>
                          <span className="text-gray-900 dark:text-white font-bold">{formatNumber(totalAmount)} zł</span>
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
