import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Eye, CheckCircle, AlertCircle, ShieldAlert, Sparkles, FileImage, Trophy } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';
import { feedbackService } from '../services/feedbackService';
import imageCompression from 'browser-image-compression';

interface ScreenshotUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (url: string, submissionId: string) => void;
  tournamentId: string;
  tournamentTitle: string;
  userId: string;
  userInGameName: string;
}

export function ScreenshotUploadModal({
  isOpen,
  onClose,
  onUploadSuccess = () => {},
  tournamentId,
  tournamentTitle,
  userId,
  userInGameName,
}: ScreenshotUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Upload States
  const [step, setStep] = useState<'idle' | 'processing' | 'uploading' | 'saving' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Workflow Form States
  const [claimedPosition, setClaimedPosition] = useState<string>('1');
  const [teamName, setTeamName] = useState<string>('');
  const [kills, setKills] = useState<string>('0');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      feedbackService.showWarning("Only image files (JPG, PNG) are allowed.");
      return;
    }
    
    // Set file and local preview URL
    setFile(selectedFile);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      feedbackService.showWarning("Please select a screenshot first.");
      return;
    }

    setStep('processing');
    setProgress(0);
    setError(null);

    try {
      // Step 1: Compress the screenshot with browser-image-compression while keeping readability
      // We target max 1920px dimensions so the final text remains crisp and highly legible for verification
      const compressionConfig = {
        maxSizeMB: 0.6, // Keep file size under 600KB
        maxWidthOrHeight: 1920, // Maintain high resolution for scoreboard text
        useWebWorker: true,
        initialQuality: 0.85
      };

      const compressedFile = await imageCompression(file, compressionConfig);

      setStep('uploading');

      // Step 2: Upload to Firebase Storage securely under 'match_results'
      const storagePath = `match_results/${tournamentId}/${userId}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(pct));
        },
        (err) => {
          console.error("Storage upload failed:", err);
          setError("Storage upload failed. Please try again.");
          setStep('idle');
          feedbackService.showError(err, { fallback: "Failed to upload file to storage." });
        },
        async () => {
          try {
            setStep('saving');
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            // Step 3: Record Submission in Firestore matching the workflow
            const submissionDoc = await addDoc(collection(db, 'match_submissions'), {
              tournamentId,
              tournamentTitle,
              userId,
              userInGameName,
              teamName: teamName.trim() || userInGameName,
              screenshotUrl: downloadUrl,
              storagePath,
              claimedPosition: parseInt(claimedPosition, 10),
              kills: parseInt(kills, 10) || 0,
              additionalNotes: additionalNotes.trim(),
              status: 'pending', // Pending Verification
              submittedAt: serverTimestamp(),
              verifiedBy: null,
              verifiedAt: null,
              rejectionReason: null,
            });

            setStep('done');
            feedbackService.showSuccess("Match screenshot submitted successfully! Awaiting verification.");
            
            // Invoke success callback
            setTimeout(() => {
              onUploadSuccess(downloadUrl, submissionDoc.id);
              onClose();
              // Reset state
              setFile(null);
              setPreviewUrl(null);
              setStep('idle');
              setClaimedPosition('1');
              setTeamName('');
              setKills('0');
              setAdditionalNotes('');
            }, 1000);

          } catch (dbErr: any) {
            console.error("Firestore document write failed:", dbErr);
            setError("Failed to save submission records.");
            setStep('idle');
            feedbackService.showError(dbErr, { fallback: "Failed to save details to database." });
          }
        }
      );

    } catch (compressErr: any) {
      console.error("Image compression failed:", compressErr);
      setError("Image processing failed. Try a different screenshot.");
      setStep('idle');
      feedbackService.showError(compressErr, { fallback: "Error processing the image." });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-abyssal/95 backdrop-blur-xl z-[600] flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="w-full max-w-lg bg-[#0F0F16] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-pulse-purple/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pulse-purple/10 border border-pulse-purple/20 flex items-center justify-center text-pulse-purple">
                <Trophy size={20} />
              </div>
              <div>
                <h3 className="text-base font-display font-black text-white uppercase italic tracking-wide">
                  Claim Your Prize
                </h3>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                  Submit standing screenshot for verification
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={step !== 'idle' && step !== 'done'}
              className="p-2 hover:bg-white/5 rounded-full transition-all text-white/40 hover:text-white disabled:opacity-30"
              id="close_screenshot_upload_modal_btn"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto no-scrollbar">
            {/* Meta Info banner */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/30 uppercase font-black tracking-wider">Tournament</span>
                <span className="text-xs font-display font-black text-pulse-cyan uppercase italic">{tournamentTitle}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/30 uppercase font-black tracking-wider">Leader In-Game ID</span>
                <span className="text-xs font-semibold text-white/80">{userInGameName}</span>
              </div>
            </div>

            {/* Upload Zone */}
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block">
                Overall Standing Screenshot *
              </label>
              
              {!previewUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-pulse-cyan bg-pulse-cyan/5 scale-[0.99]'
                      : 'border-white/10 hover:border-white/20 bg-white/[0.01]'
                  }`}
                  id="screenshot_drag_drop_zone"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-white/40">
                    <Upload size={24} />
                  </div>
                  <p className="text-sm font-medium text-white/80 mb-1">
                    Drag & drop standing screenshot
                  </p>
                  <p className="text-[11px] text-white/40">
                    Supports PNG, JPG up to 10MB (will be compressed to save bandwidth)
                  </p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 group aspect-[16/9]">
                  <img
                    src={previewUrl}
                    alt="Upload Preview"
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Overlay controls */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => window.open(previewUrl, '_blank')}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white/90 flex items-center gap-2 text-xs font-semibold"
                    >
                      <Eye size={16} /> View Full
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                      className="p-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-all text-red-400 flex items-center gap-2 text-xs font-semibold"
                    >
                      <X size={16} /> Change File
                    </button>
                  </div>
                  
                  {/* Badge */}
                  <div className="absolute top-3 left-3 bg-pulse-cyan/95 text-abyssal font-display font-black text-[9px] uppercase px-2 py-1 rounded-lg tracking-wider flex items-center gap-1">
                    <FileImage size={10} /> Ready to upload
                  </div>
                </div>
              )}
            </div>

            {/* Claim details Form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block">
                  Claimed Position *
                </label>
                <select
                  value={claimedPosition}
                  onChange={(e) => setClaimedPosition(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-pulse-purple/50 transition-all appearance-none cursor-pointer"
                  id="screenshot_claimed_position_select"
                >
                  <option value="1" className="bg-[#0F0F16]">1st Place (Winner)</option>
                  <option value="2" className="bg-[#0F0F16]">2nd Place</option>
                  <option value="3" className="bg-[#0F0F16]">3rd Place</option>
                  <option value="4" className="bg-[#0F0F16]">4th Place</option>
                  <option value="5" className="bg-[#0F0F16]">5th Place</option>
                  <option value="6" className="bg-[#0F0F16]">6th - 10th Place</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block">
                  Match Kills
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 12"
                  value={kills}
                  onChange={(e) => setKills(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-pulse-purple/50 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block">
                  Team Name (Leave empty for In-Game ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alpha Squad"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/10 outline-none focus:border-pulse-purple/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block">
                  Additional Notes
                </label>
                <textarea
                  placeholder="Any extra info for the matches verification..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/10 outline-none focus:border-pulse-purple/50 transition-all resize-none"
                />
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Loading Steps / Progress bar */}
            {step !== 'idle' && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {step === 'processing' && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pulse-purple opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-pulse-purple"></span>
                      </span>
                    )}
                    <span className="font-semibold uppercase tracking-wider text-[10px] text-white/50">
                      {step === 'processing' && 'Compressing Image...'}
                      {step === 'uploading' && 'Uploading Standing Screenshot...'}
                      {step === 'saving' && 'Saving Verification Record...'}
                      {step === 'done' && 'Upload Complete!'}
                    </span>
                  </div>
                  <span className="font-mono text-pulse-cyan">{progress}%</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-pulse-cyan to-pulse-purple h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="p-6 border-t border-white/5 bg-black/20 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={step !== 'idle' && step !== 'done'}
              className="flex-1 py-3.5 rounded-xl border border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-all text-xs font-display font-black uppercase tracking-widest disabled:opacity-30"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || step !== 'idle'}
              className={`flex-[2] py-3.5 rounded-xl font-display font-black text-xs uppercase tracking-widest transition-all ${
                file && step === 'idle'
                  ? 'bg-pulse-purple text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-95'
                  : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
              }`}
            >
              Submit Standing
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
