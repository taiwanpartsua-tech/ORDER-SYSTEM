import { useState, useEffect } from 'react';
import { supabase, AuditLog as AuditLogType } from '../lib/supabase';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ExportButton } from './ExportButton';
import { exportToCSV } from '../utils/exportData';

export default function AuditLog() {
  const { isSuper } = useAuth();
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user_profile:user_profiles(email, full_name, role)
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    const { data } = await query;
    if (data) setLogs(data as any);
  }

  const actionLabels: Record<string, string> = {
    create: 'Створення',
    update: 'Оновлення',
    delete: 'Видалення',
    login: 'Вхід',
    logout: 'Вихід',
    export: 'Експорт',
    approve: 'Затвердження',
    send: 'Відправка',
    settle: 'Розрахунок',
    reverse: 'Скасування'
  };

  const entityLabels: Record<string, string> = {
    order: 'Замовлення',
    return: 'Повернення',
    receipt: 'Прийомка',
    transaction: 'Транзакція',
    card_transaction: 'Карткова транзакція',
    user: 'Користувач',
    tariff: 'Тариф'
  };

  const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    login: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    logout: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    export: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    approve: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    send: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    settle: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    reverse: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.action === filter);

  const handleExport = () => {
    const dataToExport = filteredLogs.map(log => ({
      created_at: new Date(log.created_at).toLocaleString('uk-UA'),
      user_email: log.user_profile?.email || 'Невідомо',
      user_name: log.user_profile?.full_name || '-',
      action: actionLabels[log.action] || log.action,
      entity_type: log.entity_type ? entityLabels[log.entity_type] || log.entity_type : '-',
      entity_id: log.entity_id || '-',
      details: JSON.stringify(log.details)
    }));

    const headers = {
      created_at: 'Дата та час',
      user_email: 'Email користувача',
      user_name: 'Ім\'я користувача',
      action: 'Дія',
      entity_type: 'Тип сутності',
      entity_id: 'ID сутності',
      details: 'Деталі'
    };

    exportToCSV(dataToExport, 'istoriya_diy', headers);
  };

  return (
    <div className="h-full flex flex-col p-4 max-w-[98%] mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <History className="w-8 h-8 text-gray-700 dark:text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Історія дій</h2>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="all">Всі дії</option>
            <option value="login">Вхід</option>
            <option value="create">Створення</option>
            <option value="update">Оновлення</option>
            <option value="delete">Видалення</option>
            <option value="export">Експорт</option>
            <option value="approve">Затвердження</option>
            <option value="send">Відправка</option>
            <option value="settle">Розрахунок</option>
            <option value="reverse">Скасування</option>
          </select>
          <ExportButton onClick={handleExport} disabled={filteredLogs.length === 0} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-10"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дата та час</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Користувач</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дія</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Тип</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLogs.map((log) => (
              <>
                <tr
                  key={log.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <td className="px-4 py-3">
                    {expandedLog === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(log.created_at).toLocaleString('uk-UA')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="text-gray-900 dark:text-gray-100">{log.user_profile?.email || 'Невідомо'}</div>
                    {log.user_profile?.full_name && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{log.user_profile.full_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {log.entity_type ? entityLabels[log.entity_type] || log.entity_type : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '-'}
                  </td>
                </tr>
                {expandedLog === log.id && (
                  <tr>
                    <td></td>
                    <td colSpan={5} className="px-4 py-3 bg-gray-50 dark:bg-gray-900">
                      <div className="text-sm">
                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Деталі:</div>
                        <pre className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-auto text-xs text-gray-900 dark:text-gray-100">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
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
  );
}
