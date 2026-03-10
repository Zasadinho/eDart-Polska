
-- Drop overly permissive write policies on live_matches
DROP POLICY IF EXISTS "Authenticated can insert live_matches" ON public.live_matches;
DROP POLICY IF EXISTS "Authenticated can update live_matches" ON public.live_matches;

-- Scoped policy: only match participants can write live_matches
CREATE POLICY "Match participants can manage live_matches"
ON public.live_matches FOR ALL TO authenticated
USING (
  match_id IN (
    SELECT id FROM public.matches
    WHERE player1_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
       OR player2_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  )
  OR is_moderator_or_admin(auth.uid())
)
WITH CHECK (
  match_id IN (
    SELECT id FROM public.matches
    WHERE player1_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
       OR player2_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  )
  OR is_moderator_or_admin(auth.uid())
);
