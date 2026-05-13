'use client';

import React, { useState } from 'react';
import GlobalChat from './GlobalChat';
import VoiceRooms from './VoiceRooms';
import VoicePosts from './VoicePosts';
import { 
  MessageCircle, 
  Mic, 
  Radio, 
  Users, 
  CloudLightning,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

type SocialTab = 'chat' | 'rooms' | 'posts';

export default function SocialHub({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<SocialTab>('chat');

  const tabs = [
    { id: 'chat', label: 'Broadcast', icon: Radio, highlight: 'Global Feed' },
    { id: 'rooms', label: 'Echoes', icon: Users, highlight: 'Live Rooms' },
    { id: 'posts', label: 'Insights', icon: Mic, highlight: 'Async Voice' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-primary/10 rounded-lg">
                <CloudLightning size={20} className="text-primary" />
             </div>
             <h1 className="text-3xl font-extrabold tracking-tight font-serif">Community Pulsar</h1>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Sparkles size={14} className="text-primary-light" />
            Connecting the collective neural network
          </p>
        </div>

        <nav className="flex items-center gap-1 bg-muted-bg p-1.5 rounded-2xl border border-border shadow-inner w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SocialTab)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 px-6 py-2.5 rounded-xl transition-all",
                  isActive ? "text-primary bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} className={cn(isActive && "animate-pulse")} />
                  <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
                </div>
                {isActive && (
                  <motion.div 
                    layoutId="social-tab-indicator"
                    className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="min-h-[60vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {activeTab === 'chat' && <GlobalChat userId={userId} />}
            {activeTab === 'rooms' && <VoiceRooms userId={userId} />}
            {activeTab === 'posts' && <VoicePosts userId={userId} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
