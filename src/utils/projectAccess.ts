import { supabase } from '../lib/supabase';

export async function getCurrentProjectId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: projectAccess } = await supabase
    .from('user_project_access')
    .select('project_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return projectAccess?.project_id || null;
}
