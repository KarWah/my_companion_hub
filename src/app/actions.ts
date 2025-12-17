"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedUser, verifyCompanionOwnership } from "@/lib/auth-helpers";
import { checkCompanionCreationRateLimit, checkSettingsRateLimit } from "@/lib/rate-limit-db";
import { validateBase64Image, sanitizeBase64Image } from "@/lib/image-validation";
import type { ActionResult, Companion } from "@/types/prisma";



export async function createCompanion(formData: FormData) {
  const user = await getAuthenticatedUser();

  // Rate limiting check
  const rateLimit = await checkCompanionCreationRateLimit(user.id);
  if (!rateLimit.success) {
    throw new Error(rateLimit.error || "Too many companions created. Please try again later.");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const visualDescription = formData.get("visualDescription") as string;
  const outfit = formData.get("currentOutfit") as string;
  const userAppearance = formData.get("userAppearance") as string;
  const headerImageRaw = formData.get("headerImage") as string;

  // Server-side image validation (CRITICAL: client-side can be bypassed)
  const headerImage = sanitizeBase64Image(headerImageRaw);
  if (headerImage) {
    const validation = validateBase64Image(headerImage);
    if (!validation.valid) {
      throw new Error(`Invalid header image: ${validation.error}`);
    }
  }

  await prisma.companion.create({
    data: {
      name,
      description,
      visualDescription,
      defaultOutfit: outfit,
      currentOutfit: outfit,
      userAppearance,
      headerImage: headerImage || null,
      userId: user.id,
    },
  });

  revalidatePath("/companions");
  redirect("/companions");
}

export async function getCompanions(): Promise<Companion[]> {
  const user = await getAuthenticatedUser();

  return await prisma.companion.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}


export async function getActiveCompanion(companionId?: string): Promise<Companion | null> {
  const user = await getAuthenticatedUser();

  if (companionId) {
    const companion = await prisma.companion.findUnique({
      where: { id: companionId },
    });

    // Verify ownership
    if (!companion || companion.userId !== user.id) {
      return null;
    }

    return companion;
  }

  return await prisma.companion.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}


export async function deleteCompanion(companionId: string): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();
    await verifyCompanionOwnership(companionId, user.id);

    // Rate limiting check
    const rateLimit = await checkSettingsRateLimit(user.id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error || "Too many settings changes. Please try again later." };
    }

    await prisma.companion.delete({
      where: { id: companionId },
    });
    revalidatePath("/companions");

    return { success: true };
  } catch (error) {
    console.error("Delete companion error:", error);
    return { success: false, error: "Failed to delete companion" };
  }
}

export async function updateCompanion(id: string, formData: FormData) {
  const user = await getAuthenticatedUser();
  await verifyCompanionOwnership(id, user.id);

  // Rate limiting check
  const rateLimit = await checkSettingsRateLimit(user.id);
  if (!rateLimit.success) {
    throw new Error(rateLimit.error || "Too many settings changes. Please try again later.");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const visualDescription = formData.get("visualDescription") as string;
  const outfit = formData.get("currentOutfit") as string;
  const userAppearance = formData.get("userAppearance") as string;
  const headerImageRaw = formData.get("headerImage") as string;

  // Server-side image validation (CRITICAL: client-side can be bypassed)
  const headerImage = sanitizeBase64Image(headerImageRaw);
  if (headerImage) {
    const validation = validateBase64Image(headerImage);
    if (!validation.valid) {
      throw new Error(`Invalid header image: ${validation.error}`);
    }
  }

  await prisma.companion.update({
    where: { id },
    data: {
      name,
      description,
      visualDescription,
      defaultOutfit: outfit,
      currentOutfit: outfit,
      userAppearance,
      headerImage: headerImage || null,
    },
  });

  revalidatePath("/companions");
  revalidatePath("/");
  revalidatePath("/gallery");
  redirect("/companions");
}

export async function wipeCompanionMemory(companionId: string) {
  const user = await getAuthenticatedUser();
  await verifyCompanionOwnership(companionId, user.id);

  // Rate limiting check
  const rateLimit = await checkSettingsRateLimit(user.id);
  if (!rateLimit.success) {
    throw new Error(rateLimit.error || "Too many settings changes. Please try again later.");
  }

  // Get the companion's default outfit
  const companion = await prisma.companion.findUnique({
    where: { id: companionId },
    select: { defaultOutfit: true }
  });

  await prisma.message.deleteMany({
    where: { companionId },
  });

  await prisma.companion.update({
    where: { id: companionId },
    data: {
      currentOutfit: companion?.defaultOutfit || "casual clothes",
      currentLocation: "living room",
      currentAction: "looking at viewer"
    },
  });

  revalidatePath("/");
  revalidatePath("/settings");
}