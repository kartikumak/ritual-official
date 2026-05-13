'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import { 
  Play, 
  Pause, 
  Mic, 
  StopCircle, 
  Trash2, 
  Clock, 
  User,
  Volume2,
  Bookmark,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/src/lib/utils';

interface VoicePost {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  description: string | null;
  audio_url: string;
  created_at: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

export default function VoicePosts({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<VoicePost[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', topic: 'Recall', description: '' });
  
  const supabase = getSupabase();
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('voice_posts')
      .select('*, profiles(name, avatar_url)')
      .order('created_at', { ascending: false });
    if (!error && data) setPosts(data as any);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await uploadAndCreatePost(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording failed to start:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
  };

  const uploadAndCreatePost = async (blob: Blob) => {
    const fileName = `${userId}/${Date.now()}.webm`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-posts')
      .upload(fileName, blob);

    if (uploadError) return;

    const { data: { publicUrl } } = supabase.storage.from('voice-posts').getPublicUrl(fileName);

    const { error } = await supabase.from('voice_posts').insert({
      user_id: userId,
      title: newPost.title || "Quick Insight",
      topic: newPost.topic,
      description: newPost.description,
      audio_url: publicUrl
    });

    if (!error) {
      fetchPosts();
      setShowRecordModal(false);
      setNewPost({ title: '', topic: 'Recall', description: '' });
    }
  };

  const togglePlayback = (id: string, url: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingId(id);
      audioRef.current.onended = () => setPlayingId(null);
    }
  };

  const deletePost = async (id: string, url: string) => {
    const { error } = await supabase.from('voice_posts').delete().eq('id', id);
    if (!error) fetchPosts();
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-xl font-bold">Neural Insights</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Async wisdom from the collective</p>
         </div>
         <button 
           onClick={() => setShowRecordModal(true)}
           className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-glow-purple active:scale-95 transition-all"
         >
           <Mic size={24} />
         </button>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-md bg-card/60 border border-border group hover:shadow-lg transition-all"
          >
            <div className="flex gap-4">
              <button 
                onClick={() => togglePlayback(post.id, post.audio_url)}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0",
                  playingId === post.id ? "bg-rose-500 text-white animate-pulse shadow-glow-orange" : "bg-primary-lighter text-primary"
                )}
              >
                {playingId === post.id ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] items-center gap-1.5 font-bold uppercase tracking-widest text-primary flex">
                    <Volume2 size={12} />
                    {post.topic}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(post.created_at))} ago</span>
                </div>
                <h3 className="text-base font-bold truncate leading-tight mb-1">{post.title}</h3>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
                        {post.profiles?.name?.charAt(0) || 'U'}
                      </div>
                      {post.profiles?.name || 'Explorer'}
                   </div>
                </div>
              </div>
            </div>

            {post.description && (
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed italic bg-muted-bg/30 p-3 rounded-xl border border-border/50">
                "{post.description}"
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between opacity-60">
               <div className="flex gap-4">
                  <button className="flex items-center gap-1.5 text-[10px] font-bold hover:text-primary transition-colors">
                    <Bookmark size={12} /> Save
                  </button>
                  <button className="flex items-center gap-1.5 text-[10px] font-bold hover:text-primary transition-colors">
                    <Share2 size={12} /> Share
                  </button>
               </div>
               {post.user_id === userId && (
                 <button 
                  onClick={() => deletePost(post.id, post.audio_url)}
                  className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-all"
                 >
                   <Trash2 size={14} />
                 </button>
               )}
            </div>
          </motion.div>
        ))}
      </div>

      {posts.length === 0 && (
         <div className="card-lg border-dashed border-2 py-16 text-center opacity-60 bg-muted-bg/20">
            <div className="w-16 h-16 rounded-full bg-muted-bg flex items-center justify-center mx-auto mb-4 text-muted">
              <Volume2 size={32} />
            </div>
            <h3 className="text-sm font-bold mb-1">Silence of the Sages</h3>
            <p className="text-xs text-muted-foreground">Pulse your first neural insight into the cloud.</p>
         </div>
      )}

      {/* Record Modal */}
      <AnimatePresence>
        {showRecordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-border overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/10">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: isRecording ? '100%' : '0%' }}
                  transition={{ duration: 60, ease: 'linear' }}
                />
              </div>

              <h3 className="text-2xl font-bold font-serif mb-6 text-center">Neural Incantation</h3>

              <div className="space-y-4 mb-8">
                <input 
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  placeholder="Insight Title"
                  className="w-full bg-muted-bg border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <textarea 
                  value={newPost.description}
                  onChange={(e) => setNewPost({...newPost, description: e.target.value})}
                  placeholder="Optional context..."
                  className="w-full bg-muted-bg border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
                />
              </div>

              <div className="flex flex-col items-center gap-6">
                 <div className="text-3xl font-mono font-bold text-primary">
                   {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                 </div>

                 <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setShowRecordModal(false)}
                      className="p-4 rounded-full bg-muted-bg text-muted-foreground hover:text-foreground transition-all"
                    >
                      Cancel
                    </button>
                    {!isRecording ? (
                      <button 
                        onClick={startRecording}
                        className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center shadow-glow-purple shadow-xl active:scale-95 transition-all"
                      >
                        <Mic size={36} />
                      </button>
                    ) : (
                      <button 
                        onClick={stopRecording}
                        className="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center animate-pulse shadow-glow-orange shadow-xl active:scale-95 transition-all"
                      >
                        <StopCircle size={36} />
                      </button>
                    )}
                    <div className="p-4" /> {/* Spacer */}
                 </div>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] animate-pulse">
                   {isRecording ? "Capturing Frequency..." : "Ready for Transmission"}
                 </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
