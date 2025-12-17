"use client";

import { useState } from "react";
import { wipeCompanionMemory } from "@/app/actions";
import { Trash2, AlertTriangle, Check } from "lucide-react";

type Companion = {
  id: string;
  name: string;
};

export default function SettingsList({ companions }: { companions: Companion[] }) {
  const [ragEnabled, setRagEnabled] = useState(true);
  const [deepThink, setDeepThink] = useState(false);

  const [wipingId, setWipingId] = useState<string | null>(null);

  const handleWipe = async (id: string) => {
    if (!confirm("Are you sure? This will delete all chat history with this companion.")) return;
    
    setWipingId(id);
    await wipeCompanionMemory(id);
    setWipingId(null);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">AI Configuration</h2>
        
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-white">Enable RAG (Memory)</h3>
            <p className="text-slate-400 text-sm">Allow companions to recall past conversations.</p>
          </div>
          <button
            onClick={() => setRagEnabled(!ragEnabled)}
            className={`w-14 h-8 rounded-full transition-colors relative ${
              ragEnabled ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${ragEnabled ? "left-7" : "left-1"}`} />
          </button>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-white">DeepThink Logic</h3>
            <p className="text-slate-400 text-sm">Uses extra tokens for complex reasoning.</p>
          </div>
          <button
            onClick={() => setDeepThink(!deepThink)}
            className={`w-14 h-8 rounded-full transition-colors relative ${
              deepThink ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${deepThink ? "left-7" : "left-1"}`} />
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-red-400 border-b border-red-900/30 pb-2 flex items-center gap-2">
          <AlertTriangle size={20} /> Danger Zone
        </h2>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {companions.length === 0 ? (
             <div className="p-6 text-slate-500 text-center">No companions found.</div>
          ) : (
            companions.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
                <div>
                  <h3 className="font-medium text-white">{c.name}</h3>
                  <p className="text-xs text-slate-500">ID: {c.id}</p>
                </div>
                
                <button
                  onClick={() => handleWipe(c.id)}
                  disabled={wipingId === c.id}
                  className="flex items-center gap-2 px-3 py-2 bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-200 rounded-lg transition-all text-sm font-medium border border-red-900/20"
                >
                  {wipingId === c.id ? (
                     <span className="animate-pulse">Wiping...</span>
                  ) : (
                     <>
                       <Trash2 size={16} /> Wipe Memory
                     </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-slate-500 px-2">
          This will permanently delete the message history and reset the outfit for the selected companion.
        </p>
      </section>

    </div>
  );
}