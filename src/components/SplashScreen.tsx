import { motion } from 'motion/react';
import { Gamepad2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SplashScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-[100dvh] w-full bg-abyssal flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-pulse-purple/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-pulse-cyan/10 blur-[100px] rounded-full" />
      
      {/* Animated Hexagon Pattern (Subtle Gaming Theme) */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(168,85,247,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-pulse-purple to-pulse-cyan rounded-3xl rotate-12 flex items-center justify-center p-0.5 shadow-[0_0_50px_rgba(168,85,247,0.3)]">
          <div className="w-full h-full bg-abyssal rounded-[22px] flex items-center justify-center -rotate-12">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Gamepad2 size={44} className="text-white" />
            </motion.div>
          </div>
        </div>
        
        {/* Orbiting Ring Decoration */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-20px] border border-white/5 rounded-full"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-10px] border border-white/5 rounded-full"
        />
      </motion.div>

      <div className="text-center z-10">
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-display font-black text-white tracking-widest uppercase mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
        >
          Squad UP Arena
        </motion.h1>
        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-pulse-cyan text-[10px] font-display font-bold uppercase tracking-[0.4em]"
        >
          The Ultimate Esports Team Finder
        </motion.p>
      </div>

      {/* Loading Progress Section */}
      <div className="absolute bottom-20 left-0 right-0 px-12 space-y-4">
        <div className="flex justify-between items-end mb-2">
          <motion.p 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-white/40 text-[10px] font-display font-bold uppercase tracking-widest"
          >
            Loading...
          </motion.p>
          <span className="text-pulse-purple text-[10px] font-mono font-bold tracking-tighter">{Math.floor(progress)}%</span>
        </div>
        
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-pulse-purple to-pulse-cyan shadow-[0_0_10px_rgba(168,85,247,0.5)]"
          />
        </div>
      </div>

      {/* Background Pulse Circle */}
      <motion.div 
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute w-[500px] h-[500px] border border-white/5 rounded-full pointer-events-none"
      />
    </div>
  );
}
