import { useState, useEffect } from 'react';
import { Package, ClipboardCheck, TrendingUp, FileCheck, DollarSign, Moon, Sun, Settings, Users, History, LogOut, Camera } from 'lucide-react';
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

type Tab = 'orders' | 'receipts' | 'management' | 'balance' | 'settlement' | 'settings' | 'admin' | 'audit' | 'inspection';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const savedTab = localStorage.getItem('activeTab');
    return (savedTab as Tab) || 'orders';
  });
  const { isDark, toggleTheme } = useTheme();
  const { user, profile, loading, signOut, isSuper, isAdmin, isSupplier } = useAuth();

  useEffect(() => {
    if (user) {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab, user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Завантаження...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 flex-shrink-0">
        <div className="max-w-[98%] mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Система управління закупівлями</h1>
          <div className="flex items-center gap-4">
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
            {!isSupplier && (
              <>
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
              </>
            )}
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
            {!isSupplier && (
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
            )}
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
            {!isSupplier && (
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
            )}
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
