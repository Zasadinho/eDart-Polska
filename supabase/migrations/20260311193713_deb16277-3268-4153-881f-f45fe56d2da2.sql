-- Add walkover flag and disqualified_player_id to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS is_walkover boolean NOT NULL DEFAULT false;

-- Add disqualified flag to player_leagues
ALTER TABLE public.player_leagues ADD COLUMN IF NOT EXISTS disqualified boolean NOT NULL DEFAULT false;
ALTER TABLE public.player_leagues ADD COLUMN IF NOT EXISTS disqualified_at timestamp with time zone;