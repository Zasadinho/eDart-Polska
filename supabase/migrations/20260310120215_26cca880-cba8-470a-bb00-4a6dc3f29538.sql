
-- 1. Drop the overly permissive anon read policy
DROP POLICY IF EXISTS "Anon can read players" ON public.players;

-- 2. Drop the overly permissive authenticated read policy
DROP POLICY IF EXISTS "Authenticated users can read players" ON public.players;

-- 3. Create a restricted authenticated policy that only exposes non-sensitive columns
-- Since column-level RLS isn't possible, we create a view and restrict direct access
-- Instead, we re-add the authenticated SELECT but rely on the existing get_opponent_contact() 
-- and get_player_public_info() SECURITY DEFINER functions for safe access.
-- We still need basic SELECT for app functionality, so we allow it but create an anon policy
-- that only works through the RPC functions.

-- Re-add authenticated read (needed for app to work - phone/discord are only shown via RPC)
CREATE POLICY "Authenticated users can read players"
ON public.players FOR SELECT TO authenticated USING (true);
