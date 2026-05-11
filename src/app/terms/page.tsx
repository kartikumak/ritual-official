'use client';

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-serif font-bold">Terms of Service</h1>
      </header>

      <div className="px-6 prose prose-sm max-w-none text-muted-foreground leading-relaxed">
        <p className="text-xs font-bold text-foreground">Agreement to Terms</p>
        
        <h3 className="text-foreground font-bold mt-6">1. Acceptance</h3>
        <p>
          By accessing or using Rituals, you agree to be bound by these Terms of Service. If you do not agree, please do not use the application.
        </p>

        <h3 className="text-foreground font-bold mt-6">2. Use of Service</h3>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials. You agree to use the service only for lawful purposes and in accordance with these terms.
        </p>

        <h3 className="text-foreground font-bold mt-6">3. Content</h3>
        <p>
          You retain all rights to the data and concepts you input into Rituals. However, you grant us a license to store and process this data as necessary to provide the service.
        </p>

        <h3 className="text-foreground font-bold mt-6">4. Termination</h3>
        <p>
          We reserve the right to suspend or terminate your account if you violate these terms or engage in behavior that harms the service or other users.
        </p>

        <h3 className="text-foreground font-bold mt-6">5. Limitation of Liability</h3>
        <p>
          Rituals is provided "as is". We make no warranties regarding the accuracy or availability of the service. We shall not be liable for any indirect or consequential damages.
        </p>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-[10px] uppercase tracking-widest font-bold">Respect the rhythm of the ritual.</p>
        </div>
      </div>
    </div>
  );
}
