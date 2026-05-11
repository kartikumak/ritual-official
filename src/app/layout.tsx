/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/src/context/AuthContext";

export const metadata: Metadata = {
  title: "Rituals — Spaced Repetition Mastery",
  description: "Anchor your knowledge with spaced repetition and concept recall.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen">
        <AuthProvider>
          <main className="max-w-md mx-auto min-h-screen bg-background border-x border-border shadow-2xl relative overflow-hidden">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
