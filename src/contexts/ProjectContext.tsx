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

    const { data: accessData } = await supabase
      .from('user_project_access')
      .select('*, project:projects(*)')
      .eq('user_id', user.id);

    if (accessData) {
      setUserProjects(accessData);

      const storedProjectId = localStorage.getItem('currentProjectId');

      if (storedProjectId) {
        const storedProject = accessData.find(a => a.project_id === storedProjectId);
        if (storedProject && storedProject.project) {
          setCurrentProjectState(storedProject.project);
        } else if (accessData.length > 0 && accessData[0].project) {
          setCurrentProjectState(accessData[0].project);
          localStorage.setItem('currentProjectId', accessData[0].project.id);
        }
      } else if (accessData.length > 0 && accessData[0].project) {
        setCurrentProjectState(accessData[0].project);
        localStorage.setItem('currentProjectId', accessData[0].project.id);
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
