import { supabase } from '../lib/supabase';

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'approve' | 'send' | 'settle' | 'reverse';
type EntityType = 'order' | 'return' | 'receipt' | 'transaction' | 'card_transaction' | 'user' | 'tariff' | 'invite_code';

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  entity_type: EntityType | null;
  entity_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
  is_archived?: boolean;
}

export async function logAction(
  action: AuditAction,
  entityType: EntityType | null = null,
  entityId: string | null = null,
  details: Record<string, any> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: null
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

export async function triggerAuditMaintenance(action: 'archive' | 'cleanup' | 'both') {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-maintenance`;
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to run maintenance');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to run audit maintenance:', error);
    throw error;
  }
}
