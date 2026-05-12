'use client';

import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/src/lib/utils";

interface VoiceRecorderProps {
  onSave: (url: string) => void;
  onClose: () => void;
}

export default function VoiceRecorder({ onSave, onClose }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access is required for audio recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release the microphone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSave = () => {
    if (audioUrl) onSave(audioUrl);
  };

  const clear = () => {
    setAudioUrl(null);
    chunksRef.current = [];
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm bg-white rounded-[3rem] overflow-hidden flex flex-col shadow-neumorphic border border-white/60 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 animate-blob pointer-events-none" />
        
        <div className="p-8 md:p-10 text-center bg-white relative z-10 border-b border-border/40">
          <div className="w-20 h-20 bg-white shadow-neumorphic rounded-full flex items-center justify-center mx-auto mb-8 relative border border-white/80">
            <AnimatePresence>
              {isRecording && (
                <motion.div 
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-rose-500 rounded-full"
                />
              )}
            </AnimatePresence>
            <Mic size={32} className={isRecording ? "text-rose-500 animate-pulse" : "text-primary/70"} />
          </div>
          <h3 className="text-xl font-serif font-bold tracking-tight mb-2">Conceptual Narration</h3>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">
            Explain the concept out loud to solidify the connection.
          </p>
        </div>

        <div className="p-8 md:p-10 space-y-8 relative z-10 bg-card">
          <div className="flex justify-center">
            {!audioUrl ? (
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-neumorphic active:scale-95 border border-white/60",
                  isRecording ? "bg-rose-50 text-rose-500" : "bg-white text-primary"
                )}
              >
                {isRecording ? <Square size={28} /> : <Mic size={28} />}
              </button>
            ) : (
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => {
                    const audio = new Audio(audioUrl);
                    audio.play();
                  }}
                  className="w-16 h-16 bg-white text-emerald-500 rounded-full flex items-center justify-center border border-white/60 shadow-neumorphic hover:scale-105 transition-transform"
                >
                  <Play size={24} fill="currentColor" />
                </button>
                <button onClick={clear} className="w-12 h-12 bg-white text-muted-foreground hover:text-rose-500 rounded-full flex items-center justify-center shadow-sm border border-white/60 transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-4">
             <button onClick={onClose} className="flex-1 h-14 rounded-2xl bg-white border border-white/60 shadow-sm font-bold text-sm text-muted-foreground hover:text-primary transition-colors">Cancel</button>
             <button 
               onClick={handleSave} 
               disabled={!audioUrl}
               className="flex-[2] h-14 rounded-2xl bg-emerald-600 border border-emerald-500 text-white font-bold text-sm disabled:opacity-50 shadow-neumorphic active:scale-95 transition-all"
             >
                Save Recording
             </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
