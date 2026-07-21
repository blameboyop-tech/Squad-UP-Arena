import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Trash2, 
  RefreshCw, 
  UserPlus, 
  Mail, 
  Users, 
  Swords, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  Trophy, 
  ShieldAlert, 
  AlertTriangle, 
  Ban, 
  Megaphone,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationService, AppNotification, NotificationType } from '../services/notificationService';
import { soundService } from '../services/soundService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onNavigate?: (actionUrl: string) => void;
}

export default function NotificationCenter({ isOpen, onClose, userId, onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [limitCount, setLimitCount] = useState(15);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull-to-refresh gesture states
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Real-time listener for current query limit
  useEffect(() => {
    if (!userId || !isOpen) return;

    setIsLoading(true);
    const unsubscribe = NotificationService.listenToNotifications(
      userId,
      limitCount,
      (fetchedNotifs, hasMoreItems) => {
        setNotifications(fetchedNotifs);
        setHasMore(hasMoreItems);
        setIsLoading(false);
        setIsRefreshing(false);
        setError(null);
      },
      (err) => {
        console.error("Error loading notifications:", err);
        setError("Security restrictions or network issue loading notifications.");
        setIsLoading(false);
        setIsRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [userId, limitCount, isOpen]);

  // Re-sync listener trigger on pull-to-refresh
  const triggerRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    soundService.playSuccess();
    
    // Simulate a brief fetch delay for tactile feedback
    setTimeout(() => {
      // Trigger update by cycling the limit briefly or keeping it
      setLimitCount(prev => prev);
      setIsRefreshing(false);
    }, 800);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    if (distance > 0) {
      // Apply drag resistance (rubber banding)
      const damp = Math.min(distance * 0.4, 90);
      setPullDistance(damp);
      if (damp > 10) {
        // Prevent scroll bounce
        if (e.cancelable) e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 55) {
      triggerRefresh();
    }
    setStartY(0);
    setPullDistance(0);
  };

  // Helper to format timestamps to relative text
  const getRelativeTime = (timestamp: any): string => {
    if (!timestamp) return 'Just now';
    let date: Date;
    if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Group notifications helper
  const groupNotifications = (notifs: AppNotification[]) => {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    notifs.forEach((n) => {
      let date: Date;
      if (n.createdAt && typeof n.createdAt.toDate === 'function') {
        date = n.createdAt.toDate();
      } else if (n.createdAt instanceof Date) {
        date = n.createdAt;
      } else if (n.createdAt && n.createdAt.seconds) {
        date = new Date(n.createdAt.seconds * 1000);
      } else {
        date = new Date();
      }

      if (date >= todayStart) {
        today.push(n);
      } else if (date >= yesterdayStart) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, yesterday, earlier };
  };

  const { today, yesterday, earlier } = groupNotifications(notifications);

  // Mark all loaded as read
  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.notificationId);
    if (unreadIds.length === 0) return;
    try {
      soundService.playSuccess();
      await NotificationService.markAllAsRead(userId, unreadIds);
    } catch (err) {
      console.error(err);
    }
  };

  // Mark single read & navigate
  const handleNotifClick = async (notif: AppNotification) => {
    try {
      if (!notif.read) {
        await NotificationService.markAsRead(userId, notif.notificationId);
      }
      if (notif.actionUrl) {
        if (onNavigate) {
          onNavigate(notif.actionUrl);
        }
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete notification
  const handleDeleteNotif = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    try {
      soundService.playWarning();
      await NotificationService.deleteNotification(userId, notifId);
    } catch (err) {
      console.error(err);
    }
  };

  // Load more pagination trigger
  const handleLoadMore = () => {
    soundService.playSuccess();
    setLimitCount(prev => prev + 15);
  };

  // Dynamic Icon Renderer
  const renderIcon = (iconName: string) => {
    const p = { className: "w-4 h-4 text-white", size: 16 };
    switch (iconName) {
      case 'UserPlus': return <div className="p-2 rounded-xl bg-pulse-cyan/15 border border-pulse-cyan/30 text-pulse-cyan"><UserPlus {...p} className="text-pulse-cyan w-4 h-4" /></div>;
      case 'Mail': return <div className="p-2 rounded-xl bg-pulse-purple/15 border border-pulse-purple/30 text-pulse-purple"><Mail {...p} className="text-pulse-purple w-4 h-4" /></div>;
      case 'Users': return <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400"><Users {...p} className="text-blue-400 w-4 h-4" /></div>;
      case 'Swords': return <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400"><Swords {...p} className="text-red-400 w-4 h-4" /></div>;
      case 'CheckCircle2': return <div className="p-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400"><CheckCircle2 {...p} className="text-green-400 w-4 h-4" /></div>;
      case 'XCircle': return <div className="p-2 rounded-xl bg-red-600/15 border border-red-600/30 text-red-500"><XCircle {...p} className="text-red-500 w-4 h-4" /></div>;
      case 'Flame': return <div className="p-2 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-500"><Flame {...p} className="text-yellow-500 w-4 h-4" /></div>;
      case 'Trophy': return <div className="p-2 rounded-xl bg-yellow-400/15 border border-yellow-400/30 text-yellow-400"><Trophy {...p} className="text-yellow-400 w-4 h-4" /></div>;
      case 'ShieldAlert': return <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400"><ShieldAlert {...p} className="text-purple-400 w-4 h-4" /></div>;
      case 'AlertTriangle': return <div className="p-2 rounded-xl bg-yellow-600/15 border border-yellow-600/30 text-yellow-600"><AlertTriangle {...p} className="text-yellow-600 w-4 h-4" /></div>;
      case 'Ban': return <div className="p-2 rounded-xl bg-red-600/15 border border-red-600/30 text-red-600"><Ban {...p} className="text-red-600 w-4 h-4" /></div>;
      case 'Megaphone': return <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400"><Megaphone {...p} className="text-orange-400 w-4 h-4" /></div>;
      default: return <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40"><Bell {...p} className="text-white/40 w-4 h-4" /></div>;
    }
  };

  const renderNotificationCard = (notif: AppNotification) => {
    return (
      <motion.div
        key={notif.notificationId}
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={() => handleNotifClick(notif)}
        className={`group relative flex items-start gap-3.5 p-4 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
          notif.read 
            ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' 
            : 'bg-gradient-to-r from-pulse-purple/10 to-transparent border-pulse-purple/30 shadow-[0_0_15px_rgba(168,85,247,0.05)] hover:from-pulse-purple/15'
        }`}
      >
        {/* Unread Highlight Bar */}
        {!notif.read && (
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-pulse-purple to-pulse-blue rounded-r" />
        )}

        {/* Icon */}
        <div className="shrink-0">
          {renderIcon(notif.icon)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h4 className={`text-[12px] font-display font-bold truncate ${notif.read ? 'text-white/80' : 'text-white'}`}>
              {notif.title}
            </h4>
            <span className="text-[9px] font-mono font-medium text-white/40 shrink-0">
              {getRelativeTime(notif.createdAt)}
            </span>
          </div>
          <p className={`text-[10.5px] leading-relaxed break-words ${notif.read ? 'text-white/50' : 'text-white/80'}`}>
            {notif.message}
          </p>
        </div>

        {/* Inline Actions (Read / Delete) */}
        <div className="absolute right-3 bottom-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {!notif.read && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                soundService.playSuccess();
                await NotificationService.markAsRead(userId, notif.notificationId);
              }}
              title="Mark as read"
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => handleDeleteNotif(e, notif.notificationId)}
            title="Delete notification"
            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    );
  };

  const renderSection = (title: string, list: AppNotification[]) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-2.5 mb-6">
        <h3 className="text-[9px] font-mono font-black text-white/30 uppercase tracking-[0.2em] px-1">
          {title}
        </h3>
        <div className="space-y-2">
          {list.map(notif => renderNotificationCard(notif))}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
          />

          {/* Drawer / Overlay Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[440px] bg-abyssal border-l border-white/10 z-50 flex flex-col overflow-hidden shadow-2xl h-[100dvh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="text-pulse-cyan w-5 h-5" />
                <span className="font-display font-black text-sm uppercase tracking-widest text-white">
                  Notifications
                </span>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-pulse-purple text-[9px] font-black font-mono text-white tracking-wider">
                    {notifications.filter(n => !n.read).length} NEW
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 text-[10px] font-display font-black uppercase tracking-wider"
                  >
                    <CheckCheck size={14} className="text-pulse-cyan" />
                    Mark All Read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable List Container with Pull-to-Refresh & Infinite Scroll */}
            <div
              ref={scrollContainerRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="flex-1 overflow-y-auto px-4 py-2 select-none relative"
              style={{
                scrollBehavior: 'smooth'
              }}
            >
              {/* Pull-to-refresh Visual indicator */}
              {pullDistance > 0 && (
                <div 
                  className="flex justify-center items-center py-2 transition-all duration-100 overflow-hidden"
                  style={{ height: `${pullDistance}px`, opacity: Math.min(pullDistance / 50, 1) }}
                >
                  <div className="flex items-center gap-2 text-white/40 text-[9px] font-mono font-bold uppercase tracking-widest">
                    <RefreshCw 
                      size={12} 
                      className={`text-pulse-cyan animate-spin`} 
                    />
                    {pullDistance > 55 ? 'Release to refresh' : 'Pull down to refresh'}
                  </div>
                </div>
              )}

              {/* Refreshing Spinner Overlay inside feed */}
              {isRefreshing && (
                <div className="flex justify-center items-center py-4 shrink-0">
                  <div className="flex items-center gap-2 text-pulse-cyan text-[9px] font-mono font-bold uppercase tracking-widest">
                    <RefreshCw size={12} className="animate-spin" />
                    Synchronizing Feed...
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="my-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                  <p className="text-red-400 text-[11px] font-display font-bold uppercase tracking-wider">{error}</p>
                  <button 
                    onClick={triggerRefresh}
                    className="mt-2.5 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading Spinner */}
              {isLoading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div className="w-8 h-8 border-3 border-pulse-cyan/20 border-t-pulse-cyan rounded-full animate-spin" />
                  <p className="text-[10px] font-mono font-black text-white/30 uppercase tracking-widest">Loading Inbox...</p>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-28 text-center text-white/25">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-pulse-purple/10 blur-xl rounded-full" />
                    <Bell size={42} className="relative text-white/20 animate-pulse" />
                  </div>
                  <h3 className="font-display font-black text-xs uppercase tracking-widest text-white/40">Your Inbox is Empty</h3>
                  <p className="text-[10.5px] text-white/20 mt-1 max-w-[200px] mx-auto">
                    We'll let you know when action updates or tournament alerts arrive!
                  </p>
                </div>
              )}

              {/* Grouped Notifications */}
              {!isLoading && notifications.length > 0 && (
                <motion.div layout className="py-2">
                  {renderSection('Today', today)}
                  {renderSection('Yesterday', yesterday)}
                  {renderSection('Earlier', earlier)}

                  {/* Load More Pagination Button */}
                  {hasMore && (
                    <div className="flex justify-center pt-2 pb-6">
                      <button
                        onClick={handleLoadMore}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white text-[10px] font-display font-black uppercase tracking-widest transition-all duration-300"
                      >
                        Load More
                        <ChevronDown size={14} className="text-pulse-cyan" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
