import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { is2FAEnabled } from "@/lib/security/two-factor";
import { logLogin, detectSuspiciousLogin } from "@/lib/security/audit-log";

const BCRYPT_ROUNDS = 12;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as ReturnType<typeof PrismaAdapter>,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7 days
  pages: {
    signIn: "/giris",
    newUser: "/kayit",
    error: "/giris",
  },
  providers: [
    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),

    // Credentials (email + password)
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
        totpToken: { label: "2FA Kodu", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { company: true },
        });

        if (!user || !user.password) return null;

        const isValid = await bcryptjs.compare(
          credentials.password as string,
          user.password,
        );

        if (!isValid) return null;

        // Check 2FA if enabled
        const has2FA = await is2FAEnabled(user.id);
        if (has2FA) {
          const token = credentials.totpToken as string | undefined;
          if (!token) {
            throw new Error("2FA_REQUIRED");
          }
          const { validate2FAToken } = await import("@/lib/security/two-factor");
          const valid2FA = await validate2FAToken(user.id, token);
          if (!valid2FA) {
            throw new Error("2FA_INVALID");
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          plan: user.plan,
          companyId: user.companyId,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.id) return true;

      // Log the login attempt
      try {
        await logLogin(user.id, "session", account?.provider || "credentials", true);
      } catch {
        // Don't block login on audit failure
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role;
        token.plan = (user as Record<string, unknown>).plan;
        token.companyId = (user as Record<string, unknown>).companyId;
        token.provider = account?.provider;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).plan = token.plan;
        (session.user as unknown as Record<string, unknown>).companyId = token.companyId;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        try {
          await detectSuspiciousLogin(user.id, "session");
        } catch {
          // Non-blocking
        }
      }
    },
  },
});

// ─── Hash Password ──────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

// ─── User Helpers ───────────────────────────────────────────

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: string;
    plan: string;
    companyId?: string | null;
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
