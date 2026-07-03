import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import { useUIStore } from './useUIStore';
import type { UserRow } from '@/types/database';

/**
 * Auth store. Fuente: docs/architecture/state-management §2.1,
 * docs/api/contracts-and-data-mapping §1.
 * En esta fase (01) se implementa la inicialización de sesión, onAuthStateChange
 * y signOut. signUp/signIn se implementan en Fase 02 (features/auth).
 */
type AuthUser = Session['user'];

interface AuthState {
  user: AuthUser | null;
  profile: UserRow | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPremium: boolean;

  initialize: () => Promise<void>;
  loadProfile: (userId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
}

let authSubscribed = false;

const PROFILE_DEFAULTS = {
  country: 'UY',
  currency: 'UYU',
  premium: false,
  total_xp: 0,
  current_level: 1,
  current_streak: 0,
  longest_streak: 0,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  isPremium: false,

  initialize: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        set({ user: session.user, isAuthenticated: true });
        await get().loadProfile(session.user.id);
      }
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error inicializando sesión', error);
    } finally {
      set({ isLoading: false });
    }

    // Suscripción única a cambios de auth.
    if (!authSubscribed) {
      authSubscribed = true;
      supabase.auth.onAuthStateChange((event, session) => {
        logger.info(LogModule.AUTH, `Auth state: ${event}`);
        if (event === 'SIGNED_IN' && session?.user) {
          // No recargar perfil aquí (se maneja en signIn/signUp — Fase 02).
          set({ user: session.user, isAuthenticated: true });
        } else if (event === 'SIGNED_OUT') {
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isPremium: false,
          });
        }
        // TOKEN_REFRESHED: no-op.
      });
    }
  },

  loadProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const profileRow = data as UserRow | null;
      if (profileRow) {
        set({ profile: profileRow, isPremium: profileRow.premium === true });
        return;
      }
      if (error) {
        logger.warn(LogModule.AUTH, 'Perfil no encontrado, creando…', error);
      }

      // Fallback 1: INSERT directo con defaults.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email ?? '';
      const nowIso = new Date().toISOString();

      const { data: inserted, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          ...PROFILE_DEFAULTS,
          last_activity_at: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select()
        .single();

      const insertedRow = inserted as UserRow | null;
      if (insertedRow) {
        set({ profile: insertedRow, isPremium: insertedRow.premium === true });
        return;
      }
      logger.warn(LogModule.AUTH, 'Insert de perfil falló, probando RPC', insertError);

      // Fallback 2: RPC get_or_create_user_profile.
      const { data: rpcProfile } = await supabase.rpc(
        'get_or_create_user_profile',
        { p_user_id: userId }
      );
      if (rpcProfile) {
        const p = rpcProfile as unknown as UserRow;
        set({ profile: p, isPremium: p.premium === true });
      }
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error cargando perfil', error);
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (user) await get().loadProfile(user.id);
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error en signOut', error);
    }
    // Limpiar estado. (IndexedDB/caches: se limpiarán en Fase 11.)
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isPremium: false,
    });
    useUIStore.setState({ toasts: [] });
  },

  // Registro. Contrato §1: signUp con metadata país/moneda; auto sign-in (Confirm
  // email OFF). Si identities.length === 0 el email ya existía → intentar login.
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { country: 'UY', currency: 'UYU' } },
    });

    if (error) {
      logger.error(LogModule.AUTH, 'Error en signUp', error);
      throw error;
    }

    // Email ya registrado: Supabase devuelve user sin identities.
    if (data.user && data.user.identities?.length === 0) {
      return get().signIn(email, password);
    }

    if (data.session?.user) {
      set({ user: data.session.user, isAuthenticated: true });
      // El trigger on_auth_user_created crea users + user_streaks; dar margen.
      await new Promise((r) => setTimeout(r, 1000));
      await get().loadProfile(data.session.user.id);
      return true;
    }

    // Sin sesión (p.ej. si se reactiva confirmación de email en el proyecto).
    return false;
  },

  // Login. Contrato §1: signInWithPassword.
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error(LogModule.AUTH, 'Error en signIn', error);
      throw error;
    }

    if (data.session?.user) {
      set({ user: data.session.user, isAuthenticated: true });
      await get().loadProfile(data.session.user.id);
      return true;
    }
    return false;
  },
}));
