"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";

interface AuthState {
  userId: string | null;
  role: string | null;
  department: string | null;
  referenceId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const { userId, setUserId, setRole, setDepartment, setReferenceId } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>({
    userId: null,
    role: null,
    department: null,
    referenceId: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check localStorage for session data
        const storedUserId = localStorage.getItem("userId");
        const storedRole = localStorage.getItem("role");
        const storedDepartment = localStorage.getItem("department");
        const storedReferenceId = localStorage.getItem("referenceId");

        if (storedUserId) {
          // Restore session from localStorage
          setUserId(storedUserId);
          setRole(storedRole || null);
          setDepartment(storedDepartment || null);
          setReferenceId(storedReferenceId || null);

          setAuthState({
            userId: storedUserId,
            role: storedRole || null,
            department: storedDepartment || null,
            referenceId: storedReferenceId || null,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    checkSession();
  }, [setUserId, setRole, setDepartment, setReferenceId]);

  const login = useCallback(
    async (email: string, password: string, deviceId: string) => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Email: email, Password: password, deviceId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Login failed");
        }

        const data = await response.json();

        // Store session in localStorage
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("role", data.Role || "");
        localStorage.setItem("department", data.Department || "");
        localStorage.setItem("referenceId", data.ReferenceID || "");

        // Update context and state
        setUserId(data.userId);
        setRole(data.Role || null);
        setDepartment(data.Department || null);
        setReferenceId(data.ReferenceID || null);

        setAuthState({
          userId: data.userId,
          role: data.Role || null,
          department: data.Department || null,
          referenceId: data.ReferenceID || null,
          isLoading: false,
          isAuthenticated: true,
        });

        return { success: true, data };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Login failed";
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        return { success: false, error: errorMessage };
      }
    },
    [setUserId, setRole, setDepartment, setReferenceId]
  );

  const logout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("department");
    localStorage.removeItem("referenceId");

    // Clear context
    setUserId(null);
    setRole(null);
    setDepartment(null);
    setReferenceId(null);

    // Update state
    setAuthState({
      userId: null,
      role: null,
      department: null,
      referenceId: null,
      isLoading: false,
      isAuthenticated: false,
    });

    // Redirect to login
    router.push("/Login");
  }, [setUserId, setRole, setDepartment, setReferenceId, router]);

  return {
    ...authState,
    login,
    logout,
  };
}
