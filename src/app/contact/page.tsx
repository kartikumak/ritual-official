'use client';

import { ChevronLeft, Mail, Twitter, Github, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ContactPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const handleSend = () => {
    window.location.href = `mailto:support@inlucid.app?body=${encodeURIComponent(message)}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-serif font-bold">Contact Support</h1>
      </header>

      <div className="px-6 space-y-10">
        <section>
          <div className="p-6 rounded-3xl bg-primary text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Mail size={64} /></div>
             <h2 className="text-xl font-serif font-bold mb-2">How can we help?</h2>
             <p className="text-xs text-white/70 leading-relaxed max-w-[200px]">
               Technical issues, feature requests, or just a deep thought about learning? We're listening.
             </p>
          </div>
        </section>

        <section className="space-y-4">
           <div className="text-left">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1.5 block">Your Message</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full h-40 bg-muted/5 border border-border rounded-2xl p-5 text-sm focus:border-primary outline-none resize-none leading-relaxed transition-all" 
                placeholder="Type your message here..." 
              />
           </div>
           <button 
             onClick={handleSend}
             className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3"
           >
              <Send size={18} />
              Send via Email
           </button>
        </section>

        <section className="pt-8 border-t border-border">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">Global Presence</h3>
          <div className="flex justify-center gap-8 text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors"><Twitter size={20} /></a>
            <a href="#" className="hover:text-primary transition-colors"><Github size={20} /></a>
            <a href="#" className="hover:text-primary transition-colors"><Mail size={20} /></a>
          </div>
        </section>

        <footer className="text-center pt-8">
          <p className="text-[10px] text-muted-foreground italic">inLucid — Engineering Depth Since 2026</p>
        </footer>
      </div>
    </div>
  );
}
