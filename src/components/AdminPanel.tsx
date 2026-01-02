import { useState, useEffect } from 'react';
import { supabase, UserProfile, InviteCode } from '../lib/supabase';
import { Users, Plus, X, Check, Ban, Key, Copy, UserCheck, UserX, Shield } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { logAction } from '../utils/auditLog';

type Tab = 'users' | 'invites';

export default function AdminPanel() {
  const { showSuccess, showError, confirm } = useToast();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteDays, setInviteDays] = useState(7);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadInvites();
    }
  }, [isAdmin]);

  async function loadUsers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setUsers(data);
  }

  async function loadInvites() {
    const { data } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setInvites(data);
  }

  async function generateInviteCode() {
    try {
      const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + inviteDays);

      const { data: authData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('invite_codes')
        .insert({
          code,
          created_by: authData?.user?.id,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      await logAction('create', 'invite_code', code);
      showSuccess('Інвайт-код створено!');
      setIsInviteModalOpen(false);
      loadInvites();
    } catch (error: any) {
      showError(error.message || 'Помилка створення інвайт-коду');
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Скопійовано в буфер обміну!');
    } catch {
      showError('Не вдалося скопіювати');
    }
  }

  async function handleApproveUser(userId: string, userName: string) {
    const confirmed = await confirm(
      `Підтвердити реєстрацію користувача ${userName}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: 'approved' })
        .eq('id', userId);

      if (error) throw error;

      await logAction('update', 'user', userId, { status: 'approved' });
      showSuccess('Користувача підтверджено!');
      loadUsers();
    } catch (error: any) {
      showError(error.message || 'Помилка підтвердження користувача');
    }
  }

  async function handleBlockUser(userId: string, userName: string, currentStatus: string) {
    const newStatus = currentStatus === 'blocked' ? 'approved' : 'blocked';
    const confirmed = await confirm(
      `${newStatus === 'blocked' ? 'Заблокувати' : 'Розблокувати'} користувача ${userName}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      await logAction('update', 'user', userId, { status: newStatus });
      showSuccess(`Користувача ${newStatus === 'blocked' ? 'заблоковано' : 'розблоковано'}!`);
      loadUsers();
    } catch (error: any) {
      showError(error.message || 'Помилка зміни статусу користувача');
    }
  }

  async function handleToggleAdmin(userId: string, userName: string, isCurrentlyAdmin: boolean) {
    const confirmed = await confirm(
      `${isCurrentlyAdmin ? 'Забрати' : 'Надати'} права адміністратора користувачу ${userName}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_admin: !isCurrentlyAdmin })
        .eq('id', userId);

      if (error) throw error;

      await logAction('update', 'user', userId, { is_admin: !isCurrentlyAdmin });
      showSuccess(`Права адміністратора ${isCurrentlyAdmin ? 'забрано' : 'надано'}!`);
      loadUsers();
    } catch (error: any) {
      showError(error.message || 'Помилка зміни прав адміністратора');
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      await logAction('update', 'user', userId, { role: newRole });
      showSuccess('Роль користувача оновлено!');
      loadUsers();
    } catch (error: any) {
      showError(error.message || 'Помилка оновлення ролі');
    }
  }

  async function handleDeleteInvite(inviteId: string) {
    const confirmed = await confirm('Видалити цей інвайт-код?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      await logAction('delete', 'invite_code', inviteId);
      showSuccess('Інвайт-код видалено!');
      loadInvites();
    } catch (error: any) {
      showError(error.message || 'Помилка видалення інвайт-коду');
    }
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };

  const statusLabels = {
    pending: 'Очікує',
    approved: 'Підтверджено',
    blocked: 'Заблоковано'
  };

  const roleLabels = {
    super_admin: 'Суперадміністратор',
    supplier: 'Постачальник',
    customer: 'Замовник'
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">Доступ заборонено</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 max-w-[98%] mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-gray-700 dark:text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Панель адміністратора</h2>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white dark:bg-blue-500'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <Users className="inline w-5 h-5 mr-2" />
          Користувачі
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'invites'
              ? 'bg-blue-600 text-white dark:bg-blue-500'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <Key className="inline w-5 h-5 mr-2" />
          Інвайт-коди
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ім'я</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Роль</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Статус</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Адмін</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{user.email}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{user.full_name || '-'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="px-3 py-1 rounded-full text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="customer">Замовник</option>
                      <option value="supplier">Постачальник</option>
                      <option value="super_admin">Суперадміністратор</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                      {statusLabels[user.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.is_admin ? (
                      <Shield className="inline w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      {user.status === 'pending' && (
                        <button
                          onClick={() => handleApproveUser(user.id, user.email)}
                          className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 transition"
                          title="Підтвердити"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleBlockUser(user.id, user.email, user.status)}
                        className={`p-2 rounded-lg transition ${
                          user.status === 'blocked'
                            ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                        title={user.status === 'blocked' ? 'Розблокувати' : 'Заблокувати'}
                      >
                        {user.status === 'blocked' ? <Check size={16} /> : <Ban size={16} />}
                      </button>
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.email, user.is_admin)}
                        className={`p-2 rounded-lg transition ${
                          user.is_admin
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}
                        title={user.is_admin ? 'Забрати права адміна' : 'Зробити адміном'}
                      >
                        <Shield size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'invites' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition"
            >
              <Plus size={20} />
              Створити інвайт-код
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Код</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дійсний до</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Створено</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {invite.code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(invite.code)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        invite.is_used
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          : new Date(invite.expires_at) < new Date()
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {invite.is_used ? 'Використано' : new Date(invite.expires_at) < new Date() ? 'Прострочено' : 'Активний'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {new Date(invite.expires_at).toLocaleString('uk-UA')}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {new Date(invite.created_at).toLocaleString('uk-UA')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteInvite(invite.id)}
                        className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition"
                        title="Видалити"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Створити інвайт-код</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Термін дії (днів)
                </label>
                <input
                  type="number"
                  value={inviteDays}
                  onChange={(e) => setInviteDays(Number(e.target.value))}
                  min="1"
                  max="365"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <button
                onClick={generateInviteCode}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition"
              >
                Створити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
