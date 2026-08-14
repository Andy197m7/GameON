import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser, useAuth } from '@clerk/react';
import api, { setTokenGetter } from '../lib/api';
import { getSocket } from '../lib/socket';
import { posthog } from '../lib/posthog';
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
      // clerkId is no longer sent from the client — the server derives it
      // from the verified Bearer token attached by the api.ts interceptor.
      const { data } = await api.post('/api/auth/sync', {
        email: clerkUser.primaryEmailAddress?.emailAddress,
        name: clerkUser.fullName,
        avatar: clerkUser.imageUrl,
      });
      setDbUser(data.user);

      // Identify this person to PostHog using their Clerk id — the server
      // uses clerkId as the distinctId for its own track() calls too (see
      // server/routes/matches.js etc.), so client and server events land
      // on the same timeline for a given user.
      posthog.identify(data.user.clerkId, {
        email: data.user.email,
        name: data.user.name,
      });

      // Connect socket, handing it the same live token getter
      getSocket(() => getToken());
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
    // Make Clerk's token getter available to the axios interceptor as soon
    // as this provider mounts (not just after the first sync call).
    setTokenGetter(() => getToken());
  }, [getToken]);

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
