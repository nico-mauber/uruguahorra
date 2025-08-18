-- =================================
-- FIX WEEKLY QUESTS RLS POLICIES
-- =================================
-- This file adds missing RLS policies for the weekly_quests table
-- The system needs to be able to INSERT and UPDATE weekly quests automatically

-- Add INSERT policy for weekly_quests (authenticated users can create)
CREATE POLICY "Authenticated users can insert weekly quests" ON weekly_quests
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Add UPDATE policy for weekly_quests (for deactivating old quests)
CREATE POLICY "Authenticated users can update weekly quests" ON weekly_quests
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'weekly_quests'
ORDER BY policyname;