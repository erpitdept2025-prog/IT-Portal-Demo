"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";

import { UserProvider, useUser } from "@/contexts/UserContext";

function SessionHydrator({ children }: { children: React.ReactNode }) {
  const { userId, setUserId, setRole, setDepartment, setReferenceId } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrating, setIsHydrating] = useState(true);

  // Register service worker for PWA offline support
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          console.log("Service Worker registration failed:", error);
        });
    }
  }, []);

  useEffect(() => {
    const hydrateSession = () => {
      try {
        // Check for existing session in localStorage
        const storedUserId = localStorage.getItem("userId");
        const storedRole = localStorage.getItem("role");
        const storedDepartment = localStorage.getItem("department");
        const storedReferenceId = localStorage.getItem("referenceId");

        if (storedUserId && !userId) {
          // Auto-login by restoring session from localStorage
          setUserId(storedUserId);
          setRole(storedRole || null);
          setDepartment(storedDepartment || null);
          setReferenceId(storedReferenceId || null);

          // If on login page, redirect to dashboard
          if (pathname === "/Login") {
            router.push("/dashboard");
          }
        }
      } catch (error) {
        console.error("Error hydrating session:", error);
      } finally {
        setIsHydrating(false);
      }
    };

    hydrateSession();
  }, [userId, pathname, setUserId, setRole, setDepartment, setReferenceId, router]);

  if (isHydrating && pathname !== "/Login") {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="w-12 h-12 border-3 border-cyan-400 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-slate-400 text-sm font-medium">Initializing session...</p>
        </motion.div>
      </div>
    );
  }

  return children;
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { userId } = useUser();

  return (
    <>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SessionHydrator>
          <Suspense fallback={null}>
            {userId && (
              <>
              </>
            )}
          </Suspense>
          <Analytics />
          {children}
        </SessionHydrator>
      </ThemeProvider>
      <Toaster />
    </>
  );
}

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <LayoutContent>{children}</LayoutContent>
    </UserProvider>
  );
}
