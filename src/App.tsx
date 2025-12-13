import { useState, useEffect } from 'react';
import { Package, ClipboardCheck, TrendingUp, FileCheck, DollarSign, CreditCard, Moon, Sun } from 'lucide-react';
import Orders from './components/Orders';
import ActiveReceipts from './components/ActiveReceipts';
import SupplierBalance from './components/SupplierBalance';
import ReceiptManagement from './components/ReceiptManagement';
import MutualSettlement from './components/MutualSettlement';
import CardMutualSettlement from './components/CardMutualSettlement';
import { useTheme } from './contexts/ThemeContext';

type Tab = 'orders' | 'receipts' | 'management' | 'balance' | 'settlement' | 'cards';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const savedTab = localStorage.getItem('activeTab');
    return (savedTab as Tab) || 'orders';
  });
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 flex-shrink-0">
        <div className="max-w-[98%] mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Система управління закупівлями</h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
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
              onClick={() => setActiveTab('cards')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'cards'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <CreditCard size={20} />
              Взаєморозрахунок по картках
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'receipts' && <ActiveReceipts onNavigateToManagement={() => setActiveTab('management')} />}
        {activeTab === 'management' && <ReceiptManagement />}
        {activeTab === 'balance' && <SupplierBalance />}
        {activeTab === 'settlement' && <MutualSettlement />}
        {activeTab === 'cards' && <CardMutualSettlement />}
      </main>
    </div>
  );
}

export default App;
