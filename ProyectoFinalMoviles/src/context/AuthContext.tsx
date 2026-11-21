import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { logoutOnServer, RegisterInput, login, getProfile, registerUser } from '@/api/auth';
import { setOnSessionExpired, setAuthToken } from '@/api/client';
import { User } from '@/types';

const TOKEN_KEY = 'token';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean; // true while checking whether there was a saved session
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (data: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const Context = createContext<AuthContextValue | null>(null);

/**
 * Stores the user session and shares it with the whole app.
 * The token is saved in AsyncStorage (in the browser it is localStorage)
 * so the session stays open when the page is reloaded.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }, []);

  /** Saves the token and requests the profile to know who the user is and whether they are an admin. */
  const startSession = useCallback(async (newToken: string) => {
    setAuthToken(newToken);
    let profile: User;
    try {
      profile = await getProfile();
    } catch (error) {
      setAuthToken(null);
      throw error;
    }
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    setUser(profile);
    setToken(newToken);
  }, []);

  // When the app opens, check whether there was a saved token and if it still works
  useEffect(() => {
    async function restoreSession() {
      try {
        const saved = await AsyncStorage.getItem(TOKEN_KEY);
        if (saved) await startSession(saved);
      } catch {
        await clearSession();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, [startSession, clearSession]);

  // If any request returns 401, the API client notifies and the session is closed
  useEffect(() => {
    setOnSessionExpired(() => {
      clearSession();
    });
    return () => setOnSessionExpired(null);
  }, [clearSession]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const { token: newToken } = await login(username, password);
      await startSession(newToken);
    },
    [startSession],
  );

  const signUp = useCallback(
    async (data: RegisterInput) => {
      const response = await registerUser(data);
      await startSession(response.token);
    },
    [startSession],
  );

  const signOut = useCallback(async () => {
    try {
      await logoutOnServer();
    } catch {
      // Aunque el servidor no responda, la sesión local se cierra igual
    }
    await clearSession();
  }, [clearSession]);

  return (
    <Context.Provider
      value={{
        token,
        user,
        isAdmin: Boolean(user?.is_staff),
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
