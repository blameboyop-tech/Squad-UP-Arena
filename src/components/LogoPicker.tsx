import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Check, Coins, Gem, Sparkles, Shield, Upload, FileImage, Image as ImageIcon, CheckCircle, ArrowRight } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { db, handleFirestoreError, storage } from '../lib/firebase';
import { feedbackService } from '../services/feedbackService';
import { DEFAULT_AVATARS, DEFAULT_TEAM_LOGOS, resolveAvatar, resolveTeamLogo } from '../lib/defaultAssets';

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

interface LogoPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (urlOrId: string) => void;
  userCoins: number;
  userPinkDiamonds: number;
  userBlueDiamonds: number;
  purchasedLogos: string[];
  userId: string;
  currentLogoUrl?: string;
  logoTarget?: 'profile' | 'team';
}

export function LogoPicker({ 
  isOpen, 
  onClose, 
  onSelect, 
  userCoins, 
  userPinkDiamonds, 
  userBlueDiamonds,
  purchasedLogos,
  userId,
  currentLogoUrl,
  logoTarget = 'profile'
}: LogoPickerProps) {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [activeTab, setActiveTab] = useState<'built-in' | 'vault' | 'upload'>('built-in');
  const [vaultLoading, setVaultLoading] = useState(true);
  const [selectedLogoForPurchase, setSelectedLogoForPurchase] = useState<Logo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  // Custom upload state
  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected built-in state
  const [previewSelection, setPreviewSelection] = useState<string>(currentLogoUrl || '');

  useEffect(() => {
    if (currentLogoUrl) {
      setPreviewSelection(currentLogoUrl);
    }
  }, [currentLogoUrl, isOpen]);

  // Load premium vault logos
  useEffect(() => {
    if (!isOpen || activeTab !== 'vault') return;

    setVaultLoading(true);
    const q = query(collection(db, 'logos'), where('isActive', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const logosData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Logo));
      setLogos(logosData);
      setVaultLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', 'logos');
      setVaultLoading(false);
    });

    return () => unsub();
  }, [isOpen, activeTab]);

  // Purchase handler
  const handlePurchase = async (logo: Logo) => {
    if (!userId) {
      feedbackService.showError("You must be logged in to make a purchase.");
      return;
    }
    if (purchasedLogos.includes(logo.id)) {
      feedbackService.showWarning("You already own this emblem.");
      return;
    }

    setIsPurchasing(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User profile not found");
        
        const userData = userSnap.data();
        
        const currencyMap: Record<string, string> = {
          gold: 'coins',
          pink: 'pinkDiamonds',
          blue: 'blueDiamonds'
        };
        
        const currencyKey = currencyMap[logo.currencyType] || 'coins';
        const price = logo.priceAmount || 0;
        
        if ((userData[currencyKey] || 0) < price) {
          throw new Error(`Insufficient ${logo.currencyType.charAt(0).toUpperCase() + logo.currencyType.slice(1)}`);
        }
        
        transaction.update(userRef, {
          [currencyKey]: (userData[currencyKey] || 0) - price,
          purchasedLogos: [...(userData.purchasedLogos || []), logo.id],
          updatedAt: serverTimestamp()
        });
      });
      
      setSelectedLogoForPurchase(null);
      feedbackService.showSuccess("Transaction success! Emblem unlocked.");
      onSelect(logo.imageUrl);
    } catch (err: any) {
      console.error("Purchase error:", err);
      feedbackService.showError(err, { fallback: "Financial transaction failed." });
    } finally {
      setIsPurchasing(false);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    if (!file.type.startsWith('image/')) {
      feedbackService.showError("Invalid file type. Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      feedbackService.showError("File is too large. Max size is 5MB.");
      return;
    }

    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Custom Upload logic
  const handleCustomUpload = async () => {
    if (!uploadFile || !userId) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Compress image
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(uploadFile, options);

      // 2. Storage reference
      const extension = uploadFile.name.split('.').pop() || 'png';
      const folder = logoTarget === 'profile' ? 'avatars' : 'team_logos';
      const filename = `${Date.now()}_custom.${extension}`;
      const storageRef = ref(storage, `users/${userId}/${folder}/${filename}`);

      // 3. Upload task
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Upload error:", error);
          feedbackService.showError("Image upload failed. Please try again.");
          setIsUploading(false);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setIsUploading(false);
          setUploadFile(null);
          setUploadPreview(null);
          feedbackService.showSuccess("Custom asset applied successfully!");
          onSelect(downloadUrl);
        }
      );
    } catch (err) {
      console.error("Compression / Upload failed:", err);
      feedbackService.showError("Failed to process image.");
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  const currentLibrary = logoTarget === 'profile' ? DEFAULT_AVATARS : DEFAULT_TEAM_LOGOS;
  const currentResolver = logoTarget === 'profile' ? resolveAvatar : resolveTeamLogo;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-abyssal/95 backdrop-blur-md z-[500] flex items-end sm:items-center justify-center"
      >
        {/* Backdrop dismiss */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Bottom Sheet / Modal */}
        <motion.div 
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="relative w-full sm:max-w-xl bg-[#090a21] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh] sm:max-h-[680px]"
        >
          {/* Top Handle for mobile Bottom Sheet aesthetic */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

          {/* Header */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-pulse-purple/10 to-pulse-cyan/10">
            <div>
              <h3 className="text-lg font-display font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                <Shield size={18} className="text-pulse-cyan" />
                {logoTarget === 'profile' ? 'Avatar Vault' : 'Team Emblem Library'}
              </h3>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                {logoTarget === 'profile' ? 'Forge your ultimate identity' : 'Crest of the Champion Squad'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Identity Live Preview Banner */}
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full border border-white/10 overflow-hidden flex items-center justify-center bg-black/40 p-1">
                <img 
                  src={currentResolver(currentLogoUrl)} 
                  alt="Current" 
                  className="w-full h-full object-contain rounded-full" 
                />
              </div>
              <div className="text-left">
                <p className="text-[8px] font-display font-bold text-white/40 uppercase tracking-widest">Equipped Armor</p>
                <p className="text-xs font-display font-black text-white uppercase tracking-tight truncate max-w-[120px]">
                  {currentLogoUrl && currentLogoUrl.startsWith('data:') ? 'Custom Built-in' : 'Active Emblem'}
                </p>
              </div>
            </div>

            <div className="flex items-center text-white/20">
              <ArrowRight size={16} />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full border border-pulse-cyan overflow-hidden flex items-center justify-center bg-black/40 p-1 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                <img 
                  src={currentResolver(previewSelection)} 
                  alt="Preview" 
                  className="w-full h-full object-contain rounded-full" 
                />
              </div>
              <div className="text-left">
                <p className="text-[8px] font-display font-bold text-pulse-cyan uppercase tracking-widest">Selected Draft</p>
                <p className="text-xs font-display font-black text-pulse-cyan uppercase tracking-tight truncate max-w-[120px]">
                  {previewSelection ? 'New Choice' : 'None Selected'}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4">
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
              <button
                onClick={() => setActiveTab('built-in')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-display font-black uppercase tracking-widest transition-all ${
                  activeTab === 'built-in' 
                    ? 'bg-pulse-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                Built-in Assets
              </button>
              <button
                onClick={() => setActiveTab('vault')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-display font-black uppercase tracking-widest transition-all ${
                  activeTab === 'vault' 
                    ? 'bg-pulse-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                Emblem Vault
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-display font-black uppercase tracking-widest transition-all ${
                  activeTab === 'upload' 
                    ? 'bg-pulse-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                Upload Custom
              </button>
            </div>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar min-h-[300px]">
            {/* 1. Built-in Icons Grid */}
            {activeTab === 'built-in' && (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-4">
                {currentLibrary.map((asset) => {
                  const isSelected = previewSelection === asset.id || previewSelection === asset.url;
                  return (
                    <motion.button
                      key={asset.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPreviewSelection(asset.id)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 p-1 bg-black/20 transition-all ${
                        isSelected 
                          ? 'border-pulse-cyan ring-4 ring-pulse-cyan/15 bg-pulse-cyan/5 shadow-lg shadow-pulse-cyan/10' 
                          : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      <img 
                        src={asset.url} 
                        alt={asset.name} 
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-pulse-cyan rounded-full flex items-center justify-center border border-black shadow">
                          <Check size={10} className="text-black font-bold" />
                        </div>
                      )}
                      <div className="absolute bottom-1 inset-x-1 text-center bg-black/60 backdrop-blur-[2px] py-0.5 rounded-md">
                        <p className="text-[7px] font-display font-black uppercase text-white/80 tracking-tighter truncate px-0.5">{asset.name}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* 2. Premium Emblem Vault (Firestore stored logos) */}
            {activeTab === 'vault' && (
              <div>
                {vaultLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-white/20 italic">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                      <Shield size={28} />
                    </motion.div>
                    <p className="mt-3 text-[9px] uppercase tracking-widest font-display font-black">Decrypting Vault...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {logos.map((logo) => {
                      const isPurchased = purchasedLogos.includes(logo.id);
                      const isUnlocked = !logo.isPremium || isPurchased;
                      const isSelected = previewSelection === logo.imageUrl;

                      return (
                        <motion.button
                          key={logo.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (isUnlocked) {
                              setPreviewSelection(logo.imageUrl);
                            } else {
                              setSelectedLogoForPurchase(logo);
                            }
                          }}
                          className={`relative aspect-square rounded-2xl overflow-hidden border-2 p-1 bg-black/20 transition-all ${
                            isSelected 
                              ? 'border-pulse-cyan ring-4 ring-pulse-cyan/15 shadow-lg shadow-pulse-cyan/10' 
                              : isUnlocked 
                                ? 'border-white/10 hover:border-white/20' 
                                : 'border-white/5 opacity-80 filter grayscale-[0.3]'
                          }`}
                        >
                          <img 
                            src={logo.imageUrl} 
                            alt={logo.name} 
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                          
                          {!isUnlocked && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-abyssal/75 backdrop-blur-[1px]">
                              <Lock size={14} className="text-white/75 mb-1.5" />
                              <div className="flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded border border-white/10">
                                {logo.currencyType === 'gold' && <Coins size={10} className="text-yellow-500" />}
                                {logo.currencyType === 'pink' && <Gem size={10} className="text-pulse-purple" />}
                                {logo.currencyType === 'blue' && <Sparkles size={10} className="text-pulse-cyan" />}
                                <span className="text-[9px] font-mono font-black text-white">{logo.priceAmount}</span>
                              </div>
                            </div>
                          )}

                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-pulse-cyan rounded-full flex items-center justify-center border border-black shadow">
                              <Check size={10} className="text-black font-bold" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}

                    {logos.length === 0 && (
                      <div className="col-span-3 flex flex-col items-center justify-center py-16 text-white/25">
                        <Shield size={36} className="mb-2 opacity-50" />
                        <p className="text-[10px] font-display font-black uppercase tracking-widest text-center">No Premium emblems currently in stock</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Drag-and-Drop Gallery Upload */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {!uploadPreview ? (
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                      dragActive 
                        ? 'border-pulse-cyan bg-pulse-cyan/5' 
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                      <Upload size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-display font-black text-white uppercase tracking-wider mb-0.5">Drag & Drop Image</p>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">or click to browse gallery</p>
                    </div>
                    <p className="text-[8px] text-white/25 font-bold uppercase tracking-tighter">Supports JPG, PNG, WEBP (Max 5MB)</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-4">
                    <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-white/10 bg-black/40 p-2">
                      <img src={uploadPreview} alt="Upload Preview" className="w-full h-full object-contain rounded-xl" />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadPreview(null);
                          setUploadFile(null);
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg border border-black hover:bg-red-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="text-center">
                      <p className="text-xs font-display font-black text-white uppercase tracking-tight">{uploadFile?.name}</p>
                      <p className="text-[9px] text-white/40 font-mono">{(uploadFile!.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>

                    {isUploading ? (
                      <div className="w-full space-y-2">
                        <div className="flex justify-between text-[9px] font-display font-black text-pulse-cyan uppercase tracking-wider">
                          <span>Uploading Identity Armor</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-pulse-cyan to-pulse-purple"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleCustomUpload}
                        className="w-full py-3 bg-gradient-to-r from-pulse-cyan to-pulse-purple rounded-xl text-abyssal font-display font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={14} />
                        Upload & Apply Custom
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="p-6 border-t border-white/5 bg-black/40 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-white/10 rounded-xl text-white/60 font-display font-black text-[10px] uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all"
            >
              Discard Changes
            </button>
            <button
              onClick={() => {
                if (previewSelection) {
                  onSelect(previewSelection);
                }
              }}
              disabled={!previewSelection || activeTab === 'upload'}
              className="flex-1 py-3 bg-gradient-to-r from-pulse-cyan to-pulse-purple text-abyssal rounded-xl font-display font-black text-[10px] uppercase tracking-[0.15em] hover:opacity-90 disabled:opacity-30 active:scale-95 transition-all shadow-[0_0_20px_rgba(34,211,238,0.15)]"
            >
              Apply Selected Emblem
            </button>
          </div>
        </motion.div>

        {/* Purchase Confirmation Overlay */}
        <AnimatePresence>
          {selectedLogoForPurchase && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-abyssal/95 backdrop-blur-xl z-[510] flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-xs"
              >
                <div className="relative mx-auto mb-8">
                  <div className="absolute inset-0 bg-pulse-cyan/20 blur-3xl rounded-full" />
                  <div className="relative w-32 h-32 mx-auto rounded-3xl overflow-hidden border-2 border-pulse-cyan shadow-2xl shadow-pulse-cyan/40 p-2 bg-black/40 flex items-center justify-center">
                    <img src={selectedLogoForPurchase.imageUrl} className="w-full h-full object-contain rounded-2xl" />
                  </div>
                </div>

                <h4 className="text-2xl font-display font-black text-white uppercase italic mb-2 tracking-tight">
                  {selectedLogoForPurchase.name}
                </h4>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black mb-10">Premium Armor Unlock</p>
                
                <div className="space-y-4 mb-10">
                  <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">Required Tokens</span>
                  <div className="flex items-center justify-center gap-3 bg-white/5 px-8 py-4 rounded-3xl border border-white/5 shadow-inner backdrop-blur-sm">
                    {selectedLogoForPurchase.currencyType === 'gold' && <Coins size={20} className="text-yellow-500" />}
                    {selectedLogoForPurchase.currencyType === 'pink' && <Gem size={20} className="text-pulse-purple" />}
                    {selectedLogoForPurchase.currencyType === 'blue' && <Sparkles size={20} className="text-pulse-cyan" />}
                    <span className="text-3xl font-mono font-black text-white tracking-tighter shadow-sm">
                      {selectedLogoForPurchase.priceAmount}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePurchase(selectedLogoForPurchase)}
                    disabled={isPurchasing}
                    className="w-full py-4 bg-gradient-to-r from-pulse-cyan to-pulse-purple rounded-2xl text-abyssal font-display font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(34,211,238,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPurchasing ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                          <Shield size={14} />
                        </motion.div>
                        Authorizing...
                      </>
                    ) : 'Unlock Now'}
                  </motion.button>
                  <button 
                    onClick={() => setSelectedLogoForPurchase(null)}
                    disabled={isPurchasing}
                    className="w-full py-2 text-white/20 font-display font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Cancel Transaction
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
