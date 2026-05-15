import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pen, Type, Highlighter, Eraser, Undo2, Redo2, Mic, Square, Trash2, X, Circle, ChevronDown, ChevronUp, EyeOff, Palette } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ExpressiveWorkspaceProps {
  onContentChange: (text: string, drawingJson: string | null, audioUrl: string | null) => void;
  text: string;
  setText: (v: string) => void;
  audioUrl: string | null;
  setAudioUrl: (v: string | null) => void;
  drawingData: string | null;
  setDrawingData: (v: string | null) => void;
  isSubmitting?: boolean;
}

type Tool = 'text' | 'pen' | 'highlighter' | 'eraser';

export function ExpressiveWorkspace({
  onContentChange,
  text,
  setText,
  audioUrl,
  setAudioUrl,
  drawingData,
  setDrawingData,
  isSubmitting,
}: ExpressiveWorkspaceProps) {
  const [activeTool, setActiveTool] = useState<Tool>('text');
  const [color, setColor] = useState('#8b5cf6'); // Default purple
  const [size, setSize] = useState(3);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<any[]>([]);
  const [redoPaths, setRedoPaths] = useState<any[]>([]);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isManualMinimized, setIsManualMinimized] = useState(false);
  const [isToolbarHidden, setIsToolbarHidden] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isMinimized = isManualMinimized || isDrawing || isFocused;

  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#1f2937'];

  const stateRef = useRef({ activeTool, color, size, isDrawing: false });
  useEffect(() => {
    stateRef.current = { activeTool, color, size, isDrawing: isDrawing };
  }, [activeTool, color, size, isDrawing]);

  // Initialize canvas layout
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    
    const resize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const needsResize = canvas.width !== rect.width * 2 || canvas.height !== rect.height * 2;
      
      if (needsResize) {
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        // Use a slight delay to let layout settle before redrawing paths
        setTimeout(redrawAll, 10);
      }
    };
    
    setTimeout(resize, 50);
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, []); // Only run once for layout

  // Initialize passive: false touch listeners exactly once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (stateRef.current.activeTool !== 'text' && e.cancelable) e.preventDefault();
      startDraw(e);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (stateRef.current.activeTool !== 'text' && e.cancelable) e.preventDefault();
      moveDraw(e);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (stateRef.current.activeTool !== 'text' && e.cancelable) e.preventDefault();
      endDraw();
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []); // Only run once

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * 2,
      y: (clientY - rect.top) * 2
    };
  };

  const redrawAll = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    paths.forEach(p => {
      drawPath(ctx, p);
    });
  };

  const drawPath = (ctx: CanvasRenderingContext2D, path: any) => {
    if (path.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.strokeStyle = path.tool === 'highlighter' ? path.color + '66' : path.tool === 'eraser' ? '#ffffff' : path.color;
    ctx.lineWidth = path.size * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.stroke();
    // Reset global composite
    ctx.globalCompositeOperation = 'source-over';
  };

  const currentPathRef = useRef<any>(null);

  const startDraw = (e: any) => {
    if (stateRef.current.activeTool === 'text') return;
    if (e.cancelable) e.preventDefault();
    const pos = getPos(e);
    setIsDrawing(true);
    currentPathRef.current = {
      tool: stateRef.current.activeTool,
      color: stateRef.current.color,
      size: stateRef.current.activeTool === 'highlighter' ? 16 : stateRef.current.activeTool === 'eraser' ? 24 : stateRef.current.size,
      points: [pos]
    };
    setRedoPaths([]); // Clear redo stack on new action
  };

  const moveDraw = (e: any) => {
    if (!stateRef.current.isDrawing || stateRef.current.activeTool === 'text' || !currentPathRef.current) return;
    if (e.cancelable) e.preventDefault();
    const pos = getPos(e);
    
    // Add point to ref
    currentPathRef.current.points.push(pos);
    
    // Draw just the new segment
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
       const pts = currentPathRef.current.points;
       if (pts.length > 1) {
         ctx.beginPath();
         ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
         ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
         ctx.strokeStyle = currentPathRef.current.tool === 'highlighter' ? currentPathRef.current.color + '66' : currentPathRef.current.tool === 'eraser' ? '#ffffff' : currentPathRef.current.color;
         ctx.lineWidth = currentPathRef.current.size * 2;
         ctx.lineCap = 'round';
         ctx.lineJoin = 'round';
         ctx.globalCompositeOperation = currentPathRef.current.tool === 'eraser' ? 'destination-out' : 'source-over';
         ctx.stroke();
         ctx.globalCompositeOperation = 'source-over';
       }
    }
  };

  const endDraw = () => {
    if (!stateRef.current.isDrawing || stateRef.current.activeTool === 'text') return;
    setIsDrawing(false);
    if (currentPathRef.current) {
      const newPath = currentPathRef.current;
      setPaths(prev => [...prev, newPath]);
      updateParentDrawing([...paths, newPath]);
    }
    currentPathRef.current = null;
  };

  // Sync to parent format
  const updateParentDrawing = (currentPaths: any[]) => {
    if (currentPaths.length === 0) {
      setDrawingData(null);
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      setDrawingData(canvas.toDataURL('image/png', 0.5));
    }
  };

  useEffect(() => {
    if (drawingData === null && paths.length > 0) {
      setPaths([]);
      setRedoPaths([]);
    }
  }, [drawingData]);

  useEffect(() => {
    redrawAll();
  }, [paths]);

  const undo = () => {
    if (paths.length === 0) return;
    const newPaths = [...paths];
    const undone = newPaths.pop();
    setPaths(newPaths);
    setRedoPaths(prev => [...prev, undone]);
    updateParentDrawing(newPaths);
  };

  const redo = () => {
    if (redoPaths.length === 0) return;
    const newRedo = [...redoPaths];
    const redone = newRedo.pop();
    setRedoPaths(newRedo);
    const newPaths = [...paths, redone];
    setPaths(newPaths);
    updateParentDrawing(newPaths);
  };

  const clearCanvas = () => {
    setPaths([]);
    setRedoPaths([]);
    setDrawingData(null);
  };

  // Recording logic
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
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const removeAudio = () => {
    setAudioUrl(null);
    setRecordingTime(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isRecording]);

  return (
    <div className="flex flex-col w-full flex-1 relative isolate">
      {/* Workspace Container */}
      <div 
        ref={containerRef}
        className={cn(
          "relative flex-1 bg-background border border-dashed border-foreground/30 overflow-hidden w-full flex flex-col transition-all duration-500",
          activeTool !== 'text' && 'ring-2 ring-foreground/10'
        )}
      >
        {/* Canvas Layer */}
        <div className="absolute inset-0 z-10 overscroll-none touch-none">
           <canvas
             ref={canvasRef}
             onMouseDown={startDraw}
             onMouseMove={moveDraw}
             onMouseUp={endDraw}
             onMouseLeave={endDraw}
             className={cn(
               "w-full h-full",
               activeTool !== 'text' ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
             )}
           />
        </div>

        {/* Text Layer - Must scroll if exceeds height */}
        <div className="absolute inset-0 z-20 overflow-y-auto pointer-events-none">
          <div className="p-6 md:p-8 min-h-full flex flex-col">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Express whatever you remember..."
              onPointerDown={(e) => {
                if(activeTool === 'text') {
                  e.stopPropagation();
                }
              }}
              style={{ pointerEvents: activeTool === 'text' ? 'auto' : 'none' }}
              className="w-full bg-transparent text-foreground placeholder:text-muted/40 text-xl md:text-2xl leading-relaxed outline-none resize-none flex-1 min-h-[200px]"
            />
            
            {/* Inline Audio Attachment */}
            <AnimatePresence>
              {audioUrl && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="mt-8 p-3 pr-4 rounded-[2rem] bg-foreground text-background flex items-center justify-between gap-4 pointer-events-auto shadow-xl w-fit max-w-full relative z-30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-background/20 flex items-center justify-center relative shadow-inner">
                      <Mic size={20} className="relative z-10" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-1">Voice Memory</p>
                      <audio src={audioUrl} controls className="h-8 max-w-[180px] sm:max-w-[240px] opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <button onClick={removeAudio} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Hidden Toolbar Reopen Button */}
        <AnimatePresence>
          {isToolbarHidden && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.8 }}
               className="absolute bottom-6 right-4 z-30 pointer-events-auto"
            >
              <button 
                onClick={() => setIsToolbarHidden(false)}
                className="w-12 h-12 bg-foreground text-background rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                title="Show Toolbar"
              >
                <Palette size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Tools Container */}
        <AnimatePresence>
          {!isToolbarHidden && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-6 right-4 z-30 pointer-events-auto flex flex-row items-end gap-4"
            >
              {/* Active Tool Sub-menu */}
              <AnimatePresence>
                {!isMinimized && activeTool !== 'text' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    className="p-2.5 bg-foreground rounded-full shadow-2xl flex flex-col items-center gap-3 w-fit h-fit"
                  >
                    {activeTool !== 'eraser' && (
                      <div className="flex flex-col gap-2 py-2">
                        {colors.map(c => (
                          <button
                            key={c}
                            onClick={() => setColor(c)}
                            style={{ backgroundColor: c }}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-transform shadow-inner mx-auto",
                              color === c ? "border-background scale-125" : "border-transparent hover:scale-110 opacity-80"
                            )}
                          />
                        ))}
                      </div>
                    )}
                    
                    {activeTool !== 'eraser' && <div className="h-px w-8 bg-background/20 mx-2" />}
                    
                    <div className="flex flex-col gap-1 pb-1">
                      <button onClick={undo} disabled={paths.length === 0} className="w-10 h-10 rounded-full flex items-center justify-center text-background/70 hover:bg-background/20 hover:text-background disabled:opacity-20 disabled:hover:bg-transparent transition-colors">
                        <Undo2 size={18} />
                      </button>
                      <button onClick={redo} disabled={redoPaths.length === 0} className="w-10 h-10 rounded-full flex items-center justify-center text-background/70 hover:bg-background/20 hover:text-background disabled:opacity-20 disabled:hover:bg-transparent transition-colors">
                        <Redo2 size={18} />
                      </button>
                      <div className="h-px w-8 bg-background/20 mx-1 my-1" />
                      <button onClick={clearCanvas} disabled={paths.length === 0} className="w-10 h-10 rounded-full flex items-center justify-center text-rose-400 hover:bg-rose-500/20 disabled:opacity-20 disabled:hover:bg-transparent transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Toolbar */}
              <motion.div layout className="bg-foreground p-2 rounded-full shadow-2xl flex flex-col items-center gap-2">
                {!isMinimized ? (
                  <>
                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-background/50 hover:text-background/90" title="Hide completely" onClick={() => setIsToolbarHidden(true)}>
                      <EyeOff size={16} />
                    </button>
                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-background/50 hover:text-background/90 mb-1" title="Minimize" onClick={() => setIsManualMinimized(true)}>
                      <ChevronDown size={20} />
                    </button>
                    <ToolButton icon={<Pen size={20} />} active={activeTool === 'pen'} onClick={() => setActiveTool('pen')} />
                    <ToolButton icon={<Type size={20} />} active={activeTool === 'text'} onClick={() => setActiveTool('text')} />
                    <ToolButton icon={<Eraser size={20} />} active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} />
                    <div className="h-px w-8 bg-background/20 mx-2 my-1" />
                    <RecordButton isRecording={isRecording} onStart={startRecording} onStop={stopRecording} formatTime={formatTime} recordingTime={recordingTime} />
                  </>
                ) : (
                  <>
                    <button className="w-12 h-12 rounded-full flex items-center justify-center text-background/80 hover:bg-background/20 hover:text-background" title="Expand Toolbar" onClick={() => setIsManualMinimized(false)}>
                      <ChevronUp size={24} />
                    </button>
                    {activeTool === 'pen' && <ToolButton icon={<Pen size={20} />} active={true} onClick={() => setIsManualMinimized(false)} />}
                    {activeTool === 'text' && <ToolButton icon={<Type size={20} />} active={true} onClick={() => setIsManualMinimized(false)} />}
                    {activeTool === 'eraser' && <ToolButton icon={<Eraser size={20} />} active={true} onClick={() => setIsManualMinimized(false)} />}
                    {isRecording && <div className="mt-2"><RecordButton isRecording={isRecording} onStart={startRecording} onStop={stopRecording} formatTime={formatTime} recordingTime={recordingTime} /></div>}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToolButton({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center transition-all relative overflow-hidden group",
        active ? "text-foreground bg-background shadow-inner scale-105" : "text-background/80 hover:bg-background/20 hover:text-background"
      )}
    >
      {icon}
    </button>
  );
}

function RecordButton({ isRecording, onStart, onStop, formatTime, recordingTime }: { isRecording: boolean, onStart: () => void, onStop: () => void, formatTime: (s: number) => string, recordingTime: number }) {
  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {isRecording && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute bottom-full mb-4 flex flex-col items-center gap-2 bg-rose-500 rounded-full px-2 py-4 whitespace-nowrap overflow-hidden border border-rose-600 shadow-lg text-white"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            <span className="text-xs font-bold tracking-widest" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{formatTime(recordingTime)}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={isRecording ? onStop : onStart}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all relative overflow-hidden group",
          isRecording 
            ? "text-white" 
            : "text-background/80 hover:bg-background/20 hover:text-background"
        )}
      >
        {isRecording && (
          <>
            <motion.div 
              layoutId="mic-bg"
              className="absolute inset-0 bg-rose-500 rounded-full"
            />
            <div className="absolute inset-0 rounded-full ring-4 ring-rose-500/30 animate-ping" />
          </>
        )}
        <div className="relative z-10 flex items-center justify-center">
          {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
        </div>
      </button>
    </div>
  );
}
