
-- Table for match date proposals
CREATE TABLE public.match_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  proposer_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  proposed_date DATE NOT NULL,
  proposed_time TEXT, -- e.g. "20:00"
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'counter')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_note TEXT
);

ALTER TABLE public.match_proposals ENABLE ROW LEVEL SECURITY;

-- Players involved in the match can read proposals
CREATE POLICY "Match players can read proposals"
ON public.match_proposals
FOR SELECT
TO authenticated
USING (
  match_id IN (
    SELECT m.id FROM public.matches m
    JOIN public.players p ON (m.player1_id = p.id OR m.player2_id = p.id)
    WHERE p.user_id = auth.uid()
  )
);

-- Players involved in the match can create proposals
CREATE POLICY "Match players can create proposals"
ON public.match_proposals
FOR INSERT
TO authenticated
WITH CHECK (
  proposer_player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  AND match_id IN (
    SELECT m.id FROM public.matches m
    JOIN public.players p ON (m.player1_id = p.id OR m.player2_id = p.id)
    WHERE p.user_id = auth.uid()
  )
);

-- Players can update proposals (accept/reject) for their matches
CREATE POLICY "Match players can update proposals"
ON public.match_proposals
FOR UPDATE
TO authenticated
USING (
  match_id IN (
    SELECT m.id FROM public.matches m
    JOIN public.players p ON (m.player1_id = p.id OR m.player2_id = p.id)
    WHERE p.user_id = auth.uid()
  )
);

-- Admins full access
CREATE POLICY "Admins manage proposals"
ON public.match_proposals
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add confirmed_date to matches to store the agreed-upon date
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS confirmed_date DATE NULL;

-- Trigger to notify opponent when a proposal is created
CREATE OR REPLACE FUNCTION public.notify_match_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  opponent_user_id UUID;
  proposer_name TEXT;
  match_rec RECORD;
BEGIN
  SELECT m.player1_id, m.player2_id INTO match_rec FROM public.matches m WHERE m.id = NEW.match_id;
  
  SELECT name INTO proposer_name FROM public.players WHERE id = NEW.proposer_player_id;
  
  -- Find opponent
  IF match_rec.player1_id = NEW.proposer_player_id THEN
    SELECT user_id INTO opponent_user_id FROM public.players WHERE id = match_rec.player2_id;
  ELSE
    SELECT user_id INTO opponent_user_id FROM public.players WHERE id = match_rec.player1_id;
  END IF;
  
  IF opponent_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      opponent_user_id,
      'Propozycja terminu',
      proposer_name || ' proponuje termin meczu: ' || TO_CHAR(NEW.proposed_date, 'DD.MM.YYYY') || COALESCE(' o ' || NEW.proposed_time, ''),
      'proposal',
      '/my-matches'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_match_proposal_created
  AFTER INSERT ON public.match_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_match_proposal();

-- Notify when proposal is accepted
CREATE OR REPLACE FUNCTION public.notify_proposal_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  proposer_user_id UUID;
  accepter_name TEXT;
  match_rec RECORD;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT user_id INTO proposer_user_id FROM public.players WHERE id = NEW.proposer_player_id;
    
    SELECT m.player1_id, m.player2_id INTO match_rec FROM public.matches m WHERE m.id = NEW.match_id;
    
    -- Find who accepted (not the proposer)
    IF match_rec.player1_id = NEW.proposer_player_id THEN
      SELECT name INTO accepter_name FROM public.players WHERE id = match_rec.player2_id;
    ELSE
      SELECT name INTO accepter_name FROM public.players WHERE id = match_rec.player1_id;
    END IF;
    
    IF proposer_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        proposer_user_id,
        'Termin zaakceptowany! ✅',
        accepter_name || ' zaakceptował termin: ' || TO_CHAR(NEW.proposed_date, 'DD.MM.YYYY') || COALESCE(' o ' || NEW.proposed_time, ''),
        'proposal',
        '/my-matches'
      );
    END IF;
    
    -- Update match confirmed_date
    UPDATE public.matches SET confirmed_date = NEW.proposed_date WHERE id = NEW.match_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_proposal_accepted
  AFTER UPDATE ON public.match_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_proposal_accepted();
