import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      
      // Check if user exists and is approved by admin
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!dbUser || !dbUser.isApproved) {
        // Return false to deny access
        return false; 
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }});
        if (dbUser) {
          (session.user as any).role = dbUser.role;
          (session.user as any).isApproved = dbUser.isApproved;
          (session.user as any).onboardingCompleted = dbUser.onboardingCompleted;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login?error=AccessDenied',
  }
});
