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
      <body className="antialiased min-h-screen bg-slate-50/50 flex justify-center">
        <AuthProvider>
          <main className="w-full max-w-4xl min-h-screen bg-background md:my-8 md:rounded-[3rem] md:shadow-2xl md:border border-border relative overflow-hidden flex flex-col">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
