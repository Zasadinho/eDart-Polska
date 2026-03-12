
-- Add public read policy for app_config so the app can read self-host config without auth
CREATE POLICY "Anyone can read app_config"
ON public.app_config
FOR SELECT
TO public
USING (true);

-- Seed custom_site_url config key if not exists
INSERT INTO public.app_config (key, value)
VALUES ('custom_site_url', '')
ON CONFLICT (key) DO NOTHING;
