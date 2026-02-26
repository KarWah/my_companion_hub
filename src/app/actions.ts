"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedUser, verifyCompanionOwnership } from "@/lib/auth-helpers";
import { checkCompanionCreationRateLimit, checkSettingsRateLimit } from "@/lib/rate-limit-db";
import { validateBase64Image, sanitizeBase64Image } from "@/lib/image-validation";
import { uploadImage, deleteCompanionImages, copyCompanionHeaderImage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { logCompanionEvent, logRatingEvent, logScheduledMessageEvent } from "@/lib/audit-logger";
import type { ActionResult, Companion, DiscoveryFilters, PublicCompanion } from "@/types/index";



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
  const style = formData.get("style") as 'anime' | 'realistic'; // NEW: Art style for checkpoint selection
  const outfit = formData.get("currentOutfit") as string;
  const userAppearance = formData.get("userAppearance") as string;
  const relationship = formData.get("relationship") as string;
  const hobbiesRaw = formData.get("hobbies") as string;
  const hobbies = hobbiesRaw ? JSON.parse(hobbiesRaw) : [];
  const fetishesRaw = formData.get("fetishes") as string;
  const fetishes = fetishesRaw ? JSON.parse(fetishesRaw) : [];
  const occupation = formData.get("occupation") as string;
  const personalityArchetype = formData.get("personalityArchetype") as string;
  const extendedPersonality = formData.get("extendedPersonality") as string;
  const voiceId = formData.get("voiceId") as string;
  const voiceEnabled = formData.get("voiceEnabled") === 'true';
  const headerImageRaw = formData.get("headerImage") as string;

  // Server-side image validation (CRITICAL: client-side can be bypassed)
  const headerImageBase64 = sanitizeBase64Image(headerImageRaw);
  if (headerImageBase64) {
    const validation = validateBase64Image(headerImageBase64);
    if (!validation.valid) {
      throw new Error(`Invalid header image: ${validation.error}`);
    }
  }

  // Create companion first to get ID
  const companion = await prisma.companion.create({
    data: {
      name,
      description,
      visualDescription,
      style, // NEW: Store art style for checkpoint selection
      defaultOutfit: outfit,
      currentOutfit: outfit,
      userAppearance,
      relationship,
      hobbies,
      fetishes,
      occupation,
      personalityArchetype,
      extendedPersonality: extendedPersonality || null,
      voiceId: voiceId || null,
      voiceEnabled,
      userId: user.id,
    },
  });

  // Upload header image to file storage if provided
  if (headerImageBase64) {
    try {
      const uploadResult = await uploadImage(
        headerImageBase64,
        companion.id,
        'companion-header'
      );

      // Update companion with image URL
      await prisma.companion.update({
        where: { id: companion.id },
        data: { headerImageUrl: uploadResult.url },
      });
    } catch (error) {
      // If image upload fails, delete the companion and throw error
      await prisma.companion.delete({ where: { id: companion.id } });
      throw new Error(`Failed to upload header image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Audit log companion creation
  await logCompanionEvent("companion_create", user.id, companion.id, { name });

  revalidatePath("/companions");
  redirect("/companions");
}

export async function getCompanions(): Promise<Companion[]> {
  const user = await getAuthenticatedUser();

  // Cast: Prisma types are stale — remove `as` after `npx prisma generate`
  return await prisma.companion.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  }) as unknown as Companion[];
}


export async function getActiveCompanion(companionId?: string): Promise<Companion | null> {
  const user = await getAuthenticatedUser();

  if (companionId) {
    // Cast: Prisma types are stale — remove `as` after `npx prisma generate`
    const companion = await prisma.companion.findUnique({
      where: { id: companionId, deletedAt: null },
    }) as unknown as Companion | null;

    // Verify ownership
    if (!companion || companion.userId !== user.id) {
      return null;
    }

    return companion;
  }

  return await prisma.companion.findFirst({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  }) as unknown as Companion | null;
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

    // Delete all images from file storage
    await deleteCompanionImages(companionId);

    // Delete companion from database (cascades to messages and workflows)
    await prisma.companion.delete({
      where: { id: companionId },
    });

    // Audit log
    await logCompanionEvent("companion_delete", user.id, companionId);

    revalidatePath("/companions");

    return { success: true };
  } catch (error) {
    logger.error({ error, companionId }, "Delete companion error");
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
  const style = formData.get("style") as 'anime' | 'realistic'; // NEW: Art style for checkpoint selection
  const outfit = formData.get("currentOutfit") as string;
  const userAppearance = formData.get("userAppearance") as string;
  const relationship = formData.get("relationship") as string;
  const hobbiesRaw = formData.get("hobbies") as string;
  const hobbies = hobbiesRaw ? JSON.parse(hobbiesRaw) : [];
  const fetishesRaw = formData.get("fetishes") as string;
  const fetishes = fetishesRaw ? JSON.parse(fetishesRaw) : [];
  const occupation = formData.get("occupation") as string;
  const personalityArchetype = formData.get("personalityArchetype") as string;
  const extendedPersonality = formData.get("extendedPersonality") as string;
  const voiceId = formData.get("voiceId") as string;
  const voiceEnabled = formData.get("voiceEnabled") === 'true';
  const headerImageRaw = formData.get("headerImage") as string;

  // Check if the raw input is a URL (existing image) or empty
  // If it starts with 'http' or '/', it's an existing image, so we treat it as "no upload"
  const isExistingImage = headerImageRaw && (headerImageRaw.startsWith('http') || headerImageRaw.startsWith('/'));
  
  // Only sanitize if it's NOT an existing image
  const headerImageBase64 = !isExistingImage ? sanitizeBase64Image(headerImageRaw) : null;
  
  let headerImageUrl: string | null = null;

  if (headerImageBase64) {
    const validation = validateBase64Image(headerImageBase64);
    if (!validation.valid) {
      throw new Error(`Invalid header image: ${validation.error}`);
    }

    // Upload new header image
    const uploadResult = await uploadImage(
      headerImageBase64,
      id,
      'companion-header'
    );

    headerImageUrl = uploadResult.url;
  }

  // Update companion
  await prisma.companion.update({
    where: { id },
    data: {
      name,
      description,
      visualDescription,
      style, // NEW: Update art style for checkpoint selection
      defaultOutfit: outfit,
      currentOutfit: outfit,
      userAppearance,
      relationship,
      hobbies,
      fetishes,
      occupation,
      personalityArchetype,
      extendedPersonality: extendedPersonality || null,
      voiceId: voiceId || null,
      voiceEnabled,
      ...(headerImageUrl && { headerImageUrl }), // Only updates image if a NEW one was uploaded
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

// ============================================================================
// COMMUNITY/DISCOVERY ACTIONS
// ============================================================================

/**
 * Toggle a companion's public/private status
 */
export async function togglePublishCompanion(companionId: string): Promise<ActionResult<{ isPublic: boolean }>> {
  try {
    const user = await getAuthenticatedUser();
    await verifyCompanionOwnership(companionId, user.id);

    // Rate limiting check
    const rateLimit = await checkSettingsRateLimit(user.id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error || "Too many changes. Please try again later." };
    }

    // Get current state
    const companion = await prisma.companion.findUnique({
      where: { id: companionId },
      select: { isPublic: true }
    });

    if (!companion) {
      return { success: false, error: "Companion not found" };
    }

    const newIsPublic = !companion.isPublic;

    // Update companion
    await prisma.companion.update({
      where: { id: companionId },
      data: {
        isPublic: newIsPublic,
        publishedAt: newIsPublic ? new Date() : null,
      },
    });

    // Audit log
    await logCompanionEvent(
      newIsPublic ? "companion_publish" : "companion_unpublish",
      user.id,
      companionId
    );

    revalidatePath("/companions");
    revalidatePath("/community");

    return { success: true, data: { isPublic: newIsPublic } };
  } catch (error) {
    logger.error({ error, companionId }, "Toggle publish companion error");
    return { success: false, error: "Failed to update companion visibility" };
  }
}

/**
 * Get public companions for the community/discovery page
 */
export async function getPublicCompanions(filters: DiscoveryFilters = {}): Promise<{ companions: PublicCompanion[]; total: number }> {
  const {
    fetishes,
    relationships,
    occupations,
    hobbies,
    personalityArchetype,
    style,
    search,
    sortBy = 'newest',
    page = 1,
    limit = 20
  } = filters;

  // Build where clause
  const where: Record<string, unknown> = {
    isPublic: true,
    deletedAt: null,
  };

  if (fetishes && fetishes.length > 0) {
    where.fetishes = { hasSome: fetishes };
  }

  if (relationships && relationships.length > 0) {
    where.relationship = { in: relationships };
  }

  if (occupations && occupations.length > 0) {
    where.occupation = { in: occupations };
  }

  if (hobbies && hobbies.length > 0) {
    where.hobbies = { hasSome: hobbies };
  }

  if (personalityArchetype) {
    where.personalityArchetype = personalityArchetype;
  }

  if (style) {
    where.style = style;
  }

  // Search by name (case-insensitive)
  if (search && search.trim()) {
    where.name = { contains: search.trim(), mode: 'insensitive' };
  }

  // Build order by clause
  let orderBy: Record<string, string> = {};
  switch (sortBy) {
    case 'popular':
      orderBy = { viewCount: 'desc' };
      break;
    case 'rating':
      orderBy = { averageRating: 'desc' };
      break;
    case 'newest':
    default:
      orderBy = { publishedAt: 'desc' };
      break;
  }

  // Get total count
  const total = await prisma.companion.count({ where });

  // Get companions with user info
  const companions = await prisma.companion.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          username: true,
        }
      },
      ratings: {
        select: {
          rating: true,
        }
      }
    }
  });

  // Transform to PublicCompanion type with calculated ratings
  const publicCompanions: PublicCompanion[] = companions.map(c => {
    const ratings = c.ratings || [];
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    return {
      id: c.id,
      name: c.name,
      description: c.description,
      visualDescription: c.visualDescription,
      headerImageUrl: c.headerImageUrl,
      style: c.style,
      relationship: c.relationship,
      occupation: c.occupation,
      personalityArchetype: c.personalityArchetype,
      hobbies: c.hobbies,
      fetishes: c.fetishes,
      extendedPersonality: c.extendedPersonality,
      viewCount: c.viewCount,
      chatCount: c.chatCount,
      publishedAt: c.publishedAt,
      creatorId: c.user.id,
      creatorUsername: c.user.username,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingCount: ratings.length,
    };
  });

  return { companions: publicCompanions, total };
}

/**
 * Get a single public companion by ID
 */
export async function getPublicCompanionById(companionId: string): Promise<PublicCompanion | null> {
  const companion = await prisma.companion.findUnique({
    where: {
      id: companionId,
      isPublic: true,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        }
      },
      ratings: {
        select: {
          rating: true,
        }
      }
    }
  });

  if (!companion) {
    return null;
  }

  const ratings = companion.ratings || [];
  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : 0;

  return {
    id: companion.id,
    name: companion.name,
    description: companion.description,
    visualDescription: companion.visualDescription,
    headerImageUrl: companion.headerImageUrl,
    style: companion.style,
    relationship: companion.relationship,
    occupation: companion.occupation,
    personalityArchetype: companion.personalityArchetype,
    hobbies: companion.hobbies,
    fetishes: companion.fetishes,
    extendedPersonality: companion.extendedPersonality,
    viewCount: companion.viewCount,
    chatCount: companion.chatCount,
    publishedAt: companion.publishedAt,
    creatorId: companion.user.id,
    creatorUsername: companion.user.username,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingCount: ratings.length,
  };
}

/**
 * Increment view count for a public companion
 */
export async function incrementCompanionViewCount(companionId: string): Promise<void> {
  await prisma.companion.update({
    where: { id: companionId },
    data: { viewCount: { increment: 1 } },
  });
}

/**
 * Rate a public companion
 */
export async function rateCompanion(
  companionId: string,
  rating: number,
  review?: string
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    // Validate rating
    if (rating < 1 || rating > 5) {
      return { success: false, error: "Rating must be between 1 and 5" };
    }

    // Check if companion is public
    const companion = await prisma.companion.findUnique({
      where: { id: companionId },
      select: { isPublic: true, userId: true }
    });

    if (!companion || !companion.isPublic) {
      return { success: false, error: "Companion not found or not public" };
    }

    // Can't rate your own companion
    if (companion.userId === user.id) {
      return { success: false, error: "You cannot rate your own companion" };
    }

    // Upsert rating (update existing or create new)
    await prisma.rating.upsert({
      where: {
        companionId_userId: {
          companionId,
          userId: user.id,
        }
      },
      update: {
        rating,
        review: review || null,
      },
      create: {
        companionId,
        userId: user.id,
        rating,
        review: review || null,
      }
    });

    // Update stored averageRating on the companion so it can be sorted natively
    const agg = await prisma.rating.aggregate({
      where: { companionId },
      _avg: { rating: true },
    });
    await prisma.companion.update({
      where: { id: companionId },
      data: { averageRating: agg._avg.rating ?? 0 },
    });

    // Audit log
    await logRatingEvent(user.id, companionId, rating);

    revalidatePath("/community");
    revalidatePath(`/community/${companionId}`);

    return { success: true };
  } catch (error) {
    logger.error({ error, companionId }, "Rate companion error");
    return { success: false, error: "Failed to rate companion" };
  }
}

/**
 * Clone a public companion to user's own collection
 */
export async function clonePublicCompanion(companionId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getAuthenticatedUser();

    // Rate limiting check
    const rateLimit = await checkCompanionCreationRateLimit(user.id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error || "Too many companions created. Please try again later." };
    }

    // Get the public companion
    const sourceCompanion = await prisma.companion.findUnique({
      where: {
        id: companionId,
        isPublic: true,
        deletedAt: null,
      },
    });

    if (!sourceCompanion) {
      return { success: false, error: "Companion not found or not public" };
    }

    // Create a copy for the user
    const newCompanion = await prisma.companion.create({
      data: {
        name: sourceCompanion.name,
        description: sourceCompanion.description,
        visualDescription: sourceCompanion.visualDescription,
        userAppearance: sourceCompanion.userAppearance,
        relationship: sourceCompanion.relationship,
        hobbies: sourceCompanion.hobbies,
        fetishes: sourceCompanion.fetishes,
        occupation: sourceCompanion.occupation,
        personalityArchetype: sourceCompanion.personalityArchetype,
        style: sourceCompanion.style,
        defaultOutfit: sourceCompanion.defaultOutfit,
        currentOutfit: sourceCompanion.currentOutfit,
        currentLocation: "living room",
        currentAction: "looking at viewer",
        headerImageUrl: sourceCompanion.headerImageUrl, // Will be updated below
        extendedPersonality: sourceCompanion.extendedPersonality,
        voiceId: sourceCompanion.voiceId,
        voiceEnabled: sourceCompanion.voiceEnabled,
        userId: user.id,
        isPublic: false, // User's copy is private
      },
    });

    // Copy the header image to the new companion's own storage directory so
    // deleting the original companion doesn't break the clone's image.
    if (sourceCompanion.headerImageUrl) {
      const copiedUrl = await copyCompanionHeaderImage(
        sourceCompanion.headerImageUrl,
        newCompanion.id
      );
      if (copiedUrl !== sourceCompanion.headerImageUrl) {
        await prisma.companion.update({
          where: { id: newCompanion.id },
          data: { headerImageUrl: copiedUrl },
        });
      }
    }

    // Increment chat count on the source companion
    await prisma.companion.update({
      where: { id: companionId },
      data: { chatCount: { increment: 1 } },
    });

    // Audit log
    await logCompanionEvent("companion_clone", user.id, newCompanion.id, {
      sourceCompanionId: companionId,
      sourceName: sourceCompanion.name,
    });

    revalidatePath("/companions");

    return { success: true, data: { id: newCompanion.id } };
  } catch (error) {
    logger.error({ error, companionId }, "Clone companion error");
    return { success: false, error: "Failed to clone companion" };
  }
}

// ============================================================================
// SCHEDULED MESSAGING ACTIONS
// ============================================================================

import { isValidCronExpression, getNextRunTime } from "@/lib/cron-scheduler";
import type { ScheduledMessage, CreateScheduledMessageInput } from "@/types";

/**
 * Get all scheduled messages for a companion
 */
export async function getScheduledMessages(companionId: string): Promise<ActionResult<ScheduledMessage[]>> {
  try {
    const user = await getAuthenticatedUser();
    await verifyCompanionOwnership(companionId, user.id);

    const messages = await prisma.scheduledMessage.findMany({
      where: { companionId },
      orderBy: { createdAt: "desc" }
    });

    return { success: true, data: messages as ScheduledMessage[] };
  } catch (error) {
    logger.error({ error, companionId }, "Get scheduled messages error");
    return { success: false, error: "Failed to get scheduled messages" };
  }
}

/**
 * Create a new scheduled message
 */
export async function createScheduledMessage(
  input: CreateScheduledMessageInput
): Promise<ActionResult<ScheduledMessage>> {
  try {
    const user = await getAuthenticatedUser();
    await verifyCompanionOwnership(input.companionId, user.id);

    // Validate cron expression
    if (!isValidCronExpression(input.cronExpression)) {
      return { success: false, error: "Invalid cron expression" };
    }

    // Calculate next run time
    const timezone = input.timezone || "UTC";
    const nextRunAt = getNextRunTime(input.cronExpression, timezone);

    const message = await prisma.scheduledMessage.create({
      data: {
        companionId: input.companionId,
        cronExpression: input.cronExpression,
        messageTemplate: input.messageTemplate,
        timezone,
        nextRunAt,
        enabled: true
      }
    });

    // Audit log
    await logScheduledMessageEvent("scheduled_message_create", user.id, message.id, {
      companionId: input.companionId,
      cronExpression: input.cronExpression
    });

    revalidatePath(`/companions/${input.companionId}/schedules`);

    return { success: true, data: message as ScheduledMessage };
  } catch (error) {
    logger.error({ error, input }, "Create scheduled message error");
    return { success: false, error: "Failed to create scheduled message" };
  }
}

/**
 * Update an existing scheduled message
 */
export async function updateScheduledMessage(
  id: string,
  data: Partial<Pick<ScheduledMessage, "cronExpression" | "messageTemplate" | "timezone" | "enabled">>
): Promise<ActionResult<ScheduledMessage>> {
  try {
    const user = await getAuthenticatedUser();

    // Verify ownership through companion
    const existing = await prisma.scheduledMessage.findUnique({
      where: { id },
      include: { companion: true }
    });

    if (!existing || existing.companion.userId !== user.id) {
      return { success: false, error: "Scheduled message not found" };
    }

    // Validate cron expression if provided
    if (data.cronExpression && !isValidCronExpression(data.cronExpression)) {
      return { success: false, error: "Invalid cron expression" };
    }

    // Recalculate next run time if schedule changed
    let nextRunAt = existing.nextRunAt;
    if (data.cronExpression || data.timezone) {
      const cron = data.cronExpression || existing.cronExpression;
      const tz = data.timezone || existing.timezone;
      nextRunAt = getNextRunTime(cron, tz);
    }

    const updated = await prisma.scheduledMessage.update({
      where: { id },
      data: {
        ...data,
        nextRunAt
      }
    });

    revalidatePath(`/companions/${existing.companionId}/schedules`);

    return { success: true, data: updated as ScheduledMessage };
  } catch (error) {
    logger.error({ error, id }, "Update scheduled message error");
    return { success: false, error: "Failed to update scheduled message" };
  }
}

/**
 * Toggle a scheduled message on/off
 */
export async function toggleScheduledMessage(id: string): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    const existing = await prisma.scheduledMessage.findUnique({
      where: { id },
      include: { companion: true }
    });

    if (!existing || existing.companion.userId !== user.id) {
      return { success: false, error: "Scheduled message not found" };
    }

    // Recalculate next run time when enabling
    let nextRunAt = existing.nextRunAt;
    if (!existing.enabled) {
      nextRunAt = getNextRunTime(existing.cronExpression, existing.timezone);
    }

    await prisma.scheduledMessage.update({
      where: { id },
      data: {
        enabled: !existing.enabled,
        nextRunAt
      }
    });

    revalidatePath(`/companions/${existing.companionId}/schedules`);

    return { success: true };
  } catch (error) {
    logger.error({ error, id }, "Toggle scheduled message error");
    return { success: false, error: "Failed to toggle scheduled message" };
  }
}

/**
 * Delete a scheduled message
 */
export async function deleteScheduledMessage(id: string): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    const existing = await prisma.scheduledMessage.findUnique({
      where: { id },
      include: { companion: true }
    });

    if (!existing || existing.companion.userId !== user.id) {
      return { success: false, error: "Scheduled message not found" };
    }

    await prisma.scheduledMessage.delete({
      where: { id }
    });

    // Audit log
    await logScheduledMessageEvent("scheduled_message_delete", user.id, id, {
      companionId: existing.companionId
    });

    revalidatePath(`/companions/${existing.companionId}/schedules`);

    return { success: true };
  } catch (error) {
    logger.error({ error, id }, "Delete scheduled message error");
    return { success: false, error: "Failed to delete scheduled message" };
  }
}