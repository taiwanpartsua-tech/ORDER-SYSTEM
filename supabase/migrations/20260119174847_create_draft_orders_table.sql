/*
  # Create draft orders table

  1. New Tables
    - `draft_orders`
      - `id` (uuid, primary key)
      - `order_number` (text, nullable)
      - `supplier_id` (uuid, foreign key to suppliers)
      - `status` (text, default 'в роботі на сьогодні')
      - `order_date` (date)
      - `notes` (text, nullable)
      - `title` (text, nullable)
      - `link` (text, nullable)
      - `tracking_pl` (text, nullable)
      - `part_price` (numeric, default 0)
      - `delivery_cost` (numeric, default 0)
      - `total_cost` (numeric, default 0)
      - `part_number` (text, nullable)
      - `payment_type` (text)
      - `cash_on_delivery` (numeric, default 0)
      - `client_id` (text, nullable)
      - `received_pln` (numeric, default 0)
      - `transport_cost_usd` (numeric, default 0)
      - `weight_kg` (numeric, default 0)
      - `verified` (boolean, default false)
      - `manager_id` (uuid, nullable, foreign key to user_profiles)
      - `counterparty_id` (uuid, nullable, foreign key to counterparties)
      - `project_id` (uuid, foreign key to projects)
      - `archived` (boolean, default false)
      - `archived_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())
      - `created_by` (uuid, foreign key to user_profiles)

  2. Security
    - Enable RLS on `draft_orders` table
    - Add policies for authenticated users based on project access and role
*/

CREATE TABLE IF NOT EXISTS draft_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text,
  supplier_id uuid REFERENCES suppliers(id),
  status text DEFAULT 'в роботі на сьогодні' CHECK (status IN (
    'в роботі на сьогодні', 'на броні', 'очікується', 'прийнято сьогодні',
    'прийнято', 'на складі', 'в дорозі', 'в вигрузці', 'готово до відправки',
    'в активному прийомі', 'на звірці', 'повернення', 'проблемні', 'анульовано'
  )),
  order_date date DEFAULT CURRENT_DATE,
  notes text,
  title text,
  link text,
  tracking_pl text,
  part_price numeric(15, 2) DEFAULT 0,
  delivery_cost numeric(15, 2) DEFAULT 0,
  total_cost numeric(15, 2) DEFAULT 0,
  part_number text,
  payment_type text DEFAULT 'не обрано' CHECK (payment_type IN (
    'готівка', 'банк карта', 'оплачено', 'самовивіз', 'побранє', 'не обрано', 'оплачено по перерахунку'
  )),
  cash_on_delivery numeric(15, 2) DEFAULT 0,
  client_id text,
  received_pln numeric(15, 2) DEFAULT 0,
  transport_cost_usd numeric(15, 2) DEFAULT 0,
  weight_kg numeric(15, 2) DEFAULT 0,
  verified boolean DEFAULT false,
  manager_id uuid REFERENCES user_profiles(id),
  counterparty_id uuid REFERENCES counterparties(id),
  project_id uuid REFERENCES projects(id) NOT NULL,
  archived boolean DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id)
);

ALTER TABLE draft_orders ENABLE ROW LEVEL SECURITY;

-- Super admins can view all draft orders
CREATE POLICY "Super admins can view all draft orders"
  ON draft_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Users with project access can view draft orders in their projects
CREATE POLICY "Users can view draft orders in their projects"
  ON draft_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.user_id = auth.uid()
      AND user_project_access.project_id = draft_orders.project_id
    )
  );

-- Suppliers can only view their own draft orders
CREATE POLICY "Suppliers can view their draft orders"
  ON draft_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'supplier'
    )
    AND EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = draft_orders.supplier_id
      AND suppliers.name = (
        SELECT email FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Non-suppliers can insert draft orders
CREATE POLICY "Non-suppliers can insert draft orders"
  ON draft_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'supplier'
    )
    AND (
      EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = auth.uid()
        AND user_project_access.project_id = draft_orders.project_id
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
      )
    )
  );

-- Suppliers can update their own draft orders (limited fields)
CREATE POLICY "Suppliers can update their draft orders"
  ON draft_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'supplier'
    )
    AND EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = draft_orders.supplier_id
      AND suppliers.name = (
        SELECT email FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'supplier'
    )
    AND EXISTS (
      SELECT 1 FROM suppliers
      WHERE suppliers.id = draft_orders.supplier_id
      AND suppliers.name = (
        SELECT email FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Non-suppliers can update draft orders in their projects
CREATE POLICY "Non-suppliers can update draft orders"
  ON draft_orders
  FOR UPDATE
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'supplier'
    )
    AND (
      EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = auth.uid()
        AND user_project_access.project_id = draft_orders.project_id
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
      )
    )
  )
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'supplier'
    )
    AND (
      EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = auth.uid()
        AND user_project_access.project_id = draft_orders.project_id
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
      )
    )
  );

-- Non-suppliers can delete draft orders in their projects
CREATE POLICY "Non-suppliers can delete draft orders"
  ON draft_orders
  FOR DELETE
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'supplier'
    )
    AND (
      EXISTS (
        SELECT 1 FROM user_project_access
        WHERE user_project_access.user_id = auth.uid()
        AND user_project_access.project_id = draft_orders.project_id
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
      )
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_draft_orders_project_id ON draft_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_draft_orders_supplier_id ON draft_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_draft_orders_archived ON draft_orders(archived);
CREATE INDEX IF NOT EXISTS idx_draft_orders_created_by ON draft_orders(created_by);