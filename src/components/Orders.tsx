import { useState, useEffect, useRef } from 'react';
import { supabase, Order, Supplier } from '../lib/supabase';
import { Plus, CreditCard as Edit, Archive, X, ExternalLink, ChevronDown, Layers, ChevronUp, Check, RotateCcw } from 'lucide-react';
import Returns from './Returns';

type AcceptedOrder = {
  id: string;
  receipt_number: string;
  order_number: string | null;
  tracking_number: string | null;
  weight_kg: number;
  part_price: number;
  delivery_cost: number;
  received_pln: number;
  cash_on_delivery: number;
  transport_cost_usd: number;
  payment_type: string | null;
  accepted_at: string;
  supplier?: Supplier;
};

export default function Orders() {
  const [orders, setOrders] = useState<(Order & { supplier: Supplier })[]>([]);
  const [acceptedOrders, setAcceptedOrders] = useState<AcceptedOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [returnsCount, setReturnsCount] = useState<number>(0);
  const [artTransId, setArtTransId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openPaymentDropdown, setOpenPaymentDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [paymentDropdownPosition, setPaymentDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [isGrouped, setIsGrouped] = useState(false);
  const [groupBy, setGroupBy] = useState<'status' | 'payment' | 'verified'>('status');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ orderId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isAddingNewRow, setIsAddingNewRow] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'orders' | 'returns'>('orders');
  const [activeViewTab, setActiveViewTab] = useState<'active' | 'archived' | 'cancelled' | 'accepted'>('active');
  const [newRowData, setNewRowData] = useState({
    order_number: '',
    supplier_id: '',
    status: 'в роботі на сьогодні',
    order_date: new Date().toISOString().split('T')[0],
    notes: '',
    title: '',
    link: '',
    tracking_pl: '',
    part_price: 0,
    delivery_cost: 0,
    total_cost: 0,
    part_number: '',
    payment_type: 'не обрано',
    cash_on_delivery: 0,
    client_id: '',
    received_pln: 0,
    transport_cost_usd: 0,
    weight_kg: 0,
    verified: false
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [formData, setFormData] = useState({
    order_number: '',
    supplier_id: '',
    status: 'в роботі на сьогодні',
    order_date: new Date().toISOString().split('T')[0],
    notes: '',
    title: '',
    link: '',
    tracking_pl: '',
    part_price: 0,
    delivery_cost: 0,
    total_cost: 0,
    part_number: '',
    payment_type: 'не обрано',
    cash_on_delivery: 0,
    client_id: '',
    received_pln: 0,
    transport_cost_usd: 0,
    weight_kg: 0,
    verified: false
  });

  useEffect(() => {
    loadOrders();
    loadAcceptedOrders();
    loadSuppliers();
    loadArtTransId();
    loadReturnsCount();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [activeViewTab]);

  useEffect(() => {
    if (activeTab === 'returns') {
      loadReturnsCount();
    }
  }, [activeTab]);

  useEffect(() => {
    if (editingCell) {
      if (inputRef.current) {
        inputRef.current.focus();
      } else if (selectRef.current) {
        selectRef.current.focus();
      }
    }
  }, [editingCell]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target as Node)) {
        setOpenPaymentDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const totalCost = Number(formData.part_price) + Number(formData.delivery_cost);
    setFormData(prev => ({ ...prev, total_cost: totalCost }));
  }, [formData.part_price, formData.delivery_cost]);

  useEffect(() => {
    if (formData.payment_type === 'оплачено' || formData.payment_type === 'не обрано') {
      setFormData(prev => ({ ...prev, cash_on_delivery: 0 }));
    }
  }, [formData.payment_type]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  useEffect(() => {
    const totalCost = Number(newRowData.part_price) + Number(newRowData.delivery_cost);
    setNewRowData(prev => ({ ...prev, total_cost: totalCost }));
  }, [newRowData.part_price, newRowData.delivery_cost]);

  useEffect(() => {
    if (newRowData.payment_type === 'оплачено' || newRowData.payment_type === 'не обрано') {
      setNewRowData(prev => ({ ...prev, cash_on_delivery: 0 }));
    }
  }, [newRowData.payment_type]);

  async function loadArtTransId() {
    const { data } = await supabase
      .from('suppliers')
      .select('id')
      .eq('name', 'ART TRANS')
      .maybeSingle();

    if (data) {
      setArtTransId(data.id);
      setFormData(prev => ({ ...prev, supplier_id: data.id }));
    }
  }

  async function loadReturnsCount() {
    const { count } = await supabase
      .from('returns')
      .select('*', { count: 'exact', head: true });

    if (count !== null) {
      setReturnsCount(count);
    }
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, supplier:suppliers(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as any);
    }
  }

  async function loadAcceptedOrders() {
    const { data, error } = await supabase
      .from('accepted_orders')
      .select('*, supplier:suppliers(name)')
      .order('accepted_at', { ascending: false });

    if (!error && data) {
      setAcceptedOrders(data as any);
    }
  }

  async function loadSuppliers() {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (data) setSuppliers(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const dataToSubmit: any = { ...formData };

    if (!dataToSubmit.supplier_id || dataToSubmit.supplier_id === '') {
      delete dataToSubmit.supplier_id;
    }

    if (dataToSubmit.client_id === '') {
      delete dataToSubmit.client_id;
    }

    try {
      if (editingOrder) {
        const { error } = await supabase
          .from('orders')
          .update(dataToSubmit)
          .eq('id', editingOrder.id);
        if (error) {
          console.error('Error updating order:', error);
          alert('Помилка при оновленні замовлення: ' + error.message);
          return;
        }
      } else {
        const { error } = await supabase.from('orders').insert([dataToSubmit]);
        if (error) {
          console.error('Error inserting order:', error);
          alert('Помилка при створенні замовлення: ' + error.message);
          return;
        }
      }

      setIsModalOpen(false);
      setEditingOrder(null);
      resetForm();
      loadOrders();
    } catch (err) {
      console.error('Network error:', err);
      alert('Помилка мережі: Перевірте підключення до інтернету та налаштування Supabase.\n\nДеталі: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function handleArchive(id: string) {
    const order = orders.find(o => o.id === id);
    const isArchived = order?.archived || false;
    const action = isArchived ? 'розархівувати' : 'архівувати';
    if (confirm(`Ви впевнені що хочете ${action} це замовлення?`)) {
      await supabase
        .from('orders')
        .update({
          archived: !isArchived,
          archived_at: !isArchived ? new Date().toISOString() : null
        })
        .eq('id', id);
      loadOrders();
    }
  }

  async function handleReturn(order: Order & { supplier: Supplier }) {
    if (confirm('Створити повернення з цього замовлення?')) {
      const { error } = await supabase.from('returns').insert({
        status: 'повернення',
        substatus: 'В Арта в хелмі',
        client_id: order.client_id || '',
        title: order.title || '',
        link: order.link || '',
        tracking_pl: order.tracking_pl || '',
        part_price: order.part_price || 0,
        delivery_cost: order.delivery_cost || 0,
        total_cost: order.total_cost || 0,
        part_number: order.part_number || '',
        payment_type: order.payment_type || '',
        cash_on_delivery: order.cash_on_delivery || 0,
        order_date: order.order_date || new Date().toISOString(),
        return_tracking_to_supplier: ''
      });

      if (!error) {
        alert('Повернення створено успішно!');
        loadReturnsCount();
      }
    }
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
      setOpenDropdown(null);
    }
  }

  async function handlePaymentTypeChange(orderId: string, newPaymentType: string) {
    const { error } = await supabase
      .from('orders')
      .update({ payment_type: newPaymentType })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
      setOpenPaymentDropdown(null);
    }
  }

  async function handleVerifiedChange(orderId: string, verified: boolean) {
    const { error } = await supabase
      .from('orders')
      .update({ verified: !verified })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
    }
  }

  function startEditing(orderId: string, field: string, currentValue: any) {
    setEditingCell({ orderId, field });
    let cleanValue = String(currentValue);
    cleanValue = cleanValue.replace(/ (zl|\$|кг)$/, '');
    setEditValue(cleanValue);
  }

  async function saveInlineEdit() {
    if (!editingCell) return;

    const { orderId, field } = editingCell;
    let valueToSave: any = editValue;

    let cleanValue = editValue.replace(/ (zl|\$|кг)$/, '').trim();

    if (['part_price', 'delivery_cost', 'total_cost', 'received_pln', 'transport_cost_usd', 'weight_kg', 'cash_on_delivery'].includes(field)) {
      valueToSave = parseFloat(cleanValue) || 0;
    }

    const updateData: any = { [field]: valueToSave };

    if (field === 'payment_type' && (valueToSave === 'оплачено' || valueToSave === 'не обрано')) {
      updateData.cash_on_delivery = 0;
    }

    if (field === 'part_price' || field === 'delivery_cost') {
      const currentOrder = orders.find(o => o.id === orderId);
      if (currentOrder) {
        const partPrice = field === 'part_price' ? valueToSave : currentOrder.part_price;
        const deliveryCost = field === 'delivery_cost' ? valueToSave : currentOrder.delivery_cost;
        updateData.total_cost = partPrice + deliveryCost;
      }
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (!error) {
      loadOrders();
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
      saveInlineEdit();
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

  function getFontSizeClass(value: string) {
    const length = value?.toString().length || 0;
    if (length > 50) return 'text-[10px] leading-tight';
    if (length > 35) return 'text-[11px] leading-tight';
    if (length > 25) return 'text-xs leading-snug';
    if (length > 15) return 'text-xs';
    return 'text-sm';
  }

  function renderEditableCell(orderId: string, field: string, value: any, className: string = '') {
    const isEditing = editingCell?.orderId === orderId && editingCell?.field === field;

    if (isEditing) {
      return (
        <td className="px-3 py-3 min-h-[48px]">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveInlineEdit}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </td>
      );
    }

    const fontSizeClass = getFontSizeClass(value);
    const isTitle = field === 'title';

    return (
      <td
        className={`px-3 py-3 cursor-pointer hover:bg-blue-50 transition min-h-[48px] ${isTitle ? 'min-w-[200px]' : ''} ${className.replace(/text-(sm|xs|base)/g, '')} ${fontSizeClass}`}
        onClick={() => startEditing(orderId, field, value)}
        title={value}
      >
        <div className={`w-full ${isTitle ? 'line-clamp-3 break-words' : 'break-words whitespace-normal'}`}>
          {value}
        </div>
      </td>
    );
  }

  function renderLinkCell(orderId: string, link: string) {
    const isEditing = editingCell?.orderId === orderId && editingCell?.field === 'link';

    if (isEditing) {
      return (
        <td className="px-3 py-3 text-center min-h-[48px]">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveInlineEdit}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="https://"
          />
        </td>
      );
    }

    return (
      <td
        className="px-3 py-3 text-center cursor-pointer hover:bg-blue-50 transition min-h-[48px]"
        onClick={() => startEditing(orderId, 'link', link)}
        title="Клікніть для редагування посилання"
      >
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={16} />
          </a>
        ) : (
          <span className="text-gray-300">
            <ExternalLink size={16} />
          </span>
        )}
      </td>
    );
  }

  function renderDateCell(orderId: string, dateValue: string, className: string = '') {
    const isEditing = editingCell?.orderId === orderId && editingCell?.field === 'order_date';

    if (isEditing) {
      return (
        <td className="px-3 py-3 min-h-[48px]">
          <input
            ref={inputRef}
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveInlineEdit}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </td>
      );
    }

    const fontSizeClass = getFontSizeClass(formatDate(dateValue));

    return (
      <td
        className={`px-3 py-3 cursor-pointer hover:bg-blue-50 transition min-h-[48px] ${className.replace(/text-(sm|xs|base)/g, '')} ${fontSizeClass}`}
        onClick={() => startEditing(orderId, 'order_date', dateValue)}
        title="Клікніть для редагування дати"
      >
        <div className="w-full break-words whitespace-normal">
          {formatDate(dateValue)}
        </div>
      </td>
    );
  }

  function renderPaymentTypeCell(orderId: string, paymentType: string) {
    const displayPaymentType = paymentType || 'не обрано';
    return (
      <td className="p-0 relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const dropdownHeight = 300;
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            const shouldShowAbove = spaceBelow < 150 && spaceAbove > spaceBelow;
            const top = shouldShowAbove
              ? Math.max(20, rect.top + window.scrollY - Math.min(dropdownHeight, spaceAbove - 20))
              : rect.bottom + window.scrollY;

            setPaymentDropdownPosition({ top, left: rect.left + window.scrollX });
            setOpenPaymentDropdown(openPaymentDropdown === orderId ? null : orderId);
          }}
          className={`w-full h-full px-3 py-3 text-xs font-semibold ${paymentTypeColors[displayPaymentType]} hover:opacity-80 transition flex items-center justify-center gap-1 min-h-[48px]`}
        >
          {paymentTypeLabels[displayPaymentType]}
          <ChevronDown size={14} />
        </button>
      </td>
    );
  }

  function openEditModal(order: Order) {
    setEditingOrder(order);
    setFormData({
      order_number: order.order_number,
      supplier_id: order.supplier_id,
      status: order.status,
      order_date: order.order_date,
      notes: order.notes,
      title: order.title || '',
      link: order.link || '',
      tracking_pl: order.tracking_pl || '',
      part_price: order.part_price || 0,
      delivery_cost: order.delivery_cost || 0,
      total_cost: order.total_cost || 0,
      part_number: order.part_number || '',
      payment_type: order.payment_type || 'не обрано',
      cash_on_delivery: order.cash_on_delivery || 0,
      client_id: order.client_id || '',
      received_pln: order.received_pln || 0,
      transport_cost_usd: order.transport_cost_usd || 0,
      weight_kg: order.weight_kg || 0,
      verified: order.verified || false
    });
    setIsModalOpen(true);
  }

  function resetForm() {
    setFormData({
      order_number: '',
      supplier_id: artTransId,
      status: 'в роботі на сьогодні',
      order_date: new Date().toISOString().split('T')[0],
      notes: '',
      title: '',
      link: '',
      tracking_pl: '',
      part_price: 0,
      delivery_cost: 0,
      total_cost: 0,
      part_number: '',
      payment_type: 'не обрано',
      cash_on_delivery: 0,
      client_id: '',
      received_pln: 0,
      transport_cost_usd: 0,
      weight_kg: 0,
      verified: false
    });
  }

  function startAddingNewRow() {
    setIsAddingNewRow(true);
    setNewRowData({
      order_number: '',
      supplier_id: artTransId,
      status: 'в роботі на сьогодні',
      order_date: new Date().toISOString().split('T')[0],
      notes: '',
      title: '',
      link: '',
      tracking_pl: '',
      part_price: 0,
      delivery_cost: 0,
      total_cost: 0,
      part_number: '',
      payment_type: 'не обрано',
      cash_on_delivery: 0,
      client_id: '',
      received_pln: 0,
      transport_cost_usd: 0,
      weight_kg: 0,
      verified: false
    });
  }

  async function saveNewRow() {
    if (!newRowData.client_id || newRowData.client_id.trim() === '') {
      alert('ID клієнта є обов\'язковим полем!');
      return;
    }

    if (!newRowData.title || newRowData.title.trim() === '') {
      alert('Назва є обов\'язковим полем!');
      return;
    }

    if (!newRowData.link || newRowData.link.trim() === '') {
      alert('Посилання є обов\'язковим полем!');
      return;
    }

    const dataToSubmit: any = { ...newRowData };

    if (!dataToSubmit.supplier_id || dataToSubmit.supplier_id === '') {
      delete dataToSubmit.supplier_id;
    }

    try {
      const { error } = await supabase.from('orders').insert([dataToSubmit]);
      if (error) {
        console.error('Error inserting order:', error);
        alert('Помилка при створенні замовлення: ' + error.message);
        return;
      }

      setIsAddingNewRow(false);
      loadOrders();
    } catch (err) {
      console.error('Network error:', err);
      alert('Помилка мережі: Перевірте підключення до інтернету та налаштування Supabase.\n\nДеталі: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  function cancelNewRow() {
    setIsAddingNewRow(false);
  }

  function handleNewRowKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      saveNewRow();
    } else if (e.key === 'Escape') {
      cancelNewRow();
    }
  }

  function toggleOrderSelection(orderId: string) {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }

  function toggleAllOrders() {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  }

  async function bulkUpdateStatus(newStatus: string) {
    const updates = Array.from(selectedOrders).map(orderId =>
      supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    );

    await Promise.all(updates);
    loadOrders();
    setSelectedOrders(new Set());
  }

  async function bulkUpdateVerified(verified: boolean) {
    const updates = Array.from(selectedOrders).map(orderId =>
      supabase.from('orders').update({ verified }).eq('id', orderId)
    );

    await Promise.all(updates);
    loadOrders();
    setSelectedOrders(new Set());
  }

  const statusColors: Record<string, string> = {
    'в роботі на сьогодні': 'bg-blue-100 text-blue-800',
    'на броні': 'bg-purple-100 text-purple-800',
    'очікується': 'bg-yellow-100 text-yellow-800',
    'прийнято сьогодні': 'bg-green-100 text-green-800',
    'прийнято': 'bg-green-200 text-green-900',
    'на складі': 'bg-teal-100 text-teal-800',
    'в дорозі': 'bg-orange-100 text-orange-800',
    'в вигрузці': 'bg-cyan-100 text-cyan-800',
    'готово до відправки': 'bg-lime-100 text-lime-800',
    'в активному прийомі': 'bg-indigo-100 text-indigo-800',
    'на звірці': 'bg-violet-100 text-violet-800',
    'повернення': 'bg-amber-100 text-amber-800',
    'проблемні': 'bg-red-100 text-red-800',
    'анульовано': 'bg-gray-100 text-gray-800'
  };

  const paymentTypeColors: Record<string, string> = {
    'не обрано': 'bg-gray-100 text-gray-800',
    'оплачено': 'bg-green-100 text-green-800',
    'побранє': 'bg-orange-100 text-orange-800',
    'самовивіз pl': 'bg-blue-100 text-blue-800'
  };

  const paymentTypeLabels: Record<string, string> = {
    'не обрано': 'Не обрано',
    'оплачено': 'Оплачено',
    'побранє': 'Побранє',
    'самовивіз pl': 'Самовивіз PL'
  };

  const paymentTypes = ['не обрано', 'оплачено', 'побранє', 'самовивіз pl'];

  const statusLabels: Record<string, string> = {
    'в роботі на сьогодні': 'В роботі на сьогодні',
    'на броні': 'На броні',
    'очікується': 'Очікується',
    'прийнято сьогодні': 'Прийнято сьогодні',
    'прийнято': 'Прийнято',
    'на складі': 'На складі',
    'в дорозі': 'В дорозі',
    'в вигрузці': 'В вигрузці',
    'готово до відправки': 'Готово до відправки',
    'в активному прийомі': 'В активному прийомі',
    'на звірці': 'На звірці',
    'повернення': 'Повернення',
    'проблемні': 'Проблемні',
    'анульовано': 'Анульовано'
  };

  const statuses = [
    'в роботі на сьогодні',
    'на броні',
    'очікується',
    'прийнято сьогодні',
    'прийнято',
    'на складі',
    'в дорозі',
    'в вигрузці',
    'готово до відправки',
    'в активному прийомі',
    'на звірці',
    'повернення',
    'проблемні',
    'анульовано'
  ];

  const groupOrdersByStatus = () => {
    const grouped: Record<string, (Order & { supplier: Supplier })[]> = {};
    statuses.forEach(status => {
      grouped[status] = filteredOrders.filter(order => order.status === status);
    });
    return grouped;
  };

  const groupOrdersByPaymentType = () => {
    const grouped: Record<string, (Order & { supplier: Supplier })[]> = {};
    paymentTypes.forEach(type => {
      grouped[type] = filteredOrders.filter(order => (order.payment_type || 'не обрано') === type);
    });
    return grouped;
  };

  const groupOrdersByVerified = () => {
    const grouped: Record<string, (Order & { supplier: Supplier })[]> = {
      'verified': filteredOrders.filter(order => order.verified),
      'not_verified': filteredOrders.filter(order => !order.verified)
    };
    return grouped;
  };

  const verifiedColors: Record<string, string> = {
    'verified': 'bg-green-100 text-green-800',
    'not_verified': 'bg-gray-100 text-gray-800'
  };

  const verifiedLabels: Record<string, string> = {
    'verified': 'Відзначено V',
    'not_verified': 'Не відзначено'
  };

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'returns') {
      return false;
    }

    if (activeViewTab === 'active') {
      return !order.archived && order.status !== 'анульовано' && order.status !== 'прийнято';
    } else if (activeViewTab === 'cancelled') {
      return order.status === 'анульовано';
    } else if (activeViewTab === 'archived') {
      return order.archived === true;
    } else if (activeViewTab === 'accepted') {
      return order.status === 'прийнято';
    }
    return false;
  });

  return (
    <div className="h-full flex flex-col p-4 max-w-[98%] mx-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Замовлення</h2>
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow dark:shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Замовлення ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'returns'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow dark:shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Повернення ({returnsCount})
            </button>
          </div>
        </div>
        {activeTab === 'orders' && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsGrouped(!isGrouped)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                isGrouped
                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Layers size={20} />
              {isGrouped ? 'Стандартний вигляд' : 'Групувати'}
            </button>
            {isGrouped && (
              <select
                value={groupBy}
                onChange={(e) => {
                  setGroupBy(e.target.value as 'status' | 'payment' | 'verified');
                  setCollapsedGroups(new Set());
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="status">За статусом</option>
                <option value="payment">За типом оплати</option>
                <option value="verified">За Vortex</option>
              </select>
            )}
            <button
              onClick={() => setIsModalOpen(!isModalOpen)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition"
            >
              {isModalOpen ? <X size={20} /> : <Plus size={20} />}
              {isModalOpen ? 'Скасувати' : 'Нове замовлення'}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'orders' && (
        <div className="flex gap-2 mb-4 bg-gray-50 dark:bg-gray-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveViewTab('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeViewTab === 'active'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow dark:shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Активні ({orders.filter(o => !o.archived && o.status !== 'анульовано' && o.status !== 'прийнято').length})
          </button>
          <button
            onClick={() => setActiveViewTab('accepted')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeViewTab === 'accepted'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow dark:shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Прийняті ({orders.filter(o => o.status === 'прийнято').length})
          </button>
          <button
            onClick={() => setActiveViewTab('cancelled')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeViewTab === 'cancelled'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow dark:shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Анульовані ({orders.filter(o => o.status === 'анульовано').length})
          </button>
          <button
            onClick={() => setActiveViewTab('archived')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeViewTab === 'archived'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow dark:shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Архів ({orders.filter(o => o.archived === true).length})
          </button>
        </div>
      )}

      {activeTab === 'orders' && isModalOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 p-6 flex-shrink-0">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            {editingOrder ? 'Редагувати замовлення' : 'Нове замовлення'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Номер замовлення</label>
                <input
                  type="text"
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Назва товару</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Посилання</label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Статус</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="в роботі на сьогодні" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">В роботі на сьогодні</option>
                  <option value="на броні" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">На броні</option>
                  <option value="очікується" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Очікується</option>
                  <option value="прийнято сьогодні" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Прийнято сьогодні</option>
                  <option value="на складі" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">На складі</option>
                  <option value="в дорозі" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">В дорозі</option>
                  <option value="в вигрузці" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">В вигрузці</option>
                  <option value="готово до відправки" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Готово до відправки</option>
                  <option value="повернення" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Повернення</option>
                  <option value="проблемні" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Проблемні</option>
                  <option value="анульовано" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Анульовано</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Трекінг PL</label>
                <input
                  type="text"
                  value={formData.tracking_pl}
                  onChange={(e) => setFormData({ ...formData, tracking_pl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID клієнта</label>
                <input
                  type="text"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата замовлення</label>
                <input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Вартість запчастини (zł)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.part_price}
                  onChange={(e) => setFormData({ ...formData, part_price: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Доставка (zł)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.delivery_cost}
                  onChange={(e) => setFormData({ ...formData, delivery_cost: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Всього (zł)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_cost}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Номер запчастини</label>
                <input
                  type="text"
                  value={formData.part_number}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип оплати</label>
                <select
                  value={formData.payment_type}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="не обрано" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Не обрано</option>
                  <option value="оплачено" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Оплачено</option>
                  <option value="побранє" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Побранє</option>
                  <option value="самовивіз pl" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Самовивіз PL</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Прийом zł</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.received_pln}
                  onChange={(e) => setFormData({ ...formData, received_pln: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Перевезення ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.transport_cost_usd}
                  onChange={(e) => setFormData({ ...formData, transport_cost_usd: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Вага (кг)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Побранє (zł)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cash_on_delivery}
                  onChange={(e) => setFormData({ ...formData, cash_on_delivery: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.verified}
                    onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                    className="w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">V</span>
                </label>
              </div>

              <div className="lg:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Примітки</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition font-medium"
              >
                {editingOrder ? 'Зберегти' : 'Створити'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingOrder(null);
                  resetForm();
                }}
                className="bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition font-medium"
              >
                Скасувати
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'orders' && !isGrouped ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex-1 overflow-auto min-h-0 flex flex-col">
          {!isAddingNewRow && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <button
                onClick={startAddingNewRow}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition text-sm font-medium"
              >
                <Plus size={18} />
                Додати рядок
              </button>
              {selectedOrders.size > 0 && (
                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-700">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    Обрано: {selectedOrders.size}
                  </span>
                  <div className="flex gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          bulkUpdateStatus(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="px-3 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 transition text-gray-900 dark:text-gray-100"
                      defaultValue=""
                    >
                      <option value="" disabled>Змінити статус</option>
                      {statuses.map((status) => (
                        <option key={status} value={status} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{statusLabels[status]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => bulkUpdateVerified(true)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition"
                    >
                      Відзначити V
                    </button>
                    <button
                      onClick={() => bulkUpdateVerified(false)}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 transition"
                    >
                      Зняти V
                    </button>
                    <button
                      onClick={() => setSelectedOrders(new Set())}
                      className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleAllOrders}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Статус</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">V</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID клієнта</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Назва</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Посилання</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Трекінг PL</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Вартість запч.</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Доставка</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Всього</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">№ запчастини</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Тип оплати</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Побранє</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дата</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Прийом zl</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Перевезення $</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Вага кг</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {isAddingNewRow && (
                  <tr className="bg-green-50 dark:bg-green-900/50">
                    <td className="px-3 py-3 text-center min-h-[48px]"></td>
                    <td className="p-0 relative">
                      <select
                        value={newRowData.status}
                        onChange={(e) => setNewRowData({ ...newRowData, status: e.target.value })}
                        className="w-full h-full px-2 py-3 text-xs font-semibold border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-gray-900 dark:text-gray-100"
                      >
                        {statuses.map((status) => (
                          <option
                            key={status}
                            value={status}
                            className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center min-h-[48px]">
                      <input
                        type="checkbox"
                        checked={newRowData.verified}
                        onChange={(e) => setNewRowData({ ...newRowData, verified: e.target.checked })}
                        className="w-5 h-5 rounded cursor-pointer transition text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="text"
                        value={newRowData.client_id}
                        onChange={(e) => setNewRowData({ ...newRowData, client_id: e.target.value })}
                        onKeyDown={handleNewRowKeyDown}
                        placeholder="ID клієнта *"
                        className="w-full px-2 py-1 border border-red-300 dark:border-red-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="text"
                        value={newRowData.title}
                        onChange={(e) => setNewRowData({ ...newRowData, title: e.target.value })}
                        onKeyDown={handleNewRowKeyDown}
                        placeholder="Назва *"
                        className="w-full px-2 py-1 border border-red-300 dark:border-red-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="text"
                        value={newRowData.link}
                        onChange={(e) => setNewRowData({ ...newRowData, link: e.target.value })}
                        onKeyDown={handleNewRowKeyDown}
                        placeholder="Посилання *"
                        className="w-full px-2 py-1 border border-red-300 dark:border-red-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="text"
                        value={newRowData.tracking_pl}
                        onChange={(e) => setNewRowData({ ...newRowData, tracking_pl: e.target.value })}
                        onKeyDown={handleNewRowKeyDown}
                        placeholder="Трекінг"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="number"
                        step="0.01"
                        value={newRowData.part_price}
                        onChange={(e) => setNewRowData({ ...newRowData, part_price: Number(e.target.value) })}
                        onKeyDown={handleNewRowKeyDown}
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="number"
                        step="0.01"
                        value={newRowData.delivery_cost}
                        onChange={(e) => setNewRowData({ ...newRowData, delivery_cost: Number(e.target.value) })}
                        onKeyDown={handleNewRowKeyDown}
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 text-center text-gray-900 dark:text-gray-100 font-bold bg-gray-50 dark:bg-gray-700 min-h-[48px]">
                      {formatNumber(newRowData.total_cost)} zl
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="text"
                        value={newRowData.part_number}
                        onChange={(e) => setNewRowData({ ...newRowData, part_number: e.target.value })}
                        onKeyDown={handleNewRowKeyDown}
                        placeholder="№"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="p-0 relative">
                      <select
                        value={newRowData.payment_type}
                        onChange={(e) => setNewRowData({ ...newRowData, payment_type: e.target.value })}
                        className="w-full h-full px-2 py-3 text-xs font-semibold border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-gray-900 dark:text-gray-100"
                      >
                        {paymentTypes.map((type) => (
                          <option
                            key={type}
                            value={type}
                            className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {paymentTypeLabels[type]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="number"
                        step="0.01"
                        value={newRowData.cash_on_delivery}
                        onChange={(e) => setNewRowData({ ...newRowData, cash_on_delivery: Number(e.target.value) })}
                        onKeyDown={handleNewRowKeyDown}
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="date"
                        value={newRowData.order_date}
                        onChange={(e) => setNewRowData({ ...newRowData, order_date: e.target.value })}
                        onKeyDown={handleNewRowKeyDown}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="number"
                        step="0.01"
                        value={newRowData.received_pln}
                        onChange={(e) => setNewRowData({ ...newRowData, received_pln: Number(e.target.value) })}
                        onKeyDown={handleNewRowKeyDown}
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="number"
                        step="0.01"
                        value={newRowData.transport_cost_usd}
                        onChange={(e) => setNewRowData({ ...newRowData, transport_cost_usd: Number(e.target.value) })}
                        onKeyDown={handleNewRowKeyDown}
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <input
                        type="number"
                        step="0.01"
                        value={newRowData.weight_kg}
                        onChange={(e) => setNewRowData({ ...newRowData, weight_kg: Number(e.target.value) })}
                        onKeyDown={handleNewRowKeyDown}
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </td>
                    <td className="px-3 py-3 min-h-[48px]">
                      <div className="flex gap-2 justify-start">
                        <button
                          onClick={saveNewRow}
                          className="px-3 py-2 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition flex items-center gap-1"
                        >
                          <Check size={14} />
                          Зберегти
                        </button>
                        <button
                          onClick={cancelNewRow}
                          className="px-3 py-2 bg-gray-200 text-gray-800 rounded text-xs font-semibold hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition flex items-center gap-1"
                        >
                          <X size={14} />
                          Скасувати
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredOrders.map((order) => (
                <tr key={order.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedOrders.has(order.id) ? 'bg-blue-50 dark:bg-blue-900/50' : ''}`}>
                  <td className="px-3 py-3 text-center min-h-[48px]">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      className="w-4 h-4 rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-0 relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const dropdownHeight = 400;
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const spaceAbove = rect.top;

                        const shouldShowAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
                        const top = shouldShowAbove
                          ? Math.max(20, rect.top + window.scrollY - Math.min(dropdownHeight, spaceAbove - 20))
                          : rect.bottom + window.scrollY;

                        setDropdownPosition({ top, left: rect.left + window.scrollX });
                        setOpenDropdown(openDropdown === order.id ? null : order.id);
                      }}
                      className={`w-full h-full px-3 py-3 text-xs font-semibold ${statusColors[order.status]} hover:opacity-80 transition flex items-center justify-center gap-1 min-h-[48px]`}
                    >
                      {statusLabels[order.status]}
                      <ChevronDown size={14} />
                    </button>
                  </td>
                  <td className="px-3 py-3 text-center min-h-[48px]">
                    <input
                      type="checkbox"
                      checked={order.verified}
                      onChange={() => handleVerifiedChange(order.id, order.verified)}
                      className={`w-5 h-5 rounded cursor-pointer transition ${
                        order.verified
                          ? 'accent-green-600 bg-green-600'
                          : 'border-2 border-gray-800 accent-gray-800'
                      }`}
                    />
                  </td>
                  {renderEditableCell(order.id, 'client_id', order.client_id, 'text-gray-900 text-center')}
                  {renderEditableCell(order.id, 'title', order.title, 'text-gray-900 text-center')}
                  {renderLinkCell(order.id, order.link || '')}
                  {renderEditableCell(order.id, 'tracking_pl', order.tracking_pl || '', 'text-gray-600 text-center')}
                  {renderEditableCell(order.id, 'part_price', `${formatNumber(order.part_price)} zl`, 'text-gray-900 font-medium text-center')}
                  {renderEditableCell(order.id, 'delivery_cost', `${formatNumber(order.delivery_cost)} zl`, 'text-gray-900 text-center')}
                  <td className="px-3 py-3 text-center text-gray-900 font-bold bg-gray-50 min-h-[48px]">
                    {formatNumber(order.total_cost)} zl
                  </td>
                  {renderEditableCell(order.id, 'part_number', order.part_number || '', 'text-gray-600 text-center')}
                  {renderPaymentTypeCell(order.id, order.payment_type || 'оплачено')}
                  {renderEditableCell(order.id, 'cash_on_delivery', `${formatNumber(order.cash_on_delivery)} zl`, 'text-gray-900 text-center')}
                  {renderDateCell(order.id, order.order_date, 'text-gray-600 text-center')}
                  {renderEditableCell(order.id, 'received_pln', `${formatNumber(order.received_pln)} zl`, 'text-gray-900 text-center')}
                  {renderEditableCell(order.id, 'transport_cost_usd', `${formatNumber(order.transport_cost_usd)} $`, 'text-gray-900 text-center')}
                  {renderEditableCell(order.id, 'weight_kg', `${formatNumber(order.weight_kg)} кг`, 'text-gray-900 text-center')}
                  <td className="px-3 py-3 min-h-[48px]">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => openEditModal(order)}
                        className="px-3 py-2 bg-blue-100 text-blue-800 rounded text-xs font-semibold hover:opacity-80 transition flex items-center gap-1"
                      >
                        <Edit size={14} />
                        Ред.
                      </button>
                      {!order.archived && (
                        <button
                          onClick={() => handleReturn(order)}
                          className="px-3 py-2 bg-orange-100 text-orange-800 rounded text-xs font-semibold hover:opacity-80 transition flex items-center gap-1"
                          title="Створити повернення"
                        >
                          <RotateCcw size={14} />
                          Пов.
                        </button>
                      )}
                      <button
                        onClick={() => handleArchive(order.id)}
                        className="px-3 py-2 bg-gray-100 text-gray-800 rounded text-xs font-semibold hover:opacity-80 transition flex items-center gap-1"
                        title={order.archived ? 'Розархівувати' : 'Архівувати'}
                      >
                        <Archive size={14} />
                        {order.archived ? 'Розарх.' : 'Арх.'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : activeTab === 'orders' ? (
        <div className="flex-1 overflow-auto min-h-0 flex flex-col">
          {selectedOrders.size > 0 && (
            <div className="flex-shrink-0 p-3 bg-white border-b border-gray-200 flex justify-end items-center">
              <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                <span className="text-sm font-medium text-blue-900">
                  Обрано: {selectedOrders.size}
                </span>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        bulkUpdateStatus(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="px-3 py-1 text-sm border border-blue-300 rounded bg-white hover:bg-blue-50 transition"
                    defaultValue=""
                  >
                    <option value="" disabled>Змінити статус</option>
                    {statuses.map((status) => (
                      <option key={status} value={status}>{statusLabels[status]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => bulkUpdateVerified(true)}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                  >
                    Відзначити V
                  </button>
                  <button
                    onClick={() => bulkUpdateVerified(false)}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                  >
                    Зняти V
                  </button>
                  <button
                    onClick={() => setSelectedOrders(new Set())}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-auto space-y-4 p-4">
          {Object.entries(groupBy === 'status' ? groupOrdersByStatus() : groupBy === 'payment' ? groupOrdersByPaymentType() : groupOrdersByVerified()).map(([key, groupOrders]) => {
            if (groupOrders.length === 0) return null;
            const isCollapsed = collapsedGroups.has(key);
            const colors = groupBy === 'status' ? statusColors[key] : groupBy === 'payment' ? paymentTypeColors[key] : verifiedColors[key];
            const label = groupBy === 'status' ? statusLabels[key] : groupBy === 'payment' ? paymentTypeLabels[key] : verifiedLabels[key];

            return (
              <div key={key} className="bg-white rounded-lg shadow">
                <button
                  onClick={() => toggleGroupCollapse(key)}
                  className={`w-full px-4 py-3 font-semibold text-sm ${colors} flex items-center justify-between hover:opacity-90 transition`}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    <span>{label}</span>
                  </div>
                  <span className="bg-white/30 px-2 py-1 rounded-full text-xs">{groupOrders.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                          <input
                            type="checkbox"
                            checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                            onChange={toggleAllOrders}
                            className="w-4 h-4 rounded cursor-pointer"
                          />
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Статус</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">V</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">ID клієнта</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Назва</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Посилання</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Трекінг PL</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Вартість запч.</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Доставка</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Всього</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">№ запчастини</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Тип оплати</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Побранє</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Дата</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Прийом zl</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Перевезення $</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Вага кг</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Дії</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {groupOrders.map((order) => (
                        <tr key={order.id} className={`hover:bg-gray-50 ${selectedOrders.has(order.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-3 py-3 text-center min-h-[48px]">
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="w-4 h-4 rounded cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="p-0 relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const dropdownHeight = 400;
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const spaceAbove = rect.top;

                                const shouldShowAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
                                const top = shouldShowAbove
                                  ? Math.max(20, rect.top + window.scrollY - Math.min(dropdownHeight, spaceAbove - 20))
                                  : rect.bottom + window.scrollY;

                                setDropdownPosition({ top, left: rect.left + window.scrollX });
                                setOpenDropdown(openDropdown === order.id ? null : order.id);
                              }}
                              className={`w-full h-full px-3 py-2 text-xs font-semibold ${statusColors[order.status]} hover:opacity-80 transition flex items-center justify-center gap-1 min-h-[40px]`}
                            >
                              {statusLabels[order.status]}
                              <ChevronDown size={14} />
                            </button>
                          </td>
                          <td className="px-3 py-3 text-center min-h-[48px]">
                            <input
                              type="checkbox"
                              checked={order.verified}
                              onChange={() => handleVerifiedChange(order.id, order.verified)}
                              className={`w-5 h-5 rounded cursor-pointer transition ${
                                order.verified
                                  ? 'accent-green-600 bg-green-600'
                                  : 'border-2 border-gray-800 accent-gray-800'
                              }`}
                            />
                          </td>
                          {renderEditableCell(order.id, 'client_id', order.client_id, 'text-gray-900 text-center')}
                          {renderEditableCell(order.id, 'title', order.title, 'text-gray-900 text-center')}
                          {renderLinkCell(order.id, order.link || '')}
                          {renderEditableCell(order.id, 'tracking_pl', order.tracking_pl || '', 'text-gray-600 text-center')}
                          {renderEditableCell(order.id, 'part_price', `${formatNumber(order.part_price)} zl`, 'text-gray-900 font-medium text-center')}
                          {renderEditableCell(order.id, 'delivery_cost', `${formatNumber(order.delivery_cost)} zl`, 'text-gray-900 text-center')}
                          <td className="px-3 py-3 text-center text-gray-900 font-bold bg-gray-50 min-h-[48px]">
                            {formatNumber(order.total_cost)} zl
                          </td>
                          {renderEditableCell(order.id, 'part_number', order.part_number || '', 'text-gray-600 text-center')}
                          {renderPaymentTypeCell(order.id, order.payment_type || 'оплачено')}
                          {renderEditableCell(order.id, 'cash_on_delivery', `${formatNumber(order.cash_on_delivery)} zl`, 'text-gray-900 text-center')}
                          {renderDateCell(order.id, order.order_date, 'text-gray-600 text-center')}
                          {renderEditableCell(order.id, 'received_pln', `${formatNumber(order.received_pln)} zl`, 'text-gray-900 text-center')}
                          {renderEditableCell(order.id, 'transport_cost_usd', `${formatNumber(order.transport_cost_usd)} $`, 'text-gray-900 text-center')}
                          {renderEditableCell(order.id, 'weight_kg', `${formatNumber(order.weight_kg)} кг`, 'text-gray-900 text-center')}
                          <td className="px-3 py-3 min-h-[48px]">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => openEditModal(order)}
                                className="px-3 py-2 bg-blue-100 text-blue-800 rounded text-xs font-semibold hover:opacity-80 transition flex items-center gap-1"
                              >
                                <Edit size={14} />
                                Ред.
                              </button>
                              {!order.archived && (
                                <button
                                  onClick={() => handleReturn(order)}
                                  className="px-3 py-2 bg-orange-100 text-orange-800 rounded text-xs font-semibold hover:opacity-80 transition flex items-center gap-1"
                                  title="Створити повернення"
                                >
                                  <RotateCcw size={14} />
                                  Пов.
                                </button>
                              )}
                              <button
                                onClick={() => handleArchive(order.id)}
                                className="px-3 py-2 bg-gray-100 text-gray-800 rounded text-xs font-semibold hover:opacity-80 transition flex items-center gap-1"
                                title={order.archived ? 'Розархівувати' : 'Архівувати'}
                              >
                                <Archive size={14} />
                                {order.archived ? 'Розарх.' : 'Арх.'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      ) : null}

      {activeTab === 'orders' && acceptedOrders.length > 0 && (
        <div className="mt-8 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h3 className="text-xl font-bold mb-4 text-green-800 dark:text-green-300">Прийняті замовлення</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-green-100 dark:bg-green-800/30">
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-left text-xs font-semibold text-green-900 dark:text-green-200">№ Док</th>
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-left text-xs font-semibold text-green-900 dark:text-green-200">№ Замовлення</th>
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-left text-xs font-semibold text-green-900 dark:text-green-200">ТТН</th>
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-left text-xs font-semibold text-green-900 dark:text-green-200">Поставник</th>
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-right text-xs font-semibold text-green-900 dark:text-green-200">Вага (кг)</th>
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-right text-xs font-semibold text-green-900 dark:text-green-200">Запчастини</th>
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-right text-xs font-semibold text-green-900 dark:text-green-200">Доставка</th>
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-right text-xs font-semibold text-green-900 dark:text-green-200">Отримали PLN</th>
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-right text-xs font-semibold text-green-900 dark:text-green-200">Наложка</th>
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-right text-xs font-semibold text-green-900 dark:text-green-200">Транспорт USD</th>
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-left text-xs font-semibold text-green-900 dark:text-green-200">Тип оплати</th>
                  <th className="border border-green-300 dark:border-green-700 px-2 py-2 text-left text-xs font-semibold text-green-900 dark:text-green-200">Дата прийому</th>
                </tr>
              </thead>
              <tbody>
                {acceptedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-green-100 dark:hover:bg-green-800/20 transition">
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100 font-semibold">{order.receipt_number}</td>
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100">{order.order_number || '-'}</td>
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100">{order.tracking_number || '-'}</td>
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100">{order.supplier?.name || '-'}</td>
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100 text-right">{order.weight_kg.toFixed(2)}</td>
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100 text-right">{order.part_price.toFixed(2)}</td>
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100 text-right">{order.delivery_cost.toFixed(2)}</td>
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100 text-right">{order.received_pln.toFixed(2)}</td>
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100 text-right">{order.cash_on_delivery.toFixed(2)}</td>
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100 text-right">{order.transport_cost_usd.toFixed(2)}</td>
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100">{order.payment_type || '-'}</td>
                    <td className="border border-green-300 dark:border-green-700 px-2 py-2 text-xs text-green-900 dark:text-green-100">{new Date(order.accepted_at).toLocaleDateString('uk-UA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'returns' && <Returns />}

      {activeTab === 'orders' && openDropdown && dropdownPosition && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-56 bg-white dark:bg-gray-700 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 py-1 max-h-[400px] overflow-y-auto"
          style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px`, maxHeight: `${Math.min(400, window.innerHeight - dropdownPosition.top - 20)}px` }}
        >
          {statuses.map((statusOption) => (
            <button
              key={statusOption}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(openDropdown, statusOption);
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition text-gray-900 dark:text-gray-100 ${
                orders.find(o => o.id === openDropdown)?.status === statusOption ? 'bg-gray-100 dark:bg-gray-600 font-semibold' : ''
              }`}
            >
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${statusColors[statusOption].split(' ')[0]} dark:opacity-80`}></span>
              {statusLabels[statusOption]}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'orders' && openPaymentDropdown && paymentDropdownPosition && (
        <div
          ref={paymentDropdownRef}
          className="fixed z-[9999] w-56 bg-white dark:bg-gray-700 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 py-1 max-h-[300px] overflow-y-auto"
          style={{ top: `${paymentDropdownPosition.top}px`, left: `${paymentDropdownPosition.left}px`, maxHeight: `${Math.min(300, window.innerHeight - paymentDropdownPosition.top - 20)}px` }}
        >
          {paymentTypes.map((paymentOption) => (
            <button
              key={paymentOption}
              onClick={(e) => {
                e.stopPropagation();
                handlePaymentTypeChange(openPaymentDropdown, paymentOption);
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition text-gray-900 dark:text-gray-100 ${
                orders.find(o => o.id === openPaymentDropdown)?.payment_type === paymentOption ? 'bg-gray-100 dark:bg-gray-600 font-semibold' : ''
              }`}
            >
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${paymentTypeColors[paymentOption].split(' ')[0]} dark:opacity-80`}></span>
              {paymentTypeLabels[paymentOption]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
