import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { feedbackService, ToastMessage, ToastType } from '../services/feedbackService';

const stylesMap: Record<ToastType, { bg: string; border: string; text: string; iconBg: string; icon: any }> = {
  success: {
    bg: 'bg-[#0d1f22]/90',
    border: 'border-[#14b8a6]/20',
    text: 'text-[#14b8a6]',
    iconBg: 'bg-[#14b8a6]/10',
    icon: CheckCircle2,
  },
  error: {
    bg: 'bg-[#291415]/90',
    border: 'border-red-500/20',
    text: 'text-red-400',
    iconBg: 'bg-red-500/10',
    icon: XCircle,
  },
  warning: {
    bg: 'bg-[#291f14]/90',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-[#0f172a]/90',
    border: 'border-[#a855f7]/20',
    text: 'text-[#a855f7]',
    iconBg: 'bg-[#a855f7]/10',
    icon: Info,
  },
};

export default function FeedbackToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = feedbackService.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration !== 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration || 4000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[3000] flex flex-col gap-2 w-full max-w-sm px-6 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const style = stylesMap[toast.type];
          const Icon = style.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              layout
              className="pointer-events-auto"
            >
              <div
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${style.bg} ${style.border}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${style.iconBg}`}>
                  <Icon size={16} className={style.text} />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <p className={`text-[10px] font-display font-black uppercase tracking-wider leading-snug break-words ${style.text}`}>
                    {toast.message}
                  </p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-white/20 hover:text-white/60 transition-colors p-1 shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
