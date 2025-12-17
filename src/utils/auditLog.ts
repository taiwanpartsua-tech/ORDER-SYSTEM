import { supabase } from '../lib/supabase';

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'approve' | 'send' | 'settle' | 'reverse';
type EntityType = 'order' | 'return' | 'receipt' | 'transaction' | 'card_transaction' | 'user' | 'tariff';

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
