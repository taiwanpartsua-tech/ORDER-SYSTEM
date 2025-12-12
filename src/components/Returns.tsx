import { useState, useEffect } from 'react';
import { supabase, Return, Manager } from '../lib/supabase';
import { Plus, Trash2, ExternalLink, ChevronDown, ChevronUp, Check, X, Edit, RotateCcw } from 'lucide-react';

export default function Returns() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isAddingNewRow, setIsAddingNewRow] = useState(false);
  const [editingCell, setEditingCell] = useState<{ returnId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [newRowData, setNewRowData] = useState({
    status: 'повернення',
    substatus: 'В Арта в хелмі',
    client_id: '',
    title: '',
    link: '',
    tracking_pl: '',
    part_price: 0,
    delivery_cost: 0,
    total_cost: 0,
    part_number: '',
    payment_type: 'оплачено',
    cash_on_delivery: 0,
    order_date: new Date().toISOString().split('T')[0],
    return_tracking_to_supplier: '',
    refund_status: null as string | null,
    discussion_link: '',
    situation_description: '',
    manager_id: ''
  });

  const statuses = [
    'повернення',
    'проблемні',
    'анульовано'
  ];

  const substatuses = [
    'В Арта в хелмі',
    'В Луцьку',
    'В клієнта',
    'В нас на складі',
    'В дорозі до поляка',
    'В дорозі до Пачки',
    'В пачки',
    'В дорозі до Арта'
  ];

  const statusColors: Record<string, string> = {
    'повернення': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
    'проблемні': 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
    'анульовано': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
  };

  const refundStatuses = [
    'оплачено поляком',
    'надіслано реквізити для повернення',
    'кошти повернено'
  ];

  const paymentTypes = ['оплачено', 'побранє', 'самовивіз pl'];

  const paymentTypeColors: Record<string, string> = {
    'оплачено': 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    'побранє': 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100',
    'самовивіз pl': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
  };

  const paymentTypeLabels: Record<string, string> = {
    'оплачено': 'Оплачено',
    'побранє': 'Побранє',
    'самовивіз pl': 'Самовивіз PL'
  };

  const substatusColors: Record<string, string> = {
    'В Арта в хелмі': 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100',
    'В Луцьку': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
    'В клієнта': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    'В нас на складі': 'bg-teal-100 text-teal-800 dark:bg-teal-800 dark:text-teal-100',
    'В дорозі до поляка': 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100',
    'В дорозі до Пачки': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-800 dark:text-cyan-100',
    'В пачки': 'bg-lime-100 text-lime-800 dark:bg-lime-800 dark:text-lime-100',
    'В дорозі до Арта': 'bg-pink-100 text-pink-800 dark:bg-pink-800 dark:text-pink-100'
  };

  const refundStatusColors: Record<string, string> = {
    'оплачено поляком': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    'надіслано реквізити для повернення': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
    'кошти повернено': 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
  };

  useEffect(() => {
    loadReturns();
    loadManagers();
  }, [showArchived]);

  useEffect(() => {
    const totalCost = Number(newRowData.part_price) + Number(newRowData.delivery_cost);
    setNewRowData(prev => ({ ...prev, total_cost: totalCost }));
  }, [newRowData.part_price, newRowData.delivery_cost]);

  useEffect(() => {
    if (newRowData.payment_type === 'оплачено') {
      setNewRowData(prev => ({ ...prev, cash_on_delivery: 0 }));
    }
  }, [newRowData.payment_type]);

  async function loadReturns() {
    const { data, error } = await supabase
      .from('returns')
      .select('*')
      .eq('archived', showArchived)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReturns(data as Return[]);
    }
  }

  async function loadManagers() {
    const { data } = await supabase
      .from('managers')
      .select('*')
      .order('name');

    if (data) setManagers(data);
  }

  function startAddingNewRow() {
    setIsAddingNewRow(true);
    setNewRowData({
      status: 'повернення',
      substatus: 'В Арта в хелмі',
      client_id: '',
      title: '',
      link: '',
      tracking_pl: '',
      part_price: 0,
      delivery_cost: 0,
      total_cost: 0,
      part_number: '',
      payment_type: 'оплачено',
      cash_on_delivery: 0,
      order_date: new Date().toISOString().split('T')[0],
      return_tracking_to_supplier: '',
      refund_status: null as string | null,
      discussion_link: '',
      situation_description: '',
      manager_id: ''
    });
  }

  async function saveNewRow() {
    const dataToSubmit: any = { ...newRowData };

    if (dataToSubmit.client_id === '') {
      delete dataToSubmit.client_id;
    }

    if (dataToSubmit.manager_id === '') {
      delete dataToSubmit.manager_id;
    }

    if (dataToSubmit.refund_status === '' || dataToSubmit.refund_status === null) {
      dataToSubmit.refund_status = null;
    }

    const shouldArchive = dataToSubmit.status === 'проблемні' || dataToSubmit.status === 'анульовано';
    dataToSubmit.archived = shouldArchive;

    const { error } = await supabase.from('returns').insert([dataToSubmit]);
    if (error) {
      console.error('Error inserting return:', error);
      alert('Помилка при створенні повернення: ' + error.message);
      return;
    }

    setIsAddingNewRow(false);
    loadReturns();
  }

  function cancelNewRow() {
    setIsAddingNewRow(false);
  }

  function toggleRow(returnId: string) {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(returnId)) {
        newSet.delete(returnId);
      } else {
        newSet.add(returnId);
      }
      return newSet;
    });
  }

  async function deleteReturn(id: string) {
    if (confirm('Ви впевнені що хочете видалити це повернення?')) {
      const { error } = await supabase
        .from('returns')
        .delete()
        .eq('id', id);

      if (!error) {
        loadReturns();
      }
    }
  }

  function startEditing(returnId: string, field: string, currentValue: any) {
    setEditingCell({ returnId, field });
    let cleanValue = String(currentValue || '');
    cleanValue = cleanValue.replace(/ (zl|\$|кг)$/, '');
    setEditValue(cleanValue);
  }

  async function saveEdit() {
    if (!editingCell) return;

    const { returnId, field } = editingCell;
    let valueToSave: any = editValue;

    let cleanValue = editValue.replace(/ (zl|\$|кг)$/, '').trim();

    if (['part_price', 'delivery_cost', 'total_cost', 'cash_on_delivery'].includes(field)) {
      valueToSave = parseFloat(cleanValue) || 0;
    }

    const updateData: any = { [field]: valueToSave, updated_at: new Date().toISOString() };

    if (field === 'payment_type' && valueToSave === 'оплачено') {
      updateData.cash_on_delivery = 0;
    }

    if (field === 'part_price' || field === 'delivery_cost') {
      const currentReturn = returns.find(r => r.id === returnId);
      if (currentReturn) {
        const partPrice = field === 'part_price' ? valueToSave : currentReturn.part_price;
        const deliveryCost = field === 'delivery_cost' ? valueToSave : currentReturn.delivery_cost;
        updateData.total_cost = partPrice + deliveryCost;
      }
    }

    const { error } = await supabase
      .from('returns')
      .update(updateData)
      .eq('id', returnId);

    if (!error) {
      loadReturns();
    }

    setEditingCell(null);
    setEditValue('');
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  }

  function formatNumber(num: number): string {
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  }

  function renderEditableCell(returnId: string, field: string, value: any, className: string = '') {
    const isEditing = editingCell?.returnId === returnId && editingCell?.field === field;

    if (isEditing) {
      return (
        <td className="px-3 py-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-blue-400 dark:focus:ring-blue-400 text-sm"
          />
        </td>
      );
    }

    return (
      <td
        className={`px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition ${className} text-sm`}
        onClick={() => startEditing(returnId, field, value)}
        title="Клікніть для редагування"
      >
        <div className="w-full break-all">
          {value}
        </div>
      </td>
    );
  }

  function renderLinkCell(returnId: string, link: string) {
    const isEditing = editingCell?.returnId === returnId && editingCell?.field === 'link';

    if (isEditing) {
      return (
        <td className="px-3 py-2 text-center">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-blue-400 dark:focus:ring-blue-400 text-sm"
            placeholder="https://"
          />
        </td>
      );
    }

    return (
      <td
        className="px-3 py-2 text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
        onClick={() => startEditing(returnId, 'link', link)}
        title="Клікніть для редагування посилання"
      >
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={16} />
          </a>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">
            <ExternalLink size={16} />
          </span>
        )}
      </td>
    );
  }

  function toggleRowExpansion(returnId: string) {
    toggleRow(returnId);
  }

  function handleDelete(id: string) {
    deleteReturn(id);
  }

  async function handleReturnToOrders(returnItem: Return) {
    if (confirm('Повернути це замовлення назад в список замовлень?')) {
      const { error } = await supabase.from('orders').insert({
        status: 'в роботі на сьогодні',
        order_number: '',
        client_id: returnItem.client_id || '',
        title: returnItem.title || '',
        link: returnItem.link || '',
        tracking_pl: returnItem.tracking_pl || '',
        part_price: returnItem.part_price || 0,
        delivery_cost: returnItem.delivery_cost || 0,
        total_cost: returnItem.total_cost || 0,
        part_number: returnItem.part_number || '',
        payment_type: returnItem.payment_type || 'оплачено',
        cash_on_delivery: returnItem.cash_on_delivery || 0,
        order_date: returnItem.order_date || new Date().toISOString(),
        notes: `Повернено з Returns ID: ${returnItem.id}`,
        received_pln: 0,
        transport_cost_usd: 0,
        weight_kg: 0,
        verified: false,
        archived: false
      });

      if (!error) {
        await supabase.from('returns').delete().eq('id', returnItem.id);
        alert('Замовлення успішно повернено!');
        loadReturns();
      }
    }
  }

  function saveInlineEdit() {
    saveEdit();
  }

  return (
    <div className="h-full flex flex-col p-4 max-w-[98%] mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex-1 overflow-auto min-h-0 flex flex-col">
        {!isAddingNewRow && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <button
              onClick={startAddingNewRow}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition text-sm font-medium"
            >
              <Plus size={18} />
              Додати повернення
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowArchived(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  !showArchived
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Активні
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  showArchived
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Архівні
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-10"></th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Статус</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Підстатус</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID клієнта</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Назва</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Посилання</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Трекінг PL</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">№ запчастини</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дата</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isAddingNewRow && (
                <>
                  <tr className="bg-green-50 dark:bg-green-900/30">
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2">
                      <select
                        value={newRowData.status}
                        onChange={(e) => setNewRowData({ ...newRowData, status: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={newRowData.substatus}
                        onChange={(e) => setNewRowData({ ...newRowData, substatus: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                      >
                        {substatuses.map((substatus) => (
                          <option key={substatus} value={substatus}>{substatus}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={newRowData.client_id}
                        onChange={(e) => setNewRowData({ ...newRowData, client_id: e.target.value })}
                        placeholder="ID клієнта"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={newRowData.title}
                        onChange={(e) => setNewRowData({ ...newRowData, title: e.target.value })}
                        placeholder="Назва"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={newRowData.link}
                        onChange={(e) => setNewRowData({ ...newRowData, link: e.target.value })}
                        placeholder="https://"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={newRowData.tracking_pl}
                        onChange={(e) => setNewRowData({ ...newRowData, tracking_pl: e.target.value })}
                        placeholder="Трекінг"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={newRowData.part_number}
                        onChange={(e) => setNewRowData({ ...newRowData, part_number: e.target.value })}
                        placeholder="№"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={newRowData.order_date}
                        onChange={(e) => setNewRowData({ ...newRowData, order_date: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={saveNewRow}
                          className="px-3 py-2 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition flex items-center gap-1"
                        >
                          <Check size={14} />
                          Зберегти
                        </button>
                        <button
                          onClick={cancelNewRow}
                          className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center gap-1"
                        >
                          <X size={14} />
                          Скасувати
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr className="bg-green-50 dark:bg-green-900/30">
                    <td colSpan={10} className="px-3 py-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Вартість запчастини (zl)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newRowData.part_price}
                            onChange={(e) => setNewRowData({ ...newRowData, part_price: Number(e.target.value) })}
                            placeholder="0"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Доставка (zl)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newRowData.delivery_cost}
                            onChange={(e) => setNewRowData({ ...newRowData, delivery_cost: Number(e.target.value) })}
                            placeholder="0"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Всього (zl)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newRowData.total_cost}
                            disabled
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Тип оплати</label>
                          <select
                            value={newRowData.payment_type}
                            onChange={(e) => setNewRowData({ ...newRowData, payment_type: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                          >
                            {paymentTypes.map((type) => (
                              <option key={type} value={type}>{paymentTypeLabels[type]}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Побранє (zl)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newRowData.cash_on_delivery}
                            onChange={(e) => setNewRowData({ ...newRowData, cash_on_delivery: Number(e.target.value) })}
                            placeholder="0"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Трекінг повернення до постачальника</label>
                          <input
                            type="text"
                            value={newRowData.return_tracking_to_supplier}
                            onChange={(e) => setNewRowData({ ...newRowData, return_tracking_to_supplier: e.target.value })}
                            placeholder="Трекінг"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Статус повернення коштів</label>
                          <select
                            value={newRowData.refund_status}
                            onChange={(e) => setNewRowData({ ...newRowData, refund_status: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                          >
                            <option value="">Не вказано</option>
                            {refundStatuses.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Посилання на обговорення</label>
                          <input
                            type="text"
                            value={newRowData.discussion_link}
                            onChange={(e) => setNewRowData({ ...newRowData, discussion_link: e.target.value })}
                            placeholder="https://"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Менеджер</label>
                          <select
                            value={newRowData.manager_id}
                            onChange={(e) => setNewRowData({ ...newRowData, manager_id: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                          >
                            <option value="">Не призначено</option>
                            {managers.map((manager) => (
                              <option key={manager.id} value={manager.id}>{manager.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="lg:col-span-3">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Опис ситуації</label>
                          <textarea
                            value={newRowData.situation_description}
                            onChange={(e) => setNewRowData({ ...newRowData, situation_description: e.target.value })}
                            rows={3}
                            placeholder="Опишіть ситуацію..."
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-green-400"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                </>
              )}
              {returns.map((returnItem) => (
                <>
                  <tr key={returnItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => toggleRowExpansion(returnItem.id)}
                        className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition"
                      >
                        {expandedRows.has(returnItem.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </td>
                    <td className="p-0 relative">
                      <select
                        value={returnItem.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          const shouldArchive = newStatus === 'проблемні' || newStatus === 'анульовано';
                          await supabase
                            .from('returns')
                            .update({
                              status: newStatus,
                              archived: shouldArchive,
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', returnItem.id);
                          loadReturns();
                        }}
                        className={`w-full h-full px-3 py-2 text-xs font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusColors[returnItem.status]}`}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-0 relative">
                      <select
                        value={returnItem.substatus}
                        onChange={async (e) => {
                          const newSubstatus = e.target.value;
                          await supabase
                            .from('returns')
                            .update({ substatus: newSubstatus, updated_at: new Date().toISOString() })
                            .eq('id', returnItem.id);
                          loadReturns();
                        }}
                        className={`w-full h-full px-3 py-2 text-xs font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${substatusColors[returnItem.substatus]}`}
                      >
                        {substatuses.map((substatus) => (
                          <option key={substatus} value={substatus}>{substatus}</option>
                        ))}
                      </select>
                    </td>
                    {renderEditableCell(returnItem.id, 'client_id', returnItem.client_id, 'text-gray-900 dark:text-gray-100 text-center')}
                    {renderEditableCell(returnItem.id, 'title', returnItem.title, 'text-gray-900 dark:text-gray-100 text-center')}
                    {renderLinkCell(returnItem.id, returnItem.link || '')}
                    {renderEditableCell(returnItem.id, 'tracking_pl', returnItem.tracking_pl || '', 'text-gray-600 dark:text-gray-300 text-center')}
                    {renderEditableCell(returnItem.id, 'part_number', returnItem.part_number || '', 'text-gray-600 dark:text-gray-300 text-center')}
                    <td
                      className="px-3 py-2 text-center text-gray-600 dark:text-gray-300 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                      onClick={() => startEditing(returnItem.id, 'order_date', returnItem.order_date)}
                    >
                      {editingCell?.returnId === returnItem.id && editingCell?.field === 'order_date' ? (
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveInlineEdit}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-blue-400 dark:focus:ring-blue-400 text-sm"
                        />
                      ) : (
                        formatDate(returnItem.order_date)
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleReturnToOrders(returnItem)}
                          className="px-3 py-2 bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 rounded text-xs font-semibold hover:opacity-80 transition flex items-center gap-1"
                        >
                          <RotateCcw size={14} />
                          Повернути в замовлення
                        </button>
                        <button
                          onClick={() => handleDelete(returnItem.id)}
                          className="px-3 py-2 bg-red-100 dark:bg-red-800/50 text-red-800 dark:text-red-200 rounded text-xs font-semibold hover:opacity-80 transition flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Вид.
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(returnItem.id) && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={10} className="px-3 py-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Вартість запчастини (zl)</label>
                            <div
                              className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                              onClick={() => startEditing(returnItem.id, 'part_price', returnItem.part_price)}
                            >
                              {editingCell?.returnId === returnItem.id && editingCell?.field === 'part_price' ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={handleKeyDown}
                                  autoFocus
                                  className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-blue-400 dark:focus:ring-blue-400 text-sm"
                                />
                              ) : (
                                `${formatNumber(returnItem.part_price)} zl`
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Доставка (zl)</label>
                            <div
                              className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                              onClick={() => startEditing(returnItem.id, 'delivery_cost', returnItem.delivery_cost)}
                            >
                              {editingCell?.returnId === returnItem.id && editingCell?.field === 'delivery_cost' ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={handleKeyDown}
                                  autoFocus
                                  className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-blue-400 dark:focus:ring-blue-400 text-sm"
                                />
                              ) : (
                                `${formatNumber(returnItem.delivery_cost)} zl`
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Всього (zl)</label>
                            <div className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold">
                              {formatNumber(returnItem.total_cost)} zl
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Тип оплати</label>
                            <select
                              value={returnItem.payment_type}
                              onChange={async (e) => {
                                const newPaymentType = e.target.value;
                                await supabase
                                  .from('returns')
                                  .update({
                                    payment_type: newPaymentType,
                                    cash_on_delivery: newPaymentType === 'оплачено' ? 0 : returnItem.cash_on_delivery,
                                    updated_at: new Date().toISOString()
                                  })
                                  .eq('id', returnItem.id);
                                loadReturns();
                              }}
                              className={`w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${paymentTypeColors[returnItem.payment_type]} font-semibold`}
                            >
                              {paymentTypes.map((type) => (
                                <option key={type} value={type}>{paymentTypeLabels[type]}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Побранє (zl)</label>
                            <div
                              className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                              onClick={() => startEditing(returnItem.id, 'cash_on_delivery', returnItem.cash_on_delivery)}
                            >
                              {editingCell?.returnId === returnItem.id && editingCell?.field === 'cash_on_delivery' ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={handleKeyDown}
                                  autoFocus
                                  className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-blue-400 dark:focus:ring-blue-400 text-sm"
                                />
                              ) : (
                                `${formatNumber(returnItem.cash_on_delivery)} zl`
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Трекінг повернення до постачальника</label>
                            <div
                              className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                              onClick={() => startEditing(returnItem.id, 'return_tracking_to_supplier', returnItem.return_tracking_to_supplier)}
                            >
                              {editingCell?.returnId === returnItem.id && editingCell?.field === 'return_tracking_to_supplier' ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={handleKeyDown}
                                  autoFocus
                                  className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-blue-400 dark:focus:ring-blue-400 text-sm"
                                />
                              ) : (
                                returnItem.return_tracking_to_supplier || '-'
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Статус повернення коштів</label>
                            <select
                              value={returnItem.refund_status || ''}
                              onChange={async (e) => {
                                const newRefundStatus = e.target.value || null;
                                await supabase
                                  .from('returns')
                                  .update({ refund_status: newRefundStatus, updated_at: new Date().toISOString() })
                                  .eq('id', returnItem.id);
                                loadReturns();
                              }}
                              className={`w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${returnItem.refund_status ? refundStatusColors[returnItem.refund_status] : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'} font-semibold`}
                            >
                              <option value="">Не вказано</option>
                              {refundStatuses.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Посилання на обговорення</label>
                            <div
                              className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                              onClick={() => startEditing(returnItem.id, 'discussion_link', returnItem.discussion_link)}
                            >
                              {editingCell?.returnId === returnItem.id && editingCell?.field === 'discussion_link' ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={handleKeyDown}
                                  autoFocus
                                  className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-blue-400 dark:focus:ring-blue-400 text-sm"
                                />
                              ) : returnItem.discussion_link ? (
                                <a
                                  href={returnItem.discussion_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Відкрити
                                </a>
                              ) : (
                                '-'
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Менеджер</label>
                            <select
                              value={returnItem.manager_id || ''}
                              onChange={async (e) => {
                                const newManagerId = e.target.value || null;
                                await supabase
                                  .from('returns')
                                  .update({ manager_id: newManagerId, updated_at: new Date().toISOString() })
                                  .eq('id', returnItem.id);
                                loadReturns();
                              }}
                              className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="">Не призначено</option>
                              {managers.map((manager) => (
                                <option key={manager.id} value={manager.id}>{manager.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="lg:col-span-3">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Опис ситуації</label>
                            <div
                              className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition min-h-[60px]"
                              onClick={() => startEditing(returnItem.id, 'situation_description', returnItem.situation_description)}
                            >
                              {editingCell?.returnId === returnItem.id && editingCell?.field === 'situation_description' ? (
                                <textarea
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={handleKeyDown}
                                  autoFocus
                                  rows={3}
                                  className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-blue-400 dark:focus:ring-blue-400 text-sm"
                                />
                              ) : (
                                returnItem.situation_description || '-'
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}