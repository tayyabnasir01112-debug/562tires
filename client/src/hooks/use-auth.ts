import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export interface User {
  id: number;
  username: string;
  role: "admin" | "employee";
}

export function useAuth() {
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Don't redirect here - let the component handle it
          return null;
        }
        throw new Error("Unauthorized");
      }

      return response.json();
    },
  });

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLocation("/login");
      window.location.reload(); // Clear any cached state
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isEmployee: user?.role === "employee",
    logout,
  };
}

