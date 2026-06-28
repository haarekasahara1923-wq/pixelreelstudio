import NextAuth, { type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      credits: number;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: string;
    credits?: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const emailStr = credentials.email as string;
        const passwordStr = credentials.password as string;

        const userResults = await db
          .select()
          .from(users)
          .where(eq(users.email, emailStr.toLowerCase()))
          .limit(1);

        const user = userResults[0];

        if (!user) {
          throw new Error("No account found with this email.");
        }

        const isPasswordValid = await bcrypt.compare(passwordStr, user.password);

        if (!isPasswordValid) {
          throw new Error("Incorrect password.");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          credits: user.credits,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.credits = user.credits;
      }

      if (trigger === "update" && session) {
        if (session.credits !== undefined) token.credits = session.credits;
        if (session.name !== undefined) token.name = session.name;
      }

      // Fetch fresh credit info from DB so it's always up-to-date in JWT
      if (token.id) {
        try {
          const freshUserList = await db
            .select({ credits: users.credits, role: users.role })
            .from(users)
            .where(eq(users.id, token.id as string))
            .limit(1);
          if (freshUserList.length > 0) {
            token.credits = freshUserList[0].credits;
            token.role = freshUserList[0].role;
          }
        } catch (e) {
          console.error("Error updating token with fresh user data:", e);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.credits = token.credits as number;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
