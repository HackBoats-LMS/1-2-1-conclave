# 🚢 HackBoats 1-2-1 Conclave: Developer Handoff Guide

Welcome to the **HackBoats 1-2-1 Conclave** project! If you (or your AI assistant) are reading this, you are picking up development on a highly optimized, real-time speed-networking and referral platform. 

This document outlines everything we have built, the architecture of the system, and exactly how the core algorithms function so you can hit the ground running.

---

## 🛠️ Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS (with highly customized, brutalist/modern aesthetics: heavy borders, `#BEF03C` neon greens, `#0D2421` deep forest greens).
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: NextAuth (Google OAuth & Email Whitelisting)

---

## 🧠 Core Architecture & Features Built

### 1. The Matrix: Auto-Assignment Algorithm
The crown jewel of this platform is the auto-assignment engine located in `app/admin/actions.ts` (`generateAutoAssignments`). It solves the complex mathematical problem of ensuring `M` Members meet `C` Captains (Tables) over `R` Rounds with maximum unique overlap and minimal group collisions.

**How the Algorithm Works:**
1. **Dynamic Round Calculation**: Determines exactly how many rounds are needed to achieve 100% coverage (so every member meets every captain at least once).
2. **Greedy Base Assignment**: Iterates through every round and assigns members to tables prioritizing captains they *haven't* met yet.
3. **Hill Climbing Optimization**: After generating a base matrix for a round, it runs a localized "hill-climbing" algorithm (2,000 iterations per round). It randomly selects two members at different tables and swaps them.
4. **Scoring Engine**: It evaluates the table's score. If a member meets someone new, `+1 point`. If a member sits with someone from their own company/group, it applies a **`-10 point penalty`**. If the swap increases the overall score, the swap is kept.
5. **Database Commit**: Wipes the old matrix and batch-inserts (`createMany`) all new Slots, Rounds, Tables, and Assignments to avoid hitting database connection limits.

### 2. Live Telemetry & Real-Time Syncing
- **Client-Side Timers (`<ClientTimer>`)**: We built a zero-latency countdown timer that syncs the Admin Dashboard with the User Panels. When the Admin hits "Launch Round", the database records `startTime`. The client component takes that timestamp and runs a pure JavaScript `setInterval` countdown. This ensures exact synchronization across all devices without polling the database and burning through server bandwidth.
- **Digital Referrals**: During a round, users can exchange digital referrals. The Admin Dashboard tracks this via "Live Referrals" telemetry. 

### 3. Advanced Admin Dashboard
- **Excel Uploads**: The admin can upload raw `.xlsx` files for Captains and Members. The engine parses it, ignores invalid rows, extracts emails and group names, and upserts them into the database whitelist.
- **Session Rotations**: Controls the lifecycle of the event (Pending -> In Progress -> Completed).
- **PDF & Excel Exporters**: We built robust, client-side PDF and Excel generators using `xlsx`, `jspdf`, and `jspdf-autotable`. 

---

## 🐛 Critical Bug Fixes & Optimizations Applied

If you are modifying the code, **do not revert these optimizations**:

1. **PDF File Size Bloat Fix (`AssignmentPreview.tsx` / `ReferralsExportButtons.tsx`)**:
   - *The Problem*: PDFs were ballooning to 24MB because the 5MB HackBoats PNG logo was being natively injected as raw binary data into every single page of the PDF inside the loop.
   - *The Solution*: We converted the HTML image to a pure Base64 `DataURL` via an off-screen `<canvas>`. We then injected it into `jsPDF` using an **Alias Dictionary Mapping** (`'hb-logo'`). This injects the binary once, and subsequent pages just reference the alias pointer. PDF sizes plummeted from 24MB to ~15KB. *Note: Do not use the `'FAST'` compression flag in jsPDF, as it causes unhandled exceptions when run without external compression libraries.*

2. **Timer DB Reference Typo (`page.tsx`)**:
   - When passing the start time to the `<ClientTimer>`, always use `round.startTime`. The database column is `startTime`, not `startedAt`.

3. **Prisma Config Strictness (`prisma.config.ts`)**:
   - `prisma.config.ts` cannot accept a `directUrl` property. That property belongs exclusively inside `prisma/schema.prisma` in the `datasource` block. Adding it to the TS config causes Next.js builds to crash with an exit code 1.

---

## 🚀 Where to Pick Up From Here
- **Database Schema**: Check `prisma/schema.prisma` to see the exact relationship between `User`, `TableAssignment`, `Round`, `Table`, and `Referral`.
- **Admin Actions**: All heavy lifting (wiping DBs, generating matrices) happens inside `app/admin/actions.ts`.
- **Adding Users Mid-Event**: If you manually whitelist a user via the Admin Panel and hit "Generate Auto Assignments", the algorithm will include them. **HOWEVER**, this wipes all active rounds. If you need a way to insert a user into an *active* matrix without wiping history, that feature will need to be built.

Happy coding! 🚢
