# Memory Log

- **App Map**: Created route map in `FILESYSTEM.md` using `app/` structure.
- **Current Architecture**: 
  - **Stack**: Next.js 16 (App Router), Prisma 7.8 (PostgreSQL), NextAuth v5 (beta), Tailwind v4, Supabase (for real-time broadcasting).
  - **DB Schema**: Event hierarchy (`Slot` -> `Round` -> `Table`). `TableAssignment` links `User` to `Table` (with `isCaptain` flag). Users can send/receive `Referral`. `GameState` holds global app flags (`currentRoundId`, `isAutoMode`, `isOpenLogins`). 
  - **Backend Patterns**: Uses Next.js Server Actions (`"use server"`) directly calling Prisma. State changes are pushed to clients using `lib/broadcaster.ts` (Supabase real-time channels) and Next's `revalidatePath`.
  - **API Endpoints**: 
    - `/api/game-state`: Aggregates active round, leaderboards (topSenders, referralUsers), and global state.
    - `/api/sync`: Uses `unstable_cache` to serve GameState & Rounds efficiently.
    - `/api/captain-progress`: Captains POST updates (active speaker, pitches) using `RoundProgress` upserts.
  - **Roles**: Admin, Captain, Member dashboards.
- **Agent Guidelines & Extensions**:
  - We use a workspace-scoped `.agents/AGENTS.md` file to enforce custom rules for the AI.
  - Rule `OPTIONAL_FEATURES`: Features requested as "optional" or "add-ons" are automatically documented in `OPTIONAL_FEATURES.md` alongside exact rollback instructions.
- **Recent Core Modifications**:
  - `Client-Specific Table Limits`: (Optional Feature) Hard limit on targets before auto-generation.
  - `Dynamic Round Phase Timers`: (Optional Feature) Moved `briefingDuration`, `pitchDuration`, and `referralDuration` from hardcoded integers into the `GameState` Prisma schema, allowing instant live updates from the Admin panel via Supabase broadcasting.
