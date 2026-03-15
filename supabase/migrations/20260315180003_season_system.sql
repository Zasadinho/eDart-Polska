-- Season system: add season tracking to leagues
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS season_number INT NOT NULL DEFAULT 1;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS parent_league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL;

CREATE INDEX idx_leagues_archived ON public.leagues (is_archived);
CREATE INDEX idx_leagues_parent ON public.leagues (parent_league_id);
