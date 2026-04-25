/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef, useEffect, ChangeEvent } from 'react';
import { 
  Bell, 
  Search, 
  User, 
  MessageSquare, 
  Home, 
  ArrowUpRight,
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
  Trash2,
  Ban,
  Unlock,
  AlertTriangle,
  Gem,
  Check,
  Heart
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
  runTransaction
} from 'firebase/firestore';
import { auth, db, handleFirestoreError } from './lib/firebase';

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

// --- Mock Data ---

// --- Predefined Tags ---
const PREDEFINED_TAGS = [
  'Aggressive', 'Passive', 'Team Player', 'Solo Player', 
  'Strategic', 'Fast Learner', 'Experienced', 'Beginner Friendly', 
  'Mic On', 'No Mic', 'Competitive', 'Chill Player',
  'Daily Scrims', 'Tournament Ready', 'Pro Player', 'Verified'
];
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
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-pulse-purple/20 flex items-center justify-center mx-auto mb-4 border border-pulse-purple/30">
                <User size={32} className="text-pulse-purple" />
              </div>
              <h2 className="text-2xl font-display font-black text-white uppercase italic">Choose Username</h2>
              <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-bold">Your unique identity in the arena</p>
            </div>
            <div className="relative">
              <input 
                type="text"
                placeholder="Username (e.g. EliteGamer)"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/20 text-sm font-medium focus:border-pulse-purple outline-none transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && <div className="w-4 h-4 border-2 border-pulse-cyan border-t-transparent rounded-full animate-spin" />}
                {usernameStatus === 'available' && <Check size={18} className="text-green-500" />}
                {usernameStatus === 'taken' && <Plus size={18} className="text-red-500 rotate-45" />}
              </div>
            </div>
            {usernameStatus === 'taken' && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">That username is already claimed!</p>}
            <button 
              disabled={usernameStatus !== 'available' || isProcessing}
              onClick={() => nextStep({ username, name: username })}
              className="w-full py-4 bg-pulse-purple rounded-2xl text-white font-display font-black text-xs uppercase tracking-[0.2em] disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? 'Saving...' : 'Set Username'} <ArrowUpRight size={14} />
            </button>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
             <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-pulse-cyan/20 flex items-center justify-center mx-auto mb-4 border border-pulse-cyan/30">
                <Gamepad2 size={32} className="text-pulse-cyan" />
              </div>
              <h2 className="text-2xl font-display font-black text-white uppercase italic">Select Your Base</h2>
              <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-bold">Which world do you conquer?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setGame('freefire')}
                className={`flex flex-col items-center gap-4 p-6 rounded-3xl border transition-all ${game === 'freefire' ? 'bg-pulse-purple/20 border-pulse-purple shadow-lg' : 'bg-white/5 border-white/10 opacity-60'}`}
              >
                <img src="/freefire_logo.png" className="w-16 h-16 rounded-xl object-cover" alt="FF" />
                <span className="text-xs font-display font-black text-white uppercase tracking-widest">Free Fire</span>
              </button>
              <button 
                onClick={() => setGame('bgmi')}
                className={`flex flex-col items-center gap-4 p-6 rounded-3xl border transition-all ${game === 'bgmi' ? 'bg-pulse-cyan/20 border-pulse-cyan shadow-lg' : 'bg-white/5 border-white/10 opacity-60'}`}
              >
                <img src="/bgmi_logo.png" className="w-16 h-16 rounded-xl object-cover" alt="BGMI" />
                <span className="text-xs font-display font-black text-white uppercase tracking-widest">BGMI</span>
              </button>
            </div>
            <button 
              disabled={isProcessing}
              onClick={() => nextStep({ preferredGame: game, favoriteGame: game === 'freefire' ? 'Free Fire' : 'BGMI' })}
              className="w-full py-4 bg-pulse-cyan text-abyssal rounded-2xl font-display font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
            >
              Continue Battle <ArrowUpRight size={14} />
            </button>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-4 border border-yellow-500/30">
                <AlertTriangle size={32} className="text-yellow-500" />
              </div>
              <h2 className="text-2xl font-display font-black text-white uppercase italic">Verify Age</h2>
              <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-bold">Requirements for full access</p>
            </div>
            <div className="relative">
              <input 
                type="number"
                placeholder="Enter your age"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || '')}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-center text-2xl font-display font-black outline-none focus:border-yellow-500 transition-all"
              />
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
               <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed text-center">
                 Users under 13 will have restricted social features to ensure community safety.
               </p>
            </div>
            <button 
              disabled={!age || age < 12 || isProcessing}
              onClick={() => nextStep({ age, isRestricted: age < 13 })}
              className="w-full py-4 bg-yellow-500 text-abyssal rounded-2xl font-display font-black text-xs uppercase tracking-[0.2em] disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              Confirm Age <ArrowUpRight size={14} />
            </button>
            {age !== '' && age < 12 && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">Minimum age is 12</p>}
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-pulse-purple/20 flex items-center justify-center mx-auto mb-4 border border-pulse-purple/30">
                <Shield size={32} className="text-pulse-purple" />
              </div>
              <h2 className="text-2xl font-display font-black text-white uppercase italic">Choose Tags</h2>
              <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-bold">Select up to 4 labels</p>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
              {PREDEFINED_TAGS.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <button 
                    key={tag}
                    onClick={() => {
                      if (isSelected) setTags(tags.filter(t => t !== tag));
                      else if (tags.length < 4) setTags([...tags, tag]);
                    }}
                    className={`px-4 py-2 rounded-full border text-[10px] font-display font-bold uppercase tracking-widest transition-all ${isSelected ? 'bg-pulse-purple border-pulse-purple text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4">
              <button onClick={() => nextStep({ tags: [] })} className="flex-1 py-4 text-white/30 font-display font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all">Skip</button>
              <button 
                disabled={isProcessing}
                onClick={() => nextStep({ tags })}
                className="flex-[2] py-4 bg-pulse-purple rounded-2xl text-white font-display font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
              >
                Next <ArrowUpRight size={14} />
              </button>
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-pulse-cyan/20 flex items-center justify-center mx-auto mb-4 border border-pulse-cyan/30">
                <Trophy size={32} className="text-pulse-cyan" />
              </div>
              <h2 className="text-2xl font-display font-black text-white uppercase italic">Experience</h2>
              <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-bold">How long have you been gaming?</p>
            </div>
            <div className="space-y-3">
              {['< 6 Months', '1 Year', '2+ Years'].map((exp) => (
                <button 
                  key={exp}
                  onClick={() => setExperience(exp)}
                  className={`w-full py-4 rounded-2xl border font-display font-bold uppercase text-xs tracking-widest transition-all ${experience === exp ? 'bg-pulse-cyan/20 border-pulse-cyan text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                >
                  {exp}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => nextStep({ experience: 'Not specified' })} className="flex-1 py-4 text-white/30 font-display font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all">Skip</button>
              <button 
                disabled={!experience || isProcessing}
                onClick={() => nextStep({ experience })}
                className="flex-[2] py-4 bg-pulse-cyan text-abyssal rounded-2xl font-display font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
              >
                Final Move <ArrowUpRight size={14} />
              </button>
            </div>
          </motion.div>
        );
      case 6:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-pulse-purple/20 flex items-center justify-center mx-auto mb-4 border border-pulse-purple/30">
                <Shield size={32} className="text-pulse-purple" />
              </div>
              <h2 className="text-2xl font-display font-black text-white uppercase italic">Join the Squad</h2>
              <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-bold">Start your journey</p>
            </div>
            <div className="space-y-3">
              <button 
                className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 hover:bg-pulse-purple/20 hover:border-pulse-purple/50 group transition-all"
                onClick={() => nextStep({ joinOption: 'join' })}
              >
                <div className="w-10 h-10 rounded-xl bg-pulse-purple/20 flex items-center justify-center text-pulse-purple group-hover:scale-110 transition-all"><Users size={20} /></div>
                <div className="text-left">
                  <span className="block text-xs font-display font-black text-white uppercase">Join a Team</span>
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Find your battle mates</span>
                </div>
              </button>
              <button 
                className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 hover:bg-pulse-cyan/20 hover:border-pulse-cyan/50 group transition-all"
                onClick={() => nextStep({ joinOption: 'create' })}
              >
                <div className="w-10 h-10 rounded-xl bg-pulse-cyan/20 flex items-center justify-center text-pulse-cyan group-hover:scale-110 transition-all"><Plus size={20} /></div>
                <div className="text-left">
                  <span className="block text-xs font-display font-black text-white uppercase">Create a Team</span>
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Lead from the front</span>
                </div>
              </button>
            </div>
            <button 
              disabled={isProcessing}
              onClick={() => nextStep({ profileCompleted: true })}
              className="w-full py-4 text-white/30 font-display font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all underline decoration-white/10 underline-offset-8"
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
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <div className={`w-[100px] h-[100px] rounded-[20px] overflow-hidden border transition-all duration-300 ${isActive ? 'border-pulse-purple shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-white/10 grayscale opacity-60'}`}>
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-white/5" />
        )}
      </div>
      <span className={`text-[12px] font-display font-black uppercase tracking-widest text-center whitespace-pre-line leading-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] ${isActive ? 'text-white' : 'text-white/40'}`}>
        {title}
      </span>
    </motion.button>
  );
}

const MOCK_GROUPS: Chat[] = [];

// App Version Constants
const APP_VERSION_CODE = 2;
const APP_VERSION_NAME = "1.0.0";

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'chats' | 'profile'>('home');
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const [chatCategory, setChatCategory] = useState<'messages' | 'groups'>('messages');
  const [selectedGame, setSelectedGame] = useState<'freefire' | 'bgmi'>('freefire');
  const [searchQuery, setSearchQuery] = useState('');
  const [userCoins, setUserCoins] = useState(0);
  const [userPinkDiamonds, setUserPinkDiamonds] = useState(0);
  const [userBlueDiamonds, setUserBlueDiamonds] = useState(0);
  const [userMatches, setUserMatches] = useState(0);
  const [userWins, setUserWins] = useState(0);
  const [userKdRatio, setUserKdRatio] = useState(0);
  const [userHeadshots, setUserHeadshots] = useState(0);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'reports' | 'tournaments' | 'system'>('users');
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
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [viewingGameTournaments, setViewingGameTournaments] = useState<'freefire' | 'bgmi' | null>(null);
  const [isPrizePoolModalOpen, setIsPrizePoolModalOpen] = useState(false);
  const [isJoinTournamentModalOpen, setIsJoinTournamentModalOpen] = useState(false);
  
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
  const [reportFilter, setReportFilter] = useState('all');
  const [ownReportCount, setOwnReportCount] = useState(0);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showTaskToast, setShowTaskToast] = useState(false);
  const [joinedTeamIds, setJoinedTeamIds] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [followedTeamIds, setFollowedTeamIds] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isMyTeamsListOpen, setIsMyTeamsListOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<'available' | 'in-team' | 'busy'>('available');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportTargetName, setReportTargetName] = useState('');
  const [selectedReportReasons, setSelectedReportReasons] = useState<string[]>([]);
  
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
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
  const [userBio, setUserBio] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [userTags, setUserTags] = useState<string[]>([]);
  const [userRole, setUserRole] = useState('');
  const [userFavoriteGame, setUserFavoriteGame] = useState('');
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  
  const [teamsList, setTeamsList] = useState<Team[]>(INITIAL_TEAMS);
  
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamBio, setNewTeamBio] = useState('');
  const [newTeamTags, setNewTeamTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const teamLogoInputRef = useRef<HTMLInputElement>(null);

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
      }
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
    if (!isAdminUser || !isAdminDashboardOpen) return;

    const usersUnsub = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'users'));

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
        if (u.email === "blameboyop@gmail.com") {
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

  const [profileCompleted, setProfileCompleted] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [username, setUsername] = useState('');
  const [experience, setExperience] = useState('');

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
        setUserAvatar(data.avatar || '');
        setUserTags(data.tags || []);
        setUserRole(data.role || '');
        setUserFavoriteGame(data.favoriteGame || '');
        setRecentMatches(data.recentMatches || []);
        setUserNumericId(data.numericId || null);
        setUserCoins(data.coins || 0);
        setUserPinkDiamonds(data.pinkDiamonds || 0);
        setUserBlueDiamonds(data.blueDiamonds || 0);
        setPlayerStatus(data.playerStatus || 'available');
        setUserMatches(data.stats?.matchesPlayed || data.matches || 0);
        setUserWins(data.stats?.wins || data.wins || 0);
        setUserKdRatio(data.stats?.kdRatio || data.kdRatio || 0);
        setUserHeadshots(data.headshotPercentage || 0);
        setIsUserBanned(!!data.isBanned);
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
          avatar: user.photoURL || '',
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
      }
    }, (err) => {
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

    const unsubscribeMemberships = onSnapshot(membershipQuery, (snap) => {
      setJoinedTeamIds(snap.docs.map(doc => doc.data().teamId));
    }, (err) => handleFirestoreError(err, 'list', 'memberships'));

    return () => {
      unsubscribeFollows();
      unsubscribeMemberships();
    };
  }, [user, isLoggedIn]);

  const statusConfig = {
    available: { color: 'bg-green-500', label: 'Available', shadow: 'shadow-[0_0_10px_rgba(34,197,94,0.5)]' },
    'in-team': { color: 'bg-yellow-500', label: 'In Team', shadow: 'shadow-[0_0_10px_rgba(234,179,8,0.5)]' },
    busy: { color: 'bg-red-500', label: 'Busy', shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]' }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredTeams = useMemo(() => {
    return teamsList.filter(t => 
      t.game === selectedGame && 
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [selectedGame, searchQuery, teamsList]);

  if (!isAuthReady) {
    return (
      <div className="h-[100dvh] w-full bg-abyssal flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-pulse-purple border-t-transparent rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)]"
        />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-abyssal relative overflow-hidden font-sans">
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

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] min-w-[280px] pointer-events-none"
          >
            <div className={`px-6 py-4 rounded-2xl backdrop-blur-xl border flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${
              toast.type === 'success' 
                ? 'bg-pulse-cyan/10 border-pulse-cyan/30 text-pulse-cyan' 
                : 'bg-red-500/10 border-red-500/30 text-red-500'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-pulse-cyan/20' : 'bg-red-500/20'}`}>
                {toast.type === 'success' ? <Trophy size={16} /> : <Ban size={16} />}
              </div>
              <span className="text-[10px] font-display font-black uppercase tracking-[0.2em]">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    alert("Please fill all fields");
                    return;
                  }
                  try {
                    await signInWithEmailAndPassword(auth, userEmail, password);
                  } catch (err: any) {
                    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
                      try {
                        await createUserWithEmailAndPassword(auth, userEmail, password);
                      } catch (signupErr: any) {
                        alert(signupErr.message);
                      }
                    } else {
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
      <header className="flex items-center justify-between px-6 pt-8 pb-2 shrink-0">
        <button 
          onClick={async () => {
             if (!user) return;
             setIsTasksModalOpen(true);
          }}
          type="button" 
          className="p-2 hover:bg-white/5 rounded-full transition-colors relative"
          title="Complete Tasks"
        >
          <ListChecks size={20} className="text-[#a0a5f7]" />
          <AnimatePresence>
            {showTaskToast && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-12 left-0 whitespace-nowrap bg-green-500/80 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full font-bold"
              >
                +200 COINS!
              </motion.div>
            )}
          </AnimatePresence>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg uppercase font-display font-black tracking-[0.1em] text-[#a0a5f7] drop-shadow-[0_0_8px_rgba(160,165,247,0.3)] leading-tight mb-1">
            Squad UP Arena
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Coins size={10} className="text-yellow-400" />
              <span className="text-[10px] uppercase font-display font-bold tracking-[0.05em] text-[#7186f1] leading-tight">
                {userCoins.toLocaleString()}
              </span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1">
              <Gem size={10} className="text-pink-400" />
              <span className="text-[10px] uppercase font-display font-bold tracking-[0.05em] text-[#7186f1] leading-tight">
                {userPinkDiamonds.toLocaleString()}
              </span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1">
              <Gem size={10} className="text-blue-400" />
              <span className="text-[10px] uppercase font-display font-bold tracking-[0.05em] text-[#7186f1] leading-tight">
                {userBlueDiamonds.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => setIsMyTeamsListOpen(true)}
          className={`w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all relative ${isMyTeamsListOpen ? 'border-pulse-purple bg-pulse-purple/10' : ''}`}
        >
          <Shield size={20} className={isMyTeamsListOpen ? 'text-white' : 'text-white/50'} />
          {/* Status Dot */}
          <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0e2e] ${statusConfig[playerStatus].color} ${statusConfig[playerStatus].shadow}`} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col px-6 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-1 -mr-1 pb-32"
            >
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

                   {/* Search Bar */}
                   <div className="relative mb-6 group shrink-0">
                     <div className="absolute -inset-[1px] rounded-[18px] bg-gradient-to-r from-pulse-cyan via-pulse-purple to-pulse-purple opacity-30 blur-[2px] group-focus-within:opacity-70 transition-opacity" />
                     <div className="relative flex items-center bg-[#0d0e2e]/60 backdrop-blur-md rounded-[16px] border border-white/5 px-4 py-3 overflow-hidden">
                       <Search size={18} className="text-white/40 mr-3 shrink-0" />
                       <input 
                         type="text"
                         placeholder="Search Teams to Follow..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="bg-transparent border-none focus:ring-0 text-white placeholder-white/20 w-full text-sm font-medium"
                       />
                       <button 
                         onClick={() => {
                           if (age < 13) {
                             alert("Restricted: You must be at least 13 years old to create a team.");
                             return;
                           }
                           setIsCreateModalOpen(true);
                         }}
                         className="ml-2 w-8 h-8 rounded-lg bg-pulse-purple/20 border border-pulse-purple/40 flex items-center justify-center text-white hover:bg-pulse-purple transition-all shrink-0"
                         title="Create Team"
                       >
                         <Plus size={16} />
                       </button>
                     </div>
                   </div>

                   {/* Team List */}
                   <div className="space-y-4">
                     <AnimatePresence mode="popLayout">
                       {filteredTeams.map((team) => (
                         <motion.div
                           key={team.id}
                           layout
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.95 }}
                           onClick={() => setSelectedTeamId(team.id)}
                           className="flex items-center justify-between bg-white/[0.03] p-3 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-all group"
                         >
                           <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 p-2 overflow-hidden shrink-0 group-hover:border-pulse-purple/50 transition-all">
                               {team.logo ? (
                                 <img 
                                   src={team.logo} 
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
                             {/* Follow Button */}
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
                               <span className="hidden sm:inline text-[10px] font-display font-bold uppercase tracking-widest text-pulse-purple/80 group-hover/btn:text-white transition-colors">
                                 {joinedTeamIds.includes(team.id) ? 'VIEW' : 'JOIN'}
                               </span>
                               <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover/btn:bg-pulse-purple/40 group-hover/btn:border-pulse-purple/50 transition-all bg-white/5">
                                 <ArrowUpRight size={14} className="text-white/40 group-hover/btn:text-white" />
                               </div>
                             </div>
                           </div>
                         </motion.div>
                       ))}
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
                         className="group relative bg-[#16173a] border border-white/5 rounded-[32px] overflow-hidden hover:border-pulse-cyan/50 transition-all shadow-xl"
                       >
                         {/* Card Header/Banner */}
                         <div className="relative h-32 overflow-hidden">
                           <img src={tour.imageUrl} alt="" className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700" />
                           <div className="absolute inset-0 bg-gradient-to-t from-[#16173a] via-transparent to-transparent opacity-80" />
                           <div className="absolute top-4 left-4">
                             <span className="px-3 py-1 bg-pulse-purple/80 backdrop-blur-md rounded-full text-[9px] font-display font-black text-white uppercase tracking-widest">{tour.matchType}</span>
                           </div>
                         </div>

                         {/* Card Body */}
                         <div className="p-5 -mt-8 relative z-10">
                           <h4 className="text-lg font-display font-black text-white uppercase tracking-tight mb-4 group-hover:text-pulse-cyan transition-colors">{tour.title}</h4>
                           
                           <div className="grid grid-cols-2 gap-3 mb-4">
                             <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-0.5 text-center transition-all group-hover:bg-white/[0.08]">
                               <span className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest">Prize Pool</span>
                               <span className="text-sm font-display font-black text-pulse-cyan italic uppercase truncate w-full">💎 {tour.prizePool.toLocaleString()}</span>
                             </div>
                             <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-0.5 text-center transition-all group-hover:bg-white/[0.08]">
                               <span className="text-[9px] font-display font-bold text-white/30 uppercase tracking-widest">Entry Fee</span>
                               <span className="text-sm font-display font-black text-pulse-purple italic uppercase truncate w-full">💎 {tour.entryFee}</span>
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
                             className={`w-full py-3.5 rounded-2xl font-display font-black text-xs uppercase tracking-[0.15em] transition-all active:scale-95 ${
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
            </motion.div>
          ) : activeTab === 'profile' ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col overflow-y-auto pr-1 -mr-1 custom-scrollbar pt-4"
            >
              {/* Profile Header */}
              <div className="flex flex-col items-center mb-8 shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-pulse-purple/30 blur-xl rounded-full scale-110" />
                  <div className="relative w-28 h-28 rounded-full border-4 border-pulse-purple p-1 bg-abyssal overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt="Avatar" 
                        className="w-full h-full object-cover rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <User size={40} className="text-white/20" />
                      </div>
                    )}
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

                <h4 className="mt-4 text-2xl font-display font-black text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  {userName}
                </h4>
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

                {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
                {[
                  { label: 'MATCHES', value: userMatches.toLocaleString(), color: 'purple' },
                  { label: 'WINS', value: userWins.toLocaleString(), color: 'cyan' },
                  { label: 'K/D RATIO', value: userKdRatio.toFixed(2), color: 'purple' },
                  { label: 'HEADSHOTS', value: `${userHeadshots}%`, color: 'cyan' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className={`absolute bottom-0 left-0 h-1 w-full bg-pulse-${stat.color} opacity-30 group-hover:opacity-100 transition-opacity`} />
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
                        <p className="text-sm font-display font-black text-pulse-purple uppercase">{userRole || 'PLAYER'}</p>
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
                      <div key={tour.id || idx} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-pulse-purple/30 transition-all">
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
                    ))
                  ) : (
                    <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-6 text-center">
                       <p className="text-[10px] font-display font-black text-white/20 uppercase tracking-widest leading-loose">
                          You haven't joined any<br/>tournaments yet
                       </p>
                    </div>
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
                    <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-6 text-center">
                       <p className="text-[10px] font-display font-black text-white/20 uppercase tracking-widest leading-loose">
                          No matches played yet
                       </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pb-40 shrink-0">
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
                    onClick={() => setIsAdminDashboardOpen(true)}
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
            </motion.div>
          ) : (
            <motion.div
              key="chats"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col overflow-hidden pt-4 pb-32"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-display font-black text-white tracking-tight uppercase">MESSAGES</h3>
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Search size={16} className="text-white/40" />
                </div>
              </div>

              {/* Chat Sub-Category Picker */}
              <div className="flex items-center gap-4 mb-6 px-1">
                <button 
                  onClick={() => setChatCategory('messages')}
                  className={`flex items-center gap-2 pb-2 border-b-2 transition-all ${chatCategory === 'messages' ? 'border-pulse-purple text-white' : 'border-transparent text-white/40 hover:text-white/60'}`}
                >
                  <MessageSquare size={16} />
                  <span className="text-[11px] font-display font-bold uppercase tracking-widest">Messages</span>
                </button>
                <button 
                  onClick={() => setChatCategory('groups')}
                  className={`flex items-center gap-2 pb-2 border-b-2 transition-all ${chatCategory === 'groups' ? 'border-pulse-purple text-white' : 'border-transparent text-white/40 hover:text-white/60'}`}
                >
                  <Users size={16} />
                  <span className="text-[11px] font-display font-bold uppercase tracking-widest">My Groups</span>
                </button>
              </div>

              {/* Toxicity Disclaimer in Chats */}
              <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/10 shrink-0">
                <p className="text-[9px] font-display font-bold text-white/30 leading-none uppercase tracking-[0.15em] text-center">
                   Toxic or abusive behavior may lead to <span className="text-red-500">permanent ban</span>.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1 custom-scrollbar flex flex-col">
                {(chatCategory === 'messages' ? MOCK_CHATS : MOCK_GROUPS).length > 0 ? (
                  (chatCategory === 'messages' ? MOCK_CHATS : MOCK_GROUPS).map((chat) => (
                    <div key={chat.id} className="relative group">
                      <button 
                        type="button"
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all"
                      >
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                            {chat.avatar ? (
                              <img 
                                src={chat.avatar} 
                                alt={chat.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <User size={24} className="text-white/20" />
                              </div>
                            )}
                          </div>
                          {chat.online && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pulse-cyan border-2 border-[#0d0e2e] shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                          )}
                        </div>

                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-display font-bold text-white text-[15px] truncate mr-2">
                              {chat.name}
                            </h5>
                            <span className="text-[10px] font-display font-bold text-white/30 tracking-widest">
                              {chat.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-white/50 font-medium truncate leading-tight">
                            {chat.lastMessage}
                          </p>
                        </div>

                        {chat.unreadCount && (
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            <div className="min-w-[20px] h-5 px-1.5 rounded-full bg-pulse-purple flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                              <span className="text-[10px] font-display font-black text-white leading-none">
                                {chat.unreadCount}
                              </span>
                            </div>
                          </div>
                        )}
                      </button>

                      {/* Report Action Button */}
                      <button 
                        onClick={() => {
                          setReportTargetId(chat.id);
                          setReportTargetName(chat.name);
                          setIsReportModalOpen(true);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white z-10"
                        title="Report User"
                      >
                        <ShieldAlert size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center px-8 text-center bg-white/[0.01] rounded-3xl border border-white/[0.03] my-4">
                    <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 opacity-30">
                      <MessageSquare size={32} />
                    </div>
                    <h4 className="text-xs font-display font-black text-white/40 uppercase tracking-[0.2em] mb-2 leading-none">No Comms Active</h4>
                    <p className="text-[10px] font-display font-bold text-white/20 uppercase tracking-widest leading-relaxed">
                      {chatCategory === 'messages' ? 'Your direct messages will appear here once you start a conversation.' : 'Join a team and start chatting with your squad!'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation - Lifted to avoid platform UI conflicts */}
      <div className="absolute bottom-12 left-0 right-0 px-6 z-50 pointer-events-none">
        <div className="max-w-[340px] mx-auto relative pointer-events-auto">
          <div className="absolute inset-x-0 bottom-0 h-[72px] bg-[#0a0b25]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
          
          <div className="relative flex items-center justify-between px-6 h-[72px]">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('chats');
              }}
              className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'chats' ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-70'}`}
            >
              <MessageSquare size={20} className={activeTab === 'chats' ? 'text-pulse-purple' : 'text-white'} />
              <span className="text-[8px] font-display font-bold uppercase tracking-[0.2em] text-white">CHATS</span>
            </button>
            
            <div className="relative flex-1 h-full flex items-center justify-center">
              <div className="absolute -top-6">
                <div className={`absolute inset-0 bg-pulse-purple/30 blur-2xl rounded-full transition-opacity duration-500 ${activeTab === 'home' ? 'opacity-100' : 'opacity-0'}`} />
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('home');
                  }}
                  className={`relative w-16 h-16 bg-gradient-to-b from-[#1a1b3a] to-black border rounded-[22px] flex flex-col items-center justify-center shadow-2xl transition-all duration-300 ${activeTab === 'home' ? 'border-pulse-purple scale-110' : 'border-white/10 grayscale opacity-60'}`}
                >
                  <Home size={24} className="text-white" />
                  <span className="text-[8px] font-display font-bold uppercase tracking-[0.2em] text-white mt-1">HOME</span>
                </button>
              </div>
            </div>

            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('profile');
              }}
              className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'profile' ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-70'}`}
            >
              <User size={20} className={activeTab === 'profile' ? 'text-pulse-purple' : 'text-white'} />
              <span className="text-[8px] font-display font-bold uppercase tracking-[0.2em] text-white">PROFILE</span>
            </button>
          </div>
        </div>
      </div>

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
                      alert("Your account is restricted due to multiple reports. You cannot create new teams.");
                      return;
                    }
                    try {
                      const batch = writeBatch(db);
                      const teamRef = doc(collection(db, 'teams'));
                      const membershipRef = doc(collection(db, 'memberships'));
                      
                      batch.set(teamRef, {
                        name: newTeamName,
                        logo: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=100&h=100&bg=000',
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

                      // Reset fields
                      setNewTeamName('');
                      setNewTeamBio('');
                      setNewTeamTags([]);
                      setIsCreateModalOpen(false);
                    } catch (err) {
                      handleFirestoreError(err, 'write');
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

              <div className="space-y-4">
                {[
                  { id: 't1', title: 'Join a Team', reward: 100, action: 'join' },
                  { id: 't2', title: 'Create a Team', reward: 200, action: 'create' },
                  { id: 't3', title: 'Add 5 Friends', reward: 300, action: 'invite' },
                  { id: 't4', title: 'Follow a Team', reward: 50, action: 'follow' },
                  { id: 't5', title: 'Follow 5 Teams', reward: 250, action: 'follow_multiple' }
                ].map((task) => (
                  <button 
                    key={task.id}
                    onClick={async () => {
                      if (!user) return;
                      try {
                        await updateDoc(doc(db, 'users', user.uid), {
                          pinkDiamonds: increment(task.reward)
                        });
                        alert(`Success! You earned ${task.reward} Pink Diamonds!`);
                        setIsTasksModalOpen(false);
                      } catch (err) {
                        handleFirestoreError(err, 'update');
                      }
                    }}
                    className="w-full bg-white/[0.03] border border-white/5 p-4 rounded-3xl flex items-center justify-between group hover:bg-white/[0.06] hover:border-pulse-cyan/30 transition-all"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-xs font-display font-black text-white uppercase tracking-tight">{task.title}</span>
                      <div className="flex items-center gap-1">
                        <Gem size={10} className="text-pink-500" />
                        <span className="text-[10px] font-display font-bold text-pink-500 uppercase tracking-widest">+{task.reward} Pink Diamonds</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-pulse-cyan/10 border border-pulse-cyan/30 flex items-center justify-center text-pulse-cyan group-hover:bg-pulse-cyan group-hover:text-abyssal transition-all shadow-lg">
                      <ArrowUpRight size={14} />
                    </div>
                  </button>
                ))}
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
                    handleFirestoreError(err, 'write');
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
        {isAdminDashboardOpen && isAdminUser && (
          <div className="fixed inset-0 z-[260] flex flex-col p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminDashboardOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl mx-auto bg-[#0a0b25] border border-white/10 rounded-[40px] flex flex-col shadow-2xl h-full overflow-y-auto custom-scrollbar"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row items-center justify-between p-8 border-b border-white/5 shrink-0 gap-6 sticky top-0 bg-[#0a0b25]/80 backdrop-blur-md z-10">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-pulse-cyan/10 border border-pulse-cyan/30 flex items-center justify-center text-pulse-cyan shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                      <LayoutDashboard size={20} />
                    </div>
                    <h2 className="text-2xl font-display font-black text-white tracking-tighter uppercase italic">Control Panel</h2>
                  </div>
                  <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.3em]">Authorized Personnel Only</p>
                </div>

                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                  <button 
                    onClick={() => setAdminTab('users')}
                    className={`px-8 py-3 rounded-xl font-display font-black text-[11px] uppercase tracking-widest transition-all ${adminTab === 'users' ? 'bg-pulse-cyan text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                  >
                    User Management
                  </button>
                  <button 
                    onClick={() => setAdminTab('reports')}
                    className={`px-8 py-3 rounded-xl font-display font-black text-[11px] uppercase tracking-widest transition-all ${adminTab === 'reports' ? 'bg-red-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                  >
                    Behavior Reports
                  </button>
                  <button 
                    onClick={() => setAdminTab('tournaments')}
                    className={`px-8 py-3 rounded-xl font-display font-black text-[11px] uppercase tracking-widest transition-all ${adminTab === 'tournaments' ? 'bg-pulse-purple text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                  >
                    Tournaments
                  </button>
                  <button 
                    onClick={() => setAdminTab('system')}
                    className={`px-8 py-3 rounded-xl font-display font-black text-[11px] uppercase tracking-widest transition-all ${adminTab === 'system' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                  >
                    System
                  </button>
                </div>

                <button 
                  onClick={() => setIsAdminDashboardOpen(false)}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all border border-white/5"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col">
                {adminTab === 'users' ? (
                  <div className="flex-1 flex flex-col p-8">
                    {/* Search & Actions */}
                    <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
                      <div className="flex-1 w-full relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-pulse-cyan transition-colors" size={24} />
                        <input 
                          type="text" 
                          dir="ltr"
                          placeholder="Search users by name, email or numeric ID..."
                          value={adminSearchQuery}
                          onChange={(e) => setAdminSearchQuery(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-[24px] py-6 pl-16 pr-8 text-white text-left font-display font-medium text-lg placeholder-white/20 outline-none focus:border-pulse-cyan focus:bg-white/[0.05] focus:shadow-[0_0_40px_rgba(34,211,238,0.1)] transition-all"
                        />
                      </div>
                      <button 
                        onClick={async () => {
                           if (confirm("This will assign numeric IDs to all users who don't have one, starting from the oldest accounts. Continue?")) {
                              const batch = writeBatch(db);
                              let count = 0;
                              try {
                                 const counterRef = doc(db, 'metadata', 'users');
                                 const counterSnap = await getDoc(counterRef);
                                 let lastId = counterSnap.exists() ? counterSnap.data().lastGeneratedId : 9999;
                                 
                                 // Sort users by their document ID creation time (if available) or existing numericId
                                 // Since Firestore doesn't provide client-side creation time easily from the doc object itself 
                                 // without a field, we will just use the current allUsers order which is likely stable 
                                 // or sort by a predicted sequence.
                                 const sortedUsers = [...allUsers].sort((a, b) => {
                                   // If we had a createdAt field, we'd use it.
                                   // For now, let's just use the current order or doc ID if nothing else.
                                   return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
                                 });

                                 for (const u of sortedUsers) {
                                    if (!u.numericId) {
                                       lastId++;
                                       batch.update(doc(db, 'users', u.id), { numericId: lastId });
                                       count++;
                                    }
                                 }
                                 
                                 if (count > 0) {
                                    batch.set(counterRef, { lastGeneratedId: lastId }, { merge: true });
                                    await batch.commit();
                                    alert(`Successfully assigned IDs to ${count} users!`);
                                 } else {
                                    alert("All users already have numeric IDs.");
                                 }
                              } catch (err) {
                                 console.error("Repair failed:", err);
                                 alert("Failed to repair IDs. See console.");
                              }
                           }
                        }}
                        className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-display font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <Shield size={16} className="text-pulse-cyan" />
                        Repair IDs
                      </button>
                    </div>

                    <div className="mb-6 flex items-center justify-between px-2">
                       <span className="text-[10px] font-display font-bold text-white/20 uppercase tracking-[0.2em]">Viewing {allUsers.filter(u => {
                            const query = adminSearchQuery.toLowerCase();
                            return u.name?.toLowerCase().includes(query) || 
                                   u.email?.toLowerCase().includes(query) ||
                                   u.numericId?.toString().includes(query) ||
                                   u.id === adminSearchQuery;
                          }).length} Users</span>
                       <span className="text-[10px] font-display font-bold text-pulse-cyan/40 uppercase tracking-[0.2em]">Orders: Newest First</span>
                    </div>

                    {/* Users Table */}
                    <div className="flex-1">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                            <div key={targetUser.id} className="relative bg-white/[0.02] border border-white/5 rounded-[24px] p-6 flex flex-col gap-6 hover:bg-white/[0.04] transition-all group overflow-hidden">
                              <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0 shadow-lg">
                                  {targetUser.avatar ? (
                                    <img src={targetUser.avatar} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/10">
                                      <User size={32} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="min-w-0">
                                      <h4 className="text-lg font-display font-black text-white truncate mb-0.5">{targetUser.name}</h4>
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-mono font-black text-pulse-purple italic tracking-widest bg-pulse-purple/5 px-2 py-0.5 rounded border border-pulse-purple/10">ID: {targetUser.numericId || 'N/A'}</span>
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
                                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${editingUserId === targetUser.id ? 'bg-pulse-cyan text-abyssal' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
                                    >
                                      {editingUserId === targetUser.id ? <Check size={18} /> : <Pencil size={18} />}
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2 mb-3">
                                    {targetUser.isBanned && <span className="bg-red-500/20 text-red-500 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-red-500/30">Banned</span>}
                                    {targetUser.isRestricted && <span className="bg-yellow-500/20 text-yellow-500 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-yellow-500/30">Restricted</span>}
                                  </div>

                                  <p className="text-[10px] font-mono text-white/20 truncate mb-3">{targetUser.id}</p>
                                  
                                  {editingUserId === targetUser.id ? (
                                    <div className="space-y-4 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                      {/* Economy Section */}
                                      <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                          <label className="text-[7px] font-black text-white/20 uppercase tracking-widest">Coins</label>
                                          <input 
                                            type="number"
                                            value={editCoins}
                                            onChange={(e) => setEditCoins(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-yellow-500 font-bold outline-none focus:border-yellow-500/50"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[7px] font-black text-white/20 uppercase tracking-widest">Pink Dia</label>
                                          <input 
                                            type="number"
                                            value={editPink}
                                            onChange={(e) => setEditPink(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-pink-500 font-bold outline-none focus:border-pink-500/50"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[7px] font-black text-white/20 uppercase tracking-widest">Blue Dia</label>
                                          <input 
                                            type="number"
                                            value={editBlue}
                                            onChange={(e) => setEditBlue(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-blue-500 font-bold outline-none focus:border-blue-500/50"
                                          />
                                        </div>
                                      </div>

                                      {/* Stats Section */}
                                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <h5 className="text-[8px] font-black text-pulse-cyan uppercase tracking-[0.2em] mb-3">Player Statistics</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <label className="text-[7px] font-black text-white/30 uppercase tracking-widest">Matches</label>
                                            <input 
                                              type="number"
                                              value={editMatches}
                                              onChange={(e) => setEditMatches(e.target.value)}
                                              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-pulse-cyan/50"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[7px] font-black text-white/30 uppercase tracking-widest">Wins</label>
                                            <input 
                                              type="number"
                                              value={editWins}
                                              onChange={(e) => setEditWins(e.target.value)}
                                              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-pulse-cyan/50"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[7px] font-black text-white/30 uppercase tracking-widest">Kills</label>
                                            <input 
                                              type="number"
                                              value={editKills}
                                              onChange={(e) => setEditKills(e.target.value)}
                                              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-pulse-cyan/50"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[7px] font-black text-white/30 uppercase tracking-widest">K/D Ratio</label>
                                            <input 
                                              type="number"
                                              step="0.01"
                                              value={editKd}
                                              onChange={(e) => setEditKd(e.target.value)}
                                              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-pulse-purple font-black outline-none focus:border-pulse-purple/50"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex gap-3">
                                        <button 
                                          onClick={() => setEditingUserId(null)}
                                          className="flex-1 h-10 rounded-xl bg-white/5 text-white/40 font-display font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                                        >
                                          Cancel
                                        </button>
                                        <button 
                                          onClick={async () => {
                                            try {
                                              const stats = {
                                                kdRatio: parseFloat(editKd) || 0,
                                                kills: parseInt(editKills) || 0,
                                                matchesPlayed: parseInt(editMatches) || 0,
                                                wins: parseInt(editWins) || 0
                                              };
                                              
                                              await updateDoc(doc(db, 'users', targetUser.id), {
                                                coins: parseInt(editCoins) || 0,
                                                pinkDiamonds: parseInt(editPink) || 0,
                                                blueDiamonds: parseInt(editBlue) || 0,
                                                stats: stats,
                                                kdRatio: stats.kdRatio,
                                                matches: stats.matchesPlayed,
                                                wins: stats.wins,
                                                updatedAt: serverTimestamp()
                                              });
                                              setEditingUserId(null);
                                            } catch (err) {
                                              handleFirestoreError(err, 'update', `users/${targetUser.id}`);
                                            }
                                          }}
                                          className="flex-[2] h-10 rounded-xl bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white font-display font-black text-[10px] uppercase tracking-widest shadow-xl shadow-pulse-purple/20"
                                        >
                                          Save Changes
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                        {targetUser.preferredGame || 'No Game'}
                                      </div>
                                      <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[10px] font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <Coins size={10} /> {targetUser.coins || 0}
                                      </div>
                                      <div className="px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full text-[10px] font-bold text-pink-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <Gem size={10} /> {targetUser.pinkDiamonds || 0}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {!editingUserId && (
                                <div className="space-y-4">
                                  {/* Quick Actions Grid */}
                                  <div className="grid grid-cols-4 gap-2">
                                    <button 
                                      onClick={async () => {
                                        const val = prompt("Set Coins:", targetUser.coins || 0);
                                        if (val !== null) await updateDoc(doc(db, 'users', targetUser.id), { coins: parseInt(val) || 0 });
                                      }}
                                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-yellow-500/10 hover:border-yellow-500/20 text-white/40 hover:text-yellow-500 transition-all gap-1"
                                    >
                                      <Coins size={14} />
                                      <span className="text-[8px] font-bold uppercase tracking-tighter">Coins</span>
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        const val = prompt("Set Pink Diamonds:", targetUser.pinkDiamonds || 0);
                                        if (val !== null) await updateDoc(doc(db, 'users', targetUser.id), { pinkDiamonds: parseInt(val) || 0 });
                                      }}
                                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-pink-500/10 hover:border-pink-500/20 text-white/40 hover:text-pink-500 transition-all gap-1"
                                    >
                                      <Gem size={14} />
                                      <span className="text-[8px] font-bold uppercase tracking-tighter">Pink</span>
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        const val = prompt("Set Blue Diamonds:", targetUser.blueDiamonds || 0);
                                        if (val !== null) await updateDoc(doc(db, 'users', targetUser.id), { blueDiamonds: parseInt(val) || 0 });
                                      }}
                                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-blue-500/10 hover:border-blue-500/20 text-white/40 hover:text-blue-500 transition-all gap-1"
                                    >
                                      <Gem size={14} />
                                      <span className="text-[8px] font-bold uppercase tracking-tighter">Blue</span>
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        const val = prompt("Set Followers:", targetUser.followers || 0);
                                        if (val !== null) await updateDoc(doc(db, 'users', targetUser.id), { followers: parseInt(val) || 0 });
                                      }}
                                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-pulse-cyan/10 hover:border-pulse-cyan/20 text-white/40 hover:text-pulse-cyan transition-all gap-1"
                                    >
                                      <Users size={14} />
                                      <span className="text-[8px] font-bold uppercase tracking-tighter">Fans</span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <button 
                                      onClick={async () => {
                                        const newStatus = prompt("Enter status (available, in-team, busy):", targetUser.playerStatus || 'available');
                                        if (newStatus) await updateDoc(doc(db, 'users', targetUser.id), { playerStatus: newStatus });
                                      }}
                                      className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 font-display font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all"
                                    >
                                      Edit Status
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        const role = prompt("Enter Player Role (Sniper, Rusher, etc):", targetUser.role || '');
                                        if (role !== null) await updateDoc(doc(db, 'users', targetUser.id), { role });
                                      }}
                                      className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 font-display font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all"
                                    >
                                      Edit Role
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <button 
                                      onClick={async () => {
                                        try {
                                          await updateDoc(doc(db, 'users', targetUser.id), { isRestricted: !targetUser.isRestricted });
                                        } catch (err) {
                                          handleFirestoreError(err, 'update', `users/${targetUser.id}`);
                                        }
                                      }}
                                      className={`py-3 px-4 rounded-xl border font-display font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        targetUser.isRestricted 
                                          ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/30' 
                                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-yellow-500/20 hover:text-yellow-500'
                                      }`}
                                    >
                                      {targetUser.isRestricted ? <Unlock size={12} /> : <ShieldAlert size={12} />}
                                      {targetUser.isRestricted ? 'Unrestrict' : 'Restrict'}
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        if (confirm(`Are you sure you want to ${targetUser.isBanned ? 'unban' : 'BAN'} this user?`)) {
                                          try {
                                            await updateDoc(doc(db, 'users', targetUser.id), { isBanned: !targetUser.isBanned });
                                          } catch (err) {
                                            handleFirestoreError(err, 'update', `users/${targetUser.id}`);
                                          }
                                        }
                                      }}
                                      className={`py-3 px-4 rounded-xl border font-display font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        targetUser.isBanned 
                                          ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' 
                                          : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'
                                      }`}
                                    >
                                      {targetUser.isBanned ? <Unlock size={14} /> : <Ban size={14} />}
                                      {targetUser.isBanned ? 'Unban' : 'Ban User'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : adminTab === 'tournaments' ? (
                  <div className="flex-1 flex flex-col p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                      {/* Create Form */}
                      <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                        <h4 className="text-sm font-display font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                          <Plus size={16} className="text-pulse-purple" />
                          Create Tournament
                        </h4>
                        
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Title</label>
                            <input 
                              type="text" 
                              value={newTourTitle}
                              onChange={(e) => setNewTourTitle(e.target.value)}
                              placeholder="e.g. Battle Royale Match #45830"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/10 text-sm focus:border-pulse-purple/50 outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Match Type</label>
                              <select 
                                value={newTourType}
                                onChange={(e) => setNewTourType(e.target.value as any)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-pulse-purple/50 outline-none"
                              >
                                <option value="Solo" className="bg-[#0a0b25]">Solo</option>
                                <option value="Duo" className="bg-[#0a0b25]">Duo</option>
                                <option value="Squad" className="bg-[#0a0b25]">Squad</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Game</label>
                              <select 
                                value={newTourGame}
                                onChange={(e) => setNewTourGame(e.target.value as any)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-pulse-purple/50 outline-none"
                              >
                                <option value="freefire" className="bg-[#0a0b25]">Free Fire</option>
                                <option value="bgmi" className="bg-[#0a0b25]">BGMI</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Map</label>
                              <input 
                                type="text" 
                                value={newTourMap}
                                onChange={(e) => setNewTourMap(e.target.value)}
                                placeholder="e.g. Bermuda"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-pulse-purple/50 outline-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Max Players</label>
                              <input 
                                type="number" 
                                value={newTourMaxPlayers}
                                onChange={(e) => setNewTourMaxPlayers(e.target.value)}
                                placeholder="48"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-pulse-purple/50 outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Entry Fee (💎)</label>
                              <input 
                                type="number" 
                                value={newTourFee}
                                onChange={(e) => setNewTourFee(e.target.value)}
                                placeholder="5"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-pulse-purple/50 outline-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Prize Pool</label>
                              <input 
                                type="number" 
                                value={newTourPrize}
                                onChange={(e) => setNewTourPrize(e.target.value)}
                                placeholder="250"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-pulse-purple/50 outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Start Date & Time</label>
                            <input 
                              type="datetime-local" 
                              value={newTourStartTime}
                              onChange={(e) => setNewTourStartTime(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-pulse-purple/50 outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Banner Image URL</label>
                            <input 
                              type="text" 
                              value={newTourImageUrl}
                              onChange={(e) => setNewTourImageUrl(e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-pulse-purple/50 outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Short Description</label>
                            <textarea 
                              value={newTourShortDesc}
                              onChange={(e) => setNewTourShortDesc(e.target.value)}
                              placeholder="Brief summary..."
                              rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-pulse-purple/50 outline-none resize-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest ml-1">Full Rules & Rewards</label>
                            <textarea 
                              value={newTourFullDesc}
                              onChange={(e) => setNewTourFullDesc(e.target.value)}
                              placeholder="Detailed rules, reward breakdown, etc."
                              rows={4}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-pulse-purple/50 outline-none resize-none"
                            />
                          </div>

                          <button 
                            onClick={async () => {
                              if (!user) return;
                              if (!newTourTitle || !newTourFee || !newTourPrize || !newTourMaxPlayers || !newTourMap || !newTourStartTime) {
                                alert("Please fill in all required fields!");
                                return;
                              }
                              try {
                                const tourData = {
                                  title: newTourTitle,
                                  imageUrl: newTourImageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200&h=600',
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
                                alert("Tournament created successfully!");
                              } catch (err) {
                                handleFirestoreError(err, 'write');
                              }
                            }}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white font-display font-black text-xs uppercase tracking-widest shadow-lg shadow-pulse-purple/20 transition-all active:scale-95"
                          >
                            Launch Tournament
                          </button>
                        </div>
                      </div>

                      {/* Tournament Management List */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                           <h4 className="text-sm font-display font-black text-white uppercase tracking-widest">Active Tournaments</h4>
                           <span className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest">{tournaments.length} Matches Found</span>
                        </div>
                        
                        {tournaments.map(tour => (
                          <div key={tour.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:bg-white/[0.04] transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                              <div className="w-24 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                <img src={tour.imageUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <h5 className="text-white font-display font-black text-base uppercase tracking-tight mb-1">{tour.title}</h5>
                                <div className="flex items-center gap-3">
                                  <span className="text-[9px] font-black text-pulse-purple uppercase px-2 py-0.5 bg-pulse-purple/10 rounded">{tour.matchType}</span>
                                  <span className="text-[9px] font-black text-pulse-cyan uppercase px-2 py-0.5 bg-pulse-cyan/10 rounded">{tour.game}</span>
                                  <span className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest">{tour.map}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                               <div className="text-right">
                                  <p className="text-[10px] font-display font-bold text-white/20 uppercase tracking-widest mb-1">Participants</p>
                                  <p className="text-sm font-display font-black text-white">{tour.currentPlayers} / {tour.maxPlayers}</p>
                               </div>
                               <button 
                                 onClick={async () => {
                                   if (confirm("Are you sure you want to delete this tournament?")) {
                                     await deleteDoc(doc(db, 'tournaments', tour.id));
                                   }
                                 }}
                                 className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                               >
                                 <Trash2 size={18} />
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : adminTab === 'reports' ? (
                  <div className="flex-1 flex flex-col p-8">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 mb-8 sticky top-0 bg-[#0a0b25] py-2 z-10 border-b border-white/5">
                      <button 
                        onClick={() => setReportFilter('all')}
                        className={`px-6 py-3 rounded-xl border font-display font-black text-[10px] uppercase tracking-widest transition-all ${reportFilter === 'all' ? 'bg-white/20 border-white/20 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'}`}
                      >
                        All Reports
                      </button>
                      {REPORT_REASONS.map(reason => (
                        <button 
                          key={reason}
                          onClick={() => setReportFilter(reason)}
                          className={`px-6 py-3 rounded-xl border font-display font-black text-[10px] uppercase tracking-widest transition-all ${reportFilter === reason ? 'bg-red-500/20 border-red-500/40 text-red-500 shadow-lg shadow-red-500/10' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'}`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    {/* Reports View */}
                    <div className="flex-1 space-y-4">
                      {reportFilter === 'all' ? (
                        allReports
                          .sort((a,b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0))
                          .map(report => (
                            <div key={report.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.04] transition-all">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                  <div className="p-4 bg-red-500/10 rounded-2xl text-red-500 border border-red-500/20">
                                    <AlertTriangle size={24} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Reported ID:</span>
                                        <span className="text-[11px] font-mono font-bold text-white max-w-[100px] truncate">{report.reportedId}</span>
                                      </div>
                                      <div className="w-1 h-1 rounded-full bg-white/10" />
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Reporter ID:</span>
                                        <span className="text-[11px] font-mono font-bold text-white/60 max-w-[100px] truncate">{report.reporterId}</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {report.reasons?.map((r: string) => (
                                        <span key={r} className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-[9px] font-black text-red-500 uppercase tracking-widest">{r}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col md:items-end gap-3 shrink-0">
                                  <span className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.2em]">
                                    {report.timestamp?.toDate().toLocaleString()}
                                  </span>
                                  <button 
                                    onClick={() => {
                                      setAdminTab('users');
                                      setAdminSearchQuery(report.reportedId);
                                    }}
                                    className="px-6 py-2.5 rounded-xl bg-pulse-cyan/10 border border-pulse-cyan/30 text-pulse-cyan font-display font-black text-[10px] uppercase tracking-widest hover:bg-pulse-cyan hover:text-white transition-all shadow-lg shadow-pulse-cyan/10 flex items-center gap-2"
                                  >
                                    Take Action
                                    <ArrowUpRight size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="space-y-4">
                           <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6">
                              <p className="text-[10px] font-display font-black text-red-500 uppercase tracking-widest">Most Reported Players for: {reportFilter}</p>
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
                                  <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-[40px]">
                                    <Shield size={48} className="mx-auto text-white/5 mb-4" />
                                    <p className="text-white/20 font-display font-black text-xs uppercase tracking-widest">No reports found for this category</p>
                                  </div>
                                );
                              }

                              return sortedAggregated.map(([reportedId, count]) => {
                                 const targetUserData = allUsers.find(u => u.id === reportedId || u.numericId?.toString() === reportedId);
                                 return (
                                   <div key={reportedId} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.04] transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                                     <div className="flex items-center gap-6">
                                       <div className="relative">
                                          <div className={`p-4 rounded-2xl border ${count > 5 ? 'bg-red-500/20 border-red-500/40 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500'}`}>
                                            <Users size={24} />
                                          </div>
                                          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-[#0a0b25] flex items-center justify-center font-display font-black text-xs shadow-xl">
                                            {count}
                                          </div>
                                       </div>
                                       <div>
                                          <h5 className="text-white font-display font-black text-lg uppercase tracking-tight mb-1">
                                             {targetUserData?.name || 'Unknown User'}
                                          </h5>
                                          <div className="flex items-center gap-3">
                                             <span className="text-[10px] font-mono font-bold text-white/40 italic">ID: {reportedId}</span>
                                             <div className="w-1 h-1 rounded-full bg-white/10" />
                                             <span className="text-[10px] font-display font-bold text-white/20 uppercase tracking-widest">{count} Total Reports</span>
                                             <div className="w-1 h-1 rounded-full bg-white/10" />
                                             <span className="text-[10px] font-display font-bold text-pulse-cyan uppercase tracking-widest">{targetUserData?.teamFollowers || 0} Followers</span>
                                          </div>
                                       </div>
                                     </div>
                                     <button 
                                       onClick={() => {
                                         setAdminTab('users');
                                         setAdminSearchQuery(reportedId);
                                      }}
                                      className="px-8 py-3 rounded-xl bg-red-500 text-white font-display font-black text-[11px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                                     >
                                       Investigate Account
                                       <ArrowUpRight size={14} />
                                     </button>
                                   </div>
                                 );
                              });
                           })()}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col p-12">
                    <div className="max-w-xl mx-auto w-full space-y-12">
                      <div className="text-center space-y-4">
                        <div className="w-24 h-24 rounded-[32px] bg-pulse-purple/10 border border-pulse-purple/20 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(168,85,247,0.15)]">
                          <Zap size={48} className="text-pulse-purple animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">App Governance</h3>
                        <p className="text-white/40 text-[10px] font-display font-bold uppercase tracking-widest leading-relaxed">
                          Control the release cycle and global app configuration. 
                          Publishing an update will trigger an update prompt for all users.
                        </p>
                      </div>

                      <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-10 space-y-8">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-display font-black text-pulse-cyan uppercase tracking-widest mb-1">Local Build Version</p>
                            <p className="text-sm font-mono font-bold text-white uppercase">V{APP_VERSION_NAME} (CODE: {APP_VERSION_CODE})</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-display font-black text-white/30 uppercase tracking-widest mb-1">Cloud Published Version</p>
                            <p className="text-sm font-mono font-bold text-white uppercase">CODE: {systemConfig?.latestVersionCode || '??'}</p>
                          </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
                          <p className="text-[11px] font-display font-bold text-white/60 leading-relaxed italic">
                            "Publishing this update will notify all active players that a new version of Squad UP Arena is available. 
                            This action is immediate across all platforms."
                          </p>
                        </div>

                        <button 
                          onClick={async () => {
                            if (confirm(`ARE YOU SURE? This will publish version code ${APP_VERSION_CODE} to ALL users.`)) {
                              try {
                                await setDoc(doc(db, 'system', 'config'), {
                                  latestVersionCode: APP_VERSION_CODE,
                                  latestVersionName: APP_VERSION_NAME,
                                  publishMessage: "Official Squad UP Arena Update - New Logos & Performance Fixes",
                                  publishedAt: serverTimestamp(),
                                  publishedBy: user?.uid
                                }, { merge: true });
                                alert("PUBLISH SUCCESSFUL! All users will now be prompted to update.");
                              } catch (err) {
                                handleFirestoreError(err, 'write', 'system/config');
                              }
                            }
                          }}
                          disabled={systemConfig?.latestVersionCode === APP_VERSION_CODE}
                          className={`w-full py-6 rounded-2xl font-display font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 ${
                            systemConfig?.latestVersionCode === APP_VERSION_CODE
                            ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                            : 'bg-gradient-to-r from-pulse-cyan to-pulse-purple text-white shadow-2xl shadow-pulse-purple/30 hover:scale-[1.02] active:scale-95'
                          }`}
                        >
                          <Zap size={18} />
                          {systemConfig?.latestVersionCode === APP_VERSION_CODE ? 'App is Latest' : 'Publish This Update'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                            <p className="text-[9px] font-display font-bold text-white/20 uppercase tracking-widest">Active Players</p>
                            <p className="text-2xl font-display font-black text-white">{allUsers.length}</p>
                         </div>
                         <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                            <p className="text-[9px] font-display font-bold text-white/20 uppercase tracking-widest">Live Matches</p>
                            <p className="text-2xl font-display font-black text-white">{tournaments.length}</p>
                         </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
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
                          <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                        ) : (
                          <Shield size={20} className="text-white/20" />
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
                  <div className="text-center py-12">
                    <Shield size={48} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/40 text-sm font-medium">You haven't joined any teams yet.</p>
                  </div>
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
                          src={teamsList.find(t => t.id === selectedTeamId)?.logo} 
                          alt="Logo" 
                          className="w-full h-full object-contain" 
                        />
                      ) : (
                        <Shield size={32} className="text-white/20" />
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
                            alert("Restricted: You must be at least 13 years old to join teams.");
                            return;
                          }
                          if (isRestricted) {
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
                            setSelectedTeamId(null);
                          } catch (err) {
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
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <User size={20} className="text-white/20" />
                              </div>
                            )}
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
                    {viewingUser.avatar ? (
                      <img src={viewingUser.avatar} alt="Logo" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={32} className="text-white/20" />
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-display font-black text-white tracking-tight uppercase leading-none mb-2">
                    {viewingUser.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-pulse-cyan/80">
                    <Shield size={12} className="animate-pulse" />
                    <span className="text-[11px] font-display font-bold uppercase tracking-widest">IGN: {viewingUser.ingameName || 'UNKNOWN'}</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
                  <span className="text-[10px] font-display font-black text-pulse-purple tracking-widest uppercase mb-2 block">ABOUT PLAYER</span>
                  <p className="text-white/60 text-sm leading-relaxed font-medium">
                    {viewingUser.bio || "This player hasn't added a bio yet."}
                  </p>
                </div>

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
                  onClick={() => teamLogoInputRef.current?.click()}
                >
                  <div className="relative w-24 h-24 rounded-[32px] bg-white/5 border-2 border-pulse-purple p-4 shadow-lg transition-transform group-hover:scale-105">
                    {editingTeam.logo ? (
                      <img 
                        src={editingTeam.logo} 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shield size={32} className="text-white/20" />
                      </div>
                    )}
                    <button type="button" className="absolute bottom-0 right-0 w-8 h-8 bg-pulse-purple rounded-full flex items-center justify-center border-2 border-abyssal">
                      <Pencil size={12} className="text-white" />
                    </button>
                  </div>
                  <span className="text-[10px] font-display font-bold text-pulse-cyan uppercase tracking-widest">Change Team Logo</span>
                  <input 
                    type="file"
                    ref={teamLogoInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingTeam(prev => prev ? {...prev, logo: reader.result as string} : null);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />
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
                          logo: editingTeam.logo,
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
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="relative w-20 h-20 rounded-full border-2 border-pulse-purple p-1 transition-transform group-hover:scale-105">
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt="Avatar" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center rounded-full">
                        <User size={30} className="text-white/20" />
                      </div>
                    )}
                    <button type="button" className="absolute bottom-0 right-0 w-6 h-6 bg-pulse-purple rounded-full flex items-center justify-center border-2 border-abyssal">
                      <Pencil size={10} className="text-white" />
                    </button>
                  </div>
                  <span className="text-[10px] font-display font-bold text-pulse-cyan uppercase tracking-widest group-hover:text-white transition-colors">Change Profile Photo</span>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
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
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
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
                        tags: userTags,
                        role: userRole,
                        preferredGame: selectedGame,
                        favoriteGame: selectedGame === 'freefire' ? 'Free Fire' : 'BGMI',
                        matches: Number(userMatches),
                        wins: Number(userWins),
                        kdRatio: Number(userKdRatio),
                        headshotPercentage: Number(userHeadshots),
                        updatedAt: serverTimestamp()
                      });
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

                            const participantRef = doc(collection(db, 'tournament_participants'));
                            transaction.set(participantRef, {
                               tournamentId: selectedTournament.id,
                               userId: user.uid,
                               inGameName: joinInGameName,
                               level: Number(joinLevel),
                               uid: joinUID,
                               joinedAt: serverTimestamp()
                            });
                         });

                         alert("Successfully joined tournament");
                         setIsJoinTournamentModalOpen(false);
                         setJoinInGameName('');
                         setJoinLevel('');
                         setJoinUID('');
                      } catch (err: any) {
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

      {/* Maintenance Mode Overlay */}
      <AnimatePresence>
        {systemConfig?.maintenanceMode && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black">
             <div className="text-center p-8">
                <div className="w-16 h-16 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/30">
                  <ShieldAlert size={32} />
                </div>
                <h2 className="text-xl font-display font-black text-white uppercase tracking-tight mb-2">Under Maintenance</h2>
                <p className="text-[10px] font-display font-bold text-white/40 uppercase tracking-widest leading-loose">
                  We are upgrading our servers.<br/>Please check back in a few minutes.
                </p>
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
