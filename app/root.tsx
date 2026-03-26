"use client";

import React, { Suspense } from "react";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SidebarProvider } from "@/components/ui/sidebar";

// Popups
import { UserProvider } from "@/contexts/UserContext";
import { FormatProvider } from "@/contexts/FormatContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SidebarProvider>
          <Suspense fallback={null}>
            <Analytics />
            {children}
          </Suspense>
        </SidebarProvider>
      </ThemeProvider>
      <Toaster />
    </>
  );
}

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <FormatProvider>
        <LayoutContent>{children}</LayoutContent>
      </FormatProvider>
    </UserProvider>
  );
}
