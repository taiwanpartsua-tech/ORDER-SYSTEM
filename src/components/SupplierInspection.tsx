import { useState, useEffect } from 'react';
import { supabase, Order, OrderPhoto, Supplier } from '../lib/supabase';
import { Search, XCircle, Upload, Camera, Check, AlertTriangle, X, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

type OrderWithSupplier = Order & { supplier: Supplier };

type OrderWithPhotos = OrderWithSupplier & {
  photos: OrderPhoto[];
};

export default function SupplierInspection() {
  const { showSuccess, showError, showWarning } = useToast();
  const [orders, setOrders] = useState<OrderWithPhotos[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithPhotos | null>(null);
  const [inspectionStatus, setInspectionStatus] = useState<'ok' | 'damaged'>('ok');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewPhotos, setPreviewPhotos] = useState<string[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, supplier:suppliers(*)')
      .not('status', 'in', '(анульовано,архівовано)')
      .order('created_at', { ascending: false });

    if (data) {
      const ordersWithPhotos = await Promise.all(
        (data as OrderWithSupplier[]).map(async (order) => {
          const { data: photos } = await supabase
            .from('order_photos')
            .select('*')
            .eq('order_id', order.id)
            .order('uploaded_at', { ascending: false });

          return {
            ...order,
            photos: photos || []
          };
        })
      );

      setOrders(ordersWithPhotos);
    }
  }

  const filteredOrders = orders.filter(order => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase().trim();
    return (
      (order.order_number && order.order_number.toLowerCase().includes(searchLower)) ||
      (order.client_id && order.client_id.toLowerCase().includes(searchLower)) ||
      (order.title && order.title.toLowerCase().includes(searchLower)) ||
      (order.tracking_pl && order.tracking_pl.toLowerCase().includes(searchLower)) ||
      (order.part_number && order.part_number.toLowerCase().includes(searchLower)) ||
      (order.supplier?.name && order.supplier.name.toLowerCase().includes(searchLower))
    );
  });

  function selectOrder(order: OrderWithPhotos) {
    setSelectedOrder(order);
    setInspectionStatus(order.supplier_inspection_status || 'ok');
    setNotes(order.supplier_notes || '');
    setPreviewPhotos([]);
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedOrder) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError('Помилка авторизації');
        return;
      }

      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedOrder.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('order-photos')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('order-photos')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('order_photos')
          .insert({
            order_id: selectedOrder.id,
            photo_url: publicUrl,
            uploaded_by: user.id,
            notes: ''
          });

        if (dbError) {
          console.error('DB error:', dbError);
          throw dbError;
        }

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setPreviewPhotos(prev => [...prev, ...uploadedUrls]);

      await loadOrders();
      if (selectedOrder) {
        const updatedOrder = orders.find(o => o.id === selectedOrder.id);
        if (updatedOrder) {
          const { data: photos } = await supabase
            .from('order_photos')
            .select('*')
            .eq('order_id', updatedOrder.id);
          setSelectedOrder({ ...updatedOrder, photos: photos || [] });
        }
      }

      showSuccess(`Завантажено ${files.length} фото`);
    } catch (error) {
      console.error('Error uploading photos:', error);
      showError('Помилка завантаження фото');
    } finally {
      setUploading(false);
    }
  }

  async function saveInspection() {
    if (!selectedOrder) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('Помилка авторизації');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({
        supplier_inspection_status: inspectionStatus,
        supplier_notes: notes,
        inspection_date: new Date().toISOString(),
        inspected_by: user.id
      })
      .eq('id', selectedOrder.id);

    if (error) {
      showError('Помилка збереження перевірки');
      console.error(error);
      return;
    }

    showSuccess('Перевірку збережено');
    await loadOrders();
    setSelectedOrder(null);
    setNotes('');
    setPreviewPhotos([]);
  }

  async function deletePhoto(photoId: string, photoUrl: string) {
    const confirmed = window.confirm('Видалити це фото?');
    if (!confirmed) return;

    const fileName = photoUrl.split('/').pop();
    if (fileName) {
      await supabase.storage
        .from('order-photos')
        .remove([fileName]);
    }

    const { error } = await supabase
      .from('order_photos')
      .delete()
      .eq('id', photoId);

    if (error) {
      showError('Помилка видалення фото');
      return;
    }

    showSuccess('Фото видалено');
    await loadOrders();

    if (selectedOrder) {
      const updatedOrder = orders.find(o => o.id === selectedOrder.id);
      if (updatedOrder) {
        const { data: photos } = await supabase
          .from('order_photos')
          .select('*')
          .eq('order_id', updatedOrder.id);
        setSelectedOrder({ ...updatedOrder, photos: photos || [] });
      }
    }
  }

  return (
    <div className="max-w-[98%] mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Перевірка товару постачальником</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Список замовлень</h3>

          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Пошук за №, ID клієнта, назвою, трекінгом, артикулом або постачальником..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                onClick={() => selectOrder(order)}
                className={`p-3 border rounded-lg cursor-pointer transition ${
                  selectedOrder?.id === order.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } ${
                  order.supplier_inspection_status === 'ok'
                    ? 'bg-green-50 dark:bg-green-900/10'
                    : order.supplier_inspection_status === 'damaged'
                    ? 'bg-red-50 dark:bg-red-900/10'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {order.order_number || 'Без номера'}
                      </span>
                      {order.supplier_inspection_status === 'ok' && (
                        <Check size={16} className="text-green-600" />
                      )}
                      {order.supplier_inspection_status === 'damaged' && (
                        <AlertTriangle size={16} className="text-red-600" />
                      )}
                      {order.photos.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          <Camera size={14} />
                          {order.photos.length}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {order.client_id && <span>ID: {order.client_id}</span>}
                      {order.supplier && <span className="ml-2">• {order.supplier.name}</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {order.title || order.part_number}
                    </div>
                  </div>
                  {order.link && (
                    <a
                      href={order.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-900 p-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedOrder && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                Перевірка: {selectedOrder.order_number || 'Без номера'}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус перевірки
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setInspectionStatus('ok')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition ${
                      inspectionStatus === 'ok'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-300'
                    }`}
                  >
                    <Check size={20} className="inline mr-2" />
                    Все ОК
                  </button>
                  <button
                    onClick={() => setInspectionStatus('damaged')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition ${
                      inspectionStatus === 'damaged'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-red-300'
                    }`}
                  >
                    <AlertTriangle size={20} className="inline mr-2" />
                    Пошкодження
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Примітки
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Опис стану товару, виявлені пошкодження тощо..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Фото товару
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="photo-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="photo-upload"
                    className={`cursor-pointer flex flex-col items-center gap-2 ${
                      uploading ? 'opacity-50' : ''
                    }`}
                  >
                    <Upload size={32} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {uploading ? 'Завантаження...' : 'Натисніть або перетягніть фото'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Можна додати кілька фото
                    </span>
                  </label>
                </div>

                {selectedOrder.photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {selectedOrder.photos.map(photo => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.photo_url}
                          alt="Фото товару"
                          className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                        <button
                          onClick={() => deletePhoto(photo.id, photo.photo_url)}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={16} />
                        </button>
                        <a
                          href={photo.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-1 right-1 bg-blue-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <ImageIcon size={16} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={saveInspection}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 dark:bg-gradient-to-br dark:from-blue-800 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-600 transition font-medium"
              >
                Зберегти перевірку
              </button>
            </div>
          </div>
        )}

        {!selectedOrder && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 flex items-center justify-center">
            <div className="text-center text-gray-400 dark:text-gray-500">
              <Camera size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Оберіть замовлення для перевірки</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
