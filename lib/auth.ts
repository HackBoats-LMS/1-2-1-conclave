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
    async signIn({ user }) {
      if (!user.email) return false;
      
      // Check if user exists and is approved by admin (case-insensitive)
      const normalizedEmail = user.email.toLowerCase();
      const dbUser = await prisma.user.findFirst({
        where: { 
          email: {
            equals: normalizedEmail,
            mode: "insensitive"
          }
        },
      });

      if (!dbUser || !dbUser.isApproved) {
        // Return false to deny access
        return false; 
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // user is only available the first time jwt callback is called (on sign in)
      if (user) {
        let dbUser = await prisma.user.findUnique({ where: { id: user.id }});
        
        if (!dbUser && user.email) {
          // Fallback to finding by email if id doesn't match
          dbUser = await prisma.user.findFirst({
            where: {
              email: {
                equals: user.email,
                mode: "insensitive"
              }
            }
          });
        }

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.isApproved = dbUser.isApproved;
          token.onboardingCompleted = dbUser.onboardingCompleted;
        } else {
          token.id = user.id;
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
    error: '/login?error=AccessDenied',
  }
});
