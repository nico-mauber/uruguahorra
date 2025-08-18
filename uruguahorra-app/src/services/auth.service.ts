import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

type User = Database['public']['Tables']['users']['Row'];

export class AuthService {
  /**
   * Registrar nuevo usuario
   */
  static async signUp(
    email: string,
    password: string,
    metadata?: { country?: string; currency?: string }
  ) {
    try {
      logger.start(LogModule.AUTH, `Iniciando registro de nuevo usuario`, {
        email,
        metadata,
      });

      // 1. Crear cuenta en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (authError) {
        logger.error(
          LogModule.AUTH,
          'Error al crear usuario en Supabase Auth',
          authError
        );
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      logger.success(LogModule.AUTH, 'Usuario creado en Auth exitosamente', {
        userId: authData.user.id,
        email: authData.user.email,
        sessionCreated: !!authData.session,
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
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 4. El perfil se crea automáticamente por trigger
      // Esperar a que el trigger termine de procesar
      await new Promise((resolve) => setTimeout(resolve, 500));

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
        email: data.user?.email,
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
        userId: data.session?.user?.id,
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

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        logger.warn(LogModule.AUTH, 'Error obteniendo usuario', error);
        throw error;
      }

      logger.debug(LogModule.AUTH, 'Usuario obtenido', {
        userId: user?.id,
        email: user?.email,
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
      logger.info(LogModule.DB, 'Actualizando perfil de usuario', { userId });

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error actualizando perfil', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Perfil actualizado exitosamente');
      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal actualizando perfil', error);
      throw error;
    }
  }

  /**
   * Solicitar restablecimiento de contraseña
   */
  static async resetPassword(email: string) {
    try {
      logger.info(
        LogModule.AUTH,
        'Solicitando restablecimiento de contraseña',
        { email }
      );

      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        logger.error(LogModule.AUTH, 'Error en resetPassword', error);
        throw error;
      }

      logger.success(LogModule.AUTH, 'Email de restablecimiento enviado');
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error fatal en resetPassword', error);
      throw error;
    }
  }

  /**
   * Actualizar contraseña
   */
  static async updatePassword(newPassword: string) {
    try {
      logger.info(LogModule.AUTH, 'Actualizando contraseña de usuario');

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        logger.error(LogModule.AUTH, 'Error actualizando contraseña', error);
        throw error;
      }

      logger.success(LogModule.AUTH, 'Contraseña actualizada exitosamente');
    } catch (error) {
      logger.error(
        LogModule.AUTH,
        'Error fatal actualizando contraseña',
        error
      );
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
      logger.debug(LogModule.DB, 'Verificando estado premium', { userId });

      const { data, error } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.warn(LogModule.DB, 'Error verificando premium', error);
        return false;
      }

      const isPremium = !!data;
      logger.debug(LogModule.DB, 'Estado premium verificado', {
        userId,
        isPremium,
      });

      return isPremium;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal verificando premium', error);
      return false;
    }
  }
}
