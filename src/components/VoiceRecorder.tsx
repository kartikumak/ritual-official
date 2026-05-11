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
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm bg-card rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border border-border">
        <div className="p-8 text-center bg-muted/5">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <AnimatePresence>
              {isRecording && (
                <motion.div 
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-primary rounded-full"
                />
              )}
            </AnimatePresence>
            <Mic size={32} className={isRecording ? "text-primary animate-pulse" : "text-muted-foreground"} />
          </div>
          <h3 className="text-lg font-serif font-bold mb-1">Conceptual Narration</h3>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">
            Explain the concept out loud to solidify the connection.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex justify-center">
            {!audioUrl ? (
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90",
                  isRecording ? "bg-rose-500 text-white" : "bg-primary text-white"
                )}
              >
                {isRecording ? <Square size={24} /> : <Mic size={24} />}
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    const audio = new Audio(audioUrl);
                    audio.play();
                  }}
                  className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100"
                >
                  <Play size={20} fill="currentColor" />
                </button>
                <button onClick={clear} className="text-muted-foreground hover:text-rose-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
             <button onClick={onClose} className="flex-1 h-12 rounded-xl bg-muted/10 font-bold text-xs">Cancel</button>
             <button 
               onClick={handleSave} 
               disabled={!audioUrl}
               className="flex-[2] h-12 rounded-xl bg-primary text-white font-bold text-xs disabled:opacity-50 shadow-md"
             >
                Save Recording
             </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
