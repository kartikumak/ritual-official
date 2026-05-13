'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import { 
  Send, 
  Trash2, 
  Reply, 
  MessageCircle, 
  Circle,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/src/lib/utils';

interface Message {
  id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  created_at: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

export default function GlobalChat({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabase();

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, profiles(name, avatar_url)')
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (!error && data) {
      setMessages(data as any);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        content: content.trim(),
        reply_to_id: replyTo?.id || null
      });

    if (!error) {
      setContent('');
      setReplyTo(null);
    }
  };

  const deleteMessage = async (id: string) => {
    await supabase.from('chat_messages').delete().eq('id', id);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-card rounded-3xl border border-border overflow-hidden shadow-xl">
      <div className="p-4 border-b border-border bg-muted-bg/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <MessageCircle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold">Global Neural Hub</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Circle size={8} className="fill-emerald-500 text-emerald-500 animate-pulse" />
              Collective Consciousness
            </p>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-[radial-gradient(circle_at_top_right,var(--color-primary-lighter),transparent_40%)]"
      >
        {messages.map((msg) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex flex-col gap-1 max-w-[85%]",
              msg.user_id === userId ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            {msg.reply_to_id && (
              <div className="text-[10px] text-muted-foreground mb-1 px-2 border-l-2 border-primary/30 flex items-center gap-1">
                <Reply size={10} />
                Replying to thread...
              </div>
            )}
            
            <div className={cn(
              "p-3 rounded-2xl text-sm shadow-sm relative group",
              msg.user_id === userId 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-muted-bg text-foreground rounded-tl-none border border-border"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  msg.user_id === userId ? "text-white/70" : "text-primary"
                )}>
                  {msg.profiles?.name || 'Explorer'}
                </span>
                <span className={cn(
                  "text-[9px]",
                  msg.user_id === userId ? "text-white/50" : "text-muted-foreground"
                )}>
                  {formatDistanceToNow(new Date(msg.created_at))} ago
                </span>
              </div>
              <p className="leading-relaxed">{msg.content}</p>
              
              <div className={cn(
                "absolute top-0 opacity-0 group-hover:opacity-100 transition-all flex gap-1",
                msg.user_id === userId ? "-left-16" : "-right-16"
              )}>
                {msg.user_id === userId && (
                  <button 
                    onClick={() => deleteMessage(msg.id)}
                    className="p-1.5 bg-rose-500/10 text-rose-500 rounded-full hover:bg-rose-500/20 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                <button 
                  onClick={() => setReplyTo(msg)}
                  className="p-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-all"
                >
                  <Reply size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 border-t border-border bg-white/80 backdrop-blur-md">
        {replyTo && (
          <div className="mb-3 p-2 bg-muted-bg rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <Reply size={12} className="text-primary" />
              <p className="text-xs text-muted-foreground truncate italic">
                Replying to: {replyTo.content}
              </p>
            </div>
            <button 
              onClick={() => setReplyTo(null)}
              className="text-[10px] font-bold text-muted-foreground hover:text-rose-500 uppercase px-2"
            >
              Cancel
            </button>
          </div>
        )}
        <form onSubmit={sendMessage} className="flex gap-2">
          <input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Broadcast a thought..."
            className="flex-1 bg-muted-bg border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button 
            type="submit" 
            disabled={!content.trim()}
            className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-light transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
