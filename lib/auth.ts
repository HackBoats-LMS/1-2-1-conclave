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
  session: { 
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
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
    async jwt({ token, user }) {
      // user is only available the first time jwt callback is called (on sign in)
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }});
        if (dbUser) {
          token.role = dbUser.role;
          token.isApproved = dbUser.isApproved;
          token.onboardingCompleted = dbUser.onboardingCompleted;
        }
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
