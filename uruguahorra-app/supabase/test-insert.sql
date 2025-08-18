-- Script de prueba para verificar inserciones en la tabla users
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Primero, obtén un ID de usuario de auth.users
SELECT id, email FROM auth.users LIMIT 1;

-- 2. Si tienes un usuario, copia su ID y ejecuta este INSERT
-- Reemplaza 'TU_USER_ID_AQUI' con el ID real del usuario
-- Reemplaza 'TU_EMAIL_AQUI' con el email real del usuario

/*
INSERT INTO public.users (id, email, country, currency, premium)
VALUES (
    'TU_USER_ID_AQUI',
    'TU_EMAIL_AQUI', 
    'UY',
    'UYU',
    false
)
ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
*/

-- 3. Si el INSERT anterior funciona, verifica que se guardó:
SELECT * FROM public.users WHERE email = 'TU_EMAIL_AQUI';

-- 4. Si no funciona, ejecuta esto para ver el error específico:
-- Primero deshabilita RLS temporalmente
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Intenta el insert nuevamente
/*
INSERT INTO public.users (id, email, country, currency, premium)
VALUES (
    'TU_USER_ID_AQUI',
    'TU_EMAIL_AQUI',
    'UY', 
    'UYU',
    false
)
ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
*/

-- Verifica si ahora sí se insertó
SELECT * FROM public.users;

-- IMPORTANTE: Re-habilita RLS después de la prueba
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;