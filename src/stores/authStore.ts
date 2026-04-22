import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { getSession, onAuthChange, signOut } from '@/services/auth';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialize: () => Promise<() => void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  initialize: async () => {
    const session = await getSession();
    set({ session, user: session?.user ?? null, loading: false });
    return onAuthChange((s) => set({ session: s, user: s?.user ?? null }));
  },
  logout: async () => {
    await signOut();
    set({ session: null, user: null });
  },
}));
