import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type User = Database['public']['Tables']['users']['Row'];

export class AuthService {
  /**
   * Registrar nuevo usuario
   */
  static async signUp(email: string, password: string, metadata?: { country?: string; currency?: string }) {
    try {
      console.log('AuthService.signUp - Iniciando registro para:', email);
      
      // 1. Crear cuenta en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (authError) {
        console.error('Error al crear usuario en Auth:', authError);
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }
      
      console.log('Usuario creado en Auth con ID:', authData.user.id);

      // 2. Esperar un momento para que el trigger se ejecute (si existe)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 3. Verificar si el perfil existe en la tabla users
      const { data: existingProfile, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle(); // Usar maybeSingle en lugar de single para evitar error si no existe
      
      if (checkError) {
        console.error('Error verificando perfil existente:', checkError);
      }
      
      // 4. Si no existe el perfil, crearlo manualmente
      if (!existingProfile) {
        console.log('Perfil no encontrado, creando manualmente...');
        
        const profileData = {
          id: authData.user.id,
          email: authData.user.email!,
          country: metadata?.country || 'UY',
          currency: metadata?.currency || 'UYU',
          premium: false,
        };
        
        const { data: newProfile, error: profileError } = await supabase
          .from('users')
          .insert(profileData)
          .select()
          .single();

        if (profileError) {
          console.error('Error creando perfil de usuario:', profileError);
          // Si el error es porque ya existe, intentamos obtenerlo
          if (profileError.code === '23505') { // Duplicate key
            const { data: existingUser } = await supabase
              .from('users')
              .select('*')
              .eq('id', authData.user.id)
              .single();
            
            if (existingUser) {
              console.log('Perfil ya existía, usando el existente');
            }
          } else {
            throw profileError;
          }
        } else {
          console.log('Perfil creado exitosamente:', newProfile);
        }
      } else {
        console.log('Perfil ya existía:', existingProfile);
        
        // Actualizar metadata si es necesario
        if (metadata) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              country: metadata.country || existingProfile.country,
              currency: metadata.currency || existingProfile.currency,
            })
            .eq('id', authData.user.id);
            
          if (updateError) {
            console.warn('Error actualizando metadata del perfil:', updateError);
          }
        }
      }

      console.log('Registro completado exitosamente');
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