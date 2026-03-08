-- Fix 1: Replace overly broad match update policy with scoped one
DROP POLICY IF EXISTS "Auth users can update matches" ON public.matches;

CREATE POLICY "Players can submit own match results"
ON public.matches FOR UPDATE TO authenticated
USING (
  status = 'upcoming' AND
  (
    player1_id IN (SELECT id FROM players WHERE user_id = auth.uid()) OR
    player2_id IN (SELECT id FROM players WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  status = 'pending_approval' AND
  (
    player1_id IN (SELECT id FROM players WHERE user_id = auth.uid()) OR
    player2_id IN (SELECT id FROM players WHERE user_id = auth.uid())
  )
);

-- Fix 2: Replace public players read with two policies - public (no phone) via view, authenticated read
-- First drop the old public policy
DROP POLICY IF EXISTS "Anyone can read players" ON public.matches;
DROP POLICY IF EXISTS "Anyone can read players" ON public.players;

-- Create a view that excludes sensitive data for public access
CREATE OR REPLACE VIEW public.players_public AS
SELECT id, name, avatar, avatar_url, approved, created_at
FROM public.players;

-- Re-create read policy for authenticated users only (full data)
CREATE POLICY "Authenticated users can read players"
ON public.players FOR SELECT TO authenticated
USING (true);

-- Allow anon users to read only non-sensitive fields via a security definer function
CREATE OR REPLACE FUNCTION public.get_public_players()
RETURNS SETOF public.players_public
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, avatar, avatar_url, approved, created_at
  FROM public.players;
$$;