# Filesystem & Route Map

```
/ (Root)
  |-- /admin (Admin Dashboard)
  |     |-- /archive (Archive Admin)
  |     |-- /leaderboard (Live Leaderboard)
  |     |-- /referrals-download (Referrals Download)
  |-- /api (API Routes)
  |     |-- /auth/[...nextauth] (Authentication)
  |     |-- /captain-progress (Progress Tracking)
  |     |-- /export (Data Exporting)
  |     |-- /game-state (Game State Management)
  |     |-- /sync (Synchronization)
  |-- /captain-login (Captain Login)
  |-- /dashboard (Member/Captain Dashboard)
  |-- /login (General Login)
  |-- /onboarding (User Onboarding)
  |-- OPTIONAL_FEATURES.md (Tracker for add-ons & experimental features)
  |-- .agents/
        |-- AGENTS.md (Custom Agentic Rules)
```

## Structure
- **Next.js App Router**: Uses the `app/` directory.
- **Admin**: Contains numerous client components for managing users, assignments, shifting, and orchestration (including dynamic round timers).
- **Dashboard**: Realtime listener, dynamic speaker timers, exit warnings.
- **API**: Handles auth, state, syncing, and CSV/JSON exports.
