import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type React from "react";
import type { FC } from "react";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

export const Providers: FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </NextThemesProvider>
  );
};
