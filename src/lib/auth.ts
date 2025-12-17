import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { checkLoginRateLimit, getClientIp } from "@/lib/rate-limit-db";
import { headers } from "next/headers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        // Rate limiting check
        const headersList = await headers();
        const ip = getClientIp(headersList);
        const rateLimit = await checkLoginRateLimit(ip, credentials.identifier as string);

        if (!rateLimit.success) {
          throw new Error(rateLimit.error || "Too many login attempts");
        }

        // Normalize identifier to lowercase for case-insensitive lookup
        const normalizedIdentifier = (credentials.identifier as string).toLowerCase();

        // Find user by username OR email (both case-insensitive)
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: normalizedIdentifier },
              { email: normalizedIdentifier }
            ]
          }
        });

        if (!user) {
          return null;
        }

        // Verify password
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).username = token.username as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login"
  }
});
