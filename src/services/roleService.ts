import { db, auth, handleFirestoreError } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const SUPER_ADMIN_EMAILS = [
  "blameboyop@gmail.com",
  "owner1@gmail.com",
  "owner2@gmail.com"
];

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'verified_organizer' | 'organizer' | 'user';

export type Permission =
  | 'view_users'             // super_admin, admin
  | 'manage_users'           // super_admin, admin
  | 'manage_roles'           // super_admin only
  | 'view_reports'           // super_admin, admin, moderator
  | 'manage_reports'         // super_admin, admin, moderator
  | 'manage_badges'          // super_admin, admin
  | 'view_tournaments'       // super_admin, admin, moderator, verified_organizer, organizer
  | 'manage_tournaments'     // super_admin, admin, moderator, verified_organizer, organizer
  | 'manage_tasks'           // super_admin, admin
  | 'manage_logos'           // super_admin, admin
  | 'manage_shop'            // super_admin, admin
  | 'manage_banners'         // super_admin, admin
  | 'send_broadcast'         // super_admin, admin, moderator
  | 'manage_system'          // super_admin, admin
  | 'access_admin_panel'     // super_admin, admin, moderator, verified_organizer, organizer
;

const permissionRoles: Record<Permission, UserRole[]> = {
  view_users: ['super_admin', 'admin'],
  manage_users: ['super_admin', 'admin'],
  manage_roles: ['super_admin'],
  view_reports: ['super_admin', 'admin', 'moderator'],
  manage_reports: ['super_admin', 'admin', 'moderator'],
  manage_badges: ['super_admin', 'admin'],
  view_tournaments: ['super_admin', 'admin', 'moderator', 'verified_organizer', 'organizer'],
  manage_tournaments: ['super_admin', 'admin', 'moderator', 'verified_organizer', 'organizer'],
  manage_tasks: ['super_admin', 'admin'],
  manage_logos: ['super_admin', 'admin'],
  manage_shop: ['super_admin', 'admin'],
  manage_banners: ['super_admin', 'admin'],
  send_broadcast: ['super_admin', 'admin', 'moderator'],
  manage_system: ['super_admin', 'admin'],
  access_admin_panel: ['super_admin', 'admin', 'moderator', 'verified_organizer', 'organizer']
};

/**
 * Checks if a given role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowed = permissionRoles[permission];
  return allowed ? allowed.includes(role) : false;
}


/**
 * Resolves the role for a given email and Firestore role.
 * If the email is in SUPER_ADMIN_EMAILS, returns 'super_admin'.
 * Otherwise, returns the Firestore role or defaults to 'user'.
 */
export function resolveUserRole(email: string | null | undefined, firestoreRole?: string | null): UserRole {
  if (email && SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
    return 'super_admin';
  }
  
  const role = firestoreRole || 'user';
  if (['admin', 'moderator', 'verified_organizer', 'organizer', 'user'].includes(role)) {
    return role as UserRole;
  }
  return 'user';
}

/**
 * Checks if the current or provided email is a Super Admin.
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
}

/**
 * Checks if the resolved role is an Admin (either super_admin or admin).
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

/**
 * Checks if the resolved role is a Moderator (super_admin, admin, or moderator).
 */
export function isModerator(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'moderator';
}

/**
 * Checks if the user has a specific role or higher (hierarchical) or match.
 */
export function hasRole(currentRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(currentRole);
}

/**
 * Gets the current authenticated user's resolved role.
 * It reads the profile from Firestore or matches the email in SUPER_ADMIN_EMAILS.
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return 'user';
  }
  
  if (currentUser.email && isSuperAdmin(currentUser.email)) {
    return 'super_admin';
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return resolveUserRole(currentUser.email, data.role);
    }
  } catch (error) {
    console.error("Error getting current user role:", error);
  }
  
  return 'user';
}

/**
 * Change another user's Firestore role.
 * Validation:
 * - Only Super Admin can assign roles.
 * - Allowed roles to set in Firestore: 'user', 'moderator', 'admin', 'verified_organizer', 'organizer'.
 * - Super Admin can promote or demote anyone except another Super Admin.
 */
export async function changeUserRole(targetUserId: string, newRole: 'user' | 'moderator' | 'admin' | 'verified_organizer' | 'organizer'): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Authentication required.");
  }

  // 1. Check if current user is Super Admin
  const isCurrentSuper = isSuperAdmin(currentUser.email);
  if (!isCurrentSuper) {
    throw new Error("Unauthorized. Only Super Admins can assign roles.");
  }

  // 2. Validate allowed roles to assign
  const allowedRoles = ['user', 'moderator', 'admin', 'verified_organizer', 'organizer'];
  if (!allowedRoles.includes(newRole)) {
    throw new Error(`Invalid role. Allowed roles are: ${allowedRoles.join(', ')}`);
  }

  // 3. Fetch target user to ensure they are not a Super Admin
  const targetDocRef = doc(db, 'users', targetUserId);
  let targetDoc;
  try {
    targetDoc = await getDoc(targetDocRef);
  } catch (err) {
    handleFirestoreError(err, 'get', `users/${targetUserId}`);
  }

  if (!targetDoc.exists()) {
    throw new Error("Target user not found.");
  }

  const targetData = targetDoc.data();
  const targetEmail = targetData.email;
  if (isSuperAdmin(targetEmail)) {
    throw new Error("Unauthorized. Cannot promote or demote another Super Admin.");
  }

  // 4. Update Firestore role
  try {
    await updateDoc(targetDocRef, {
      role: newRole,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    handleFirestoreError(error, 'update', `users/${targetUserId}`);
  }
}
