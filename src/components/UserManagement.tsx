import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Shield, Check, AlertCircle, User, Mail, ChevronRight, 
  RotateCw, ChevronDown, CheckCircle2, ShieldAlert, X, AlertTriangle, KeyRound
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  orderBy, 
  startAfter, 
  doc, 
  getDoc,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  resolveUserRole, 
  isSuperAdmin, 
  changeUserRole, 
  UserRole 
} from '../services/roleService';

interface UserData {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  numericId?: number;
}

interface UserManagementProps {
  onBack: () => void;
}

export function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Pagination
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_LIMIT = 12;

  // Role editing & Confirmation
  const [confirmingUser, setConfirmingUser] = useState<UserData | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<'user' | 'moderator' | 'admin' | 'verified_organizer' | 'organizer' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Debounce search query to prevent excessive reads
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial load and search trigger
  useEffect(() => {
    fetchUsers(true);
  }, [debouncedQuery]);

  const fetchUsers = async (isInitial = false) => {
    if (loading || (!isInitial && loadingMore)) return;

    if (isInitial) {
      setLoading(true);
      setLastDoc(null);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const usersRef = collection(db, 'users');
      let mergedUsers: UserData[] = [];
      let nextLastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
      let checkHasMore = false;

      const trimmedQuery = debouncedQuery.trim();

      if (trimmedQuery) {
        // Query by exact/prefix email or name
        // Firestore startAt prefix query technique
        const qEmail = query(
          usersRef,
          where('email', '>=', trimmedQuery),
          where('email', '<=', trimmedQuery + '\uf8ff'),
          limit(PAGE_LIMIT)
        );

        const qName = query(
          usersRef,
          where('name', '>=', trimmedQuery),
          where('name', '<=', trimmedQuery + '\uf8ff'),
          limit(PAGE_LIMIT)
        );

        const [snapEmail, snapName] = await Promise.all([
          getDocs(qEmail),
          getDocs(qName)
        ]);

        const mapDoc = (docSnap: any) => ({
          id: docSnap.id,
          ...docSnap.data()
        } as UserData);

        const emailResults = snapEmail.docs.map(mapDoc);
        const nameResults = snapName.docs.map(mapDoc);

        // Merge and remove duplicates
        const map = new Map<string, UserData>();
        emailResults.forEach(u => map.set(u.id, u));
        nameResults.forEach(u => map.set(u.id, u));
        
        mergedUsers = Array.from(map.values())
          .filter(u => u.name && u.email); // filter valid profiles only

        // For search queries, we disable pagination to avoid index/cohesion issues
        checkHasMore = false;
      } else {
        // Standard paginated fetch ordered by updatedAt (or fallback to doc ID)
        let q = query(
          usersRef,
          limit(PAGE_LIMIT)
        );

        if (!isInitial && lastDoc) {
          q = query(
            usersRef,
            startAfter(lastDoc),
            limit(PAGE_LIMIT)
          );
        }

        const snap = await getDocs(q);
        
        mergedUsers = snap.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as UserData));

        if (snap.docs.length > 0) {
          nextLastDoc = snap.docs[snap.docs.length - 1];
        }
        checkHasMore = snap.docs.length === PAGE_LIMIT;
      }

      if (isInitial) {
        setUsers(mergedUsers);
      } else {
        setUsers(prev => {
          const map = new Map<string, UserData>();
          prev.forEach(u => map.set(u.id, u));
          mergedUsers.forEach(u => map.set(u.id, u));
          return Array.from(map.values());
        });
      }

      setLastDoc(nextLastDoc);
      setHasMore(checkHasMore);

    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err?.message || 'Failed to fetch users. Check your connection or administrative permissions.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleRoleChangeSelect = (user: UserData, newRole: 'user' | 'moderator' | 'admin' | 'verified_organizer' | 'organizer') => {
    const currentResolved = resolveUserRole(user.email, user.role);
    if (currentResolved === newRole) return; // No change
    setConfirmingUser(user);
    setSelectedNewRole(newRole);
  };

  const executeRoleChange = async () => {
    if (!confirmingUser || !selectedNewRole) return;
    setIsUpdating(true);
    setError(null);

    try {
      await changeUserRole(confirmingUser.id, selectedNewRole);
      
      // Update local state immediately for instant feedback
      setUsers(prev => prev.map(u => {
        if (u.id === confirmingUser.id) {
          return { ...u, role: selectedNewRole };
        }
        return u;
      }));

      setSuccessMessage(`Successfully updated role of "${confirmingUser.name}" to ${selectedNewRole.toUpperCase()}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setConfirmingUser(null);
      setSelectedNewRole(null);
    } catch (err: any) {
      console.error('Error changing role:', err);
      setError(err?.message || 'Failed to update user role.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#08091d] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0b25]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 transition-all border border-white/5 group"
          >
            <X size={16} className="group-hover:scale-110 transition-transform" />
          </button>
          <div>
            <h2 className="text-base font-display font-black text-white tracking-tight uppercase italic leading-none">User Roles</h2>
            <p className="text-[7px] font-display font-medium text-pulse-purple uppercase tracking-[0.2em] mt-0.5">Super Admin Dashboard</p>
          </div>
        </div>
        
        <button 
          onClick={() => fetchUsers(true)}
          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all border border-white/5"
          title="Refresh List"
        >
          <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 py-3">
        {/* Search Bar */}
        <div className="relative mb-3.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
          <input 
            type="text"
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-xs placeholder-white/20 outline-none focus:border-pulse-purple/50 transition-all font-display"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-[10px] font-bold"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Success Banner */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5"
            >
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[10px] font-display font-semibold text-emerald-300 leading-relaxed">{successMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5"
            >
              <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[10px] font-display font-semibold text-red-300 leading-relaxed">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Users Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1 -mr-1 pb-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-pulse-purple border-t-transparent animate-spin" />
              <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-widest animate-pulse">Retrieving Profiles...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 mb-3">
                <User size={20} />
              </div>
              <p className="text-xs font-display font-bold text-white/50">No users found</p>
              <p className="text-[9px] font-display text-white/30 mt-1">Try broadening your search term</p>
            </div>
          ) : (
            <>
              {users.map((targetUser) => {
                const resolvedRole = resolveUserRole(targetUser.email, targetUser.role);
                const isProtected = isSuperAdmin(targetUser.email);
                
                return (
                  <div 
                    key={targetUser.id} 
                    className="relative bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 hover:bg-white/[0.04] transition-all flex flex-col gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 relative">
                        <img 
                          src={targetUser.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=" + targetUser.id} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-display font-black text-white truncate">{targetUser.name || 'Anonymous User'}</h4>
                          {targetUser.numericId && (
                            <span className="text-[7px] font-mono font-black text-white/30 bg-white/5 px-1 rounded">
                              #{targetUser.numericId}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-mono text-white/40 truncate mt-0.5">{targetUser.email}</p>
                        <p className="text-[8px] font-mono text-white/20 truncate mt-0.5 select-all">UID: {targetUser.id}</p>
                      </div>
                    </div>

                    {/* Role Control Panel */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        <KeyRound size={10} className="text-pulse-purple" />
                        <span className="text-[9px] font-display font-bold text-white/40 uppercase tracking-wider">Security Access</span>
                      </div>

                      {isProtected ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <Shield size={10} className="text-amber-400 animate-pulse" />
                          <span className="text-[8px] font-display font-black text-amber-400 uppercase tracking-widest">
                            Super Admin (Protected)
                          </span>
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={resolvedRole}
                            onChange={(e) => handleRoleChangeSelect(targetUser, e.target.value as any)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-[9px] font-display font-black uppercase text-pulse-purple focus:border-pulse-purple/50 outline-none cursor-pointer appearance-none pr-6 hover:bg-white/10 transition-colors"
                          >
                            <option value="user" className="bg-[#0a0b25] text-white">PLAYER</option>
                            <option value="organizer" className="bg-[#0a0b25] text-[#ec4899]">ORGANIZER</option>
                            <option value="verified_organizer" className="bg-[#0a0b25] text-[#10b981]">VERIFIED ORGANIZER</option>
                            <option value="moderator" className="bg-[#0a0b25] text-[#3b82f6]">MODERATOR</option>
                            <option value="admin" className="bg-[#0a0b25] text-[#a855f7]">ADMIN</option>
                          </select>
                          <ChevronDown size={8} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              {hasMore && !debouncedQuery.trim() && (
                <div className="pt-3 pb-8 text-center">
                  <button 
                    onClick={() => fetchUsers(false)}
                    disabled={loadingMore}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-display font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {loadingMore ? 'Retrieving Next Page...' : 'Load More Accounts'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmingUser && selectedNewRole && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isUpdating) {
                  setConfirmingUser(null);
                  setSelectedNewRole(null);
                }
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0a0b25] border border-white/10 rounded-3xl p-6 overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-pulse-purple to-pulse-cyan" />
              
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-display font-black text-white uppercase tracking-tight">Confirm Authorization Change</h3>
                  <p className="text-white/40 text-[10px] mt-1 font-medium leading-relaxed">
                    You are changing the security authorization role of <span className="text-white font-semibold">"{confirmingUser.name}"</span> to <span className="text-pulse-purple font-black">{selectedNewRole.toUpperCase()}</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-2 bg-white/5 border border-white/5 rounded-2xl p-4.5 mb-5 text-[10px] font-display text-white/50 leading-relaxed">
                <p>This action will grant or revoke internal platform administrative powers, which allows the target account to perform corresponding operations.</p>
              </div>

              <div className="flex gap-3">
                <button 
                  disabled={isUpdating}
                  onClick={() => {
                    setConfirmingUser(null);
                    setSelectedNewRole(null);
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-display font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={isUpdating}
                  onClick={executeRoleChange}
                  className="flex-1 py-3 bg-gradient-to-r from-pulse-purple to-pulse-cyan text-white rounded-xl font-display font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-pulse-purple/20"
                >
                  {isUpdating ? 'Updating...' : 'Authorize'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
