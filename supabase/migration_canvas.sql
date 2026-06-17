-- Migration: Add canvas_data column and allow editor collaborators to update boards
-- Run this in your Supabase SQL editor

ALTER TABLE public.boards 
ADD COLUMN IF NOT EXISTS canvas_data jsonb 
DEFAULT '{"items": {}, "notes": [], "arrows": []}'::jsonb;

-- Drop policy if exists to make script re-runnable
DROP POLICY IF EXISTS "boards_member_update" ON public.boards;

-- Create policy allowing editor collaborators to update boards (e.g. canvas_data)
CREATE POLICY "boards_member_update" ON public.boards FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.board_members bm 
    WHERE bm.board_id = id AND bm.user_id = auth.uid() AND bm.role = 'editor'
  )
);
