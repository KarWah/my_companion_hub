import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check endpoint for load balancers, Docker, and monitoring.
 * Returns 200 when the DB is reachable, 503 otherwise.
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", timestamp });
  } catch {
    return NextResponse.json({ status: "error", timestamp }, { status: 503 });
  }
}
