import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type User = Database['public']['Tables']['users']['Row'];

export class AuthService {
  /**
   * Registrar nuevo usuario
   */
  static async signUp(email: string, password: string, metadata?: { country?: string; currency?: string }) {
    try {
      // 1. Crear cuenta en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // 2. Crear perfil en tabla users (se hace automáticamente con el trigger)
      // pero podemos actualizar con metadata adicional si es necesario
      if (metadata && authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .update({
            country: metadata.country,
            currency: metadata.currency,
          })
          .eq('id', authData.user.id);

        if (profileError) console.warn('Error actualizando perfil:', profileError);
      }

      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error('Error en signUp:', error);
      throw error;
    }
  }

  /**
   * Iniciar sesión
   */
  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Error en signIn:', error);
      throw error;
    }
  }

  /**
   * Cerrar sesión
   */
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error en signOut:', error);
      throw error;
    }
  }

  /**
   * Obtener sesión actual
   */
  static async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Error obteniendo sesión:', error);
      return null;
    }
  }

  /**
   * Obtener usuario actual
   */
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  }

  /**
   * Obtener perfil del usuario desde la tabla users
   */
  static async getUserProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      return null;
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  static async updateUserProfile(userId: string, updates: Partial<User>) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  }

  /**
   * Solicitar restablecimiento de contraseña
   */
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error en resetPassword:', error);
      throw error;
    }
  }

  /**
   * Actualizar contraseña
   */
  static async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error actualizando contraseña:', error);
      throw error;
    }
  }

  /**
   * Configurar listener de cambios de autenticación
   */
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  /**
   * Verificar si el usuario es premium
   */
  static async checkPremiumStatus(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error verificando premium:', error);
      }

      return !!data;
    } catch (error) {
      console.error('Error en checkPremiumStatus:', error);
      return false;
    }
  }
}