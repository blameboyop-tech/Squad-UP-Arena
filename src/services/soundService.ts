export type SoundCategory =
  | 'click'
  | 'success'
  | 'notification'
  | 'warning'
  | 'error'
  | 'achievement'
  | 'celebration'
  | 'ambient';

class SoundService {
  private audioCtx: AudioContext | null = null;
  private enabled: boolean = true;
  private masterVolume: number = 1.0;
  private categoryVolumes: Record<SoundCategory, number> = {
    click: 0.6,
    success: 0.8,
    notification: 0.7,
    warning: 0.6,
    error: 0.7,
    achievement: 0.9,
    celebration: 0.9,
    ambient: 0.5,
  };

  private audioCache: Record<string, HTMLAudioElement> = {};
  private lastPlayTime: Record<string, number> = {};
  
  // Specific category cooldown limits (in ms) to prevent overlapping audio spam
  private minIntervals: Record<SoundCategory, number> = {
    click: 120,
    success: 250,
    notification: 250,
    warning: 250,
    error: 250,
    achievement: 400,
    celebration: 500,
    ambient: 150,
  };

  constructor() {
    this.enabled = localStorage.getItem('sound_effects_enabled') !== 'false';
    
    // Load volume settings if they exist
    const savedMasterVol = localStorage.getItem('sound_master_volume');
    if (savedMasterVol !== null) {
      this.masterVolume = Math.max(0, Math.min(1, parseFloat(savedMasterVol)));
    }
    
    const savedCategoryVols = localStorage.getItem('sound_category_volumes');
    if (savedCategoryVols !== null) {
      try {
        const parsed = JSON.parse(savedCategoryVols);
        Object.keys(this.categoryVolumes).forEach((cat) => {
          if (typeof parsed[cat] === 'number') {
            this.categoryVolumes[cat as SoundCategory] = Math.max(0, Math.min(1, parsed[cat]));
          }
        });
      } catch (e) {
        console.warn('Failed to parse sound category volumes:', e);
      }
    }

    // Preload audio assets if in a browser environment
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      const soundAssets: Record<SoundCategory, string> = {
        click: '/sounds/click.mp3',
        success: '/sounds/success.mp3',
        notification: '/sounds/notification.mp3',
        warning: '/sounds/warning.mp3',
        error: '/sounds/error.mp3',
        achievement: '/sounds/achievement.mp3',
        celebration: '/sounds/celebration.mp3',
        ambient: '/sounds/ambient.mp3',
      };

      Object.entries(soundAssets).forEach(([category, url]) => {
        try {
          const audio = new Audio(url);
          audio.preload = 'auto';
          this.audioCache[category] = audio;
        } catch (e) {
          console.warn(`Failed to preload audio asset for ${category}:`, e);
        }
      });
    }
  }

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('sound_effects_enabled', enabled.toString());
  }

  isEnabled() {
    return this.enabled;
  }

  // Master Volume settings
  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('sound_master_volume', this.masterVolume.toString());
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  // Category specific volumes
  setCategoryVolume(category: SoundCategory, volume: number) {
    this.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
    localStorage.setItem('sound_category_volumes', JSON.stringify(this.categoryVolumes));
  }

  getCategoryVolume(category: SoundCategory): number {
    return this.categoryVolumes[category] ?? 0.8;
  }

  getEffectiveVolume(category: SoundCategory): number {
    return this.masterVolume * this.getCategoryVolume(category);
  }

  private shouldThrottle(category: SoundCategory): boolean {
    const now = Date.now();
    const last = this.lastPlayTime[category] || 0;
    const interval = this.minIntervals[category] || 150;
    
    if (now - last < interval) {
      return true;
    }
    this.lastPlayTime[category] = now;
    return false;
  }

  playSound(category: SoundCategory) {
    if (!this.enabled || this.masterVolume <= 0 || this.getCategoryVolume(category) <= 0) return;

    if (this.shouldThrottle(category)) {
      return;
    }

    const audio = this.audioCache[category];
    const volume = this.getEffectiveVolume(category);

    if (audio) {
      try {
        audio.volume = volume;
        audio.currentTime = 0;
        audio.play()
          .catch(() => {
            // Playback failed or asset missing, fall back to synthesized Web Audio sound
            this.playSynth(category, volume);
          });
      } catch (e) {
        this.playSynth(category, volume);
      }
    } else {
      this.playSynth(category, volume);
    }
  }

  private playSynth(category: SoundCategory, volume: number) {
    try {
      this.initContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      switch (category) {
        case 'click':
          this.playClickSynth(now, volume);
          break;
        case 'success':
          this.playSuccessSynth(now, volume);
          break;
        case 'notification':
          this.playNotificationSynth(now, volume);
          break;
        case 'warning':
          this.playWarningSynth(now, volume);
          break;
        case 'error':
          this.playErrorSynth(now, volume);
          break;
        case 'achievement':
          this.playAchievementSynth(now, volume);
          break;
        case 'celebration':
          this.playCelebrationSynth(now, volume);
          break;
        case 'ambient':
          this.playAmbientSynth(now, volume);
          break;
      }
    } catch (e) {
      console.warn('Audio synthesis failed, continuing gracefully:', e);
    }
  }

  private playClickSynth(now: number, volume: number) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.05);

    gain.gain.setValueAtTime(volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(now + 0.05);
  }

  private playSuccessSynth(now: number, volume: number) {
    if (!this.audioCtx) return;
    // Ascending major third/fifth arpeggio (C5 -> E5 -> G5)
    const notes = [523.25, 659.25, 783.99]; 
    notes.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(volume * 0.08, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.22);
    });
  }

  private playNotificationSynth(now: number, volume: number) {
    if (!this.audioCtx) return;
    // Beautiful clean high-pitched chime (E6 then A5)
    const notes = [1318.51, 880.00]; 
    const timing = [0, 0.08];
    notes.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + timing[i]);

      gain.gain.setValueAtTime(volume * 0.08, now + timing[i]);
      gain.gain.exponentialRampToValueAtTime(0.001, now + timing[i] + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(now + timing[i]);
      osc.stop(now + timing[i] + 0.35);
    });
  }

  private playWarningSynth(now: number, volume: number) {
    if (!this.audioCtx) return;
    // Dual pulse triangle wave detuned warm alert
    const notes = [330, 330];
    notes.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);

      gain.gain.setValueAtTime(volume * 0.06, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.12);

      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.12);
    });
  }

  private playErrorSynth(now: number, volume: number) {
    if (!this.audioCtx) return;
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    // Dissonant interval (160Hz and 165Hz) with a fast low pass filter
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.linearRampToValueAtTime(100, now + 0.22);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(165, now);
    osc2.frequency.linearRampToValueAtTime(105, now + 0.22);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    gain.gain.setValueAtTime(volume * 0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(now + 0.22);
    osc2.stop(now + 0.22);
  }

  private playAchievementSynth(now: number, volume: number) {
    if (!this.audioCtx) return;
    // Rising Major 7th/9th arpeggio (C4 -> G4 -> C5 -> E5 -> B5)
    const notes = [261.63, 392.00, 523.25, 659.25, 987.77];
    notes.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(volume * 0.07, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.45);
    });
  }

  private playCelebrationSynth(now: number, volume: number) {
    if (!this.audioCtx) return;
    // Beautiful cascade of random sparkling digital chimes (8 micro-notes over 1.2s)
    for (let i = 0; i < 9; i++) {
      const freq = 1100 + Math.random() * 1200;
      const playTime = now + i * 0.08;
      const duration = 0.22;
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, playTime);

      gain.gain.setValueAtTime(volume * 0.04, playTime);
      gain.gain.exponentialRampToValueAtTime(0.001, playTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(playTime);
      osc.stop(playTime + duration);
    }
  }

  private playAmbientSynth(now: number, volume: number) {
    if (!this.audioCtx) return;
    // Cozy low-frequency swell (warm 140Hz sine wave)
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.3);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(now + 0.3);
  }

  // --- Core API Sound Playback Methods ---

  playClick() {
    this.playSound('click');
  }

  playSuccess() {
    this.playSound('success');
  }

  playNotification() {
    this.playSound('notification');
  }

  playWarning() {
    this.playSound('warning');
  }

  playError() {
    this.playSound('error');
  }

  playAchievement() {
    this.playSound('achievement');
  }

  playCelebration() {
    this.playSound('celebration');
  }

  playAmbient() {
    this.playSound('ambient');
  }

  // --- Legacy Compatibility Methods ---

  playNavigation() {
    this.playSound('click');
  }

  playMessageSent() {
    this.playSound('notification');
  }

  playMessageReceived() {
    this.playSound('notification');
  }
}

export const soundService = new SoundService();
