import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../database/db";
interface AuthContextType {
  isAuthenticated: boolean | null;
  setIsAuthenticated: (authStatus: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const authData = await db.auth.get(1);
      setIsAuthenticated(authData?.isAuthenticated || false);
    };

    checkAuth();
  }, []);

  const updateAuthStatus = async (authStatus: boolean) => {
    setIsAuthenticated(authStatus);
    await db.auth.put({ id: 1, isAuthenticated: authStatus });
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated: updateAuthStatus }}
    >
      {children}
    </AuthContext.Provider>
  );
};
