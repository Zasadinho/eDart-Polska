import { supabase } from "@/integrations/supabase/client";

export async function logAuditAction(
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("admin_audit_log" as any).insert({
      user_id: user.id,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      details: details || {},
    } as any);
  } catch {
    // Audit logging should never break the main flow
  }
}
