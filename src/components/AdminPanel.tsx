import { useState, useEffect } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { Users, Plus, X, Check, Ban } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { logAction } from '../utils/auditLog';

export default function AdminPanel() {
  const { showSuccess, showError, confirm } = useToast();
  const { isSuper } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'customer' as 'super_admin' | 'supplier' | 'customer'
  });

  useEffect(() => {
    if (isSuper) {
      loadUsers();
    }
  }, [isSuper]);

  async function loadUsers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setUsers(data);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();

    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            full_name: formData.full_name,
            role: formData.role
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        await logAction('create', 'user', authData.user.id, {
          email: formData.email,
          role: formData.role
        });

        showSuccess('Користувача успішно створено!');
        setIsModalOpen(false);
        setFormData({ email: '', password: '', full_name: '', role: 'customer' });
        loadUsers();
      }
    } catch (error: any) {
      showError(error.message || 'Помилка створення користувача');
    }
  }

  async function handleToggleActive(user: UserProfile) {
    const newStatus = !user.is_active;
    const confirmed = await confirm(
      `Ви впевнені, що хочете ${newStatus ? 'активувати' : 'деактивувати'} користувача ${user.email}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      await logAction('update', 'user', user.id, {
        is_active: newStatus
      });

      showSuccess(`Користувача ${newStatus ? 'активовано' : 'деактивовано'}!`);
      loadUsers();
    } catch (error: any) {
      showError(error.message || 'Помилка оновлення користувача');
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      await logAction('update', 'user', userId, {
        role: newRole
      });

      showSuccess('Роль користувача оновлено!');
      loadUsers();
    } catch (error: any) {
      showError(error.message || 'Помилка оновлення ролі');
    }
  }

  const roleLabels = {
    super_admin: 'Суперадміністратор',
    supplier: 'Постачальник',
    customer: 'Замовник'
  };

  const roleColors = {
    super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    supplier: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    customer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  };

  if (!isSuper) {
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
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Управління користувачами</h2>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition"
        >
          <Plus size={20} />
          Новий користувач
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ім'я</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Роль</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Статус</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{user.email}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{user.full_name || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="px-3 py-1 rounded-full text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    style={{
                      backgroundColor: user.role === 'super_admin' ? '#f3e8ff' : user.role === 'supplier' ? '#dbeafe' : '#dcfce7',
                      color: user.role === 'super_admin' ? '#6b21a8' : user.role === 'supplier' ? '#1e40af' : '#15803d'
                    }}
                  >
                    <option value="customer">Замовник</option>
                    <option value="supplier">Постачальник</option>
                    <option value="super_admin">Суперадміністратор</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {user.is_active ? 'Активний' : 'Неактивний'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={`px-3 py-1 rounded-lg text-sm transition ${
                      user.is_active
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300'
                    }`}
                  >
                    {user.is_active ? <Ban size={16} /> : <Check size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Новий користувач</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Пароль
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ім'я
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Роль
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="customer">Замовник</option>
                  <option value="supplier">Постачальник</option>
                  <option value="super_admin">Суперадміністратор</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition"
              >
                Створити
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
