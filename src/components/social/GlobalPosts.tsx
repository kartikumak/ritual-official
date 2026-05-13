'use client';

import React, { useState, useEffect } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Heart, RefreshCw, Send, Trash2, Mic, Image as ImageIcon, Search, Bell, Edit3, Settings2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn, getInitials } from '@/src/lib/utils';
import Link from 'next/link';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  metrics?: {
    likes: number;
    comments: number;
    hasLiked: boolean;
  };
}

export default function GlobalPosts({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState('Recent');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = getSupabase();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data: postsData, error } = await supabase
      .from('learning_posts')
      .select('*, profiles(username, display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .range(0, 19);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (postsData) {
      const formattedPosts = postsData.map(p => ({
        ...p,
        metrics: {
          likes: 0,
          comments: 0,
          hasLiked: false
        }
      })) as Post[];
      setPosts(formattedPosts);
    }
    setLoading(false);
  };

  const loadMore = async () => {
    const currentLength = posts.length;
    const { data: postsData, error } = await supabase
      .from('learning_posts')
      .select('*, profiles(username, display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .range(currentLength, currentLength + 19);

    if (postsData && postsData.length > 0) {
       const formattedPosts = postsData.map(p => ({
        ...p,
        metrics: {
          likes: 0,
          comments: 0,
          hasLiked: false
        }
      })) as Post[];
      setPosts(prev => [...prev, ...formattedPosts]);
    }
  };

  const handlePost = async () => {
    if (!newPostContent.trim()) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('learning_posts').insert({
      user_id: userId,
      content: newPostContent
    });
    if (!error) {
      setNewPostContent('');
      fetchPosts();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('learning_posts').delete().eq('id', id);
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24">
      {/* Moments Top Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md pb-2 pt-2 mb-2 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center flex-1 bg-secondary rounded-full px-4 py-2 opacity-80 border-border border">
            <Search size={18} className="text-muted mr-2" />
            <input type="text" placeholder="Search Moments" className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted" />
          </div>
          <button className="relative p-2 text-muted hover:text-foreground transition-colors">
            <Bell size={24} />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-background"></span>
          </button>
          <button className="p-2 text-muted hover:text-foreground transition-colors">
            <Edit3 size={24} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-2">
          {['Recent', 'For You', 'Help', 'Nearby', 'Search'].map((tab) => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={cn(
                 "text-[15px] font-bold whitespace-nowrap pb-2 border-b-[3px] transition-all -mb-2",
                 activeTab === tab ? "text-foreground border-foreground" : "text-muted border-transparent"
               )}
             >
               {tab}
             </button>
          ))}
          <div className="flex-1" />
          <button className="text-muted hover:text-foreground pb-2 -mb-2">
            <Settings2 size={20} />
          </button>
        </div>
      </div>

      {/* Create Post */}
      <div className="bg-card w-full animate-in fade-in slide-in-from-bottom-2 p-4 rounded-[28px] border border-border shadow-sm">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-primary-lighter text-primary flex items-center justify-center font-bold shrink-0">
             U
          </div>
          <div className="flex-1 space-y-2 pt-1">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Share a learning moment, audio, or picture..."
              className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm placeholder:text-muted outline-none min-h-[40px]"
              rows={newPostContent ? 3 : 1}
            />
            <div className="flex items-center justify-between border-t border-border/50 pt-2 w-full">
              <div className="flex items-center gap-1 text-muted">
                <button className="p-2 hover:text-primary transition-colors rounded-full hover:bg-primary/5" title="Add Image">
                  <ImageIcon size={18} />
                </button>
                <button className="p-2 hover:text-primary transition-colors rounded-full hover:bg-primary/5" title="Add Voice Recording">
                  <Mic size={18} />
                </button>
              </div>
              <button 
                onClick={handlePost}
                disabled={!newPostContent.trim() || isSubmitting}
                className="bg-primary text-white hover:bg-primary-light px-5 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50 disabled:grayscale shadow-sm flex items-center gap-2"
              >
                Post <Send size={12} className="-mt-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <RefreshCw className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted-bg/50 rounded-3xl border border-dashed border-border">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No insights shared yet. Be the first!</p>
            </div>
          ) : (
             <AnimatePresence>
               {posts.map(post => (
                 <motion.div 
                   key={post.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="bg-card p-5 rounded-[24px] border border-border/50 hover:border-border transition-all shadow-sm"
                 >
                   <div className="flex items-start gap-4">
                     <Link href={`/profile/${post.user_id}`}>
                       <div className="w-12 h-12 rounded-full bg-secondary text-muted flex items-center justify-center font-bold text-sm shrink-0 cursor-pointer overflow-hidden relative shadow-inner">
                         {post.profiles?.avatar_url ? (
                           <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                         ) : (
                           getInitials(post.profiles?.display_name || post.profiles?.username || 'U')
                         )}
                       </div>
                     </Link>
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between">
                         <div className="flex items-start justify-between">
                           <div className="flex flex-col min-w-0">
                             <div className="flex items-center gap-2 truncate">
                               <Link href={`/profile/${post.user_id}`}>
                                 <span className="font-bold text-[15px] hover:underline cursor-pointer tracking-tight">
                                   {post.profiles?.display_name || post.profiles?.username || 'Explorer'}
                                 </span>
                               </Link>
                               <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black italic px-1.5 py-0.5 rounded-xl uppercase tracking-wider">VIP</span>
                             </div>
                             <div className="flex items-center gap-1.5 mt-0.5">
                               <div className="flex items-center text-[10px] font-bold text-muted uppercase tracking-wider">
                                 <span className="text-primary border-b-[1.5px] border-primary pb-[1px]">JP</span>
                                 <RefreshCw size={10} className="mx-1 opacity-50" />
                                 <span>EN</span>
                                 <span className="mx-1.5 opacity-30">•</span>
                                 <span>HI</span>
                               </div>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-[11px] font-medium text-muted shrink-0 mt-0.5">
                               {formatDistanceToNow(new Date(post.created_at), { addSuffix: false })} ago
                             </span>
                             {post.user_id === userId && (
                               <button 
                                 onClick={() => handleDelete(post.id)}
                                 className="text-muted hover:text-rose-500 transition-colors p-2 -mr-2 rounded-full hover:bg-rose-50"
                               >
                                 <Trash2 size={16} />
                               </button>
                             )}
                           </div>
                         </div>
                       </div>
                       
                       <div className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90 font-medium">
                         {post.content}
                       </div>

                       <div className="mt-4 flex items-center justify-between text-muted border-t border-border/50 pt-3">
                         <button className={cn("flex items-center gap-2 hover:text-primary transition-colors group", post.metrics?.hasLiked && "text-primary")}>
                           <div className="p-1 rounded-full text-muted group-hover:text-primary transition-colors">
                             <Heart size={20} className={cn(post.metrics?.hasLiked && "fill-primary")} />
                           </div>
                           {post.metrics?.likes && post.metrics.likes > 0 ? <span className="text-sm font-bold">{post.metrics?.likes}</span> : null}
                         </button>
                         <button className="flex items-center gap-2 hover:text-primary transition-colors group">
                           <div className="p-1 rounded-full text-muted group-hover:text-primary transition-colors">
                             <MessageSquare size={20} />
                           </div>
                           {post.metrics?.comments && post.metrics.comments > 0 ? <span className="text-sm font-bold">{post.metrics?.comments}</span> : null}
                         </button>
                         <button className="flex items-center gap-2 hover:text-primary transition-colors group">
                           <div className="p-1 rounded-full text-muted group-hover:text-primary transition-colors flex items-center gap-1 font-bold text-xs uppercase tracking-wider">
                             <span>A</span>
                             <RefreshCw size={14} />
                             <span>文</span>
                           </div>
                         </button>
                         <button className="flex items-center gap-2 hover:text-primary transition-colors group">
                           <div className="p-1 rounded-full text-muted group-hover:text-primary transition-colors">
                             <Send size={20} />
                           </div>
                         </button>
                       </div>
                     </div>
                   </div>
                 </motion.div>
               ))}
               
               {posts.length >= 20 && (
                 <div className="pt-4 flex justify-center">
                   <button 
                     onClick={loadMore}
                     className="btn-outline px-6 py-2 rounded-full text-xs font-bold text-muted hover:text-foreground transition-colors"
                   >
                     Load Previous Insights
                   </button>
                 </div>
               )}
             </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
