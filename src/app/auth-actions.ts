"use server";

import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { checkRegistrationRateLimit, getClientIp } from "@/lib/rate-limit-db";
import type { ActionResult } from "@/types/prisma";

export async function registerUser(formData: FormData): Promise<ActionResult> {
  // Rate limiting check
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const rateLimit = await checkRegistrationRateLimit(ip);

  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || "Too many registration attempts" };
  }

  const email = formData.get("email") as string;
  const username = (formData.get("username") as string)?.toLowerCase(); // Normalize to lowercase
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;

  // Validation
  if (!email || !username || !name || !password) {
    return { success: false, error: "All fields are required" };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  try {
    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return { success: false, error: "Email already registered" };
    }

    // Check if username exists (case-insensitive)
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return { success: false, error: "Username already taken" };
    }

    // Create user
    const hashedPassword = await hashPassword(password);

    await prisma.user.create({
      data: {
        email,
        username, // Already normalized to lowercase
        name,
        hashedPassword
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }

  // Redirect happens outside try-catch because Next.js redirect() throws internally
  redirect("/login?registered=true");
}
