import type { Metadata } from "next";
import AuthSessionProvider from "./components/session-provider";
import { ThemeProvider } from "./components/theme-provider";
import AppNav from "./components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jopler",
  description: "Job parser, market analysis & interview training",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthSessionProvider>
            <AppNav />
            {children}
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
