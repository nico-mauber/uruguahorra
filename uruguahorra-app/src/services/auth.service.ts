import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

type User = Database['public']['Tables']['users']['Row'];

export class AuthService {
  /**
   * Registrar nuevo usuario
   */
  static async signUp(email: string, password: string, metadata?: { country?: string; currency?: string }) {
    try {
      logger.start(LogModule.AUTH, `Iniciando registro de nuevo usuario`, { email, metadata });
      
      // 1. Crear cuenta en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (authError) {
        logger.error(LogModule.AUTH, 'Error al crear usuario en Supabase Auth', authError);
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }
      
      logger.success(LogModule.AUTH, 'Usuario creado en Auth exitosamente', {
        userId: authData.user.id,
        email: authData.user.email,
        sessionCreated: !!authData.session
      });

      // 2. Si tenemos sesión, establecerla inmediatamente
      if (authData.session) {
        logger.sync(LogModule.AUTH, 'Estableciendo sesión del nuevo usuario');
        await supabase.auth.setSession({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        });
        logger.success(LogModule.AUTH, 'Sesión establecida correctamente');
      }

      // 3. Esperar un momento para que el trigger se ejecute (si existe)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 4. Verificar si el perfil existe en la tabla users
      logger.database(LogModule.DB, 'Verificando si el perfil fue creado por el trigger');
      const { data: existingProfile, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();
      
      if (checkError) {
        logger.warn(LogModule.DB, 'Error verificando perfil existente', checkError);
      }
      
      // 5. Si no existe el perfil, crearlo manualmente (RLS está desactivado)
      if (!existingProfile) {
        logger.info(LogModule.DB, 'Perfil no encontrado, creando manualmente');
        
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
          if (profileError.code === '23505') {
            logger.info(LogModule.DB, 'Perfil ya existía (creado por trigger)');
          } else {
            logger.warn(LogModule.DB, 'Error no crítico al crear perfil', profileError);
          }
        } else {
          logger.success(LogModule.DB, 'Perfil creado exitosamente', newProfile);
        }
      } else {
        logger.info(LogModule.DB, 'Perfil encontrado (creado por trigger)', existingProfile);
        
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

      logger.end(LogModule.AUTH, 'Registro completado exitosamente');
      return { user: authData.user, session: authData.session };
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error fatal en signUp', error);
      throw error;
    }
  }

  /**
   * Iniciar sesión
   */
  static async signIn(email: string, password: string) {
    try {
      logger.start(LogModule.AUTH, 'Iniciando sesión', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error(LogModule.AUTH, 'Error al iniciar sesión', error);
        throw error;
      }

      logger.success(LogModule.AUTH, 'Sesión iniciada exitosamente', {
        userId: data.user?.id,
        email: data.user?.email
      });
      
      return { user: data.user, session: data.session };
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error fatal en signIn', error);
      throw error;
    }
  }

  /**
   * Cerrar sesión
   */
  static async signOut() {
    try {
      logger.info(LogModule.AUTH, 'Cerrando sesión de usuario');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error(LogModule.AUTH, 'Error al cerrar sesión', error);
        throw error;
      }
      
      logger.success(LogModule.AUTH, 'Sesión cerrada exitosamente');
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error fatal en signOut', error);
      throw error;
    }
  }

  /**
   * Obtener sesión actual
   */
  static async getSession() {
    try {
      logger.debug(LogModule.AUTH, 'Obteniendo sesión actual');
      
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        logger.warn(LogModule.AUTH, 'Error obteniendo sesión', error);
        throw error;
      }
      
      logger.debug(LogModule.AUTH, 'Sesión obtenida', {
        hasSession: !!data.session,
        userId: data.session?.user?.id
      });
      
      return data.session;
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error obteniendo sesión', error);
      return null;
    }
  }

  /**
   * Obtener usuario actual
   */
  static async getCurrentUser() {
    try {
      logger.debug(LogModule.AUTH, 'Obteniendo usuario actual');
      
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        logger.warn(LogModule.AUTH, 'Error obteniendo usuario', error);
        throw error;
      }
      
      logger.debug(LogModule.AUTH, 'Usuario obtenido', {
        userId: user?.id,
        email: user?.email
      });
      
      return user;
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error obteniendo usuario actual', error);
      return null;
    }
  }

  /**
   * Obtener perfil del usuario desde la tabla users
   */
  static async getUserProfile(userId: string): Promise<User | null> {
    try {
      logger.database(LogModule.DB, 'Obteniendo perfil de usuario', { userId });
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo perfil de usuario', error);
        throw error;
      }
      
      logger.success(LogModule.DB, 'Perfil obtenido exitosamente', data);
      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error obteniendo perfil', error);
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