'use client';

import React, { useState, useEffect } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import { 
  Mic, 
  MicOff, 
  Users, 
  PhoneOff, 
  Plus, 
  Headphones,
  Circle,
  Hash,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface Room {
  id: string;
  creator_id: string;
  title: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

interface Participant {
  id: string;
  room_id: string;
  user_id: string;
  is_muted: boolean;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

export default function VoiceRooms({ userId }: { userId: string }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('Recall');

  const supabase = getSupabase();

  const categories = ['Recall', 'Debate', 'Lectures', 'Meditation'];

  useEffect(() => {
    fetchRooms();
    const channel = supabase
      .channel('public:recall_rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recall_rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (activeRoom) {
      fetchParticipants(activeRoom.id);
      const participantChannel = supabase
        .channel(`room_participants:${activeRoom.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'room_participants', 
          filter: `room_id=eq.${activeRoom.id}` 
        }, () => {
          fetchParticipants(activeRoom.id);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(participantChannel);
      };
    }
  }, [activeRoom]);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('recall_rooms')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (!error && data) setRooms(data);
  };

  const fetchParticipants = async (roomId: string) => {
    const { data, error } = await supabase
      .from('room_participants')
      .select('*, profiles(name, avatar_url)')
      .eq('room_id', roomId);
    if (!error && data) setParticipants(data as any);
  };

  const createRoom = async () => {
    if (!newRoomTitle.trim()) return;
    const { data, error } = await supabase
      .from('recall_rooms')
      .insert({
        creator_id: userId,
        title: newRoomTitle.trim(),
        category: newRoomCategory
      })
      .select()
      .single();

    if (!error && data) {
      joinRoom(data);
      setShowCreateModal(false);
      setNewRoomTitle('');
    }
  };

  const joinRoom = async (room: Room) => {
    setActiveRoom(room);
    await supabase.from('room_participants').upsert({
      room_id: room.id,
      user_id: userId,
      is_muted: false
    });
  };

  const leaveRoom = async () => {
    if (activeRoom) {
      await supabase.from('room_participants').delete().eq('room_id', activeRoom.id).eq('user_id', userId);
      setActiveRoom(null);
    }
  };

  const toggleMute = async () => {
    if (activeRoom) {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      await supabase.from('room_participants').update({ is_muted: nextMuted }).eq('room_id', activeRoom.id).eq('user_id', userId);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Neural Echoes</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Join a collective review</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary rounded-full px-5 py-2 text-xs font-bold flex items-center gap-2"
        >
          <Plus size={14} />
          Pulse Room
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map((room) => (
          <motion.div 
            key={room.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-md bg-card/50 border border-border hover:border-primary/50 transition-all cursor-pointer group"
            onClick={() => joinRoom(room)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="badge-primary px-2 py-0.5 text-[9px] uppercase tracking-wider">{room.category}</div>
                  <span className="text-[10px] text-muted-foreground">{new Date(room.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{room.title}</h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Mic size={20} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-muted-bg border-2 border-background flex items-center justify-center text-[8px] font-bold">
                    UN
                  </div>
                ))}
                <div className="w-7 h-7 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[8px] font-bold text-primary">
                  +12
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                Explore <ChevronRight size={14} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {rooms.length === 0 && (
         <div className="card-lg border-dashed border-2 py-16 text-center opacity-60">
            <Headphones size={48} className="mx-auto mb-4 text-muted" />
            <p className="text-sm font-medium">The collective is currently silent...</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-bold text-primary mt-2 uppercase tracking-widest"
            >
              Initialize First ECHO
            </button>
         </div>
      )}

      {/* Active Room View */}
      <AnimatePresence>
        {activeRoom && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-[72px] z-50 bg-background border-t border-border shadow-[0_-20px_40px_rgba(0,0,0,0.1)] rounded-t-[40px] px-6 py-8"
          >
            <div className="max-w-4xl mx-auto flex flex-col h-full">
              <header className="flex items-center justify-between mb-8">
                <div>
                   <div className="flex items-center gap-2 mb-2">
                     <span className="badge-primary px-3 py-1 font-bold text-[10px] uppercase">{activeRoom.category}</span>
                     <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-bold animate-pulse">
                       <Circle size={8} className="fill-rose-500" />
                       LIVE SYNC
                     </div>
                   </div>
                   <h2 className="text-2xl font-bold font-serif">{activeRoom.title}</h2>
                </div>
                <button 
                  onClick={leaveRoom}
                  className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center hover:bg-rose-600 shadow-lg shadow-rose-500/30 transition-all active:scale-95"
                >
                  <PhoneOff size={24} />
                </button>
              </header>

              <div className="flex-1 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 overflow-y-auto max-h-[40vh] py-4 scrollbar-hide">
                {participants.map((p) => (
                  <div key={p.id} className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "relative w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg transition-all",
                      p.user_id === userId ? "bg-primary text-white shadow-glow-purple" : "bg-muted-bg text-foreground",
                      !p.is_muted && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
                    )}>
                      {p.profiles?.name?.charAt(0) || 'U'}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-background rounded-lg border border-border flex items-center justify-center">
                        {p.is_muted ? <MicOff size={10} className="text-muted-foreground" /> : <Mic size={10} className="text-emerald-500" />}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-center truncate w-full">{p.user_id === userId ? "Me" : p.profiles?.name}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-center gap-6 border-t border-border/50 pt-8">
                <button 
                  onClick={toggleMute}
                  className={cn(
                    "w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-xl active:scale-95",
                    isMuted ? "bg-muted-bg text-muted-foreground" : "bg-primary text-white shadow-glow-purple"
                  )}
                >
                  {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
                <div className="flex flex-col items-center">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Participants</span>
                   <div className="flex items-center gap-2 font-bold text-xl">
                      <Users size={20} className="text-primary" />
                      {participants.length}
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-border"
            >
              <h3 className="text-2xl font-bold font-serif mb-6">Initialize Echo</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Room Title</label>
                  <input 
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    placeholder="e.g. Master Class: Ancient Philosophy"
                    className="w-full bg-muted-bg border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Collective Focus</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((c) => (
                      <button 
                        key={c}
                        onClick={() => setNewRoomCategory(c)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[11px] font-bold border transition-all",
                          newRoomCategory === c ? "bg-primary text-white border-transparent shadow-md" : "bg-transparent text-muted-foreground border-border hover:border-primary"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={createRoom}
                  disabled={!newRoomTitle.trim()}
                  className="flex-[2] btn-primary rounded-2xl font-bold uppercase tracking-widest text-xs shadow-glow-purple disabled:opacity-50 active:scale-95"
                >
                  Pulse Network
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
