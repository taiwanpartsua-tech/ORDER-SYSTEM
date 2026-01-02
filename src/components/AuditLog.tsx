import { useState, useEffect } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { History, ChevronDown, ChevronUp, Archive, Trash2, RefreshCw, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ExportButton } from './ExportButton';
import { exportToCSV } from '../utils/exportData';
import { AuditLog as AuditLogType, triggerAuditMaintenance } from '../utils/auditLog';

interface ExtendedAuditLog extends AuditLogType {
  user_profile?: {
    email: string;
    full_name: string;
    role: string;
  };
}

interface AuditStats {
  active_logs_count: number;
  archived_logs_count: number;
  oldest_active_log: string | null;
  oldest_archived_log: string | null;
}

export default function AuditLog() {
  const { isAdmin } = useAuth();
  const { showSuccess, showError, confirm } = useToast();
  const [logs, setLogs] = useState<ExtendedAuditLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoadingMaintenance, setIsLoadingMaintenance] = useState(false);

  useEffect(() => {
    loadLogs();
    loadStats();
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  async function loadLogs() {
    const { data, error } = await supabase.rpc('get_user_audit_history', {
      target_user_id: userFilter === 'all' ? null : userFilter,
      limit_count: 1000,
      offset_count: 0
    });

    if (error) {
      console.error('Error loading logs:', error);
      return;
    }

    if (data) {
      const logsWithProfiles = await Promise.all(
        data.map(async (log: any) => {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('email, full_name, role')
            .eq('id', log.user_id)
            .single();

          return {
            ...log,
            user_profile: profile || undefined
          };
        })
      );
      setLogs(logsWithProfiles);
    }
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('email');

    if (data) setUsers(data);
  }

  async function loadStats() {
    const { data, error } = await supabase.rpc('get_audit_stats');
    if (data && data.length > 0) {
      setStats(data[0]);
    }
  }

  async function handleArchive() {
    const confirmed = await confirm(
      'Архівувати всі логи старше 30 днів? Ця операція може зайняти деякий час.'
    );
    if (!confirmed) return;

    setIsLoadingMaintenance(true);
    try {
      const result = await triggerAuditMaintenance('archive');
      showSuccess(`Заархівовано ${result.result.archived} записів`);
      await loadLogs();
      await loadStats();
    } catch (error: any) {
      showError(error.message || 'Помилка архівування');
    } finally {
      setIsLoadingMaintenance(false);
    }
  }

  async function handleCleanup() {
    const confirmed = await confirm(
      'Видалити всі архівні логи старше 6 місяців? Ця дія незворотна!'
    );
    if (!confirmed) return;

    setIsLoadingMaintenance(true);
    try {
      const result = await triggerAuditMaintenance('cleanup');
      showSuccess(`Видалено ${result.result.deleted} записів`);
      await loadLogs();
      await loadStats();
    } catch (error: any) {
      showError(error.message || 'Помилка очищення');
    } finally {
      setIsLoadingMaintenance(false);
    }
  }

  async function handleBothMaintenance() {
    const confirmed = await confirm(
      'Виконати архівування (>30 днів) та очищення (>6 місяців)?'
    );
    if (!confirmed) return;

    setIsLoadingMaintenance(true);
    try {
      const result = await triggerAuditMaintenance('both');
      showSuccess(
        `Заархівовано: ${result.result.archived}, Видалено: ${result.result.deleted}`
      );
      await loadLogs();
      await loadStats();
    } catch (error: any) {
      showError(error.message || 'Помилка обслуговування');
    } finally {
      setIsLoadingMaintenance(false);
    }
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
    tariff: 'Тариф',
    invite_code: 'Інвайт-код'
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
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Активні логи</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.active_logs_count}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Архівні логи</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.archived_logs_count}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Найстаріший активний</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {stats.oldest_active_log ? new Date(stats.oldest_active_log).toLocaleDateString('uk-UA') : '-'}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Найстаріший архівний</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {stats.oldest_archived_log ? new Date(stats.oldest_archived_log).toLocaleDateString('uk-UA') : '-'}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
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

          {isAdmin && (
            <select
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setTimeout(loadLogs, 0);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="all">Всі користувачі</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button
                onClick={handleArchive}
                disabled={isLoadingMaintenance}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Архівувати логи старше 30 днів"
              >
                <Archive size={18} />
                Архівувати
              </button>
              <button
                onClick={handleCleanup}
                disabled={isLoadingMaintenance}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Видалити архівні логи старше 6 місяців"
              >
                <Trash2 size={18} />
                Очистити
              </button>
              <button
                onClick={handleBothMaintenance}
                disabled={isLoadingMaintenance}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Виконати обидві операції"
              >
                <RefreshCw size={18} />
                Обслуговування
              </button>
            </>
          )}
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
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Статус</th>
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
                  <td className="px-4 py-3 text-center">
                    {log.is_archived ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        Архів
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Активний
                      </span>
                    )}
                  </td>
                </tr>
                {expandedLog === log.id && (
                  <tr>
                    <td></td>
                    <td colSpan={6} className="px-4 py-3 bg-gray-50 dark:bg-gray-900">
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
