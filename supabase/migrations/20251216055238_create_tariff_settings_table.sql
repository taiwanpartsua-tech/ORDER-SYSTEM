/*
  # Create Tariff Settings Table

  1. New Tables
    - `tariff_settings`
      - `id` (uuid, primary key)
      - `default_received_pln` (numeric) - Default receiving fee in PLN (e.g., 15)
      - `default_transport_cost_per_kg_usd` (numeric) - Default transport cost per kg in USD (e.g., 2.5)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `tariff_settings` table
    - Add policies for authenticated and anonymous users to read settings
    - Add policies for authenticated and anonymous users to update settings

  3. Initial Data
    - Insert default tariff settings with standard values
*/

-- Create tariff_settings table
CREATE TABLE IF NOT EXISTS tariff_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_received_pln numeric(10, 2) DEFAULT 15.00 NOT NULL,
  default_transport_cost_per_kg_usd numeric(10, 2) DEFAULT 2.50 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE tariff_settings ENABLE ROW LEVEL SECURITY;

-- Policies for reading settings
CREATE POLICY "Anyone can read tariff settings"
  ON tariff_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policies for updating settings
CREATE POLICY "Anyone can update tariff settings"
  ON tariff_settings
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for inserting settings (should only be one row)
CREATE POLICY "Anyone can insert tariff settings"
  ON tariff_settings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Insert default settings (only if table is empty)
INSERT INTO tariff_settings (default_received_pln, default_transport_cost_per_kg_usd)
SELECT 15.00, 2.50
WHERE NOT EXISTS (SELECT 1 FROM tariff_settings);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tariff_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_tariff_settings_updated_at_trigger ON tariff_settings;
CREATE TRIGGER update_tariff_settings_updated_at_trigger
  BEFORE UPDATE ON tariff_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_tariff_settings_updated_at();