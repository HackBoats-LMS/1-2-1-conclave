# 🚢 HackBoats 1-2-1 Conclave: Codebase Blueprint & AI Reconstruction Guide

This document is a comprehensive, master technical guide to the **1-2-1 Conclave** speed-networking and digital referrals platform. It contains the complete system architecture, file layouts, database models, core algorithms, and a step-by-step guide for any AI coding assistant to reconstruct the entire project from scratch to production-grade.

---

## 1. System Overview & Technology Stack

**1-2-1 Conclave** is a whitelisted, real-time networking platform designed to orchestrate structured, round-based business meetings (conclaves) where "Members" sit at tables led by "Table Captains". The system enforces unique pairing rotations (avoiding repeated interactions and company/group collisions), tracks live meeting durations, and allows secure, real-time digital referral transmission.

### 🛠️ Tech Stack & Dependencies
*   **Framework**: Next.js 15 (App Router, dynamic page rendering, React Server Components & Server Actions)
*   **ORM**: Prisma ORM (relational schema mapper & transaction runner)
*   **Database**: PostgreSQL hosted on Supabase (transaction pooler with direct database link options)
*   **Real-time Broadcast**: Supabase Realtime (WebSocket channels used for client timer synchronization and state change pushes)
*   **Authentication**: NextAuth.js v5 (Google OAuth, secure whitelist validation, custom JWT callback overrides)
*   **Styles**: Tailwind CSS (Brutalist Modernist design: neon green `#BEF03C`, deep forest green `#0D2421`, off-white background `#FAF8F4`, heavy dark borders, card lift effects, and paper-airplane fly animations)
*   **Excel Parsing & Creation**: `xlsx` (SheetJS)
*   **PDF Generation**: `jspdf` & `jspdf-autotable`

---

## 2. Complete File Directory Structure Walkthrough

Below is the directory mapping of the project showing the purpose and role of every file:

```markdown
1-2-1-conclave/
├── .env.example                     # Environment variables template
├── package.json                     # Root dependencies (Next.js, Prisma, xlsx, jspdf)
├── tsconfig.json                    # TypeScript compiler settings
├── next.config.ts                   # Next.js configurations
├── tailwind.config.ts               # Custom brutalist colors and theme setup
├── postcss.config.mjs               # PostCSS styling setup
├── prisma/
│   ├── schema.prisma                # Relational database schema definition
│   └── migrations/                  # Database schema migration files
├── lib/
│   ├── auth.ts                      # NextAuth providers, whitelist callbacks, and JWT configuration
│   ├── prisma.ts                    # Prisma Client connection pool builder (direct URL fallback)
│   └── supabaseClient.ts            # Supabase JS client instantiation for Realtime WebSockets
├── types/
│   └── index.ts                     # Shared TypeScript type definitions
└── app/
    ├── globals.css                  # Global brutalist styles & blueprint dot-grid background patterns
    ├── layout.tsx                   # Master root layout wrapping pages with font settings
    ├── error.tsx                    # Error boundary catching unexpected client exceptions
    ├── global-error.tsx             # Master root HTML error boundary
    ├── page.tsx                     # Landing Page (displays active live lobby statistics and redirects)
    ├── login/
    │   └── page.tsx                 # Google OAuth login landing page with whitelisting guards
    ├── onboarding/
    │   ├── actions.ts               # Server Action saving participant business details
    │   ├── OnboardingClient.tsx     # Onboarding form component with validations
    │   └── page.tsx                 # Onboarding landing page (redirects if already onboarded)
    ├── components/
    │   ├── LogoutButton.tsx         # NextAuth signOut action trigger
    │   └── SubmitButton.tsx         # Reusable form submission button with pending state spinners
    ├── dashboard/
    │   ├── actions.ts               # Server Action for sending connection referrals with limits
    │   ├── page.tsx                 # Main Lobby/Dashboard (renders Waiting Room, End Page, or Active Round)
    │   ├── UserCard.tsx             # Participant card inside round (contains referral form + speaker timer)
    │   ├── CaptainActiveRound.tsx   # Circular coordinate table map + autopilot controls for captains
    │   ├── LiveControls.tsx         # Zero-latency Javascript countdown and Supabase PostgREST fallback refresher
    │   ├── TableRealtimeListener.tsx# Table-specific broadcast WebSocket event listener
    │   ├── SelfSpeakerTimer.tsx     # Speaks countdown container shown on member devices
    │   ├── DownloadMyReferralsButton.tsx # Client-side Excel generator for received referrals
    │   └── ExitWarning.tsx          # Warning modal before leaving active rounds
    ├── api/
    │   ├── auth/                    # NextAuth auth endpoints handler
    │   │   └── [...nextauth]/
    │   │       └── route.ts
    │   └── export/
    │       ├── assignments/
    │       │   ├── route.ts         # Server endpoint generating assignments Excel file
    │       │   └── json/
    │       │       └── route.ts     # JSON endpoint of assignments for PDF generation
    │       └── referrals/
    │           ├── route.ts         # Server endpoint exporting referrals to Excel
    │           └── json/
    │               └── route.ts     # JSON endpoint of referrals for PDF generation
    └── admin/
        ├── actions.ts               # Core Server Actions (User roles, lifecycle, imports, late attendee injection)
        ├── page.tsx                 # Admin Dashboard (uploading, auto-shifting, user logs, matrix preview)
        ├── AutoGenerateClient.tsx   # Client-side Greedy/Hill-Climbing assignment generator UI
        ├── AssignmentPreview.tsx    # Matrix view, coverage percentage analytics, and PDF exports
        ├── ClientTimer.tsx          # Admin-facing JavaScript round timer sync
        ├── AdminLiveReferralsClient.tsx # Real-time broadcast telemetry displaying live referral counts
        ├── AddParticipantForms.tsx  # Whitelist manually addition form
        ├── InjectLateAttendeeForm.tsx# Form injecting attendees mid-conclave safely
        ├── MemberUploadForm.tsx     # Excel upload form for Member Whitelist
        ├── CaptainUploadForm.tsx    # Excel upload form for Table Captains
        ├── AssignmentsUploadForm.tsx# Excel upload form for pre-computed match matrices
        ├── ClearMembersWarningButton.tsx # Safe database reset trigger with warning
        ├── UserTable.tsx            # Table displaying all whitelisted users and their completed onboarding status
        ├── AdminAutoShiftingManager.tsx# Auto-mode watcher initiating next round when intermission finishes
        ├── SecureAdminButton.tsx    # Button requesting Admin PIN confirmation before destructive acts
        ├── AdminPinModal.tsx        # Pin validation modal window
        ├── SuccessAlert.tsx         # Auto-fading cookie status feedback alerts
        ├── archive/
        │   └── page.tsx             # Archive explorer reviewing previous conclaves
        └── referrals-download/
            └── page.tsx             # Direct print interface for event referrals logs
```

---

## 3. Database Model & Schema Reference (`prisma/schema.prisma`)

Below is the database schema definition using PostgreSQL. Copy this schema configuration to create migrations:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl= env("DIRECT_URL")
}

// User Profile model (Google OAuth profiles and whitelist registry)
model User {
  id                  String            @id @default(cuid())
  name                String?
  email               String?           @unique
  emailVerified       DateTime?
  image               String?
  businessName        String?
  businessCategory    String?
  contactNumber       String?
  description         String?
  specificAsk1        String?
  specificAsk2        String?
  role                String            @default("USER") // ADMIN, CAPTAIN, USER
  isApproved          Boolean           @default(false)   // Whitelist approval flag
  onboardingCompleted Boolean           @default(false)
  group               String?                             // Company/industry collision group
  accounts            Account[]
  sessions            Session[]
  tableAssignments    TableAssignment[]
  sentReferrals       Referral[]        @relation("SentReferrals")
  receivedReferrals   Referral[]        @relation("ReceivedReferrals")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Relational entities wrapping conclave matrix structures:
// Slot -> Rounds -> Tables -> Table Assignments (Members sitting at tables)

model Slot {
  id         String  @id @default(cuid())
  slotNumber Int     @unique
  rounds     Round[]
}

model Round {
  id              String    @id @default(cuid())
  slotId          String
  roundNumber     Int
  status          String    @default("PENDING") // PENDING, IN_PROGRESS, COMPLETED, PAUSED_X
  startTime       DateTime?
  endedAt         DateTime?
  durationMinutes Int       @default(15)
  slot            Slot      @relation(fields: [slotId], references: [id], onDelete: Cascade)
  tables          Table[]

  @@unique([slotId, roundNumber])
}

model Table {
  id          String            @id @default(cuid())
  roundId     String
  tableNumber Int
  round       Round             @relation(fields: [roundId], references: [id], onDelete: Cascade)
  assignments TableAssignment[]

  @@unique([roundId, tableNumber])
}

model TableAssignment {
  id        String  @id @default(cuid())
  userId    String
  tableId   String
  isCaptain Boolean @default(false)
  table     Table   @relation(fields: [tableId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, tableId])
  @@index([userId])
  @@index([tableId])
}

// Referral sent between participants during live rounds
model Referral {
  id         String   @id @default(cuid())
  fromUserId String
  toUserId   String
  note       String?
  createdAt  DateTime @default(now())
  fromUser   User     @relation("SentReferrals", fields: [fromUserId], references: [id], onDelete: Cascade)
  toUser     User     @relation("ReceivedReferrals", fields: [toUserId], references: [id], onDelete: Cascade)

  @@index([toUserId])
  @@index([fromUserId])
}

// Global state monitoring current active round, auto-mode configuration, and open logins
model GameState {
  id             String  @id @default(cuid())
  currentRoundId String?
  shiftDuration  Int     @default(3)   // Autoshifting intermission length in minutes
  isAutoMode     Boolean @default(false)
  isOpenLogins   Boolean @default(false) // Bypasses whitelist requirement if true
}

// Archival records of past events before resetting users and referrals
model ArchivedEvent {
  id        String             @id @default(cuid())
  name      String
  createdAt DateTime           @default(now())
  referrals ArchivedReferral[]
  users     ArchivedUser[]
}

model ArchivedUser {
  id               String        @id @default(cuid())
  eventId          String
  originalUserId   String
  name             String?
  email            String?
  businessName     String?
  businessCategory String?
  contactNumber    String?
  role             String
  createdAt        DateTime      @default(now())
  event            ArchivedEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([email])
}

model ArchivedReferral {
  id        String        @id @default(cuid())
  eventId   String
  fromName  String?
  fromEmail String?
  toName    String?
  toEmail   String?
  note      String?
  createdAt DateTime      @default(now())
  event     ArchivedEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([toEmail])
}
```

---

## 4. Detailed Algorithmic Operations & Logic Flows

### 🧠 A. Auto-Assignment & Hill-Climbing Algorithm
The matching logic solves the constraint satisfaction problem of mapping $M$ Members to $C$ Captains (Tables) over $R$ Rounds.

```mermaid
flowchart TD
    A[Start Auto-Generation] --> B[Fetch Whitelisted Captains & Members]
    B --> C{Verify Constraints:<br/>M >= C?}
    C -- No --> D[Throw Error: Insufficient Members]
    C -- Yes --> E[Calculate Base Table Sizes:<br/>floor M / C + remainders]
    E --> F[Simulation Loop: Run 3 Simulations]
    F --> G[Generate Round Matrix sequentially]
    G --> H[Sort Members by meeting counts - ascending]
    H --> I[Assign Members prioritizing un-met Captains and Tables]
    I --> J[Hill Climbing: Run 800 random Swaps per attempt]
    J --> K[Score Swaps:<br/>+1 for new meeting<br/>-10 for group/company collision]
    K --> L{Did Swap increase score?}
    L -- Yes --> M[Keep Swap]
    L -- No --> N[Revert Swap]
    M --> O{Simulations complete?}
    N --> O
    O -- Yes --> P[Select Matrix with highest unique pair coverage]
    P --> Q[Group rounds into Slots of size 4, 3, or 2]
    Q --> R[Submit Payload to DB transaction]
    R --> S[End]
```

#### Scoring Mechanics
*   **Base Score**: Sum of all unique pairings generated in the matrix.
*   **Collision Penalty**: If two members at the same table share the same `group` value (company, college, or category), apply a **$-10$ penalty** to the score.
*   **Unique Meeting Award**: If a member sits with a captain or another member they have not met in previous rounds, add **$+1$ point**.

#### Browser UI Responsiveness (`yieldToMain`)
To prevent "Page Unresponsive" warnings on the admin's browser during heavy matrix generation loops, the algorithm uses a zero-latency main-thread yielding mechanism. This forces the browser to paint layout updates and run animation ticks:

```typescript
const yieldToMain = () => new Promise(resolve => {
  if (typeof MessageChannel !== 'undefined') {
    const channel = new MessageChannel();
    channel.port1.onmessage = resolve;
    channel.port2.postMessage(null);
  } else {
    setTimeout(resolve, 0);
  }
});
// Yield during loops:
if (attempt % 2 === 0) await yieldToMain();
```

#### Slot Grouping Splits (`calculateSlotGrouping`)
Rounds are grouped into larger time blocks called "Slots" (e.g. for breaks or speaker rotations) using the following progression:
*   $\le 4$ rounds $\rightarrow$ single slot with all rounds.
*   Divisible by 4 $\rightarrow$ group into slots of 4.
*   Divisible by 3 $\rightarrow$ group into slots of 3.
*   Remainder is 1 $\rightarrow$ group into combinations of 3.
*   Remainder is 2 $\rightarrow$ slots of 4 with a final slot of 2.
*   Remainder is 3 $\rightarrow$ slots of 4 with a final slot of 3.

---

### 🏃 B. Safe Late Attendee Mid-Event Injection
When a new user arrives late, the admin can inject them directly into the conclave. The algorithm strictly preserves event history by modifying only **PENDING** rounds:

```mermaid
flowchart TD
    A[Admin submits Late Attendee Email + Role] --> B[Upsert User in DB as Approved]
    B --> C[Find all rounds with status = PENDING]
    C --> D{Is role CAPTAIN?}
    D -- Yes --> E[Add a new Table to each pending round]
    E --> F[Assign Captain to new Table]
    F --> G[Identify crowded tables in those rounds]
    G --> H[Move one non-captain member to the new table to rebalance]
    D -- No --> I[Find the Table with the fewest assignments in each round]
    I --> J[Assign late Member to that Table]
    H --> K[Batch save all new tables and assignments in a single transaction]
    J --> K
    K --> L[Revalidate paths and broadcast updates]
```

---

### ⏱️ C. Zero-Latency Real-Time Timer Synchronization
Countdowns are synchronized across all participant screens without polling the database.

1.  **State Initiation**: When the Admin starts a round, a database transaction sets the round status to `IN_PROGRESS` and records the exact server timestamp: `startTime = new Date()`.
2.  **State Broadcast**: The Server Action broadcasts a lightweight event: `topic = realtime:global_events`, `event = round_state_change`, `payload = { action: 'start' }`.
3.  **Real-Time Page Updates**: Clients listening to `global_events` via Supabase WebSockets immediately trigger `router.refresh()` to fetch the new `startTime` from the server.
4.  **Client Timer Countdown**: The client component (`<ClientTimer>` or `<LiveControls>`) takes the static `startTime` ISO string and runs a pure client-side countdown relative to the local device clock:
    $$\text{Time Left} = \text{durationMinutes} \times 60 \times 1000 - (\text{Date.now()} - \text{startTime.getTime()})$$
5.  **WebSocket Intermission Refresher**: If a socket disconnects, a client-side polling fallback pings the Supabase database directly through PostgREST (bypassing Next.js routing and caching layers) every 30 seconds to sync state.

---

### 📂 D. PDF Generation Memory Optimization
Converting HTML tables with images into PDFs can cause memory bloat and application crashes (e.g. producing 24MB files for small matrices). To prevent this, the client-side exporter converts the corporate logo into a canvas-drawn Base64 DataURL and registers it as a reusable alias inside the jsPDF document.

```typescript
// 1. Draw image offscreen to get clean Base64 data
const canvas = document.createElement("canvas");
canvas.width = img.width;
canvas.height = img.height;
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0);
const dataUrl = canvas.toDataURL("image/png");

// 2. Add to jsPDF once, referencing it by alias pointer 'hb-logo'
const pageCount = doc.internal.getNumberOfPages();
for (let i = 1; i <= pageCount; i++) {
  doc.setPage(i);
  // Re-use image binary by providing the alias string 'hb-logo' at the end:
  doc.addImage(dataUrl, "PNG", x, y, width, height, 'hb-logo');
}
```
*Result*: File size shrinks from 24MB down to ~15KB because the binary image is stored once and referenced by a pointer on subsequent pages.

---

## 5. Step-by-Step Reconstruction Guide for an AI

To build this application from scratch, follow these instructions step-by-step:

### Step 1: Environment Setup
Initialize a Next.js application using Tailwind CSS and TypeScript, then install the required dependencies:
```bash
npx -y create-next-app@latest ./ --typescript --tailwind --app --src-dir=false --import-alias="@/*" --eslint
npm install @prisma/client @auth/prisma-adapter next-auth@5.0.0-beta.25 @supabase/supabase-js xlsx jspdf jspdf-autotable @heroicons/react pg
npm install --save-dev prisma @types/pg
```

Create a `.env` file in the root directory:
```env
# Database Connections (PgBouncer vs Direct)
DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"

# NextAuth Settings
AUTH_SECRET="your-32-character-random-secret-key"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Supabase API Keys (Realtime Broadcasts)
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anonymous-public-key"

# Security Pin
ADMIN_DELETE_PASSWORD="HASHED_PIN_OR_PLAIN"
ADMIN_DELETE_PASSWORD_HASH="728fce39b4446fc2aaa0f4a42971737f137b3ad20c36099fba20891eacca64f8" # HACKBOATS (SHA-256)
```

### Step 2: Database Layer Configuration
1.  Paste the database schema from Section 3 into `prisma/schema.prisma`.
2.  Run the migration command to set up table indexes and foreign keys:
    ```bash
    npx prisma migrate dev --name init
    ```
3.  Create the client builder inside `lib/prisma.ts` utilizing the `pg` pool adapter with a max connection limit of 5 to avoid connection limits in serverless functions (see file content in Section 2).

### Step 3: Auth & Whitelist Security Setup
1.  Configure NextAuth inside `lib/auth.ts` (see file content in Section 2).
2.  Add a callback checking the `isOpenLogins` parameter in `GameState`. If open logins are enabled, register the user directly. If disabled, verify that the email exists in the whitelist with `isApproved = true`.
3.  Add custom claims to the JWT callback to include `role`, `isApproved`, and `onboardingCompleted` so that layout redirects function correctly.

### Step 4: Brutalist Global Styles Setup
Replace the default contents of `app/globals.css` with the modernist brutalist visual theme:
```css
@import "tailwindcss";

@layer base {
  body {
    @apply bg-[#FAF8F4] text-[#0D2421] selection:bg-[#BEF03C]/40;
  }
}

/* Custom dot-grid background utility */
.blueprint-bg {
  background-image: radial-gradient(#0d2421 1.5px, transparent 1.5px);
  background-size: 24px 24px;
}

/* Custom scrollbars */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #0D2421;
  border-radius: 9999px;
}
```

### Step 5: Admin Server Actions & Auto-Assignment Controller
1.  Create `app/admin/actions.ts` and implement core Server Actions: Whitelist uploads, session controls, and late attendee injection. Ensure all write operations execute inside Prisma transactions (`prisma.$transaction`) to prevent partial database states.
2.  Implement `app/admin/AutoGenerateClient.tsx` to handle the Hill-Climbing matrix generation algorithm on the client side. Ensure the browser's thread remains responsive by yielding execution using `yieldToMain`.

### Step 6: Live Participant Dashboard
1.  Create the main dashboard route inside `app/dashboard/page.tsx`. Implement redirects based on user onboarding status and event lifecycle state.
2.  Build `<CaptainActiveRound>` to serve as the control center for table captains. Set up the Supabase WebSocket broadcast channel (`room_[roundId]_table_[tableNumber]`) to emit speaker countdown timestamps.
3.  Build `<UserCard>` to listen to the table channel. When a timer event is received, sync the card's countdown timer and trigger the CSS paper-airplane flight transition when a referral is submitted.

### Step 7: Verification & Testing
Verify the build and run local tests using the dev server:
```bash
npm run build
npm run dev
```
Test the following flows to verify system stability:
*   Try signing in with a non-whitelisted email (should return `AccessDenied` error).
*   Toggle `Open Login` on inside the admin panel, then try signing in again with the same email (should successfully onboard).
*   Upload captain and member excel sheets, set the round count to 8, and run auto-generation (should calculate a matrix with $>95\%$ meeting coverage).
*   Launch Round 1 and verify that timers start simultaneously across multiple windows.
*   Wipe data using the admin console to verify that the transaction archives current event history in `ArchivedEvent` before deleting records.

---
*Created for HackBoats developer onboarding. Ready for AI ingestion.*
