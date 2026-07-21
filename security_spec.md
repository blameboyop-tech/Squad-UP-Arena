# Security Specification - Squad UP Arena

## Data Invariants
1. A user can only edit their own profile (except for admin overrides).
2. A chat message must have a senderId matching the authenticated user.
3. A user can only read/write to chat threads where they are a participant.
4. Rewards can only be added via Tasks, and Tasks can only be created/updated by admins.
5. Team profiles can only be edited by the team leader.

## The "Dirty Dozen" Payloads (Red Team Tests)

### 1. Identity Spoofing (Chats)
**Payload:** `{ senderId: "someone_else_id", text: "Fake message" }` to `/chats/my_uid_other_uid/messages/new_msg`
**Expected:** PERMISSION_DENIED (senderId must match request.auth.uid)

### 2. Privilege Escalation (Profile)
**Payload:** `{ isAdmin: true }` to `/users/my_uid`
**Expected:** PERMISSION_DENIED (Users cannot elevate their own permissions)

### 3. Resource Poisoning (Chat ID)
**Path:** `/chats/VERY_LONG_STRING_OVER_128_CHARS/messages/msg1`
**Expected:** PERMISSION_DENIED (isValidId check)

### 4. Shadow Update (Teams)
**Payload:** `{ name: "New Name", ghostField: "Malicious" }` to `/teams/team1`
**Expected:** PERMISSION_DENIED (affectedKeys().hasOnly check)

### 5. Orphaned Write (Tasks)
**Payload:** `{ taskId: "non_existent_task", userId: "my_uid" }` to `/user_tasks/id`
**Expected:** PERMISSION_DENIED (exists() check for task)

### 6. PII Leak (Users)
**Operation:** `get` on `/users/other_user_id`
**Expected:** Restricted fields (email, phone) should not be readable by others if present.

### 7. Global Chat Hijack
**Payload:** `{ senderName: "System Admin" }` to `/global_chats/msg`
**Expected:** PERMISSION_DENIED (senderName must match auth profile if enforced)

### 8. Relational Bypass (Chat Messages)
**Path:** `/chats/other_user_a_other_user_b/messages/msg1`
**Expected:** PERMISSION_DENIED (User is not a participant in the parent chat)

### 9. Token Spoofing
**Condition:** Using `token.email` without `email_verified == true`.
**Expected:** Rejection for sensitive operations.

### 10. Self-Assigned Rewards
**Payload:** `{ gold: 1000000 }` to `/users/my_uid`
**Expected:** PERMISSION_DENIED (Rewards only via logic-gated transactions or admin)

### 11. Endorsement Spam
**Payload:** Multiple endorsements for same category from same user.
**Expected:** Checked by existence test in rules or unique ID pattern.

### 12. Admin Config Overwrite
**Payload:** `{ APP_VERSION_CODE: 999 }` to `/system/config`
**Expected:** PERMISSION_DENIED (Admin only)

## Test Runner (firestore.rules.test.ts)
(To be implemented if environment supports vitest/jest for firestore rules)
