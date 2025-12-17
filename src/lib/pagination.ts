import prisma from "@/lib/prisma";
import type { Message } from "@prisma/client";

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

/**
 * Paginate messages using cursor-based pagination
 *
 * @param where - Prisma where clause
 * @param params - Pagination parameters (cursor and limit)
 * @returns Paginated result with items and next cursor
 */
export async function paginateMessages(
  where: any,
  params: PaginationParams
): Promise<PaginatedResult<Message>> {
  const limit = params.limit || 24; // Default to 24 images (4x6 grid)

  // Fetch limit + 1 to check if there are more items
  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(params.cursor && {
      cursor: { id: params.cursor },
      skip: 1 // Skip the cursor item itself
    })
  });

  // Check if there are more items
  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    items,
    nextCursor,
    hasMore
  };
}

/**
 * Get total count for pagination metadata
 *
 * @param where - Prisma where clause
 * @returns Total count
 */
export async function getMessageCount(where: any): Promise<number> {
  return await prisma.message.count({ where });
}
