"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/command-palette";
import { ForcePasswordChange } from "@/components/auth/force-password-change";

// Global SWR fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    throw error;
  }
  return res.json();
};

function AuthenticatedContent({ children }: { children: ReactNode }) {
  const { mustChangePassword, clearMustChangePassword, isAuthenticated } = useAuth();

  return (
    <>
      {children}
      {isAuthenticated && mustChangePassword && (
        <ForcePasswordChange
          isOpen={mustChangePassword}
          onPasswordChanged={clearMustChangePassword}
        />
      )}
    </>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: false, // Don't refetch on window focus by default
          revalidateOnReconnect: true, // Refetch when reconnecting
          dedupingInterval: 5000, // Dedupe requests within 5 seconds
          errorRetryCount: 2, // Retry failed requests twice
          keepPreviousData: true, // Show stale data while revalidating
        }}
      >
        <AuthProvider>
          <AuthenticatedContent>
            {children}
          </AuthenticatedContent>
          <CommandPalette />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </SWRConfig>
    </ThemeProvider>
  );
}
