import { useState, useEffect } from 'react';
import { Package, ClipboardCheck, TrendingUp, FileCheck, DollarSign, Moon, Sun, Settings, Users, History, LogOut, Camera, Building2 } from 'lucide-react';
import Orders from './components/Orders';
import ActiveReceipts from './components/ActiveReceipts';
import SupplierBalance from './components/SupplierBalance';
import ReceiptManagement from './components/ReceiptManagement';
import CombinedSettlement from './components/CombinedSettlement';
import TariffSettings from './components/TariffSettings';
import AdminPanel from './components/AdminPanel';
import AuditLog from './components/AuditLog';
import SupplierInspection from './components/SupplierInspection';
import Login from './components/Login';
import { useTheme } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import { useProject } from './contexts/ProjectContext';

type Tab = 'orders' | 'receipts' | 'management' | 'balance' | 'settlement' | 'settings' | 'admin' | 'audit' | 'inspection';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const savedTab = localStorage.getItem('activeTab');
    return (savedTab as Tab) || 'orders';
  });
  const { isDark, toggleTheme } = useTheme();
  const { user, profile, loading, signOut, isSuper, isAdmin } = useAuth();
  const { currentProject, userProjects, setCurrentProject, isLoading: projectLoading } = useProject();

  useEffect(() => {
    if (user) {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab, user]);

  if (loading || projectLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Завантаження...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!currentProject) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="text-center mb-6">
            <Building2 className="w-16 h-16 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">У вас немає доступу до жодного проекту</h2>
            <p className="text-gray-600 dark:text-gray-400">Зверніться до адміністратора для отримання доступу</p>
          </div>
          <button
            onClick={signOut}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Вийти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 flex-shrink-0">
        <div className="max-w-[98%] mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Система управління закупівлями</h1>
          <div className="flex items-center gap-4">
            {userProjects.length > 1 && (
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-gray-600 dark:text-gray-400" />
                <select
                  value={currentProject?.id || ''}
                  onChange={(e) => {
                    const project = userProjects.find(p => p.project_id === e.target.value)?.project;
                    if (project) setCurrentProject(project);
                  }}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {userProjects.map(access => (
                    access.project && (
                      <option key={access.project.id} value={access.project.id}>
                        {access.project.name}
                      </option>
                    )
                  ))}
                </select>
              </div>
            )}
            {userProjects.length === 1 && currentProject && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Building2 size={18} />
                <span className="font-medium">{currentProject.name}</span>
              </div>
            )}
            <div className="text-right">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{profile?.full_name || profile?.email}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {profile?.is_admin && 'Адміністратор • '}
                {profile?.role === 'super_admin' && 'Суперадміністратор'}
                {profile?.role === 'supplier' && 'Постачальник'}
                {profile?.role === 'customer' && 'Замовник'}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
            >
              <LogOut size={16} />
              Вихід
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex-shrink-0">
        <div className="max-w-[98%] mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'orders'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Package size={20} />
              Замовлення
            </button>
            <button
              onClick={() => setActiveTab('receipts')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'receipts'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <ClipboardCheck size={20} />
              Активний прийом
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'management'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <FileCheck size={20} />
              Звірка прийомок
            </button>
            <button
              onClick={() => setActiveTab('balance')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'balance'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <TrendingUp size={20} />
              Активний баланс
            </button>
            <button
              onClick={() => setActiveTab('settlement')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'settlement'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <DollarSign size={20} />
              Взаєморозрахунок
            </button>
            <button
              onClick={() => setActiveTab('inspection')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'inspection'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Camera size={20} />
              Перевірка товару
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Settings size={20} />
              Налаштування
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                    activeTab === 'admin'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Users size={20} />
                  Адміністратор
                </button>
              </>
            )}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                  activeTab === 'audit'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <History size={20} />
                Історія дій
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'receipts' && <ActiveReceipts onNavigateToManagement={() => setActiveTab('management')} />}
        {activeTab === 'management' && <ReceiptManagement />}
        {activeTab === 'balance' && <SupplierBalance />}
        {activeTab === 'settlement' && <CombinedSettlement />}
        {activeTab === 'inspection' && <SupplierInspection />}
        {activeTab === 'settings' && <TariffSettings />}
        {activeTab === 'admin' && <AdminPanel />}
        {activeTab === 'audit' && <AuditLog />}
      </main>
    </div>
  );
}

export default App;
