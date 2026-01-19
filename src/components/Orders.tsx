import { useState, useEffect, useRef } from 'react';
import { supabase, Order, Supplier, TariffSettings } from '../lib/supabase';
import { Plus, CreditCard as Edit, Archive, X, ExternalLink, ChevronDown, Layers, ChevronUp, Check, RotateCcw, Printer, Download, Search, XCircle, LayoutGrid } from 'lucide-react';
import Returns from './Returns';
import { useToast } from '../contexts/ToastContext';
import { useProject } from '../contexts/ProjectContext';
import { statusColors, paymentTypeColors, verifiedColors, formatEmptyValue } from '../utils/themeColors';
import { ExportButton } from './ExportButton';
import { exportToCSV } from '../utils/exportData';
import { ColumnViewType, getColumns, saveColumnView, loadColumnView } from '../utils/columnConfigs';

type AcceptedOrder = {
  id: string;
  order_id?: string;
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
  status?: string;
  title?: string | null;
  client_id?: string | null;
  part_number?: string | null;
  link?: string | null;
  explanation?: string | null;
  supplier?: Supplier;
};

export default function Orders() {
  const { showSuccess, showError, showWarning, confirm } = useToast();
  const { currentProject } = useProject();
  const [orders, setOrders] = useState<(Order & { supplier: Supplier })[]>([]);
  const [acceptedOrders, setAcceptedOrders] = useState<AcceptedOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [managers, setManagers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [returnsCount, setReturnsCount] = useState<number>(0);
  const [artTransId, setArtTransId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openPaymentDropdown, setOpenPaymentDropdown] = useState<string | null>(null);
  const [openAcceptedDropdown, setOpenAcceptedDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [paymentDropdownPosition, setPaymentDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [acceptedDropdownPosition, setAcceptedDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [isGrouped, setIsGrouped] = useState(false);
  const [groupBy, setGroupBy] = useState<'status' | 'payment' | 'verified'>('status');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ orderId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isAddingNewRow, setIsAddingNewRow] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'orders' | 'returns'>('orders');
  const [activeViewTab, setActiveViewTab] = useState<'active' | 'in_active_receipt' | 'accepted' | 'cancelled' | 'archived'>('active');
  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [acceptExplanation, setAcceptExplanation] = useState('');
  const [isAcceptedOrdersModalOpen, setIsAcceptedOrdersModalOpen] = useState(false);
  const [selectedReceiptNumber, setSelectedReceiptNumber] = useState<string | null>(null);
  const [receiptDetails, setReceiptDetails] = useState<AcceptedOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tariffSettings, setTariffSettings] = useState<TariffSettings | null>(null);
  const [columnView, setColumnView] = useState<ColumnViewType>(loadColumnView());
  const [draftRows, setDraftRows] = useState<Array<{
    id: string;
    order_number: string;
    supplier_id: string;
    manager_id: string;
    status: string;
    order_date: string;
    notes: string;
    title: string;
    link: string;
    tracking_pl: string;
    part_price: number;
    delivery_cost: number;
    total_cost: number;
    part_number: string;
    payment_type: string;
    cash_on_delivery: number;
    client_id: string;
    received_pln: number;
    transport_cost_usd: number;
    weight_kg: number;
    verified: boolean;
  }>>([]);
  const [newRowData, setNewRowData] = useState({
    order_number: '',
    supplier_id: '',
    manager_id: '',
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
    received_pln: 15,
    transport_cost_usd: 0,
    weight_kg: 1,
    verified: false
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);
  const acceptedDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [formData, setFormData] = useState({
    order_number: '',
    supplier_id: '',
    manager_id: '',
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
    received_pln: 15,
    transport_cost_usd: 0,
    weight_kg: 1,
    verified: false
  });

  useEffect(() => {
    loadOrders();
    loadAcceptedOrders();
    loadSuppliers();
    loadManagers();
    loadArtTransId();
    loadReturnsCount();
    loadTariffSettings();
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
      if (acceptedDropdownRef.current && !acceptedDropdownRef.current.contains(event.target as Node)) {
        setOpenAcceptedDropdown(null);
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
    if (tariffSettings && isModalOpen) {
      const calculatedTransportCost = formData.weight_kg * tariffSettings.default_transport_cost_per_kg_usd;
      setFormData(prev => ({ ...prev, transport_cost_usd: calculatedTransportCost }));
    }
  }, [formData.weight_kg, tariffSettings, isModalOpen]);

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

  useEffect(() => {
    if (tariffSettings) {
      const calculatedTransportCost = newRowData.weight_kg * tariffSettings.default_transport_cost_per_kg_usd;
      setNewRowData(prev => ({ ...prev, transport_cost_usd: calculatedTransportCost }));
    }
  }, [newRowData.weight_kg, tariffSettings]);

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

  async function loadTariffSettings() {
    const { data, error } = await supabase
      .from('tariff_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error loading tariff settings:', error);
      return;
    }

    if (data) {
      setTariffSettings(data);
      setNewRowData(prev => ({
        ...prev,
        received_pln: data.default_received_pln,
        transport_cost_usd: prev.weight_kg * data.default_transport_cost_per_kg_usd
      }));
      setFormData(prev => ({
        ...prev,
        received_pln: data.default_received_pln,
        transport_cost_usd: prev.weight_kg * data.default_transport_cost_per_kg_usd
      }));
    }
  }

  async function loadOrders() {
    try {
      console.log('🔄 Починаємо завантаження замовлень...');
      const { data, error } = await supabase
        .from('orders')
        .select('*, supplier:suppliers(*), manager:user_profiles!manager_id(id, full_name, email)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Помилка завантаження замовлень:', error);
        showError(`Помилка: ${error.message}`);
      } else if (data) {
        console.log('✅ Замовлення завантажено:', data.length, 'шт.');
        console.log('Перші 3 записи:', data.slice(0, 3));
        setOrders(data as any);
      } else {
        console.warn('⚠️ Дані пусті (null або undefined)');
      }
    } catch (err) {
      console.error('💥 Критична помилка:', err);
      showError('Критична помилка підключення');
    }
  }

  async function loadAcceptedOrders() {
    const { data, error } = await supabase
      .from('accepted_orders')
      .select('*')
      .order('accepted_at', { ascending: false });

    if (error) {
      console.error('Помилка завантаження прийнятих замовлень:', error);
    } else if (data) {
      console.log('Прийняті замовлення завантажено:', data.length);
      setAcceptedOrders(data as any);
    }
  }

  async function openReceiptDetails(receiptNumber: string) {
    setSelectedReceiptNumber(receiptNumber);
    const { data, error } = await supabase
      .from('accepted_orders')
      .select('*')
      .eq('receipt_number', receiptNumber)
      .order('accepted_at', { ascending: true });

    if (!error && data) {
      setReceiptDetails(data as any);
    }
  }

  async function openReceiptByOrderId(orderId: string) {
    const { data, error } = await supabase
      .from('accepted_orders')
      .select('receipt_number')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!error && data) {
      openReceiptDetails(data.receipt_number);
    } else {
      showWarning('Документ прийому не знайдено для цього замовлення');
    }
  }

  function printReceipt() {
    window.print();
  }

  async function loadSuppliers() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Помилка завантаження постачальників:', error);
    } else if (data) {
      console.log('Постачальники завантажено:', data.length);
      setSuppliers(data);
    }
  }

  async function loadManagers() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .order('full_name');

    if (error) {
      console.error('Помилка завантаження менеджерів:', error);
    } else if (data) {
      console.log('Менеджерів завантажено:', data.length);
      setManagers(data);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const dataToSubmit: any = { ...formData };

    if (!editingOrder) {
      if (!currentProject) {
        showError('Не обрано проект');
        return;
      }
      dataToSubmit.project_id = currentProject.id;

      if (!dataToSubmit.client_id || dataToSubmit.client_id.trim() === '') {
        showWarning('ID клієнта є обов\'язковим полем!');
        return;
      }

      if (!dataToSubmit.title || dataToSubmit.title.trim() === '') {
        showWarning('Назва є обов\'язковим полем!');
        return;
      }

      if (!dataToSubmit.link || dataToSubmit.link.trim() === '') {
        showWarning('Посилання є обов\'язковим полем!');
        return;
      }

      if (!dataToSubmit.part_price || dataToSubmit.part_price <= 0) {
        showWarning('Вартість запчастини є обов\'язковим полем і повинна бути більше 0!');
        return;
      }

      if (!dataToSubmit.part_number || dataToSubmit.part_number.trim() === '') {
        showWarning('Номер запчастини є обов\'язковим полем!');
        return;
      }

      if (!dataToSubmit.payment_type || dataToSubmit.payment_type === 'не обрано') {
        showWarning('Необхідно обрати тип оплати!');
        return;
      }

      if (dataToSubmit.payment_type === 'оплачено' && dataToSubmit.cash_on_delivery > 0) {
        showWarning('Якщо оплата "Оплачено", наложка повинна дорівнювати 0!');
        return;
      }

      if ((dataToSubmit.payment_type === 'побранє' || dataToSubmit.payment_type === 'самовивіз pl') && (!dataToSubmit.cash_on_delivery || dataToSubmit.cash_on_delivery <= 0)) {
        showWarning('Якщо тип оплати "Побранє" або "Самовивіз PL", наложка є обов\'язковою і повинна бути більше 0!');
        return;
      }
    }

    if (!dataToSubmit.supplier_id || dataToSubmit.supplier_id === '') {
      delete dataToSubmit.supplier_id;
    }

    if (!dataToSubmit.manager_id || dataToSubmit.manager_id === '') {
      delete dataToSubmit.manager_id;
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
          showError('Помилка при оновленні замовлення: ' + error.message);
          return;
        }
        showSuccess('Замовлення успішно оновлено!');
      } else {
        const { error } = await supabase.from('orders').insert([dataToSubmit]);
        if (error) {
          console.error('Error inserting order:', error);
          showError('Помилка при створенні замовлення: ' + error.message);
          return;
        }
        showSuccess('Замовлення успішно створено!');
      }

      setIsModalOpen(false);
      setEditingOrder(null);
      resetForm();
      loadOrders();
    } catch (err) {
      console.error('Network error:', err);
      showError('Помилка мережі: Перевірте підключення до інтернету');
    }
  }

  async function handleArchive(id: string) {
    const order = orders.find(o => o.id === id);
    const isArchived = order?.archived || false;
    const action = isArchived ? 'розархівувати' : 'архівувати';
    const confirmed = await confirm(`Ви впевнені що хочете ${action} це замовлення?`);
    if (confirmed) {
      await supabase
        .from('orders')
        .update({
          archived: !isArchived,
          archived_at: !isArchived ? new Date().toISOString() : null
        })
        .eq('id', id);
      showSuccess(`Замовлення успішно ${isArchived ? 'розархівовано' : 'архівовано'}!`);
      loadOrders();
    }
  }

  async function handleReturn(order: Order & { supplier: Supplier }) {
    const confirmed = await confirm('Створити повернення з цього замовлення?');
    if (confirmed) {
      if (!currentProject) {
        showError('Не обрано проект');
        return;
      }

      const { error } = await supabase.from('returns').insert({
        project_id: currentProject.id,
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
        return_tracking_to_supplier: '',
        refund_status: '',
        archived: false
      });

      if (!error) {
        await supabase
          .from('orders')
          .update({
            status: 'повернення',
            previous_status: order.status,
            archived: true,
            archived_at: new Date().toISOString()
          })
          .eq('id', order.id);

        showSuccess('Повернення створено успішно!');
        loadReturnsCount();
        loadOrders();
      } else {
        showError('Помилка при створенні повернення');
      }
    }
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    if (newStatus === 'прийнято') {
      setAcceptingOrderId(orderId);
      setIsAcceptConfirmOpen(true);
      setOpenDropdown(null);
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
      setOpenDropdown(null);
    }
  }

  async function handleAcceptedStatusChange(acceptedOrderId: string, newStatus: string) {
    const { error } = await supabase
      .from('accepted_orders')
      .update({ status: newStatus })
      .eq('id', acceptedOrderId);

    if (!error) {
      loadAcceptedOrders();
      setOpenAcceptedDropdown(null);
    }
  }

  async function confirmAcceptOrder() {
    if (!acceptingOrderId) return;

    const { error } = await supabase
      .from('orders')
      .update({ status: 'прийнято' })
      .eq('id', acceptingOrderId);

    if (!error) {
      const order = orders.find(o => o.id === acceptingOrderId);
      if (order && currentProject) {
        await supabase.from('accepted_orders').insert({
          project_id: currentProject.id,
          order_id: acceptingOrderId,
          receipt_number: 'прийнято без документу',
          order_number: order.order_number,
          tracking_number: order.tracking_pl,
          supplier_id: order.supplier_id,
          weight_kg: order.weight_kg || 0,
          part_price: order.part_price || 0,
          delivery_cost: order.delivery_cost || 0,
          received_pln: order.received_pln || 0,
          cash_on_delivery: order.cash_on_delivery || 0,
          transport_cost_usd: order.transport_cost_usd || 0,
          payment_type: order.payment_type,
          title: order.title,
          client_id: order.client_id,
          part_number: order.part_number,
          link: order.link,
          explanation: acceptExplanation || null
        });
        loadAcceptedOrders();
      }
      loadOrders();
    }

    setIsAcceptConfirmOpen(false);
    setAcceptingOrderId(null);
    setAcceptExplanation('');
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

  function renderEditableCell(orderId: string, field: string, value: any, className: string = '', isAccepted: boolean = false) {
    const isEditing = editingCell?.orderId === orderId && editingCell?.field === field;

    if (isEditing && !isAccepted) {
      return (
        <td className="px-3 py-3 min-h-[48px] bg-white dark:bg-gray-800">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveInlineEdit}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border border-blue-500 dark:border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </td>
      );
    }

    const fontSizeClass = getFontSizeClass(value);
    const isTitle = field === 'title';
    const displayValue = formatEmptyValue(value);

    return (
      <td
        className={`px-3 py-3 ${!isAccepted ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''} transition min-h-[48px] ${isTitle ? 'min-w-[200px]' : ''} ${className.replace(/text-(sm|xs|base)/g, '')} ${fontSizeClass} bg-white dark:bg-gray-800`}
        onClick={() => !isAccepted && startEditing(orderId, field, value)}
        title={displayValue}
      >
        <div className={`w-full ${isTitle ? 'line-clamp-3 break-words' : 'break-words whitespace-normal'} text-gray-900 dark:text-gray-100`}>
          {displayValue}
        </div>
      </td>
    );
  }

  function renderTrackingCell(orderId: string, order: Order & { supplier: Supplier }, isAccepted: boolean = false) {
    const isEditing = editingCell?.orderId === orderId && editingCell?.field === 'tracking_pl';
    const trackingValue = order.tracking_pl || '';

    if (isEditing && !isAccepted) {
      return (
        <td className="px-3 py-3 min-h-[48px]">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveInlineEdit}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border border-blue-500 dark:border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </td>
      );
    }

    const isOrderAccepted = order.status === 'прийнято';
    const fontSizeClass = getFontSizeClass(trackingValue);

    const displayValue = formatEmptyValue(trackingValue);

    return (
      <td
        className={`px-3 py-3 ${!isAccepted && !isOrderAccepted ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : isOrderAccepted ? 'cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:underline' : ''} transition min-h-[48px] text-gray-900 dark:text-gray-100 text-center ${fontSizeClass} bg-white dark:bg-gray-800`}
        onClick={() => {
          if (!isAccepted && !isOrderAccepted) {
            startEditing(orderId, 'tracking_pl', trackingValue);
          } else if (isOrderAccepted) {
            openReceiptByOrderId(orderId);
          }
        }}
        title={isOrderAccepted ? 'Натисніть, щоб відкрити документ прийому' : displayValue}
      >
        <div className="w-full break-words whitespace-normal">
          {displayValue}
        </div>
      </td>
    );
  }

  function renderLinkCell(orderId: string, link: string, isAccepted: boolean = false) {
    const isEditing = editingCell?.orderId === orderId && editingCell?.field === 'link';

    if (isEditing && !isAccepted) {
      return (
        <td className="px-3 py-3 text-center min-h-[48px]">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveInlineEdit}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border border-blue-500 dark:border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="https://"
          />
        </td>
      );
    }

    return (
      <td
        className={`px-3 py-3 text-center ${!isAccepted ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''} transition min-h-[48px] bg-white dark:bg-gray-800`}
        onClick={() => !isAccepted && startEditing(orderId, 'link', link)}
        title={isAccepted ? '' : "Клікніть для редагування посилання"}
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
          <span className="text-gray-400 dark:text-gray-600">
            <ExternalLink size={16} />
          </span>
        )}
      </td>
    );
  }

  function renderDateCell(orderId: string, dateValue: string, className: string = '', isAccepted: boolean = false) {
    const isEditing = editingCell?.orderId === orderId && editingCell?.field === 'order_date';

    if (isEditing && !isAccepted) {
      return (
        <td className="px-3 py-3 min-h-[48px]">
          <input
            ref={inputRef}
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveInlineEdit}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border border-blue-500 dark:border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </td>
      );
    }

    const fontSizeClass = getFontSizeClass(formatDate(dateValue));

    const displayValue = formatEmptyValue(formatDate(dateValue));

    return (
      <td
        className={`px-3 py-3 ${!isAccepted ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''} transition min-h-[48px] ${className.replace(/text-(sm|xs|base)/g, '')} ${fontSizeClass} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
        onClick={() => !isAccepted && startEditing(orderId, 'order_date', dateValue)}
        title={isAccepted ? '' : "Клікніть для редагування дати"}
      >
        <div className="w-full break-words whitespace-normal">
          {displayValue}
        </div>
      </td>
    );
  }

  function renderPaymentTypeCell(orderId: string, paymentType: string, isAccepted: boolean = false) {
    const displayPaymentType = paymentType || 'не обрано';
    return (
      <td className="p-0 relative">
        <button
          onClick={(e) => {
            if (isAccepted) return;
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
          className={`w-full h-full px-3 py-3 text-xs font-semibold ${paymentTypeColors[displayPaymentType]} ${!isAccepted ? 'hover:opacity-80' : 'cursor-default'} transition flex items-center justify-center gap-1 min-h-[48px]`}
          disabled={isAccepted}
        >
          {paymentTypeLabels[displayPaymentType]}
          {!isAccepted && <ChevronDown size={14} />}
        </button>
      </td>
    );
  }

  function openEditModal(order: Order) {
    setEditingOrder(order);
    setFormData({
      order_number: order.order_number,
      supplier_id: order.supplier_id,
      manager_id: order.manager_id || '',
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
    const defaultWeight = 1;
    const receivedPln = tariffSettings?.default_received_pln || 15;
    const transportCostUsd = tariffSettings ? defaultWeight * tariffSettings.default_transport_cost_per_kg_usd : 0;

    setFormData({
      order_number: '',
      supplier_id: artTransId,
      manager_id: '',
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
      received_pln: receivedPln,
      transport_cost_usd: transportCostUsd,
      weight_kg: defaultWeight,
      verified: false
    });
  }

  function addDraftRows(count: number) {
    const defaultWeight = 1;
    const receivedPln = tariffSettings?.default_received_pln || 15;
    const transportCostUsd = tariffSettings ? defaultWeight * tariffSettings.default_transport_cost_per_kg_usd : 0;

    const newDrafts = Array.from({ length: count }, (_, index) => ({
      id: `draft-${Date.now()}-${index}`,
      order_number: '',
      supplier_id: artTransId,
      manager_id: '',
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
      received_pln: receivedPln,
      transport_cost_usd: transportCostUsd,
      weight_kg: defaultWeight,
      verified: false
    }));

    setDraftRows(prev => [...prev, ...newDrafts]);
  }

  function updateDraftRow(draftId: string, field: string, value: any) {
    setDraftRows(prev => prev.map(draft => {
      if (draft.id === draftId) {
        const updated = { ...draft, [field]: value };

        if (field === 'payment_type' && value === 'оплачено') {
          updated.cash_on_delivery = 0;
        }

        if (field === 'weight_kg' && tariffSettings) {
          updated.transport_cost_usd = Number(value) * tariffSettings.default_transport_cost_per_kg_usd;
        }

        if (field === 'part_price' || field === 'delivery_cost') {
          updated.total_cost = updated.part_price + updated.delivery_cost;
        }

        return updated;
      }
      return draft;
    }));
  }

  async function saveDraftRow(draftId: string) {
    const draft = draftRows.find(d => d.id === draftId);
    if (!draft) return;

    if (!draft.client_id || draft.client_id.trim() === '') {
      showWarning('ID клієнта є обов\'язковим полем!');
      return;
    }

    if (!draft.title || draft.title.trim() === '') {
      showWarning('Назва є обов\'язковим полем!');
      return;
    }

    if (!draft.link || draft.link.trim() === '') {
      showWarning('Посилання є обов\'язковим полем!');
      return;
    }

    if (!draft.part_price || draft.part_price <= 0) {
      showWarning('Вартість запчастини є обов\'язковим полем і повинна бути більше 0!');
      return;
    }

    if (!draft.part_number || draft.part_number.trim() === '') {
      showWarning('Номер запчастини є обов\'язковим полем!');
      return;
    }

    if (!draft.payment_type || draft.payment_type === 'не обрано') {
      showWarning('Необхідно обрати тип оплати!');
      return;
    }

    if (draft.cash_on_delivery < 0) {
      showWarning('Сума наложки не може бути від\'ємною!');
      return;
    }

    const dataToSubmit: any = { ...draft };
    delete dataToSubmit.id;

    if (!currentProject) {
      showError('Не обрано проект');
      return;
    }
    dataToSubmit.project_id = currentProject.id;

    if (!dataToSubmit.supplier_id || dataToSubmit.supplier_id === '') {
      delete dataToSubmit.supplier_id;
    }

    if (!dataToSubmit.manager_id || dataToSubmit.manager_id === '') {
      delete dataToSubmit.manager_id;
    }

    try {
      const { error } = await supabase.from('orders').insert([dataToSubmit]);
      if (error) {
        console.error('Error inserting order:', error);
        showError('Помилка при створенні замовлення: ' + error.message);
        return;
      }

      showSuccess('Замовлення успішно створено!');
      setDraftRows(prev => prev.filter(d => d.id !== draftId));
      loadOrders();
    } catch (err) {
      console.error('Network error:', err);
      showError('Помилка мережі: Перевірте підключення до інтернету');
    }
  }

  function deleteDraftRow(draftId: string) {
    setDraftRows(prev => prev.filter(d => d.id !== draftId));
  }

  function startAddingNewRow() {
    setIsAddingNewRow(true);
    const defaultWeight = 1;
    const receivedPln = tariffSettings?.default_received_pln || 15;
    const transportCostUsd = tariffSettings ? defaultWeight * tariffSettings.default_transport_cost_per_kg_usd : 0;

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
      received_pln: receivedPln,
      transport_cost_usd: transportCostUsd,
      weight_kg: defaultWeight,
      verified: false
    });
  }

  async function saveNewRow() {
    if (!newRowData.client_id || newRowData.client_id.trim() === '') {
      showWarning('ID клієнта є обов\'язковим полем!');
      return;
    }

    if (!newRowData.title || newRowData.title.trim() === '') {
      showWarning('Назва є обов\'язковим полем!');
      return;
    }

    if (!newRowData.link || newRowData.link.trim() === '') {
      showWarning('Посилання є обов\'язковим полем!');
      return;
    }

    if (!newRowData.part_price || newRowData.part_price <= 0) {
      showWarning('Вартість запчастини є обов\'язковим полем і повинна бути більше 0!');
      return;
    }

    if (!newRowData.part_number || newRowData.part_number.trim() === '') {
      showWarning('Номер запчастини є обов\'язковим полем!');
      return;
    }

    if (!newRowData.payment_type || newRowData.payment_type === 'не обрано') {
      showWarning('Необхідно обрати тип оплати!');
      return;
    }

    if (newRowData.payment_type === 'оплачено' && newRowData.cash_on_delivery > 0) {
      showWarning('Якщо оплата "Оплачено", наложка повинна дорівнювати 0!');
      return;
    }

    if ((newRowData.payment_type === 'побранє' || newRowData.payment_type === 'самовивіз pl') && (!newRowData.cash_on_delivery || newRowData.cash_on_delivery <= 0)) {
      showWarning('Якщо тип оплати "Побранє" або "Самовивіз PL", наложка є обов\'язковою і повинна бути більше 0!');
      return;
    }

    const dataToSubmit: any = { ...newRowData };

    if (!currentProject) {
      showError('Не обрано проект');
      return;
    }
    dataToSubmit.project_id = currentProject.id;

    if (!dataToSubmit.supplier_id || dataToSubmit.supplier_id === '') {
      delete dataToSubmit.supplier_id;
    }

    try {
      const { error } = await supabase.from('orders').insert([dataToSubmit]);
      if (error) {
        console.error('Error inserting order:', error);
        showError('Помилка при створенні замовлення: ' + error.message);
        return;
      }

      showSuccess('Замовлення успішно створено!');
      setIsAddingNewRow(false);
      loadOrders();
    } catch (err) {
      console.error('Network error:', err);
      showError('Помилка мережі: Перевірте підключення до інтернету');
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

  function toggleColumnView() {
    const newView: ColumnViewType = columnView === 'paska' ? 'monday' : 'paska';
    setColumnView(newView);
    saveColumnView(newView);
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


  const paymentTypeLabels: Record<string, string> = {
    'не обрано': 'Не обрано',
    'оплачено': 'Оплачено',
    'побранє': 'Побранє',
    'самовивіз pl': 'Самовивіз PL',
    'оплачено по перерахунку': 'Оплачено по перерахунку'
  };

  const paymentTypes = ['не обрано', 'оплачено', 'побранє', 'самовивіз pl', 'оплачено по перерахунку'];

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

    let matchesView = false;
    if (activeViewTab === 'active') {
      matchesView = !order.archived && order.status !== 'анульовано' && order.status !== 'прийнято' && order.status !== 'в активному прийомі';
    } else if (activeViewTab === 'in_active_receipt') {
      matchesView = order.status === 'в активному прийомі';
    } else if (activeViewTab === 'accepted') {
      matchesView = order.status === 'прийнято';
    } else if (activeViewTab === 'cancelled') {
      matchesView = order.status === 'анульовано';
    } else if (activeViewTab === 'archived') {
      matchesView = order.archived === true;
    }

    if (!matchesView) return false;

    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase().trim();
    return (
      (order.client_id && order.client_id.toLowerCase().includes(searchLower)) ||
      (order.title && order.title.toLowerCase().includes(searchLower)) ||
      (order.tracking_pl && order.tracking_pl.toLowerCase().includes(searchLower)) ||
      (order.part_number && order.part_number.toLowerCase().includes(searchLower))
    );
  });

  const handleExportOrders = () => {
    const dataToExport = filteredOrders.map(order => {
      const manager = (order as any).manager;
      return {
        client_id: order.client_id || '',
        order_number: order.order_number || '',
        supplier: order.supplier?.name || '',
        manager: manager ? (manager.full_name || manager.email) : '',
        status: order.status,
        order_date: order.order_date,
        title: order.title || '',
        link: order.link || '',
        tracking_pl: order.tracking_pl || '',
        part_price: order.part_price,
        delivery_cost: order.delivery_cost,
        total_cost: order.total_cost,
        part_number: order.part_number || '',
        payment_type: order.payment_type || '',
        cash_on_delivery: order.cash_on_delivery,
        received_pln: order.received_pln,
        transport_cost_usd: order.transport_cost_usd,
        weight_kg: order.weight_kg,
        verified: order.verified ? 'Так' : 'Ні',
        notes: order.notes || ''
      };
    });

    const headers = {
      client_id: 'ID Клієнта',
      order_number: '№ Замовлення',
      supplier: 'Постачальник',
      manager: 'Менеджер',
      status: 'Статус',
      order_date: 'Дата',
      title: 'Назва',
      link: 'Посилання',
      tracking_pl: 'Трекінг PL',
      part_price: 'Ціна деталі',
      delivery_cost: 'Доставка',
      total_cost: 'Загальна вартість',
      part_number: 'Артикул',
      payment_type: 'Тип оплати',
      cash_on_delivery: 'Готівка при отриманні',
      received_pln: 'Отримано PLN',
      transport_cost_usd: 'Транспорт USD',
      weight_kg: 'Вага кг',
      verified: 'Vortex',
      notes: 'Примітки'
    };

    exportToCSV(dataToExport, `zamovlennya_${activeViewTab}`, headers);
  };

  function renderColumnCell(order: Order & { supplier: Supplier }, columnKey: string, isAccepted: boolean) {
    const value = (order as any)[columnKey];

    switch (columnKey) {
      case 'status':
        return (
          <td className="p-0 relative" key="status">
            <button
              onClick={(e) => {
                if (isAccepted) return;
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
              className={`w-full h-full px-3 py-3 text-xs font-semibold ${statusColors[order.status]} ${!isAccepted ? 'hover:opacity-80' : 'cursor-default'} transition flex items-center justify-center gap-1 min-h-[48px]`}
              disabled={isAccepted}
            >
              {statusLabels[order.status]}
              {!isAccepted && <ChevronDown size={14} />}
            </button>
          </td>
        );

      case 'verified':
        return (
          <td className="px-3 py-3 text-center min-h-[48px] bg-white dark:bg-gray-800" key="verified">
            <input
              type="checkbox"
              checked={order.verified}
              onChange={() => handleVerifiedChange(order.id, order.verified)}
              className={`w-5 h-5 rounded cursor-pointer transition ${
                order.verified
                  ? 'accent-green-700 bg-green-700 dark:accent-green-600 dark:bg-green-600'
                  : 'border-2 border-gray-800 dark:border-gray-400 accent-gray-800 dark:accent-gray-400 bg-white dark:bg-gray-600'
              }`}
              disabled={isAccepted}
            />
          </td>
        );

      case 'link':
        return renderLinkCell(order.id, order.link || '', isAccepted);

      case 'tracking_pl':
        return renderTrackingCell(order.id, order, isAccepted);

      case 'part_price':
        return renderEditableCell(order.id, 'part_price', `${formatNumber(order.part_price)} zl`, 'text-center font-medium', isAccepted);

      case 'delivery_cost':
        return renderEditableCell(order.id, 'delivery_cost', `${formatNumber(order.delivery_cost)} zl`, 'text-center', isAccepted);

      case 'total_cost':
        return (
          <td className="px-3 py-3 text-center text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-gray-800 min-h-[48px]" key="total_cost">
            {formatNumber(order.total_cost)} zl
          </td>
        );

      case 'payment_type':
        return renderPaymentTypeCell(order.id, order.payment_type || 'оплачено', isAccepted);

      case 'cash_on_delivery':
        return renderEditableCell(order.id, 'cash_on_delivery', `${formatNumber(order.cash_on_delivery)} zl`, 'text-center', isAccepted);

      case 'order_date':
        return renderDateCell(order.id, order.order_date, 'text-gray-900 text-center', isAccepted);

      case 'order_number':
      case 'client_id':
      case 'title':
      case 'part_number':
        return renderEditableCell(order.id, columnKey, value || '', 'text-gray-900 text-center', isAccepted);

      case 'manager':
        const manager = (order as any).manager;
        const managerName = manager ? (manager.full_name || manager.email) : '';
        return (
          <td className="px-3 py-3 text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 min-h-[48px]" key="manager">
            {managerName || '-'}
          </td>
        );

      default:
        return renderEditableCell(order.id, columnKey, value || '', 'text-gray-900 text-center', isAccepted);
    }
  }

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
            <ExportButton onClick={handleExportOrders} disabled={filteredOrders.length === 0} />
            <button
              onClick={() => setIsModalOpen(!isModalOpen)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition"
            >
              {isModalOpen ? <X size={20} /> : <Plus size={20} />}
              {isModalOpen ? 'Скасувати' : 'Нове замовлення'}
            </button>
            {acceptedOrders.length > 0 && (
              <button
                onClick={() => setIsAcceptedOrdersModalOpen(true)}
                className="bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-800 transition"
              >
                <Layers size={20} />
                Прийняті ({acceptedOrders.length})
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'orders' && (
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-lg flex-shrink-0">
            <button
              onClick={() => setActiveViewTab('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeViewTab === 'active'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow dark:shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Активні ({orders.filter(o => !o.archived && o.status !== 'анульовано' && o.status !== 'прийнято' && o.status !== 'в активному прийомі').length})
            </button>
            <button
              onClick={() => setActiveViewTab('in_active_receipt')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeViewTab === 'in_active_receipt'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow dark:shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              В активному прийомі ({orders.filter(o => o.status === 'в активному прийомі').length})
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Менеджер</label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Не обрано</option>
                  {managers.map((manager) => (
                    <option
                      key={manager.id}
                      value={manager.id}
                      className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {manager.full_name || manager.email}
                    </option>
                  ))}
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
                  onChange={(e) => {
                    const newPaymentType = e.target.value;
                    setFormData({
                      ...formData,
                      payment_type: newPaymentType,
                      cash_on_delivery: newPaymentType === 'оплачено' ? 0 : formData.cash_on_delivery
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="не обрано" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Не обрано</option>
                  <option value="оплачено" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Оплачено</option>
                  <option value="побранє" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Побранє</option>
                  <option value="самовивіз pl" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Самовивіз PL</option>
                  <option value="оплачено по перерахунку" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Оплачено по перерахунку</option>
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
                  disabled={formData.payment_type === 'оплачено'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.verified}
                    onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                    className="w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-600"
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
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={startAddingNewRow}
                  className="bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-800 transition text-sm font-medium"
                >
                  <Plus size={18} />
                  Додати рядок
                </button>
                <div className="relative group">
                  <button
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 transition text-sm font-medium"
                  >
                    <Layers size={18} />
                    Чернетки
                  </button>
                  <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-700 shadow-lg rounded-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
                    {[1, 2, 3, 4, 5].map(count => (
                      <button
                        key={count}
                        onClick={() => addDraftRows(count)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm"
                      >
                        Додати {count} {count === 1 ? 'рядок' : count <= 4 ? 'рядки' : 'рядків'}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={toggleColumnView}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition text-sm font-medium"
                  title={columnView === 'paska' ? 'Перейти на вид Мандей' : 'Перейти на вид Паска'}
                >
                  <LayoutGrid size={18} />
                  {columnView === 'paska' ? 'Паска' : 'Мандей'}
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                  <input
                    type="text"
                    placeholder="Пошук..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
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
                      className="px-3 py-1 text-sm bg-green-700 text-white rounded hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-800 transition"
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
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleAllOrders}
                      className="w-4 h-4 rounded cursor-pointer text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600"
                    />
                  </th>
                  {getColumns(columnView).map((col) => (
                    <th key={col.key} className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {col.key === 'link' ? <ExternalLink size={16} className="inline-block" /> : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {isAddingNewRow && (
                  <tr className="bg-green-100 dark:bg-green-900/70">
                    <td className="px-3 py-3 text-center min-h-[48px]"></td>
                    {getColumns(columnView).map((col) => {
                      if (col.key === 'actions') {
                        return (
                          <td key="actions" className="px-3 py-3 min-h-[48px]">
                            <div className="flex gap-2 justify-start">
                              <button
                                onClick={saveNewRow}
                                className="px-3 py-2 bg-green-700 text-white rounded text-xs font-semibold hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-800 transition flex items-center gap-1"
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
                        );
                      }

                      const value = (newRowData as any)[col.key];
                      const isRequired = ['client_id', 'title', 'link'].includes(col.key);

                      if (col.key === 'status') {
                        return (
                          <td key={col.key} className="p-0 relative">
                            <select
                              value={newRowData.status}
                              onChange={(e) => setNewRowData({ ...newRowData, status: e.target.value })}
                              className="w-full h-full px-2 py-3 text-xs font-semibold border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-gray-900 dark:text-gray-100"
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
                        );
                      }

                      if (col.key === 'verified') {
                        return (
                          <td key={col.key} className="px-3 py-3 text-center min-h-[48px]">
                            <input
                              type="checkbox"
                              checked={newRowData.verified}
                              onChange={(e) => setNewRowData({ ...newRowData, verified: e.target.checked })}
                              className="w-5 h-5 rounded cursor-pointer transition text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-600"
                            />
                          </td>
                        );
                      }

                      if (col.key === 'link') {
                        return (
                          <td key={col.key} className="px-3 py-3 min-h-[48px]">
                            <input
                              type="text"
                              value={newRowData.link}
                              onChange={(e) => setNewRowData({ ...newRowData, link: e.target.value })}
                              onKeyDown={handleNewRowKeyDown}
                              placeholder="Посилання *"
                              className="w-full px-2 py-1 border border-red-300 dark:border-red-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </td>
                        );
                      }

                      if (col.key === 'payment_type') {
                        return (
                          <td key={col.key} className="p-0 relative">
                            <select
                              value={newRowData.payment_type}
                              onChange={(e) => {
                                const newPaymentType = e.target.value;
                                setNewRowData({
                                  ...newRowData,
                                  payment_type: newPaymentType,
                                  cash_on_delivery: newPaymentType === 'оплачено' ? 0 : newRowData.cash_on_delivery
                                });
                              }}
                              className="w-full h-full px-2 py-3 text-xs font-semibold border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-gray-900 dark:text-gray-100"
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
                        );
                      }

                      if (col.key === 'total_cost') {
                        return (
                          <td key={col.key} className="px-3 py-3 text-center text-gray-900 dark:text-gray-100 font-bold bg-gray-50 dark:bg-gray-700 min-h-[48px]">
                            {formatNumber(newRowData.total_cost)} zl
                          </td>
                        );
                      }

                      if (col.key === 'cash_on_delivery') {
                        return (
                          <td key={col.key} className="px-3 py-3 min-h-[48px]">
                            <input
                              type="number"
                              step="0.01"
                              value={newRowData.cash_on_delivery}
                              onChange={(e) => setNewRowData({ ...newRowData, cash_on_delivery: Number(e.target.value) })}
                              onKeyDown={handleNewRowKeyDown}
                              disabled={newRowData.payment_type === 'оплачено'}
                              placeholder="0"
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                        );
                      }

                      if (['part_price', 'delivery_cost'].includes(col.key)) {
                        return (
                          <td key={col.key} className="px-3 py-3 min-h-[48px]">
                            <input
                              type="number"
                              step="0.01"
                              value={value}
                              onChange={(e) => setNewRowData({ ...newRowData, [col.key]: Number(e.target.value) })}
                              onKeyDown={handleNewRowKeyDown}
                              placeholder="0"
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </td>
                        );
                      }

                      if (col.renderType === 'date') {
                        return (
                          <td key={col.key} className="px-3 py-3 min-h-[48px]">
                            <input
                              type="date"
                              value={value || ''}
                              onChange={(e) => setNewRowData({ ...newRowData, [col.key]: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </td>
                        );
                      }

                      if (col.key === 'manager') {
                        return (
                          <td key={col.key} className="p-0 relative">
                            <select
                              value={newRowData.manager_id || ''}
                              onChange={(e) => setNewRowData({ ...newRowData, manager_id: e.target.value })}
                              className="w-full h-full px-2 py-3 text-xs font-semibold border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-gray-900 dark:text-gray-100"
                            >
                              <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Не обрано</option>
                              {managers.map((manager) => (
                                <option
                                  key={manager.id}
                                  value={manager.id}
                                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  {manager.full_name || manager.email}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} className="px-3 py-3 min-h-[48px]">
                          <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => setNewRowData({ ...newRowData, [col.key]: e.target.value })}
                            onKeyDown={handleNewRowKeyDown}
                            placeholder={isRequired ? `${col.label} *` : col.label}
                            className={`w-full px-2 py-1 border ${isRequired ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                )}
                {draftRows.map((draft) => (
                  <tr key={draft.id} className="bg-orange-50 dark:bg-orange-900/30 border-2 border-orange-300 dark:border-orange-700">
                    <td className="px-3 py-3 text-center min-h-[48px]">
                      <span className="text-orange-600 dark:text-orange-400 text-xs font-bold">Чернетка</span>
                    </td>
                    {getColumns(columnView).map((col) => {
                      if (col.key === 'actions') {
                        return (
                          <td key="actions" className="px-3 py-3 min-h-[48px]">
                            <div className="flex gap-2 justify-start">
                              <button
                                onClick={() => saveDraftRow(draft.id)}
                                className="px-3 py-2 bg-green-700 text-white rounded text-xs font-semibold hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-800 transition flex items-center gap-1"
                                title="Зберегти замовлення"
                              >
                                <Check size={14} />
                                Зберегти
                              </button>
                              <button
                                onClick={() => deleteDraftRow(draft.id)}
                                className="px-3 py-2 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 transition flex items-center gap-1"
                                title="Видалити чернетку"
                              >
                                <X size={14} />
                                Видалити
                              </button>
                            </div>
                          </td>
                        );
                      }

                      const value = (draft as any)[col.key];
                      const isRequired = ['client_id', 'title', 'link'].includes(col.key);

                      if (col.key === 'status') {
                        return (
                          <td key={col.key} className="p-0 relative">
                            <select
                              value={draft.status}
                              onChange={(e) => updateDraftRow(draft.id, 'status', e.target.value)}
                              className="w-full h-full px-2 py-3 text-xs font-semibold border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-500 text-gray-900 dark:text-gray-100"
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
                        );
                      }

                      if (col.key === 'verified') {
                        return (
                          <td key={col.key} className="px-3 py-3 text-center min-h-[48px]">
                            <input
                              type="checkbox"
                              checked={draft.verified}
                              onChange={(e) => updateDraftRow(draft.id, 'verified', e.target.checked)}
                              className="w-5 h-5 rounded cursor-pointer transition text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-600"
                            />
                          </td>
                        );
                      }

                      if (col.key === 'link') {
                        return (
                          <td key={col.key} className="px-3 py-3 min-h-[48px]">
                            <input
                              type="text"
                              value={draft.link}
                              onChange={(e) => updateDraftRow(draft.id, 'link', e.target.value)}
                              placeholder="Посилання *"
                              className="w-full px-2 py-1 border border-red-300 dark:border-red-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </td>
                        );
                      }

                      if (col.key === 'payment_type') {
                        return (
                          <td key={col.key} className="p-0 relative">
                            <select
                              value={draft.payment_type}
                              onChange={(e) => updateDraftRow(draft.id, 'payment_type', e.target.value)}
                              className="w-full h-full px-2 py-3 text-xs font-semibold border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-500 text-gray-900 dark:text-gray-100"
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
                        );
                      }

                      if (col.key === 'total_cost') {
                        return (
                          <td key={col.key} className="px-3 py-3 text-center text-gray-900 dark:text-gray-100 font-bold bg-orange-50 dark:bg-orange-900/20 min-h-[48px]">
                            {formatNumber(draft.total_cost)} zl
                          </td>
                        );
                      }

                      if (col.key === 'cash_on_delivery') {
                        return (
                          <td key={col.key} className="px-3 py-3 min-h-[48px]">
                            <input
                              type="number"
                              step="0.01"
                              value={draft.cash_on_delivery}
                              onChange={(e) => updateDraftRow(draft.id, 'cash_on_delivery', Number(e.target.value))}
                              disabled={draft.payment_type === 'оплачено'}
                              placeholder="0"
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                        );
                      }

                      if (['part_price', 'delivery_cost'].includes(col.key)) {
                        return (
                          <td key={col.key} className="px-3 py-3 min-h-[48px]">
                            <input
                              type="number"
                              step="0.01"
                              value={value}
                              onChange={(e) => updateDraftRow(draft.id, col.key, Number(e.target.value))}
                              placeholder="0"
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </td>
                        );
                      }

                      if (col.renderType === 'date') {
                        return (
                          <td key={col.key} className="px-3 py-3 min-h-[48px]">
                            <input
                              type="date"
                              value={value || ''}
                              onChange={(e) => updateDraftRow(draft.id, col.key, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </td>
                        );
                      }

                      if (col.key === 'manager') {
                        return (
                          <td key={col.key} className="p-0 relative">
                            <select
                              value={draft.manager_id || ''}
                              onChange={(e) => updateDraftRow(draft.id, 'manager_id', e.target.value)}
                              className="w-full h-full px-2 py-3 text-xs font-semibold border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                            >
                              <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Не обрано</option>
                              {managers.map((manager) => (
                                <option
                                  key={manager.id}
                                  value={manager.id}
                                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  {manager.full_name || manager.email}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} className="px-3 py-3 min-h-[48px]">
                          <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => updateDraftRow(draft.id, col.key, e.target.value)}
                            placeholder={isRequired ? `${col.label} *` : col.label}
                            className={`w-full px-2 py-1 border ${isRequired ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'} rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filteredOrders.map((order) => {
                const isAccepted = order.status === 'прийнято';
                return (
                <tr key={order.id} className={`${!isAccepted ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : ''} ${selectedOrders.has(order.id) ? 'bg-blue-50 dark:bg-blue-900/50' : ''} ${isAccepted ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-3 text-center min-h-[48px]">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      className="w-4 h-4 rounded cursor-pointer text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600"
                      onClick={(e) => e.stopPropagation()}
                      disabled={isAccepted}
                    />
                  </td>
                  {getColumns(columnView).map((col) => {
                    if (col.key === 'actions') {
                      return (
                        <td key="actions" className="px-3 py-3 min-h-[48px]">
                          <div className="flex gap-2 justify-center">
                            {!isAccepted && (
                              <button
                                onClick={() => openEditModal(order)}
                                className="px-3 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 rounded text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/70 transition flex items-center gap-1"
                              >
                                <Edit size={14} />
                                Ред.
                              </button>
                            )}
                            {!order.archived && !isAccepted && (
                              <button
                                onClick={() => handleReturn(order)}
                                className="px-3 py-2 bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200 rounded text-xs font-semibold hover:bg-orange-100 dark:hover:bg-orange-900/70 transition flex items-center gap-1"
                                title="Створити повернення"
                              >
                                <RotateCcw size={14} />
                                Пов.
                              </button>
                            )}
                            {!isAccepted && (
                              <button
                                onClick={() => handleArchive(order.id)}
                                className="px-3 py-2 bg-gray-50 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300 rounded text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700/70 transition flex items-center gap-1"
                                title={order.archived ? 'Розархівувати' : 'Архівувати'}
                              >
                                <Archive size={14} />
                                {order.archived ? 'Розарх.' : 'Арх.'}
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    }
                    return renderColumnCell(order, col.key, isAccepted);
                  })}
                </tr>
                );
                })}
            </tbody>
          </table>
          </div>
        </div>
      ) : activeTab === 'orders' ? (
        <div className="flex-1 overflow-auto min-h-0 flex flex-col bg-gray-100 dark:bg-gray-900">
          {selectedOrders.size > 0 && (
            <div className="flex-shrink-0 p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-end items-center">
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
                    <option value="" disabled className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Змінити статус</option>
                    {statuses.map((status) => (
                      <option key={status} value={status} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{statusLabels[status]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => bulkUpdateVerified(true)}
                    className="px-3 py-1 text-sm bg-green-700 text-white rounded hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-800 transition"
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
            </div>
          )}
          <div className="flex-1 overflow-auto space-y-4 p-4">
          {Object.entries(groupBy === 'status' ? groupOrdersByStatus() : groupBy === 'payment' ? groupOrdersByPaymentType() : groupOrdersByVerified()).map(([key, groupOrders]) => {
            if (groupOrders.length === 0) return null;
            const isCollapsed = collapsedGroups.has(key);
            const colors = groupBy === 'status' ? statusColors[key] : groupBy === 'payment' ? paymentTypeColors[key] : verifiedColors[key];
            const label = groupBy === 'status' ? statusLabels[key] : groupBy === 'payment' ? paymentTypeLabels[key] : verifiedLabels[key];

            return (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <button
                  onClick={() => toggleGroupCollapse(key)}
                  className={`w-full px-4 py-3 font-semibold text-sm ${colors} flex items-center justify-between hover:opacity-90 transition rounded-t-lg`}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    <span>{label}</span>
                  </div>
                  <span className="bg-white/30 dark:bg-black/30 px-2 py-1 rounded-full text-xs">{groupOrders.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          <input
                            type="checkbox"
                            checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                            onChange={toggleAllOrders}
                            className="w-4 h-4 rounded cursor-pointer text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600"
                          />
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Статус</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">V</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID клієнта</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Назва</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"><ExternalLink size={16} className="inline-block" /></th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Трекінг PL</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Вартість запч.</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Доставка</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Всього</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">№ запчастини</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Тип оплати</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Побранє</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дії</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {groupOrders.map((order) => {
                      const isAccepted = order.status === 'прийнято';
                      return (
                        <tr key={order.id} className={`${!isAccepted ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : ''} ${selectedOrders.has(order.id) ? 'bg-blue-50 dark:bg-blue-900' : ''} ${isAccepted ? 'opacity-50' : ''}`}>
                          <td className="px-3 py-3 text-center min-h-[48px]">
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="w-4 h-4 rounded cursor-pointer text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600"
                              onClick={(e) => e.stopPropagation()}
                              disabled={isAccepted}
                            />
                          </td>
                          <td className="p-0 relative">
                            <button
                              onClick={(e) => {
                                if (isAccepted) return;
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
                              className={`w-full h-full px-3 py-2 text-xs font-semibold ${statusColors[order.status]} ${!isAccepted ? 'hover:opacity-80' : 'cursor-default'} transition flex items-center justify-center gap-1 min-h-[40px]`}
                              disabled={isAccepted}
                            >
                              {statusLabels[order.status]}
                              {!isAccepted && <ChevronDown size={14} />}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-center min-h-[48px]">
                            <input
                              type="checkbox"
                              checked={order.verified}
                              onChange={() => handleVerifiedChange(order.id, order.verified)}
                              className={`w-5 h-5 rounded cursor-pointer transition ${
                                order.verified
                                  ? 'accent-green-700 bg-green-700 dark:accent-green-600 dark:bg-green-600'
                                  : 'border-2 border-gray-800 dark:border-gray-400 accent-gray-800 dark:accent-gray-400 bg-white dark:bg-gray-600'
                              }`}
                              disabled={isAccepted}
                            />
                          </td>
                          {renderEditableCell(order.id, 'client_id', order.client_id, 'text-gray-900 text-center', isAccepted)}
                          {renderEditableCell(order.id, 'title', order.title, 'text-gray-900 text-center', isAccepted)}
                          {renderLinkCell(order.id, order.link || '', isAccepted)}
                          {renderEditableCell(order.id, 'tracking_pl', order.tracking_pl || '', 'text-gray-600 text-center', isAccepted)}
                          {renderEditableCell(order.id, 'part_price', `${formatNumber(order.part_price)} zl`, 'text-gray-900 font-medium text-center', isAccepted)}
                          {renderEditableCell(order.id, 'delivery_cost', `${formatNumber(order.delivery_cost)} zl`, 'text-gray-900 text-center', isAccepted)}
                          <td className="px-3 py-3 text-center text-gray-900 dark:text-gray-100 font-bold bg-gray-50 dark:bg-gray-700 min-h-[48px]">
                            {formatNumber(order.total_cost)} zl
                          </td>
                          {renderEditableCell(order.id, 'part_number', order.part_number || '', 'text-gray-600 text-center', isAccepted)}
                          {renderPaymentTypeCell(order.id, order.payment_type || 'оплачено', isAccepted)}
                          {renderEditableCell(order.id, 'cash_on_delivery', `${formatNumber(order.cash_on_delivery)} zl`, 'text-gray-900 text-center', isAccepted)}
                          <td className="px-3 py-3 min-h-[48px]">
                            <div className="flex gap-2 justify-center">
                              {!isAccepted && (
                                <button
                                  onClick={() => openEditModal(order)}
                                  className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-semibold hover:opacity-80 transition flex items-center gap-1"
                                >
                                  <Edit size={14} />
                                  Ред.
                                </button>
                              )}
                              {!order.archived && !isAccepted && (
                                <button
                                  onClick={() => handleReturn(order)}
                                  className="px-3 py-2 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-xs font-semibold hover:opacity-80 transition flex items-center gap-1"
                                  title="Створити повернення"
                                >
                                  <RotateCcw size={14} />
                                  Пов.
                                </button>
                              )}
                              {!isAccepted && (
                                <button
                                  onClick={() => handleArchive(order.id)}
                                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs font-semibold hover:opacity-80 transition flex items-center gap-1"
                                  title={order.archived ? 'Розархівувати' : 'Архівувати'}
                                >
                                  <Archive size={14} />
                                  {order.archived ? 'Розарх.' : 'Арх.'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                      })}
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

      {activeTab === 'orders' && openAcceptedDropdown && acceptedDropdownPosition && (
        <div
          ref={acceptedDropdownRef}
          className="fixed z-[9999] w-56 bg-white dark:bg-gray-700 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 py-1 max-h-[400px] overflow-y-auto"
          style={{ top: `${acceptedDropdownPosition.top}px`, left: `${acceptedDropdownPosition.left}px`, maxHeight: `${Math.min(400, window.innerHeight - acceptedDropdownPosition.top - 20)}px` }}
        >
          {statuses.map((statusOption) => (
            <button
              key={statusOption}
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptedStatusChange(openAcceptedDropdown, statusOption);
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition text-gray-900 dark:text-gray-100 ${
                acceptedOrders.find(o => o.id === openAcceptedDropdown)?.status === statusOption ? 'bg-gray-100 dark:bg-gray-600 font-semibold' : ''
              }`}
            >
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${statusColors[statusOption].split(' ')[0]} dark:opacity-80`}></span>
              {statusLabels[statusOption]}
            </button>
          ))}
        </div>
      )}

      {isAcceptConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Підтвердження прийому</h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">Ви впевнені в цій операції?</p>
            <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Пояснення (чому прийом поза документом):</p>
            <textarea
              value={acceptExplanation}
              onChange={(e) => setAcceptExplanation(e.target.value)}
              placeholder="Введіть пояснення..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md mb-4 min-h-[100px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <div className="flex gap-3">
              <button
                onClick={confirmAcceptOrder}
                className="flex-1 bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-800 transition font-semibold"
              >
                Підтвердити
              </button>
              <button
                onClick={() => {
                  setIsAcceptConfirmOpen(false);
                  setAcceptingOrderId(null);
                  setAcceptExplanation('');
                }}
                className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition font-semibold"
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

      {isAcceptedOrdersModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full h-full max-w-[98%] max-h-[98vh] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-200">Прийняті замовлення ({acceptedOrders.length})</h3>
              <button
                onClick={() => setIsAcceptedOrdersModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <X size={24} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full border-collapse">
                <thead className="bg-green-700 dark:bg-green-900 sticky top-0 z-10">
                  <tr>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-left text-sm font-semibold text-white">№ Док</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-left text-sm font-semibold text-white">Статус</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-left text-sm font-semibold text-white">Назва</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-left text-sm font-semibold text-white">ID Клієнта</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-left text-sm font-semibold text-white">№ Запчастини</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-center text-sm font-semibold text-white"><ExternalLink size={16} className="inline-block" /></th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-left text-sm font-semibold text-white">ТТН</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-right text-sm font-semibold text-white">Вага (кг)</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-right text-sm font-semibold text-white">Запчастини</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-right text-sm font-semibold text-white">Доставка</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-right text-sm font-semibold text-white">Отримали PLN</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-right text-sm font-semibold text-white">Наложка</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-right text-sm font-semibold text-white">Транспорт USD</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-left text-sm font-semibold text-white">Тип оплати</th>
                    <th className="border border-green-600 dark:border-green-800 px-3 py-3 text-left text-sm font-semibold text-white">Дата прийому</th>
                  </tr>
                </thead>
                <tbody>
                  {acceptedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-green-50 dark:hover:bg-green-900/20 transition">
                      <td
                        className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100 font-semibold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                        title={order.explanation || 'Немає пояснення'}
                        onClick={() => openReceiptDetails(order.receipt_number)}
                      >
                        {order.receipt_number}
                      </td>
                      <td
                        className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm cursor-pointer hover:bg-green-100 dark:hover:bg-green-800/30 transition"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setAcceptedDropdownPosition({ top: rect.bottom, left: rect.left });
                          setOpenAcceptedDropdown(order.id);
                        }}
                      >
                        <span className={`inline-block px-2 py-1 rounded-full ${statusColors[order.status || 'в роботі на сьогодні']} dark:opacity-90`}>
                          {statusLabels[order.status || 'в роботі на сьогодні']}
                        </span>
                      </td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100">{order.title || '-'}</td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100">{order.client_id || '-'}</td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100">{order.part_number || '-'}</td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100 text-center">
                        {order.link ? (
                          <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400">
                            <ExternalLink size={16} className="inline-block" />
                          </a>
                        ) : <span className="text-gray-400 dark:text-gray-600"><ExternalLink size={16} className="inline-block" /></span>}
                      </td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100">{order.tracking_number || '-'}</td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">{order.weight_kg.toFixed(2)}</td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">{order.part_price.toFixed(2)}</td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">{order.delivery_cost.toFixed(2)}</td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">{order.received_pln.toFixed(2)}</td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">{order.cash_on_delivery.toFixed(2)}</td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">{order.transport_cost_usd.toFixed(2)}</td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100">{order.payment_type || '-'}</td>
                      <td className="border border-green-500 dark:border-green-800 px-3 py-3 text-sm text-gray-900 dark:text-gray-100">{new Date(order.accepted_at).toLocaleDateString('uk-UA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedReceiptNumber && receiptDetails.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10001] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full h-full max-w-[98%] max-h-[98vh] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 print:hidden">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Документ прийому: {selectedReceiptNumber}</h3>
              <div className="flex gap-2">
                <button
                  onClick={printReceipt}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition flex items-center gap-2"
                  title="Друкувати/Зберегти PDF"
                >
                  <Printer size={20} />
                  <span>Друк</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedReceiptNumber(null);
                    setReceiptDetails([]);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <X size={24} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 print:p-8">
              <div className="max-w-7xl mx-auto bg-white dark:bg-gray-900 print:bg-white">
                <div className="text-center mb-8 print:mb-12">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 print:text-black mb-2">ДОКУМЕНТ ПРИЙОМУ ТОВАРУ</h1>
                  <p className="text-xl text-gray-700 dark:text-gray-300 print:text-black">№ {selectedReceiptNumber}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black mt-2">
                    Дата прийому: {new Date(receiptDetails[0].accepted_at).toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  {receiptDetails[0].explanation && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg print:bg-yellow-50">
                      <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 print:text-yellow-900">Пояснення:</p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-300 print:text-yellow-800">{receiptDetails[0].explanation}</p>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-black mb-4 border-b-2 border-gray-300 dark:border-gray-600 print:border-black pb-2">
                    Загальна інформація
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg print:bg-blue-50 print:border print:border-blue-300">
                      <p className="text-xs text-blue-600 dark:text-blue-400 print:text-blue-600 font-semibold">Кількість позицій</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 print:text-blue-900">{receiptDetails.length}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg print:bg-green-50 print:border print:border-green-300">
                      <p className="text-xs text-green-600 dark:text-green-400 print:text-green-600 font-semibold">Загальна вага</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100 print:text-green-900">
                        {receiptDetails.reduce((sum, item) => sum + item.weight_kg, 0).toFixed(2)} кг
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg print:bg-purple-50 print:border print:border-purple-300">
                      <p className="text-xs text-purple-600 dark:text-purple-400 print:text-purple-600 font-semibold">Отримано PLN</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 print:text-purple-900">
                        {receiptDetails.reduce((sum, item) => sum + item.received_pln, 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg print:bg-orange-50 print:border print:border-orange-300">
                      <p className="text-xs text-orange-600 dark:text-orange-400 print:text-orange-600 font-semibold">Транспорт USD</p>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 print:text-orange-900">
                        {receiptDetails.reduce((sum, item) => sum + item.transport_cost_usd, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-black mb-4 border-b-2 border-gray-300 dark:border-gray-600 print:border-black pb-2">
                    Деталі замовлень
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 print:border-black">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700 print:bg-gray-200">
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">#</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">№ Замовлення</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">Назва</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">ID Клієнта</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">№ Запчастини</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">ТТН</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">Вага (кг)</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">Запчастини</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">Доставка</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">Отримали PLN</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">Наложка</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">Транспорт USD</th>
                          <th className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 print:text-black">Тип оплати</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptDetails.map((order, index) => (
                          <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 print:hover:bg-transparent">
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black font-semibold">{index + 1}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black">{order.order_number || '-'}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black">{order.title || '-'}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black">{order.client_id || '-'}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black">{order.part_number || '-'}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black">{order.tracking_number || '-'}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">{order.weight_kg.toFixed(2)}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">{order.part_price.toFixed(2)}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">{order.delivery_cost.toFixed(2)}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">{order.received_pln.toFixed(2)}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">{order.cash_on_delivery.toFixed(2)}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">{order.transport_cost_usd.toFixed(2)}</td>
                            <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black">{order.payment_type || '-'}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100 dark:bg-gray-700 print:bg-gray-200 font-bold">
                          <td colSpan={6} className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">РАЗОМ:</td>
                          <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">
                            {receiptDetails.reduce((sum, item) => sum + item.weight_kg, 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">
                            {receiptDetails.reduce((sum, item) => sum + item.part_price, 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">
                            {receiptDetails.reduce((sum, item) => sum + item.delivery_cost, 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">
                            {receiptDetails.reduce((sum, item) => sum + item.received_pln, 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">
                            {receiptDetails.reduce((sum, item) => sum + item.cash_on_delivery, 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black text-right">
                            {receiptDetails.reduce((sum, item) => sum + item.transport_cost_usd, 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 print:border-black px-3 py-3 text-sm text-gray-900 dark:text-gray-100 print:text-black"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-12 print:mt-16 border-t-2 border-gray-300 dark:border-gray-600 print:border-black pt-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black mb-2">Підпис відповідальної особи:</p>
                      <div className="border-b-2 border-gray-400 dark:border-gray-500 print:border-black h-12"></div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black mb-2">Дата:</p>
                      <div className="border-b-2 border-gray-400 dark:border-gray-500 print:border-black h-12"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
