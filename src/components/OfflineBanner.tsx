import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi } from 'lucide-react';
import { soundService } from '../services/soundService';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showRecovered, setShowRecovered] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowRecovered(true);
      soundService.playSuccess();
      const timer = setTimeout(() => {
        setShowRecovered(false);
      }, 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowRecovered(false);
      soundService.playWarning();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-red-600/90 border-b border-red-500/30 backdrop-blur-md px-4 py-2 flex items-center justify-center gap-2 text-white shadow-lg pointer-events-none"
        >
          <WifiOff size={14} className="animate-pulse" />
          <span className="text-[10px] font-display font-black uppercase tracking-widest text-center">
            You are offline. Connection to the arena lost.
          </span>
        </motion.div>
      )}

      {!isOffline && showRecovered && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-pulse-cyan/90 border-b border-pulse-cyan/30 backdrop-blur-md px-4 py-2 flex items-center justify-center gap-2 text-white shadow-lg pointer-events-none"
        >
          <Wifi size={14} className="text-white animate-bounce" />
          <span className="text-[10px] font-display font-black uppercase tracking-widest text-center">
            Connection restored. Welcome back, player!
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
