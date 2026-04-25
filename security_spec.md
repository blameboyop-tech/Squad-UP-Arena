# Firestore Security Specification for Squad UP Arena

## Data Invariants
1. **Users**:
   - A user can only modify their own profile.
   - `email` and `name` are required on creation.
   - Users cannot modify their `coins` field directly (this should ideally be server-side, but allowed for now with strict owner-only access if needed, or better, treated as system field).
2. **Teams**:
   - Only the leader can update team details or delete the team.
   - `game` must be one of the supported values.
   - `leaderId` must match the authenticated user during creation and remains immutable.
3. **Memberships**:
   - Creating a membership requires authentication.
   - A user can only delete their own membership (leaving a team).
   - Only the team leader can delete other memberships (removing members).

## The Dirty Dozen Payloads (Targeting Rejection)
1. **Identity Spoofing**: Attempt to create a user profile with a different UID.
2. **Resource Poisoning**: Attempt to create a team with a 2MB string bio.
3. **Privilege Escalation**: Attempt to update a team where `leaderId` is not the current user.
4. **State Shortcutting**: Attempt to update `createdAt` of a team.
5. **Role Injection**: Attempt to create a membership for another user as 'leader'.
6. **Query Scraping**: Attempt to list all users' private info (if any).
7. **Cross-Tenant Write**: User A attempts to delete User B's team.
8. **Shadow Field Injection**: Attempt to add `isAdmin: true` to a user profile.
9. **Relational Orphan**: Attempt to create a membership for a non-existent team.
10. **Timestamp Fraud**: Attempt to set `joinedAt` to a future date instead of `request.time`.
11. **ID Exhaustion**: Attempt to create a document with a 2KB string as ID.
12. **Type Mismatch**: Attempt to set `coins` to a string value.

## Test Runner Logic (Draft)
The `firestore.rules.test.ts` (if implemented) would verify these scenarios.
