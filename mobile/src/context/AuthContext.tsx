import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { User } from "../api/types";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "../config";

interface AuthContextType {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadPersistedAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_STORAGE_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.warn("Failed to load persisted credentials:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPersistedAuth();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    try {
      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, newToken);
      await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } catch (err) {
      console.error("Failed to store credentials:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
      await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
      setToken(null);
      setUser(null);
    } catch (err) {
      console.error("Failed to delete credentials:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
