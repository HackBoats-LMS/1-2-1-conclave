# Optional Features Registry

This document tracks client-specific or optional "add-on" features implemented in the codebase. If any of these features need to be disabled or removed in the future, follow the rollback instructions provided for each.

---

## 1. Client-Specific Table Limits (Auto-Generation)
**Date Added:** 2026-07-13  
**Why:** A specific client wanted the ability to input exact numbers for "Target Members per Table" and "Target Visitors per Table" to manually verify their table compositions before auto-generating rounds.  
**How it works:** It adds a checkbox and two number inputs to the UI. When checked, it calculates the math: `Math.ceil(members.length / Captains)`. If the actual math exceeds the user's input limit (plus 1 for edge cases), it throws a UI error preventing generation. It *does not* alter the core hill-climbing algorithm.

### Files Modified:
- `app/admin/AutoGenerateClient.tsx`

### Rollback Instructions (How to Delete):
To completely remove this feature from `app/admin/AutoGenerateClient.tsx`:
1. **Remove State Variables (Lines ~118-120):**
   ```tsx
   const [enableLimits, setEnableLimits] = useState(false);
   const [targetMembers, setTargetMembers] = useState<number | string>(6);
   const [targetVisitors, setTargetVisitors] = useState<number | string>(2);
   ```

---

## 2. Dynamic Round Phase Timers
**Date Added:** July 14, 2026  
**Why it was added:** Client request to be able to configure the exact duration of the Briefing, Pitch, and Referral phases directly from the Admin Panel, rather than relying on hardcoded numbers.

**How it works:** 
- The `GameState` table in the database was expanded to include `briefingDuration`, `pitchDuration`, and `referralDuration`.
- The Admin Panel exposes a new form to save these timers.
- The `CaptainActiveRound` component receives these properties globally and scales the UI and internal countdowns automatically.

**Exact files modified:**
- `prisma/schema.prisma` (Added 3 integer fields to GameState)
- `app/admin/actions/round.actions.ts` (Added `updateRoundTimers` server action)
- `app/admin/page.tsx` (Added the UI inputs)
- `app/dashboard/DashboardClientWrapper.tsx` (Passed the gameState object to CaptainActiveRound)
- `app/dashboard/CaptainActiveRound.tsx` (Replaced `60`, `60`, `30` with `gameState?.briefingDuration || 60`, etc.)

**Rollback Instructions:**
1. In `prisma/schema.prisma`, remove `briefingDuration`, `pitchDuration`, and `referralDuration` from the `GameState` model and run `npx prisma db push`.
2. In `app/admin/page.tsx`, delete the `<form action={updateRoundTimers}>` block (around line 590).
3. In `app/admin/actions/round.actions.ts`, delete the `updateRoundTimers` function block.
4. In `app/dashboard/CaptainActiveRound.tsx`, change `gameState?.pitchDuration || 60` back to `60`, `gameState?.briefingDuration || 60` back to `60`, and `gameState?.referralDuration || 30` back to `30`.

**(Note for Client-Specific Table Limits Rollback):**
2. **Remove Validation Logic (Lines ~148-161):**
   Delete the block starting with `if (enableLimits) { ... }` up to where `const memberIds = members.map(m => m.id);` begins.
3. **Remove UI Checkbox & Inputs (Lines ~389-423):**
   Delete the `div` containing the "Enable Client Specific Table Limits" checkbox and its conditional inputs (the block immediately following the `maxRounds` input).
