'use client';

import React, { useState } from 'react';
import GlobalPosts from './GlobalPosts';
import PrivateChats from './PrivateChats';
import { 
  MessageCircle, 
  Users, 
  MapPin,
  Sparkles,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

type NetworkTab = 'posts' | 'chats';

export default function SocialHub({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<NetworkTab>('posts');

  const tabs = [
    { id: 'posts', label: 'Global Insights', icon: Globe },
    { id: 'chats', label: 'Conversations', icon: MessageCircle },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-20 md:pb-32 px-2 md:px-0">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-8 pt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-primary/5 rounded-[18px] md:rounded-[22px] border border-primary/10">
                <Users size={24} className="text-primary" />
             </div>
             <h1 className="text-3xl md:text-5xl font-serif text-foreground tracking-tight">Community</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2 font-medium">
            <Sparkles size={16} className="text-primary-light" />
            Learn openly, study deeply.
          </p>
        </div>

        <nav className="flex items-center gap-2 bg-muted-bg/50 backdrop-blur-md p-1.5 rounded-[24px] md:rounded-full border border-border w-full sm:w-fit self-center sm:self-auto overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as NetworkTab)}
                className={cn(
                  "relative flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full transition-all flex-1 sm:flex-none",
                  isActive ? "text-primary bg-white shadow-sm ring-1 ring-border/50" : "text-muted hover:text-foreground"
                )}
              >
                <Icon size={16} className={cn(isActive && "scale-110 transition-transform")} />
                <span className="text-sm font-bold tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="relative min-h-[50vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'posts' && (
              <GlobalPosts userId={userId} />
            )}
            {activeTab === 'chats' && (
              <PrivateChats userId={userId} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
