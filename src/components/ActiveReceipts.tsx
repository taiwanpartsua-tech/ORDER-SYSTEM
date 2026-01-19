import { useState, useEffect } from 'react';
import { supabase, Order, Supplier, ReceiptFieldChange, DraftOrder } from '../lib/supabase';
import { ChevronRight, Send, X, AlertCircle, ExternalLink, Search, XCircle, History, ChevronDown, ChevronUp, Archive, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { ExportButton } from './ExportButton';
import { exportToCSV } from '../utils/exportData';
import { getCurrentProjectId } from '../utils/projectAccess';

type OrderWithSupplier = Order & { supplier: Supplier };

type EditableOrder = OrderWithSupplier & {
  editableParts: number;
  editableDelivery: number;
  editableReceipt: number;
  editableCash: number;
  editableTransport: number;
  editableWeight: number;
};

type PaymentGroup = 'cash_on_delivery' | 'paid';

type ActiveReceiptsProps = {
  onNavigateToManagement: () => void;
};

export default function ActiveReceipts({ onNavigateToManagement }: ActiveReceiptsProps) {
  const { showSuccess, showError, showWarning } = useToast();
  const [availableOrders, setAvailableOrders] = useState<OrderWithSupplier[]>([]);
  const [cashOnDeliveryOrders, setCashOnDeliveryOrders] = useState<EditableOrder[]>([]);
  const [paidOrders, setPaidOrders] = useState<EditableOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>([]);

  const [cashOnDeliveryReceiptNumber, setCashOnDeliveryReceiptNumber] = useState<string>('');
  const [paidReceiptNumber, setPaidReceiptNumber] = useState<string>('');
  const [orderChanges, setOrderChanges] = useState<Record<string, ReceiptFieldChange[]>>({});
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set());

  function generateReceiptNumber(group: PaymentGroup): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const prefix = group === 'cash_on_delivery' ? 'ПС' : 'О';
    return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  function formatNumber(num: number): string {
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  }

  async function loadActiveReceiptOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, supplier:suppliers(*)')
      .eq('status', 'в активному прийомі')
      .not('active_receipt_group', 'is', null);

    if (data && data.length > 0) {
      const cashOrders: EditableOrder[] = [];
      const paidOrders: EditableOrder[] = [];

      for (const order of data as OrderWithSupplier[]) {
        const editableOrder: EditableOrder = {
          ...order,
          editableParts: order.part_price || 0,
          editableDelivery: order.delivery_cost || 0,
          editableReceipt: order.received_pln || 0,
          editableCash: order.cash_on_delivery || 0,
          editableTransport: order.transport_cost_usd || 0,
          editableWeight: order.weight_kg || 0
        };

        if (order.active_receipt_group === 'cash_on_delivery') {
          cashOrders.push(editableOrder);
        } else if (order.active_receipt_group === 'paid') {
          paidOrders.push(editableOrder);
        }
      }

      if (cashOrders.length > 0) {
        setCashOnDeliveryOrders(cashOrders);
        setCashOnDeliveryReceiptNumber(generateReceiptNumber('cash_on_delivery'));
      }

      if (paidOrders.length > 0) {
        setPaidOrders(paidOrders);
        setPaidReceiptNumber(generateReceiptNumber('paid'));
      }
    }
  }

  useEffect(() => {
    loadAvailableOrders();
    loadActiveReceiptOrders();
    loadDraftOrders();
  }, []);

  async function loadAvailableOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, supplier:suppliers(*)')
      .not('status', 'in', '(повернення,проблемні,анульовано,"в активному прийомі",прийнято)')
      .order('created_at', { ascending: false });

    if (data) {
      setAvailableOrders(data as OrderWithSupplier[]);
    }
  }

  async function loadDraftOrders() {
    try {
      const projectId = await getCurrentProjectId();
      if (!projectId) {
        console.error('Не знайдено project_id для завантаження чернеток');
        return;
      }

      const { data, error } = await supabase
        .from('draft_orders')
        .select('*')
        .eq('project_id', projectId)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Помилка завантаження чернеток:', error);
      } else if (data) {
        setDraftOrders(data);
      }
    } catch (err) {
      console.error('Помилка при завантаженні чернеток:', err);
    }
  }

  async function moveDraftToActiveReceipt(draft: DraftOrder, group: PaymentGroup) {
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

    const dataToSubmit: any = {
      order_number: draft.order_number,
      supplier_id: draft.supplier_id || null,
      manager_id: draft.manager_id || null,
      status: 'в активному прийомі',
      active_receipt_group: group,
      order_date: draft.order_date,
      notes: draft.notes,
      title: draft.title,
      link: draft.link,
      tracking_pl: draft.tracking_pl,
      part_price: draft.part_price,
      delivery_cost: draft.delivery_cost,
      total_cost: draft.total_cost,
      part_number: draft.part_number,
      payment_type: draft.payment_type,
      cash_on_delivery: draft.cash_on_delivery,
      client_id: draft.client_id,
      received_pln: draft.received_pln,
      transport_cost_usd: draft.transport_cost_usd,
      weight_kg: draft.weight_kg,
      verified: draft.verified,
      project_id: draft.project_id
    };

    try {
      const { error: insertError } = await supabase.from('orders').insert([dataToSubmit]);
      if (insertError) {
        console.error('Error inserting order:', insertError);
        showError('Помилка при створенні замовлення: ' + insertError.message);
        return;
      }

      // Видаляємо чернетку після успішного створення замовлення
      await supabase.from('draft_orders').delete().eq('id', draft.id);

      showSuccess('Чернетку додано до активного прийому!');
      loadDraftOrders();
      loadActiveReceiptOrders();
    } catch (err) {
      console.error('Network error:', err);
      showError('Помилка мережі: Перевірте підключення до інтернету');
    }
  }

  async function archiveDraft(draftId: string) {
    try {
      const { error } = await supabase
        .from('draft_orders')
        .update({
          archived: true,
          archived_at: new Date().toISOString()
        })
        .eq('id', draftId);

      if (error) {
        console.error('Error archiving draft:', error);
        showError('Помилка архівування чернетки');
        return;
      }

      showSuccess('Чернетку архівовано!');
      loadDraftOrders();
    } catch (err) {
      console.error('Network error:', err);
      showError('Помилка мережі');
    }
  }

  async function loadOrderChanges(orderId: string) {
    const { data } = await supabase
      .from('receipt_field_changes')
      .select('*')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: false });

    if (data) {
      setOrderChanges(prev => ({
        ...prev,
        [orderId]: data
      }));
    }
  }

  function toggleOrderChanges(orderId: string) {
    const newExpanded = new Set(expandedChanges);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
      if (!orderChanges[orderId]) {
        loadOrderChanges(orderId);
      }
    }
    setExpandedChanges(newExpanded);
  }

  function getOrderGroup(order: OrderWithSupplier | EditableOrder): PaymentGroup {
    const paymentType = order.payment_type?.toLowerCase() || '';
    if (paymentType.includes('побран') || paymentType.includes('самовив')) {
      return 'cash_on_delivery';
    }
    return 'paid';
  }

  const filteredAvailableOrders = availableOrders.filter(order => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase().trim();
    return (
      (order.client_id && order.client_id.toLowerCase().includes(searchLower)) ||
      (order.title && order.title.toLowerCase().includes(searchLower)) ||
      (order.tracking_pl && order.tracking_pl.toLowerCase().includes(searchLower)) ||
      (order.part_number && order.part_number.toLowerCase().includes(searchLower))
    );
  });

  const availableCashOnDeliveryOrders = filteredAvailableOrders.filter(order => getOrderGroup(order) === 'cash_on_delivery');
  const availablePaidOrders = filteredAvailableOrders.filter(order => getOrderGroup(order) === 'paid');

  const filteredCashOnDeliveryOrders = cashOnDeliveryOrders.filter(order => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase().trim();
    return (
      (order.client_id && order.client_id.toLowerCase().includes(searchLower)) ||
      (order.title && order.title.toLowerCase().includes(searchLower)) ||
      (order.tracking_pl && order.tracking_pl.toLowerCase().includes(searchLower)) ||
      (order.part_number && order.part_number.toLowerCase().includes(searchLower))
    );
  });

  const filteredPaidOrders = paidOrders.filter(order => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase().trim();
    return (
      (order.client_id && order.client_id.toLowerCase().includes(searchLower)) ||
      (order.title && order.title.toLowerCase().includes(searchLower)) ||
      (order.tracking_pl && order.tracking_pl.toLowerCase().includes(searchLower)) ||
      (order.part_number && order.part_number.toLowerCase().includes(searchLower))
    );
  });

  async function moveToActiveReceipt(order: OrderWithSupplier, group: PaymentGroup) {
    const editableOrder: EditableOrder = {
      ...order,
      editableParts: order.part_price || 0,
      editableDelivery: order.delivery_cost || 0,
      editableReceipt: order.received_pln || 0,
      editableCash: order.cash_on_delivery || 0,
      editableTransport: order.transport_cost_usd || 0,
      editableWeight: order.weight_kg || 0
    };

    const { error } = await supabase
      .from('orders')
      .update({
        previous_status: order.status,
        status: 'в активному прийомі',
        active_receipt_group: group
      })
      .eq('id', order.id);

    if (error) {
      console.error('Помилка оновлення статусу:', error);
      showError('Помилка оновлення статусу замовлення');
      return;
    }

    setAvailableOrders(prev => prev.filter(o => o.id !== order.id));

    if (group === 'cash_on_delivery') {
      setCashOnDeliveryOrders(prev => [...prev, editableOrder]);
      if (!cashOnDeliveryReceiptNumber) {
        setCashOnDeliveryReceiptNumber(generateReceiptNumber('cash_on_delivery'));
      }
    } else {
      setPaidOrders(prev => [...prev, editableOrder]);
      if (!paidReceiptNumber) {
        setPaidReceiptNumber(generateReceiptNumber('paid'));
      }
    }
  }

  async function removeFromActiveReceipt(order: EditableOrder, group: PaymentGroup) {
    await supabase
      .from('orders')
      .update({
        status: order.previous_status || order.status,
        previous_status: null,
        active_receipt_group: null
      })
      .eq('id', order.id);

    if (group === 'cash_on_delivery') {
      setCashOnDeliveryOrders(prev => prev.filter(o => o.id !== order.id));
    } else {
      setPaidOrders(prev => prev.filter(o => o.id !== order.id));
    }

    await loadAvailableOrders();
  }

  function updateOrderField(orderId: string, field: keyof EditableOrder, value: number, group: PaymentGroup) {
    if (group === 'cash_on_delivery') {
      setCashOnDeliveryOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, [field]: value } : order
        )
      );
    } else {
      setPaidOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, [field]: value } : order
        )
      );
    }
  }

  async function handleSaveReceipt(group: PaymentGroup) {
    try {
      const orders = group === 'cash_on_delivery' ? cashOnDeliveryOrders : paidOrders;
      const receiptNumber = group === 'cash_on_delivery' ? cashOnDeliveryReceiptNumber : paidReceiptNumber;

      if (orders.length === 0) {
        showWarning('Додайте замовлення до прійомки');
        return;
      }

      if (!receiptNumber || receiptNumber.trim() === '') {
        showWarning('Номер прійомки порожній. Спробуйте перезавантажити сторінку.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError('Помилка авторизації. Увійдіть знову.');
        return;
      }

      const projectId = await getCurrentProjectId();
      if (!projectId) {
        showError('Помилка: не знайдено доступу до проекту. Зв\'яжіться з адміністратором.');
        return;
      }

      let supplier = orders[0].supplier;

      if (!supplier) {
        const { data: orderData } = await supabase
          .from('orders')
          .select('*, supplier:suppliers(*)')
          .eq('id', orders[0].id)
          .maybeSingle();

        if (orderData && orderData.supplier) {
          supplier = orderData.supplier;
        } else {
          showError('Помилка: замовлення не має інформації про постачальника. Спробуйте перезавантажити сторінку.');
          return;
        }
      }

      const receiptDate = new Date().toISOString().split('T')[0];

      const totals = orders.reduce((acc, order) => {
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

      const { data: receipt, error } = await supabase
        .from('active_receipts')
        .insert([{
          receipt_number: receiptNumber,
          receipt_date: receiptDate,
          status: 'draft',
          supplier_id: supplier.id,
          project_id: projectId,
          parts_cost_pln: totals.parts_cost_pln,
          delivery_cost_pln: totals.delivery_cost_pln,
          receipt_cost_pln: totals.receipt_cost_pln,
          cash_on_delivery_pln: totals.cash_on_delivery_pln,
          transport_cost_usd: totals.transport_cost_usd,
          total_pln,
          total_usd: totals.transport_cost_usd,
          created_by: user.id
        }])
        .select()
        .single();

      if (error || !receipt) {
        console.error('Помилка створення прійомки:', error);
        showError('Помилка створення прійомки: ' + (error?.message || 'невідома помилка'));
        return;
      }

      const receiptOrdersData = orders.map(order => ({
        receipt_id: receipt.id,
        order_id: order.id,
        amount: (order.part_price || 0) + (order.delivery_cost || 0)
      }));

      const { error: receiptOrdersError } = await supabase.from('receipt_orders').insert(receiptOrdersData);

      if (receiptOrdersError) {
        console.error('Помилка додавання замовлень до прійомки:', receiptOrdersError);
      }

      const snapshotsData = orders.map(order => ({
        receipt_id: receipt.id,
        order_id: order.id,
        original_weight_kg: order.weight_kg || 0,
        original_part_price: order.part_price || 0,
        original_delivery_cost: order.delivery_cost || 0,
        original_received_pln: order.received_pln || 0,
        original_cash_on_delivery: order.cash_on_delivery || 0,
        original_transport_cost_usd: order.transport_cost_usd || 0
      }));

      const { error: snapshotsError } = await supabase.from('receipt_order_snapshots').insert(snapshotsData);

      if (snapshotsError) {
        console.error('Помилка збереження знімків замовлень:', snapshotsError);
      }

      const fieldChanges = [];

      for (const order of orders) {
        const changes = [];

        if (order.editableWeight !== (order.weight_kg || 0)) {
          changes.push({
            receipt_id: receipt.id,
            order_id: order.id,
            project_id: projectId,
            field_name: 'Вага (кг)',
            old_value: String(order.weight_kg || 0),
            new_value: String(order.editableWeight),
            changed_by: user.id,
            changed_at: new Date().toISOString()
          });
        }

        if (order.editableParts !== (order.part_price || 0)) {
          changes.push({
            receipt_id: receipt.id,
            order_id: order.id,
            project_id: projectId,
            field_name: 'Ціна деталі (PLN)',
            old_value: String(order.part_price || 0),
            new_value: String(order.editableParts),
            changed_by: user.id,
            changed_at: new Date().toISOString()
          });
        }

        if (order.editableDelivery !== (order.delivery_cost || 0)) {
          changes.push({
            receipt_id: receipt.id,
            order_id: order.id,
            project_id: projectId,
            field_name: 'Доставка (PLN)',
            old_value: String(order.delivery_cost || 0),
            new_value: String(order.editableDelivery),
            changed_by: user.id,
            changed_at: new Date().toISOString()
          });
        }

        if (order.editableReceipt !== (order.received_pln || 0)) {
          changes.push({
            receipt_id: receipt.id,
            order_id: order.id,
            project_id: projectId,
            field_name: 'Прийом (PLN)',
            old_value: String(order.received_pln || 0),
            new_value: String(order.editableReceipt),
            changed_by: user.id,
            changed_at: new Date().toISOString()
          });
        }

        if (order.editableCash !== (order.cash_on_delivery || 0)) {
          changes.push({
            receipt_id: receipt.id,
            order_id: order.id,
            project_id: projectId,
            field_name: 'Накладений платіж (PLN)',
            old_value: String(order.cash_on_delivery || 0),
            new_value: String(order.editableCash),
            changed_by: user.id,
            changed_at: new Date().toISOString()
          });
        }

        if (order.editableTransport !== (order.transport_cost_usd || 0)) {
          changes.push({
            receipt_id: receipt.id,
            order_id: order.id,
            project_id: projectId,
            field_name: 'Транспорт (USD)',
            old_value: String(order.transport_cost_usd || 0),
            new_value: String(order.editableTransport),
            changed_by: user.id,
            changed_at: new Date().toISOString()
          });
        }

        fieldChanges.push(...changes);

        await supabase
          .from('orders')
          .update({
            weight_kg: order.editableWeight,
            part_price: order.editableParts,
            delivery_cost: order.editableDelivery,
            received_pln: order.editableReceipt,
            cash_on_delivery: order.editableCash,
            transport_cost_usd: order.editableTransport,
            status: 'в активному прийомі',
            previous_status: null,
            active_receipt_group: null
          })
          .eq('id', order.id);
      }

      if (fieldChanges.length > 0) {
        const { error: changesError } = await supabase
          .from('receipt_field_changes')
          .insert(fieldChanges);

        if (changesError) {
          console.error('Помилка збереження історії змін:', changesError);
        }
      }

      if (group === 'cash_on_delivery') {
        setCashOnDeliveryOrders([]);
        setCashOnDeliveryReceiptNumber('');
      } else {
        setPaidOrders([]);
        setPaidReceiptNumber('');
      }

      loadAvailableOrders();

      showSuccess('Прійомку передано постачальнику на звірку.');
      onNavigateToManagement();
    } catch (error) {
      console.error('Помилка в handleSaveReceipt:', error);
      showError('Помилка збереження прійомки: ' + (error instanceof Error ? error.message : 'невідома помилка'));
    }
  }

  const cashOnDeliveryTotals = cashOnDeliveryOrders.reduce((acc, order) => {
    acc.parts += order.editableParts;
    acc.delivery += order.editableDelivery;
    acc.receipt += order.editableReceipt;
    acc.cash += order.editableCash;
    acc.transport += order.editableTransport;
    return acc;
  }, { parts: 0, delivery: 0, receipt: 0, cash: 0, transport: 0 });

  const cashOnDeliveryTotalPln = cashOnDeliveryTotals.parts + cashOnDeliveryTotals.delivery +
                                  cashOnDeliveryTotals.receipt + cashOnDeliveryTotals.cash;

  const paidTotals = paidOrders.reduce((acc, order) => {
    acc.parts += order.editableParts;
    acc.delivery += order.editableDelivery;
    acc.receipt += order.editableReceipt;
    acc.cash += order.editableCash;
    acc.transport += order.editableTransport;
    return acc;
  }, { parts: 0, delivery: 0, receipt: 0, cash: 0, transport: 0 });

  const paidTotalPln = paidTotals.parts + paidTotals.delivery + paidTotals.receipt + paidTotals.cash;

  const handleExportReceipts = () => {
    const allOrders = [
      ...availableOrders.map(order => ({ ...order, group: 'Доступні' })),
      ...cashOnDeliveryOrders.map(order => ({ ...order, group: 'Побранє' })),
      ...paidOrders.map(order => ({ ...order, group: 'Оплачені' }))
    ];

    const dataToExport = allOrders.map(order => ({
      group: order.group,
      client_id: order.client_id || '',
      order_number: order.order_number || '',
      supplier: order.supplier?.name || '',
      title: order.title || '',
      part_number: order.part_number || '',
      tracking_pl: order.tracking_pl || '',
      part_price: order.part_price,
      delivery_cost: order.delivery_cost,
      received_pln: order.received_pln,
      cash_on_delivery: order.cash_on_delivery,
      transport_cost_usd: order.transport_cost_usd,
      weight_kg: order.weight_kg,
      payment_type: order.payment_type || '',
      status: order.status
    }));

    const headers = {
      group: 'Група',
      client_id: 'ID Клієнта',
      order_number: '№ Замовлення',
      supplier: 'Постачальник',
      title: 'Назва',
      part_number: 'Артикул',
      tracking_pl: 'Трекінг PL',
      part_price: 'Ціна деталі',
      delivery_cost: 'Доставка',
      received_pln: 'Отримано PLN',
      cash_on_delivery: 'Побранє',
      transport_cost_usd: 'Транспорт USD',
      weight_kg: 'Вага кг',
      payment_type: 'Тип оплати',
      status: 'Статус'
    };

    exportToCSV(dataToExport, 'aktyvni_priyomky', headers);
  };

  return (
    <div className="h-full flex flex-col p-4 max-w-[98%] mx-auto relative">
      <div className="grid gap-4 flex-1 overflow-hidden min-h-0" style={{ gridTemplateColumns: '600px 1fr' }}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col overflow-hidden">
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                Доступні замовлення ({availableOrders.length + draftOrders.length})
                {draftOrders.length > 0 && (
                  <span className="ml-2 text-purple-600 dark:text-purple-400 text-sm">
                    (+{draftOrders.length} чернеток)
                  </span>
                )}
              </h3>
              <ExportButton
                onClick={handleExportReceipts}
                disabled={availableOrders.length === 0 && cashOnDeliveryOrders.length === 0 && paidOrders.length === 0 && draftOrders.length === 0}
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Пошук..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
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
          <div className="flex-1 overflow-y-auto">
            {availableCashOnDeliveryOrders.length > 0 && (
              <div className="mb-4">
                <div className="bg-amber-100 dark:bg-gradient-to-br dark:from-amber-950 dark:to-amber-900 px-3 py-2 font-semibold text-sm text-amber-900 dark:text-amber-200 sticky top-0 z-20">
                  Побрання / Самовивіз ({availableCashOnDeliveryOrders.length})
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-8 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">ID</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Назва</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">№ запч.</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 text-xs w-10">Посил.</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Трекінг</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {availableCashOnDeliveryOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs">{order.client_id || '-'}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs max-w-[150px] truncate" title={order.title || '-'}>{order.title || '-'}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs">{order.part_number || '-'}</td>
                        <td className="px-2 py-2 text-center">
                          {order.link ? (
                            <a
                              href={order.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900 inline-block"
                              title="Відкрити посилання"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs">{order.tracking_pl || '-'}</td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => moveToActiveReceipt(order, 'cash_on_delivery')}
                            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-1 rounded transition"
                            title="Додати до прійомки"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {availablePaidOrders.length > 0 && (
              <div className="mb-4">
                <div className="bg-green-100 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 px-3 py-2 font-semibold text-sm text-green-900 dark:text-green-200 sticky top-0 z-20">
                  Оплачені ({availablePaidOrders.length})
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-8 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">ID</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Назва</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">№ запч.</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 text-xs w-10">Посил.</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Трекінг</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {availablePaidOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs">{order.client_id || '-'}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs max-w-[150px] truncate" title={order.title || '-'}>{order.title || '-'}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs">{order.part_number || '-'}</td>
                        <td className="px-2 py-2 text-center">
                          {order.link ? (
                            <a
                              href={order.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900 inline-block"
                              title="Відкрити посилання"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs">{order.tracking_pl || '-'}</td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => moveToActiveReceipt(order, 'paid')}
                            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-1 rounded transition"
                            title="Додати до прійомки"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {draftOrders.length > 0 && (
              <div>
                <div className="bg-purple-100 dark:bg-gradient-to-br dark:from-purple-950 dark:to-purple-900 px-3 py-2 font-semibold text-sm text-purple-900 dark:text-purple-200 sticky top-0 z-20">
                  Чернетки ({draftOrders.length})
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-8 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">ID</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Назва</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">№ запч.</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 text-xs w-10">Посил.</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Трекінг</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 text-xs">Тип оплати</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {draftOrders.map((draft) => {
                      const draftGroup = draft.payment_type?.toLowerCase().includes('побран') ||
                                        draft.payment_type?.toLowerCase().includes('самовив')
                                        ? 'cash_on_delivery' : 'paid';

                      return (
                        <tr key={draft.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs">{draft.client_id || '-'}</td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs max-w-[150px] truncate" title={draft.title || '-'}>{draft.title || '-'}</td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs">{draft.part_number || '-'}</td>
                          <td className="px-2 py-2 text-center">
                            {draft.link ? (
                              <a
                                href={draft.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900 inline-block"
                                title="Відкрити посилання"
                              >
                                <ExternalLink size={14} />
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300 text-xs">{draft.tracking_pl || '-'}</td>
                          <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-300 text-xs">
                            {draft.payment_type || 'не обрано'}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => moveDraftToActiveReceipt(draft, draftGroup)}
                                className="text-green-600 hover:text-green-900 hover:bg-green-50 p-1 rounded transition"
                                title="Додати до прийомки"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => archiveDraft(draft.id)}
                                className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-1 rounded transition"
                                title="Архівувати"
                              >
                                <Archive size={16} />
                              </button>
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
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto">
          {cashOnDeliveryOrders.length === 0 && paidOrders.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex items-center justify-center p-12 text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <AlertCircle size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Оберіть замовлення з лівої панелі</p>
                <p className="text-xs mt-1">Побрання/Самовивіз та Оплачені зберігаються окремими документами</p>
              </div>
            </div>
          )}

          {cashOnDeliveryOrders.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col">
              <div className="p-4 bg-amber-50 dark:bg-gradient-to-br dark:from-amber-950 dark:to-amber-900 border-b dark:border-amber-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200">Побрання / Самовивіз ({cashOnDeliveryOrders.length})</h3>
                  <span className="text-xs text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/50 px-2 py-1 rounded">
                    {cashOnDeliveryReceiptNumber}
                  </span>
                </div>
                <button
                  onClick={() => handleSaveReceipt('cash_on_delivery')}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-700 dark:bg-gradient-to-br dark:from-amber-800 dark:to-amber-700 dark:hover:from-amber-700 dark:hover:to-amber-600 transition"
                >
                  <Send size={18} />
                  Передати на звірку
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Назва</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Запч. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Дост. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Прийом (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Побр. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Перев. ($)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Тип оплати</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 w-10"></th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCashOnDeliveryOrders.map((order) => (
                      <>
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300 max-w-[150px] truncate">{order.title || '-'}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableParts}
                            onChange={(e) => updateOrderField(order.id, 'editableParts', Number(e.target.value), 'cash_on_delivery')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableDelivery}
                            onChange={(e) => updateOrderField(order.id, 'editableDelivery', Number(e.target.value), 'cash_on_delivery')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableReceipt}
                            onChange={(e) => updateOrderField(order.id, 'editableReceipt', Number(e.target.value), 'cash_on_delivery')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableCash}
                            onChange={(e) => updateOrderField(order.id, 'editableCash', Number(e.target.value), 'cash_on_delivery')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableTransport}
                            onChange={(e) => updateOrderField(order.id, 'editableTransport', Number(e.target.value), 'cash_on_delivery')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{order.payment_type || '-'}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => toggleOrderChanges(order.id)}
                              className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded transition"
                              title="Історія змін"
                            >
                              {expandedChanges.has(order.id) ? <ChevronUp size={16} /> : <History size={16} />}
                            </button>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => removeFromActiveReceipt(order, 'cash_on_delivery')}
                              className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded transition"
                              title="Видалити з прійомки"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                        {expandedChanges.has(order.id) && (
                          <tr className="bg-blue-50 dark:bg-blue-900/20">
                            <td colSpan={9} className="px-4 py-3">
                              <div className="text-sm">
                                <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-300 font-medium">
                                  <History size={16} />
                                  <span>Історія змін</span>
                                </div>
                                {orderChanges[order.id]?.length > 0 ? (
                                  <div className="space-y-1">
                                    {orderChanges[order.id].map((change) => (
                                      <div key={change.id} className="text-xs bg-white dark:bg-gray-800 rounded p-2 border border-blue-200 dark:border-blue-800">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{change.field_name}:</span>
                                            <span className="text-gray-600 dark:text-gray-400"> {change.old_value} → </span>
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">{change.new_value}</span>
                                          </div>
                                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                                            {new Date(change.changed_at).toLocaleString('uk-UA')}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 dark:text-gray-400 text-xs">Немає історії змін</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t bg-amber-50 dark:bg-gradient-to-br dark:from-amber-950 dark:to-amber-900 dark:border-amber-800">
                <table className="w-full text-sm">
                  <tfoot>
                    <tr className="bg-amber-100 dark:bg-amber-900/50 font-bold text-gray-900 dark:text-amber-200">
                      <td className="px-2 py-3 text-left">Всього</td>
                      <td className="px-2 py-3 text-right">{formatNumber(cashOnDeliveryTotals.parts)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(cashOnDeliveryTotals.delivery)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(cashOnDeliveryTotals.receipt)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(cashOnDeliveryTotals.cash)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(cashOnDeliveryTotals.transport)} $</td>
                      <td className="px-2 py-3"></td>
                      <td className="px-2 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {paidOrders.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col">
              <div className="p-4 bg-green-50 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 border-b dark:border-green-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-green-900 dark:text-green-200">Оплачені ({paidOrders.length})</h3>
                  <span className="text-xs text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50 px-2 py-1 rounded">
                    {paidReceiptNumber}
                  </span>
                </div>
                <button
                  onClick={() => handleSaveReceipt('paid')}
                  className="bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 dark:bg-gradient-to-br dark:from-green-800 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-600 transition"
                >
                  <Send size={18} />
                  Передати на звірку
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Назва</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Запч. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Дост. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Прийом (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Побр. (zl)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Перев. ($)</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200 text-xs">Тип оплати</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 w-10"></th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-200 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPaidOrders.map((order) => (
                      <>
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300 max-w-[150px] truncate">{order.title || '-'}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableParts}
                            onChange={(e) => updateOrderField(order.id, 'editableParts', Number(e.target.value), 'paid')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableDelivery}
                            onChange={(e) => updateOrderField(order.id, 'editableDelivery', Number(e.target.value), 'paid')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableReceipt}
                            onChange={(e) => updateOrderField(order.id, 'editableReceipt', Number(e.target.value), 'paid')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableCash}
                            onChange={(e) => updateOrderField(order.id, 'editableCash', Number(e.target.value), 'paid')}
                            className={`w-20 px-1 py-0.5 border rounded text-xs ${
                              order.payment_type?.toLowerCase().includes('оплачено') && order.editableCash !== 0
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-gray-100'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            }`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={order.editableTransport}
                            onChange={(e) => updateOrderField(order.id, 'editableTransport', Number(e.target.value), 'paid')}
                            className="w-20 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </td>
                          <td className="px-2 py-2 text-gray-600 dark:text-gray-300">{order.payment_type || '-'}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => toggleOrderChanges(order.id)}
                              className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded transition"
                              title="Історія змін"
                            >
                              {expandedChanges.has(order.id) ? <ChevronUp size={16} /> : <History size={16} />}
                            </button>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => removeFromActiveReceipt(order, 'paid')}
                              className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded transition"
                              title="Видалити з прійомки"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                        {expandedChanges.has(order.id) && (
                          <tr className="bg-blue-50 dark:bg-blue-900/20">
                            <td colSpan={9} className="px-4 py-3">
                              <div className="text-sm">
                                <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-300 font-medium">
                                  <History size={16} />
                                  <span>Історія змін</span>
                                </div>
                                {orderChanges[order.id]?.length > 0 ? (
                                  <div className="space-y-1">
                                    {orderChanges[order.id].map((change) => (
                                      <div key={change.id} className="text-xs bg-white dark:bg-gray-800 rounded p-2 border border-blue-200 dark:border-blue-800">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{change.field_name}:</span>
                                            <span className="text-gray-600 dark:text-gray-400"> {change.old_value} → </span>
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">{change.new_value}</span>
                                          </div>
                                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                                            {new Date(change.changed_at).toLocaleString('uk-UA')}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 dark:text-gray-400 text-xs">Немає історії змін</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t bg-green-50 dark:bg-gradient-to-br dark:from-green-950 dark:to-green-900 dark:border-green-800">
                <table className="w-full text-sm">
                  <tfoot>
                    <tr className="bg-green-100 dark:bg-green-900/50 font-bold text-gray-900 dark:text-green-200">
                      <td className="px-2 py-3 text-left">Всього</td>
                      <td className="px-2 py-3 text-right">{formatNumber(paidTotals.parts)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(paidTotals.delivery)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(paidTotals.receipt)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(paidTotals.cash)} zl</td>
                      <td className="px-2 py-3 text-right">{formatNumber(paidTotals.transport)} $</td>
                      <td className="px-2 py-3"></td>
                      <td className="px-2 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
