import { useState, useEffect } from 'react';
import { supabase, Supplier, ActiveReceipt, Order } from '../lib/supabase';
import { ChevronDown, ChevronUp, Send, CheckCircle2, Undo2, Archive } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { ExportButton } from './ExportButton';
import { exportToCSV } from '../utils/exportData';

export default function SupplierBalance() {
  const { showSuccess, showError, confirm } = useToast();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [receipts, setReceipts] = useState<ActiveReceipt[]>([]);
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
  const [receiptOrders, setReceiptOrders] = useState<Record<string, Order[]>>({});
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
  const [isPartsBalanceExpanded, setIsPartsBalanceExpanded] = useState(false);
  const [isSentForSettlementExpanded, setIsSentForSettlementExpanded] = useState(true);
  const [isNotSentExpanded, setIsNotSentExpanded] = useState(true);

  function formatNumber(num: number): string {
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at')
      .limit(1)
      .single();

    if (supplierData) {
      setSupplier(supplierData);
    }

    const { data: receiptsData } = await supabase
      .from('active_receipts')
      .select('*')
      .in('status', ['approved', 'sent_for_settlement', 'settled'])
      .order('receipt_date', { ascending: false });

    if (receiptsData) setReceipts(receiptsData);
  }

  const sentForSettlementReceipts = receipts.filter(r => r.status === 'sent_for_settlement');
  const notSentReceipts = receipts.filter(r => r.status === 'approved');
  const activeReceipts = receipts.filter(r => r.status === 'approved' || r.status === 'sent_for_settlement');
  const archivedReceipts = receipts.filter(r => r.status === 'settled');

  const sentForSettlementTotal = sentForSettlementReceipts.reduce((acc, receipt) => {
    acc.parts += receipt.parts_cost_pln;
    acc.delivery += receipt.delivery_cost_pln;
    acc.receipt += receipt.receipt_cost_pln;
    acc.cash += receipt.cash_on_delivery_pln;
    acc.transport += receipt.transport_cost_usd;
    return acc;
  }, { parts: 0, delivery: 0, receipt: 0, cash: 0, transport: 0 });

  const notSentTotal = notSentReceipts.reduce((acc, receipt) => {
    acc.parts += receipt.parts_cost_pln;
    acc.delivery += receipt.delivery_cost_pln;
    acc.receipt += receipt.receipt_cost_pln;
    acc.cash += receipt.cash_on_delivery_pln;
    acc.transport += receipt.transport_cost_usd;
    return acc;
  }, { parts: 0, delivery: 0, receipt: 0, cash: 0, transport: 0 });

  const activeTotal = activeReceipts.reduce((acc, receipt) => {
    acc.parts += receipt.parts_cost_pln;
    acc.delivery += receipt.delivery_cost_pln;
    acc.receipt += receipt.receipt_cost_pln;
    acc.cash += receipt.cash_on_delivery_pln;
    acc.transport += receipt.transport_cost_usd;
    return acc;
  }, { parts: 0, delivery: 0, receipt: 0, cash: 0, transport: 0 });

  const archivedTotal = archivedReceipts.reduce((acc, receipt) => {
    acc.parts += receipt.parts_cost_pln;
    acc.delivery += receipt.delivery_cost_pln;
    acc.receipt += receipt.receipt_cost_pln;
    acc.cash += receipt.cash_on_delivery_pln;
    acc.transport += receipt.transport_cost_usd;
    return acc;
  }, { parts: 0, delivery: 0, receipt: 0, cash: 0, transport: 0 });

  async function sendToSettlement(receipt: ActiveReceipt) {
    if (!supplier) {
      showError('Помилка: постачальник не знайдений');
      return;
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

    const { data: receiptOrderLinks2 } = await supabase
      .from('receipt_orders')
      .select('order_id')
      .eq('receipt_id', receipt.id);

    let cardPartsCost2 = 0;
    let cardDeliveryCost2 = 0;

    if (receiptOrderLinks2 && receiptOrderLinks2.length > 0) {
      const orderIds2 = receiptOrderLinks2.map(ro => ro.order_id);
      const { data: ordersData2 } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds2);

      if (ordersData2) {
        ordersData2.forEach(order => {
          if (order.payment_type === 'оплачено') {
            cardPartsCost2 += order.part_price || 0;
            cardDeliveryCost2 += order.delivery_cost || 0;
          }
        });
      }
    }

    await supabase
      .from('suppliers')
      .update({
        balance_pln: Number(supplier.balance_pln) + Number(receipt.total_pln),
        balance_usd: Number(supplier.balance_usd) + Number(receipt.transport_cost_usd),
        balance_parts_pln: Number(supplier.balance_parts_pln) + Number(receipt.parts_cost_pln),
        balance_delivery_pln: Number(supplier.balance_delivery_pln) + Number(receipt.delivery_cost_pln),
        balance_receipt_pln: Number(supplier.balance_receipt_pln) + Number(receipt.receipt_cost_pln),
        balance_cash_on_delivery_pln: Number(supplier.balance_cash_on_delivery_pln) + Number(receipt.cash_on_delivery_pln),
        balance_transport_usd: Number(supplier.balance_transport_usd) + Number(receipt.transport_cost_usd),
        card_balance_parts_pln: Number(supplier.card_balance_parts_pln || 0) + Number(cardPartsCost2),
        card_balance_delivery_pln: Number(supplier.card_balance_delivery_pln || 0) + Number(cardDeliveryCost2)
      })
      .eq('id', supplier.id);

    showSuccess('Прийомку передано на розрахунок! Баланс оновлено.');
    loadData();
  }

  async function returnFromSettlement(receipt: ActiveReceipt) {
    const confirmed = await confirm('Ви впевнені, що хочете повернути цю прийомку назад?');
    if (!confirmed) return;

    if (!supplier) {
      showError('Помилка: постачальник не знайдений');
      return;
    }

    const { error: receiptError } = await supabase
      .from('active_receipts')
      .update({
        status: 'approved',
        settlement_date: null
      })
      .eq('id', receipt.id);

    if (receiptError) {
      showSuccess('Помилка повернення прийомки');
      return;
    }

    await supabase
      .from('transactions')
      .update({ is_reversed: true })
      .eq('receipt_id', receipt.id);

    await supabase
      .from('supplier_transactions')
      .update({ is_reversed: true })
      .eq('receipt_id', receipt.id);

    await supabase
      .from('card_transactions')
      .update({ is_reversed: true })
      .eq('receipt_id', receipt.id);

    showSuccess('Прийомку повернуто назад.');
    loadData();
  }

  async function toggleReceipt(receiptId: string) {
    const isCurrentlyExpanded = expandedReceipts.has(receiptId);

    setExpandedReceipts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(receiptId)) {
        newSet.delete(receiptId);
      } else {
        newSet.add(receiptId);
      }
      return newSet;
    });

    if (!isCurrentlyExpanded && !receiptOrders[receiptId]) {
      const { data: receiptOrdersData } = await supabase
        .from('receipt_orders')
        .select('order_id')
        .eq('receipt_id', receiptId);

      if (receiptOrdersData && receiptOrdersData.length > 0) {
        const orderIds = receiptOrdersData.map(ro => ro.order_id);

        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .in('id', orderIds)
          .order('order_number');

        if (ordersData) {
          setReceiptOrders(prev => ({
            ...prev,
            [receiptId]: ordersData
          }));
        }
      }
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Підтверджено';
      case 'sent_for_settlement': return 'На розрахунку';
      case 'settled': return 'Розраховано';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 dark:text-green-200';
      case 'sent_for_settlement': return 'bg-amber-100 text-amber-800 dark:bg-gradient-to-br dark:from-amber-950 dark:to-amber-900 dark:text-amber-200';
      case 'settled': return 'bg-blue-100 text-blue-800 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 dark:text-gray-300';
    }
  };

  const renderReceiptRow = (receipt: ActiveReceipt) => {
    const isExpanded = expandedReceipts.has(receipt.id);
    const orders = receiptOrders[receipt.id] || [];

    return (
      <>
        <tr
          key={receipt.id}
          className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
        >
          <td
            className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 cursor-pointer"
            onClick={() => toggleReceipt(receipt.id)}
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" />
              ) : (
                <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />
              )}
              <div>
                <div className="font-semibold">{receipt.receipt_number}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{new Date(receipt.receipt_date).toLocaleDateString('uk-UA')}</div>
              </div>
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(receipt.parts_cost_pln)}</td>
          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(receipt.delivery_cost_pln)}</td>
          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(receipt.receipt_cost_pln)}</td>
          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(receipt.cash_on_delivery_pln)}</td>
          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(receipt.transport_cost_usd)}</td>
          <td className="px-4 py-3 text-sm">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(receipt.status)}`}>
              {getStatusLabel(receipt.status)}
            </span>
          </td>
          <td className="px-4 py-3 text-sm text-center">
            {receipt.status === 'approved' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendToSettlement(receipt);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-gradient-to-br dark:from-blue-800 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-600 transition flex items-center gap-1 mx-auto"
              >
                <Send size={14} />
                На розрахунок
              </button>
            )}
            {receipt.status === 'sent_for_settlement' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  returnFromSettlement(receipt);
                }}
                className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 dark:bg-gradient-to-br dark:from-amber-800 dark:to-amber-700 dark:hover:from-amber-700 dark:hover:to-amber-600 transition flex items-center gap-1 mx-auto"
              >
                <Undo2 size={14} />
                Повернути
              </button>
            )}
            {receipt.status === 'settled' && (
              <div className="flex items-center justify-center gap-1 text-green-600">
                <CheckCircle2 size={16} />
                <span className="text-xs">Розраховано</span>
              </div>
            )}
          </td>
        </tr>

        {isExpanded && orders.length > 0 && (
          <tr key={`${receipt.id}-details`}>
            <td colSpan={8} className="px-4 py-4 bg-gray-50 dark:bg-gray-700">
              <div className="ml-6">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Позиції документа:</div>
                <table className="w-full text-xs">
                  <thead className="bg-white dark:bg-gray-800">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">№ Замовлення</th>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Назва</th>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">№ Деталі</th>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Тип оплати</th>
                      <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Запчастини (zł)</th>
                      <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Доставка (zł)</th>
                      <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Побране (zł)</th>
                      <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Перевезення ($)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{order.order_number}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{order.title || '-'}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{order.part_number || '-'}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{order.payment_type || '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatNumber(order.part_price || 0)}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatNumber(order.delivery_cost || 0)}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatNumber(order.cash_on_delivery || 0)}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{formatNumber(order.transport_cost_usd || 0)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 dark:bg-gray-700 font-bold border-t-2">
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100" colSpan={4}>Всього по документу:</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                        {formatNumber(orders.reduce((sum, order) => sum + (order.part_price || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                        {formatNumber(orders.reduce((sum, order) => sum + (order.delivery_cost || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                        {formatNumber(orders.reduce((sum, order) => sum + (order.cash_on_delivery || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                        {formatNumber(orders.reduce((sum, order) => sum + (order.transport_cost_usd || 0), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  const handleExportBalance = () => {
    const dataToExport = receipts.map(receipt => ({
      receipt_number: receipt.receipt_number,
      receipt_date: receipt.receipt_date,
      status: receipt.status === 'sent_for_settlement' ? 'Відправлено' : receipt.status === 'approved' ? 'Не відправлено' : 'Архів',
      parts_cost_pln: receipt.parts_cost_pln,
      delivery_cost_pln: receipt.delivery_cost_pln,
      receipt_cost_pln: receipt.receipt_cost_pln,
      cash_on_delivery_pln: receipt.cash_on_delivery_pln,
      transport_cost_usd: receipt.transport_cost_usd,
      total_pln: receipt.parts_cost_pln + receipt.delivery_cost_pln + receipt.receipt_cost_pln + receipt.cash_on_delivery_pln
    }));

    const headers = {
      receipt_number: '№ Прийомки',
      receipt_date: 'Дата',
      status: 'Статус',
      parts_cost_pln: 'Деталі PLN',
      delivery_cost_pln: 'Доставка PLN',
      receipt_cost_pln: 'Прийомка PLN',
      cash_on_delivery_pln: 'Побранє PLN',
      transport_cost_usd: 'Транспорт USD',
      total_pln: 'Всього PLN'
    };

    exportToCSV(dataToExport, 'balans_postachalnika', headers);
  };

  return (
    <div className="h-full flex flex-col p-4 max-w-[98%] mx-auto">
      <div className="flex-1 overflow-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b bg-blue-50 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-900 dark:border-blue-800">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200">Активні баланси</h3>
              <ExportButton onClick={handleExportBalance} disabled={receipts.length === 0} />
            </div>
          </div>

          {activeReceipts.length === 0 && (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <p>Немає активних документів прийому</p>
            </div>
          )}

          {sentForSettlementReceipts.length > 0 && (
            <>
              <div
                className="px-4 py-3 bg-amber-50 dark:bg-gradient-to-br dark:from-amber-950 dark:to-amber-900 cursor-pointer hover:bg-amber-100 dark:hover:from-amber-900 dark:hover:to-amber-800 transition border-b dark:border-amber-800"
                onClick={() => setIsSentForSettlementExpanded(!isSentForSettlementExpanded)}
              >
                <div className="flex items-center gap-2">
                  {isSentForSettlementExpanded ? (
                    <ChevronUp size={20} className="text-amber-700 dark:text-amber-300" />
                  ) : (
                    <ChevronDown size={20} className="text-amber-700 dark:text-amber-300" />
                  )}
                  <h4 className="text-md font-bold text-amber-900 dark:text-amber-200">Передані на розрахунок ({sentForSettlementReceipts.length})</h4>
                </div>
              </div>
              {isSentForSettlementExpanded && (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Документ</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Запчастини (zł)</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Доставка (zł)</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Прійом (zł)</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Побране (zł)</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Перевезення ($)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Статус</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sentForSettlementReceipts.map((receipt) => renderReceiptRow(receipt))}
                    <tr className="bg-amber-100 dark:bg-amber-900/50 font-bold text-gray-900 dark:text-amber-200">
                      <td className="px-4 py-3 text-sm">Підсумок</td>
                      <td className="px-4 py-3 text-sm text-right">{formatNumber(sentForSettlementTotal.parts)}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatNumber(sentForSettlementTotal.delivery)}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatNumber(sentForSettlementTotal.receipt)}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatNumber(sentForSettlementTotal.cash)}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatNumber(sentForSettlementTotal.transport)}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </>
          )}

          {notSentReceipts.length > 0 && (
            <>
              <div
                className="px-4 py-3 bg-green-50 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 cursor-pointer hover:bg-green-100 dark:hover:from-green-900 dark:hover:to-green-800 transition border-b dark:border-green-800"
                onClick={() => setIsNotSentExpanded(!isNotSentExpanded)}
              >
                <div className="flex items-center gap-2">
                  {isNotSentExpanded ? (
                    <ChevronUp size={20} className="text-green-700 dark:text-green-300" />
                  ) : (
                    <ChevronDown size={20} className="text-green-700 dark:text-green-300" />
                  )}
                  <h4 className="text-md font-bold text-green-900 dark:text-green-200">Не передані ({notSentReceipts.length})</h4>
                </div>
              </div>
              {isNotSentExpanded && (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Документ</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Запчастини (zł)</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Доставка (zł)</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Прійом (zł)</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Побране (zł)</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Перевезення ($)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Статус</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {notSentReceipts.map((receipt) => renderReceiptRow(receipt))}
                    <tr className="bg-green-100 dark:bg-green-900/50 font-bold text-gray-900 dark:text-green-200">
                      <td className="px-4 py-3 text-sm">Підсумок</td>
                      <td className="px-4 py-3 text-sm text-right">{formatNumber(notSentTotal.parts)}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatNumber(notSentTotal.delivery)}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatNumber(notSentTotal.receipt)}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatNumber(notSentTotal.cash)}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatNumber(notSentTotal.transport)}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeReceipts.length > 0 && (
            <div className="border-t-2 border-gray-300">
              <table className="w-full">
                <tbody>
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Всього активних</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(activeTotal.parts)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(activeTotal.delivery)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(activeTotal.receipt)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(activeTotal.cash)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(activeTotal.transport)}</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                  </tr>
                  <tr className="bg-blue-50 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-900 font-bold">
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-blue-200" colSpan={2}>
                      <div className="flex items-center gap-2">
                        <div className="w-[18px]"></div>
                        Прийом і побраня (PLN)
                      </div>
                    </td>
                    <td className="px-4 py-4 text-lg text-right text-blue-900 dark:text-blue-200" colSpan={6}>{formatNumber(activeTotal.receipt + activeTotal.cash)} zł</td>
                  </tr>
                  <tr className="bg-green-50 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 font-bold">
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-green-200" colSpan={2}>
                      <div className="flex items-center gap-2">
                        <div className="w-[18px]"></div>
                        Перевезення (USD)
                      </div>
                    </td>
                    <td className="px-4 py-4 text-lg text-right text-green-900 dark:text-green-200" colSpan={6}>{formatNumber(activeTotal.transport)} $</td>
                  </tr>
                  <tr
                    className="bg-amber-50 dark:bg-gradient-to-br dark:from-amber-950 dark:to-amber-900 font-bold cursor-pointer hover:bg-amber-100 dark:hover:from-amber-900 dark:hover:to-amber-800 transition"
                    onClick={() => setIsPartsBalanceExpanded(!isPartsBalanceExpanded)}
                  >
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-amber-200" colSpan={2}>
                      <div className="flex items-center gap-2">
                        {isPartsBalanceExpanded ? (
                          <ChevronUp size={18} className="text-amber-700 dark:text-amber-300" />
                        ) : (
                          <ChevronDown size={18} className="text-amber-700 dark:text-amber-300" />
                        )}
                        Запчастини + доставка (PLN)
                      </div>
                    </td>
                    <td className="px-4 py-4 text-lg text-right text-amber-900 dark:text-amber-200" colSpan={6}>{formatNumber(activeTotal.parts + activeTotal.delivery)} zł</td>
                  </tr>
                  {isPartsBalanceExpanded && (
                    <>
                      <tr className="bg-amber-50 dark:bg-gradient-to-br dark:from-amber-950 dark:to-amber-900">
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-amber-200" colSpan={2}>
                          <div className="ml-6">→ Запчастини</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-amber-200" colSpan={6}>{formatNumber(activeTotal.parts)} zł</td>
                      </tr>
                      <tr className="bg-amber-50 dark:bg-gradient-to-br dark:from-amber-950 dark:to-amber-900">
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-amber-200" colSpan={2}>
                          <div className="ml-6">→ Доставка</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-amber-200" colSpan={6}>{formatNumber(activeTotal.delivery)} zł</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {archivedReceipts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div
              className="p-4 border-b bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 transition"
              onClick={() => setIsArchiveExpanded(!isArchiveExpanded)}
            >
              <div className="flex items-center gap-2">
                {isArchiveExpanded ? (
                  <ChevronUp size={20} className="text-gray-600 dark:text-gray-300" />
                ) : (
                  <ChevronDown size={20} className="text-gray-600 dark:text-gray-300" />
                )}
                <Archive size={20} className="text-gray-600 dark:text-gray-300" />
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">Архів ({archivedReceipts.length})</h3>
              </div>
            </div>
            {isArchiveExpanded && (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Документ</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Запчастини (zł)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Доставка (zł)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Прійом (zł)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Побране (zł)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Перевезення ($)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Статус</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 border-b">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {archivedReceipts.map((receipt) => renderReceiptRow(receipt))}
                  {archivedReceipts.length > 0 && (
                    <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Всього в архіві</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(archivedTotal.parts)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(archivedTotal.delivery)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(archivedTotal.receipt)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(archivedTotal.cash)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{formatNumber(archivedTotal.transport)}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
