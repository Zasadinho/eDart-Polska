
-- Add registration_open column to leagues
ALTER TABLE public.leagues ADD COLUMN registration_open boolean NOT NULL DEFAULT false;

-- Update handle_new_user trigger to also create a player record
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 2))
  );
  
  -- Auto-create player record linked to user
  INSERT INTO public.players (name, avatar, approved, user_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 2)),
    true,
    NEW.id
  );
  
  RETURN NEW;
END;
$function$;

-- Make sure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow authenticated users to insert themselves into player_leagues (for registration)
CREATE POLICY "Players can join open leagues"
ON public.player_leagues
FOR INSERT
TO authenticated
WITH CHECK (
  player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  AND league_id IN (SELECT id FROM public.leagues WHERE registration_open = true)
);

-- Allow authenticated users to delete their own player_leagues (leave league)  
CREATE POLICY "Players can leave leagues"
ON public.player_leagues
FOR DELETE
TO authenticated
USING (
  player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
);
