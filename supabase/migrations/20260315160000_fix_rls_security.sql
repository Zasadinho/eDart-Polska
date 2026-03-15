-- Restrict app_config to authenticated users only (was publicly readable)
DROP POLICY IF EXISTS "Anyone can read app_config" ON public.app_config;
CREATE POLICY "Authenticated can read app_config"
  ON public.app_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Restrict group_messages to channel members
-- First drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated can read group_messages" ON public.group_messages;

-- Allow reading messages only from channels the user has access to
-- (public/league/custom channels, or channels assigned to the user's system/custom roles)
CREATE POLICY "Users can read group_messages in accessible channels"
  ON public.group_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_channels gc
      WHERE gc.id = channel_id
      AND (
        gc.channel_type IN ('public', 'league', 'custom', 'platform')
        OR EXISTS (
          SELECT 1 FROM public.group_channel_system_roles gcsr
          JOIN public.user_roles ur ON ur.role = gcsr.system_role::app_role
          WHERE gcsr.channel_id = gc.id AND ur.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.group_channel_roles gcr
          JOIN public.user_custom_roles ucr ON ucr.role_id = gcr.role_id
          WHERE gcr.channel_id = gc.id AND ucr.user_id = auth.uid()
        )
      )
    )
  );
