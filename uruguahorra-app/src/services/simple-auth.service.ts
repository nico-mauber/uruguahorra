/**
 * Servicio de Autenticación Simplificado
 *
 * Este servicio reemplaza el complejo AuthService anterior con una versión
 * mucho más simple y directa que funciona correctamente.
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type UserProfile = Database['public']['Tables']['users']['Row'];

export interface AuthResponse {
  success: boolean;
  user?: any;
  profile?: UserProfile;
  error?: string;
}

// Helper para manejar rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Último timestamp de operación para evitar rate limiting
let lastAuthOperation = 0;

export class SimpleAuthService {
  // Asegurar que haya al menos 2 segundos entre operaciones de auth
  private static async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastOp = now - lastAuthOperation;

    if (timeSinceLastOp < 2000) {
      const waitTime = 2000 - timeSinceLastOp;
      console.log(
        `[SimpleAuth] Esperando ${waitTime}ms para evitar rate limiting`
      );
      await delay(waitTime);
    }

    lastAuthOperation = Date.now();
  }
  /**
   * Registrar nuevo usuario
   * Simple y directo: crear usuario → crear perfil → retornar
   */
  static async signUp(
    email: string,
    password: string,
    metadata?: { country?: string; currency?: string }
  ): Promise<AuthResponse> {
    try {
      console.log('[SimpleAuth] Iniciando registro:', email);

      // Esperar si es necesario para evitar rate limiting
      await this.waitForRateLimit();

      // Crear usuario directamente - Supabase maneja duplicados automáticamente
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: undefined, // No queremos confirmación de email
        },
      });

      if (authError) {
        console.error('[SimpleAuth] Error en signUp:', authError);

        // Si el error es de rate limiting, esperar y mostrar mensaje claro
        if (authError.message?.includes('rate_limit')) {
          return {
            success: false,
            error:
              'Por favor espera unos segundos antes de intentar nuevamente',
          };
        }

        return {
          success: false,
          error: authError.message,
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'No se pudo crear el usuario',
        };
      }

      // Si el usuario ya existía, Supabase lo retorna sin error
      // Detectamos esto si identities está vacío
      if (authData.user.identities?.length === 0) {
        console.log('[SimpleAuth] Usuario ya existía, tratando como login');

        // Hacer login automáticamente
        const loginResult = await this.signIn(email, password);
        return loginResult;
      }

      console.log('[SimpleAuth] Usuario creado/recuperado:', authData.user.id);

      // 2. Esperar un momento para que el trigger cree el perfil
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3. Forzar creación del perfil si no existe
      let profile = null;

      // Primero intentar obtener el perfil
      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (existingProfile) {
        profile = existingProfile;
      } else {
        // Si no existe, crearlo directamente
        console.log('[SimpleAuth] Perfil no existe, creándolo...');

        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            country: metadata?.country || 'UY',
            currency: metadata?.currency || 'UYU',
            premium: false,
            total_xp: 0,
            current_level: 1,
            current_streak: 0,
            longest_streak: 0,
            last_activity_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('[SimpleAuth] Error creando perfil:', insertError);

          // Si falla la inserción, intentar con RPC como fallback
          const { data: rpcProfile } = await supabase.rpc(
            'get_or_create_user_profile',
            {
              p_user_id: authData.user.id,
            }
          );

          profile = rpcProfile;
        } else {
          profile = newProfile;
        }
      }

      if (!profile) {
        console.warn(
          '[SimpleAuth] No se pudo crear el perfil, pero continuando...'
        );
      }

      console.log('[SimpleAuth] Registro completado');

      return {
        success: true,
        user: authData.user,
        profile: profile || undefined,
      };
    } catch (error) {
      console.error('[SimpleAuth] Error inesperado en signUp:', error);
      return {
        success: false,
        error: 'Error al registrar usuario',
      };
    }
  }

  /**
   * Iniciar sesión
   * Simple: verificar credenciales → obtener perfil → retornar
   */
  static async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('[SimpleAuth] Iniciando sesión:', email);

      // Esperar si es necesario para evitar rate limiting
      await this.waitForRateLimit();

      // 1. Iniciar sesión con Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        console.error('[SimpleAuth] Error en signIn:', authError);

        // Manejar error de email no confirmado
        if (
          authError.message === 'Email not confirmed' ||
          authError.message?.includes('email_not_confirmed')
        ) {
          console.log(
            '[SimpleAuth] Email no confirmado, intentando obtener usuario de otra forma'
          );

          // Intentar obtener el usuario por email para al menos tener el perfil
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

          if (profile) {
            console.log(
              '[SimpleAuth] Perfil encontrado aunque email no confirmado'
            );
            // Retornar éxito parcial con perfil pero sin sesión completa
            return {
              success: false,
              error:
                'Tu email aún no está confirmado. Por favor revisa tu correo o contacta soporte.',
              profile: profile,
            };
          }
        }

        // Manejar rate limiting
        if (authError.message?.includes('rate_limit')) {
          return {
            success: false,
            error:
              'Por favor espera unos segundos antes de intentar nuevamente',
          };
        }

        return {
          success: false,
          error: authError.message,
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'No se pudo iniciar sesión',
        };
      }

      console.log('[SimpleAuth] Sesión iniciada:', authData.user.id);

      // 2. Obtener o crear el perfil del usuario
      let profile = null;

      // Primero intentar obtener el perfil
      const { data: existingProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.warn(
          '[SimpleAuth] Perfil no encontrado, creándolo...',
          profileError
        );

        // Si no existe el perfil, crearlo directamente
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            country: 'UY',
            currency: 'UYU',
            premium: false,
            total_xp: 0,
            current_level: 1,
            current_streak: 0,
            longest_streak: 0,
            last_activity_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('[SimpleAuth] Error creando perfil:', insertError);

          // Si falla la inserción directa, intentar con RPC
          const { data: rpcProfile } = await supabase.rpc(
            'get_or_create_user_profile',
            {
              p_user_id: authData.user.id,
            }
          );

          profile = rpcProfile;
        } else {
          profile = newProfile;
        }
      } else {
        profile = existingProfile;
      }

      console.log('[SimpleAuth] Login completado');

      return {
        success: true,
        user: authData.user,
        profile: profile || undefined,
      };
    } catch (error) {
      console.error('[SimpleAuth] Error inesperado en signIn:', error);
      return {
        success: false,
        error: 'Error al iniciar sesión',
      };
    }
  }

  /**
   * Cerrar sesión
   */
  static async signOut(): Promise<void> {
    try {
      console.log('[SimpleAuth] Cerrando sesión');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[SimpleAuth] Error en signOut:', error);
      }
      console.log('[SimpleAuth] Sesión cerrada');
    } catch (error) {
      console.error('[SimpleAuth] Error inesperado en signOut:', error);
    }
  }

  /**
   * Obtener sesión actual
   */
  static async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[SimpleAuth] Error obteniendo sesión:', error);
        return null;
      }
      return data.session;
    } catch (error) {
      console.error('[SimpleAuth] Error inesperado obteniendo sesión:', error);
      return null;
    }
  }

  /**
   * Obtener usuario actual con perfil
   */
  static async getCurrentUser(): Promise<{
    user: any;
    profile: UserProfile | null;
  } | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      // Obtener perfil
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      return {
        user,
        profile: profile || null,
      };
    } catch (error) {
      console.error('[SimpleAuth] Error obteniendo usuario actual:', error);
      return null;
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  static async updateProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile | null> {
    try {
      console.log('[SimpleAuth] Actualizando perfil:', userId);

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('[SimpleAuth] Error actualizando perfil:', error);
        return null;
      }

      console.log('[SimpleAuth] Perfil actualizado');
      return data;
    } catch (error) {
      console.error(
        '[SimpleAuth] Error inesperado actualizando perfil:',
        error
      );
      return null;
    }
  }

  /**
   * Verificar si el email ya está registrado
   */
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      // Intentar obtener usuario por email
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }
}
