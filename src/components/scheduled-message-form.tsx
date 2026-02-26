"use client";

import { useState, useTransition } from "react";
import { createScheduledMessage } from "@/app/actions";
import { GREETING_TYPES, CRON_PRESETS, TIMEZONE_OPTIONS, humanReadableCron, getNextRunTime } from "@/lib/cron-scheduler";
import { Clock, Plus, Loader2, Check, ChevronDown, ChevronUp, Settings } from "lucide-react";

interface ScheduledMessageFormProps {
  companionId: string;
}

export function ScheduledMessageForm({ companionId }: ScheduledMessageFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Selected greeting type
  const [selectedGreeting, setSelectedGreeting] = useState<string | null>(null);

  // Timezone (used for all greeting types)
  const [timezone, setTimezone] = useState("UTC");

  // Custom mode options (only shown for 'custom' type)
  const [showCustomOptions, setShowCustomOptions] = useState(false);
  const [customCron, setCustomCron] = useState("0 12 * * *");
  const [useCustomCronInput, setUseCustomCronInput] = useState(false);
  const [customCronInput, setCustomCronInput] = useState("");

  const selectedGreetingData = GREETING_TYPES.find(g => g.id === selectedGreeting);

  // Determine the active cron expression
  const getActiveCron = () => {
    if (!selectedGreetingData) return "0 8 * * *";
    if (selectedGreeting === 'custom') {
      return useCustomCronInput ? customCronInput : customCron;
    }
    return selectedGreetingData.defaultCron;
  };

  const activeCron = getActiveCron();
  const nextRun = getNextRunTime(activeCron, timezone);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGreetingData) {
      setError("Please select a greeting type");
      return;
    }

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await createScheduledMessage({
        companionId,
        cronExpression: activeCron,
        messageTemplate: selectedGreetingData.prompt,
        timezone
      });

      if (result.success) {
        setSuccess(true);
        setSelectedGreeting(null);
        setCustomCron("0 12 * * *");
        setUseCustomCronInput(false);
        setCustomCronInput("");
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to create schedule");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
      {/* Greeting Type Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">What type of message?</label>
        <div className="grid grid-cols-2 gap-2">
          {GREETING_TYPES.filter(g => g.id !== 'custom').map((greeting) => (
            <button
              key={greeting.id}
              type="button"
              onClick={() => setSelectedGreeting(greeting.id)}
              className={`relative p-3 rounded-lg border text-left transition-all ${
                selectedGreeting === greeting.id
                  ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500/50"
                  : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
              }`}
            >
              {selectedGreeting === greeting.id && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-pink-400" />
                </div>
              )}
              <div className="text-sm font-medium text-white">{greeting.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{greeting.description}</div>
            </button>
          ))}
        </div>

        {/* Custom option */}
        <button
          type="button"
          onClick={() => {
            setSelectedGreeting('custom');
            setShowCustomOptions(true);
          }}
          className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
            selectedGreeting === 'custom'
              ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500/50"
              : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
          }`}
        >
          <Settings className="w-5 h-5 text-slate-400" />
          <div className="flex-1">
            <div className="text-sm font-medium text-white">Custom Schedule</div>
            <div className="text-xs text-slate-400">Set your own time with advanced options</div>
          </div>
          {selectedGreeting === 'custom' && <Check className="w-4 h-4 text-pink-400" />}
        </button>
      </div>

      {/* Timezone Selection - Always visible when a greeting is selected */}
      {selectedGreeting && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">Your Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Custom Time Options - Only for custom type */}
      {selectedGreeting === 'custom' && (
        <div className="space-y-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setShowCustomOptions(!showCustomOptions)}
            className="w-full flex items-center justify-between text-sm text-slate-300"
          >
            <span className="font-medium">Custom Time Settings</span>
            {showCustomOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCustomOptions && (
            <div className="space-y-3 pt-2 border-t border-slate-700">
              {!useCustomCronInput ? (
                <select
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  {CRON_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customCronInput}
                  onChange={(e) => setCustomCronInput(e.target.value)}
                  placeholder="* * * * * (min hour day month weekday)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-sm"
                />
              )}

              <button
                type="button"
                onClick={() => setUseCustomCronInput(!useCustomCronInput)}
                className="text-xs text-pink-400 hover:text-pink-300"
              >
                {useCustomCronInput ? "Use preset times" : "Use custom cron expression"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {selectedGreeting && (
        <div className="p-3 bg-slate-900/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-pink-400" />
            <span className="text-white font-medium">{selectedGreetingData?.label}</span>
          </div>
          <div className="text-xs text-slate-400">
            Schedule: {humanReadableCron(activeCron)}
          </div>
          {nextRun && (
            <div className="text-xs text-slate-500">
              Next message: {nextRun.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg text-green-300 text-sm">
          Schedule created! Your companion will message you automatically.
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending || !selectedGreeting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            Enable Schedule
          </>
        )}
      </button>
    </form>
  );
}
