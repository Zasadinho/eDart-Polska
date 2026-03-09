-- Allow anon to upsert live_matches (extension uses anon key)
CREATE POLICY "Anon can upsert live_matches" ON public.live_matches
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update live_matches" ON public.live_matches
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Enable realtime for match_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_reactions;