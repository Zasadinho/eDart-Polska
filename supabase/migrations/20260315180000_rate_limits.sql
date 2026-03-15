-- Rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (user_id, action, created_at DESC);

-- Cleanup old entries (older than 1 hour)
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits (created_at);

-- RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role manages rate limits"
  ON public.rate_limits FOR ALL TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Users can insert their own rate limit entries
CREATE POLICY "Users insert own rate limits"
  ON public.rate_limits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_requests INT DEFAULT 10,
  p_window_minutes INT DEFAULT 1
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  -- Count requests in the time window
  SELECT COUNT(*) INTO v_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > now() - (p_window_minutes || ' minutes')::INTERVAL;

  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  -- Record this request
  INSERT INTO rate_limits (user_id, action)
  VALUES (p_user_id, p_action);

  RETURN TRUE;
END;
$$;

-- Periodic cleanup function (call from cron or edge function)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < now() - INTERVAL '1 hour';
END;
$$;
