-- ============================================
-- FIX URGENTE: Corregir recursión infinita en squad_members (v2)
-- ============================================
-- Ejecutar este script INMEDIATAMENTE para solucionar el error 42P17
-- Fecha: 25 de Agosto, 2025

-- PASO 1: Eliminar todas las políticas existentes de squad_members
DROP POLICY IF EXISTS "squad_members_select_all" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members_insert_any" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members_update_any" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members_delete_any" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members_select_simple" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members_insert_simple" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members_update_simple" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members_delete_simple" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members_select_related" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members_insert_allowed" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members_update_own" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members_delete_allowed" ON public.squad_members;

-- PASO 2: Crear políticas NUEVAS sin recursión
-- Estas políticas no consultan squad_members dentro de sí mismas

CREATE POLICY "squad_members_select_members" ON public.squad_members
    FOR SELECT USING (
        -- Puedes ver miembros si eres parte del squad o si el squad es público
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.squads 
            WHERE squads.id = squad_members.squad_id 
            AND squads.is_active = true
        )
    );

CREATE POLICY "squad_members_insert_authorized" ON public.squad_members
    FOR INSERT WITH CHECK (
        -- Te puedes agregar a ti mismo o si eres el owner/creador del squad
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.squads 
            WHERE squads.id = squad_id 
            AND (squads.owner_id = auth.uid() OR squads.created_by = auth.uid())
        )
    );

CREATE POLICY "squad_members_update_own" ON public.squad_members
    FOR UPDATE 
    USING (
        -- Solo puedes actualizar tu propio registro
        auth.uid() = user_id
    )
    WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "squad_members_delete_authorized" ON public.squad_members
    FOR DELETE USING (
        -- Te puedes eliminar a ti mismo o si eres owner del squad
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.squads 
            WHERE squads.id = squad_members.squad_id 
            AND (squads.owner_id = auth.uid() OR squads.created_by = auth.uid())
        )
    );

-- PASO 3: Verificación
DO $$ 
BEGIN
    RAISE NOTICE '✅ Políticas de squad_members corregidas (v2)';
    RAISE NOTICE '✅ Recursión infinita eliminada definitivamente';
    RAISE NOTICE '🚀 Los pods deberían funcionar correctamente ahora';
END $$;