import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Project, UserProjectAccess } from '../lib/supabase';
import { useAuth } from './AuthContext';

type ProjectContextType = {
  currentProject: Project | null;
  userProjects: UserProjectAccess[];
  setCurrentProject: (project: Project) => void;
  loadUserProjects: () => Promise<void>;
  isLoading: boolean;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [userProjects, setUserProjects] = useState<UserProjectAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadUserProjects() {
    if (!user) {
      setUserProjects([]);
      setCurrentProjectState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

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
          user_id: user.id,
          project_id: project.id,
          role: 'admin',
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

    if (accessData) {
      setUserProjects(accessData);

      const storedProjectId = localStorage.getItem('currentProjectId');

      if (storedProjectId) {
        const storedProject = accessData.find(a => a.project_id === storedProjectId);
        if (storedProject && storedProject.project) {
          setCurrentProjectState(storedProject.project);
        }
      }
    }

    setIsLoading(false);
  }

  function setCurrentProject(project: Project) {
    setCurrentProjectState(project);
    localStorage.setItem('currentProjectId', project.id);
  }

  useEffect(() => {
    loadUserProjects();
  }, [user]);

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        userProjects,
        setCurrentProject,
        loadUserProjects,
        isLoading
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
