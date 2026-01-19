import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { LogIn, UserPlus, Briefcase } from 'lucide-react';
import { supabase, Project, UserProjectAccess } from '../lib/supabase';

export default function Login() {
  const { signIn, signUp, user } = useAuth();
  const { setCurrentProject } = useProject();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProjectSelection, setShowProjectSelection] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<UserProjectAccess[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (user && !showProjectSelection) {
      loadAvailableProjects();
    }
  }, [user]);

  async function loadAvailableProjects() {
    if (!user) return;

    setLoadingProjects(true);
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const isSuperAdmin = profile?.role === 'super_admin';

      let accessData: UserProjectAccess[] = [];

      if (isSuperAdmin) {
        const { data: allProjects } = await supabase
          .from('projects')
          .select('*')
          .eq('is_active', true);

        if (allProjects) {
          accessData = allProjects.map(project => ({
            id: '',
            user_id: user.id,
            project_id: project.id,
            role: 'admin' as const,
            granted_by: null,
            created_at: new Date().toISOString(),
            project: project
          }));
        }
      } else {
        const { data: userAccess } = await supabase
          .from('user_project_access')
          .select('*, project:projects(*)')
          .eq('user_id', user.id);

        if (userAccess) {
          accessData = userAccess;
        }
      }

      setAvailableProjects(accessData);

      if (accessData.length === 0) {
        setError('У вас немає доступу до жодного проекту. Зверніться до адміністратора для отримання доступу.');
      } else if (accessData.length === 1 && accessData[0].project) {
        handleProjectSelect(accessData[0].project);
      } else {
        setShowProjectSelection(true);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Помилка завантаження проектів');
    } finally {
      setLoadingProjects(false);
    }
  }

  function handleProjectSelect(project: Project) {
    setCurrentProject(project);
    setShowProjectSelection(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!inviteCode.trim()) {
          setError('Введіть інвайт-код для реєстрації.');
          setLoading(false);
          return;
        }
        if (!fullName.trim()) {
          setError('Введіть ваше ім\'я.');
          setLoading(false);
          return;
        }
        await signUp(email, password, fullName, inviteCode);
        setSuccess('Реєстрацію успішно завершено! Очікуйте підтвердження адміністратора.');
        setEmail('');
        setPassword('');
        setFullName('');
        setInviteCode('');
        setTimeout(() => {
          setIsSignUp(false);
          setSuccess('');
        }, 3000);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || (isSignUp ? 'Помилка реєстрації.' : 'Помилка входу. Перевірте email та пароль.'));
    } finally {
      setLoading(false);
    }
  }

  if (showProjectSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">
            Виберіть проект
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Оберіть проект для роботи
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {loadingProjects ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Завантаження проектів...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableProjects.map((access) => (
                access.project && (
                  <button
                    key={access.project.id}
                    onClick={() => handleProjectSelect(access.project!)}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-gray-200 dark:border-gray-600 rounded-lg transition text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {access.project.name}
                        </h3>
                        {access.project.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {access.project.description}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                          {access.role}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
            {isSignUp ? <UserPlus className="w-8 h-8 text-white" /> : <LogIn className="w-8 h-8 text-white" />}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">
          ArtTrans Logistics
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          {isSignUp ? 'Реєстрація в системі' : 'Вхід в систему'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="your@email.com"
            />
          </div>

          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ім'я
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ваше ім'я"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Інвайт-код
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Код запрошення"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="••••••••"
            />
            {isSignUp && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Мінімум 6 символів
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isSignUp ? 'Реєстрація...' : 'Вхід...') : (isSignUp ? 'Зареєструватись' : 'Увійти')}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              {isSignUp ? 'Вже маєте аккаунт? Увійти' : 'Немає аккаунта? Зареєструватись'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
