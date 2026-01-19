/*
  # Create Projects and Multi-Tenancy System

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text) - project/company name
      - `description` (text) - optional description
      - `is_active` (boolean) - whether project is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_project_access`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `project_id` (uuid, foreign key to projects)
      - `role` (text) - role within project (admin, manager, viewer)
      - `granted_by` (uuid, foreign key to user_profiles)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to view their projects
    - Add policies for admins to manage projects

  3. Indexes
    - Index on user_id for faster lookups
    - Index on project_id for filtering
    - Unique constraint on user_id + project_id combination
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_project_access table
CREATE TABLE IF NOT EXISTS user_project_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
  granted_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_project_access ENABLE ROW LEVEL SECURITY;

-- Policies for projects table
CREATE POLICY "Users can view projects they have access to"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT project_id 
      FROM user_project_access 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Policies for user_project_access table
CREATE POLICY "Users can view their own project access"
  ON user_project_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Project admins can view all access in their projects"
  ON user_project_access
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id 
      FROM user_project_access 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Super admins and project admins can grant access"
  ON user_project_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_id = auth.uid() 
      AND project_id = user_project_access.project_id
      AND role = 'admin'
    )
  );

CREATE POLICY "Super admins and project admins can revoke access"
  ON user_project_access
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_project_access upa
      WHERE upa.user_id = auth.uid() 
      AND upa.project_id = user_project_access.project_id
      AND upa.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_project_access_user_id 
  ON user_project_access(user_id);

CREATE INDEX IF NOT EXISTS idx_user_project_access_project_id 
  ON user_project_access(project_id);

CREATE INDEX IF NOT EXISTS idx_projects_is_active 
  ON projects(is_active);

-- Create a default project for existing data
INSERT INTO projects (name, description, is_active)
VALUES ('ArtTrans Logistics', 'Головний проект логістики', true)
ON CONFLICT DO NOTHING;

-- Grant all existing users access to the default project
INSERT INTO user_project_access (user_id, project_id, role)
SELECT 
  up.id,
  (SELECT id FROM projects WHERE name = 'ArtTrans Logistics' LIMIT 1),
  CASE 
    WHEN up.role = 'super_admin' THEN 'admin'
    ELSE 'manager'
  END
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM user_project_access upa 
  WHERE upa.user_id = up.id
)
ON CONFLICT (user_id, project_id) DO NOTHING;