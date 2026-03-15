-- Player ban system (temporary and permanent bans)
CREATE TABLE IF NOT EXISTS public.player_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('temporary', 'permanent')),
  reason TEXT NOT NULL DEFAULT '',
  banned_until TIMESTAMPTZ, -- NULL = permanent
  is_active BOOLEAN NOT NULL DEFAULT true,
  unbanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unbanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_bans_user ON public.player_bans (user_id, is_active);
CREATE INDEX idx_player_bans_active ON public.player_bans (is_active, banned_until);

ALTER TABLE public.player_bans ENABLE ROW LEVEL SECURITY;

-- Admins can read all bans
CREATE POLICY "Admins read bans"
  ON public.player_bans FOR SELECT TO authenticated
  USING (is_moderator_or_admin(auth.uid()));

-- Admins can insert bans
CREATE POLICY "Admins insert bans"
  ON public.player_bans FOR INSERT TO authenticated
  WITH CHECK (is_moderator_or_admin(auth.uid()));

-- Admins can update bans (unban)
CREATE POLICY "Admins update bans"
  ON public.player_bans FOR UPDATE TO authenticated
  USING (is_moderator_or_admin(auth.uid()));

-- Users can see their own bans
CREATE POLICY "Users see own bans"
  ON public.player_bans FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Function to check if a user is currently banned
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM player_bans
    WHERE user_id = p_user_id
      AND is_active = true
      AND (banned_until IS NULL OR banned_until > now())
  );
END;
$$;

-- Auto-expire temporary bans
CREATE OR REPLACE FUNCTION expire_temporary_bans()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE player_bans
  SET is_active = false
  WHERE is_active = true
    AND ban_type = 'temporary'
    AND banned_until IS NOT NULL
    AND banned_until <= now();
END;
$$;
