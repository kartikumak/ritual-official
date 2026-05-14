/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/src/context/AuthContext";
import { ThemeProvider } from "@/src/components/ThemeProvider";
import { QueryProvider } from "@/src/providers/QueryProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "inLucid — Spaced Repetition Mastery",
  description: "Anchor your knowledge with spaced repetition and concept recall.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster position="bottom-center" toastOptions={{ 
                style: { background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }
              }} />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
