'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Check, Pen } from 'lucide-react';
import { motion } from 'framer-motion';

interface DrawingPadProps {
  onSave: (json: string) => void;
  onClose: () => void;
}

export default function DrawingPad({ onSave, onClose }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set scale based on display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#10b981'; // Primary Emerald
  }, []);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const start = (e: any) => {
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasContent(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    const data = canvasRef.current.toDataURL();
    onSave(data);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="w-full max-w-lg bg-card rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border border-border">
        <div className="p-6 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Pen size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Conceptual Sketch</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Visualize the anchor</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center font-bold">✕</button>
        </div>

        <div className="flex-1 bg-muted/5 relative cursor-crosshair touch-none">
          <canvas 
            ref={canvasRef}
            onMouseDown={start}
            onMouseMove={draw}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={draw}
            onTouchEnd={end}
            className="w-full h-[40vh]"
          />
          {!hasContent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <p className="text-xs font-medium italic">Draw a diagram or symbol to anchor this concept...</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-card flex gap-4">
          <button 
            onClick={clear}
            className="flex-1 h-14 border border-border rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-muted-foreground hover:bg-muted/10 transition-colors"
          >
            <Trash2 size={18} />
            Clear
          </button>
          <button 
            onClick={handleSave}
            disabled={!hasContent}
            className="flex-[2] h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            <Check size={18} strokeWidth={3} />
            Save Anchor
          </button>
        </div>
      </div>
    </motion.div>
  );
}
