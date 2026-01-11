import { ThemeProvider as NextThemesProvider } from "next-themes";
import type React from "react";
import type { FC } from "react";
import { Toaster } from "@/components/ui/sonner";

export const Providers: FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster />
    </NextThemesProvider>
  );
};
