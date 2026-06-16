import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { 
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // FIX (Login 303 Loop): If the destination is already the login page
      // (with or without an error param), return it as-is to break the redirect chain.
      // Previously, the callback could re-enter the auth flow and cause a 303 loop.
      if (url.includes('/login')) {
        if (url.startsWith('/')) return `${baseUrl}${url}`;
        return url;
      }
      // Allow relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allow same-origin URLs
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch (_) {
        // malformed URL — fall back to baseUrl
      }
      return baseUrl;
    },
    async signIn({ user, profile }) {
      if (!user.email) return false;

      const gameState = await prisma.gameState.findFirst({ select: { isOpenLogins: true } });
      if (gameState?.isOpenLogins) {
        // FIX (Login 303 Loop): Also sync name and image from Google profile on open-login
        // upsert, so the JWT is never stale with missing profile fields.
        await prisma.user.upsert({
          where: { email: user.email.toLowerCase() },
          update: {
            isApproved: true,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          },
          create: {
            email: user.email.toLowerCase(),
            isApproved: true,
            role: "USER",
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          },
        });
        return true;
      }

      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: user.email.toLowerCase(), mode: "insensitive" } },
      });

      if (!dbUser || !dbUser.isApproved) return false;
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        const dbUser = user.id
          ? await prisma.user.findUnique({ where: { id: user.id } })
          : await prisma.user.findFirst({ where: { email: user.email!.toLowerCase() } });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.isApproved = dbUser.isApproved;
          token.onboardingCompleted = dbUser.onboardingCompleted;
        }
      }
      
      // Allow updating session token natively
      if (trigger === "update" && session) {
        if (session.onboardingCompleted !== undefined) token.onboardingCompleted = session.onboardingCompleted;
        if (session.role !== undefined) token.role = session.role;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).isApproved = token.isApproved;
        (session.user as any).onboardingCompleted = token.onboardingCompleted;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  trustHost: true,
});
