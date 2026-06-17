-- Migration: Add token-based verification support for extension
-- Run this in your Supabase SQL editor

-- 1. Add a SECURITY DEFINER function to verify sync tokens
--    This runs as the DB owner (bypasses RLS) so the extension can verify tokens
--    without needing the service role key.
CREATE OR REPLACE FUNCTION public.verify_sync_token(p_token text)
RETURNS TABLE(user_id uuid, email text, plan text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.user_id,
    p.email,
    p.plan
  FROM public.sync_tokens st
  JOIN public.profiles p ON p.id = st.user_id
  WHERE st.token = p_token
  LIMIT 1;
END;
$$;

-- Grant execute to anon and authenticated roles so it can be called via RPC
GRANT EXECUTE ON FUNCTION public.verify_sync_token(text) TO anon, authenticated;

-- 2. Optionally: also allow users to upsert their own sync tokens
--    (in case the existing policy doesn't cover upsert)
DROP POLICY IF EXISTS "sync_tokens_upsert" ON public.sync_tokens;
CREATE POLICY "sync_tokens_upsert" ON public.sync_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);
