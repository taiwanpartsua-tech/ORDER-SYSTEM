import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { logAction } from '../utils/auditLog';

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, inviteCode: string) => Promise<void>;
  signOut: () => Promise<void>;
  isSuper: boolean;
  isSupplier: boolean;
  isCustomer: boolean;
  isAdmin: boolean;
  isApproved: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUserProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    setProfile(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Check user status
    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('status, is_active')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile?.status === 'blocked') {
        await supabase.auth.signOut();
        throw new Error('Ваш аккаунт заблоковано. Зв\'яжіться з адміністратором.');
      }

      if (profile?.status === 'pending') {
        await supabase.auth.signOut();
        throw new Error('Ваш аккаунт очікує підтвердження адміністратора.');
      }

      if (!profile?.is_active) {
        await supabase.auth.signOut();
        throw new Error('Ваш аккаунт деактивовано.');
      }
    }

    await logAction('login');
  }

  async function signUp(email: string, password: string, fullName: string, inviteCode: string) {
    // Verify invite code
    const { data: invite, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (inviteError || !invite) {
      throw new Error('Невірний або прострочений інвайт-код.');
    }

    // Create user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          invite_code: inviteCode,
          invited_by: invite.created_by
        }
      }
    });

    if (error) throw error;

    // Mark invite code as used
    if (data.user) {
      await supabase
        .from('invite_codes')
        .update({
          is_used: true,
          used_by: data.user.id
        })
        .eq('id', invite.id);
    }
  }

  async function signOut() {
    await logAction('logout');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  const isSuper = profile?.role === 'super_admin';
  const isSupplier = profile?.role === 'supplier';
  const isCustomer = profile?.role === 'customer';
  const isAdmin = profile?.is_admin === true;
  const isApproved = profile?.status === 'approved';

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      isSuper,
      isSupplier,
      isCustomer,
      isAdmin,
      isApproved
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
