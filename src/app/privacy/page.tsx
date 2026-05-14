'use client';

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-serif font-bold">Privacy Policy</h1>
      </header>

      <div className="px-6 prose prose-sm max-w-none text-muted-foreground leading-relaxed">
        <p className="text-xs font-bold text-foreground">Last Updated: May 2026</p>
        
        <h3 className="text-foreground font-bold mt-6">1. Data Collection</h3>
        <p>
          We collect personal information that you provide to us, such as your name and email address when you create an account. This information is used solely to provide and improve the inLucid experience.
        </p>

        <h3 className="text-foreground font-bold mt-6">2. Usage Data</h3>
        <p>
          We store your learning progress, decks, and review history to provide the core services of the application. This data is private to your account and is never shared with third parties for marketing purposes.
        </p>

        <h3 className="text-foreground font-bold mt-6">3. Security</h3>
        <p>
          We use industry-standard security measures provided by Supabase to protect your data. However, no method of transmission over the internet is 100% secure.
        </p>

        <h3 className="text-foreground font-bold mt-6">4. Your Rights</h3>
        <p>
          You have the right to access, correct, or delete your personal data at any time. You can contact us for any data-related requests.
        </p>

        <h3 className="text-foreground font-bold mt-6">5. Changes</h3>
        <p>
          We may update this policy from time to time. We will notify you of any major changes by updating the "Last Updated" date at the top of this policy.
        </p>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold">Privacy is a primary ritual.</p>
        </div>
      </div>
    </div>
  );
}
