# 1-2-1 Conclave - Business Networking Platform

A modern, high-performance web application designed to facilitate real-time, round-based business networking events. Built with Next.js 15, React 19, Tailwind CSS v4, and PostgreSQL.

## Features

- **Secure Authentication:** Integrated NextAuth.js with Google OAuth.
- **Admin Console:** 
  - Manage users, roles, and table assignments directly from the dashboard.
  - Bulk import assignments and grant access via Excel uploads (`.xlsx`, `.csv`).
  - Control live networking rounds (Start, Pause, Stop) in real-time.
  - Reset live data and initialize the database with empty slots/rounds instantly.
- **Live User Dashboard:** 
  - Real-time updates for active rounds (auto-refreshes).
  - View current table assignments and fellow participants' profiles.
  - Send private networking referrals/notes to other participants at your assigned table.

## Tech Stack

- **Frontend Framework:** Next.js (App Router), React 19
- **Styling:** Tailwind CSS v4
- **Backend API:** Next.js Secure Server Actions
- **Database:** PostgreSQL via Prisma ORM
- **Authentication:** NextAuth (Auth.js) v5 Beta

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgres://..."
   AUTH_SECRET="your-secret-string"
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

3. **Run database migrations & generate Prisma client:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

## Deployment

This application is fully optimized and ready to be deployed to Vercel. 
Connect your GitHub repository to your Vercel account, add your environment variables in the Vercel dashboard, and click deploy! 

The `postinstall` script in `package.json` will automatically handle Prisma client generation during the build phase.
