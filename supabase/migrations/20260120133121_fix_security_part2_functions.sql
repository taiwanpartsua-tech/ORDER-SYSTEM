/*
  # Fix Security Issues - Part 2: Function Search Paths

  1. Security Improvements
    - Set immutable search paths for all functions
    - Prevents SQL injection via search_path manipulation
    - Critical security hardening measure
*/

-- Fix function search paths to prevent injection attacks
ALTER FUNCTION update_updated_at_column() SET search_path = pg_catalog, public;
ALTER FUNCTION update_tariff_settings_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION archive_old_audit_logs() SET search_path = pg_catalog, public;
ALTER FUNCTION cleanup_archived_logs() SET search_path = pg_catalog, public;
ALTER FUNCTION get_audit_stats() SET search_path = pg_catalog, public;
ALTER FUNCTION set_default_counterparty() SET search_path = pg_catalog, public;
ALTER FUNCTION validate_supplier_order_update() SET search_path = pg_catalog, public;
ALTER FUNCTION handle_new_user() SET search_path = pg_catalog, public;
ALTER FUNCTION user_has_project_access(uuid) SET search_path = pg_catalog, public;