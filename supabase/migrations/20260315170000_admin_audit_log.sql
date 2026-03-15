-- Admin audit log table — tracks important admin/system actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT, -- 'match', 'league', 'player', 'challenge', etc.
  target_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by time and by user
CREATE INDEX idx_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.admin_audit_log (user_id);
CREATE INDEX idx_audit_log_action ON public.admin_audit_log (action);

-- RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins/moderators can read audit logs
CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (is_moderator_or_admin(auth.uid()));

-- Authenticated users can insert their own audit entries (for logging actions)
CREATE POLICY "Authenticated can insert audit log"
  ON public.admin_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role manages audit log"
  ON public.admin_audit_log
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
