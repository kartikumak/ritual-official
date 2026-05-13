'use client';

import React, { useState, useEffect } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Heart, RefreshCw, Send, Trash2, Mic, Image as ImageIcon } from 'lucide-react';
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
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Create Post */}
      <div className="card w-full animate-in fade-in slide-in-from-bottom-2">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-lighter text-primary flex items-center justify-center font-bold shrink-0">
             U
          </div>
          <div className="flex-1 space-y-4">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Share a learning insight, e.g. 'Today I explained photosynthesis from memory.'"
              className="w-full bg-transparent border-0 border-b border-border focus:ring-0 focus:border-primary resize-none text-sm p-2 outline-none"
              rows={2}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted">
                <button className="p-2 hover:text-primary transition-colors rounded-full hover:bg-primary/5">
                  <ImageIcon size={18} />
                </button>
                <button className="p-2 hover:text-primary transition-colors rounded-full hover:bg-primary/5">
                  <Mic size={18} />
                </button>
              </div>
              <button 
                onClick={handlePost}
                disabled={!newPostContent.trim() || isSubmitting}
                className="btn-primary btn-sm px-6 py-2 rounded-full text-xs font-bold transition-all disabled:opacity-50"
              >
                Post Insight
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
                   className="card border border-border/50 hover:border-border transition-all"
                 >
                   <div className="flex items-start gap-3">
                     <Link href={`/profile/${post.user_id}`}>
                       <div className="w-10 h-10 rounded-full bg-secondary text-muted flex items-center justify-center font-bold text-sm shrink-0 cursor-pointer overflow-hidden relative">
                         {post.profiles?.avatar_url ? (
                           <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                         ) : (
                           getInitials(post.profiles?.display_name || post.profiles?.username || 'U')
                         )}
                       </div>
                     </Link>
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5 truncate">
                           <Link href={`/profile/${post.user_id}`}>
                             <span className="font-bold text-sm hover:underline cursor-pointer">
                               {post.profiles?.display_name || post.profiles?.username || 'Explorer'}
                             </span>
                           </Link>
                           <span className="text-xs text-muted truncate">@{post.profiles?.username || 'user'}</span>
                           <span className="text-xs text-muted">·</span>
                           <span className="text-xs text-muted shrink-0">
                             {formatDistanceToNow(new Date(post.created_at), { addSuffix: false })}
                           </span>
                         </div>
                         {post.user_id === userId && (
                           <button 
                             onClick={() => handleDelete(post.id)}
                             className="text-muted hover:text-rose-500 transition-colors p-1"
                           >
                             <Trash2 size={14} />
                           </button>
                         )}
                       </div>
                       
                       <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                         {post.content}
                       </div>

                       <div className="mt-4 flex items-center gap-6 text-muted">
                         <button className="flex items-center gap-1.5 hover:text-primary transition-colors group">
                           <div className="p-1.5 rounded-full group-hover:bg-primary/10 transition-colors">
                             <MessageSquare size={16} />
                           </div>
                           <span className="text-xs font-medium">{post.metrics?.comments || 0}</span>
                         </button>
                         <button className={cn("flex items-center gap-1.5 hover:text-rose-500 transition-colors group", post.metrics?.hasLiked && "text-rose-500")}>
                           <div className="p-1.5 rounded-full group-hover:bg-rose-500/10 transition-colors">
                             <Heart size={16} className={cn(post.metrics?.hasLiked && "fill-rose-500")} />
                           </div>
                           <span className="text-xs font-medium">{post.metrics?.likes || 0}</span>
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
