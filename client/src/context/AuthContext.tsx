import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import type { User } from '../types';

interface AuthContextValue {
  dbUser: User | null;
  loading: boolean;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  dbUser: null,
  loading: true,
  refetchUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function syncUser() {
    if (!clerkUser) return;
    try {
      const token = await getToken();
      // Make Clerk token available to axios interceptor
      // @ts-ignore
      if (!window.__clerk) window.__clerk = {};
      // @ts-ignore
      window.__clerk.session = { getToken: async () => token };

      const { data } = await api.post('/api/auth/sync', {
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        name: clerkUser.fullName,
        avatar: clerkUser.imageUrl,
      });
      setDbUser(data.user);

      // Connect socket
      getSocket(clerkUser.id);
    } catch (err) {
      console.error('Failed to sync user', err);
    }
  }

  async function refetchUser() {
    try {
      const { data } = await api.get('/api/users/me');
      setDbUser(data.user);
    } catch (err) {
      console.error('Failed to refetch user', err);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) { setLoading(false); return; }
    syncUser().finally(() => setLoading(false));
  }, [isLoaded, clerkUser?.id]);

  return (
    <AuthContext.Provider value={{ dbUser, loading, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAppAuth() {
  return useContext(AuthContext);
}
