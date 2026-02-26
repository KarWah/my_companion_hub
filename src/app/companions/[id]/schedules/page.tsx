import { getAuthenticatedUser, verifyCompanionOwnership } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { ScheduledMessageList } from "@/components/scheduled-message-list";
import { ScheduledMessageForm } from "@/components/scheduled-message-form";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SchedulesPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companionId } = await params;
  const user = await getAuthenticatedUser();

  try {
    await verifyCompanionOwnership(companionId, user.id);
  } catch {
    notFound();
  }

  const companion = await prisma.companion.findUnique({
    where: { id: companionId }
  });

  if (!companion) {
    notFound();
  }

  const scheduledMessages = await prisma.scheduledMessage.findMany({
    where: { companionId },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/companions"
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Scheduled Messages</h1>
            <p className="text-slate-400">{companion.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-5 h-5" />
          <span className="text-sm">{scheduledMessages.length} schedules</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Create Schedule</h2>
          <ScheduledMessageForm companionId={companionId} />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Active Schedules</h2>
          {scheduledMessages.length === 0 ? (
            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 text-center">
              <p className="text-slate-400">No scheduled messages yet.</p>
              <p className="text-sm text-slate-500 mt-1">
                Create a schedule to have {companion.name} send you messages automatically.
              </p>
            </div>
          ) : (
            <ScheduledMessageList messages={scheduledMessages} />
          )}
        </div>
      </div>

      <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
        <h3 className="font-medium text-white mb-2">How it works</h3>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• Scheduled messages trigger {companion.name} to send you a message at the specified time.</li>
          <li>• Messages use the template you provide as context for the conversation.</li>
          <li>• You can set different schedules for different times of day (morning, evening, etc.).</li>
          <li>• All times are calculated based on your selected timezone.</li>
        </ul>
      </div>
    </div>
  );
}
