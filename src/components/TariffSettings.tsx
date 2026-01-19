import { useState, useEffect } from 'react';
import { supabase, TariffSettings as TariffSettingsType } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Save } from 'lucide-react';
import { getCurrentProjectId } from '../utils/projectAccess';

export default function TariffSettings() {
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useState<TariffSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    default_received_pln: 15,
    default_transport_cost_per_kg_usd: 2.5
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tariff_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setFormData({
          default_received_pln: data.default_received_pln,
          default_transport_cost_per_kg_usd: data.default_transport_cost_per_kg_usd
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showError('Помилка при завантаженні налаштувань');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (settings) {
        const { error } = await supabase
          .from('tariff_settings')
          .update({
            default_received_pln: formData.default_received_pln,
            default_transport_cost_per_kg_usd: formData.default_transport_cost_per_kg_usd
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const projectId = await getCurrentProjectId();
        if (!projectId) {
          showError('Помилка: не знайдено доступу до проекту. Зв\'яжіться з адміністратором.');
          return;
        }

        const { error } = await supabase
          .from('tariff_settings')
          .insert([{
            default_received_pln: formData.default_received_pln,
            default_transport_cost_per_kg_usd: formData.default_transport_cost_per_kg_usd,
            project_id: projectId
          }]);

        if (error) throw error;
      }

      showSuccess('Налаштування збережено');
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Помилка при збереженні налаштувань');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Завантаження...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Налаштування тарифів
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Базові значення для автоматичного заповнення полів при створенні замовлень
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Приймка (zl)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Стандартна вартість приймки товару в злотих
              </p>
              <input
                type="number"
                step="0.01"
                value={formData.default_received_pln}
                onChange={(e) => setFormData({ ...formData, default_received_pln: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Перевезення за кг ($)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Вартість перевезення за 1 кілограм в доларах США
              </p>
              <input
                type="number"
                step="0.01"
                value={formData.default_transport_cost_per_kg_usd}
                onChange={(e) => setFormData({ ...formData, default_transport_cost_per_kg_usd: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                <Save size={18} />
                {isSaving ? 'Збереження...' : 'Зберегти налаштування'}
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                Як це працює?
              </h3>
              <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <li>• При створенні нового замовлення поле "Приймка" автоматично заповнюється вказаним значенням</li>
                <li>• Поле "Перевезення" автоматично розраховується як: Вага × Тариф за кг</li>
                <li>• Ви завжди можете змінити ці значення вручну для конкретного замовлення</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
