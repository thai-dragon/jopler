import type { Metadata } from "next";
import AuthSessionProvider from "./components/session-provider";
import { ThemeProvider } from "./components/theme-provider";
import AppNav from "./components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jopler",
  description: "Job parser, market analysis & interview training",
  icons: { icon: "/favicon.ico" },
};

const themeScript = `(function(){var t=localStorage.getItem("theme");document.documentElement.classList.add(t==="dark"?"dark":"light")})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
