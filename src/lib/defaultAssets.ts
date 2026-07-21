// Default local SVG assets for Profile Avatars and Team Logos
// Color Palette strictly adheres to: Blue, Purple, Orange, Red, White, Black, Gray
// Hand-crafted, modern flat vector design, 100% lightweight and instant loading.

export interface DefaultAsset {
  id: string;
  name: string;
  category: string;
  url: string;
}

// Convert a raw SVG string into a valid, safe base64 Data URI
const svgToDataUri = (svgString: string): string => {
  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
};

// --- PROFILE AVATARS (12 pieces) ---

const HOODED_PLAYER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#1e1b4b"/>
  <!-- Hood background -->
  <path d="M50 15 C25 20 20 45 20 75 C20 82 25 85 50 85 C75 85 80 82 80 75 C80 45 75 20 50 15 Z" fill="#312e81"/>
  <!-- Hood inner shade -->
  <path d="M50 20 C32 25 28 45 28 72 C35 70 42 68 50 68 C58 68 65 70 72 72 C72 45 68 25 50 20 Z" fill="#111827"/>
  <!-- Face/mask plate -->
  <path d="M50 35 C42 35 38 42 38 52 C38 64 45 66 50 66 C55 66 62 64 62 52 C62 42 58 35 50 35 Z" fill="#4b5563"/>
  <!-- Cyber visor -->
  <path d="M42 48 L58 48 C59 48 59 51 58 52 L56 55 L44 55 L42 52 C41 51 41 48 42 48 Z" fill="#3b82f6"/>
</svg>
`;

const ANONYMOUS_MASK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#111827"/>
  <!-- Mask face shadow -->
  <ellipse cx="50" cy="50" rx="30" ry="34" fill="#1f2937"/>
  <!-- Mask details -->
  <path d="M30 45 L70 45 L65 75 L50 82 L35 75 Z" fill="#e5e7eb"/>
  <!-- Eyes cutouts -->
  <polygon points="38,48 48,50 46,55 38,53" fill="#111827"/>
  <polygon points="62,48 52,50 54,55 62,53" fill="#111827"/>
  <!-- Red tech accent -->
  <path d="M50 32 L45 20 H55 Z" fill="#ef4444"/>
  <!-- Mask cheeks/smile line -->
  <path d="M35 62 C42 68 58 68 65 62" stroke="#111827" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>
`;

const SPARTAN_HELMET_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#374151"/>
  <!-- Red Crest -->
  <path d="M50 8 C30 8 25 25 25 45 H33 C33 30 38 18 50 18 C62 18 67 30 67 45 H75 C75 25 70 8 50 8 Z" fill="#ef4444"/>
  <!-- Helmet Base -->
  <path d="M30 45 C30 65 40 78 50 78 C60 78 70 65 70 45" fill="#9ca3af"/>
  <path d="M30 45 H70 V55 L62 65 H38 L30 55 Z" fill="#6b7280"/>
  <!-- Face Guard T-shape -->
  <path d="M47 45 H53 V68 H47 Z" fill="#111827"/>
  <path d="M34 50 H66 V55 H34 Z" fill="#111827"/>
</svg>
`;

const WOLF_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#2e1065"/>
  <!-- Wolf outline -->
  <polygon points="50,15 32,38 25,28 22,50 38,55 35,70 50,85 65,70 62,55 78,50 75,28 68,38" fill="#4b5563"/>
  <!-- Wolf inner highlight -->
  <polygon points="50,22 36,40 31,34 30,48 42,52 40,65 50,76 60,65 58,52 70,48 69,34 64,40" fill="#9ca3af"/>
  <!-- Purple accents -->
  <polygon points="50,30 42,46 50,54 58,46" fill="#a855f7"/>
  <!-- White fierce eyes -->
  <polygon points="38,45 44,46 41,49" fill="#ffffff"/>
  <polygon points="62,45 56,46 59,49" fill="#ffffff"/>
</svg>
`;

const FALCON_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#1e3a8a"/>
  <!-- Beak -->
  <path d="M50 40 L78 52 C75 68 62 75 50 75 L45 55 Z" fill="#f97316"/>
  <!-- Beak tip shadow -->
  <path d="M68 47 L78 52 C75 63 68 68 60 70 Z" fill="#ea580c"/>
  <!-- Head feathers -->
  <path d="M52 25 C30 25 22 42 22 65 C28 62 34 62 40 68 C38 52 45 42 52 40 Z" fill="#f3f4f6"/>
  <!-- Back neck feathers -->
  <path d="M52 25 C65 25 72 32 72 32 L62 42 C62 42 58 35 52 35 Z" fill="#d1d5db"/>
  <!-- Eye -->
  <circle cx="42" cy="45" r="4" fill="#111827"/>
  <circle cx="43" cy="44" r="1.5" fill="#ffffff"/>
</svg>
`;

const LIGHTNING_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#7c2d12"/>
  <!-- Shield Backing -->
  <path d="M25 25 C25 25 50 15 50 15 C50 15 75 25 75 25 C75 55 60 75 50 85 C40 75 25 55 25 25 Z" fill="#ea580c"/>
  <!-- Lightning Bolt -->
  <polygon points="58,22 35,52 48,52 42,78 65,48 52,48" fill="#ffffff"/>
  <!-- Inner contrast -->
  <polygon points="58,22 48,52 52,48" fill="#e5e7eb"/>
</svg>
`;

const CROWN_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#0f172a"/>
  <!-- Crown Base shadow -->
  <path d="M20 75 L28 40 L42 58 L50 35 L58 58 L72 40 L80 75 Z" fill="#ea580c"/>
  <!-- Crown Front -->
  <path d="M23 72 L30 44 L42 60 L50 39 L58 60 L70 44 L77 72 Z" fill="#f97316"/>
  <!-- Crown Band -->
  <path d="M20 70 H80 V78 H20 Z" fill="#ffffff"/>
  <ellipse cx="50" cy="74" rx="4" ry="4" fill="#3b82f6"/>
  <ellipse cx="35" cy="74" rx="3" ry="3" fill="#ef4444"/>
  <ellipse cx="65" cy="74" rx="3" ry="3" fill="#ef4444"/>
</svg>
`;

const SHIELD_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#1f2937"/>
  <!-- Outer Shield -->
  <path d="M22 22 C40 18 50 12 50 12 C50 12 60 18 78 22 C78 52 65 75 50 88 C35 75 22 52 22 22 Z" fill="#3b82f6"/>
  <!-- Inner Shield -->
  <path d="M28 27 C42 24 50 19 50 19 C50 19 58 24 72 27 C72 50 62 70 50 81 C38 70 28 50 28 27 Z" fill="#1e1b4b"/>
  <!-- Star Emblem -->
  <polygon points="50,30 55,42 68,42 58,50 62,63 50,55 38,63 42,50 32,42 45,42" fill="#ffffff"/>
</svg>
`;

const TARGET_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#991b1b"/>
  <!-- Outer Ring -->
  <circle cx="50" cy="50" r="32" fill="none" stroke="#ffffff" stroke-width="5"/>
  <!-- Inner Ring -->
  <circle cx="50" cy="50" r="18" fill="none" stroke="#ffffff" stroke-width="4"/>
  <!-- Center Bullseye -->
  <circle cx="50" cy="50" r="7" fill="#ef4444"/>
  <!-- Crosshairs -->
  <rect x="47" y="10" width="6" height="15" fill="#ffffff" rx="2"/>
  <rect x="47" y="75" width="6" height="15" fill="#ffffff" rx="2"/>
  <rect x="10" y="47" width="15" height="6" fill="#ffffff" rx="2"/>
  <rect x="75" y="47" width="15" height="6" fill="#ffffff" rx="2"/>
</svg>
`;

const HEXAGON_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#581c87"/>
  <!-- Hexagon Outer -->
  <polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="#a855f7"/>
  <!-- Hexagon Inner -->
  <polygon points="50,22 74,36 74,64 50,78 26,64 26,36" fill="#1e1b4b"/>
  <!-- Core Cube abstract -->
  <polygon points="50,32 68,42 50,52 32,42" fill="#3b82f6"/>
  <polygon points="50,52 68,42 68,62 50,72" fill="#1d4ed8"/>
  <polygon points="50,52 32,42 32,62 50,72" fill="#1e3a8a"/>
</svg>
`;

const ABSTRACT_LETTER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#111827"/>
  <!-- Stylized geometric 'S' and 'U' (Arena motif) -->
  <path d="M25 25 H75 V42 H42 V58 H75 V75 H25 V58 H58 V42 H25 Z" fill="#ef4444"/>
  <!-- Contrast block -->
  <path d="M58 42 H75 V58 H58 Z" fill="#f3f4f6"/>
</svg>
`;

const TRIANGLE_EMBLEM_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#030712"/>
  <!-- Trinity Outer Triangle -->
  <polygon points="50,15 85,75 15,75" fill="none" stroke="#a855f7" stroke-width="6"/>
  <!-- Middle Triangle -->
  <polygon points="50,30 73,70 27,70" fill="none" stroke="#3b82f6" stroke-width="4"/>
  <!-- Core Light -->
  <polygon points="50,45 60,65 40,65" fill="#ffffff"/>
</svg>
`;


// --- TEAM LOGOS (8 pieces) ---

const TEAM_SHIELD_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f172a" rx="20"/>
  <!-- Outer Shield Trim -->
  <path d="M20 20 C45 15 50 10 50 10 C50 10 55 15 80 20 C80 55 65 80 50 90 C35 80 20 55 20 20 Z" fill="#3b82f6"/>
  <!-- Shield Body -->
  <path d="M25 25 C45 21 50 16 50 16 C50 16 55 21 75 25 C75 52 62 74 50 83 C38 74 25 52 25 25 Z" fill="#1e293b"/>
  <!-- Vertical split line for monochrome/cool design -->
  <path d="M50 16 C50 16 55 21 75 25 C75 52 62 74 50 83 Z" fill="#334155" opacity="0.3"/>
  <!-- Wings emblem in shield -->
  <path d="M32 40 L45 40 L35 55 L48 55 L38 70 L62 70 L52 55 L65 55 L55 40 L68 40 L50 62 Z" fill="#ffffff"/>
</svg>
`;

const TEAM_WOLF_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f172a" rx="20"/>
  <!-- Wolf Head Shape -->
  <path d="M50 12 L22 42 L15 32 L10 55 L32 62 L30 75 L50 90 L70 75 L68 62 L90 55 L85 32 L78 42 Z" fill="#9ca3af"/>
  <!-- Wolf Head shadow -->
  <path d="M50 12 L78 42 L85 32 L90 55 L68 62 L70 75 L50 90 Z" fill="#4b5563"/>
  <!-- Snout and Nose -->
  <polygon points="50,45 42,65 50,75 58,65" fill="#111827"/>
  <!-- Eyes -->
  <polygon points="32,45 42,48 38,52" fill="#ef4444"/>
  <polygon points="68,45 58,48 62,52" fill="#ef4444"/>
</svg>
`;

const TEAM_FALCON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f172a" rx="20"/>
  <!-- Eagle Wing Left -->
  <path d="M50 35 C30 20 12 35 12 55 C22 55 35 48 45 40 Z" fill="#3b82f6"/>
  <!-- Eagle Wing Right -->
  <path d="M50 35 C70 20 88 35 88 55 C78 55 65 48 55 40 Z" fill="#1d4ed8"/>
  <!-- Beak -->
  <polygon points="50,30 40,55 50,68 60,55" fill="#f97316"/>
  <polygon points="50,30 50,68 60,55" fill="#ea580c"/>
  <!-- Angry Eyes -->
  <polygon points="42,40 48,42 45,46" fill="#ffffff"/>
  <polygon points="58,40 52,42 55,46" fill="#ffffff"/>
</svg>
`;

const TEAM_PANTHER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f172a" rx="20"/>
  <!-- Panther Base silhouette -->
  <path d="M50 15 C25 15 20 32 20 52 C20 72 32 82 50 82 C68 82 80 72 80 52 C80 32 75 15 50 15 Z" fill="#111827"/>
  <!-- Ears -->
  <polygon points="22,25 35,15 32,32" fill="#111827"/>
  <polygon points="78,25 65,15 68,32" fill="#111827"/>
  <!-- Face details -->
  <path d="M30 45 L42 50 L50 38 L58 50 L70 45 L62 65 L50 72 L38 65 Z" fill="#4b5563"/>
  <!-- Glowing Panther Eyes -->
  <polygon points="35,42 45,45 42,48" fill="#ef4444"/>
  <polygon points="65,42 55,45 58,48" fill="#ef4444"/>
  <!-- Fangs -->
  <polygon points="42,58 45,68 48,58" fill="#ffffff"/>
  <polygon points="58,58 55,68 52,58" fill="#ffffff"/>
</svg>
`;

const TEAM_CROWN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f172a" rx="20"/>
  <!-- Crown Outline -->
  <path d="M15 78 L25 30 L40 55 L50 20 L60 55 L75 30 L85 78 Z" fill="#f97316"/>
  <!-- Symmetrical shading -->
  <path d="M50 20 L60 55 L75 30 L85 78 H50 Z" fill="#ea580c"/>
  <!-- Base band -->
  <rect x="15" y="74" width="70" height="8" fill="#ffffff" rx="2"/>
  <!-- Jewels -->
  <circle cx="50" cy="78" r="3" fill="#3b82f6"/>
  <circle cx="30" cy="78" r="2.5" fill="#ef4444"/>
  <circle cx="70" cy="78" r="2.5" fill="#ef4444"/>
</svg>
`;

const TEAM_PHOENIX_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f172a" rx="20"/>
  <!-- Flame background -->
  <path d="M50 10 C30 25 15 50 15 75 C15 88 28 90 50 90 C72 90 85 88 85 75 C85 50 70 25 50 10 Z" fill="#dc2626"/>
  <path d="M50 20 C35 32 22 52 22 72 C22 82 32 84 50 84 C68 84 78 82 78 72 C78 52 65 32 50 20 Z" fill="#f97316"/>
  <!-- Bird Silhouette -->
  <path d="M50 30 C45 35 40 45 40 55 C40 68 45 75 50 75 C55 75 60 68 60 55 C60 45 55 35 50 30 Z" fill="#ffffff"/>
  <!-- Phoenix Wings -->
  <path d="M32 55 L42 62 L25 72 Z" fill="#ffffff"/>
  <path d="M68 55 L58 62 L75 72 Z" fill="#ffffff"/>
</svg>
`;

const TEAM_LIGHTNING_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f172a" rx="20"/>
  <!-- Hexagon backplate -->
  <polygon points="50,12 82,30 82,70 50,88 18,70 18,30" fill="#3b82f6"/>
  <polygon points="50,16 78,32 78,68 50,84 22,68 22,32" fill="#1e1b4b"/>
  <!-- Lightning Bolt -->
  <polygon points="58,22 30,52 46,52 40,78 68,48 52,48" fill="#f97316"/>
</svg>
`;

const TEAM_HEXAGON_EMBLEM_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0f172a" rx="20"/>
  <!-- Multi-layered Hexagon -->
  <polygon points="50,10 85,30 85,70 50,90 15,70 15,30" fill="#a855f7"/>
  <polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="#111827"/>
  <polygon points="50,22 74,36 74,64 50,78 26,64 26,36" fill="#3b82f6"/>
  <!-- Central Star -->
  <polygon points="50,38 53,46 62,46 55,51 58,60 50,55 42,60 45,51 38,46 47,46" fill="#ffffff"/>
</svg>
`;


export const DEFAULT_AVATARS: DefaultAsset[] = [
  { id: 'avatar_hooded', name: 'Hooded Player', category: 'avatar', url: svgToDataUri(HOODED_PLAYER_SVG) },
  { id: 'avatar_mask', name: 'Anonymous Mask', category: 'avatar', url: svgToDataUri(ANONYMOUS_MASK_SVG) },
  { id: 'avatar_spartan', name: 'Spartan Helmet', category: 'avatar', url: svgToDataUri(SPARTAN_HELMET_SVG) },
  { id: 'avatar_wolf', name: 'Cyber Wolf', category: 'avatar', url: svgToDataUri(WOLF_AVATAR_SVG) },
  { id: 'avatar_falcon', name: 'Cyber Falcon', category: 'avatar', url: svgToDataUri(FALCON_AVATAR_SVG) },
  { id: 'avatar_lightning', name: 'Lightning Crest', category: 'avatar', url: svgToDataUri(LIGHTNING_AVATAR_SVG) },
  { id: 'avatar_crown', name: 'Imperial Crown', category: 'avatar', url: svgToDataUri(CROWN_AVATAR_SVG) },
  { id: 'avatar_shield', name: 'Tactical Shield', category: 'avatar', url: svgToDataUri(SHIELD_AVATAR_SVG) },
  { id: 'avatar_target', name: 'Precision Target', category: 'avatar', url: svgToDataUri(TARGET_AVATAR_SVG) },
  { id: 'avatar_hexagon', name: 'Neo Hexagon', category: 'avatar', url: svgToDataUri(HEXAGON_AVATAR_SVG) },
  { id: 'avatar_letter', name: 'Abstract Emblem', category: 'avatar', url: svgToDataUri(ABSTRACT_LETTER_SVG) },
  { id: 'avatar_triangle', name: 'Trinity Triangle', category: 'avatar', url: svgToDataUri(TRIANGLE_EMBLEM_SVG) }
];

export const DEFAULT_TEAM_LOGOS: DefaultAsset[] = [
  { id: 'team_shield', name: 'Aegis Shield', category: 'team', url: svgToDataUri(TEAM_SHIELD_SVG) },
  { id: 'team_wolf', name: 'Alpha Wolf', category: 'team', url: svgToDataUri(TEAM_WOLF_SVG) },
  { id: 'team_falcon', name: 'Apex Falcon', category: 'team', url: svgToDataUri(TEAM_FALCON_SVG) },
  { id: 'team_panther', name: 'Shadow Panther', category: 'team', url: svgToDataUri(TEAM_PANTHER_SVG) },
  { id: 'team_crown', name: 'Royal Crown', category: 'team', url: svgToDataUri(TEAM_CROWN_SVG) },
  { id: 'team_phoenix', name: 'Solar Phoenix', category: 'team', url: svgToDataUri(TEAM_PHOENIX_SVG) },
  { id: 'team_lightning', name: 'Blitz Hexagon', category: 'team', url: svgToDataUri(TEAM_LIGHTNING_SVG) },
  { id: 'team_hexagon_emblem', name: 'Nova Hexagon', category: 'team', url: svgToDataUri(TEAM_HEXAGON_EMBLEM_SVG) }
];

export const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=400&h=400';
export const DEFAULT_TEAM_LOGO_URL = 'team_shield'; // Use Aegis Shield as default team logo

export function resolveAvatar(avatarStr?: string | null): string {
  if (!avatarStr) return DEFAULT_AVATAR_URL;
  const found = DEFAULT_AVATARS.find(a => a.id === avatarStr);
  if (found) return found.url;
  return avatarStr;
}

export function resolveTeamLogo(logoStr?: string | null): string {
  if (!logoStr) return DEFAULT_AVATARS[7].url; // fall back to shield or default
  const found = DEFAULT_TEAM_LOGOS.find(t => t.id === logoStr);
  if (found) return found.url;
  // check if it matches default avatar ids as fallback
  const foundAvatar = DEFAULT_AVATARS.find(a => a.id === logoStr);
  if (foundAvatar) return foundAvatar.url;
  return logoStr;
}

