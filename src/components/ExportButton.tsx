import { Download } from 'lucide-react';

interface ExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function ExportButton({ onClick, disabled = false }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Експортувати в CSV"
    >
      <Download className="w-4 h-4" />
      <span>Експорт</span>
    </button>
  );
}
