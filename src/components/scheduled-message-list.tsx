"use client";

import { useState, useTransition } from "react";
import { toggleScheduledMessage, deleteScheduledMessage } from "@/app/actions";
import { humanReadableCron } from "@/lib/cron-scheduler";
import { Clock, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import type { ScheduledMessage } from "@/types";

interface ScheduledMessageListProps {
  messages: ScheduledMessage[];
}

export function ScheduledMessageList({ messages }: ScheduledMessageListProps) {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <ScheduledMessageCard key={message.id} message={message} />
      ))}
    </div>
  );
}

function ScheduledMessageCard({ message }: { message: ScheduledMessage }) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggle = () => {
    startTransition(async () => {
      await toggleScheduledMessage(message.id);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteScheduledMessage(message.id);
    });
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        message.enabled
          ? "bg-slate-800/50 border-slate-700"
          : "bg-slate-800/20 border-slate-800 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-pink-400 flex-shrink-0" />
            <span className="text-sm font-medium text-white truncate">
              {humanReadableCron(message.cronExpression)}
            </span>
          </div>

          <p className="text-sm text-slate-300 line-clamp-2 mb-2">
            {message.messageTemplate}
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>{message.timezone}</span>
            {message.lastRunAt && (
              <span>Last run: {new Date(message.lastRunAt).toLocaleDateString()}</span>
            )}
            {message.nextRunAt && (
              <span>Next: {new Date(message.nextRunAt).toLocaleString()}</span>
            )}
            <span>Runs: {message.runCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Toggle Button */}
          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`p-2 rounded-lg transition-colors ${
              message.enabled
                ? "text-green-400 hover:bg-green-900/20"
                : "text-slate-500 hover:bg-slate-700/50"
            }`}
            title={message.enabled ? "Disable" : "Enable"}
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : message.enabled ? (
              <ToggleRight className="w-5 h-5" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>

          {/* Delete Button */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isPending}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                {isPending ? "..." : "Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
