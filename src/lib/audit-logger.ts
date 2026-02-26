import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import type { AuditAction } from "@/types";

interface AuditLogOptions {
  userId?: string | null;
  action: AuditAction;
  resource?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Log an audit event to the database.
 * This is fire-and-forget - errors are logged but don't throw.
 */
export async function logAudit(options: AuditLogOptions): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] ||
                      headersList.get("x-real-ip") ||
                      null;
    const userAgent = headersList.get("user-agent") || null;

    await prisma.auditLog.create({
      data: {
        userId: options.userId || null,
        action: options.action,
        resource: options.resource || null,
        resourceId: options.resourceId || null,
        details: options.details ? JSON.stringify(options.details) : null,
        ipAddress,
        userAgent
      }
    });
  } catch (error) {
    // Log but don't throw - audit logging should never break the main flow
    console.error("[AuditLogger] Failed to log audit event:", error);
  }
}

/**
 * Helper to log authentication events
 */
export async function logAuthEvent(
  action: "login" | "register" | "logout",
  userId: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId,
    action,
    resource: "user",
    resourceId: userId,
    details
  });
}

/**
 * Helper to log companion events
 */
export async function logCompanionEvent(
  action: "companion_create" | "companion_update" | "companion_delete" | "companion_publish" | "companion_unpublish" | "companion_clone",
  userId: string,
  companionId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId,
    action,
    resource: "companion",
    resourceId: companionId,
    details
  });
}

/**
 * Helper to log message events
 */
export async function logMessageEvent(
  userId: string,
  companionId: string,
  messageId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId,
    action: "message_send",
    resource: "message",
    resourceId: messageId,
    details: { companionId, ...details }
  });
}

/**
 * Helper to log rating events
 */
export async function logRatingEvent(
  userId: string,
  companionId: string,
  rating: number,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId,
    action: "rating_create",
    resource: "rating",
    resourceId: companionId,
    details: { rating, ...details }
  });
}

/**
 * Helper to log scheduled message events
 */
export async function logScheduledMessageEvent(
  action: "scheduled_message_create" | "scheduled_message_delete",
  userId: string,
  scheduledMessageId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId,
    action,
    resource: "scheduled_message",
    resourceId: scheduledMessageId,
    details
  });
}
