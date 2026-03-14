INSERT INTO public.players (id, name, avatar, approved)
VALUES ('00000000-0000-0000-0000-000000000000', 'TBD', 'TB', true)
ON CONFLICT (id) DO NOTHING;