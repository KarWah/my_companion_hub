import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Gets the authenticated user from the current session
 * @throws Error if user is not authenticated
 */
export async function getAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please log in");
  }

  // Safe type assertion - we know username exists from NextAuth callbacks
  interface SessionUser {
    id: string;
    email: string;
    name: string;
    username: string;
  }

  return session.user as SessionUser;
}

/**
 * Verifies that a user owns a specific companion
 * @throws Error if companion doesn't exist or doesn't belong to user
 */
export async function verifyCompanionOwnership(
  companionId: string,
  userId: string
) {
  const companion = await prisma.companion.findUnique({
    where: { id: companionId },
    select: { userId: true }
  });

  if (!companion || companion.userId !== userId) {
    throw new Error("Unauthorized: You don't own this companion");
  }

  return true;
}

/**
 * Hashes a password using bcrypt with 10 salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
