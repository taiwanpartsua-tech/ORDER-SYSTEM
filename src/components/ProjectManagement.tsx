import { useState, useEffect } from 'react';
import { supabase, Project, UserProjectAccess, UserProfile } from '../lib/supabase';
import { Building2, Plus, Users, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function ProjectManagement() {
  const { showSuccess, showError } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectUsers, setProjectUsers] = useState<(UserProjectAccess & { user_profile?: UserProfile })[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserRole, setSelectedUserRole] = useState<'admin' | 'manager' | 'viewer'>('manager');

  useEffect(() => {
    loadProjects();
    loadAllUsers();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectUsers(selectedProject.id);
    }
  }, [selectedProject]);

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setProjects(data);
    }
  }

  async function loadAllUsers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('full_name');

    if (data) {
      setAllUsers(data);
    }
  }

  async function loadProjectUsers(projectId: string) {
    const { data } = await supabase
      .from('user_project_access')
      .select('*, user_profile:user_profiles(*)')
      .eq('project_id', projectId);

    if (data) {
      setProjectUsers(data);
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) {
      showError('Введіть назву проекту');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('Помилка авторизації');
      return;
    }

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert([{
        name: newProjectName,
        description: newProjectDescription,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      showError('Помилка створення проекту');
      console.error(error);
      return;
    }

    if (newProject) {
      const { error: accessError } = await supabase
        .from('user_project_access')
        .insert([{
          user_id: user.id,
          project_id: newProject.id,
          role: 'admin',
          granted_by: user.id
        }]);

      if (accessError) {
        console.error('Помилка надання доступу:', accessError);
      }
    }

    showSuccess('Проект створено');
    setNewProjectName('');
    setNewProjectDescription('');
    setShowCreateModal(false);
    loadProjects();
  }

  async function addUserToProject() {
    if (!selectedUserId || !selectedProject) {
      showError('Оберіть користувача');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('Помилка авторизації');
      return;
    }

    const { error } = await supabase
      .from('user_project_access')
      .insert([{
        user_id: selectedUserId,
        project_id: selectedProject.id,
        role: selectedUserRole,
        granted_by: user.id
      }]);

    if (error) {
      if (error.code === '23505') {
        showError('Користувач вже має доступ до цього проекту');
      } else {
        showError('Помилка надання доступу');
        console.error(error);
      }
      return;
    }

    showSuccess('Доступ надано');
    setSelectedUserId('');
    setShowAddUserModal(false);
    loadProjectUsers(selectedProject.id);
  }

  async function removeUserFromProject(accessId: string) {
    const confirmed = window.confirm('Видалити доступ користувача до проекту?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('user_project_access')
      .delete()
      .eq('id', accessId);

    if (error) {
      showError('Помилка видалення доступу');
      console.error(error);
      return;
    }

    showSuccess('Доступ видалено');
    if (selectedProject) {
      loadProjectUsers(selectedProject.id);
    }
  }

  const availableUsers = allUsers.filter(
    user => !projectUsers.some(pu => pu.user_id === user.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Управління проектами</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Створити проект
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Проекти</h3>
          <div className="space-y-2">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={`p-4 rounded-lg cursor-pointer transition ${
                  selectedProject?.id === project.id
                    ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Building2 size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100">{project.name}</div>
                    {project.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.description}</div>
                    )}
                    <div className={`text-xs mt-2 ${project.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {project.is_active ? 'Активний' : 'Неактивний'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Немає проектів
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          {selectedProject ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
                  Користувачі проекту: {selectedProject.name}
                </h3>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                >
                  <Plus size={16} />
                  Додати користувача
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Користувач</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Роль</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-200">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {projectUsers.map(access => (
                      <tr key={access.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                          {access.user_profile?.full_name || 'Невідомо'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {access.user_profile?.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            access.role === 'admin'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : access.role === 'manager'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {access.role === 'admin' && 'Адміністратор'}
                            {access.role === 'manager' && 'Менеджер'}
                            {access.role === 'viewer' && 'Перегляд'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeUserFromProject(access.id)}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded transition"
                            title="Видалити доступ"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {projectUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Немає користувачів з доступом до цього проекту
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              Оберіть проект для перегляду користувачів
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Створити новий проект</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Назва проекту
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Назва проекту"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Опис (необов'язково)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Опис проекту"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Скасувати
                </button>
                <button
                  onClick={createProject}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Створити
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddUserModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Додати користувача до проекту
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Користувач
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Оберіть користувача</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Роль
                </label>
                <select
                  value={selectedUserRole}
                  onChange={(e) => setSelectedUserRole(e.target.value as 'admin' | 'manager' | 'viewer')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="viewer">Перегляд</option>
                  <option value="manager">Менеджер</option>
                  <option value="admin">Адміністратор</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowAddUserModal(false);
                    setSelectedUserId('');
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Скасувати
                </button>
                <button
                  onClick={addUserToProject}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Додати
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
