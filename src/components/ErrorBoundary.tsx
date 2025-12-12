import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Помилка конфігурації
            </h1>
            <p className="text-gray-700 mb-4">
              Схоже, що змінні середовища не налаштовані. Будь ласка, перевірте налаштування.
            </p>
            <div className="bg-gray-100 rounded p-4 mb-4">
              <p className="text-sm text-gray-800 font-mono">
                {this.state.error?.message}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p className="mb-2">Якщо ви розгортаєте на Netlify:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Перейдіть до Site settings → Environment variables</li>
                <li>Додайте VITE_SUPABASE_URL та VITE_SUPABASE_ANON_KEY</li>
                <li>Перезапустіть deploy</li>
              </ol>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
