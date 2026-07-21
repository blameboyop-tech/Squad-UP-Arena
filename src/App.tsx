/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef, useEffect, ChangeEvent, lazy, Suspense } from 'react';
import { 
  Bell, 
  Search, 
  User, 
  MessageSquare, 
  Home, 
  ArrowUpRight,
  Link,
  Shield,
  Trophy,
  Users,
  Plus,
  Coins,
  CheckCircle2,
  ArrowLeft,
  Crown,
  Pencil,
  Settings,
  LogOut,
  Lock,
  Gamepad2,
  Mail,
  Eye,
  EyeOff,
  ShieldAlert,
  Info,
  Clock,
  LayoutDashboard,
  Zap,
  ListChecks,
  ClipboardList,
  Trash2,
  Ban,
  Unlock,
  AlertTriangle,
  Gem,
  Check,
  Heart,
  Sparkles,
  PlusCircle,
  Camera,
  Send,
  Star,
  Bot,
  Volume2,
  ShoppingBag,
  Phone,
  Video,
  MoreVertical,
  Smile,
  ChevronDown,
  Award,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  addDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  writeBatch,
  runTransaction,
  orderBy,
  limit
} from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { db, auth, handleFirestoreError, messaging, storage } from './lib/firebase';
import { SplashScreen } from './components/SplashScreen';
import { LogoPicker } from './components/LogoPicker';
import { UserManagement } from './components/UserManagement';
import { analyzeReports } from './services/aiService';
import { logAppError } from './services/bugDetectionService';
import { handleAIResponse } from './services/geminiService';
import { soundService } from './services/soundService';
import { uploadAdminAsset } from './services/storageService';
import { deleteField } from 'firebase/firestore';
import { NotificationService } from './services/notificationService';
import NotificationCenter from './components/NotificationCenter';
import { feedbackService } from './services/feedbackService';
import FeedbackToast from './components/FeedbackToast';
import OfflineBanner from './components/OfflineBanner';
import SkeletonLoader from './components/SkeletonLoader';
import EmptyState from './components/EmptyState';
import { ScreenshotUploadModal } from './components/ScreenshotUploadModal';
import { resolveAvatar, resolveTeamLogo, DEFAULT_TEAM_LOGO_URL } from './lib/defaultAssets';
import { 
  resolveUserRole, 
  isSuperAdmin, 
  getCurrentUserRole, 
  changeUserRole,
  hasPermission,
  Permission,
  UserRole
} from './services/roleService';

const tabPermissions: Record<string, Permission> = {
  users: 'view_users',
  roles: 'manage_roles',
  reports: 'view_reports',
  badges: 'manage_badges',
  tournaments: 'view_tournaments',
  tasks: 'manage_tasks',
  logos: 'manage_logos',
  shop: 'manage_shop',
  banners: 'manage_banners',
  broadcast: 'send_broadcast',
  system: 'manage_system'
};

const SUPPORT_AI_ID = 'support_ai';
const SUPPORT_AI_USER = {
  id: SUPPORT_AI_ID,
  name: 'Support AI',
  avatar: null, // We'll use the Bot icon in UI
  playerStatus: 'AI ASSISTANT',
  isAI: true
};

const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=400&h=400';

interface UserBadgesProps {
  player: any;
  className?: string;
}

export function UserBadges({ player, className = "flex gap-1 items-center inline-flex ml-1.5 align-middle select-none shrink-0" }: UserBadgesProps) {
  if (!player) return null;
  const badges = [];
  const hiddenBadges = player.hiddenBadges || [];
  const revokedBadges = player.revokedBadges || [];

  // 1. E-Golden E badge (Verified esports players)
  const kd = player.stats?.kdRatio || player.kdRatio || 0;
  const matches = player.stats?.matchesPlayed || player.matches || player.matchesPlayed || 0;
  const wins = player.stats?.wins || player.wins || 0;
  const isEsports = (kd >= 3.5 && matches >= 50 && wins >= 15) || player.isEsportsPlayer === true;
  if (isEsports && !hiddenBadges.includes('esports') && !revokedBadges.includes('esports')) {
    badges.push({
      type: 'esports',
      label: 'E',
      tooltip: 'Verified Esports Player',
      bg: 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)] text-abyssal font-black',
    });
  }

  // 2. Mod badge (Official moderators)
  const email = player.email || '';
  const isProperGmail = email.toLowerCase().endsWith('@gmail.com');
  const resolvedRole = resolveUserRole(player.email, player.role);
  const isAuthorized = player.isAdmin === true || 
                       player.isMod === true || 
                       resolvedRole === 'moderator' || 
                       resolvedRole === 'admin' || 
                       resolvedRole === 'super_admin' || 
                       (email.toLowerCase() === 'blameboyop@gmail.com');
  if (isProperGmail && isAuthorized && !hiddenBadges.includes('mod') && !revokedBadges.includes('mod')) {
    badges.push({
      type: 'mod',
      label: 'M',
      tooltip: 'Official Moderator',
      bg: 'bg-gradient-to-r from-fuchsia-500 to-purple-600 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)] text-white font-black',
    });
  }

  // 3. Blue tick (Verified badge)
  const followers = player.followersCount || player.followers || player.followers_count || 0;
  if (followers >= 500 && !hiddenBadges.includes('verified') && !revokedBadges.includes('verified')) {
    badges.push({
      type: 'verified',
      label: '✓',
      tooltip: 'Verified User',
      bg: 'bg-gradient-to-r from-cyan-400 to-blue-500 border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.5)] text-white font-bold text-[8px]',
    });
  }

  if (badges.length === 0) return null;

  return (
    <span className={className}>
      {badges.map((badge, idx) => (
        <span 
          key={idx} 
          title={badge.tooltip}
          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] border leading-none shrink-0 ${badge.bg}`}
        >
          {badge.label}
        </span>
      ))}
    </span>
  );
}

/**
 * Robust image upload system with:
 * - Client-side resizing (512x512)
 * - Compression (< 300KB)
 * - Resumable uploads
 * - Progress tracking
 * - Automatic retries
 */
const uploadSystemImage = async (
  file: File, 
  path: string, 
  onProgress: (p: number) => void,
  onStep: (s: 'processing' | 'uploading' | 'saving' | 'done') => void
): Promise<string> => {
  const MAX_RETRIES = 3;
  
  const processAndUpload = async (attempt = 0): Promise<string> => {
    try {
      onStep('processing');
      onProgress(0);
      
      // Step 1: Create square and resize to 512x512
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failure");
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 512, 512);
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Blob creation failed")), 'image/jpeg', 0.85);
      });
      URL.revokeObjectURL(imageUrl);

      // Step 2: Extra compression to ensure < 300KB
      const compressedFile = await imageCompression(new File([blob], file.name, { type: 'image/jpeg' }), {
        maxSizeMB: 0.29,
        maxWidthOrHeight: 512,
        useWebWorker: true,
        initialQuality: 0.8
      });

      onStep('uploading');
      const storagePath = `admin/${path}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);
      
      return await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            onStep('saving');
            
            // Record in global assets tracking
            try {
              await addDoc(collection(db, 'admin_assets'), {
                url,
                path: storagePath,
                folder: path,
                uploadedAt: serverTimestamp(),
                size: compressedFile.size,
                type: 'image'
              });
            } catch (err) {
              console.error("Failed to record asset in Firestore:", err);
            }

            resolve(url);
          }
        );
      });
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        console.warn(`Upload attempt ${attempt + 1} failed, retrying...`, error);
        await new Promise(r => setTimeout(r, 1000));
        return processAndUpload(attempt + 1);
      }
      throw error;
    }
  };

  return processAndUpload();
};

// --- Types ---

interface Team {
  id: string;
  name: string;
  logo: string;
  game: 'freefire' | 'bgmi';
  leader: string;
  leaderId?: string;
  tags: string[];
  bio: string;
  followers?: number;
  isUserLeader?: boolean;
}

interface Tournament {
  id: string;
  title: string;
  imageUrl: string;
  prizePool: number;
  entryFee: number;
  perKill?: number;
  matchType: 'Solo' | 'Duo' | 'Squad';
  map: string;
  descriptionShort: string;
  descriptionFull: string;
  startTime: any;
  maxPlayers: number;
  currentPlayers: number;
  totalSlots?: number;
  filledSlots?: number;
  players?: string[];
  game: 'freefire' | 'bgmi';
  createdBy: string;
  createdAt: any;
}

interface TournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string;
  inGameName: string;
  level: number;
  uid: string;
  joinedAt: any;
}

interface Logo {
  id: string;
  name: string;
  imageUrl: string;
  isPremium: boolean;
  currencyType: 'gold' | 'pink' | 'blue';
  priceAmount: number;
  isAnimated?: boolean;
  isActive: boolean;
}

// --- Mock Data ---

interface ChatThread {
  id: string;
  participants: string[];
  lastMessage: string;
  lastSenderId: string;
  lastTimestamp: any;
  unreadCount?: { [uid: string]: number };
  otherUser?: any;
}

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: any;
  type: 'text' | 'image' | 'system';
}

// --- Predefined Tags ---
const PREDEFINED_TAGS = [
  'Aggressive', 'Passive', 'Tactical', 'Balanced', 'Stealth',
  'Entry Fragger', 'Support', 'Sniper', 'Rusher', 'IGL', 'Flanker',
  'Beginner', 'Intermediate', 'Advanced', 'Semi-Pro', 'Pro',
  'Daily', 'Weekends', 'Evenings', 'Morning', 'Night',
  'Mic On', 'Competitive', 'Chill Player', 'Tournament Ready'
];

const FILTER_CATEGORIES = {
  Playstyle: ['Aggressive', 'Passive', 'Tactical', 'Balanced', 'Stealth'],
  Roles: ['Entry Fragger', 'Support', 'Sniper', 'Rusher', 'IGL', 'Flanker'],
  Skill: ['Beginner', 'Intermediate', 'Advanced', 'Semi-Pro', 'Pro'],
  Availability: ['Daily', 'Weekends', 'Evenings', 'Morning', 'Night'],
};
const REPORT_REASONS = [
  'Toxic Behavior',
  'Abusive Language',
  'Not Friendly / Rude Behavior',
  'Spam or Repeated Messaging',
  'Cheating / Suspicious Activity'
];

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  online?: boolean;
}

// --- Mock Data ---

const MOCK_CHATS: Chat[] = [];

const INITIAL_TEAMS: Team[] = [];

// --- Components ---

function Onboarding({ 
  user, 
  step: currentStep, 
  onStepComplete 
}: { 
  user: FirebaseUser; 
  step: number; 
  onStepComplete: (data: any) => Promise<void>; 
}) {
  const [localStep, setLocalStep] = useState(currentStep);
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [game, setGame] = useState<'freefire' | 'bgmi'>('freefire');
  const [age, setAge] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setLocalStep(currentStep);
  }, [currentStep]);

  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const q = query(collection(db, 'usernames'), where('__name__', '==', username.toLowerCase()));
        const snap = await getDocs(q);
        setUsernameStatus(snap.empty ? 'available' : 'taken');
      } catch (err) {
        handleFirestoreError(err, 'get', `usernames/${username}`);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const nextStep = async (stepData: any = {}) => {
    setIsProcessing(true);
    const next = localStep + 1;
    const isFinal = localStep === 6;
    
    const finalData = {
      ...stepData,
      onboardingStep: isFinal ? next : next,
      profileCompleted: isFinal
    };

    if (localStep === 1) {
      // Save username to usernames collection too
      try {
        await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: user.uid });
      } catch (err) {
        handleFirestoreError(err, 'write', `usernames/${username}`);
      }
    }

    await onStepComplete(finalData);
    if (!isFinal) setLocalStep(next);
    setIsProcessing(false);
  };

  const renderStep = () => {
    switch (localStep) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-pulse-purple/20 flex items-center justify-center mx-auto mb-3 border border-pulse-purple/30 overflow-hidden">
                <img src={DEFAULT_AVATAR_URL} alt="" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-xl font-display font-black text-white uppercase italic">Choose Username</h2>
              <p className="text-white/40 text-[10px] mt-1 uppercase tracking-widest font-bold">Your unique identity in the arena</p>
            </div>
            <div className="relative">
              <input 
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-[13px] font-medium focus:border-pulse-purple outline-none transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && <div className="w-3 h-3 border-2 border-pulse-cyan border-t-transparent rounded-full animate-spin" />}
                {usernameStatus === 'available' && <Check size={16} className="text-green-500" />}
                {usernameStatus === 'taken' && <Plus size={16} className="text-red-500 rotate-45" />}
              </div>
            </div>
            {usernameStatus === 'taken' && <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest text-center">That username is already claimed!</p>}
            <button 
              disabled={usernameStatus !== 'available' || isProcessing}
              onClick={() => nextStep({ username, name: username })}
              className="w-full py-3 bg-pulse-purple rounded-xl text-white font-display font-black text-[11px] uppercase tracking-[0.2em] disabled:opacity-30 transition-all flex items-center justify-center gap-2 shadow-lg shadow-pulse-purple/20"
            >
              {isProcessing ? 'Saving...' : 'Set Username'} <ArrowUpRight size={12} />
            </button>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
             <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-pulse-cyan/20 flex items-center justify-center mx-auto mb-3 border border-pulse-cyan/30">
                <Gamepad2 size={24} className="text-pulse-cyan" />
              </div>
              <h2 className="text-xl font-display font-black text-white uppercase italic">Select Your Base</h2>
              <p className="text-white/40 text-[10px] mt-1 uppercase tracking-widest font-bold">Which world do you conquer?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setGame('freefire')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${game === 'freefire' ? 'bg-pulse-purple/20 border-pulse-purple shadow-lg' : 'bg-white/5 border-white/10 opacity-60'}`}
              >
                <img src="/freefire_logo.png" className="w-12 h-12 rounded-xl object-cover" alt="FF" />
                <span className="text-[11px] font-display font-black text-white uppercase tracking-widest">Free Fire</span>
              </button>
              <button 
                onClick={() => setGame('bgmi')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${game === 'bgmi' ? 'bg-pulse-cyan/20 border-pulse-cyan shadow-lg' : 'bg-white/5 border-white/10 opacity-60'}`}
              >
                <img src="/bgmi_logo.png" className="w-12 h-12 rounded-xl object-cover" alt="BGMI" />
                <span className="text-[11px] font-display font-black text-white uppercase tracking-widest">BGMI</span>
              </button>
            </div>
            <button 
              disabled={isProcessing}
              onClick={() => nextStep({ preferredGame: game, favoriteGame: game === 'freefire' ? 'Free Fire' : 'BGMI' })}
              className="w-full py-3 bg-pulse-cyan text-abyssal rounded-xl font-display font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
            >
              Continue Battle <ArrowUpRight size={12} />
            </button>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-3 border border-yellow-500/30">
                <AlertTriangle size={24} className="text-yellow-500" />
              </div>
              <h2 className="text-xl font-display font-black text-white uppercase italic">Verify Age</h2>
              <p className="text-white/40 text-[10px] mt-1 uppercase tracking-widest font-bold">Requirements for full access</p>
            </div>
            <div className="relative">
              <input 
                type="number"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || '')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-xl font-display font-black outline-none focus:border-yellow-500 transition-all"
              />
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
               <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest leading-relaxed text-center">
                 Safety protocols active for users under 13.
               </p>
            </div>
            <button 
              disabled={!age || age < 12 || isProcessing}
              onClick={() => nextStep({ age, isRestricted: age < 13 })}
              className="w-full py-3 bg-yellow-500 text-abyssal rounded-xl font-display font-black text-[11px] uppercase tracking-[0.2em] disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              Confirm Age <ArrowUpRight size={12} />
            </button>
            {age !== '' && age < 12 && <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest text-center">Minimum age is 12</p>}
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-pulse-purple/20 flex items-center justify-center mx-auto mb-3 border border-pulse-purple/30">
                <Shield size={24} className="text-pulse-purple" />
              </div>
              <h2 className="text-xl font-display font-black text-white uppercase italic">Choose Tags</h2>
              <p className="text-white/40 text-[10px] mt-1 uppercase tracking-widest font-bold">Select up to 4 labels</p>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto p-1 custom-scrollbar">
              {PREDEFINED_TAGS.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <button 
                    key={tag}
                    onClick={() => {
                      if (isSelected) setTags(tags.filter(t => t !== tag));
                      else if (tags.length < 4) setTags([...tags, tag]);
                    }}
                    className={`px-3 py-1.5 rounded-full border text-[9px] font-display font-bold uppercase tracking-widest transition-all ${isSelected ? 'bg-pulse-purple border-pulse-purple text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => nextStep({ tags: [] })} className="flex-1 py-3 text-white/30 font-display font-bold text-[9px] uppercase tracking-widest hover:text-white transition-all">Skip</button>
              <button 
                disabled={isProcessing}
                onClick={() => nextStep({ tags })}
                className="flex-[2] py-3 bg-pulse-purple rounded-xl text-white font-display font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-pulse-purple/20"
              >
                Next <ArrowUpRight size={12} />
              </button>
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-pulse-cyan/20 flex items-center justify-center mx-auto mb-3 border border-pulse-cyan/30">
                <Trophy size={24} className="text-pulse-cyan" />
              </div>
              <h2 className="text-xl font-display font-black text-white uppercase italic">Experience</h2>
              <p className="text-white/40 text-[10px] mt-1 uppercase tracking-widest font-bold">How long have you been gaming?</p>
            </div>
            <div className="space-y-2">
              {['< 6 Months', '1 Year', '2+ Years'].map((exp) => (
                <button 
                  key={exp}
                  onClick={() => setExperience(exp)}
                  className={`w-full py-3 rounded-xl border font-display font-bold uppercase text-[11px] tracking-widest transition-all ${experience === exp ? 'bg-pulse-cyan/20 border-pulse-cyan text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                >
                  {exp}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => nextStep({ experience: 'Not specified' })} className="flex-1 py-3 text-white/30 font-display font-bold text-[9px] uppercase tracking-widest hover:text-white transition-all">Skip</button>
              <button 
                disabled={!experience || isProcessing}
                onClick={() => nextStep({ experience })}
                className="flex-[2] py-3 bg-pulse-cyan text-abyssal rounded-xl font-display font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
              >
                Final Move <ArrowUpRight size={12} />
              </button>
            </div>
          </motion.div>
        );
      case 6:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-pulse-purple/20 flex items-center justify-center mx-auto mb-3 border border-pulse-purple/30">
                <Shield size={24} className="text-pulse-purple" />
              </div>
              <h2 className="text-xl font-display font-black text-white uppercase italic">Join the Squad</h2>
              <p className="text-white/40 text-[10px] mt-1 uppercase tracking-widest font-bold">Start your journey</p>
            </div>
            <div className="space-y-2">
              <button 
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-pulse-purple/20 hover:border-pulse-purple/50 group transition-all"
                onClick={() => nextStep({ joinOption: 'join' })}
              >
                <div className="w-8 h-8 rounded-lg bg-pulse-purple/20 flex items-center justify-center text-pulse-purple group-hover:scale-110 transition-all"><Users size={16} /></div>
                <div className="text-left">
                  <span className="block text-[11px] font-display font-black text-white uppercase">Join a Team</span>
                  <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Find battle mates</span>
                </div>
              </button>
              <button 
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-pulse-cyan/20 hover:border-pulse-cyan/50 group transition-all"
                onClick={() => nextStep({ joinOption: 'create' })}
              >
                <div className="w-8 h-8 rounded-lg bg-pulse-cyan/20 flex items-center justify-center text-pulse-cyan group-hover:scale-110 transition-all"><Plus size={16} /></div>
                <div className="text-left">
                  <span className="block text-[11px] font-display font-black text-white uppercase">Create a Team</span>
                  <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Lead from front</span>
                </div>
              </button>
            </div>
            <button 
              disabled={isProcessing}
              onClick={() => nextStep({ profileCompleted: true })}
              className="w-full py-3 text-white/30 font-display font-bold text-[9px] uppercase tracking-widest hover:text-white transition-all underline decoration-white/10 underline-offset-4"
            >
              Skip & Start solo
            </button>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-abyssal flex flex-col p-8 overflow-y-auto"
    >
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-pulse-purple/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-pulse-cyan/10 blur-[100px] rounded-full" />

      <div className="max-w-xs mx-auto w-full flex-1 flex flex-col pt-12 relative z-10">
        <div className="flex items-center justify-between mb-12">
          <div className="flex gap-1.5 flex-1 max-w-[200px]">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div 
                key={idx} 
                className={`flex-1 h-1 rounded-full transition-all duration-500 ${localStep >= idx ? 'bg-pulse-purple shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-white/10'}`} 
              />
            ))}
          </div>
          <span className="text-[10px] font-display font-black text-pulse-purple ml-4">{localStep}/6</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={localStep} className="flex-1">
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function GameCard({ 
  title, 
  image, 
  isActive, 
  onClick 
}: { 
  title: string; 
  image: string; 
  isActive: boolean; 
  onClick: () => void;
}) {
  const isFire = title.includes('FIRE');
  const isTactical = title.includes('BGMI');

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 group"
    >
      <div className={`w-[90px] h-[90px] rounded-2xl overflow-hidden border-2 transition-all duration-500 relative ${
        isActive 
          ? (isFire ? 'border-fire-orange shadow-[0_0_20px_rgba(255,77,0,0.4)]' : 
             isTactical ? 'border-tactical-green shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 
             'border-pulse-purple shadow-[0_0_20px_rgba(168,85,247,0.4)]')
          : 'border-white/10 grayscale opacity-40 group-hover:opacity-100 group-hover:grayscale-0'
      }`}>
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-white/5" />
        )}
        
        {/* Hover Highlight Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Glow effect on active */}
        {isActive && (
          <motion.div 
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 pointer-events-none ${
              isFire ? 'bg-fire-orange/10' : 
              isTactical ? 'bg-tactical-green/10' : 
              'bg-pulse-purple/10'
            }`}
          />
        )}
      </div>
      <span className={`text-[9px] font-display font-black uppercase tracking-widest text-center whitespace-pre-line leading-tight group-hover:text-white transition-colors duration-300 ${
        isActive 
          ? (isFire ? 'text-fire-orange drop-shadow-[0_0_8px_rgba(255,77,0,0.4)]' : 
             isTactical ? 'text-tactical-green drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 
             'text-pulse-purple drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]')
          : 'text-white/30'
      }`}>
        {title}
      </span>
    </motion.button>
  );
}

const MOCK_GROUPS: Chat[] = [];

// App Version Constants
const APP_VERSION_CODE = 3;
const APP_VERSION_NAME = "1.0.1";

function ParticipantsList({ 
  tournamentId, 
  onResultsChange 
}: { 
  tournamentId: string; 
  onResultsChange: (results: Record<string, { kills: number, points: number, win: boolean }>) => void;
}) {
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [localResults, setLocalResults] = useState<Record<string, { kills: number, points: number, win: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'tournament_participants'), where('tournamentId', '==', tournamentId));
    const unsub = onSnapshot(q, (snap) => {
      const parts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentParticipant));
      setParticipants(parts);
      setIsLoading(false);
    }, (err) => handleFirestoreError(err, 'list', 'tournament_participants'));
    return () => unsub();
  }, [tournamentId]);

  // Live match submissions listener
  useEffect(() => {
    const q = query(collection(db, 'match_submissions'), where('tournamentId', '==', tournamentId));
    const unsub = onSnapshot(q, (snap) => {
      setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Error loading match submissions:", err));
    return () => unsub();
  }, [tournamentId]);

  const updateResult = (userId: string, field: 'kills' | 'points', value: number) => {
    const updated = {
      ...localResults,
      [userId]: {
        ...(localResults[userId] || { kills: 0, points: 0, win: false }),
        [field]: value
      }
    };
    setLocalResults(updated);
    onResultsChange(updated);
  };

  const toggleWin = (userId: string) => {
    const updated = {
      ...localResults,
      [userId]: {
        ...(localResults[userId] || { kills: 0, points: 0, win: false }),
        win: !(localResults[userId]?.win || false)
      }
    };
    setLocalResults(updated);
    onResultsChange(updated);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-pulse-cyan/20 border-t-pulse-cyan rounded-full animate-spin" />
        <p className="text-[10px] font-display font-black text-white/20 uppercase tracking-widest">Scanning Participants...</p>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-20">
        <Users size={48} className="mb-4" />
        <p className="font-display font-black text-sm uppercase tracking-widest">No Warriors Joined</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {participants.map((p) => {
        const pSub = submissions.find(s => s.userId === p.userId);
        return (
          <div key={p.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 transition-all hover:border-white/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pulse-cyan/20 to-pulse-purple/20 border border-white/10 flex items-center justify-center relative shadow-lg overflow-hidden">
                  <img src={resolveAvatar(p.avatar)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-pulse-purple rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-[#0d0e2e]">
                    {p.level}
                  </div>
                </div>
                <div>
                  <h5 className="text-[13px] font-display font-black text-white uppercase tracking-tight">{p.inGameName}</h5>
                  <p className="text-[9px] font-mono font-bold text-white/30 truncate max-w-[120px]">{p.uid}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="space-y-1.5 flex-1 min-w-[80px]">
                  <label className="text-[8px] font-display font-black text-white/30 uppercase tracking-widest ml-1">Kills</label>
                  <input 
                    type="number"
                    value={localResults[p.userId]?.kills || 0}
                    onChange={(e) => updateResult(p.userId, 'kills', parseInt(e.target.value) || 0)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[12px] font-mono font-black text-pulse-cyan outline-none focus:border-pulse-cyan/50"
                  />
                </div>

                <div className="space-y-1.5 flex-1 min-w-[80px]">
                  <label className="text-[8px] font-display font-black text-white/30 uppercase tracking-widest ml-1">Points</label>
                  <input 
                    type="number"
                    placeholder="Auto"
                    value={localResults[p.userId]?.points || ''}
                    onChange={(e) => updateResult(p.userId, 'points', parseInt(e.target.value) || 0)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[12px] font-mono font-black text-white outline-none focus:border-white/20"
                  />
                </div>

                <button 
                  onClick={() => toggleWin(p.userId)}
                  className={`px-4 py-2 rounded-xl font-display font-black text-[9px] uppercase tracking-widest transition-all h-10 flex items-center gap-2 ${
                    localResults[p.userId]?.win 
                      ? 'bg-yellow-500 text-abyssal shadow-lg shadow-yellow-500/20' 
                      : 'bg-white/5 border border-white/10 text-white/30'
                  }`}
                >
                  <Crown size={14} className={localResults[p.userId]?.win ? 'text-abyssal' : 'text-white/20'} />
                  {localResults[p.userId]?.win ? 'Winner' : 'Lose'}
                </button>
              </div>
            </div>

            {/* Display standing screenshot details if available */}
            {pSub && (
              <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.01] p-3 rounded-xl border border-white/[0.03]">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => setPreviewImageUrl(pSub.screenshotUrl)}
                    className="w-16 h-10 rounded-lg bg-black/40 overflow-hidden border border-white/10 hover:border-pulse-cyan/50 cursor-pointer relative group transition-all shrink-0"
                  >
                    <img src={pSub.screenshotUrl} alt="Claim summary" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Eye size={12} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-display font-black uppercase px-2 py-0.5 rounded tracking-wider ${
                        pSub.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        pSub.status === 'verified' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {pSub.status === 'pending' ? 'Pending Verification' : pSub.status === 'verified' ? 'Verified Claim' : 'Claim Rejected'}
                      </span>
                      <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                        Place: <span className="text-pulse-cyan font-black">#{pSub.claimedPosition}</span> • Kills: <span className="text-pulse-cyan font-black">{pSub.kills}</span>
                      </span>
                    </div>
                    {pSub.additionalNotes && (
                      <p className="text-[10px] text-white/30 italic mt-0.5 max-w-[240px] truncate">
                        "{pSub.additionalNotes}"
                      </p>
                    )}
                  </div>
                </div>

                {pSub.status === 'pending' && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={async () => {
                        updateResult(p.userId, 'kills', pSub.kills);
                        // Points formula: Kills * 10 + (Winner ? 100 : 0)
                        const isWin = pSub.claimedPosition === 1;
                        const points = pSub.kills * 10 + (isWin ? 100 : 0);
                        updateResult(p.userId, 'points', points);
                        if (isWin && !localResults[p.userId]?.win) {
                          toggleWin(p.userId);
                        }

                        try {
                          const subRef = doc(db, 'match_submissions', pSub.id);
                          await updateDoc(subRef, {
                            status: 'verified',
                            verifiedAt: serverTimestamp()
                          });
                          feedbackService.showSuccess(`Claim details copied & verified for ${p.inGameName}!`);
                        } catch (err: any) {
                          console.error(err);
                          feedbackService.showError(err, { fallback: "Failed to verify claim." });
                        }
                      }}
                      className="px-3 py-1.5 bg-pulse-cyan hover:bg-pulse-cyan/90 text-abyssal font-display font-black text-[9px] uppercase tracking-wider rounded-lg transition-all"
                    >
                      Verify & Apply
                    </button>
                    <button
                      onClick={async () => {
                        const reason = prompt("Enter rejection reason:") || "Invalid screenshot match";
                        try {
                          const subRef = doc(db, 'match_submissions', pSub.id);
                          await updateDoc(subRef, {
                            status: 'rejected',
                            rejectionReason: reason,
                            verifiedAt: serverTimestamp()
                          });
                          feedbackService.showSuccess(`Claim rejected for ${p.inGameName}.`);
                        } catch (err: any) {
                          console.error(err);
                          feedbackService.showError(err, { fallback: "Failed to reject claim." });
                        }
                      }}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-display font-black text-[9px] uppercase tracking-wider rounded-lg transition-all border border-red-500/10"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Full-size preview Modal overlay */}
      <AnimatePresence>
        {previewImageUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImageUrl(null)}
            className="fixed inset-0 z-[700] bg-black/95 flex flex-col items-center justify-center p-4"
          >
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <button 
                onClick={() => window.open(previewImageUrl, '_blank')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
              >
                Open Original
              </button>
              <button 
                onClick={() => setPreviewImageUrl(null)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <img src={previewImageUrl} alt="Full Screenshot" className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/10 shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'chats' | 'profile' | 'leaderboard' | 'shop'>('home');
  const [direction, setDirection] = useState(0);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const toast = null;
  const setToast = (t: { message: string; type: 'success' | 'error' } | null) => {
    if (!t) return;
    if (t.type === 'success') {
      feedbackService.showSuccess(t.message);
    } else {
      feedbackService.showError(t.message);
    }
  };

  const alert = (message: string) => {
    const msg = message.toLowerCase();
    const isSuccess = msg.includes('success') || 
                      msg.includes('complete') || 
                      msg.includes('posted') || 
                      msg.includes('forged') || 
                      msg.includes('deployed') || 
                      msg.includes('sent') || 
                      msg.includes('wipe') || 
                      msg.includes('unlocked') || 
                      msg.includes('joined') || 
                      msg.includes('updated') ||
                      msg.includes('purged') ||
                      msg.includes('repaired') ||
                      msg.includes('endorsed');

    const isWarning = msg.includes('restricted') ||
                      msg.includes('cannot') ||
                      msg.includes('unauthorized') ||
                      msg.includes('please') ||
                      msg.includes('must') ||
                      msg.includes('already') ||
                      msg.includes('no bots') ||
                      msg.includes('no users');

    if (isSuccess) {
      feedbackService.showSuccess(message);
    } else if (isWarning) {
      feedbackService.showWarning(message);
    } else {
      feedbackService.showInfo(message);
    }
  };
  const [soundEnabled, setSoundEnabled] = useState(soundService.isEnabled());
  const [masterVolume, setMasterVolume] = useState(soundService.getMasterVolume());

  const TABS: ('chats' | 'leaderboard' | 'home' | 'shop' | 'profile')[] = ['chats', 'leaderboard', 'home', 'shop', 'profile'];
  const handleTabChange = (tab: any) => {
    const nextIndex = TABS.indexOf(tab);
    const currentIndex = TABS.indexOf(activeTab as any);
    if (nextIndex === currentIndex) return;
    
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(tab);
    soundService.playNavigation();
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleSwipe = (dir: 'left' | 'right') => {
    const currentIndex = TABS.indexOf(activeTab as any);
    if (dir === 'left' && currentIndex < TABS.length - 1) {
      handleTabChange(TABS[currentIndex + 1]);
    } else if (dir === 'right' && currentIndex > 0) {
      handleTabChange(TABS[currentIndex - 1]);
    }
  };

  useEffect(() => {
    // Global click sound for buttons
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a')) {
        soundService.playClick();
      }
    };
    
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Legacy toast timer removed in favor of FeedbackToast and FeedbackService

  const [chatCategory, setChatCategory] = useState<'messages' | 'groups'>('messages');
  const [selectedGame, setSelectedGame] = useState<'freefire' | 'bgmi'>('freefire');
  const [searchQuery, setSearchQuery] = useState('');
  const [homeSubTab, setHomeSubTab] = useState<'teams' | 'players'>('teams');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [userCoins, setUserCoins] = useState(0);
  const [userPinkDiamonds, setUserPinkDiamonds] = useState(0);
  const [userBlueDiamonds, setUserBlueDiamonds] = useState(0);
  const [userMatches, setUserMatches] = useState(0);
  const [userWins, setUserWins] = useState(0);
  const [userKdRatio, setUserKdRatio] = useState(0);
  const [userHeadshots, setUserHeadshots] = useState(0);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'reports' | 'tournaments' | 'tasks' | 'system' | 'logos' | 'broadcast' | 'shop' | 'banners' | 'badges' | 'roles'>('users');
  const [tourUploadMode, setTourUploadMode] = useState<'gallery' | 'url'>('url');
  const [shopUploadMode, setShopUploadMode] = useState<'gallery' | 'url'>('gallery');
  const [bannerUploadMode, setBannerUploadMode] = useState<'gallery' | 'url'>('gallery');
  
  const [newTourFile, setNewTourFile] = useState<File | null>(null);
  const [newShopFile, setNewShopFile] = useState<File | null>(null);
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);

  const [isUploadingTour, setIsUploadingTour] = useState(false);
  const [isUploadingShop, setIsUploadingShop] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  
  // Banner Form State
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
  const [newBannerLink, setNewBannerLink] = useState('');
  const [newBannerAction, setNewBannerAction] = useState('Explore');
  const [allBanners, setAllBanners] = useState<any[]>([]);

  // Shop Form State
  const [newShopName, setNewShopName] = useState('');
  const [newShopPrice, setNewShopPrice] = useState('');
  const [newShopCurrency, setNewShopCurrency] = useState<'coins' | 'pink' | 'blue'>('coins');
  const [newShopRarity, setNewShopRarity] = useState('Rare');
  const [allShopItems, setAllShopItems] = useState<any[]>([]);

  const [allLogos, setAllLogos] = useState<Logo[]>([]);
  const [newLogoName, setNewLogoName] = useState('');
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const [newLogoPrice, setNewLogoPrice] = useState<number>(0);
  const [newLogoCurrency, setNewLogoCurrency] = useState<'gold' | 'pink' | 'blue'>('gold');
  const [isNewLogoPremium, setIsNewLogoPremium] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadStep, setUploadStep] = useState<'processing' | 'uploading' | 'saving' | 'done'>('uploading');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoUploadMode, setLogoUploadMode] = useState<'gallery' | 'url'>('gallery');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editCoins, setEditCoins] = useState<string>('');
  const [editPink, setEditPink] = useState<string>('');
  const [editBlue, setEditBlue] = useState<string>('');
  const [editKd, setEditKd] = useState<string>('');
  const [editKills, setEditKills] = useState<string>('');
  const [editMatches, setEditMatches] = useState<string>('');
  const [editWins, setEditWins] = useState<string>('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allReports, setAllReports] = useState<any[]>([]);
  const [discoverPlayers, setDiscoverPlayers] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [viewingGameTournaments, setViewingGameTournaments] = useState<'freefire' | 'bgmi' | null>(null);
  const [isPrizePoolModalOpen, setIsPrizePoolModalOpen] = useState(false);
  const [isJoinTournamentModalOpen, setIsJoinTournamentModalOpen] = useState(false);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [screenshotTournamentId, setScreenshotTournamentId] = useState<string>('');
  const [screenshotTournamentTitle, setScreenshotTournamentTitle] = useState<string>('');
  
  // New Tournament Form State
  const [newTourTitle, setNewTourTitle] = useState('');
  const [newTourPrize, setNewTourPrize] = useState('');
  const [newTourFee, setNewTourFee] = useState('');
  const [newTourKill, setNewTourKill] = useState('');
  const [newTourType, setNewTourType] = useState<'Solo' | 'Duo' | 'Squad'>('Solo');
  const [newTourMap, setNewTourMap] = useState('');
  const [newTourStartTime, setNewTourStartTime] = useState('');
  const [newTourMaxPlayers, setNewTourMaxPlayers] = useState('');
  const [newTourShortDesc, setNewTourShortDesc] = useState('');
  const [newTourFullDesc, setNewTourFullDesc] = useState('');
  const [newTourGame, setNewTourGame] = useState<'freefire' | 'bgmi'>('freefire');
  const [newTourImageUrl, setNewTourImageUrl] = useState('');
  
  // Join Flow State
  const [joinInGameName, setJoinInGameName] = useState('');
  const [joinLevel, setJoinLevel] = useState('');
  const [joinUID, setJoinUID] = useState('');
  const [isJoinProcessing, setIsJoinProcessing] = useState(false);

  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminSelectedBadgeFilter, setAdminSelectedBadgeFilter] = useState<'all' | 'esports' | 'mod' | 'verified'>('all');
  const [reportFilter, setReportFilter] = useState('all');
  const [ownReportCount, setOwnReportCount] = useState(0);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showTaskToast, setShowTaskToast] = useState(false);
  const [joinedTeamIds, setJoinedTeamIds] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [scoringTournament, setScoringTournament] = useState<Tournament | null>(null);
  const [isScoringModalOpen, setIsScoringModalOpen] = useState(false);
  const [scoringResults, setScoringResults] = useState<Record<string, { kills: number, points: number, win: boolean }>>({});
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [followedTeamIds, setFollowedTeamIds] = useState<string[]>([]);
  const [followedPlayerIds, setFollowedPlayerIds] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isMyTeamsListOpen, setIsMyTeamsListOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [earningTasks, setEarningTasks] = useState<any[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  
  // Admin Task Form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskRewardAmount, setNewTaskRewardAmount] = useState('');
  const [newTaskRewardType, setNewTaskRewardType] = useState<'coins' | 'pinkDiamonds' | 'blueDiamonds'>('coins');
  const [isNewTaskActive, setIsNewTaskActive] = useState(true);
  const [isSavingTask, setIsSavingTask] = useState(false);

  const [playerStatus, setPlayerStatus] = useState<'available' | 'in-team' | 'busy'>('available');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [userHiddenBadges, setUserHiddenBadges] = useState<string[]>([]);
  const [isBadgeDropdownOpen, setIsBadgeDropdownOpen] = useState(false);
  
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportTargetName, setReportTargetName] = useState('');
  const [selectedReportReasons, setSelectedReportReasons] = useState<string[]>([]);
  
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  const [conversations, setConversations] = useState<ChatThread[]>([]);
  const [activePrivateChat, setActivePrivateChat] = useState<ChatThread | null>(null);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  const [isPrivateChatOpen, setIsPrivateChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<any[]>([]);
  const [leaderboardCategory, setLeaderboardCategory] = useState<'kills' | 'wins' | 'points'>('points');
  const [leaderboardGame, setLeaderboardGame] = useState<'freefire' | 'bgmi' | 'global'>('global');

  // Leaderboard Data Fetching
  useEffect(() => {
    if (!isLoggedIn) return;

    const q = query(
      collection(db, 'leaderboards'),
      where('game', '==', leaderboardGame),
      where('category', '==', leaderboardCategory),
      orderBy('score', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const entries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeaderboardEntries(entries);
    }, (err) => handleFirestoreError(err, 'list', 'leaderboards'));

    return () => unsub();
  }, [isLoggedIn, leaderboardGame, leaderboardCategory]);

  // Task System Data
  useEffect(() => {
    if (!isLoggedIn) return;
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const ts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEarningTasks(ts);
    }, (err) => handleFirestoreError(err, 'list', 'tasks'));
    return () => unsub();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!user || !isLoggedIn) return;
    const q = query(collection(db, 'user_tasks'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const ids = snap.docs.map(doc => doc.data().taskId);
      setCompletedTaskIds(ids);
    }, (err) => handleFirestoreError(err, 'list', 'user_tasks'));
    return () => unsub();
  }, [user, isLoggedIn]);

  const [userName, setUserName] = useState('');
  const [fullName, setFullName] = useState('');
  const [ingameName, setIngameName] = useState('');
  const [preferredGame, setPreferredGame] = useState<'freefire' | 'bgmi'>('freefire');
  const [age, setAge] = useState<number>(0);
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userNumericId, setUserNumericId] = useState<number | null>(null);
  const [userFollowersCount, setUserFollowersCount] = useState(0);
  const [userEndorsements, setUserEndorsements] = useState<Record<string, number>>({});
  const [userBio, setUserBio] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [userProfileLogo, setUserProfileLogo] = useState('');
  const [userTags, setUserTags] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [userGameplayRole, setUserGameplayRole] = useState('');
  const [userFavoriteGame, setUserFavoriteGame] = useState('');
  const [purchasedLogos, setPurchasedLogos] = useState<string[]>([]);
  const [isLogoPickerOpen, setIsLogoPickerOpen] = useState(false);
  const [logoTarget, setLogoTarget] = useState<'team' | 'profile'>('profile');
  const [tempLogoUrl, setTempLogoUrl] = useState('');

  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  
  const [teamsList, setTeamsList] = useState<Team[]>(INITIAL_TEAMS);
  
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamBio, setNewTeamBio] = useState('');
  const [newTeamTags, setNewTeamTags] = useState<string[]>([]);


  // Monitor Reports for Current User
  useEffect(() => {
    if (!user) {
      setOwnReportCount(0);
      setIsFlagged(false);
      setIsRestricted(false);
      return;
    }
    
    const unsub = onSnapshot(
      query(collection(db, 'reports'), where('reportedId', '==', user.uid)),
      (snapshot) => {
        const count = snapshot.size;
        setOwnReportCount(count);
        setIsFlagged(count >= 2);
        setIsRestricted(count >= 5);
      },
      (err) => handleFirestoreError(err, 'list', 'reports')
    );
    
    return () => unsub();
  }, [user]);

  // Fetch Team Members when a team is selected
  useEffect(() => {
    if (!selectedTeamId) {
      setTeamMembers([]);
      return;
    }

    const unsub = onSnapshot(
      query(collection(db, 'memberships'), where('teamId', '==', selectedTeamId)),
      async (snapshot) => {
        try {
          const membersData = await Promise.all(
            snapshot.docs.map(async (mDoc) => {
              const mData = mDoc.data();
              const uDoc = await getDoc(doc(db, 'users', mData.userId));
              const uData = uDoc.data();
              return {
                id: mDoc.id,
                userId: mData.userId,
                role: mData.role,
                name: uData?.name || 'Unknown Player',
                avatar: uData?.avatar || '',
                ingameName: uData?.ingameName || '',
                bio: uData?.bio || ''
              };
            })
          );
          setTeamMembers(membersData);
        } catch (err) {
          console.error("Error fetching members:", err);
        }
      },
      (err) => handleFirestoreError(err, 'list', 'memberships')
    );

    return () => unsub();
  }, [selectedTeamId]);

  useEffect(() => {
    if (!isLoggedIn) {
      setDiscoverPlayers([]);
      return;
    }
    const q = query(
      collection(db, 'users'), 
      where('profileCompleted', '==', true),
      where('playerStatus', '==', 'available')
    );
    return onSnapshot(q, (snap) => {
      const players = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => p.type !== 'bot' && !p.isBot);
      setDiscoverPlayers(players);
    }, (err) => handleFirestoreError(err, 'list', 'users'));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isAdminUser || !isAdminDashboardOpen) return;

    const usersUnsub = onSnapshot(collection(db, 'users'), (snap) => {
      const all = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => u.type !== 'bot' && !u.isBot);
      setAllUsers(all);
    }, (err) => {
      logAppError('User Management', err, 'Check Firestore rules for the users collection and ensure indexes are built.');
      handleFirestoreError(err, 'list', 'users');
    });

    const reportsUnsub = onSnapshot(collection(db, 'reports'), (snap) => {
      setAllReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'reports'));

    return () => {
      usersUnsub();
      reportsUnsub();
    };
  }, [isAdminUser, isAdminDashboardOpen]);

  useEffect(() => {
    if (!isLoggedIn) {
      setTournaments([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'tournaments'), (snap) => {
      setTournaments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament)));
    }, (err) => handleFirestoreError(err, 'list', 'tournaments'));
    return () => unsub();
  }, [isLoggedIn]);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsLoggedIn(!!u);
      setIsAuthReady(true);
      if (u) {
        if (u.email && isSuperAdmin(u.email)) {
          setIsAdminUser(true);
        } else {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', u.uid));
            setIsAdminUser(adminDoc.exists());
          } catch (e) {
            console.error("Error checking admin:", e);
            setIsAdminUser(false);
          }
        }
      } else {
        setIsAdminUser(false);
      }
    });
  }, []);

  // Synchronize isAdminUser with the access_admin_panel RBAC permission
  useEffect(() => {
    if (user) {
      setIsAdminUser(hasPermission(userRole, 'access_admin_panel'));
    } else {
      setIsAdminUser(false);
    }
  }, [user, userRole]);

  // Notifications Listener for Unread Badge Count
  useEffect(() => {
    if (!isLoggedIn || !user) {
      setUnreadNotificationCount(0);
      return;
    }

    const unsubscribeUnread = NotificationService.listenToUnreadCount(user.uid, (count) => {
      setUnreadNotificationCount(count);
    });

    return () => {
      unsubscribeUnread();
    };
  }, [isLoggedIn, user]);

  // Conversations Listener
  useEffect(() => {
    if (!isLoggedIn || !user) {
      setConversations([]);
      return;
    }

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastTimestamp', 'desc')
    );

    const unsubscribeChats = onSnapshot(chatsQuery, async (snap) => {
      const chatThreads = (await Promise.all(
        snap.docs.map(async (chatDoc) => {
          const data = chatDoc.data() as ChatThread;
          const otherUserId = data.participants.find(p => p !== user.uid);
          let otherUser = null;
          if (otherUserId === SUPPORT_AI_ID) {
            otherUser = SUPPORT_AI_USER;
          } else if (otherUserId) {
            const uDoc = await getDoc(doc(db, 'users', otherUserId));
            otherUser = { id: otherUserId, ...uDoc.data() };
          }
          return { id: chatDoc.id, ...data, otherUser };
        })
      )) as ChatThread[];

      // Ensure AI Support is always in the list
      const aiThreadId = `support_ai_${user.uid}`;
      const hasAiThread = chatThreads.some(t => t.id === aiThreadId);
      
      if (!hasAiThread) {
        // Create a local virtual thread if it doesn't exist yet in Firestore
        // This will allow it to show up in the UI immediately
        const aiWelcomeMessage = isAdminUser
          ? 'Hello Operator! I am your Support AI Auditor. I can now assist with platform oversight. Ask me to: list system errors & bugs, identify the most reported users, or summarize platform stability directly in this chat!'
          : 'Hello! I am your Support AI. How can I help you today?';

        const aiThread: ChatThread = {
          id: aiThreadId,
          participants: [user.uid, SUPPORT_AI_ID],
          lastMessage: aiWelcomeMessage,
          lastTimestamp: serverTimestamp(),
          lastSenderId: SUPPORT_AI_ID,
          otherUser: SUPPORT_AI_USER,
          unreadCount: { [user.uid]: 0 }
        };
        chatThreads.unshift(aiThread);
      }

        // Ensure last message sound plays if it's from another user
        if (chatThreads.length > 0) {
          const latestMsgThread = chatThreads[0];
          if (latestMsgThread.lastSenderId !== user.uid && latestMsgThread.lastTimestamp) {
            // Check if this is a new message (approximate check using timestamp)
            const msgTime = latestMsgThread.lastTimestamp.toMillis ? latestMsgThread.lastTimestamp.toMillis() : 0;
            if (Date.now() - msgTime < 5000) {
              soundService.playMessageReceived();
            }
          }
        }

      setConversations(chatThreads);
    }, (err) => handleFirestoreError(err, 'list', 'chats'));

    return () => unsubscribeChats();
  }, [isLoggedIn, user, isAdminUser]);

  // Private Messages Listener
  useEffect(() => {
    if (!isLoggedIn || !user || !activePrivateChat) {
      setPrivateMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, 'chats', activePrivateChat.id, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setPrivateMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => handleFirestoreError(err, 'list', `chats/${activePrivateChat.id}/messages`));

    // Mark as read logic could go here
    if (activePrivateChat.unreadCount && activePrivateChat.unreadCount[user.uid] > 0) {
      const chatRef = doc(db, 'chats', activePrivateChat.id);
      updateDoc(chatRef, {
        [`unreadCount.${user.uid}`]: 0
      }).catch(console.error);
    }

    return () => unsubscribeMessages();
  }, [isLoggedIn, user, activePrivateChat]);

  const handleStartPrivateChat = async (targetUser: any) => {
    if (!user || user.uid === targetUser.id) return;

    const chatId = [user.uid, targetUser.id].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    const threadData: ChatThread = {
      id: chatId,
      participants: [user.uid, targetUser.id],
      lastMessage: '',
      lastSenderId: '',
      lastTimestamp: serverTimestamp(),
      unreadCount: { [user.uid]: 0, [targetUser.id]: 0 },
      otherUser: targetUser
    };

    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        participants: threadData.participants,
        lastMessage: '',
        lastSenderId: '',
        lastTimestamp: serverTimestamp(),
        unreadCount: threadData.unreadCount
      });
    }

    setActivePrivateChat({ ...threadData, id: chatId, otherUser: targetUser });
    setIsPrivateChatOpen(true);
    setActiveTab('chats');
  };

  const handleFollowPlayer = async (targetPlayerId: string) => {
    if (!user || user.uid === targetPlayerId) return;
    const isFollowing = followedPlayerIds.includes(targetPlayerId);
    const followId = `${user.uid}_${targetPlayerId}`;
    const followDocRef = doc(db, 'user_follows', followId);
    const targetUserRef = doc(db, 'users', targetPlayerId);

    try {
      await runTransaction(db, async (transaction) => {
        const targetDoc = await transaction.get(targetUserRef);
        if (!targetDoc.exists()) return;
        const currentFollowers = targetDoc.data().followersCount || 0;

        if (isFollowing) {
          // Unfollow
          transaction.delete(followDocRef);
          transaction.update(targetUserRef, {
            followersCount: Math.max(0, currentFollowers - 1),
            updatedAt: serverTimestamp()
          });
          
          if (viewingUser && viewingUser.id === targetPlayerId) {
            setViewingUser(prev => prev ? { ...prev, followersCount: Math.max(0, (prev.followersCount || 0) - 1) } : null);
          }
        } else {
          // Follow
          transaction.set(followDocRef, {
            followerId: user.uid,
            followedId: targetPlayerId,
            timestamp: serverTimestamp()
          });
          transaction.update(targetUserRef, {
            followersCount: currentFollowers + 1,
            updatedAt: serverTimestamp()
          });

          if (viewingUser && viewingUser.id === targetPlayerId) {
            setViewingUser(prev => prev ? { ...prev, followersCount: (prev.followersCount || 0) + 1 } : null);
          }
        }
      });
      soundService.playSuccess();
    } catch (err) {
      console.error("Follow/Unfollow player failed:", err);
      handleFirestoreError(err, 'write', 'user_follows');
    }
  };

  const handleSendPrivateMessage = async () => {
    if (!chatMessage.trim() || !user || !activePrivateChat) return;

    const text = chatMessage.trim();
    const chatId = activePrivateChat.id;
    const targetUserId = activePrivateChat.participants.find(p => p !== user.uid);
    const isAiChat = targetUserId === SUPPORT_AI_ID;
    
    setChatMessage('');

    try {
      soundService.playMessageSent();
      const batch = writeBatch(db);
      
      // Ensure the chat document exists (critical for AI thread which might be virtual)
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef).catch(err => {
        handleFirestoreError(err, 'get', `chats/${chatId}`);
        throw err;
      });
      
      if (!chatSnap.exists()) {
        batch.set(chatRef, {
          id: chatId,
          participants: activePrivateChat.participants,
          lastMessage: text,
          lastSenderId: user.uid,
          lastTimestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
          unreadCount: { 
            [user.uid]: 0,
            [targetUserId as string]: isAiChat ? 0 : 1 
          }
        });
      } else {
        batch.update(chatRef, {
          lastMessage: text,
          lastSenderId: user.uid,
          lastTimestamp: serverTimestamp(),
          [`unreadCount.${targetUserId}`]: isAiChat ? 0 : increment(1)
        });
      }
      
      const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
      batch.set(messageRef, {
        text,
        senderId: user.uid,
        senderName: userName || user.displayName || 'Unknown',
        senderAvatar: userAvatar || user.photoURL || '',
        timestamp: serverTimestamp(),
        type: 'text'
      });

      await batch.commit().catch(err => {
        handleFirestoreError(err, 'write', `chats/${chatId}/messages`);
        throw err;
      });

      // AI Response Logic
      if (isAiChat) {
        try {
          // Collect history
          const history = privateMessages.map(m => ({
            role: (m.senderId === SUPPORT_AI_ID ? 'model' : 'user') as "model" | "user",
            parts: [{ text: m.text }]
          }));

          const aiReply = await handleAIResponse(user.uid, history, text);

          // Add AI reply to Firestore
          const replyBatch = writeBatch(db);
          const replyRef = doc(collection(db, 'chats', chatId, 'messages'));
          replyBatch.set(replyRef, {
            text: aiReply,
            senderId: SUPPORT_AI_ID,
            senderName: 'Support AI',
            senderAvatar: '',
            timestamp: serverTimestamp(),
            type: 'text'
          });

          replyBatch.update(chatRef, {
            lastMessage: aiReply,
            lastSenderId: SUPPORT_AI_ID,
            lastTimestamp: serverTimestamp(),
            // AI reply should increment user's unread count if they are not active
            [`unreadCount.${user.uid}`]: increment(1)
          });

          await replyBatch.commit().catch(err => {
            handleFirestoreError(err, 'write', `chats/${chatId}/ai_reply`);
            throw err;
          });
        } catch (aiErr) {
          console.error("AI response failed:", aiErr);
        }
      }
    } catch (err) {
      soundService.playError();
      console.error("Failed to send private message:", err);
    }
  };

  const [profileCompleted, setProfileCompleted] = useState(false);
  const [aiReportSummary, setAiReportSummary] = useState<any>(null);
  const [isAnalyzingReports, setIsAnalyzingReports] = useState(false);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);
  const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(false);

  // System Logs Listener
  useEffect(() => {
    if (isAdminUser && isAdminDashboardOpen && adminTab === 'system') {
      const unsub = onSnapshot(query(collection(db, 'system_logs')), (snap) => {
        setSystemLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, 'list', 'system_logs'));
      return () => unsub();
    }
  }, [isAdminUser, isAdminDashboardOpen, adminTab]);

  // Logos Listener (Admin)
  useEffect(() => {
    if (isAdminUser && isAdminDashboardOpen && adminTab === 'logos') {
      const unsub = onSnapshot(query(collection(db, 'logos'), orderBy('isActive', 'desc')), (snap) => {
        setAllLogos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Logo)));
      }, (err) => handleFirestoreError(err, 'list', 'logos'));
      return () => unsub();
    }
  }, [isAdminUser, isAdminDashboardOpen, adminTab]);

  // Shop Items Listener (Admin)
  useEffect(() => {
    if (isAdminUser && isAdminDashboardOpen && adminTab === 'shop') {
      const unsub = onSnapshot(query(collection(db, 'shop_items'), orderBy('createdAt', 'desc')), (snap) => {
        setAllShopItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, 'list', 'shop_items'));
      return () => unsub();
    }
  }, [isAdminUser, isAdminDashboardOpen, adminTab]);

  // Banners Listener (Admin)
  useEffect(() => {
    if (isAdminUser && isAdminDashboardOpen && adminTab === 'banners') {
      const unsub = onSnapshot(query(collection(db, 'banners'), orderBy('createdAt', 'desc')), (snap) => {
        setAllBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, 'list', 'banners'));
      return () => unsub();
    }
  }, [isAdminUser, isAdminDashboardOpen, adminTab]);

  // Announcements Listener (Admin)
  useEffect(() => {
    if (isAdminUser && isAdminDashboardOpen && adminTab === 'broadcast') {
      const unsub = onSnapshot(query(collection(db, 'announcements'), orderBy('timestamp', 'desc')), (snap) => {
        setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, 'list', 'announcements'));
      return () => unsub();
    }
  }, [isAdminUser, isAdminDashboardOpen, adminTab]);

  // Latest Announcement Listener (User)
  useEffect(() => {
    if (isLoggedIn && user) {
      const unsub = onSnapshot(query(collection(db, 'announcements'), orderBy('timestamp', 'desc'), limit(1)), (snap) => {
        if (!snap.empty) {
          const announcement = { id: snap.docs[0].id, ...snap.docs[0].data() };
          // Check if this is a new announcement since last seen (could use localStorage)
          const lastSeen = localStorage.getItem('last_announcement_id');
          if (lastSeen !== announcement.id) {
            setLatestAnnouncement(announcement);
            setShowAnnouncementPopup(true);
            localStorage.setItem('last_announcement_id', announcement.id);
          }
        }
      }, (err) => handleFirestoreError(err, 'list', 'announcements'));
      return () => unsub();
    }
  }, [isLoggedIn, user]);

  // Notification Setup
  useEffect(() => {
    if (isLoggedIn && user && messaging) {
      const setup = async () => {
        try {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              console.log("Notification permission granted.");
            }
          }
        } catch (err) {
          console.warn("FCM Permission request failed or blocked in iFrame:", err);
        }
      };
      setup();

      const unsubMessage = onMessage(messaging, (payload) => {
        console.log("Foreground message received:", payload);
        if (payload.notification) {
          setLatestAnnouncement({
            title: payload.notification.title,
            message: payload.notification.body,
            id: 'foreground_' + Date.now()
          });
          setShowAnnouncementPopup(true);
        }
      });
      return () => unsubMessage();
    }
  }, [isLoggedIn, user]);

  // AI Report Analysis Trigger
  useEffect(() => {
    if (isAdminUser && isAdminDashboardOpen && adminTab === 'reports' && allReports.length > 0 && !aiReportSummary) {
      const analyze = async () => {
        setIsAnalyzingReports(true);
        const summary = await analyzeReports(allReports);
        setAiReportSummary(summary);
        setIsAnalyzingReports(false);
      };
      analyze();
    }
  }, [isAdminUser, isAdminDashboardOpen, adminTab, allReports]);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [username, setUsername] = useState('');
  const [experience, setExperience] = useState('');

  const aiUserProfile = useMemo(() => ({
    name: userName,
    username: username,
    coins: userCoins,
    game: userFavoriteGame,
    experience: experience,
    tags: userTags
  }), [userName, username, userCoins, userFavoriteGame, experience, userTags]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Sync User Data from Firestore
  useEffect(() => {
    if (!user || !isLoggedIn) return;

    const userDocRef = doc(db, 'users', user.uid);
    return onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserName(data.name || '');
        setUsername(data.username || '');
        setFullName(data.fullName || '');
        setIngameName(data.ingameName || '');
        setPreferredGame(data.preferredGame || 'freefire');
        setAge(data.age || 0);
        setExperience(data.experience || '');
        setProfileCompleted(!!data.profileCompleted);
        setOnboardingStep(data.onboardingStep || 1);
        setUserBio(data.bio || '');
        setUserAvatar(data.avatar || DEFAULT_AVATAR_URL);
        setUserProfileLogo(data.profileLogo || DEFAULT_AVATAR_URL);
        setUserTags(data.tags || []);
        let resolvedRole = resolveUserRole(user?.email, data.role);
        if (resolvedRole === 'user' && isAdminUser) {
          resolvedRole = 'admin';
        }
        setUserRole(resolvedRole);
        const gRole = data.gameplayRole || (!['user', 'moderator', 'admin', 'verified_organizer', 'organizer'].includes(data.role) ? data.role : '') || '';
        setUserGameplayRole(gRole);
        setUserFavoriteGame(data.favoriteGame || '');
        setRecentMatches(data.recentMatches || []);
        setUserNumericId(data.numericId || null);
        setUserCoins(data.coins || 0);
        setUserPinkDiamonds(data.pinkDiamonds || 0);
        setUserBlueDiamonds(data.blueDiamonds || 0);
        setPlayerStatus(data.playerStatus || 'available');
        setPurchasedLogos(data.purchasedLogos || []);
        setUserEndorsements(data.endorsementCounts || {});
        setUserMatches(data.stats?.matchesPlayed || data.matches || 0);
        setUserWins(data.stats?.wins || data.wins || 0);
        setUserKdRatio(data.stats?.kdRatio || data.kdRatio || 0);
        setUserHeadshots(data.headshotPercentage || 0);
        setIsUserBanned(!!data.isBanned);
        setUserFollowersCount(data.followersCount || 0);
        setUserHiddenBadges(data.hiddenBadges || []);
        if (data.preferredGame) {
          setSelectedGame(data.preferredGame as 'freefire' | 'bgmi');
        }
      } else {
        // Create user doc if it doesn't exist (e.g. after Google Login)
        // For new users from Google, we start onboarding
        setDoc(userDocRef, {
          email: user.email || '',
          name: user.displayName?.split(' ')[0] || 'Player',
          fullName: user.displayName || 'Unnamed Player',
          avatar: user.photoURL || DEFAULT_AVATAR_URL,
          profileLogo: DEFAULT_AVATAR_URL,
          profileCompleted: false,
          onboardingStep: 1,
          coins: 1000,
          pinkDiamonds: 0,
          blueDiamonds: 0,
          stats: {
            matchesPlayed: 0,
            wins: 0,
            kdRatio: 0,
            kills: 0
          },
          matches: 0,
          wins: 0,
          kdRatio: 0,
          headshotPercentage: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }).catch(err => handleFirestoreError(err, 'write', `users/${user.uid}`));
      }
    }, (err) => handleFirestoreError(err, 'get', `users/${user.uid}`));
  }, [user, isLoggedIn]);

  // Sync Teams from Firestore
  useEffect(() => {
    // Listen to System Config for Updates
    const configRef = doc(db, 'system', 'config');
    return onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const config = snap.data();
        setSystemConfig(config);
        
        // Version Check
        if (config.latestVersionCode > APP_VERSION_CODE) {
          setShowUpdateModal(true);
        }
      } else {
        logAppError('System Configuration', new Error('Missing global config'), 'Initialize the system/config collection in Firestore with default app settings.');
      }
    }, (err) => {
      logAppError('System Configuration', err, 'Check Firestore security rules for system/config access.');
      console.warn("Could not fetch system config - likely not yet initialized.");
    });
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setTeamsList(INITIAL_TEAMS);
      return;
    }
    const teamsQuery = query(collection(db, 'teams'));
    return onSnapshot(teamsQuery, (snap) => {
      const teams = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          isUserLeader: data.leaderId === user?.uid
        };
      }) as Team[];
      setTeamsList([...INITIAL_TEAMS, ...teams]);
    }, (err) => handleFirestoreError(err, 'list', 'teams'));
  }, [user, isLoggedIn]);

  // Sync Memberships
  useEffect(() => {
    if (!user || !isLoggedIn) {
      setJoinedTeamIds([]);
      return;
    }

    const membershipQuery = query(collection(db, 'memberships'), where('userId', '==', user.uid));
    const unsubscribeFollows = onSnapshot(query(collection(db, 'follows'), where('userId', '==', user.uid)), (snap) => {
      setFollowedTeamIds(snap.docs.map(doc => doc.data().teamId));
    }, (err) => handleFirestoreError(err, 'list', 'follows'));

    const unsubscribePlayerFollows = onSnapshot(query(collection(db, 'user_follows'), where('followerId', '==', user.uid)), (snap) => {
      setFollowedPlayerIds(snap.docs.map(doc => doc.data().followedId));
    }, (err) => handleFirestoreError(err, 'list', 'user_follows'));

    const unsubscribeMemberships = onSnapshot(membershipQuery, (snap) => {
      setJoinedTeamIds(snap.docs.map(doc => doc.data().teamId));
    }, (err) => handleFirestoreError(err, 'list', 'memberships'));

    return () => {
      unsubscribeFollows();
      unsubscribePlayerFollows();
      unsubscribeMemberships();
    };
  }, [user, isLoggedIn]);

  const statusConfig = {
    available: { color: 'bg-green-500', label: 'Available', shadow: 'shadow-[0_0_10px_rgba(34,197,94,0.5)]' },
    'in-team': { color: 'bg-yellow-500', label: 'In Team', shadow: 'shadow-[0_0_10px_rgba(234,179,8,0.5)]' },
    busy: { color: 'bg-red-500', label: 'Busy', shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]' }
  };

  // --- Background Effects ---
  const GameBackground = ({ game }: { game: 'freefire' | 'bgmi' | null }) => {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Animated Gradient Base */}
        <motion.div 
          animate={{ 
            opacity: [0.03, 0.05, 0.03],
            scale: [1, 1.1, 1] 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute inset-0 transition-colors duration-1000 ${
            game === 'freefire' ? 'bg-fire-orange/5' : 
            game === 'bgmi' ? 'bg-tactical-green/5' : 
            'bg-pulse-purple/5'
          }`}
        />

        {/* Scanning Line (BGMI) */}
        {game === 'bgmi' && (
          <>
            {/* Tactical Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />
            
            {/* Corner Brackets */}
            <div className="absolute top-6 left-6 w-12 h-12 border-t border-l border-tactical-green/20" />
            <div className="absolute top-6 right-6 w-12 h-12 border-t border-r border-tactical-green/20" />
            <div className="absolute bottom-6 left-6 w-12 h-12 border-b border-l border-tactical-green/20" />
            <div className="absolute bottom-6 right-6 w-12 h-12 border-b border-r border-tactical-green/20" />

            {/* Tactical Smoke Layer */}
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.05, 0.1, 0.05],
                x: [-20, 20, -20]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-20 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_70%)]"
            />
            <motion.div 
              initial={{ translateY: '-100%' }}
            animate={{ translateY: '1000%' }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-tactical-green/20 to-transparent z-10"
          />
          </>
        )}

        {/* Ember Particles (Free Fire) */}
        {game === 'freefire' && (
          <div className="absolute inset-0">
            {/* Heat Haze Overlay */}
            <motion.div 
              animate={{ 
                opacity: [0.1, 0.2, 0.1],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-t from-fire-orange/20 via-fire-red/5 to-transparent mix-blend-screen"
            />
            {/* Particles */}
            {[...Array(25)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * 100 + '%', 
                  y: '110%', 
                  opacity: 0,
                  scale: Math.random() * 0.5 + 0.5
                }}
                animate={{ 
                  y: '-10%', 
                  opacity: [0, 1, 0.8, 0],
                  x: (Math.random() * 100) + (Math.random() * 20 - 10) + '%'
                }}
                transition={{ 
                  duration: Math.random() * 4 + 4, 
                  repeat: Infinity, 
                  delay: Math.random() * 10,
                  ease: "easeOut"
                }}
                className={`absolute w-1 h-1 rounded-full blur-[1px] ${i % 3 === 0 ? 'bg-fire-orange shadow-[0_0_8px_rgba(255,100,0,0.8)]' : 'bg-fire-red shadow-[0_0_6px_rgba(239,68,68,0.6)]'}`}
              />
            ))}
          </div>
        )}

        {/* Global Floating Particles (Neon) */}
        {!game && (
          <div className="absolute inset-0">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  y: [0, -100, 0],
                  x: [0, Math.random() * 50 - 25, 0],
                  opacity: [0, 0.3, 0]
                }}
                transition={{ 
                  duration: Math.random() * 10 + 10, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                style={{
                  left: Math.random() * 100 + '%',
                  top: Math.random() * 100 + '%',
                }}
                className={`absolute w-[2px] h-[2px] rounded-full blur-[1px] ${i % 2 === 0 ? 'bg-pulse-purple' : 'bg-pulse-cyan'}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const filteredTeams = useMemo(() => {
    return teamsList.filter(t => {
      const matchesSearch = t.game === selectedGame && t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilters = activeFilters.length === 0 || activeFilters.every(filter => t.tags?.includes(filter));
      return matchesSearch && matchesFilters;
    });
  }, [selectedGame, searchQuery, teamsList, activeFilters]);

  const filteredPlayers = useMemo(() => {
    return discoverPlayers.filter(p => {
      const matchesSearch = (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.username?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilters = activeFilters.length === 0 || activeFilters.every(filter => p.tags?.includes(filter));
      // Game filter for players: they might have a favoriteGame or preferredGame
      const matchesGame = p.preferredGame === selectedGame;
      return matchesSearch && matchesFilters && matchesGame;
    });
  }, [searchQuery, discoverPlayers, activeFilters, selectedGame]);

  if (showSplash || !isAuthReady) {
    return <SplashScreen />;
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-abyssal relative overflow-hidden font-sans">
      {/* Dynamic Background Effects */}
      <GameBackground game={activeTab === 'home' ? selectedGame : null} />

      {/* Banned Overlay */}
      <AnimatePresence>
        {isUserBanned && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black flex items-center justify-center p-8 text-center"
          >
            <div className="max-w-md">
              <div className="w-24 h-24 bg-red-500/10 border border-red-500/30 rounded-[32px] flex items-center justify-center text-red-500 mx-auto mb-8 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                <Ban size={48} />
              </div>
              <h1 className="text-4xl font-display font-black text-white tracking-tighter uppercase italic mb-4">Account Terminated</h1>
              <p className="text-white/40 text-sm leading-relaxed mb-10 font-medium uppercase tracking-widest">
                This account has been banned due to multiple violations of our community guidelines. This decision is permanent and cannot be reversed.
              </p>
              <button 
                onClick={() => signOut(auth)}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-display font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maintenance Mode Overlay */}
      <AnimatePresence>
        {systemConfig?.maintenanceMode && !isAdminUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[900] bg-[#0a0b1e] flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-pulse-purple/10 border border-pulse-purple/20 flex items-center justify-center mb-6 shadow-2xl animate-pulse">
              <Zap size={40} className="text-pulse-purple" />
            </div>
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-3">System Maintenance</h2>
            <p className="text-[11px] font-display font-medium text-white/40 uppercase tracking-[0.2em] max-w-xs leading-relaxed">
              Squad UP Arena is currently undergoing essential upgrades. We'll be back online in T-minus short.
            </p>
            <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-pulse-cyan animate-ping" />
              <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Awaiting Linkup</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Notice Banner */}
      <AnimatePresence>
        {systemConfig?.globalMessage && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`w-full overflow-hidden shrink-0 ${
              systemConfig.messageType === 'warning' ? 'bg-red-500/90' : 
              systemConfig.messageType === 'success' ? 'bg-green-500/90' : 
              'bg-pulse-purple/90'
            } backdrop-blur-md relative z-40`}
          >
            <div className="py-2.5 px-6 flex items-center justify-center gap-3">
              <Zap size={10} className="text-white animate-pulse" />
              <p className="text-[9px] font-display font-black text-white uppercase tracking-widest text-center truncate">
                {systemConfig.globalMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Feedback Toast Stack & Offline Banner */}
      <FeedbackToast />
      <OfflineBanner />

      {/* Screenshot Upload Modal for Match Standings */}
      <ScreenshotUploadModal 
        isOpen={isScreenshotModalOpen}
        onClose={() => setIsScreenshotModalOpen(false)}
        tournamentId={screenshotTournamentId}
        tournamentTitle={screenshotTournamentTitle}
        userId={user?.uid || ''}
        userInGameName={userName || 'Player'}
      />

      {/* Dynamic Avatar and Team Logo Library / Picker */}
      <LogoPicker
        isOpen={isLogoPickerOpen}
        onClose={() => setIsLogoPickerOpen(false)}
        onSelect={(urlOrId) => {
          if (logoTarget === 'profile') {
            setUserAvatar(urlOrId);
          } else {
            setTempLogoUrl(urlOrId);
            if (editingTeam) {
              setEditingTeam(prev => prev ? { ...prev, logo: urlOrId } : null);
            }
          }
          setIsLogoPickerOpen(false);
        }}
        userCoins={userCoins}
        userPinkDiamonds={userPinkDiamonds}
        userBlueDiamonds={userBlueDiamonds}
        purchasedLogos={purchasedLogos}
        userId={user?.uid || ''}
        currentLogoUrl={logoTarget === 'profile' ? (userAvatar || DEFAULT_AVATAR_URL) : (tempLogoUrl || editingTeam?.logo)}
        logoTarget={logoTarget}
      />

      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[200] bg-abyssal flex flex-col items-center justify-center px-8"
          >
            {/* Background Glows */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-pulse-purple/20 blur-[100px] rounded-full" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-pulse-cyan/20 blur-[100px] rounded-full" />
            
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 20 }}
              className="relative mb-12"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-pulse-purple to-pulse-cyan rounded-3xl rotate-12 flex items-center justify-center p-0.5 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
                <div className="w-full h-full bg-abyssal rounded-[22px] flex items-center justify-center -rotate-12">
                  <Gamepad2 size={40} className="text-white" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-pulse-cyan rounded-full flex items-center justify-center border-4 border-abyssal">
                <Lock size={12} className="text-abyssal" />
              </div>
            </motion.div>

            <div className="text-center mb-12">
              <h1 className="text-4xl font-display font-black text-white tracking-widest uppercase mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                Squad UP Arena
              </h1>
              <p className="text-white/40 text-[10px] font-display font-bold uppercase tracking-[0.3em]">
                Elite Esports Arena
              </p>
            </div>

            <div className="w-full max-w-xs space-y-4">
              <div className="space-y-3">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-pulse-cyan transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    placeholder="Email Address"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-white text-sm font-medium placeholder-white/20 outline-none focus:border-pulse-cyan/50 focus:bg-white/[0.05] transition-all"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-pulse-cyan transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-12 pr-12 text-white text-sm font-medium placeholder-white/20 outline-none focus:border-pulse-cyan/50 focus:bg-white/[0.05] transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-4 flex items-center text-white/20 hover:text-white/40 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (!userEmail || !password) {
                    soundService.playWarning();
                    alert("Please fill all fields");
                    return;
                  }
                  try {
                    await signInWithEmailAndPassword(auth, userEmail, password);
                    soundService.playSuccess();
                  } catch (err: any) {
                    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
                      try {
                        await createUserWithEmailAndPassword(auth, userEmail, password);
                        soundService.playSuccess();
                      } catch (signupErr: any) {
                        soundService.playError();
                        alert(signupErr.message);
                      }
                    } else {
                      soundService.playError();
                      alert(err.message);
                    }
                  }
                }}
                className="w-full py-4 bg-gradient-to-r from-pulse-purple to-pulse-cyan rounded-2xl text-white font-display font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-pulse-purple/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Enter Arena
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                <div className="relative flex justify-center text-[10px] font-display font-bold uppercase tracking-widest text-white/20"><span className="bg-abyssal px-4 uppercase">Direct Link</span></div>
              </div>

              <button 
                onClick={async () => {
                  try {
                    const provider = new GoogleAuthProvider();
                    await signInWithPopup(auth, provider);
                  } catch (err: any) {
                    alert(err.message);
                  }
                }}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white/60 font-display font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-white/10 hover:text-white transition-all shadow-inner"
              >
                <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4 grayscale group-hover:grayscale-0" />
                Sign in with Google
              </button>
            </div>

            <p className="absolute bottom-12 text-[9px] font-display font-bold text-white/10 uppercase tracking-widest">
              By entering you agree to Scrims Protocol
            </p>
          </motion.div>
        ) : !profileCompleted ? (
          <Onboarding 
            user={user} 
            step={onboardingStep} 
            onStepComplete={async (stepData) => {
              if (!user) return;
              try {
                let finalData = { ...stepData };
                // If finalizing, we need to generate numericId too
                if (stepData.profileCompleted && !userNumericId) {
                  const counterRef = doc(db, 'metadata', 'users');
                  const nextId = await runTransaction(db, async (trans) => {
                    const snap = await trans.get(counterRef);
                    let nid = 10000;
                    if (snap.exists()) nid = (snap.data().lastGeneratedId || 9999) + 1;
                    trans.set(counterRef, { lastGeneratedId: nid }, { merge: true });
                    return nid;
                  });
                  finalData.numericId = nextId;
                  finalData.bio = 'Elite gamer on Squad UP Arena';
                  finalData.playerStatus = 'available';
                }
                await updateDoc(doc(db, 'users', user.uid), {
                  ...finalData,
                  updatedAt: serverTimestamp()
                });
              } catch (err) {
                handleFirestoreError(err, 'update', `users/${user.uid}`);
              }
            }}
          />
        ) : (
          <motion.div
            key="app-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Top Header */}
      <AnimatePresence>
        {!(isPrivateChatOpen && activePrivateChat) && (
          <motion.header 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="flex items-center justify-between px-5 pt-6 pb-3 shrink-0 relative"
          >
            {/* Header Glow Accent */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] blur-[1px] transition-colors duration-1000 ${
              viewingGameTournaments === 'freefire' ? 'bg-fire-orange shadow-[0_0_15px_rgba(255,77,0,0.8)]' : 
              viewingGameTournaments === 'bgmi' ? 'bg-tactical-green shadow-[0_0_15px_rgba(34,197,94,0.8)]' : 
              'bg-pulse-purple shadow-[0_0_15px_rgba(168,85,247,0.8)]'
            }`} />

            <button 
              onClick={async () => {
                 if (!user) return;
                 setIsTasksModalOpen(true);
              }}
              type="button" 
              className="p-1.5 hover:bg-white/5 rounded-lg transition-all relative border border-transparent hover:border-white/10"
              title="Complete Tasks"
            >
              <ListChecks size={18} className={viewingGameTournaments === 'freefire' ? 'text-fire-orange' : viewingGameTournaments === 'bgmi' ? 'text-tactical-green' : 'text-pulse-purple'} />
              <AnimatePresence>
                {showTaskToast && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={`absolute top-10 left-0 whitespace-nowrap backdrop-blur-md text-white text-[9px] px-2.5 py-0.5 rounded-full font-black italic shadow-lg ${
                      viewingGameTournaments === 'freefire' ? 'bg-fire-orange/80' : 
                      viewingGameTournaments === 'bgmi' ? 'bg-tactical-green/80' : 
                      'bg-pulse-purple/80'
                    }`}
                  >
                    +200 COINS!
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            <div className="flex flex-col items-center">
              <h1 className={`text-[15px] uppercase font-display font-black tracking-[0.12em] leading-tight mb-0.5 transition-colors duration-1000 ${
                viewingGameTournaments === 'freefire' ? 'text-fire-orange drop-shadow-[0_0_10px_rgba(255,100,0,0.4)]' : 
                viewingGameTournaments === 'bgmi' ? 'text-tactical-green drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 
                'text-[#a0a5f7] drop-shadow-[0_0_8px_rgba(160,165,247,0.3)]'
              }`}>
                Squad UP Arena
              </h1>
              <div className="flex items-center gap-2">
                 {/* ... */}
                <div className="flex items-center gap-1">
                  <Coins size={9} className="text-yellow-400" />
                  <span className="text-[9px] uppercase font-display font-bold tracking-[0.05em] text-[#7186f1] leading-tight">
                    {userCoins.toLocaleString()}
                  </span>
                </div>
                <div className="w-px h-2 bg-white/10" />
                <div className="flex items-center gap-1">
                  <Gem size={9} className="text-pink-400" />
                  <span className="text-[9px] uppercase font-display font-bold tracking-[0.05em] text-[#7186f1] leading-tight">
                    {userPinkDiamonds.toLocaleString()}
                  </span>
                </div>
                <div className="w-px h-2 bg-white/10" />
                <div className="flex items-center gap-1">
                  <Gem size={9} className="text-blue-400" />
                  <span className="text-[9px] uppercase font-display font-bold tracking-[0.05em] text-[#7186f1] leading-tight">
                    {userBlueDiamonds.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => {
                  soundService.playSuccess();
                  setIsNotificationCenterOpen(true);
                }}
                className={`w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all relative ${isNotificationCenterOpen ? 'border-pulse-purple bg-pulse-purple/10' : ''}`}
                title="Notifications"
              >
                <Bell size={16} className={isNotificationCenterOpen ? 'text-white animate-pulse' : 'text-white/50 hover:text-white'} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-1 rounded-full bg-pulse-purple text-[8px] font-black font-mono text-white flex items-center justify-center border border-abyssal shadow-lg">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
              <button 
                type="button"
                onClick={() => setIsMyTeamsListOpen(true)}
                className={`w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all relative ${isMyTeamsListOpen ? 'border-pulse-purple bg-pulse-purple/10' : ''}`}
              >
                <Shield size={18} className={isMyTeamsListOpen ? 'text-white' : 'text-white/50'} />
                {/* Status Dot */}
                <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d0e2e] ${statusConfig[playerStatus].color} ${statusConfig[playerStatus].shadow}`} />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>


      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <motion.div
          className="flex h-full w-full"
          animate={{ x: `-${TABS.indexOf(activeTab) * 100}%` }}
          transition={{ type: "spring", stiffness: 450, damping: 40 }}
        >
          {TABS.map((tab) => (
            <div key={tab} className="w-full h-full flex-shrink-0 flex flex-col overflow-hidden px-6">
              <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-1 -mr-1 pb-32">
                {tab === 'home' ? (
                <div className="w-full flex flex-col">
                   {/* Conditional Content: Game Selection or Tournament List */}
               {!viewingGameTournaments ? (
                 <>
                   <div className="text-center mt-1 mb-3 shrink-0">
                     <h3 className="text-sm font-display font-black tracking-[0.2em] uppercase text-white/50">
                       Select Game
                     </h3>
                   </div>

                   {/* Game Selection */}
                   <div className="flex justify-center gap-6 mb-6 shrink-0">
                     <GameCard 
                       title={"FREE FIRE\nMAX"}
                       image="/freefire_logo.png"
                       isActive={selectedGame === 'freefire'}
                       onClick={() => {
                         setSelectedGame('freefire');
                         setViewingGameTournaments('freefire');
                       }}
                     />
                     <GameCard 
                       title="BGMI"
                       image="/bgmi_logo.png"
                       isActive={selectedGame === 'bgmi'}
                       onClick={() => {
                         setSelectedGame('bgmi');
                         setViewingGameTournaments('bgmi');
                       }}
                     />
                   </div>

                   {/* Sub-tabs Toggle */}
                   <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 mb-6 shadow-inner mx-auto max-w-[240px]">
                     <button 
                       onClick={() => setHomeSubTab('teams')}
                       className={`flex-1 py-2 rounded-lg font-display font-black text-[10px] uppercase tracking-widest transition-all ${homeSubTab === 'teams' ? (selectedGame === 'freefire' ? 'bg-fire-orange text-white' : 'bg-tactical-green text-white') : 'text-white/40 hover:text-white/60'}`}
                     >
                      Teams
                     </button>
                     <button 
                       onClick={() => setHomeSubTab('players')}
                       className={`flex-1 py-2 rounded-lg font-display font-black text-[10px] uppercase tracking-widest transition-all ${homeSubTab === 'players' ? (selectedGame === 'freefire' ? 'bg-fire-orange text-white' : 'bg-tactical-green text-white') : 'text-white/40 hover:text-white/60'}`}
                     >
                      Players
                     </button>
                   </div>

                   {/* Search & Filter Bar */}
                   <div className="flex gap-2 mb-6 shrink-0 relative z-20">
                     <div className="relative flex-1 group">
                       <div className={`absolute -inset-[1px] rounded-[18px] opacity-30 blur-[2px] group-focus-within:opacity-70 transition-all duration-1000 ${
                          selectedGame === 'freefire' ? 'bg-gradient-to-r from-fire-orange to-fire-red' : 
                          selectedGame === 'bgmi' ? 'bg-gradient-to-r from-tactical-green to-tactical-slate' : 
                          'bg-gradient-to-r from-pulse-cyan via-pulse-purple to-pulse-purple'
                       }`} />
                       <div className="relative flex items-center bg-[#0d0e2e]/60 backdrop-blur-md rounded-xl border border-white/5 px-3 py-2.5 overflow-hidden">
                         <Search size={16} className={`mr-2.5 shrink-0 transition-colors ${selectedGame === 'freefire' ? 'text-fire-orange/40' : selectedGame === 'bgmi' ? 'text-tactical-green/40' : 'text-white/40'}`} />
                         <input 
                           type="text"
                           placeholder={homeSubTab === 'teams' ? "Search Teams..." : "Search Players..."}
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="bg-transparent border-none focus:ring-0 text-white placeholder-white/20 w-full text-[13px] font-medium"
                         />
                       </div>
                     </div>
                     
                     <button 
                       onClick={() => setIsFilterModalOpen(true)}
                       className={`w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all shrink-0 border relative ${
                         activeFilters.length > 0 
                           ? 'bg-pulse-purple border-pulse-purple shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                           : 'bg-white/5 border-white/10 hover:bg-white/10'
                       }`}
                       title="Advanced Filters"
                     >
                       <Settings size={18} className={activeFilters.length > 0 ? "text-white" : "text-white/40"} />
                       {activeFilters.length > 0 && (
                         <div className="absolute -top-1 -right-1 w-4 h-4 bg-pulse-cyan rounded-full border-2 border-[#0d0e2e] flex items-center justify-center">
                           <span className="text-[8px] font-black text-abyssal">{activeFilters.length}</span>
                         </div>
                       )}
                     </button>

                     {homeSubTab === 'teams' && (
                       <button 
                         onClick={() => {
                           if (age < 13) {
                             alert("Restricted: You must be at least 13 years old to create a team.");
                             return;
                           }
                           setIsCreateModalOpen(true);
                           setTempLogoUrl('');
                         }}
                         className={`w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all shrink-0 ${
                           selectedGame === 'freefire' ? 'bg-fire-orange/20 border-fire-orange/40 hover:bg-fire-orange' : 
                           selectedGame === 'bgmi' ? 'bg-tactical-green/20 border-tactical-green/40 hover:bg-tactical-green' : 
                           'bg-pulse-purple/20 border-pulse-purple/40 hover:bg-pulse-purple'
                         } border`}
                         title="Create Team"
                       >
                         <Plus size={20} />
                       </button>
                     )}
                   </div>

                   {/* Content List (Teams or Players) */}
                   <div className="space-y-4">
                     <AnimatePresence mode="popLayout">
                       {homeSubTab === 'teams' ? (
                         filteredTeams.map((team) => (
                           <motion.div
                             key={team.id}
                             layout
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, scale: 0.95 }}
                             onClick={() => setSelectedTeamId(team.id)}
                             className="flex items-center justify-between bg-white/[0.03] p-3 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-all group"
                           >
                             <div className="flex items-center gap-3 text-left">
                               <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 p-2 overflow-hidden shrink-0 group-hover:border-pulse-purple/50 transition-all">
                                 {team.logo ? (
                                   <img 
                                     src={resolveTeamLogo(team.logo)} 
                                     alt={team.name}
                                     className="w-full h-full object-contain" 
                                     referrerPolicy="no-referrer"
                                   />
                                 ) : (
                                   <Shield size={20} className="text-white/20" />
                                 )}
                               </div>
                               <div className="min-w-0">
                                 <h5 className="text-[15px] font-display font-black text-white uppercase tracking-tight group-hover:text-pulse-cyan transition-colors truncate">
                                   {team.name}
                                 </h5>
                                 <div className="flex items-center gap-1.5 mt-0.5">
                                   <ArrowUpRight size={10} className="text-pulse-purple" />
                                   <span className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest truncate">
                                     {team.game === 'bgmi' ? 'BGMI SQUAD' : 'ARENA CLAN'}
                                   </span>
                                   <div className="w-1 h-1 rounded-full bg-white/10 mx-1" />
                                   <span className="text-[10px] font-display font-bold text-pulse-cyan uppercase tracking-widest truncate">
                                     {team.followers ? (team.followers >= 1000000 ? (team.followers/1000000).toFixed(1) + 'M' : team.followers >= 1000 ? (team.followers/1000).toFixed(1) + 'K' : team.followers) : 0} Followers
                                   </span>
                                 </div>
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-2">
                               <button
                                 onClick={async (e) => {
                                   e.stopPropagation();
                                   if (!user) return;
                                   const isFollowing = followedTeamIds.includes(team.id);
                                   try {
                                     if (isFollowing) {
                                       const follows = await getDocs(query(collection(db, 'follows'), where('userId', '==', user.uid), where('teamId', '==', team.id)));
                                       follows.forEach(async (m) => await deleteDoc(doc(db, 'follows', m.id)));
                                     } else {
                                       await addDoc(collection(db, 'follows'), {
                                         userId: user.uid,
                                         teamId: team.id,
                                         followedAt: serverTimestamp()
                                       });
                                     }
                                   } catch (err) {
                                     handleFirestoreError(err, 'write', 'follows');
                                   }
                                 }}
                                 className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center ${
                                   followedTeamIds.includes(team.id)
                                     ? 'bg-pulse-purple border-pulse-purple text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                     : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
                                 }`}
                                 title={followedTeamIds.includes(team.id) ? 'Unfollow' : 'Follow'}
                               >
                                 <Heart size={14} className={followedTeamIds.includes(team.id) ? 'fill-white' : ''} />
                               </button>

                               <div className="flex items-center gap-2 group/btn p-1 ml-1 shrink-0">
                                 <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover/btn:bg-pulse-purple/40 group-hover/btn:border-pulse-purple/50 transition-all bg-white/5">
                                   <ArrowUpRight size={14} className="text-white/40 group-hover/btn:text-white" />
                                 </div>
                               </div>
                             </div>
                           </motion.div>
                         ))
                       ) : (
                         filteredPlayers.map((player) => (
                           <motion.div
                             key={player.id}
                             layout
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, scale: 0.95 }}
                             onClick={() => setViewingUser(player)}
                             className="flex items-center justify-between bg-white/[0.03] p-3 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-all group"
                           >
                             <div className="flex items-center gap-3 text-left">
                               <div className="relative shrink-0">
                                 <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden group-hover:border-pulse-cyan/50 transition-all p-0.5`}>
                                   {player.avatar ? (
                                     <img 
                                       src={player.avatar} 
                                       alt={player.name}
                                       className="w-full h-full object-cover rounded-lg" 
                                       referrerPolicy="no-referrer"
                                     />
                                   ) : (
                                     <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-lg">
                                       <User size={20} className="text-white/20" />
                                     </div>
                                   )}
                                 </div>
                                 <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0d0e2e] bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]`} />
                               </div>
                               <div className="min-w-0">
                                 <h5 className="text-[15px] font-display font-black text-white uppercase tracking-tight group-hover:text-pulse-cyan transition-colors truncate flex items-center">
                                   <span className="truncate">{player.name}</span>
                                   <UserBadges player={player} />
                                 </h5>
                                 <div className="flex items-center gap-2 mt-0.5">
                                   <span className="text-[9px] font-mono font-black text-pulse-purple bg-pulse-purple/5 px-1.5 py-0.5 rounded border border-pulse-purple/10">ID: {player.numericId}</span>
                                   <div className="w-1 h-1 rounded-full bg-white/10" />
                                   <span className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest truncate">
                                     {player.kdRatio >= 3 ? 'Elite Pro' : 'Active Player'}
                                   </span>
                                 </div>
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-3 px-2">
                               <div className="flex flex-col items-end">
                                 <span className="text-[8px] font-display font-black text-white/20 uppercase tracking-widest">K/D</span>
                                 <span className="text-[11px] font-mono font-black text-pulse-cyan italic">{(player.stats?.kdRatio || player.kdRatio || 0).toFixed(2)}</span>
                               </div>
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleStartPrivateChat(player);
                                 }}
                                 className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-pulse-purple/20 hover:border-pulse-purple/30 transition-all"
                               >
                                 <MessageSquare size={16} />
                               </button>
                               <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5 group-hover:border-pulse-cyan/50 transition-all">
                                 <ArrowUpRight size={14} className="text-white/40 group-hover:text-white" />
                               </div>
                             </div>
                           </motion.div>
                         ))
                       )}

                       {(homeSubTab === 'teams' ? filteredTeams.length === 0 : filteredPlayers.length === 0) && (
                         <motion.div 
                           initial={{ opacity: 0 }} 
                           animate={{ opacity: 1 }}
                           className="py-12 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center opacity-30"
                         >
                            <Search size={32} className="mb-3" />
                            <p className="font-display font-black text-xs uppercase tracking-widest">No matching {homeSubTab} found</p>
                            <p className="text-[9px] font-display font-bold uppercase tracking-[0.2em] mt-2">Try adjusting your filters or search query</p>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                 </>
               ) : (
                 <div className="space-y-6">
                   <div className="flex items-center justify-between mb-2">
                     <button 
                       onClick={() => setViewingGameTournaments(null)}
                       className="flex items-center gap-2 text-[10px] font-display font-bold text-white/40 uppercase tracking-[0.2em] hover:text-white transition-all"
                     >
                       <ArrowLeft size={14} /> Back to Games
                     </button>
                     <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-display font-black text-pulse-cyan uppercase tracking-widest">
                       {viewingGameTournaments === 'freefire' ? 'Free Fire Max' : 'BGMI Mobile'}
                     </div>
                   </div>

                   <div className="space-y-4">
                     {tournaments.filter(t => t.game === viewingGameTournaments).map((tour) => (
                       <motion.div 
                         key={tour.id}
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="group relative bg-[#16173a] border border-white/5 rounded-2xl overflow-hidden hover:border-pulse-cyan/30 transition-all"
                       >
                         {/* Card Header/Banner */}
                         <div className="relative h-24 overflow-hidden">
                           <img src={tour.imageUrl} alt="" className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" />
                           <div className="absolute inset-0 bg-gradient-to-t from-[#16173a] via-[#16173a]/20 to-transparent" />
                           <div className="absolute top-4 left-4">
                             <span className="px-3 py-1 bg-pulse-purple/80 backdrop-blur-md rounded-full text-[9px] font-display font-black text-white uppercase tracking-widest">{tour.matchType}</span>
                           </div>
                         </div>

                         {/* Card Body */}
                         <div className="p-4 -mt-6 relative z-10">
                           <h4 className="text-lg font-display font-black text-white uppercase tracking-tight mb-4 group-hover:text-pulse-cyan transition-colors">{tour.title}</h4>
                           
                           <div className="grid grid-cols-2 gap-2 mb-3">
                             <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-0.5 text-center transition-all group-hover:bg-white/[0.08]">
                               <span className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest">Prize Pool</span>
                               <span className="text-[11px] font-display font-black text-pulse-cyan italic uppercase truncate w-full">💎 {tour.prizePool.toLocaleString()}</span>
                             </div>
                             <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-0.5 text-center transition-all group-hover:bg-white/[0.08]">
                               <span className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest">Entry Fee</span>
                               <span className="text-[11px] font-display font-black text-pulse-purple italic uppercase truncate w-full">💎 {tour.entryFee}</span>
                             </div>
                           </div>

                           <div className="flex items-center justify-between mb-5">
                             <div className="flex flex-col gap-1 flex-1 max-w-[140px]">
                               <div className="flex items-center gap-2 text-[9px] font-display font-bold text-white/40 uppercase tracking-widest">
                                 <Users size={12} />
                                 <span>{tour.currentPlayers} / {tour.maxPlayers} Slots</span>
                               </div>
                               <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${Math.min(100, (tour.currentPlayers / tour.maxPlayers) * 100)}%` }}
                                   className="h-full bg-gradient-to-r from-pulse-cyan to-pulse-purple"
                                 />
                               </div>
                             </div>
                             <div className="flex flex-col items-end">
                               <div className="flex items-center gap-1.5 text-[10px] font-display font-black text-white italic uppercase">
                                 <Clock size={12} className="text-pulse-cyan" />
                                 {tour.startTime?.toDate?.() ? tour.startTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00'}
                               </div>
                               <span className="text-[8px] font-display font-bold text-white/20 uppercase tracking-[0.2em] mt-0.5">{tour.map}</span>
                             </div>
                           </div>

                           <button 
                             disabled={tour.currentPlayers >= tour.maxPlayers || isRestricted}
                             onClick={() => {
                               setSelectedTournament(tour);
                               setIsJoinTournamentModalOpen(true);
                             }}
                             className={`w-full py-2.5 rounded-xl font-display font-black text-[10px] uppercase tracking-[.15em] transition-all active:scale-95 ${
                               tour.currentPlayers < tour.maxPlayers 
                                 ? 'bg-gradient-to-r from-pulse-cyan/80 to-pulse-purple/80 hover:from-pulse-cyan hover:to-pulse-purple text-white shadow-lg shadow-pulse-purple/10' 
                                 : 'bg-white/5 text-white/20 cursor-not-allowed'
                             }`}
                           >
                             {tour.currentPlayers < tour.maxPlayers ? 'Join Battle' : 'Full / Closed'}
                           </button>
                         </div>
                       </motion.div>
                     ))}

                     {tournaments.filter(t => t.game === viewingGameTournaments).length === 0 && (
                       <div className="py-24 flex flex-col items-center justify-center opacity-30">
                         <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-4">
                           <Trophy size={32} />
                         </div>
                         <p className="font-display font-black text-lg uppercase tracking-widest italic text-center leading-tight">No tournaments available right now</p>
                         <p className="text-[10px] font-display font-bold uppercase tracking-[.3em] mt-3 opacity-60">Check back later for reinforcements</p>
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          ) : tab === 'leaderboard' ? (
            <div className="flex-1 flex flex-col overflow-hidden pb-32">
              <div className="flex flex-col mb-6 pt-2 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter">
                    Hall of Fame
                  </h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                    <Sparkles size={12} className="text-pulse-cyan" />
                    <span className="text-[9px] font-display font-black text-white/50 uppercase tracking-widest leading-none">Global Ranks</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4 overflow-x-auto custom-scrollbar pb-1 no-swipe">
                  {(['global', 'freefire', 'bgmi'] as const).map((game) => (
                    <button
                      key={game}
                      onClick={() => setLeaderboardGame(game)}
                      className={`px-4 py-2 rounded-xl border text-[10px] font-display font-black uppercase tracking-widest transition-all shrink-0 ${
                        leaderboardGame === game ? 'bg-pulse-cyan text-abyssal border-pulse-cyan shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-white/5 border-white/10 text-white/40'
                      }`}
                    >
                      {game === 'global' ? 'All Worlds' : game === 'freefire' ? 'Free Fire' : 'BGMI'}
                    </button>
                  ))}
                </div>

                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                  {(['points', 'kills', 'wins'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setLeaderboardCategory(cat)}
                      className={`flex-1 py-2 rounded-lg text-[9px] font-display font-black uppercase tracking-widest transition-all ${
                        leaderboardCategory === cat ? 'bg-pulse-purple text-white shadow-lg' : 'text-white/30 hover:text-white/60'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar space-y-3">
                {leaderboardEntries.length > 0 ? (
                  leaderboardEntries.map((entry, index) => (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={entry.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30' :
                        index === 1 ? 'bg-gradient-to-r from-slate-300/10 to-transparent border-slate-300/20' :
                        index === 2 ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/20' :
                        'bg-white/[0.03] border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={`w-8 h-8 flex items-center justify-center font-display font-black italic rounded-lg text-[14px] ${
                            index === 0 ? 'text-yellow-400 bg-yellow-400/10' :
                            index === 1 ? 'text-slate-300 bg-slate-300/10' :
                            index === 2 ? 'text-orange-500 bg-orange-500/10' :
                            'text-white/20'
                          }`}>
                            #{index + 1}
                          </div>
                          {index === 0 && <Crown size={12} className="absolute -top-1.5 -right-1.5 text-yellow-400 drop-shadow-lg" />}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-white/5 p-0.5">
                            <img src={resolveAvatar(entry.userAvatar)} alt="" className="w-full h-full object-cover rounded-lg" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13px] font-display font-black text-white uppercase tracking-tight">{entry.userName}</span>
                            <span className="text-[8px] font-display font-bold text-white/30 uppercase tracking-[0.2em]">{entry.game?.toUpperCase() || 'GLOBAL'} RAID</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-[14px] font-mono font-black text-pulse-cyan italic">
                          {entry.score.toLocaleString()}
                        </span>
                        <span className="text-[8px] font-display font-bold text-white/20 uppercase tracking-widest">{leaderboardCategory}</span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                    <Trophy size={48} className="mb-4" />
                    <p className="font-display font-black text-sm uppercase tracking-widest text-center italic">Awaiting Champions</p>
                    <p className="text-[10px] font-display font-bold uppercase tracking-[0.3em] mt-2">Leaderboards refresh every 24h</p>
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'profile' ? (
            <div className="flex-1 flex flex-col overflow-y-auto pr-1 -mr-1 custom-scrollbar pt-4 pb-32">
              {/* Profile Header */}
              <div className="flex flex-col items-center mb-8 shrink-0">
                <div className="relative">
                  <div className={`absolute inset-0 blur-xl rounded-full scale-110 transition-colors duration-1000 ${userFavoriteGame === 'Free Fire' ? 'bg-fire-orange/30' : 'bg-pulse-purple/30'}`} />
                  <div className={`relative w-28 h-28 rounded-full border-4 p-1 bg-abyssal overflow-hidden transition-all duration-1000 group ${
                    userFavoriteGame === 'Free Fire' ? 'border-fire-orange shadow-[0_0_30px_rgba(255,100,0,0.4)]' : 'border-pulse-purple shadow-[0_0_30px_rgba(168,85,247,0.4)]'
                  }`}>
                    {userAvatar ? (
                      <img 
                        src={resolveAvatar(userAvatar)} 
                        alt="Avatar" 
                        className="w-full h-full object-cover rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <img 
                        src={DEFAULT_AVATAR_URL} 
                        alt="Default Avatar" 
                        className="w-full h-full object-cover rounded-full opacity-50"
                      />
                    )}
                    {/* Change Avatar Overlay */}
                    <button 
                      onClick={() => {
                        setLogoTarget('profile');
                        setIsLogoPickerOpen(true);
                      }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] cursor-pointer"
                    >
                      <Search size={20} className="text-white drop-shadow-lg" />
                    </button>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-pulse-cyan text-abyssal text-[10px] font-black px-3 py-1 rounded-full border-2 border-abyssal z-10">
                    LV. 68
                  </div>
                  {/* Status Dot */}
                  <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-4 border-abyssal ${statusConfig[playerStatus].color} ${statusConfig[playerStatus].shadow} z-10`} />
                </div>
                
                {isRestricted ? (
                  <div className="mt-4 px-6 py-2 bg-red-600 border border-red-400 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse">
                    <span className="text-[10px] font-display font-black text-white uppercase tracking-[0.2em]">ACCOUNT RESTRICTED</span>
                  </div>
                ) : isFlagged ? (
                   <div className="mt-4 px-6 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-full">
                    <span className="text-[10px] font-display font-black text-yellow-500 uppercase tracking-[0.2em]">PLAYER FLAGGED</span>
                  </div>
                ) : null}

                <div className="relative mt-4 flex items-center justify-center gap-1.5">
                  <h4 className={`text-2xl font-display font-black text-white tracking-tight transition-all duration-1000 flex items-center justify-center ${
                    userFavoriteGame === 'Free Fire' ? 'drop-shadow-[0_0_10px_rgba(255,100,0,0.4)] text-fire-orange' : 'drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                  }`}>
                    <span>{userName}</span>
                    <UserBadges player={{ name: userName, email: user?.email || '', role: userRole, followersCount: userFollowersCount, hiddenBadges: userHiddenBadges, stats: { kdRatio: userKdRatio, matchesPlayed: userMatches, wins: userWins } }} />
                  </h4>
                  
                  {/* Dropdown arrow for managing badges */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsBadgeDropdownOpen(!isBadgeDropdownOpen)}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white flex items-center justify-center animate-pulse"
                      title="Manage Badges"
                    >
                      <ChevronDown size={14} className={`transform transition-transform duration-300 ${isBadgeDropdownOpen ? 'rotate-180 text-pulse-cyan' : ''}`} />
                    </button>

                    {/* Dropdown menu */}
                    <AnimatePresence>
                      {isBadgeDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-[98]" onClick={() => setIsBadgeDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute left-1/2 -translate-x-1/2 mt-2 w-72 bg-[#0c0d29] border border-white/10 rounded-2xl p-4 shadow-2xl z-[99] text-left"
                          >
                            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                              <span className="text-[10px] font-display font-black text-pulse-cyan uppercase tracking-widest flex items-center gap-1.5">
                                <Award size={12} />
                                Badge Control Panel
                              </span>
                              <span className="text-[9px] font-mono font-bold text-white/40">OWNED BADGES</span>
                            </div>

                            <p className="text-[9px] font-display font-bold text-white/40 uppercase tracking-wider mb-4 leading-relaxed">
                              Select which badges you want to show or hide on your profile card and in chats.
                            </p>

                            <div className="space-y-3.5">
                              {[
                                {
                                  id: 'esports',
                                  name: 'Verified Esports Player',
                                  symbol: 'E',
                                  bg: 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)] text-abyssal font-black',
                                  desc: 'Requires K/D >= 3.5, 50+ matches & 15+ wins.',
                                  earned: (userKdRatio >= 3.5 && userMatches >= 50 && userWins >= 15)
                                },
                                {
                                  id: 'mod',
                                  name: 'Official Moderator',
                                  symbol: 'M',
                                  bg: 'bg-gradient-to-r from-fuchsia-500 to-purple-600 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)] text-white font-black',
                                  desc: 'Granted to official platform operators and moderators.',
                                  earned: (user?.email?.toLowerCase().endsWith('@gmail.com') && (userRole === 'moderator' || user?.email?.toLowerCase() === 'blameboyop@gmail.com'))
                                },
                                {
                                  id: 'verified',
                                  name: 'Verified User (Blue Tick)',
                                  symbol: '✓',
                                  bg: 'bg-gradient-to-r from-cyan-400 to-blue-500 border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.5)] text-white font-bold text-[8px]',
                                  desc: 'Requires 500+ followers on Squad UP Arena.',
                                  earned: (userFollowersCount >= 500)
                                }
                              ].map((badgeConfig) => {
                                const isHidden = userHiddenBadges.includes(badgeConfig.id);
                                const isEarned = badgeConfig.earned;

                                return (
                                  <div 
                                    key={badgeConfig.id}
                                    className={`p-2.5 rounded-xl border flex items-start gap-3 transition-colors ${
                                      isEarned 
                                        ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]' 
                                        : 'bg-black/20 border-white/5 opacity-50'
                                    }`}
                                  >
                                    {/* Icon Column */}
                                    <div className="shrink-0 pt-0.5">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border leading-none shrink-0 ${badgeConfig.bg}`}>
                                        {badgeConfig.symbol}
                                      </div>
                                    </div>

                                    {/* Info Column */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-display font-black text-white uppercase tracking-tight truncate">
                                          {badgeConfig.name}
                                        </span>
                                        {!isEarned && (
                                          <span className="text-[8px] font-display font-black text-red-400 border border-red-500/20 px-1 py-0.5 rounded uppercase tracking-wider bg-red-500/5">
                                            Locked
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[9px] font-display font-bold text-white/30 uppercase tracking-wider mt-1 leading-relaxed">
                                        {badgeConfig.desc}
                                      </p>

                                      {/* Show/Hide controls for earned badges */}
                                      {isEarned && (
                                        <div className="flex items-center gap-3 mt-2">
                                          <button
                                            onClick={async () => {
                                              let newHidden = [...userHiddenBadges];
                                              if (isHidden) {
                                                newHidden = newHidden.filter(x => x !== badgeConfig.id);
                                              } else {
                                                newHidden.push(badgeConfig.id);
                                              }
                                              
                                              // Immediately save to Firestore
                                              if (user) {
                                                try {
                                                  await updateDoc(doc(db, 'users', user.uid), {
                                                    hiddenBadges: newHidden,
                                                    updatedAt: serverTimestamp()
                                                  });
                                                  setUserHiddenBadges(newHidden);
                                                  soundService.playSuccess();
                                                } catch (err) {
                                                  handleFirestoreError(err, 'update', `users/${user.uid}`);
                                                }
                                              }
                                            }}
                                            className={`px-2.5 py-1 rounded-lg border text-[8px] font-display font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                              isHidden 
                                                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' 
                                                : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                            }`}
                                          >
                                            {isHidden ? (
                                              <>
                                                <EyeOff size={10} />
                                                Hidden (Click to Show)
                                              </>
                                            ) : (
                                              <>
                                                <Eye size={10} />
                                                Visible (Click to Hide)
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex flex-col items-center mt-1">
                   {userNumericId && (
                     <span className="text-[11px] font-mono font-black text-pulse-purple italic tracking-widest mb-1 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">
                       ID: {userNumericId}
                     </span>
                   )}
                   <span className="text-[10px] font-display font-bold text-white/50 tracking-[0.2em] uppercase">{fullName}</span>
                   <span className="text-[10px] font-display font-bold text-pulse-cyan/80 tracking-[0.2em] uppercase">IGN: {ingameName}</span>
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-4 mt-3 mb-2">
                  {(['available', 'in-team', 'busy'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={async () => {
                        if (!user) return;
                        try {
                          await updateDoc(doc(db, 'users', user.uid), { playerStatus: status, updatedAt: serverTimestamp() });
                        } catch (err) {
                          handleFirestoreError(err, 'update', `users/${user.uid}`);
                        }
                      }}
                      className={`flex flex-col items-center gap-1 transition-all duration-300 ${playerStatus === status ? 'opacity-100 scale-110' : 'opacity-30 hover:opacity-50'}`}
                    >
                      <div className={`w-3 h-3 rounded-full ${statusConfig[status].color} ${playerStatus === status ? statusConfig[status].shadow : ''}`} />
                      <span className="text-[8px] font-display font-bold uppercase tracking-widest text-white">{statusConfig[status].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex bg-white/5 border border-white/10 rounded-2xl p-4 gap-4 mb-6 shrink-0">
                  <div className="flex-1 flex flex-col items-center border-r border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Coins size={12} className="text-yellow-400" />
                      <span className="text-[10px] font-display font-bold text-white/40 uppercase tracking-widest leading-none">Coins</span>
                    </div>
                    <span className="text-base font-display font-black text-white">{userCoins.toLocaleString()}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center border-r border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Gem size={12} className="text-pink-400" />
                      <span className="text-[10px] font-display font-bold text-white/40 uppercase tracking-widest leading-none">Pink</span>
                    </div>
                    <span className="text-base font-display font-black text-white">{userPinkDiamonds.toLocaleString()}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Gem size={12} className="text-blue-400" />
                      <span className="text-[10px] font-display font-bold text-white/40 uppercase tracking-widest leading-none">Blue</span>
                    </div>
                    <span className="text-base font-display font-black text-white">{userBlueDiamonds.toLocaleString()}</span>
                  </div>
                </div>

                {/* Endorsements Section */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 shrink-0 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                    <Sparkles size={40} className="text-pulse-purple" />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-[10px] font-display font-black text-pulse-cyan uppercase tracking-[0.2em]">Endorsements</h5>
                    <span className="text-[9px] font-display font-bold text-white/20 uppercase tracking-widest">Player Qualities</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'Clutch Player', icon: <Zap size={10} />, color: 'bg-fire-orange/20 text-fire-orange border-fire-orange/30' },
                      { key: 'Team Leader', icon: <Crown size={10} />, color: 'bg-pulse-purple/20 text-pulse-purple border-pulse-purple/30' },
                      { key: 'Great Communicator', icon: <MessageSquare size={10} />, color: 'bg-pulse-cyan/20 text-pulse-cyan border-pulse-cyan/30' }
                    ].map((badge) => {
                      const count = userEndorsements[badge.key] || 0;
                      return (
                        <div key={badge.key} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${badge.color} transition-all`}>
                          {badge.icon}
                          <span className="text-[9px] font-display font-black uppercase tracking-wider">{badge.key}</span>
                          <div className="w-[1px] h-3 bg-white/20 mx-1" />
                          <span className="text-[10px] font-mono font-black">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats Grid */}
               <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
                {[
                  { label: 'MATCHES', value: userMatches.toLocaleString(), color: 'purple', span: false },
                  { label: 'WINS', value: userWins.toLocaleString(), color: 'cyan', span: false },
                  { label: 'K/D RATIO', value: userKdRatio.toFixed(2), color: 'purple', span: false },
                  { label: 'HEADSHOTS', value: `${userHeadshots}%`, color: 'cyan', span: false },
                  { label: 'FOLLOWERS', value: userFollowersCount.toLocaleString(), color: 'purple', span: true }
                ].map((stat, idx) => (
                  <div key={idx} className={`bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/[0.08] transition-all ${stat.span ? 'col-span-2 bg-gradient-to-r from-pulse-cyan/5 to-pulse-purple/5' : ''}`}>
                    <motion.div 
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      className={`absolute bottom-0 left-0 h-[2px] w-full bg-pulse-${stat.color} origin-left transition-transform`} 
                    />
                    <span className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase mb-1">{stat.label}</span>
                    <span className="text-xl font-display font-black text-white">{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* Game Highlight */}
              <div className="mb-8 shrink-0">
                <span className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase mb-3 block">FAVORITE GAME</span>
                <div className="relative group">
                  <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-pulse-cyan to-pulse-purple opacity-40 blur-[4px]" />
                  <div className="relative bg-[#0d0e2e]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                      <img 
                        src={userFavoriteGame === 'Free Fire' ? '/freefire_logo.png' : '/bgmi_logo.png'} 
                        alt="Game" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h5 className="text-lg font-display font-black text-white tracking-tight leading-tight uppercase">
                        {userFavoriteGame || (selectedGame === 'freefire' ? 'FREE FIRE MAX' : 'BGMI Mobile')}
                      </h5>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-pulse-cyan animate-pulse" />
                        <span className="text-[10px] font-display font-bold text-pulse-cyan tracking-[0.2em] uppercase">ACTIVE PRO</span>
                      </div>
                    </div>
                    <div className="ml-auto">
                      <div className="text-right">
                        <p className="text-[10px] font-display font-bold text-white/30 tracking-widest uppercase">ROLE</p>
                        <p className="text-sm font-display font-black text-pulse-purple uppercase">{userGameplayRole || 'PLAYER'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio / About */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 shrink-0">
                <span className="text-[10px] font-display font-bold text-pulse-purple tracking-widest uppercase mb-2 block">ABOUT ME</span>
                <p className="text-sm text-white/70 leading-relaxed font-medium">
                  {userBio}
                </p>
              </div>

               {/* Playstyle Tags - Added as requested */}
              <div className="mb-8 shrink-0">
                <span className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase mb-4 block">PLAYSTYLE TAGS</span>
                <div className="flex flex-wrap gap-2">
                  {userTags.map((tag, idx) => (
                    <div 
                      key={idx} 
                      className={`px-3 py-1.5 rounded-full border border-pulse-cyan/30 bg-pulse-cyan/5 backdrop-blur-sm transition-all hover:scale-105 active:scale-95 cursor-default shadow-[0_0_10px_rgba(34,211,238,0.1)]`}
                    >
                      <span className={`text-[9px] font-display font-black text-pulse-cyan tracking-widest uppercase truncate`}>
                        {tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

               {/* My Tournaments */}
               <div className="mb-8 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase">MY TOURNAMENTS</span>
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-pulse-purple" />
                    <span className="text-[10px] font-display font-black text-white/20 uppercase tracking-widest">
                       {tournaments.filter(t => t.players?.includes(user?.uid || '')).length} Active
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {tournaments.filter(t => t.players?.includes(user?.uid || '')).length > 0 ? (
                    tournaments.filter(t => t.players?.includes(user?.uid || '')).map((tour, idx) => (
                      <div key={tour.id || idx} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-pulse-purple/30 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-pulse-purple/10 border border-pulse-purple/20 flex items-center justify-center text-pulse-purple group-hover:scale-110 transition-transform">
                              <Gamepad2 size={20} />
                           </div>
                           <div>
                              <h5 className="text-sm font-display font-black text-white uppercase tracking-tight truncate max-w-[150px]">{tour.title}</h5>
                              <p className="text-[9px] font-display font-bold text-pulse-cyan uppercase tracking-widest mt-0.5">
                                 {tour.matchType} • {tour.map}
                              </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4 justify-between sm:justify-end">
                          {teamsList.some(t => t.isUserLeader) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setScreenshotTournamentId(tour.id);
                                setScreenshotTournamentTitle(tour.title);
                                setIsScreenshotModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-pulse-purple/20 hover:bg-pulse-purple/40 text-pulse-purple hover:text-white border border-pulse-purple/30 rounded-xl font-display font-black text-[9px] uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                            >
                              Submit Standing
                            </button>
                          )}
                          <div className="text-right">
                             <div className="flex items-center gap-1.5 justify-end">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-display font-black text-green-500 uppercase tracking-widest">Joined</span>
                             </div>
                             <p className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest mt-1">
                                {tour.startTime.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                             </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState 
                      title="No Tournaments Joined" 
                      description="You haven't joined any tournaments yet. Check out the Tournaments section to participate!"
                      icon="tournaments"
                    />
                  )}
                </div>
              </div>

              {/* Recent Matches */}
              <div className="mb-8 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase">RECENT MATCHES</span>
                  <Trophy size={14} className="text-pulse-cyan" />
                </div>
                <div className="space-y-3">
                  {recentMatches && recentMatches.length > 0 ? (
                    recentMatches.map((match, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-8 rounded-full ${match.result === 'VICTORY' ? 'bg-pulse-cyan' : 'bg-red-500/50'}`} />
                          <div>
                            <p className={`text-sm font-display font-black ${match.result === 'VICTORY' ? 'text-pulse-cyan' : 'text-white/60'}`}>{match.result}</p>
                            <p className="text-[10px] font-display font-bold text-white/30 tracking-widest uppercase">{match.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-display font-black text-white">{match.kills} KILLS</p>
                          <p className="text-[10px] font-display font-bold text-white/30 tracking-widest uppercase">{match.damage} DMG</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState 
                      title="No Matches Logged" 
                      description="You haven't played any tournament matches yet. Your battle history will appear here!"
                      icon="default"
                    />
                  )}
                </div>
              </div>

                <div className="flex flex-col gap-2 pb-40 shrink-0">
                  {/* Sound Toggle */}
                  <div className="flex flex-col p-4 rounded-2xl bg-white/[0.03] border border-white/10 mb-2 gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pulse-purple/20 flex items-center justify-center">
                          <Volume2 size={20} className="text-pulse-purple" />
                        </div>
                        <div>
                          <div className="font-display font-black text-[10px] text-white uppercase tracking-wider">Sound Effects</div>
                          <div className="text-[9px] text-white/40 uppercase font-bold tracking-widest mt-0.5">UI Feedback</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const newState = !soundEnabled;
                          setSoundEnabled(newState);
                          soundService.setEnabled(newState);
                          if (newState) soundService.playClick();
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${soundEnabled ? 'bg-pulse-purple shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${soundEnabled ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    {soundEnabled && (
                      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/5">
                        <div className="flex justify-between text-[8px] font-bold text-white/50 tracking-wider">
                          <span>VOLUME</span>
                          <span>{Math.round(masterVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={masterVolume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setMasterVolume(val);
                            soundService.setMasterVolume(val);
                          }}
                          onMouseUp={() => soundService.playClick()}
                          onTouchEnd={() => soundService.playClick()}
                          className="w-full accent-pulse-purple bg-white/10 h-1 rounded-lg cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditProfileOpen(true)}
                    type="button" 
                    className="flex-1 bg-white/10 hover:bg-white/15 text-white font-display font-black text-[11px] py-2.5 rounded-lg tracking-widest uppercase transition-all flex items-center justify-center gap-2 border border-white/5"
                  >
                    <Pencil size={14} />
                    Edit Profile
                  </button>
                  <button type="button" className="px-3 bg-white/10 hover:bg-white/15 border border-white/5 rounded-lg flex items-center justify-center text-white transition-all">
                    <Settings size={18} />
                  </button>
                </div>
                {teamsList.find(t => t.isUserLeader) && (
                  <button 
                    onClick={() => {
                      const team = teamsList.find(t => t.isUserLeader);
                      if (team) {
                        setEditingTeam({...team});
                        setIsEditTeamModalOpen(true);
                      }
                    }}
                    type="button" 
                    className="w-full bg-pulse-purple/20 hover:bg-pulse-purple/30 text-pulse-purple font-display font-black text-[11px] py-2.5 rounded-lg tracking-widest uppercase transition-all flex items-center justify-center gap-2 border border-pulse-purple/30"
                  >
                    <Crown size={14} />
                    Edit Team Profile
                  </button>
                )}
                
                {isAdminUser && (
                  <button 
                    onClick={() => {
                      const allowedTabs: ('users' | 'reports' | 'tournaments' | 'tasks' | 'system' | 'logos' | 'broadcast' | 'shop' | 'banners' | 'badges' | 'roles')[] = [
                        'users', 'roles', 'reports', 'badges', 'tournaments', 'tasks', 'logos', 'shop', 'banners', 'broadcast', 'system'
                      ];
                      const firstAllowed = allowedTabs.find(t => hasPermission(userRole, tabPermissions[t]));
                      if (firstAllowed) {
                        setAdminTab(firstAllowed);
                      }
                      setIsAdminDashboardOpen(true);
                    }}
                    type="button" 
                    className="w-full bg-pulse-cyan/10 hover:bg-pulse-cyan/20 text-pulse-cyan font-display font-black text-[11px] py-2.5 rounded-lg tracking-widest uppercase transition-all flex items-center justify-center gap-2 border border-pulse-cyan/30 mt-4"
                  >
                    <LayoutDashboard size={14} />
                    Admin Control Panel
                  </button>
                )}
                
                <button 
                  onClick={() => signOut(auth)}
                  type="button" 
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-display font-black text-[11px] py-2.5 rounded-lg tracking-widest uppercase transition-all flex items-center justify-center gap-2 border border-red-500/30 mt-2"
                >
                  <LogOut size={14} />
                  Log Out
                </button>
              </div>

              {/* Toxicity Disclaimer */}
              <div className="mt-8 mb-40 p-5 rounded-2xl bg-red-500/5 border border-red-500/10 shrink-0">
                <div className="flex items-start gap-3">
                  <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium text-white/40 leading-relaxed uppercase tracking-wider">
                    <span className="text-red-500 font-black">Community Guidelines:</span> Respect all players. Toxic or abusive behavior may lead to temporary suspension or permanent ban.
                  </p>
                </div>
              </div>
            </div>
          ) : tab === 'shop' ? (
            <div className="flex-1 flex flex-col overflow-y-auto pr-1 -mr-1 custom-scrollbar pt-4 pb-32">
              <div className="flex items-center justify-between mb-8 px-2">
                <div>
                  <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter">The Armory</h3>
                  <p className="text-[10px] font-display font-bold text-pulse-purple uppercase tracking-[0.2em] mt-1">Premium Gear & Upgrades</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-pulse-purple/10 border border-pulse-purple/20 rounded-2xl">
                  <Coins size={14} className="text-yellow-400" />
                  <span className="text-sm font-display font-black text-white">{userCoins.toLocaleString()}</span>
                </div>
              </div>

              {/* Dynamic Banners Section */}
              {allBanners.length > 0 && (
                <div className="relative rounded-[32px] overflow-hidden mb-8 group aspect-[16/9]">
                  <AnimatePresence mode="wait">
                    {allBanners.map((banner, idx) => (
                      <motion.div
                        key={banner.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-abyssal via-transparent to-transparent z-10" />
                        <img 
                          src={banner.img} 
                          alt={banner.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute bottom-6 left-6 z-20">
                          <div className="bg-pulse-cyan px-3 py-1 rounded-full text-[9px] font-black text-abyssal uppercase tracking-widest mb-3 inline-block">Featured</div>
                          <h4 className="text-2xl font-display font-black text-white uppercase tracking-tight leading-none mb-2">{banner.title}</h4>
                          <p className="text-white/60 text-[10px] font-display font-bold uppercase tracking-widest font-medium">{banner.subtitle}</p>
                          <button className="mt-4 px-6 py-2.5 bg-white text-abyssal font-display font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-pulse-cyan transition-colors">{banner.action}</button>
                        </div>
                      </motion.div>
                    )).slice(0, 1) /* Show only the latest for now, or could implement a slider */}
                  </AnimatePresence>
                </div>
              )}

              {allBanners.length === 0 && (
                <div className="relative rounded-[32px] overflow-hidden mb-8 group aspect-[16/9]">
                  <div className="absolute inset-0 bg-gradient-to-t from-abyssal via-transparent to-transparent z-10" />
                  <img 
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1000" 
                    alt="Elite Pass" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute bottom-6 left-6 z-20">
                    <div className="bg-pulse-cyan px-3 py-1 rounded-full text-[9px] font-black text-abyssal uppercase tracking-widest mb-3 inline-block">Flash Sale</div>
                    <h4 className="text-2xl font-display font-black text-white uppercase tracking-tight leading-none mb-2">Arena Elite Pass</h4>
                    <p className="text-white/60 text-[10px] font-display font-bold uppercase tracking-widest font-medium">Unlock exclusive rewards & pro badges</p>
                    <button className="mt-4 px-6 py-2.5 bg-white text-abyssal font-display font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-pulse-cyan transition-colors">Upgrade Now</button>
                  </div>
                </div>
              )}

              {/* Categories */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { title: 'Bundles', items: '12 Sets', icon: <Sparkles className="text-pulse-purple" /> },
                  { title: 'Currency', items: '4 Packages', icon: <Coins className="text-yellow-400" /> },
                  { title: 'Cosmetics', items: '28 Variants', icon: <Gamepad2 className="text-pulse-cyan" /> },
                  { title: 'Profiles', items: '8 Styles', icon: <User className="text-white/60" /> }
                ].map((cat, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-[24px] p-5 hover:bg-white/[0.08] transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </div>
                    <h5 className="font-display font-black text-white uppercase tracking-tight">{cat.title}</h5>
                    <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest mt-1">{cat.items}</p>
                  </div>
                ))}
              </div>

              {/* Daily Deals Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-[10px] font-display font-black text-white/40 uppercase tracking-[0.2em]">Daily Deals</span>
                <div className="flex items-center gap-2 text-[10px] font-display font-black text-pulse-cyan uppercase tracking-widest">
                  <Clock size={12} />
                  <span>Resets in 14h</span>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-2 gap-4">
                {(allShopItems.length > 0 ? allShopItems : [
                  { name: 'Elite Avatar BG', price: 2500, type: 'coins', rarity: 'Rare', img: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=300' },
                  { name: 'Pink Diamond (Large)', price: 10, type: 'blue', rarity: 'Epic', img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=300' },
                  { name: 'Squad Rename', price: 500, type: 'pink', rarity: 'Legendary', img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=300' },
                  { name: 'Pro Verification', price: 5000, type: 'coins', rarity: 'Legendary', img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=300' }
                ]).map((item, i) => (
                  <div key={item.id || i} className="bg-white/5 border border-white/10 rounded-[28px] overflow-hidden group">
                    <div className="relative aspect-square overflow-hidden bg-black/40">
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                      <div className="absolute top-3 left-3">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          item.rarity === 'Legendary' ? 'bg-fire-orange/20 border-fire-orange text-fire-orange' :
                          item.rarity === 'Epic' ? 'bg-pulse-purple/20 border-pulse-purple text-pulse-purple' :
                          'bg-pulse-cyan/20 border-pulse-cyan text-pulse-cyan'
                        }`}>
                          {item.rarity}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h6 className="text-[11px] font-display font-black text-white uppercase tracking-tight truncate mb-3">{item.name}</h6>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {item.type === 'coins' ? <Coins size={12} className="text-yellow-400" /> : <Gem size={12} className={item.type === 'pink' ? 'text-pink-400' : 'text-blue-400'} />}
                          <span className="text-[11px] font-display font-bold text-white">{item.price.toLocaleString()}</span>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-pulse-purple hover:text-white transition-all flex items-center justify-center border border-white/5">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden pt-4 pb-32">
              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <h3 className="text-2xl font-display font-black text-white tracking-tighter uppercase italic leading-none">Command Center</h3>
                  <p className="text-[9px] font-display font-bold text-pulse-cyan uppercase tracking-[0.3em] mt-1.5 opacity-60">Strategic COMMS active</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-pulse-cyan animate-ping absolute" />
                  <div className="w-2 h-2 rounded-full bg-pulse-cyan relative" />
                  <span className="text-[10px] font-display font-black text-pulse-cyan uppercase tracking-widest italic">Live</span>
                </div>
              </div>

              {/* Enhanced Search Bar */}
              <div className="relative mb-6 group">
                <div className="absolute inset-x-0 -bottom-px h-[1px] bg-gradient-to-r from-transparent via-pulse-purple/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-pulse-purple transition-colors" size={16} />
                <input 
                  type="text"
                  placeholder="Search transmissions..."
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[13px] text-white placeholder-white/20 outline-none focus:bg-white/[0.06] focus:border-pulse-purple/30 transition-all font-display font-bold"
                />
              </div>

              {/* Active Now / Stories */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[9px] font-display font-black text-white/30 uppercase tracking-[0.2em]">Active Squads</span>
                  <span className="text-[9px] font-display font-black text-pulse-cyan uppercase tracking-widest">32.4K Online</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                  {/* My Story/Status */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl border border-dashed border-white/20 flex items-center justify-center bg-white/5 group hover:border-pulse-purple/50 transition-all cursor-pointer">
                        <Plus size={20} className="text-white/20 group-hover:text-pulse-purple" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-pulse-purple text-white p-1 rounded-lg border-2 border-abyssal shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                        <User size={10} />
                      </div>
                    </div>
                    <span className="text-[9px] font-display font-black text-white/40 uppercase tracking-widest italic">Broadcast</span>
                  </div>

                  {/* Mock Active Users */}
                  {filteredPlayers.slice(0, 6).map((player, idx) => (
                    <motion.div 
                      key={player.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex flex-col items-center gap-2 shrink-0"
                    >
                      <div className="relative cursor-pointer group">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pulse-cyan to-pulse-purple blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                        <div className="relative w-16 h-16 rounded-2xl border-2 border-pulse-purple/30 p-1 bg-abyssal overflow-hidden group-hover:border-pulse-purple transition-all">
                          <img src={resolveAvatar(player.avatar)} alt="" className="w-full h-full object-cover rounded-xl" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-abyssal shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      </div>
                      <span className="text-[9px] font-display font-black text-white tracking-widest uppercase italic truncate w-16 text-center">{player.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Tab Navigation Refined */}
              <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-2xl p-1 mb-6 relative">
                 <div 
                   className="absolute h-[calc(100%-8px)] rounded-xl bg-gradient-to-r from-pulse-purple to-pulse-purple/80 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-500 ease-out"
                   style={{ 
                     width: 'calc(50% - 4px)', 
                     left: chatCategory === 'messages' ? '4px' : 'calc(50%)' 
                   }}
                 />
                <button 
                  onClick={() => setChatCategory('messages')}
                  className={`relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 z-10 ${chatCategory === 'messages' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  <MessageSquare size={16} />
                  <span className="text-[10px] font-display font-black uppercase tracking-widest italic">Transmissions</span>
                </button>
                <button 
                  onClick={() => setChatCategory('groups')}
                  className={`relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 z-10 ${chatCategory === 'groups' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  <Users size={16} />
                  <span className="text-[10px] font-display font-black uppercase tracking-widest italic">Squad Hubs</span>
                </button>
              </div>

              {/* Chat View */}
              {chatCategory === 'messages' ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto space-y-3 mb-8 custom-scrollbar">
                    {conversations.length > 0 ? (
                      conversations.map((chat) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={chat.id} 
                          onClick={() => {
                            setActivePrivateChat(chat);
                            setIsPrivateChatOpen(true);
                          }}
                          className={`group relative flex items-center gap-4 p-4 rounded-3xl border border-white/5 transition-all duration-500 overflow-hidden hover:border-pulse-purple/20 ${chat.unreadCount && chat.unreadCount[user!.uid] > 0 ? 'bg-white/[0.04]' : 'bg-white/[0.02]'}`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-pulse-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="relative shrink-0">
                            <div className={`w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white/5 ${chat.otherUser?.isAI ? 'bg-pulse-purple/10 border-pulse-purple/20' : ''}`}>
                              {chat.otherUser?.isAI ? (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Bot size={28} className="text-pulse-purple animate-pulse" />
                                </div>
                              ) : (
                                <img src={resolveAvatar(chat.otherUser?.avatar)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              )}
                            </div>
                            {/* Pro Indicator if applicable */}
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-abyssal border border-white/10 rounded-full flex items-center justify-center">
                              <Shield size={10} className="text-pulse-cyan shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                            </div>
                            {chat.unreadCount && chat.unreadCount[user!.uid] > 0 && (
                              <div className="absolute -bottom-1 -right-1 h-2 w-10 bg-pulse-cyan rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)] z-10" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 relative">
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="text-[15px] font-display font-black text-white uppercase tracking-tight group-hover:text-pulse-cyan transition-colors truncate flex items-center">
                                <span className="truncate">{chat.otherUser?.name || 'Unknown OP'}</span>
                                <UserBadges player={chat.otherUser} />
                              </h4>
                              <span className="text-[9px] font-mono font-black text-white/20 uppercase tracking-widest tabular-nums">
                                {chat.lastTimestamp?.toDate?.() ? chat.lastTimestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className={`text-[12px] font-medium truncate italic ${chat.unreadCount && chat.unreadCount[user!.uid] > 0 ? 'text-white' : 'text-white/40'}`}>
                                {chat.lastSenderId === user?.uid && <span className="text-pulse-cyan/60 not-italic mr-1.5">ME:</span>}
                                {chat.lastMessage || 'Establishing link...'}
                              </p>
                              {chat.unreadCount && chat.unreadCount[user!.uid] > 0 && (
                                <div className="px-2 py-0.5 bg-pulse-purple/20 border border-pulse-purple/30 rounded-lg text-[9px] font-display font-black text-pulse-purple animate-pulse">
                                  NEW
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 pr-1">
                             <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 hover:bg-pulse-purple/20 hover:border-pulse-purple/30 transition-all">
                               <ArrowUpRight size={14} className="text-white" />
                             </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-20">
                        <MessageSquare size={48} className="mb-4 text-pulse-purple" />
                        <p className="text-xs font-display font-black uppercase tracking-widest text-white/60 leading-relaxed">No Signal Detected</p>
                        <p className="text-[10px] font-display font-bold uppercase tracking-widest mt-2 max-w-[200px] leading-relaxed mx-auto text-white/40 italic">
                          Engage with pro players in the field to initiate secure transmissions.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (

                <div className="flex-1 overflow-y-auto space-y-4 mb-8 custom-scrollbar">
                  {teamsList.filter(t => joinedTeamIds.includes(t.id)).length > 0 ? (
                    teamsList.filter(t => joinedTeamIds.includes(t.id)).map((team) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={team.id} 
                        className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-4 group hover:border-pulse-purple/40 transition-all"
                        onClick={() => {
                          setSelectedTeamId(team.id);
                          setIsMyTeamsListOpen(true);
                        }}
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                          <img src={resolveTeamLogo(team.logo)} alt={team.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-md font-display font-black text-white uppercase tracking-tight truncate">{team.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-display font-bold text-pulse-cyan uppercase tracking-widest">{team.game}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest">Active Member</span>
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 group-hover:text-white transition-all border border-white/5">
                          <ArrowUpRight size={18} />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-20">
                      <Users size={48} className="mb-4 text-pulse-purple" />
                      <p className="text-xs font-display font-black uppercase tracking-widest">No Active Groups</p>
                      <p className="text-[10px] font-display font-bold uppercase tracking-widest mt-2 max-w-[200px] leading-relaxed mx-auto">
                        Join a team or create your own squad to start collaborating with other pro players.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    ))}
  </motion.div>

    {/* Page Indicator */}
    <div className="absolute bottom-[90px] left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40 pointer-events-none">
      {TABS.map((tab) => (
        <motion.div
          key={tab}
          animate={{
            width: activeTab === tab ? 12 : 4,
            opacity: activeTab === tab ? 1 : 0.2,
            backgroundColor: activeTab === tab ? '#a855f7' : '#ffffff'
          }}
          className="h-1 rounded-full transition-all duration-300"
        />
      ))}
    </div>
  </main>

      {/* Scoring Modal */}
      <AnimatePresence>
        {isScoringModalOpen && scoringTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-[#0a0b1e]/90 backdrop-blur-xl"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsScoringModalOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0d0e2e] border border-white/10 rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-8 border-b border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter">Match Reports</h3>
                    <p className="text-[10px] font-display font-bold text-pulse-cyan uppercase tracking-widest mt-1">Tournament: {scoringTournament.title}</p>
                  </div>
                  <button onClick={() => setIsScoringModalOpen(false)} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <ParticipantsList 
                  tournamentId={scoringTournament.id} 
                  onResultsChange={(results) => setScoringResults(results)}
                />
              </div>

              {/* Footer */}
              <div className="p-8 border-t border-white/5 bg-white/[0.02]">
                <button
                  onClick={async () => {
                    if (Object.keys(scoringResults).length === 0) {
                      soundService.playWarning();
                      alert("Please enter results for at least one player.");
                      return;
                    }
                    setIsSavingScores(true);
                    try {
                      const batch = writeBatch(db);
                      const timestamp = serverTimestamp();

                      for (const [userId, res] of Object.entries(scoringResults)) {
                        const results = res as { kills: number, points: number, win: boolean };
                        // 1. Update User Stats
                        const userRef = doc(db, 'users', userId);
                        const userSnap = await getDoc(userRef);
                        const userData = userSnap.data();

                        if (userData) {
                          batch.update(userRef, {
                            'stats.kills': increment(results.kills),
                            'stats.wins': increment(results.win ? 1 : 0),
                            'stats.matchesPlayed': increment(1),
                            'recentMatches': [
                              {
                                result: results.win ? 'VICTORY' : 'DEFEAT',
                                kills: results.kills,
                                damage: (results.kills * 10).toString(),
                                date: new Date().toLocaleDateString()
                              },
                              ...(userData.recentMatches || []).slice(0, 4)
                            ]
                          });

                          // 2. Leaderboard Updates
                          const totalPoints = results.points || (results.kills * 10 + (results.win ? 100 : 0));
                          
                          const leaderboardUpdate = async (category: 'points' | 'kills' | 'wins', scoreValue: number, gameType: 'freefire' | 'bgmi' | 'global') => {
                            const entryId = `${userId}_${gameType}_${category}`;
                            const entryRef = doc(db, 'leaderboards', entryId);
                            const entrySnap = await getDoc(entryRef);

                            if (entrySnap.exists()) {
                              batch.update(entryRef, {
                                score: increment(scoreValue),
                                updatedAt: timestamp
                              });
                            } else {
                              batch.set(entryRef, {
                                userId,
                                userName: userData.name || 'Anonymous',
                                userAvatar: userData.avatar || '',
                                score: scoreValue,
                                game: gameType,
                                category,
                                updatedAt: timestamp
                              });
                            }
                          };

                          await leaderboardUpdate('kills', results.kills, scoringTournament.game);
                          await leaderboardUpdate('wins', results.win ? 1 : 0, scoringTournament.game);
                          await leaderboardUpdate('points', totalPoints, scoringTournament.game);
                          await leaderboardUpdate('points', totalPoints, 'global');
                        }
                      }

                      await batch.commit();
                      soundService.playCelebration();
                      alert("Results posted successfully!");
                      setIsScoringModalOpen(false);
                      setScoringResults({});
                    } catch (err) {
                      handleFirestoreError(err, 'write', 'multiple');
                    } finally {
                      setIsSavingScores(false);
                    }
                  }}
                  disabled={isSavingScores}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white font-display font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-pulse-purple/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSavingScores ? 'Transmitting Data...' : 'Finalize & Post Results'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation - Lifted to avoid platform UI conflicts */}
      <AnimatePresence>
        {!(isPrivateChatOpen && activePrivateChat) && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-8 left-0 right-0 px-5 z-50 pointer-events-none"
          >
            <div className="max-w-[380px] mx-auto relative pointer-events-auto">
              <div className="absolute inset-x-0 bottom-0 h-[68px] bg-[#0a0b25]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)]" />
              
              <div className="relative flex items-center justify-around h-[68px]">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab;
                  const Icon = tab === 'chats' ? MessageSquare :
                               tab === 'leaderboard' ? Trophy :
                               tab === 'home' ? Home :
                               tab === 'shop' ? ShoppingBag : User;
                  
                  const label = tab === 'chats' ? 'CHATS' :
                                tab === 'leaderboard' ? 'RANKS' :
                                tab === 'home' ? 'ARENA' :
                                tab === 'shop' ? 'SHOP' : 'ME';

                  const iconColor = tab === 'chats' ? 'text-pulse-purple' :
                                    tab === 'leaderboard' ? 'text-pulse-cyan' :
                                    tab === 'home' ? 'text-white' :
                                    tab === 'shop' ? 'text-yellow-400' : 'text-pulse-purple';

                  return (
                    <button 
                      key={tab}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleTabChange(tab);
                      }}
                      className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all ${isActive ? 'opacity-100' : 'opacity-30 hover:opacity-100'}`}
                    >
                      <motion.div
                        animate={{ y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <Icon size={18} className={isActive ? iconColor : 'text-white/60'} />
                      </motion.div>
                      <span className={`text-[7px] font-display font-black uppercase tracking-[0.2em] transition-colors ${isActive ? iconColor : 'text-white/30'}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Create Team Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0d0e2e] border border-white/10 rounded-[32px] p-8 overflow-hidden shadow-2xl shadow-pulse-purple/20"
            >
              {/* Background Glow */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-pulse-purple/20 blur-3xl rounded-full" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pulse-cyan/10 blur-3xl rounded-full" />

              <div className="absolute top-4 right-4">
                <button onClick={() => setIsCreateModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors bg-white/5 rounded-full">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pulse-cyan/20 to-pulse-purple/20 flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Shield size={32} className="text-pulse-purple" />
                </div>
                <h3 className="text-2xl font-display font-black text-white tracking-tight uppercase">Create Team</h3>
                <p className="text-white/40 text-xs mt-2 font-medium">Lead your squad to the top of the leaderboard.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase">Creation Cost</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-400/10 rounded-full border border-yellow-400/20">
                      <Coins size={12} className="text-yellow-400" />
                      <span className="text-xs font-display font-bold text-yellow-400">1,000</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase">Your Balance</span>
                    <div className="flex items-center gap-1.5">
                      <Coins size={12} className={userCoins >= 1000 ? "text-green-400" : "text-red-400"} />
                      <span className={`text-xs font-display font-bold ${userCoins >= 1000 ? 'text-green-400' : 'text-red-400'}`}>
                        {userCoins.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[40vh] pr-2 custom-scrollbar">
                  {/* Game Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Select Game</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setSelectedGame('freefire')}
                        className={`py-2 rounded-xl border text-[10px] font-display font-bold uppercase tracking-widest transition-all ${selectedGame === 'freefire' ? 'bg-pulse-purple/20 border-pulse-purple text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                      >
                        Free Fire
                      </button>
                      <button 
                        onClick={() => setSelectedGame('bgmi')}
                        className={`py-2 rounded-xl border text-[10px] font-display font-bold uppercase tracking-widest transition-all ${selectedGame === 'bgmi' ? 'bg-pulse-purple/20 border-pulse-purple text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                      >
                        BGMI
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Team Name</label>
                    <input 
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="e.g. PHANTOMS"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple/50 outline-none"
                    />
                  </div>

                  {/* Logo Selection UI */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Team Emblem</label>
                    <div 
                      className="flex items-center gap-4 p-3 bg-white/5 border border-white/10 rounded-2xl group transition-all hover:bg-white/[0.08] cursor-pointer" 
                      onClick={() => {
                        setLogoTarget('team');
                        setIsLogoPickerOpen(true);
                      }}
                    >
                      <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {tempLogoUrl ? (
                          <img src={tempLogoUrl} alt="Team Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Shield size={24} className="text-white/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[10px] font-display font-black text-white uppercase mb-1">Select Identity</p>
                        <p className="text-[8px] text-white/40 uppercase font-bold leading-tight">Pick from your unlocked library</p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-pulse-purple/10 flex items-center justify-center text-pulse-purple">
                         <Plus size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">

                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase">Team Tags</label>
                      <span className="text-[9px] font-display font-bold text-white/20 whitespace-nowrap">{newTeamTags.length}/5</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PREDEFINED_TAGS.map((tag, idx) => {
                        const isSelected = newTeamTags.includes(tag);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (isSelected) {
                                setNewTeamTags(newTeamTags.filter(t => t !== tag));
                              } else {
                                if (newTeamTags.length < 5) {
                                  setNewTeamTags([...newTeamTags, tag]);
                                }
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full border transition-all text-[9px] font-display font-bold uppercase tracking-widest ${
                              isSelected 
                                ? 'border-pulse-cyan bg-pulse-cyan/20 text-white shadow-[0_0_10px_rgba(34,211,238,0.2)]' 
                                : 'border-white/5 bg-white/2 text-white/30 hover:border-white/10 hover:text-white/50'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Requirements / Description</label>
                    <textarea 
                      value={newTeamBio}
                      onChange={(e) => setNewTeamBio(e.target.value)}
                      placeholder="Need a sniper expert, rusher, or professional players..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple/50 outline-none resize-none"
                    />
                  </div>
                </div>

                <button 
                  disabled={userCoins < 1000 || !newTeamName.trim() || isRestricted}
                  onClick={async () => {
                    if (!user) return;
                    if (isRestricted) {
                      soundService.playWarning();
                      alert("Your account is restricted due to multiple reports. You cannot create new teams.");
                      return;
                    }
                    try {
                      const batch = writeBatch(db);
                      const teamRef = doc(collection(db, 'teams'));
                      const membershipRef = doc(collection(db, 'memberships'));
                      
                      batch.set(teamRef, {
                        name: newTeamName,
                        logo: tempLogoUrl || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=100&h=100&bg=000',
                        game: selectedGame,
                        leaderId: user.uid,
                        leader: userName,
                        tags: newTeamTags,
                        bio: newTeamBio || 'No description provided.',
                        createdAt: serverTimestamp()
                      });

                      batch.set(membershipRef, {
                        userId: user.uid,
                        teamId: teamRef.id,
                        role: 'leader',
                        joinedAt: serverTimestamp()
                      });

                      batch.update(doc(db, 'users', user.uid), {
                        coins: increment(-1000)
                      });

                      await batch.commit();
                      soundService.playSuccess();

                      // Reset fields
                      setNewTeamName('');
                      setNewTeamBio('');
                      setNewTeamTags([]);
                      setIsCreateModalOpen(false);
                    } catch (err) {
                      soundService.playError();
                      handleFirestoreError(err, 'write', 'teams');
                    }
                  }}
                  className={`w-full py-4 rounded-xl font-display font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 ${userCoins >= 1000 && newTeamName.trim() ? 'bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white shadow-lg active:scale-95' : 'bg-white/5 text-white/20 opacity-50 cursor-not-allowed'}`}
                >
                  {userCoins >= 1000 ? 'Generate Team' : 'Insufficient Coins'}
                </button>

                {userCoins < 1000 && (
                  <p className="text-center text-[10px] font-bold text-pulse-cyan uppercase tracking-widest opacity-80 animate-pulse">
                    Complete tasks to earn +200 coins
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Filter Modal */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0d0e2e] border border-white/10 rounded-[40px] p-8 overflow-hidden shadow-3xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter">
                    Discovery Filters
                  </h3>
                  <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.3em] mt-1">Refine your search</p>
                </div>
                <button 
                  onClick={() => setIsFilterModalOpen(false)} 
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all border border-white/5"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                {Object.entries(FILTER_CATEGORIES).map(([category, tags]) => (
                  <div key={category} className="space-y-3">
                    <h5 className="text-[10px] font-display font-black text-pulse-cyan uppercase tracking-widest flex items-center gap-2">
                       <Zap size={10} />
                       {category}
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const isSelected = activeFilters.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              if (isSelected) {
                                setActiveFilters(activeFilters.filter(f => f !== tag));
                              } else {
                                setActiveFilters([...activeFilters, tag]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full border text-[9px] font-display font-bold uppercase tracking-widest transition-all ${
                              isSelected 
                                ? 'bg-pulse-purple border-pulse-purple text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]' 
                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setActiveFilters([])}
                  className="flex-1 py-3 text-white/30 font-display font-bold text-[9px] uppercase tracking-widest hover:text-white transition-all"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => setIsFilterModalOpen(false)}
                  className="flex-[2] py-4 bg-pulse-cyan text-abyssal rounded-2xl font-display font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Center overlay */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        userId={user?.uid || ""}
        onNavigate={(actionUrl) => {
          if (['chats', 'leaderboard', 'home', 'shop', 'profile'].includes(actionUrl)) {
            handleTabChange(actionUrl);
          } else if (actionUrl === 'teams') {
            setIsMyTeamsListOpen(true);
          }
        }}
      />

      {/* Tasks Modal */}
      <AnimatePresence>
        {isTasksModalOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTasksModalOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0a0b25] border border-white/10 rounded-[40px] p-8 overflow-hidden shadow-3xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                    <ListChecks size={24} className="text-pulse-cyan" />
                    Pending Tasks
                  </h3>
                  <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.3em] mt-1">Earn rewards daily</p>
                </div>
                <button 
                  onClick={() => setIsTasksModalOpen(false)} 
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all border border-white/5"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {earningTasks.filter(t => t.isActive).map((task) => {
                  const isCompleted = completedTaskIds.includes(task.id);
                  return (
                    <button 
                      key={task.id}
                      disabled={isCompleted}
                      onClick={async () => {
                        if (!user) return;
                        try {
                          const batch = writeBatch(db);
                          const userRef = doc(db, 'users', user.uid);
                          const userTaskRef = doc(db, 'user_tasks', `${user.uid}_${task.id}`);
                          
                          batch.set(userTaskRef, {
                            userId: user.uid,
                            taskId: task.id,
                            completedAt: serverTimestamp()
                          });
                          
                          batch.update(userRef, {
                            [task.rewardType]: increment(task.rewardAmount)
                          });
                          
                          await batch.commit();
                          soundService.playSuccess();
                          alert(`Success! You earned ${task.rewardAmount} ${task.rewardType === 'coins' ? 'Gold' : task.rewardType === 'pinkDiamonds' ? 'Pink Diamonds' : 'Blue Diamonds'}!`);
                        } catch (err) {
                          handleFirestoreError(err, 'write', 'user_tasks');
                        }
                      }}
                      className={`w-full p-4 rounded-3xl flex items-center justify-between group transition-all border ${
                        isCompleted 
                          ? 'bg-pulse-cyan/5 border-pulse-cyan/10 opacity-60' 
                          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-pulse-cyan/30'
                      }`}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className={`text-xs font-display font-black uppercase tracking-tight ${isCompleted ? 'text-pulse-cyan' : 'text-white'}`}>
                          {task.title}
                        </span>
                        <p className="text-[10px] text-white/40 text-left line-clamp-1">{task.description}</p>
                        <div className="flex items-center gap-1">
                          {task.rewardType === 'coins' ? <Coins size={10} className="text-yellow-500" /> : <Gem size={10} className="text-pink-500" />}
                          <span className={`text-[10px] font-display font-bold uppercase tracking-widest ${task.rewardType === 'coins' ? 'text-yellow-500' : 'text-pink-500'}`}>
                            +{task.rewardAmount} {task.rewardType === 'coins' ? 'Gold' : 'Diamonds'}
                          </span>
                        </div>
                      </div>
                      {isCompleted ? (
                        <div className="w-8 h-8 rounded-full bg-pulse-cyan text-abyssal flex items-center justify-center shadow-lg shadow-pulse-cyan/20">
                          <CheckCircle2 size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-pulse-cyan/10 border border-pulse-cyan/30 flex items-center justify-center text-pulse-cyan group-hover:bg-pulse-cyan group-hover:text-abyssal transition-all shadow-lg">
                          <ArrowUpRight size={14} />
                        </div>
                      )}
                    </button>
                  );
                })}

                {earningTasks.filter(t => t.isActive).length === 0 && (
                   <div className="py-12 flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                      <Zap size={32} className="mb-3" />
                      <p className="font-display font-black text-[10px] uppercase tracking-widest text-center">No tasks available right now</p>
                   </div>
                )}
              </div>

              <div className="mt-8 p-4 bg-pulse-cyan/5 border border-pulse-cyan/10 rounded-2xl">
                <p className="text-[10px] font-display font-bold text-pulse-cyan/60 uppercase text-center leading-relaxed italic">
                  New tasks are updated every 24 hours based on your activity level!
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report User Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReportModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0d0e2e] border border-red-500/20 rounded-[32px] p-6 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-display font-black text-white tracking-tight uppercase">Report User</h3>
                  <p className="text-[10px] font-display font-bold text-red-500 uppercase tracking-widest mt-0.5">Target: {reportTargetName}</p>
                </div>
                <button onClick={() => setIsReportModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors bg-white/5 rounded-full">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-3 mb-8">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => {
                      if (selectedReportReasons.includes(reason)) {
                        setSelectedReportReasons(selectedReportReasons.filter(r => r !== reason));
                      } else {
                        setSelectedReportReasons([...selectedReportReasons, reason]);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                      selectedReportReasons.includes(reason)
                        ? 'border-red-500 bg-red-500/10 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : 'border-white/5 bg-white/2 text-white/40 hover:border-white/10 hover:text-white/60'
                    }`}
                  >
                    <span className="text-[11px] font-display font-black uppercase tracking-wider">{reason}</span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedReportReasons.includes(reason) ? 'border-red-500 bg-red-500' : 'border-white/20'
                    }`}>
                      {selectedReportReasons.includes(reason) && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              <button
                disabled={selectedReportReasons.length === 0}
                onClick={async () => {
                  if (!user || !reportTargetId) return;
                  try {
                    await addDoc(collection(db, 'reports'), {
                      reporterId: user.uid,
                      reportedId: reportTargetId,
                      reasons: selectedReportReasons,
                      timestamp: serverTimestamp()
                    });
                    alert("User reported successfully. Our team will review this case.");
                    setIsReportModalOpen(false);
                    setSelectedReportReasons([]);
                  } catch (err) {
                    handleFirestoreError(err, 'write', 'reports');
                  }
                }}
                className={`w-full py-4 rounded-xl font-display font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 ${
                  selectedReportReasons.length > 0 
                    ? 'bg-red-500 text-white shadow-xl shadow-red-500/20 active:scale-95' 
                    : 'bg-white/5 text-white/20 opacity-50 cursor-not-allowed'
                }`}
              >
                Submit Report
              </button>

              <p className="mt-4 text-[9px] font-medium text-white/30 text-center leading-relaxed">
                Replying with false reports may lead to your own account being restricted.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Dashboard Modal */}
      <AnimatePresence>
        {isAdminDashboardOpen && (
          <div className="fixed inset-0 z-[260] flex flex-col p-2 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAdminDashboardOpen(false);
                setActiveTab('profile');
              }}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            {!hasPermission(userRole, 'access_admin_panel') ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md mx-auto my-auto bg-[#0a0b25] border border-red-500/20 rounded-[24px] p-8 flex flex-col items-center text-center shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500" />
                <ShieldAlert size={56} className="text-red-500 mb-5 animate-pulse" />
                <h3 className="text-lg font-display font-black text-white uppercase tracking-wider leading-none">Security Violation</h3>
                <p className="text-white/40 text-[11px] mt-3 font-medium leading-relaxed max-w-xs">
                  Your account does not possess administrative or organizational clearance to enter the Squad UP Control Center.
                </p>
                <div className="w-full mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[10px] font-display text-white/50 text-left">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Account UID:</span>
                    <span className="font-mono text-white/70 font-bold">{user?.uid?.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span>Authorized Clearance:</span>
                    <span className="text-red-400 font-bold uppercase">{userRole}</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsAdminDashboardOpen(false);
                    setActiveTab('profile');
                  }}
                  className="w-full mt-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-display font-black uppercase tracking-widest transition-all"
                >
                  Safely Redirect Out
                </button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-6xl mx-auto bg-[#0a0b25] border border-white/10 rounded-[20px] flex flex-col shadow-2xl h-full overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-3 px-5 border-b border-white/5 shrink-0 sticky top-0 bg-[#0a0b25]/90 backdrop-blur-md z-30">
                  <div className="flex items-center gap-3.5">
                    <button 
                      onClick={() => {
                        setIsAdminDashboardOpen(false);
                        setActiveTab('profile');
                      }}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 transition-all border border-white/5 group"
                    >
                      <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>

                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-pulse-cyan/10 border border-pulse-cyan/30 flex items-center justify-center text-pulse-cyan">
                        <LayoutDashboard size={14} />
                      </div>
                      <div>
                        <h2 className="text-base font-display font-black text-white tracking-tight uppercase italic leading-none">Control Panel</h2>
                        <p className="text-[7px] font-display font-medium text-white/30 uppercase tracking-[0.2em] mt-0.5">Admin Management</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-end min-w-0 ml-2">
                    <div className="relative flex-1 max-w-full md:max-w-[450px]">
                      {/* Fade effect containers */}
                      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#0a0b25] to-transparent z-10 pointer-events-none md:hidden" />
                      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#0a0b25] to-transparent z-10 pointer-events-none md:hidden" />
                      
                      <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar scroll-smooth no-swipe">
                        <div className="flex shrink-0 gap-1 px-1">
                          {[
                            { id: 'users', label: 'Users', color: 'bg-pulse-cyan' },
                            { id: 'roles', label: 'Roles', color: 'bg-indigo-500' },
                            { id: 'reports', label: 'Alerts', color: 'bg-red-500' },
                            { id: 'badges', label: 'Badges', color: 'bg-indigo-600' },
                            { id: 'tournaments', label: 'Matches', color: 'bg-pulse-purple' },
                            { id: 'tasks', label: 'Tasks', color: 'bg-yellow-500' },
                            { id: 'logos', label: 'Logos', color: 'bg-green-500' },
                            { id: 'shop', label: 'Shop', color: 'bg-fire-orange' },
                            { id: 'banners', label: 'Banners', color: 'bg-pink-500' },
                            { id: 'broadcast', label: 'Broadcast', color: 'bg-orange-500' },
                            { id: 'system', label: 'System', color: 'bg-white text-black text-[10px]' }
                          ].filter(tab => hasPermission(userRole, tabPermissions[tab.id])).map(tab => (
                            <button 
                              key={tab.id}
                              onClick={() => setAdminTab(tab.id as any)}
                              className={`px-4 py-2 rounded-lg font-display font-black text-[9px] uppercase tracking-[0.1em] transition-all whitespace-nowrap shrink-0 flex items-center justify-center min-w-[70px] ${adminTab === tab.id ? `${tab.color} text-white shadow-lg shadow-black/20` : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setIsAdminDashboardOpen(false);
                        setActiveTab('profile');
                      }}
                      className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white/40 transition-all border border-white/5 shrink-0 ml-2"
                    >
                      <Plus size={20} className="rotate-45" />
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#08091d]">
                  {!hasPermission(userRole, tabPermissions[adminTab]) ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in duration-200">
                      <ShieldAlert size={48} className="text-red-500 mb-4 animate-bounce" />
                      <h3 className="text-lg font-display font-black text-white uppercase tracking-wider">Access Restricted</h3>
                      <p className="text-white/40 text-[11px] max-w-sm mt-2 leading-relaxed">
                        You do not have the required administrative clearance ({adminTab.toUpperCase()}) to view this section.
                      </p>
                    </div>
                  ) : adminTab === 'roles' && hasPermission(userRole, 'manage_roles') ? (
                    <UserManagement onBack={() => {
                      // Find first allowed tab
                      const allowedTabs: ('users' | 'reports' | 'tournaments' | 'tasks' | 'system' | 'logos' | 'broadcast' | 'shop' | 'banners' | 'badges' | 'roles')[] = [
                        'users', 'roles', 'reports', 'badges', 'tournaments', 'tasks', 'logos', 'shop', 'banners', 'broadcast', 'system'
                      ];
                      const firstAllowed = allowedTabs.find(t => t !== 'roles' && hasPermission(userRole, tabPermissions[t]));
                      if (firstAllowed) {
                        setAdminTab(firstAllowed);
                      } else {
                        setIsAdminDashboardOpen(false);
                      }
                    }} />
                  ) : adminTab === 'users' ? (
                  <div className="flex-1 flex flex-col p-4 pt-3">
                    {/* Search & Actions - Slim Sticky Bar */}
                    <div className="flex items-center gap-2 mb-3 sticky top-0 z-20 bg-[#08091d] py-1 border-b border-white/5 pb-2">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={12} />
                        <input 
                          type="text" 
                          dir="ltr"
                          placeholder="Search players..."
                          value={adminSearchQuery}
                          onChange={(e) => setAdminSearchQuery(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-white text-left font-display font-medium text-[10px] placeholder-white/20 outline-none focus:border-pulse-cyan transition-all"
                        />
                      </div>
                      <button 
                        onClick={async () => {
                           if (!confirm("This will find all users marked as bots and PERMANENTLY delete them. Continue?")) return;
                           try {
                              const botSnap = await getDocs(query(collection(db, 'users'), where('type', '==', 'bot')));
                              const botSnap2 = await getDocs(query(collection(db, 'users'), where('isBot', '==', true)));
                              
                              const allBots = [...botSnap.docs, ...botSnap2.docs];
                              const uniqueBots = Array.from(new Set(allBots.map(d => d.id))).map(id => allBots.find(d => d.id === id));

                              if (uniqueBots.length === 0) {
                                 alert("No bots found in database!");
                                 return;
                              }

                              let count = 0;
                              const batchLimit = 50;
                              for (let i = 0; i < uniqueBots.length; i += batchLimit) {
                                 const chunk = uniqueBots.slice(i, i + batchLimit);
                                 const batch = writeBatch(db);
                                 for (const b of chunk) {
                                   if (b) batch.delete(doc(db, 'users', b.id));
                                 }
                                 await batch.commit();
                                 count += chunk.length;
                              }

                              const chatSnap = await getDocs(query(collection(db, 'global_chats'), where('senderType', '==', 'bot')));
                              const chatSnap2 = await getDocs(query(collection(db, 'global_chats'), where('isBotMessage', '==', true)));
                              const allBotMsgs = [...chatSnap.docs, ...chatSnap2.docs];
                              const uniqueMsgs = Array.from(new Set(allBotMsgs.map(d => d.id))).map(id => allBotMsgs.find(d => d.id === id));

                              for (let i = 0; i < uniqueMsgs.length; i += batchLimit) {
                                 const chunk = uniqueMsgs.slice(i, i + batchLimit);
                                 const batch = writeBatch(db);
                                 for (const m of chunk) {
                                    if (m) batch.delete(doc(db, 'global_chats', m.id));
                                 }
                                 await batch.commit();
                              }

                              alert(`Successfully purged ${count} bots and their messages!`);
                           } catch (err) {
                              handleFirestoreError(err, 'write', 'users/purge');
                           }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg text-[9px] font-display font-black text-red-500 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10 group h-8 mr-2"
                      >
                         <Bot size={10} className="group-hover:animate-bounce" />
                         Purge Bots
                      </button>
                      <button 
                        onClick={async () => {
                           if (!confirm("This will find all users without a Numeric ID and assign them one. Continue?")) return;
                           try {
                              const usersWithoutId = allUsers.filter(u => !u.numericId);
                              if (usersWithoutId.length === 0) {
                                alert("No users need repair!");
                                return;
                              }
                              let count = 0;
                              const counterRef = doc(db, 'metadata', 'users');
                              const snap = await getDoc(counterRef);
                              let lastId = snap.exists() ? (snap.data().lastGeneratedId || 100000) : 100000;
                              
                              const batchLimit = 50;
                              for (let i = 0; i < usersWithoutId.length; i += batchLimit) {
                                const chunk = usersWithoutId.slice(i, i + batchLimit);
                                const batch = writeBatch(db);
                                for (const u of chunk) {
                                  lastId++;
                                  batch.update(doc(db, 'users', u.id), { numericId: lastId });
                                }
                                batch.set(counterRef, { lastGeneratedId: lastId }, { merge: true });
                                await batch.commit();
                                count += chunk.length;
                              }
                              alert(`Successfully repaired ${count} users!`);
                           } catch (err) {
                              handleFirestoreError(err, 'write', 'users/repair');
                           }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-pulse-purple/20 border border-pulse-purple/40 rounded-lg text-[9px] font-display font-black text-pulse-purple uppercase tracking-widest hover:bg-pulse-purple hover:text-white transition-all shadow-lg shadow-pulse-purple/10 group h-8"
                      >
                        <Shield size={10} className="group-hover:animate-pulse" />
                        Repair IDs
                      </button>
                    </div>

                    <div className="mb-2 flex items-center justify-between px-1">
                       <span className="text-[9px] font-display font-bold text-white/20 uppercase tracking-[0.2em]">Viewing {allUsers.filter(u => {
                            const query = adminSearchQuery.toLowerCase();
                            return u.name?.toLowerCase().includes(query) || 
                                   u.email?.toLowerCase().includes(query) ||
                                   u.numericId?.toString().includes(query) ||
                                   u.id === adminSearchQuery;
                          }).length} Users</span>
                    </div>

                    {/* Users List */}
                    <div className="flex-1 space-y-2 pb-10">
                      {[...allUsers]
                        .sort((a, b) => {
                           const aDate = a.updatedAt?.toMillis() || 0;
                           const bDate = b.updatedAt?.toMillis() || 0;
                           return bDate - aDate;
                        })
                        .filter(u => {
                          const query = adminSearchQuery.toLowerCase();
                          return u.name?.toLowerCase().includes(query) || 
                                 u.email?.toLowerCase().includes(query) ||
                                 u.numericId?.toString().includes(query) ||
                                 u.id === adminSearchQuery;
                        })
                        .map(targetUser => (
                          <div key={targetUser.id} className="relative bg-white/[0.02] border border-white/5 rounded-lg p-2 hover:bg-white/[0.04] transition-all group overflow-hidden">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0">
                                <img src={resolveAvatar(targetUser.avatar)} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0 flex items-center justify-between">
                                <div className="min-w-0 flex items-center gap-2">
                                  <h4 className="text-xs font-display font-black text-white truncate max-w-[100px]">{targetUser.name}</h4>
                                  <span className="text-[7px] font-mono font-black text-pulse-purple bg-pulse-purple/5 px-1.5 py-0.5 rounded border border-pulse-purple/10">ID: {targetUser.numericId || 'N/A'}</span>
                                  <div className="flex gap-1">
                                    {targetUser.isBanned && <span className="text-red-500 text-[7px] font-black uppercase">Banned</span>}
                                    {targetUser.isRestricted && <span className="text-yellow-500 text-[7px] font-black uppercase">Restricted</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="hidden sm:flex gap-3 mr-2">
                                    <div className="flex items-center gap-1 text-yellow-500/80">
                                      <Coins size={8} />
                                      <span className="text-[9px] font-mono font-bold">{targetUser.coins || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-pink-500/80">
                                      <Gem size={8} />
                                      <span className="text-[9px] font-mono font-bold">{targetUser.pinkDiamonds || 0}</span>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      if (editingUserId === targetUser.id) {
                                        setEditingUserId(null);
                                      } else {
                                        setEditingUserId(targetUser.id);
                                        setEditCoins(String(targetUser.coins || 0));
                                        setEditPink(String(targetUser.pinkDiamonds || 0));
                                        setEditBlue(String(targetUser.blueDiamonds || 0));
                                        setEditKd(String(targetUser.stats?.kdRatio || targetUser.kdRatio || 0));
                                        setEditKills(String(targetUser.stats?.kills || 0));
                                        setEditMatches(String(targetUser.stats?.matchesPlayed || targetUser.matches || 0));
                                        setEditWins(String(targetUser.stats?.wins || targetUser.wins || 0));
                                      }
                                    }}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${editingUserId === targetUser.id ? 'bg-pulse-cyan text-abyssal' : 'bg-white/5 text-white/40 hover:text-white'}`}
                                  >
                                    {editingUserId === targetUser.id ? <Check size={12} /> : <Pencil size={12} />}
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {editingUserId === targetUser.id && (
                              <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-200">
                                <div className="space-y-2">
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <div className="space-y-0.5">
                                      <label className="text-[6px] font-black text-white/20 uppercase">Coins</label>
                                      <input type="number" value={editCoins} onChange={(e) => setEditCoins(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-yellow-500 outline-none" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <label className="text-[6px] font-black text-white/20 uppercase">Pink</label>
                                      <input type="number" value={editPink} onChange={(e) => setEditPink(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-pink-500 outline-none" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <label className="text-[6px] font-black text-white/20 uppercase">Blue</label>
                                      <input type="number" value={editBlue} onChange={(e) => setEditBlue(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-blue-500 outline-none" />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button 
                                      onClick={async () => { 
                                        const nextRestricted = !targetUser.isRestricted;
                                        await updateDoc(doc(db, 'users', targetUser.id), { isRestricted: nextRestricted }); 
                                        try {
                                          await NotificationService.createNotification(targetUser.id, {
                                            type: 'Warning Received',
                                            title: nextRestricted ? 'Warning: Account Restricted' : 'Account Restored',
                                            message: nextRestricted 
                                              ? 'Your account has been restricted by an administrator due to reports or community violations.' 
                                              : 'Your account restrictions have been lifted by an administrator. Play fair!',
                                            actionUrl: 'home'
                                          });
                                        } catch (err) {
                                          console.error("Admin notification warning error:", err);
                                        }
                                      }} 
                                      className={`py-1 rounded-md border text-[8px] font-black uppercase tracking-wider ${targetUser.isRestricted ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500' : 'bg-white/5 border-white/10 text-white/40'}`}
                                    >
                                      {targetUser.isRestricted ? 'Unrestrict' : 'Restrict'}
                                    </button>
                                    <button 
                                      onClick={async () => { 
                                        const nextBanned = !targetUser.isBanned;
                                        if (confirm(nextBanned ? "Ban user?" : "Unban user?")) {
                                          await updateDoc(doc(db, 'users', targetUser.id), { isBanned: nextBanned }); 
                                          try {
                                            await NotificationService.createNotification(targetUser.id, {
                                              type: 'Suspension Notice',
                                              title: nextBanned ? 'Notice: Account Suspended' : 'Notice: Suspension Lifted',
                                              message: nextBanned 
                                                ? 'Your account has been suspended indefinitely for serious or repeated violations of terms.' 
                                                : 'Your account suspension has been lifted. Welcome back to the arena!',
                                              actionUrl: 'home'
                                            });
                                          } catch (err) {
                                            console.error("Admin notification ban error:", err);
                                          }
                                        }
                                      }} 
                                      className={`py-1 rounded-md border text-[8px] font-black uppercase tracking-wider ${targetUser.isBanned ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-500'}`}
                                    >
                                      {targetUser.isBanned ? 'Unban' : 'Ban'}
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="grid grid-cols-4 gap-1">
                                    <div className="space-y-0.5">
                                      <label className="text-[6px] font-black text-white/20 uppercase">Play</label>
                                      <input type="number" value={editMatches} onChange={(e) => setEditMatches(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-white outline-none" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <label className="text-[6px] font-black text-white/20 uppercase">Win</label>
                                      <input type="number" value={editWins} onChange={(e) => setEditWins(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-white outline-none" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <label className="text-[6px] font-black text-white/20 uppercase">Kill</label>
                                      <input type="number" value={editKills} onChange={(e) => setEditKills(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-white outline-none" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <label className="text-[6px] font-black text-white/20 uppercase">KD</label>
                                      <input type="number" step="0.01" value={editKd} onChange={(e) => setEditKd(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-pulse-purple font-black outline-none" />
                                    </div>
                                  </div>
                                  <button 
                                    onClick={async () => {
                                      const stats = { kdRatio: parseFloat(editKd) || 0, kills: parseInt(editKills) || 0, matchesPlayed: parseInt(editMatches) || 0, wins: parseInt(editWins) || 0 };
                                      try {
                                        await updateDoc(doc(db, 'users', targetUser.id), { 
                                          coins: parseInt(editCoins) || 0, 
                                          pinkDiamonds: parseInt(editPink) || 0, 
                                          blueDiamonds: parseInt(editBlue) || 0, 
                                          stats, 
                                          kdRatio: stats.kdRatio, 
                                          matches: stats.matchesPlayed, 
                                          wins: stats.wins, 
                                          updatedAt: serverTimestamp() 
                                        });
                                        setEditingUserId(null);
                                      } catch (err) {
                                        handleFirestoreError(err, 'write', `users/${targetUser.id}`);
                                      }
                                    }}
                                    className="w-full py-1.5 bg-pulse-cyan text-abyssal rounded-md font-display font-black text-[8px] uppercase tracking-widest"
                                  >
                                    Apply Changes
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          ))}
                        </div>
                      </div>
                    ) : adminTab === 'badges' ? (
                      <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                          <div>
                            <h3 className="text-lg font-display font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                              <Award className="text-indigo-500 animate-pulse" size={20} />
                              Badge Control Panel
                            </h3>
                            <p className="text-[10px] font-display font-medium text-white/40 uppercase tracking-widest mt-1">Audit and manually revoke earned badges</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {[
                              { id: 'all', label: 'All Earned' },
                              { id: 'esports', label: 'Esports (E)' },
                              { id: 'mod', label: 'Moderators (M)' },
                              { id: 'verified', label: 'Verified (✓)' }
                            ].map(btn => (
                              <button
                                key={btn.id}
                                onClick={() => setAdminSelectedBadgeFilter(btn.id as any)}
                                className={`px-3 py-1.5 rounded-lg font-display font-black text-[9px] uppercase tracking-wider transition-all ${
                                  adminSelectedBadgeFilter === btn.id 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Search within Badges */}
                        <div className="relative mb-6">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                          <input 
                            type="text" 
                            value={adminSearchQuery}
                            onChange={(e) => setAdminSearchQuery(e.target.value)}
                            placeholder="Search users by name, email, or game ID..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
                          />
                        </div>

                        {/* Users List with Earned Badges */}
                        {(() => {
                          const getBadgesForAdminUser = (u: any) => {
                            const list = [];
                            
                            // Esports
                            const kd = u.stats?.kdRatio || u.kdRatio || 0;
                            const matches = u.stats?.matchesPlayed || u.matches || u.matchesPlayed || 0;
                            const wins = u.stats?.wins || u.wins || 0;
                            const isEsports = (kd >= 3.5 && matches >= 50 && wins >= 15) || u.isEsportsPlayer === true;
                            if (isEsports) {
                              list.push({
                                id: 'esports',
                                name: 'Verified Esports Player',
                                symbol: 'E',
                                bg: 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)] text-abyssal font-black',
                                isRevoked: u.revokedBadges?.includes('esports') || false
                              });
                            }

                            // Mod
                            const email = u.email || '';
                            const isProperGmail = email.toLowerCase().endsWith('@gmail.com');
                            const isAuthorized = u.isAdmin === true || u.role === 'moderator' || u.isMod === true || (email.toLowerCase() === 'blameboyop@gmail.com');
                            if (isProperGmail && isAuthorized) {
                              list.push({
                                id: 'mod',
                                name: 'Official Moderator',
                                symbol: 'M',
                                bg: 'bg-gradient-to-r from-fuchsia-500 to-purple-600 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)] text-white font-black',
                                isRevoked: u.revokedBadges?.includes('mod') || false
                              });
                            }

                            // Verified
                            const followers = u.followersCount || u.followers || u.followers_count || 0;
                            if (followers >= 500) {
                              list.push({
                                id: 'verified',
                                name: 'Verified User (Blue Tick)',
                                symbol: '✓',
                                bg: 'bg-gradient-to-r from-cyan-400 to-blue-500 border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.5)] text-white font-bold text-[8px]',
                                isRevoked: u.revokedBadges?.includes('verified') || false
                              });
                            }

                            return list;
                          };

                          const earnedUsers = allUsers.filter(u => {
                            const userBadges = getBadgesForAdminUser(u);
                            if (adminSelectedBadgeFilter === 'all') {
                              return userBadges.length > 0;
                            }
                            return userBadges.some(b => b.id === adminSelectedBadgeFilter);
                          });

                          const searchedEarnedUsers = earnedUsers.filter(u => {
                            if (!adminSearchQuery) return true;
                            const q = adminSearchQuery.toLowerCase();
                            return (
                              u.name?.toLowerCase().includes(q) ||
                              u.email?.toLowerCase().includes(q) ||
                              u.id?.toLowerCase().includes(q) ||
                              u.ingameName?.toLowerCase().includes(q)
                            );
                          });

                          if (searchedEarnedUsers.length === 0) {
                            return (
                              <div className="flex-1 flex flex-col items-center justify-center py-16 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                                <Award size={36} className="text-white/10 mb-2 animate-bounce" />
                                <p className="text-xs font-display font-bold text-white/40 uppercase tracking-wider">No users found with these badges</p>
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {searchedEarnedUsers.map(u => {
                                const userBadges = getBadgesForAdminUser(u);
                                return (
                                  <div key={u.id} className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all relative overflow-hidden group">
                                    <div className="flex items-start gap-3.5">
                                      <img 
                                        src={u.avatar || DEFAULT_AVATAR_URL} 
                                        alt={u.name} 
                                        className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-display font-black text-white uppercase tracking-tight truncate max-w-[130px]" title={u.name}>
                                            {u.name || 'Anonymous'}
                                          </span>
                                          <UserBadges player={u} />
                                        </div>
                                        <p className="text-[9px] font-mono text-white/40 truncate">{u.email || 'No email'}</p>
                                        <p className="text-[9px] font-mono text-pulse-cyan/60 mt-0.5 truncate">ID: {u.id}</p>
                                      </div>
                                    </div>

                                    {/* Badges list and action controls */}
                                    <div className="mt-4 border-t border-white/5 pt-4 space-y-3">
                                      <span className="text-[8px] font-display font-black text-white/30 uppercase tracking-wider block">EARNED BADGES STATUS:</span>
                                      {userBadges
                                        .filter(b => adminSelectedBadgeFilter === 'all' || b.id === adminSelectedBadgeFilter)
                                        .map(badge => (
                                          <div key={badge.id} className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5">
                                            <div className="flex items-center gap-2">
                                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border leading-none font-black ${badge.bg}`}>
                                                {badge.symbol}
                                              </div>
                                              <div className="text-left">
                                                <p className="text-[10px] font-display font-bold text-white leading-tight uppercase tracking-tight">{badge.name}</p>
                                                <p className={`text-[8px] font-display font-black uppercase mt-0.5 tracking-wider ${badge.isRevoked ? 'text-red-400' : 'text-green-400'}`}>
                                                  {badge.isRevoked ? 'Revoked by Admin' : 'Active'}
                                                </p>
                                              </div>
                                            </div>

                                            <button
                                              onClick={async () => {
                                                const currentRevoked = u.revokedBadges || [];
                                                let newRevoked = [...currentRevoked];
                                                if (badge.isRevoked) {
                                                  newRevoked = newRevoked.filter(id => id !== badge.id);
                                                } else {
                                                  newRevoked.push(badge.id);
                                                }

                                                try {
                                                  await updateDoc(doc(db, 'users', u.id), {
                                                    revokedBadges: newRevoked,
                                                    updatedAt: serverTimestamp()
                                                  });
                                                  soundService.playSuccess();
                                                } catch (err) {
                                                  handleFirestoreError(err, 'update', `users/${u.id}`);
                                                }
                                              }}
                                              className={`px-2.5 py-1 rounded-lg text-[8px] font-display font-black uppercase tracking-wider border transition-all ${
                                                badge.isRevoked 
                                                  ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' 
                                                  : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                                              }`}
                                            >
                                              {badge.isRevoked ? 'Activate Badge' : 'Revoke Badge'}
                                            </button>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    ) : adminTab === 'tournaments' ? (
                  <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Create Form */}
                      <div className="lg:col-span-4 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <PlusCircle size={16} className="text-pulse-purple" />
                          <h4 className="text-xs font-display font-black text-white uppercase tracking-widest">New Match</h4>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Title</label>
                            <input 
                              type="text" 
                              value={newTourTitle}
                              onChange={(e) => setNewTourTitle(e.target.value)}
                              placeholder="Tournament Name"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-pulse-purple/50 outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Game</label>
                              <select 
                                value={newTourGame}
                                onChange={(e) => setNewTourGame(e.target.value as any)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-xs focus:border-pulse-purple/50 outline-none"
                              >
                                <option value="bgmi">BGMI</option>
                                <option value="freefire">FREE FIRE</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Type</label>
                              <select 
                                value={newTourType}
                                onChange={(e) => setNewTourType(e.target.value as any)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-xs focus:border-pulse-purple/50 outline-none"
                              >
                                <option value="Squad">SQUAD</option>
                                <option value="Duo">DUO</option>
                                <option value="Solo">SOLO</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Map</label>
                              <input 
                                type="text" 
                                value={newTourMap}
                                onChange={(e) => setNewTourMap(e.target.value)}
                                placeholder="ERANGEL"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-pulse-purple/50 outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Slots</label>
                              <input 
                                type="number" 
                                value={newTourMaxPlayers}
                                onChange={(e) => setNewTourMaxPlayers(e.target.value)}
                                placeholder="48"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-pulse-purple/50 outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Entry (💎)</label>
                              <input 
                                type="number" 
                                value={newTourFee}
                                onChange={(e) => setNewTourFee(e.target.value)}
                                placeholder="5"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-pulse-purple/50 outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Prize</label>
                              <input 
                                type="number" 
                                value={newTourPrize}
                                onChange={(e) => setNewTourPrize(e.target.value)}
                                placeholder="250"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-pulse-purple/50 outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Start Time</label>
                            <input 
                              type="datetime-local" 
                              value={newTourStartTime}
                              onChange={(e) => setNewTourStartTime(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-pulse-purple/50 outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between ml-1">
                            <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest">Cover Image</label>
                            <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5">
                              <button 
                                onClick={() => setTourUploadMode('gallery')} 
                                className={`px-2 py-0.5 rounded text-[7px] font-black uppercase transition-all ${tourUploadMode === 'gallery' ? 'bg-pulse-purple text-white shadow-lg shadow-pulse-purple/20' : 'text-white/20 hover:text-white/40'}`}
                              >
                                Gallery
                              </button>
                              <button 
                                onClick={() => setTourUploadMode('url')} 
                                className={`px-2 py-0.5 rounded text-[7px] font-black uppercase transition-all ${tourUploadMode === 'url' ? 'bg-pulse-purple text-white shadow-lg shadow-pulse-purple/20' : 'text-white/20 hover:text-white/40'}`}
                              >
                                URL
                              </button>
                            </div>
                          </div>

                          {tourUploadMode === 'gallery' ? (
                            <div className="space-y-1">
                              <div className="relative group">
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={(e) => setNewTourFile(e.target.files?.[0] || null)}
                                  className="hidden"
                                  id="tour-upload-input"
                                />
                                <label 
                                  htmlFor="tour-upload-input"
                                  className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/40 cursor-pointer hover:bg-white/[0.08] hover:border-white/20 transition-all border-dashed"
                                >
                                  <Camera size={12} className="group-hover:text-pulse-purple transition-colors" />
                                  <span className="truncate">{newTourFile ? newTourFile.name : 'Select match art...'}</span>
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <input 
                                type="text" 
                                value={newTourImageUrl}
                                onChange={(e) => setNewTourImageUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-pulse-purple/50 outline-none"
                              />
                            </div>
                          )}

                          <button 
                            onClick={async () => {
                              if (!user || isUploadingTour) return;
                              if (!hasPermission(userRole, 'manage_tournaments')) {
                                alert("Unauthorized action. You do not have permission to manage tournaments.");
                                return;
                              }
                              if (!newTourTitle || !newTourFee || !newTourPrize || !newTourMaxPlayers || !newTourMap || !newTourStartTime) {
                                alert("Please fill in all required fields!");
                                return;
                              }
                              setIsUploadingTour(true);
                              setUploadError(null);
                              try {
                                let finalUrl = '';
                                if (tourUploadMode === 'gallery') {
                                  if (!newTourFile) throw new Error("Please select an image file");
                                  finalUrl = await uploadSystemImage(newTourFile, 'tournaments', setUploadProgress, setUploadStep);
                                } else {
                                  finalUrl = newTourImageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200&h=600';
                                }

                                const tourData = {
                                  title: newTourTitle,
                                  imageUrl: finalUrl,
                                  prizePool: Number(newTourPrize),
                                  entryFee: Number(newTourFee),
                                  perKill: Number(newTourKill) || 0,
                                  matchType: newTourType,
                                  map: newTourMap,
                                  descriptionShort: newTourShortDesc,
                                  descriptionFull: newTourFullDesc,
                                  startTime: new Date(newTourStartTime),
                                  maxPlayers: Number(newTourMaxPlayers),
                                  currentPlayers: 0,
                                  totalSlots: Number(newTourMaxPlayers),
                                  filledSlots: 0,
                                  players: [],
                                  game: newTourGame,
                                  createdBy: user.uid,
                                  createdAt: serverTimestamp()
                                };
                                await addDoc(collection(db, 'tournaments'), tourData);
                                // Reset form
                                setNewTourTitle('');
                                setNewTourPrize('');
                                setNewTourFee('');
                                setNewTourKill('');
                                setNewTourMap('');
                                setNewTourMaxPlayers('');
                                setNewTourShortDesc('');
                                setNewTourFullDesc('');
                                setNewTourImageUrl('');
                                setNewTourFile(null);
                                soundService.playSuccess();
                                alert("Tournament created successfully!");
                              } catch (err: any) {
                                setUploadError(err.message);
                                handleFirestoreError(err, 'write', 'tournaments');
                              } finally {
                                setIsUploadingTour(false);
                                setUploadStep('done');
                              }
                            }}
                            disabled={isUploadingTour}
                            className={`w-full py-3 mt-2 rounded-lg bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white font-display font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isUploadingTour ? 'opacity-50 cursor-not-allowed' : 'shadow-pulse-purple/20'}`}
                          >
                            {isUploadingTour ? (
                              <div className="flex items-center justify-center gap-2">
                                <span className="animate-pulse">{uploadStep === 'processing' ? 'Processing...' : uploadStep === 'uploading' ? `Uploading ${Math.round(uploadProgress)}%` : 'Finalizing...'}</span>
                              </div>
                            ) : 'Launch Match'}
                          </button>
                        </div>
                      </div>

                      {/* Tournament List */}
                      <div className="lg:col-span-8 space-y-4 uppercase tracking-widest">
                        <div className="flex items-center justify-between mb-1">
                           <h4 className="text-xs font-display font-black text-white">Live Matches</h4>
                           <span className="text-[9px] font-display font-bold text-white/30">{tournaments.length} Active</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar">
                          {tournaments.map(tour => (
                            <div key={tour.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-2 hover:bg-white/[0.04] transition-all flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-14 h-9 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                  <img src={tour.imageUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-white font-display font-black text-[10px] uppercase truncate">{tour.title}</h5>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[7px] font-black text-pulse-purple uppercase px-1.5 py-0.5 bg-pulse-purple/10 rounded">{tour.matchType}</span>
                                    <span className="text-[7px] font-black text-pulse-cyan uppercase px-1.5 py-0.5 bg-pulse-cyan/10 rounded">{tour.game}</span>
                                    <span className="text-[8px] font-display font-bold text-white/20 uppercase truncate">{tour.map}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 shrink-0">
                                 <div className="text-right hidden sm:block">
                                    <p className="text-[7px] font-display font-bold text-white/20 mb-0.5">Slots</p>
                                    <p className="text-[10px] font-display font-black text-white">{tour.currentPlayers}/{tour.maxPlayers}</p>
                                 </div>
                                 <button 
                                   onClick={() => {
                                      setScoringTournament(tour);
                                      setIsScoringModalOpen(true);
                                   }}
                                   className="w-7 h-7 rounded-lg bg-pulse-cyan/10 border border-pulse-cyan/20 text-pulse-cyan flex items-center justify-center hover:bg-pulse-cyan hover:text-abyssal transition-all shadow-sm"
                                 >
                                   <Trophy size={12} />
                                 </button>
                                 <button 
                                   onClick={async () => {
                                     if (!hasPermission(userRole, 'manage_tournaments')) {
                                       alert("Unauthorized action. You do not have permission to delete tournaments.");
                                       return;
                                     }
                                     if (confirm("Delete tournament?")) {
                                       await deleteDoc(doc(db, 'tournaments', tour.id));
                                     }
                                   }}
                                   className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                 >
                                   <Trash2 size={12} />
                                 </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : adminTab === 'tasks' ? (
                  <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Create Task Form */}
                      <div className="lg:col-span-4 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <PlusCircle size={16} className="text-yellow-500" />
                          <h4 className="text-xs font-display font-black text-white uppercase tracking-widest">New Task</h4>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Title</label>
                            <input 
                              type="text" 
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="e.g. Join Discord"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-yellow-500/50 outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Description</label>
                            <textarea 
                              value={newTaskDesc}
                              onChange={(e) => setNewTaskDesc(e.target.value)}
                              placeholder="Describe the task instructions..."
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-yellow-500/50 outline-none h-20 resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Reward Type</label>
                              <select 
                                value={newTaskRewardType}
                                onChange={(e) => setNewTaskRewardType(e.target.value as any)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-xs focus:border-yellow-500/50 outline-none"
                              >
                                <option value="coins">GOLD</option>
                                <option value="pinkDiamonds">PINK DIAMONDS</option>
                                <option value="blueDiamonds">BLUE DIAMONDS</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Amount</label>
                              <input 
                                type="number" 
                                value={newTaskRewardAmount}
                                onChange={(e) => setNewTaskRewardAmount(e.target.value)}
                                placeholder="100"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-yellow-500/50 outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/5">
                            <button 
                              onClick={() => setIsNewTaskActive(!isNewTaskActive)}
                              className={`w-8 h-4 rounded-full transition-all relative ${isNewTaskActive ? 'bg-yellow-500' : 'bg-white/10'}`}
                            >
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isNewTaskActive ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                            <span className="text-[9px] font-display font-bold text-white/40 uppercase tracking-widest">Active System Task</span>
                          </div>

                          <button 
                            disabled={isSavingTask}
                            onClick={async () => {
                              if (!newTaskTitle || !newTaskDesc || !newTaskRewardAmount) {
                                alert("Please fill all fields!");
                                return;
                              }
                              setIsSavingTask(true);
                              try {
                                await addDoc(collection(db, 'tasks'), {
                                  title: newTaskTitle,
                                  description: newTaskDesc,
                                  rewardType: newTaskRewardType,
                                  rewardAmount: Number(newTaskRewardAmount),
                                  isActive: isNewTaskActive,
                                  createdAt: serverTimestamp()
                                });
                                setNewTaskTitle('');
                                setNewTaskDesc('');
                                setNewTaskRewardAmount('');
                                soundService.playSuccess();
                                alert("Task created successfully!");
                              } catch (err) {
                                handleFirestoreError(err, 'write', 'tasks');
                              } finally {
                                setIsSavingTask(false);
                              }
                            }}
                            className="w-full py-3 rounded-lg bg-yellow-500 text-abyssal font-display font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-yellow-500/20 disabled:opacity-50"
                          >
                            {isSavingTask ? 'Saving...' : 'Deploy Task'}
                          </button>
                        </div>
                      </div>

                      {/* Task List */}
                      <div className="lg:col-span-8 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                           <h4 className="text-xs font-display font-black text-white uppercase tracking-widest">Available Tasks</h4>
                           <span className="text-[9px] font-display font-bold text-white/30">{earningTasks.length} Configured</span>
                        </div>
                        
                        <div className="space-y-3">
                          {earningTasks.map(task => (
                            <div key={task.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-yellow-500/30 transition-all">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${task.isActive ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                  <ListChecks size={20} />
                                </div>
                                <div>
                                  <h5 className="text-[13px] font-display font-black text-white uppercase tracking-tight">{task.title}</h5>
                                  <p className="text-[10px] text-white/40 max-w-sm truncate">{task.description}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1">
                                      {task.rewardType === 'coins' ? <Coins size={10} className="text-yellow-500" /> : <Gem size={10} className="text-pink-500" />}
                                      <span className="text-[9px] font-display font-bold text-white/60 uppercase tracking-widest">{task.rewardAmount} {task.rewardType}</span>
                                    </div>
                                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${task.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                      {task.isActive ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={async () => {
                                    await updateDoc(doc(db, 'tasks', task.id), { isActive: !task.isActive });
                                  }}
                                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                                >
                                  {task.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm("Delete this task?")) {
                                      await deleteDoc(doc(db, 'tasks', task.id));
                                    }
                                  }}
                                  className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {earningTasks.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                              <ClipboardList size={48} className="mb-4" />
                              <p className="font-display font-black text-sm uppercase tracking-widest text-center">No tasks deployed yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : adminTab === 'reports' ? (
                  <div className="flex-1 flex flex-col p-4 md:p-8">
                    {/* AI Analytics Summary */}
                    {(aiReportSummary || isAnalyzingReports) && (
                      <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-6 bg-gradient-to-br from-pulse-cyan/10 to-pulse-purple/10 border border-white/10 rounded-[32px] overflow-hidden relative"
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                          <Sparkles size={120} />
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-pulse-cyan">
                              <Sparkles size={18} />
                            </div>
                            <h4 className="text-sm font-display font-black text-white uppercase tracking-widest">AI Intelligence Summary</h4>
                          </div>
                          
                          {isAnalyzingReports ? (
                            <div className="flex items-center gap-2 text-white/40">
                              <div className="w-3 h-3 border-2 border-white/20 border-t-pulse-cyan rounded-full animate-spin" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">AI Deep Dive...</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {aiReportSummary?.flaggedUsers?.map((flag: any, i: number) => (
                                  <div key={i} className="bg-black/20 border border-white/5 p-2 rounded-xl flex items-start gap-3">
                                    <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1 ${flag.severity === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                    <div>
                                      <p className="text-[9px] font-display font-black text-white mb-0.5 uppercase">User: {flag.userId}</p>
                                      <p className="text-[9px] text-white/50 leading-tight truncate">{flag.summary}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {aiReportSummary?.trends?.map((trend: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[8px] font-bold text-white/40 uppercase tracking-widest">
                                    {trend}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2 mb-3 sticky top-0 bg-[#0a0b25] py-2 z-10 border-b border-white/5">
                      <button 
                        onClick={() => setReportFilter('all')}
                        className={`px-3 py-1.5 rounded-lg border font-display font-black text-[9px] uppercase tracking-widest transition-all ${reportFilter === 'all' ? 'bg-white/20 border-white/20 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'}`}
                      >
                        All
                      </button>
                      {REPORT_REASONS.map(reason => (
                        <button 
                          key={reason}
                          onClick={() => setReportFilter(reason)}
                          className={`px-3 py-1.5 rounded-lg border font-display font-black text-[9px] uppercase tracking-widest transition-all ${reportFilter === reason ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'}`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    {/* Reports View */}
                    <div className="flex-1 space-y-2">
                      {reportFilter === 'all' ? (
                        allReports
                          .sort((a,b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0))
                          .map(report => (
                            <div key={report.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 hover:bg-white/[0.04] transition-all">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-4">
                                  <div className="p-2 bg-red-500/10 rounded-lg text-red-500 border border-red-500/20">
                                    <AlertTriangle size={16} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="text-[8px] font-black text-white/20 uppercase">Reported:</span>
                                      <span className="text-[10px] font-mono font-bold text-white truncate max-w-[100px]">{report.reportedId}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {report.reasons?.map((r: string) => (
                                        <span key={r} className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-[8px] font-black text-red-500 uppercase tracking-widest">{r}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[9px] font-display font-bold text-white/30 uppercase">
                                    {report.timestamp?.toDate().toLocaleDateString()}
                                  </span>
                                  <button 
                                    onClick={() => {
                                      setAdminTab('users');
                                      setAdminSearchQuery(report.reportedId);
                                    }}
                                    className="px-4 py-1.5 rounded-lg bg-pulse-cyan/10 border border-pulse-cyan/30 text-pulse-cyan font-display font-black text-[9px] uppercase tracking-widest hover:bg-pulse-cyan hover:text-white transition-all shadow-lg"
                                  >
                                    Take Action
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="space-y-2">
                           <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg mb-2">
                              <p className="text-[9px] font-display font-black text-red-500 uppercase tracking-widest">Most Reported: {reportFilter}</p>
                           </div>
                           
                           {/* Aggregate counts */}
                           {(() => {
                              const aggregated: Record<string, number> = {};
                              allReports
                                .filter(r => r.reasons?.includes(reportFilter))
                                .forEach(r => {
                                   aggregated[r.reportedId] = (aggregated[r.reportedId] || 0) + 1;
                                });
                              
                              const sortedAggregated = Object.entries(aggregated)
                                .sort((a, b) => b[1] - a[1]);

                              if (sortedAggregated.length === 0) {
                                return (
                                  <div className="text-center py-12 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <Shield size={24} className="mx-auto text-white/5 mb-2" />
                                    <p className="text-white/20 font-display font-black text-[10px] uppercase tracking-widest">No reports found</p>
                                  </div>
                                );
                              }

                              return sortedAggregated.map(([reportedId, count]) => {
                                 const targetUserData = allUsers.find(u => u.id === reportedId || u.numericId?.toString() === reportedId);
                                 return (
                                   <div key={reportedId} className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5 hover:bg-white/[0.04] transition-all flex items-center justify-between gap-3">
                                     <div className="flex items-center gap-2.5">
                                       <div className="relative">
                                          <div className={`p-1.5 rounded-lg border ${count > 5 ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500'}`}>
                                            <Users size={14} />
                                          </div>
                                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-[#0a0b1e] flex items-center justify-center font-display font-black text-[8px] shadow-md border border-white/10">
                                            {count}
                                          </div>
                                       </div>
                                       <div>
                                          <h5 className="text-white font-display font-black text-xs uppercase mb-0.5">
                                             {targetUserData?.name || 'User'}
                                          </h5>
                                          <div className="flex items-center gap-1.5">
                                             <span className="text-[8px] font-mono font-bold text-white/30 truncate max-w-[60px]">ID: {reportedId}</span>
                                             <div className="w-0.5 h-0.5 rounded-full bg-white/10" />
                                             <span className="text-[8px] font-display font-bold text-white/20 uppercase">{count} R</span>
                                          </div>
                                       </div>
                                     </div>
                                     <button 
                                       onClick={() => {
                                         setAdminTab('users');
                                         setAdminSearchQuery(reportedId);
                                      }}
                                      className="px-3 py-1.5 rounded-md bg-red-500 flex items-center justify-center text-white font-display font-black text-[8px] uppercase tracking-wider hover:bg-red-600 transition-all shadow-md"
                                     >
                                       Review
                                     </button>
                                   </div>
                                 );
                              });
                           })()}
                        </div>
                      )}
                    </div>
                  </div>
                ) : adminTab === 'shop' ? (
                  <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-5xl mx-auto w-full space-y-8">
                       <div className="text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-fire-orange/10 border border-fire-orange/20 flex items-center justify-center mx-auto shadow-2xl">
                          <ShoppingBag size={32} className="text-fire-orange" />
                        </div>
                        <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">Armory Forge</h3>
                        <p className="text-[10px] font-display font-medium text-white/30 uppercase tracking-[0.2em] max-w-xs mx-auto">Register new weapons and gear for the marketplace.</p>
                      </div>

                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-display font-black text-white uppercase tracking-widest">Register New Item</h4>
                          <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                            <button onClick={() => setShopUploadMode('gallery')} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${shopUploadMode === 'gallery' ? 'bg-pulse-purple text-white shadow-lg shadow-pulse-purple/20' : 'text-white/20 hover:text-white/40'}`}>Gallery</button>
                            <button onClick={() => setShopUploadMode('url')} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${shopUploadMode === 'url' ? 'bg-pulse-purple text-white shadow-lg shadow-pulse-purple/20' : 'text-white/20 hover:text-white/40'}`}>URL</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <input type="text" placeholder="Item Name" value={newShopName} onChange={e => setNewShopName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-fire-orange/50" />
                            {shopUploadMode === 'gallery' ? (
                              <label className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/40 cursor-pointer hover:bg-white/[0.08] transition-all border-dashed">
                                <input type="file" accept="image/*" className="hidden" onChange={e => setNewShopFile(e.target.files?.[0] || null)} />
                                <Camera size={14} /> {newShopFile ? newShopFile.name : 'Select Item Art'}
                              </label>
                            ) : (
                               <input type="text" placeholder="Image URL" value={logoUrlInput} onChange={e => setLogoUrlInput(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-fire-orange/50" />
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <select value={newShopRarity} onChange={e => setNewShopRarity(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-fire-orange/50">
                                <option value="Common">Common</option>
                                <option value="Rare">Rare</option>
                                <option value="Epic">Epic</option>
                                <option value="Legendary">Legendary</option>
                              </select>
                              <div className="flex items-center gap-2">
                                <select value={newShopCurrency} onChange={e => setNewShopCurrency(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-fire-orange/50">
                                  <option value="coins">Gold</option>
                                  <option value="pink">Pink</option>
                                  <option value="blue">Blue</option>
                                </select>
                                <input type="number" placeholder="Price" value={newShopPrice} onChange={e => setNewShopPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-fire-orange/50" />
                              </div>
                            </div>
                          </div>
                          <button 
                            disabled={isUploadingShop}
                            onClick={async () => {
                              if (!newShopName || !newShopPrice) return;
                              setIsUploadingShop(true);
                              try {
                                let url = shopUploadMode === 'gallery' && newShopFile ? await uploadSystemImage(newShopFile, 'shop', setUploadProgress, setUploadStep) : logoUrlInput;
                                await addDoc(collection(db, 'shop_items'), {
                                  name: newShopName,
                                  img: url,
                                  price: Number(newShopPrice),
                                  type: newShopCurrency,
                                  rarity: newShopRarity,
                                  createdAt: serverTimestamp()
                                });
                                setNewShopName(''); setNewShopPrice(''); setNewShopFile(null);
                                soundService.playSuccess();
                                alert("Item forged successfully!");
                              } catch (err: any) {
                                handleFirestoreError(err, 'write', 'shop_items');
                              } finally {
                                setIsUploadingShop(false);
                                setUploadStep('done');
                              }
                            }}
                            className="w-full bg-gradient-to-r from-fire-orange to-pulse-purple h-full min-h-[100px] rounded-2xl text-white font-display font-black uppercase tracking-widest shadow-lg shadow-fire-orange/20 hover:scale-[1.02] active:scale-95 transition-all text-xs"
                          >
                            {isUploadingShop ? `Uploading ${Math.round(uploadProgress)}%` : 'Forge Item'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {allShopItems.map(item => (
                          <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden group relative">
                            <img src={item.img} className="w-full aspect-square object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                            <div className="p-3">
                              <p className="text-[10px] font-display font-black text-white uppercase truncate">{item.name}</p>
                              <button onClick={async () => { if(confirm("Destroy?")) await deleteDoc(doc(db, 'shop_items', item.id)); }} className="absolute top-2 right-2 p-2 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-white"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : adminTab === 'banners' ? (
                   <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto text-white">
                      <div className="max-w-4xl mx-auto w-full space-y-8">
                         <div className="text-center space-y-3">
                          <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto shadow-2xl">
                            <Sparkles size={32} className="text-pink-500" />
                          </div>
                          <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">Banner Deployment</h3>
                          <p className="text-[10px] font-display font-medium text-white/30 uppercase tracking-[0.2em] max-w-xs mx-auto">Update the home screen marquee and highlights.</p>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                 <input type="text" placeholder="Title" value={newBannerTitle} onChange={e => setNewBannerTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-pink-500/50" />
                                 <input type="text" placeholder="Subtitle" value={newBannerSubtitle} onChange={e => setNewBannerSubtitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-pink-500/50" />
                                 <input type="text" placeholder="Action Button Text" value={newBannerAction} onChange={e => setNewBannerAction(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-pink-500/50" />
                                 
                                 <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 mb-2">
                                  <button onClick={() => setBannerUploadMode('gallery')} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${bannerUploadMode === 'gallery' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-white/20 hover:text-white/40'}`}>Gallery</button>
                                  <button onClick={() => setBannerUploadMode('url')} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${bannerUploadMode === 'url' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-white/20 hover:text-white/40'}`}>URL</button>
                                </div>

                                 {bannerUploadMode === 'gallery' ? (
                                    <label className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/40 cursor-pointer hover:bg-white/[0.08] transition-all border-dashed">
                                      <input type="file" accept="image/*" className="hidden" onChange={e => setNewBannerFile(e.target.files?.[0] || null)} />
                                      <Camera size={14} /> {newBannerFile ? newBannerFile.name : 'Select Large Artwork'}
                                    </label>
                                 ) : (
                                    <input type="text" placeholder="Image URL" value={logoUrlInput} onChange={e => setLogoUrlInput(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-pink-500/50" />
                                 )}
                              </div>
                              <div className="flex flex-col justify-between">
                                 <div className="bg-black/40 rounded-2xl aspect-[16/9] overflow-hidden border border-white/5 relative group">
                                    {newBannerFile ? <img src={URL.createObjectURL(newBannerFile)} className="w-full h-full object-cover" /> : logoUrlInput ? <img src={logoUrlInput} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10">PREVIEW</div>}
                                 </div>
                                 <button 
                                    disabled={isUploadingBanner}
                                    onClick={async () => {
                                      if (!newBannerTitle) return;
                                      setIsUploadingBanner(true);
                                      try {
                                        let url = bannerUploadMode === 'gallery' && newBannerFile ? await uploadSystemImage(newBannerFile, 'banners', setUploadProgress, setUploadStep) : logoUrlInput;
                                        await addDoc(collection(db, 'banners'), {
                                          title: newBannerTitle,
                                          subtitle: newBannerSubtitle,
                                          action: newBannerAction,
                                          img: url,
                                          createdAt: serverTimestamp()
                                        });
                                        setNewBannerTitle(''); setNewBannerSubtitle(''); setNewBannerFile(null);
                                        soundService.playSuccess();
                                        alert("Banner deployed!");
                                      } catch (err: any) {
                                         handleFirestoreError(err, 'write', 'banners');
                                      } finally {
                                        setIsUploadingBanner(false);
                                        setUploadStep('done');
                                      }
                                    }}
                                    className="w-full py-4 mt-4 bg-pink-500 hover:bg-pink-600 text-white font-display font-black rounded-2xl transition-all shadow-lg shadow-pink-500/20 active:scale-95 uppercase tracking-widest text-xs"
                                 >
                                    {isUploadingBanner ? `Deploying ${Math.round(uploadProgress)}%` : 'Deploy Banner'}
                                 </button>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-4">
                           {allBanners.map(banner => (
                             <div key={banner.id} className="relative rounded-3xl overflow-hidden group aspect-[21/9] border border-white/10">
                                <img src={banner.img} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex flex-col justify-center p-8">
                                   <h4 className="text-xl font-display font-black uppercase italic">{banner.title}</h4>
                                   <p className="text-sm text-white/60 mb-4">{banner.subtitle}</p>
                                   <button className="px-6 py-2 bg-white text-black font-black text-[10px] uppercase rounded-xl w-fit">{banner.action}</button>
                                </div>
                                <button onClick={async () => { if(confirm("Archived?")) await deleteDoc(doc(db, 'banners', banner.id)); }} className="absolute top-4 right-4 p-2 bg-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                             </div>
                           ))}
                        </div>
                      </div>
                   </div>
                ) : adminTab === 'logos' ? (
                  <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto w-full space-y-8">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto shadow-2xl">
                          <Sparkles size={32} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">Logo Factory</h3>
                        <p className="text-[10px] font-display font-medium text-white/30 uppercase tracking-[0.2em] max-w-xs mx-auto">Design and manage the official identity library.</p>
                      </div>

                      {/* Add Logo Form */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-display font-black text-white uppercase tracking-widest">Register New Identity</h4>
                          <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                            <button 
                              onClick={() => setLogoUploadMode('gallery')} 
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${logoUploadMode === 'gallery' ? 'bg-pulse-purple text-white shadow-lg shadow-pulse-purple/20' : 'text-white/20 hover:text-white/40'}`}
                            >
                              Gallery
                            </button>
                            <button 
                              onClick={() => setLogoUploadMode('url')} 
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${logoUploadMode === 'url' ? 'bg-pulse-purple text-white shadow-lg shadow-pulse-purple/20' : 'text-white/20 hover:text-white/40'}`}
                            >
                              URL
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Identity Name</label>
                              <input 
                                type="text"
                                placeholder="e.g. Neon Dragon"
                                value={newLogoName}
                                onChange={(e) => setNewLogoName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-green-500/50"
                              />
                            </div>

                            {logoUploadMode === 'gallery' ? (
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Select File (Compressed to 512px)</label>
                                <div className="relative group">
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setNewLogoFile(file);
                                        const reader = new FileReader();
                                        reader.onloadend = () => setNewLogoPreview(reader.result as string);
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                    className="hidden"
                                    id="logo-upload-input"
                                  />
                                  <label 
                                    htmlFor="logo-upload-input"
                                    className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/40 cursor-pointer hover:bg-white/[0.08] hover:border-white/20 transition-all border-dashed"
                                  >
                                    <Camera size={14} className="group-hover:text-green-500 transition-colors" />
                                    {newLogoFile ? newLogoFile.name : 'Choose from repository...'}
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Identity URL</label>
                                <input 
                                  type="text"
                                  placeholder="https://..."
                                  value={logoUrlInput}
                                  onChange={(e) => {
                                    setLogoUrlInput(e.target.value);
                                    setNewLogoPreview(e.target.value);
                                  }}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-green-500/50"
                                />
                              </div>
                            )}

                            <div className="flex gap-4">
                              <div className="flex-1 space-y-2">
                                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Access Type</label>
                                <div className="flex gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
                                   <button 
                                     onClick={() => setIsNewLogoPremium(false)}
                                     className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!isNewLogoPremium ? 'bg-green-500 text-white' : 'text-white/20 hover:text-white/40'}`}
                                   >
                                     Free
                                   </button>
                                   <button 
                                     onClick={() => setIsNewLogoPremium(true)}
                                     className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${isNewLogoPremium ? 'bg-pulse-purple text-white' : 'text-white/20 hover:text-white/40'}`}
                                   >
                                     Premium
                                   </button>
                                </div>
                              </div>
                            </div>

                            {isNewLogoPremium && (
                              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Currency</label>
                                  <select 
                                    value={newLogoCurrency}
                                    onChange={(e) => setNewLogoCurrency(e.target.value as any)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-green-500/50 appearance-none"
                                  >
                                    <option value="gold">Gold (Coins)</option>
                                    <option value="pink">Pink (Diamonds)</option>
                                    <option value="blue">Blue (Diamonds)</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Cost</label>
                                  <input 
                                    type="number"
                                    value={newLogoPrice}
                                    onChange={(e) => setNewLogoPrice(parseInt(e.target.value) || 0)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-green-500/50"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-center justify-center bg-black/40 border border-white/5 rounded-[32px] overflow-hidden relative min-h-[250px]">
                            {newLogoPreview ? (
                              <img src={newLogoPreview} className="w-full h-full object-contain p-8" />
                            ) : (
                              <div className="flex flex-col items-center gap-3 text-white/10">
                                <Shield size={48} />
                                <p className="text-[10px] font-display font-black uppercase tracking-[0.4em]">Preview</p>
                              </div>
                            )}
                            {isUploadingLogo && (
                              <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                                <motion.div 
                                  animate={{ rotate: 360 }} 
                                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                  className="text-green-500 mb-4"
                                >
                                  <Sparkles size={32} />
                                </motion.div>
                                <p className="text-[10px] font-display font-black text-white uppercase tracking-widest mb-3">
                                  {uploadStep === 'processing' ? 'Compressing Identity...' :
                                   uploadStep === 'uploading' ? `Broadcasting Data... ${Math.round(uploadProgress)}%` : 
                                   uploadStep === 'saving' ? 'Verifying Transaction...' : 'Success'}
                                </p>
                                <div className="w-full max-w-[150px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-green-500" 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={async () => {
                            if (!newLogoName || isUploadingLogo) return;
                            setIsUploadingLogo(true);
                            setUploadProgress(0);
                            setUploadError(null);
                            
                            try {
                              let finalUrl = '';
                              if (logoUploadMode === 'gallery') {
                                if (!newLogoFile) throw new Error("No file selected");
                                finalUrl = await uploadSystemImage(
                                  newLogoFile, 
                                  'id_vault', 
                                  setUploadProgress, 
                                  setUploadStep
                                );
                              } else {
                                finalUrl = logoUrlInput;
                                if (!finalUrl) throw new Error("No URL provided");
                              }

                              setUploadStep('saving');
                              await addDoc(collection(db, 'logos'), {
                                name: newLogoName,
                                imageUrl: finalUrl,
                                isPremium: isNewLogoPremium,
                                currencyType: isNewLogoPremium ? newLogoCurrency : 'gold',
                                priceAmount: isNewLogoPremium ? newLogoPrice : 0,
                                isActive: true,
                                createdAt: serverTimestamp()
                              });

                              setUploadStep('done');
                              setNewLogoName('');
                              setNewLogoFile(null);
                              setNewLogoPreview(null);
                              setLogoUrlInput('');
                              setTimeout(() => setIsUploadingLogo(false), 1500);
                            } catch (err: any) {
                              console.error(err);
                              alert(err.message || "Factory failure");
                              setIsUploadingLogo(false);
                            }
                          }}
                          disabled={isUploadingLogo}
                          className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-display font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-green-500/20 active:scale-95 disabled:opacity-50"
                        >
                          {isUploadingLogo ? 'Manufacturing...' : 'Authorize and Deploy Identity'}
                        </button>
                      </div>

                      {/* Active Logos Library */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-20">
                        {allLogos.map(logo => (
                          <div key={logo.id} className="relative aspect-square rounded-[24px] bg-white/[0.02] border border-white/5 overflow-hidden group hover:border-green-500/50 transition-all shadow-lg">
                            <img src={logo.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all" />
                            
                            <div className="absolute top-2 right-2 flex gap-1 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={async () => {
                                  await updateDoc(doc(db, 'logos', logo.id), { isActive: !logo.isActive });
                                }}
                                className={`p-1.5 rounded-lg border border-white/10 backdrop-blur-md transition-all ${logo.isActive ? 'bg-green-500 text-white' : 'bg-white/5 text-white/40'}`}
                              >
                                <Check size={12} />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (confirm("Decommission this identity?")) await deleteDoc(doc(db, 'logos', logo.id));
                                }}
                                className="p-1.5 bg-red-500/80 text-white rounded-lg border border-red-500/20 backdrop-blur-md"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <div className="absolute bottom-2 left-2 right-2">
                               <p className="text-[8px] font-display font-black text-white uppercase italic truncate mb-1">{logo.name}</p>
                               <div className="flex items-center gap-1">
                                 {!logo.isPremium ? (
                                   <span className="text-[7px] font-black text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded uppercase">Public</span>
                                 ) : (
                                   <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                                      {logo.currencyType === 'gold' && <Coins size={8} className="text-yellow-500" />}
                                      {logo.currencyType === 'pink' && <Gem size={8} className="text-pulse-purple" />}
                                      {logo.currencyType === 'blue' && <Sparkles size={8} className="text-pulse-cyan" />}
                                      <span className="text-[8px] font-mono font-bold text-white">{logo.priceAmount}</span>
                                   </div>
                                 )}
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : adminTab === 'broadcast' ? (
                  <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-2xl mx-auto w-full space-y-6 md:space-y-8">
                       <div className="text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto shadow-2xl">
                          <Bell size={32} className="text-orange-500" />
                        </div>
                        <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">Global Broadcast</h3>
                        <p className="text-[10px] font-display font-medium text-white/30 uppercase tracking-[0.2em] max-w-xs mx-auto">Send push notifications and announcements to all users.</p>
                      </div>

                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-display font-black text-white/30 uppercase tracking-widest ml-1">Title</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Server Maintenance or New Tournament!"
                              value={notificationTitle}
                              onChange={(e) => setNotificationTitle(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500/50 transition-all font-display font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-display font-black text-white/30 uppercase tracking-widest ml-1">Message</label>
                             <textarea 
                              placeholder="Type your message here..."
                              value={notificationMessage}
                              onChange={(e) => setNotificationMessage(e.target.value)}
                              rows={4}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500/50 transition-all font-medium resize-none"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={async () => {
                            if (!notificationTitle || !notificationMessage || isSendingNotification) return;
                            setIsSendingNotification(true);
                            try {
                              await addDoc(collection(db, 'announcements'), {
                                title: notificationTitle,
                                message: notificationMessage,
                                timestamp: serverTimestamp(),
                                authorId: user?.uid
                              });
                              setNotificationTitle('');
                              setNotificationMessage('');
                              alert("Broadcast sent successfully!");
                            } catch (err) {
                              handleFirestoreError(err, 'write', 'announcements');
                            } finally {
                              setIsSendingNotification(false);
                            }
                          }}
                          disabled={isSendingNotification}
                          className={`w-full py-4 rounded-xl font-display font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${isSendingNotification ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-xl shadow-orange-500/20 active:scale-95 hover:brightness-110'}`}
                        >
                          <Send size={16} />
                          {isSendingNotification ? 'Sending...' : 'Publish Broadcast'}
                        </button>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-display font-black text-white/20 uppercase tracking-[0.3em] ml-1">Recent Announcements</h4>
                        <div className="space-y-3">
                          {announcements.slice(0, 10).map(ann => (
                            <div key={ann.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-4 group">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                <Bell size={18} className="text-white/20 group-hover:text-orange-500 transition-colors" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <h5 className="text-[11px] font-display font-black text-white uppercase truncate">{ann.title}</h5>
                                  <span className="text-[8px] font-mono text-white/20 whitespace-nowrap">
                                    {ann.timestamp?.toDate().toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed">{ann.message}</p>
                              </div>
                              <button 
                                onClick={async () => {
                                  if (confirm("Delete this announcement?")) {
                                    await deleteDoc(doc(db, 'announcements', ann.id));
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-xl mx-auto w-full space-y-6 md:space-y-8">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-pulse-purple/10 border border-pulse-purple/20 flex items-center justify-center mx-auto shadow-2xl">
                          <Zap size={32} className="text-pulse-purple" />
                        </div>
                        <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">App Governance</h3>
                        <p className="text-[10px] font-display font-medium text-white/30 uppercase tracking-[0.2em] max-w-xs mx-auto">Publish updates and check system health.</p>
                      </div>

                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-display font-black text-pulse-cyan uppercase tracking-widest mb-0.5">Build Version</p>
                            <p className="text-xs font-mono font-bold text-white uppercase">V{APP_VERSION_NAME} ({APP_VERSION_CODE})</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-display font-black text-white/30 uppercase tracking-widest mb-0.5">Live Version</p>
                            <p className="text-xs font-mono font-bold text-white uppercase">CODE: {systemConfig?.latestVersionCode || '??'}</p>
                          </div>
                        </div>

                        {/* Maintenance & Message */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                           <div className="flex items-center justify-between">
                             <div>
                               <h5 className="text-[10px] font-display font-black text-white uppercase tracking-widest">Maintenance Mode</h5>
                               <p className="text-[8px] text-white/30 uppercase mt-0.5 font-bold">Restrict app access to admins only</p>
                             </div>
                             <button 
                               onClick={async () => {
                                 try {
                                   await setDoc(doc(db, 'system', 'config'), {
                                     maintenanceMode: !systemConfig?.maintenanceMode
                                   }, { merge: true });
                                 } catch (err) {
                                   handleFirestoreError(err, 'write');
                                 }
                               }}
                               className={`w-12 h-6 rounded-full relative transition-all ${systemConfig?.maintenanceMode ? 'bg-red-500' : 'bg-white/10'}`}
                             >
                               <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${systemConfig?.maintenanceMode ? 'left-7' : 'left-1'}`} />
                             </button>
                           </div>

                           <div className="space-y-2">
                             <div className="flex items-center justify-between">
                               <h5 className="text-[10px] font-display font-black text-white uppercase tracking-widest">Global Message</h5>
                               {systemConfig?.globalMessage && (
                                 <button 
                                   onClick={async () => {
                                     await setDoc(doc(db, 'system', 'config'), { globalMessage: '' }, { merge: true });
                                   }}
                                   className="text-[8px] font-black text-red-500 uppercase"
                                 >
                                   Clear
                                 </button>
                               )}
                             </div>
                             <div className="flex gap-2">
                               <input 
                                 type="text"
                                 id="global-message-input"
                                 placeholder="e.g. Server maintenance at 10 PM"
                                 className="flex-1 bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-pulse-cyan/50 transition-all font-medium"
                                 onKeyDown={async (e) => {
                                   if (e.key === 'Enter') {
                                     const val = (e.target as HTMLInputElement).value;
                                     if (val) {
                                       await setDoc(doc(db, 'system', 'config'), { 
                                         globalMessage: val,
                                         messageType: 'info' 
                                       }, { merge: true });
                                       (e.target as HTMLInputElement).value = '';
                                     }
                                   }
                                 }}
                               />
                               <button 
                                 onClick={async () => {
                                   const input = document.getElementById('global-message-input') as HTMLInputElement;
                                   if (input.value) {
                                     await setDoc(doc(db, 'system', 'config'), { 
                                       globalMessage: input.value,
                                       messageType: 'info' 
                                     }, { merge: true });
                                     input.value = '';
                                   }
                                 }}
                                 className="w-10 h-8 rounded-lg bg-pulse-cyan text-abyssal flex items-center justify-center shrink-0"
                               >
                                 <Send size={14} />
                               </button>
                             </div>
                           </div>
                        </div>

                        <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                          <p className="text-[10px] font-display font-bold text-white/60 leading-relaxed italic">
                            "Publishing this will notify all players that a new version is available."
                          </p>
                        </div>

                        <button 
                          onClick={async () => {
                            if (confirm(`ARE YOU SURE? This will publish version code ${APP_VERSION_CODE} to ALL users.`)) {
                              try {
                                await setDoc(doc(db, 'system', 'config'), {
                                  latestVersionCode: APP_VERSION_CODE,
                                  latestVersionName: APP_VERSION_NAME,
                                  publishMessage: "Squad UP Arena - Version Update Successful",
                                  publishedAt: serverTimestamp(),
                                  publishedBy: user?.uid
                                }, { merge: true });
                                alert("PUBLISH SUCCESSFUL!");
                              } catch (err) {
                                handleFirestoreError(err, 'write', 'system/config');
                              }
                            }
                          }}
                          disabled={systemConfig?.latestVersionCode === APP_VERSION_CODE}
                          className={`w-full py-4 rounded-xl font-display font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                            systemConfig?.latestVersionCode === APP_VERSION_CODE
                            ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                            : 'bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white shadow-xl shadow-pulse-purple/30 hover:scale-[1.02]'
                          }`}
                        >
                          <Zap size={16} />
                          {systemConfig?.latestVersionCode === APP_VERSION_CODE ? 'Latest Version' : 'Publish Update'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <p className="text-[8px] font-display font-bold text-white/20 uppercase tracking-widest">Players</p>
                            <p className="text-xl font-display font-black text-white">{allUsers.length}</p>
                         </div>
                         <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <p className="text-[8px] font-display font-bold text-white/20 uppercase tracking-widest">Active Matches</p>
                            <p className="text-xl font-display font-black text-white">{tournaments.length}</p>
                         </div>
                      </div>

                      {/* Monitoring */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-display font-black text-white uppercase tracking-widest">System Health</h4>
                          <span className="text-[8px] font-bold text-pulse-cyan uppercase tracking-widest bg-pulse-cyan/10 px-2 py-0.5 rounded">AI Monitoring</span>
                        </div>
                        
                        <div className="space-y-2">
                          {systemLogs.length === 0 ? (
                            <div className="p-6 border border-white/5 rounded-2xl bg-white/[0.01] text-center">
                              <CheckCircle2 size={24} className="mx-auto text-green-500/20 mb-2" />
                              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">System healthy.</p>
                            </div>
                          ) : (
                            systemLogs
                              .sort((a,b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0))
                              .map(log => (
                                <div key={log.id} className="p-3.5 border border-white/5 rounded-2xl bg-white/[0.02] flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                                    <AlertTriangle size={16} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[9px] font-display font-black text-white uppercase italic">In {log.feature}</span>
                                    </div>
                                    <p className="text-[10px] text-white/60 mb-2 leading-relaxed truncate">"{log.message}"</p>
                                    <div className="p-2 rounded-lg bg-pulse-cyan/5 border border-pulse-cyan/10">
                                      <p className="text-[9px] text-pulse-cyan/80 italic">{log.suggestion}</p>
                                    </div>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>

                      {/* Maintenance Section */}
                      <div className="space-y-4 mt-8 pt-8 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-display font-black text-white uppercase tracking-widest">Maintenance</h4>
                          <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded">Danger Zone</span>
                        </div>
                        
                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
                          <p className="text-[10px] text-red-500/60 font-bold uppercase mb-4 tracking-tight leading-relaxed">
                            Permanently wipe all legacy logo data from the database and storage. This action is irreversible.
                          </p>
                          <button 
                            onClick={async () => {
                              if (!window.confirm("ARE YOU SURE? This will permanently delete all logo documents and clear user logo references!")) return;
                              
                              try {
                                const systemLogRef = doc(collection(db, 'system_logs'));
                                await setDoc(systemLogRef, {
                                  type: 'LOGS_CLEANUP',
                                  feature: 'Logo System',
                                  message: 'Manual database cleanup triggered by Admin.',
                                  timestamp: serverTimestamp(),
                                  severity: 'high',
                                  suggestion: 'Logo collection and user references cleared.'
                                });

                                // 1. Wipe logos collection
                                const logoSnap = await getDocs(collection(db, 'logos'));
                                const batch = writeBatch(db);
                                logoSnap.forEach(l => batch.delete(l.ref));
                                
                                // 2. Clear user references (unlockedLogos, etc.)
                                const userSnap = await getDocs(collection(db, 'users'));
                                userSnap.forEach(u => {
                                  const data = u.data();
                                  if (data.unlockedLogos || data.avatar?.includes('firebasestorage')) {
                                    batch.update(u.ref, {
                                      unlockedLogos: deleteField(),
                                      avatar: DEFAULT_AVATAR_URL,
                                      profileLogo: DEFAULT_AVATAR_URL
                                    });
                                  }
                                });

                                // 3. Clear team logos
                                const teamSnap = await getDocs(collection(db, 'teams'));
                                teamSnap.forEach(t => {
                                  const data = t.data();
                                  if (data.logo) {
                                    batch.update(t.ref, {
                                      logo: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=100&h=100&bg=000'
                                    });
                                  }
                                });

                                await batch.commit();
                                alert("Database Cleanup Complete! Legacy logo data wiped.");
                              } catch (err) {
                                handleFirestoreError(err, 'write');
                              }
                            }}
                            className="w-full py-3 bg-red-500 text-white font-display font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                          >
                            Wipe All Logo Data
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* My Teams List Modal */}
      <AnimatePresence>
        {isMyTeamsListOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMyTeamsListOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0d0e2e] border border-white/10 rounded-[32px] p-6 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-display font-black text-white tracking-tight uppercase">My Teams</h3>
                <button onClick={() => setIsMyTeamsListOpen(false)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors bg-white/5 rounded-full">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                {teamsList.filter(t => joinedTeamIds.includes(t.id)).length > 0 ? (
                  teamsList.filter(t => joinedTeamIds.includes(t.id)).map(team => (
                    <button 
                      key={team.id}
                      onClick={() => {
                        setSelectedTeamId(team.id);
                        setIsMyTeamsListOpen(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-pulse-purple/30 transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 p-2 overflow-hidden shrink-0">
                        {team.logo ? (
                          <img src={resolveTeamLogo(team.logo)} alt={team.name} className="w-full h-full object-contain" />
                        ) : (
                          <img src={DEFAULT_AVATAR_URL} alt="" className="w-full h-full object-cover rounded-lg" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-display font-black text-sm uppercase truncate">{team.name}</h4>
                        <p className="text-[10px] font-display font-bold text-pulse-purple uppercase tracking-widest mt-0.5">{team.game === 'bgmi' ? 'BGMI' : 'FREE FIRE'}</p>
                      </div>
                      {team.isUserLeader && (
                        <div className="px-2 py-0.5 bg-pulse-cyan/20 border border-pulse-cyan/30 rounded text-[8px] font-display font-black text-pulse-cyan uppercase">
                          LEADER
                        </div>
                      )}
                      <ArrowUpRight size={16} className="text-white/20" />
                    </button>
                  ))
                ) : (
                  <EmptyState 
                    title="No Squads Joined" 
                    description="You haven't joined or created any teams yet. Create or find a team to enter tournaments!"
                    icon="teams"
                  />
                )}
              </div>

              {joinedTeamIds.length < 2 && (
                <button 
                  onClick={() => setIsMyTeamsListOpen(false)}
                  className="w-full mt-6 py-4 rounded-xl border border-white/5 bg-white/5 text-white text-[10px] font-display font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                >
                  <Search size={14} />
                  Find more teams
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Profile Modal */}
      <AnimatePresence>
        {selectedTeamId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTeamId(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            {teamsList.find(t => t.id === selectedTeamId) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative w-full max-w-sm bg-[#0a0b25] border border-white/10 rounded-[40px] overflow-hidden flex flex-col shadow-3xl max-h-[85vh]"
              >
                {/* Profile Banner */}
                <div className="h-32 bg-gradient-to-br from-pulse-purple/20 via-abyssal to-pulse-cyan/20 shrink-0 relative">
                  <button 
                    onClick={() => setSelectedTeamId(null)}
                    className="absolute top-6 left-6 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  {teamsList.find(t => t.id === selectedTeamId)?.isUserLeader && (
                    <button 
                      onClick={() => {
                        const team = teamsList.find(t => t.id === selectedTeamId);
                        if (team) {
                          setEditingTeam({...team});
                          setTempLogoUrl(team.logo || '');
                          setIsEditTeamModalOpen(true);
                          setSelectedTeamId(null);
                        }
                      }}
                      className="absolute top-6 right-6 w-10 h-10 bg-pulse-purple rounded-full flex items-center justify-center border border-white/10 text-white shadow-lg shadow-pulse-purple/40 active:scale-95 transition-all"
                      title="Edit Team"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                </div>

                <div className="px-8 pb-8 -mt-12 overflow-y-auto custom-scrollbar">
                  {/* Team Logo */}
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-pulse-purple/40 blur-2xl rounded-3xl" />
                    <div className="relative w-24 h-24 rounded-3xl bg-[#16173a] border-4 border-[#0a0b25] p-4 shadow-2xl flex items-center justify-center overflow-hidden">
                      {teamsList.find(t => t.id === selectedTeamId)?.logo ? (
                        <img 
                          src={resolveTeamLogo(teamsList.find(t => t.id === selectedTeamId)?.logo)} 
                          alt="Logo" 
                          className="w-full h-full object-contain" 
                        />
                      ) : (
                        <img src={DEFAULT_AVATAR_URL} alt="" className="w-full h-full object-cover rounded-2xl" />
                      )}
                    </div>
                  </div>

                  {/* Team Title */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-3xl font-display font-black text-white tracking-tight uppercase leading-none">
                        {teamsList.find(t => t.id === selectedTeamId)?.name}
                      </h3>
                      <div className="px-2 py-0.5 bg-pulse-purple/20 border border-pulse-purple/30 rounded text-[9px] font-display font-black text-pulse-purple uppercase">
                        {teamsList.find(t => t.id === selectedTeamId)?.game === 'bgmi' ? 'BGMI' : 'Free Fire'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/40">
                      <Crown size={12} className="text-yellow-400" />
                      <span className="text-[11px] font-display font-bold uppercase tracking-widest">Leader: {teamsList.find(t => t.id === selectedTeamId)?.leader}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {teamsList.find(t => t.id === selectedTeamId)?.tags.map((tag, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white/60 tracking-tight">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Bio */}
                  <div className="mb-8">
                    <h4 className="text-[10px] font-display font-black text-white/20 uppercase tracking-[0.2em] mb-3">About Team</h4>
                    <p className="text-white/60 text-sm leading-relaxed font-medium">
                      {teamsList.find(t => t.id === selectedTeamId)?.bio}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        if (!user) return;
                        try {
                          if (followedTeamIds.includes(selectedTeamId!)) {
                            // Unfollow
                            const follows = await getDocs(query(collection(db, 'follows'), where('userId', '==', user.uid), where('teamId', '==', selectedTeamId)));
                            follows.forEach(async (m) => {
                              await deleteDoc(doc(db, 'follows', m.id));
                            });
                          } else {
                            // Follow
                            await addDoc(collection(db, 'follows'), {
                              userId: user.uid,
                              teamId: selectedTeamId,
                              followedAt: serverTimestamp()
                            });
                          }
                        } catch (err) {
                          handleFirestoreError(err, 'write');
                        }
                      }}
                      className={`flex-1 py-4 rounded-xl font-display font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] border flex items-center justify-center gap-2 ${
                        followedTeamIds.includes(selectedTeamId!) 
                          ? 'bg-pulse-purple/10 border-pulse-purple text-white shadow-lg shadow-pulse-purple/20' 
                          : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      <Heart size={14} className={followedTeamIds.includes(selectedTeamId!) ? 'fill-white text-white' : ''} />
                      {followedTeamIds.includes(selectedTeamId!) ? 'Following' : 'Follow'}
                    </button>
                    {joinedTeamIds.includes(selectedTeamId!) ? (
                      <button 
                        onClick={async () => {
                          if (!user) return;
                          try {
                            const membershipQuery = query(
                              collection(db, 'memberships'), 
                              where('userId', '==', user.uid),
                              where('teamId', '==', selectedTeamId)
                            );
                            const snap = await getDoc(doc(db, 'teams', selectedTeamId!));
                            const teamData = snap.data();
                            if (teamData?.leaderId === user.uid) {
                              alert("Leaders cannot leave their own team! Delete the team instead.");
                              return;
                            }

                            // Find and delete membership
                            // Need to fetch it first since we don't have the id
                            const memberships = await getDocs(query(collection(db, 'memberships'), where('userId', '==', user.uid), where('teamId', '==', selectedTeamId)));
                            memberships.forEach(async (m) => {
                              await deleteDoc(doc(db, 'memberships', m.id));
                            });

                            setSelectedTeamId(null);
                          } catch (err) {
                            handleFirestoreError(err, 'delete');
                          }
                        }}
                        className="flex-1 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-display font-black text-[11px] uppercase tracking-[0.2em] hover:bg-red-500/20 transition-all active:scale-[0.98]"
                      >
                        Leave
                      </button>
                    ) : (
                      <button 
                        disabled={joinedTeamIds.length >= 2 || age < 13 || isRestricted}
                        onClick={async () => {
                          if (!user) return;
                          if (age < 13) {
                            soundService.playWarning();
                            alert("Restricted: You must be at least 13 years old to join teams.");
                            return;
                          }
                          if (isRestricted) {
                            soundService.playWarning();
                            alert("Your account is restricted due to multiple reports. You cannot join new teams.");
                            return;
                          }
                          try {
                            await addDoc(collection(db, 'memberships'), {
                              userId: user.uid,
                              teamId: selectedTeamId,
                              role: 'member',
                              joinedAt: serverTimestamp()
                            });
                            soundService.playSuccess();
                            setSelectedTeamId(null);
                          } catch (err) {
                            soundService.playError();
                            handleFirestoreError(err, 'create');
                          }
                        }}
                        className={`flex-1 py-4 rounded-xl font-display font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] ${joinedTeamIds.length < 2 ? 'bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white shadow-lg shadow-pulse-purple/20' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                      >
                        {joinedTeamIds.length < 2 ? 'Join' : 'Max'}
                      </button>
                    )}
                  </div>

                  {/* Team Members List */}
                  <div className="mt-10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-display font-black text-white/20 uppercase tracking-[0.2em]">Squad Members</h4>
                      <div className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-bold text-white/40 uppercase">
                        {teamMembers.length} / 10
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div 
                          key={member.id}
                          className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl group hover:bg-white/[0.06] transition-all cursor-pointer"
                          onClick={() => {
                            if (member.userId === user?.uid) {
                              setActiveTab('profile');
                              setSelectedTeamId(null);
                            } else {
                              setViewingUser(member);
                            }
                          }}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                            <img src={resolveAvatar(member.avatar)} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-display font-black text-white truncate uppercase">{member.name}</p>
                              {member.role === 'leader' && <Crown size={10} className="text-yellow-400 shrink-0" />}
                            </div>
                            <p className="text-[9px] font-display font-bold text-pulse-cyan/60 tracking-widest uppercase truncate">{member.ingameName || 'NO IGN'}</p>
                          </div>
                          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                               <ArrowUpRight size={12} className="text-white/60" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Public Profile Modal */}
      <AnimatePresence>
        {viewingUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0a0b25] border border-white/10 rounded-[40px] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="relative h-32 w-full bg-gradient-to-r from-pulse-cyan/20 to-pulse-purple/20 shrink-0">
                <button 
                  onClick={() => setViewingUser(null)}
                  className="absolute top-6 left-6 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="absolute top-6 right-6 flex gap-2">
                  <button 
                    onClick={() => {
                      setReportTargetId(viewingUser.userId);
                      setReportTargetName(viewingUser.name);
                      setSelectedReportReasons([]);
                      setIsReportModalOpen(true);
                    }}
                    className="h-10 px-4 bg-red-500/10 backdrop-blur-md rounded-full flex items-center justify-center border border-red-500/30 text-red-500 font-display font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                  >
                    <ShieldAlert size={14} />
                    Report User
                  </button>
                </div>
              </div>

              <div className="px-8 pb-8 -mt-12 overflow-y-auto custom-scrollbar">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-pulse-purple/30 blur-2xl rounded-full scale-110" />
                  <div className="relative w-24 h-24 rounded-3xl bg-[#16173a] border-4 border-[#0a0b25] p-1 shadow-2xl flex items-center justify-center overflow-hidden">
                    <img src={resolveAvatar(viewingUser.avatar)} alt="Logo" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-display font-black text-white tracking-tight uppercase leading-none mb-2 flex items-center">
                    <span>{viewingUser.name}</span>
                    <UserBadges player={viewingUser} />
                  </h3>
                  <div className="flex items-center gap-1.5 text-pulse-cyan/80">
                    <Shield size={12} className="animate-pulse" />
                    <span className="text-[11px] font-display font-bold uppercase tracking-widest">IGN: {viewingUser.ingameName || 'UNKNOWN'}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                      <Users size={12} className="text-pulse-cyan" />
                      <span className="text-[11px] font-mono font-black text-white">{(viewingUser.followersCount || viewingUser.followers || 0).toLocaleString()}</span>
                      <span className="text-[9px] font-display font-bold text-white/40 uppercase">Followers</span>
                    </div>

                    {user && user.uid !== viewingUser.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowPlayer(viewingUser.id);
                        }}
                        className={`px-4 py-2 rounded-xl border font-display font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                          followedPlayerIds.includes(viewingUser.id)
                            ? 'bg-pulse-purple border-pulse-purple text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        {followedPlayerIds.includes(viewingUser.id) ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
                  <span className="text-[10px] font-display font-black text-pulse-purple tracking-widest uppercase mb-2 block">ABOUT PLAYER</span>
                  <p className="text-white/60 text-sm leading-relaxed font-medium">
                    {viewingUser.bio || "This player hasn't added a bio yet."}
                  </p>
                </div>

                {/* Endorsement Actions for Viewing User */}
                {user && user.uid !== viewingUser.id && (
                  <>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-[10px] font-display font-black text-pulse-cyan uppercase tracking-[0.2em]">Endorse Player</h5>
                        <div className="flex items-center gap-1">
                          <Star size={10} className="text-yellow-400 animate-pulse" />
                          <span className="text-[8px] font-display font-bold text-white/20 uppercase">Vouch for skills</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                         {[
                           { key: 'Clutch Player', icon: <Zap size={12} />, color: 'hover:bg-fire-orange/20 hover:text-fire-orange hover:border-fire-orange/40' },
                           { key: 'Team Leader', icon: <Crown size={12} />, color: 'hover:bg-pulse-purple/20 hover:text-pulse-purple hover:border-pulse-purple/40' },
                           { key: 'Great Communicator', icon: <MessageSquare size={12} />, color: 'hover:bg-pulse-cyan/20 hover:text-pulse-cyan hover:border-pulse-cyan/40' }
                         ].map((badge) => (
                           <button
                             key={badge.key}
                             onClick={async () => {
                               if (!user) return;
                               const endorsementId = `${viewingUser.id}_${user.uid}_${badge.key.replace(/\s+/g, '_')}`;
                               try {
                                 const existingEndorsement = await getDoc(doc(db, 'endorsements', endorsementId));
                                 if (existingEndorsement.exists()) {
                                   alert(`You have already endorsed ${viewingUser.name} for ${badge.key}`);
                                   return;
                                 }

                                 await runTransaction(db, async (transaction) => {
                                   const receiverRef = doc(db, 'users', viewingUser.id);
                                   const receiverDoc = await transaction.get(receiverRef);
                                   if (!receiverDoc.exists()) return;

                                   const endorsementRef = doc(db, 'endorsements', endorsementId);
                                   transaction.set(endorsementRef, {
                                     senderId: user.uid,
                                     receiverId: viewingUser.id,
                                     category: badge.key,
                                     timestamp: serverTimestamp()
                                   });

                                   transaction.update(receiverRef, {
                                     [`endorsementCounts.${badge.key}`]: increment(1),
                                     updatedAt: serverTimestamp()
                                   });
                                 });
                                 soundService.playAchievement();
                                 alert(`Successfully endorsed ${viewingUser.name}!`);
                               } catch (err) {
                                 console.error("Endorsement failed:", err);
                                 handleFirestoreError(err, 'write', 'endorsements');
                               }
                             }}
                             className={`flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] transition-all group ${badge.color}`}
                           >
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                                 {badge.icon}
                               </div>
                               <span className="text-[11px] font-display font-black uppercase tracking-wider">{badge.key}</span>
                             </div>
                             <PlusCircle size={14} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                           </button>
                         ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setViewingUser(null);
                        handleStartPrivateChat(viewingUser);
                      }}
                      className="w-full py-4 bg-pulse-purple rounded-2xl text-white font-display font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-pulse-purple/20 hover:scale-[1.02] active:scale-95 transition-all mb-6 flex items-center justify-center gap-3"
                    >
                      <MessageSquare size={18} />
                      Send Secret Message
                    </button>
                  </>
                )}

                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                  <div className="flex items-start gap-3 text-white/30 italic">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <p className="text-[9px] font-medium leading-relaxed uppercase tracking-wider">
                      Respect all players. Any form of toxic behavior may lead to temporary or permanent account restrictions.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Team Modal */}
      <AnimatePresence>
        {isEditTeamModalOpen && editingTeam && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditTeamModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0d0e2e] border border-white/10 rounded-[32px] p-8 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-display font-black text-white tracking-tight uppercase">Edit Team</h3>
                <button onClick={() => setIsEditTeamModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors bg-white/5 rounded-full">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                <div 
                  className="flex flex-col items-center gap-4 mb-6 cursor-pointer group"
                  onClick={() => {
                    setLogoTarget('team');
                    setIsLogoPickerOpen(true);
                  }}
                >
                  <div className="relative w-24 h-24 rounded-[32px] bg-white/5 border-2 border-pulse-purple p-4 shadow-lg transition-transform group-hover:scale-105">
                    {editingTeam.logo ? (
                      <img 
                        src={resolveTeamLogo(editingTeam.logo)} 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img src={DEFAULT_AVATAR_URL} alt="" className="w-full h-full object-cover rounded-2xl" />
                    )}
                    <div className="absolute bottom-[-8px] right-[-8px] w-8 h-8 bg-pulse-purple rounded-xl flex items-center justify-center border-2 border-abyssal shadow-lg">
                      <Plus size={14} className="text-white" />
                    </div>
                  </div>
                  <span className="text-[10px] font-display font-bold text-pulse-purple uppercase tracking-widest group-hover:text-white transition-colors">Change Identity</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Team Name</label>
                    <input 
                      type="text"
                      value={editingTeam.name}
                      onChange={(e) => setEditingTeam(prev => prev ? {...prev, name: e.target.value} : null)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple/50 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Team Bio</label>
                    <textarea 
                      value={editingTeam.bio}
                      onChange={(e) => setEditingTeam(prev => prev ? {...prev, bio: e.target.value} : null)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple/50 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Team Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_TAGS.map((tag, idx) => {
                        const isSelected = editingTeam.tags.includes(tag);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              const currentTags = [...editingTeam.tags];
                              if (isSelected) {
                                setEditingTeam({...editingTeam, tags: currentTags.filter(t => t !== tag)});
                              } else {
                                if (currentTags.length < 5) {
                                  setEditingTeam({...editingTeam, tags: [...currentTags, tag]});
                                }
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full border transition-all text-[9px] font-display font-black uppercase tracking-widest ${
                              isSelected 
                                ? 'border-pulse-cyan bg-pulse-cyan/20 text-white' 
                                : 'border-white/10 bg-white/5 text-white/30 hover:border-white/20'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    if (editingTeam) {
                      try {
                        await updateDoc(doc(db, 'teams', editingTeam.id), {
                          name: editingTeam.name,
                          logo: tempLogoUrl || editingTeam.logo,
                          bio: editingTeam.bio,
                          tags: editingTeam.tags
                        });
                        setIsEditTeamModalOpen(false);
                      } catch (err) {
                        handleFirestoreError(err, 'update', `teams/${editingTeam.id}`);
                      }
                    }
                  }}
                  className="w-full py-4 rounded-xl font-display font-black text-xs uppercase tracking-[0.2em] bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white shadow-lg active:scale-95 transition-all mt-4"
                >
                  Save Team Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditProfileOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0d0e2e] border border-white/10 rounded-[32px] p-8 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-display font-black text-white tracking-tight uppercase">Edit Profile</h3>
                <button onClick={() => setIsEditProfileOpen(false)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors bg-white/5 rounded-full">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                <div 
                  className="flex flex-col items-center gap-4 mb-6 cursor-pointer group"
                  onClick={() => {
                    setLogoTarget('profile');
                    setIsLogoPickerOpen(true);
                  }}
                >
                  <div className="relative w-20 h-20 rounded-full border-2 border-pulse-cyan p-1 transition-transform group-hover:scale-105 overflow-hidden">
                    <img 
                      src={resolveAvatar(userAvatar)} 
                      alt="Avatar" 
                      className="w-full h-full object-cover rounded-full"
                    />
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-pulse-cyan rounded-full flex items-center justify-center border-2 border-abyssal z-10">
                      <Search size={10} className="text-abyssal font-black" />
                    </div>
                  </div>
                  <span className="text-[10px] font-display font-bold text-pulse-cyan uppercase tracking-widest group-hover:text-white transition-colors">Select Identity Armor</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Username</label>
                    <input 
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple/50 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Player Role</label>
                    <input 
                      type="text"
                      placeholder="e.g. Sniper, Rusher, IGL"
                      value={userGameplayRole}
                      onChange={(e) => setUserGameplayRole(e.target.value)}
                      maxLength={30}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple/50 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Bio</label>
                    <textarea 
                      value={userBio}
                      onChange={(e) => setUserBio(e.target.value)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple/50 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase">Playstyle Tags</label>
                      <span className={`text-[9px] font-display font-black tracking-widest uppercase ${userTags.length >= 4 ? 'text-pulse-cyan' : 'text-white/20'}`}>
                        {userTags.length}/4 Selected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_TAGS.map((tag, idx) => {
                        const isActive = userTags.includes(tag);
                        const isMaxReached = userTags.length >= 4;
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (isActive) {
                                setUserTags(userTags.filter(t => t !== tag));
                              } else {
                                if (!isMaxReached) {
                                  setUserTags([...userTags, tag]);
                                }
                              }
                            }}
                            className={`px-4 py-2 rounded-full border transition-all text-[9px] font-display font-black uppercase tracking-widest ${
                              isActive 
                                ? `border-pulse-cyan bg-pulse-cyan/20 text-white shadow-[0_0_15px_rgba(34,211,238,0.2)]` 
                                : isMaxReached 
                                  ? 'border-white/5 bg-white/2 text-white/10 cursor-not-allowed'
                                  : 'border-white/10 bg-white/5 text-white/30 hover:border-white/20 hover:text-white/50'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Favorite Game</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setSelectedGame('freefire')}
                        className={`py-2 rounded-xl border text-[10px] font-display font-bold uppercase tracking-widest transition-all ${selectedGame === 'freefire' ? 'bg-pulse-purple/20 border-pulse-purple text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                      >
                        Free Fire
                      </button>
                      <button 
                        onClick={() => setSelectedGame('bgmi')}
                        className={`py-2 rounded-xl border text-[10px] font-display font-bold uppercase tracking-widest transition-all ${selectedGame === 'bgmi' ? 'bg-pulse-purple/20 border-pulse-purple text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                      >
                        BGMI
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Matches</label>
                      <input 
                        type="number"
                        value={userMatches}
                        onChange={(e) => setUserMatches(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple/50 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Wins</label>
                      <input 
                        type="number"
                        value={userWins}
                        onChange={(e) => setUserWins(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple/50 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">K/D Ratio</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={userKdRatio}
                        onChange={(e) => setUserKdRatio(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple/50 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-display font-bold text-white/40 tracking-widest uppercase ml-1">Headshot %</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={userHeadshots}
                        onChange={(e) => setUserHeadshots(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple/50 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    if (!user) return;
                    try {
                      await updateDoc(doc(db, 'users', user.uid), {
                        name: userName,
                        bio: userBio,
                        avatar: userAvatar,
                        profileLogo: userAvatar,
                        tags: userTags,
                        gameplayRole: userGameplayRole,
                        preferredGame: selectedGame,
                        favoriteGame: selectedGame === 'freefire' ? 'Free Fire' : 'BGMI',
                        matches: Number(userMatches),
                        wins: Number(userWins),
                        kdRatio: Number(userKdRatio),
                        headshotPercentage: Number(userHeadshots),
                        updatedAt: serverTimestamp()
                      });
                      soundService.playSuccess();
                      setIsEditProfileOpen(false);
                      setToast({ message: 'Profile Updated Successfully!', type: 'success' });
                    } catch (err) {
                      handleFirestoreError(err, 'update', `users/${user.uid}`);
                    }
                  }}
                  className="w-full py-4 rounded-xl font-display font-black text-xs uppercase tracking-[0.2em] bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white shadow-lg active:scale-95 transition-all mt-4"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tournament List Modal */}
      <AnimatePresence>
        {isTournamentModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTournamentModalOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-4xl bg-[#0a0b25] border border-white/10 rounded-[40px] flex flex-col overflow-hidden shadow-3xl max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/[0.02]">
                <div>
                  <h3 className="text-2xl font-display font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                    <Trophy size={28} className="text-pulse-cyan" />
                    Tournaments
                  </h3>
                  <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.3em] mt-1">Battle for Pink Diamonds</p>
                </div>
                <button 
                  onClick={() => setIsTournamentModalOpen(false)} 
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all border border-white/5"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                  {tournaments.map((tour) => (
                    <div key={tour.id} className="group relative bg-[#16173a] border border-white/5 rounded-[32px] overflow-hidden hover:border-pulse-cyan/50 transition-all shadow-xl hover:shadow-pulse-cyan/10">
                      {/* Banner */}
                      <div className="relative h-40 overflow-hidden">
                         <img src={tour.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                         <div className="absolute inset-0 bg-gradient-to-t from-[#16173a] via-transparent to-transparent opacity-60" />
                         <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                           <span className="px-3 py-1 bg-pulse-purple/80 backdrop-blur-md rounded-full text-[9px] font-display font-black text-white uppercase tracking-widest">{tour.matchType}</span>
                           <span className="px-3 py-1 bg-pulse-cyan/80 backdrop-blur-md rounded-full text-[9px] font-display font-black text-white uppercase tracking-widest">{tour.game}</span>
                         </div>
                      </div>

                      {/* Info */}
                      <div className="p-6">
                         <h4 className="text-lg font-display font-black text-white uppercase tracking-tight mb-4 group-hover:text-pulse-cyan transition-colors">{tour.title}</h4>
                         
                         <div className="grid grid-cols-2 gap-4 mb-6">
                            <button 
                              onClick={() => {
                                setSelectedTournament(tour);
                                setIsPrizePoolModalOpen(true);
                              }}
                              className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-1 hover:bg-white/10 transition-all text-center"
                            >
                               <span className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest">Prize Pool</span>
                               <span className="text-sm font-display font-black text-pulse-cyan italic">💎 {tour.prizePool.toLocaleString()} PINK</span>
                            </button>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
                               <span className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest">Entry Fee</span>
                               <span className="text-sm font-display font-black text-pulse-purple italic">💎 {tour.entryFee} PINK</span>
                            </div>
                         </div>

                         <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col gap-1 flex-1 max-w-[60%]">
                               <div className="flex items-center gap-2 text-[10px] font-display font-bold text-white/40 uppercase tracking-widest">
                                  <Users size={12} />
                                  <span>{tour.filledSlots ?? tour.currentPlayers ?? 0} / {tour.totalSlots ?? tour.maxPlayers} Slots</span>
                               </div>
                               <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-pulse-cyan to-pulse-purple"
                                    style={{ width: `${((tour.filledSlots ?? tour.currentPlayers ?? 0) / (tour.totalSlots ?? tour.maxPlayers)) * 100}%` }}
                                  />
                               </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                               <div className="flex items-center gap-2 text-[10px] font-display font-bold text-white/40 uppercase tracking-widest">
                                  <Clock size={12} />
                                  <span>{tour.startTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                               </div>
                               <span className="text-[9px] font-display font-bold text-white/20 uppercase tracking-widest">{tour.map}</span>
                            </div>
                         </div>

                         <button 
                           disabled={((tour.filledSlots ?? tour.currentPlayers ?? 0) >= (tour.totalSlots ?? tour.maxPlayers) && !tour.players?.includes(user?.uid || '')) || isRestricted || tour.players?.includes(user?.uid || '')}
                           onClick={() => {
                             setSelectedTournament(tour);
                             setIsJoinTournamentModalOpen(true);
                           }}
                           className={`w-full py-4 rounded-2xl font-display font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
                             tour.players?.includes(user?.uid || '')
                               ? 'bg-green-500/20 border border-green-500/40 text-green-500 cursor-default'
                               : (tour.filledSlots ?? tour.currentPlayers ?? 0) < (tour.totalSlots ?? tour.maxPlayers) 
                                 ? 'bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white shadow-lg shadow-pulse-purple/20' 
                                 : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                           }`}
                         >
                           {tour.players?.includes(user?.uid || '') 
                             ? 'Registered' 
                             : (tour.filledSlots ?? tour.currentPlayers ?? 0) < (tour.totalSlots ?? tour.maxPlayers) 
                               ? 'Join Battle' 
                               : 'Tournament Full'}
                         </button>
                      </div>
                    </div>
                  ))}

                  {tournaments.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-30">
                       <Trophy size={64} className="mb-4" />
                       <p className="font-display font-black text-xl uppercase tracking-widest italic">No Upcoming Tournaments</p>
                       <p className="text-xs font-display font-bold uppercase tracking-[.3em] mt-2">Check back later for new events</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prize Pool & Full Details Modal */}
      <AnimatePresence>
        {isPrizePoolModalOpen && selectedTournament && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrizePoolModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0d0e2e] border border-white/10 rounded-[32px] p-8 overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-display font-black text-white tracking-tight uppercase italic">{selectedTournament.title}</h3>
                <button onClick={() => setIsPrizePoolModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors bg-white/5 rounded-full">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-1 -mr-1">
                 <div className="p-6 rounded-3xl bg-pulse-cyan/10 border border-pulse-cyan/30 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <Trophy size={80} />
                    </div>
                    <span className="text-[10px] font-display font-bold text-pulse-cyan uppercase tracking-[0.3em] mb-2 block">Total Prize Pool</span>
                    <span className="text-3xl font-display font-black text-white italic">💎 {selectedTournament.prizePool.toLocaleString()} BLUE DIAMONDS</span>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-display font-black text-white/20 uppercase tracking-[0.2em]">Rules & Description</h4>
                    <p className="text-white/60 text-sm font-medium leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5 whitespace-pre-wrap">
                       {selectedTournament.descriptionFull || "No detailed rules provided for this event."}
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest block mb-1">Per Kill Reward</span>
                        <span className="text-sm font-display font-black text-pulse-cyan italic">💎 {selectedTournament.perKill}</span>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest block mb-1">Entry Method</span>
                        <span className="text-sm font-display font-black text-pulse-purple italic">{selectedTournament.matchType}</span>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join Tournament Flow Modal */}
      <AnimatePresence>
        {isJoinTournamentModalOpen && selectedTournament && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center p-6 text-pulse-cyan">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinTournamentModalOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0a0b25] border border-pulse-cyan/30 rounded-[40px] p-8 overflow-hidden shadow-3xl flex flex-col"
            >
              <div className="text-center mb-8">
                 <div className="w-16 h-16 rounded-2xl bg-pulse-cyan/10 border border-pulse-cyan/30 flex items-center justify-center text-pulse-cyan mx-auto mb-4 shadow-[0_0_20px_rgba(34,211,238,0.2)] animate-pulse">
                    <Gamepad2 size={32} />
                 </div>
                 <h3 className="text-xl font-display font-black text-white tracking-tight uppercase italic">Join Tournament</h3>
                 <p className="text-[9px] font-display font-black text-white/20 uppercase tracking-[0.4em] mt-1">Registration Details</p>
              </div>

              <div className="space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-1.5 text-pulse-cyan">
                       <label className="text-[10px] font-display font-bold text-white/40 uppercase tracking-widest ml-1">In-Game Name</label>
                       <input 
                         type="text" 
                         value={joinInGameName}
                         onChange={(e) => setJoinInGameName(e.target.value)}
                         placeholder="e.g. Slayers_Boss"
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/10 text-sm font-medium focus:border-pulse-cyan/50 outline-none"
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-display font-bold text-white/40 uppercase tracking-widest ml-1">Account Level</label>
                          <input 
                            type="number" 
                            value={joinLevel}
                            onChange={(e) => setJoinLevel(e.target.value)}
                            placeholder="55"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/10 text-sm font-medium focus:border-pulse-cyan/50 outline-none"
                          />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-display font-bold text-white/40 uppercase tracking-widest ml-1">Unique UID</label>
                          <input 
                            type="text" 
                            value={joinUID}
                            onChange={(e) => setJoinUID(e.target.value)}
                            placeholder="834729103"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/10 text-sm font-medium focus:border-pulse-cyan/50 outline-none"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-display font-bold text-white/40 uppercase tracking-widest">Entry Fee</span>
                       <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[10px] text-purple-400">💎</span>
                          <span className="text-sm font-display font-black text-white italic">{selectedTournament.entryFee} PINK DIAMONDS</span>
                       </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                       <span className="text-[10px] font-display font-bold text-white/40 uppercase tracking-widest">Your Balance</span>
                       <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[10px] text-purple-400">💎</span>
                          <span className={`text-sm font-display font-black italic ${userPinkDiamonds >= selectedTournament.entryFee ? 'text-green-400' : 'text-red-500'}`}>
                             {userPinkDiamonds}
                          </span>
                       </div>
                    </div>
                 </div>

                 <button 
                    disabled={isJoinProcessing || !profileCompleted || userPinkDiamonds < selectedTournament.entryFee || !joinInGameName || !joinUID}
                    onClick={async () => {
                      if (!user || isJoinProcessing) return;
                      
                      if (!profileCompleted) {
                        alert("Please complete your profile details first!");
                        return;
                      }

                      setIsJoinProcessing(true);
                      try {
                         await runTransaction(db, async (transaction) => {
                            const userRef = doc(db, 'users', user.uid);
                            const tourRef = doc(db, 'tournaments', selectedTournament.id);
                            
                            const userSnap = await transaction.get(userRef);
                            const tourSnap = await transaction.get(tourRef);

                            if (!userSnap.exists()) throw new Error("User profile not found.");
                            if (!tourSnap.exists()) throw new Error("Tournament not found.");

                            const userData = userSnap.data();
                            const tourData = tourSnap.data();
                            
                            const totalSlots = tourData.totalSlots ?? tourData.maxPlayers;
                            const filledSlots = tourData.filledSlots ?? tourData.currentPlayers ?? 0;
                            const players = tourData.players ?? [];

                            if (filledSlots >= totalSlots) {
                               throw new Error("Tournament is full! No slots available.");
                            }

                            if (players.includes(user.uid)) {
                               throw new Error("You have already joined this tournament.");
                            }

                            if (userData.pinkDiamonds < selectedTournament.entryFee) {
                               throw new Error("Insufficient Pink Diamonds for entry fee.");
                            }

                            transaction.update(userRef, {
                               pinkDiamonds: increment(-selectedTournament.entryFee)
                            });

                            transaction.update(tourRef, {
                               filledSlots: increment(1),
                               currentPlayers: increment(1),
                               players: [...players, user.uid]
                            });

                            const participantRef = doc(db, 'tournament_participants', `${user.uid}_${selectedTournament.id}`);
                            transaction.set(participantRef, {
                               tournamentId: selectedTournament.id,
                               userId: user.uid,
                               inGameName: joinInGameName,
                               level: Number(joinLevel),
                               uid: joinUID,
                               joinedAt: serverTimestamp()
                            });
                         });

                         soundService.playSuccess();
                         try {
                           await NotificationService.createNotification(user.uid, {
                             type: 'Tournament Registration',
                             title: 'Tournament Registered!',
                             message: `Successfully registered for "${selectedTournament.title}". Prepare your squad!`,
                             actionUrl: 'home'
                           });
                         } catch (nErr) {
                           console.error("Notification creation error:", nErr);
                         }
                         alert("Successfully joined tournament");
                         setIsJoinTournamentModalOpen(false);
                         setJoinInGameName('');
                         setJoinLevel('');
                         setJoinUID('');
                      } catch (err: any) {
                         soundService.playError();
                         alert(err.message || "Failed to join tournament. Please try again.");
                      } finally {
                         setIsJoinProcessing(false);
                      }
                    }}
                    className={`w-full py-5 rounded-2xl font-display font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${
                      !isJoinProcessing && profileCompleted && userPinkDiamonds >= selectedTournament.entryFee && joinInGameName && joinUID
                        ? 'bg-pulse-cyan text-abyssal shadow-[0_0_30px_rgba(34,211,238,0.3)]' 
                        : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    {isJoinProcessing ? (
                      <div className="w-5 h-5 border-2 border-abyssal/30 border-t-abyssal rounded-full animate-spin" />
                    ) : !profileCompleted ? (
                      "Complete Profile First"
                    ) : userPinkDiamonds >= selectedTournament.entryFee ? (
                      <>Confirm Entry Fee <ArrowUpRight size={18} /></>
                    ) : (
                      "Insufficient Diamonds"
                    )}
                  </button>
                 
                 <button 
                  onClick={() => setIsJoinTournamentModalOpen(false)}
                  className="w-full text-center text-[10px] font-display font-black text-white/20 uppercase tracking-[0.3em] hover:text-white/40 transition-colors"
                 >
                   Cancel Registration
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )}
</AnimatePresence>

      {/* App Update Overlay (Native-like) */}
      <AnimatePresence>
        {showUpdateModal && systemConfig && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-[32px] p-8 text-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pulse-cyan via-pulse-purple to-pulse-cyan" />
              
              <div className="inline-flex w-20 h-20 items-center justify-center rounded-3xl bg-pulse-purple/20 text-pulse-purple mb-6 border border-pulse-purple/30">
                <ArrowUpRight size={40} className="rotate-45" />
              </div>
              
              <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-2">New Update Available</h2>
              <p className="text-sm font-display font-bold text-white/40 uppercase tracking-widest mb-8 leading-relaxed">
                Version v{systemConfig.latestVersionName} is now ready.<br/>Please update for the latest features and stability.
              </p>
              
              <div className="space-y-4">
                <a 
                  href={systemConfig.updateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-5 rounded-2xl bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white font-display font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-pulse-purple/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Download Now
                </a>
                
                {!systemConfig.isUpdateMandatory && (
                  <button 
                    onClick={() => setShowUpdateModal(false)}
                    className="w-full py-4 text-[10px] font-display font-black text-white/20 uppercase tracking-[0.3em] hover:text-white/40 transition-colors"
                  >
                    Maybe Later
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Announcement Popup */}
      <AnimatePresence>
        {showAnnouncementPopup && latestAnnouncement && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAnnouncementPopup(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0a0b25] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto">
                   <Bell size={32} className="text-orange-500 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-black text-white italic uppercase tracking-tight line-clamp-2">
                    {latestAnnouncement.title}
                  </h3>
                  <p className="text-[10px] font-display font-black text-orange-500/60 uppercase tracking-[0.2em]">New Announcement</p>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                   <p className="text-xs text-white/60 leading-relaxed font-medium">
                     {latestAnnouncement.message}
                   </p>
                </div>

                <button 
                  onClick={() => setShowAnnouncementPopup(false)}
                  className="w-full py-4 rounded-xl bg-white text-[#0a0b25] font-display font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-white/10 active:scale-95 transition-all"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dedicated Chat Screen */}
      <AnimatePresence>
        {isPrivateChatOpen && activePrivateChat && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-0 z-[1100] bg-[#0a0b1e] flex flex-col h-[100dvh] w-full"
          >
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-pulse-purple/10 blur-[100px] rounded-full" />
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-pulse-cyan/10 blur-[100px] rounded-full" />
            </div>

            {/* Chat Header Refined */}
            <header className="px-5 pt-12 pb-4 bg-abyssal/60 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between shrink-0 relative z-10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setIsPrivateChatOpen(false);
                    setActivePrivateChat(null);
                  }}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl text-white transition-all bg-white/[0.03] border border-white/5 group"
                >
                  <ArrowLeft size={20} className="group-active:-translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white/10 bg-white/5 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                      {activePrivateChat.otherUser?.isAI ? (
                        <div className="w-full h-full flex items-center justify-center bg-pulse-purple/20">
                          <Bot size={24} className="text-pulse-purple animate-pulse" />
                        </div>
                      ) : (
                        <img src={resolveAvatar(activePrivateChat.otherUser?.avatar)} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-abyssal shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-[15px] font-display font-black text-white uppercase tracking-tight leading-none truncate max-w-[140px] italic flex items-center">
                      <span className="truncate">{activePrivateChat.otherUser?.name || 'AGENT UNKNOWN'}</span>
                      <UserBadges player={activePrivateChat.otherUser} />
                    </h4>
                    <p className="text-[9px] font-display font-black text-pulse-cyan uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5 opacity-80">
                      <span className="tabular-nums">SECURE CHANNEL</span>
                      <div className="w-1 h-1 bg-white/20 rounded-full" />
                      <span className="animate-pulse">ENCRYPTED</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 text-white/30 transition-all border border-transparent hover:border-white/10">
                  <Phone size={18} />
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 text-white/30 transition-all border border-transparent hover:border-white/10">
                  <Video size={18} />
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 text-white/30 transition-all border border-transparent hover:border-white/10">
                  <MoreVertical size={18} />
                </button>
              </div>
            </header>

            {/* Messages Area Enhanced */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar relative z-10">
              {privateMessages.length > 0 ? (
                privateMessages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    key={msg.id || i} 
                    className={`flex gap-3 ${msg.senderId === user?.uid ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/5 shadow-lg">
                      {msg.senderId === user?.uid ? (
                        <img src={resolveAvatar(userAvatar)} alt="" className="w-full h-full object-cover" />
                      ) : msg.senderId === SUPPORT_AI_ID ? (
                        <div className="w-full h-full flex items-center justify-center bg-pulse-purple/20">
                          <Bot size={18} className="text-pulse-purple" />
                        </div>
                      ) : (
                        <img src={resolveAvatar(activePrivateChat.otherUser?.avatar)} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className={`flex flex-col max-w-[80%] ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 rounded-[22px] text-[13px] font-medium leading-relaxed relative ${
                        msg.senderId === user?.uid 
                          ? 'bg-gradient-to-br from-pulse-purple to-pulse-purple/80 text-white rounded-tr-none shadow-[0_10px_25px_rgba(168,85,247,0.2)]' 
                          : 'bg-white/[0.04] border border-white/5 text-white/90 rounded-tl-none backdrop-blur-md shadow-[0_10px_25px_rgba(0,0,0,0.2)]'
                      }`}>
                        {msg.text}
                      </div>
                      <div className={`flex items-center gap-2 mt-2 px-1 ${msg.senderId === user?.uid ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[8px] font-mono font-black text-white/20 uppercase tracking-widest tabular-nums">
                          {msg.timestamp?.toDate?.() ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'SENDING...'}
                        </span>
                        {msg.senderId === user?.uid && (
                          <div className="flex items-center">
                            <div className="w-2.5 h-2.5 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-pulse-cyan rounded-full animate-pulse" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-[-10dvh]">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-pulse-purple/20 blur-3xl animate-pulse" />
                    <div className="relative w-24 h-24 rounded-[40px] bg-white/[0.02] border border-white/5 flex items-center justify-center p-6 glass-panel">
                      <MessageSquare size={48} className="text-pulse-purple" />
                    </div>
                  </div>
                  <h5 className="text-xl font-display font-black uppercase tracking-tighter text-white italic">Signal Established</h5>
                  <p className="text-[10px] font-display font-bold uppercase tracking-[0.4em] mt-3 text-pulse-cyan/60 animate-pulse">Waiting for transmissions...</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Section Enhanced */}
            <div className="p-4 bg-abyssal/80 backdrop-blur-3xl border-t border-white/5 relative z-10 pb-8">
              <div className="flex items-center gap-2 max-w-xl mx-auto w-full">
                <button className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all shrink-0">
                  <Plus size={20} />
                </button>
                <div className="flex-1 relative group">
                  <input 
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendPrivateMessage()}
                    placeholder="Type message..."
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-5 pr-12 py-4 text-[14px] text-white placeholder-white/10 outline-none focus:border-pulse-purple/30 focus:bg-white/[0.06] transition-all h-14 font-medium"
                  />
                  <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 hover:text-white/30 transition-colors">
                    <Smile size={20} />
                  </button>
                </div>
                <button 
                  onClick={handleSendPrivateMessage}
                  disabled={!chatMessage.trim()}
                  className="w-14 h-14 bg-gradient-to-br from-pulse-cyan to-pulse-purple rounded-2xl flex items-center justify-center text-abyssal disabled:opacity-10 active:scale-95 transition-all shadow-[0_10px_20px_rgba(168,85,247,0.3)] shrink-0 group"
                >
                  <Send size={22} className="group-active:translate-x-1 group-active:-translate-y-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
