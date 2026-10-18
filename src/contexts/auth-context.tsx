"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export type Role = "ADMIN" | "STAFF" | "STUDENT";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: Role;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearMustChangePassword: () => void;
}

interface SignupData {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setMustChangePassword(data.user?.mustChangePassword || false);
      } else {
        setUser(null);
        setMustChangePassword(false);
      }
    } catch {
      setUser(null);
      setMustChangePassword(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    setUser(data.user);
    setMustChangePassword(data.user.mustChangePassword || false);

    // If user must change password, don't redirect - the modal will show
    if (data.user.mustChangePassword) {
      return;
    }

    // Redirect based on role
    switch (data.user.role) {
      case "ADMIN":
        router.push("/admin");
        break;
      case "STAFF":
        router.push("/staff");
        break;
      case "STUDENT":
        router.push("/student");
        break;
      default:
        router.push("/dashboard");
    }
  };

  const signup = async (signupData: SignupData) => {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupData),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Signup failed");
    }

    setUser(data.user);
    router.push("/student");
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setMustChangePassword(false);
      router.push("/login");
    }
  };

  const clearMustChangePassword = () => {
    setMustChangePassword(false);
    if (user) {
      setUser({ ...user, mustChangePassword: false });
      // Redirect to appropriate dashboard after password change
      switch (user.role) {
        case "ADMIN":
          router.push("/admin");
          break;
        case "STAFF":
          router.push("/staff");
          break;
        case "STUDENT":
          router.push("/student");
          break;
        default:
          router.push("/");
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        mustChangePassword,
        login,
        signup,
        logout,
        refreshUser,
        clearMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Role-based hooks
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
}

export function useRequireRole(allowedRoles: Role[]) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard
      switch (user.role) {
        case "ADMIN":
          router.push("/admin");
          break;
        case "STAFF":
          router.push("/staff");
          break;
        case "STUDENT":
          router.push("/student");
          break;
        default:
          router.push("/");
      }
    }
  }, [user, isLoading, allowedRoles, router]);

  return { user, isLoading, hasAccess: user && allowedRoles.includes(user.role) };
}
