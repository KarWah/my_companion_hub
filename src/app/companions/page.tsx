import { getCompanions } from "@/app/actions";
import Link from "next/link";
import { Plus, User, MessageSquare } from "lucide-react";
import { Pencil } from "lucide-react";
import { DeleteCompanionButton } from "@/components/delete-companion-button";
export default async function CompanionsPage() {
  const companions = await getCompanions();

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Your Companions</h1>
        <Link
          href="/companions/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-white font-medium transition-colors"
        >
          <Plus size={18} /> Create New
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companions.map((c) => (
          <div
            key={c.id}
            className="p-6 rounded-2xl border bg-slate-900 border-slate-800 hover:border-slate-700 transition-all flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-slate-300 overflow-hidden">
                {c.headerImage ? (
                  <img
                    src={c.headerImage}
                    alt={c.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={32} />
                )}
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">{c.name}</h3>
            <p className="text-slate-400 text-sm line-clamp-3 mb-4 flex-1">
              {c.description}
            </p>
            
            <div className="mt-4 pt-4 border-t border-slate-800 flex gap-2">
                <Link 
                  href={`/?companionId=${c.id}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <MessageSquare size={16} /> Chat
                </Link>
            
                <Link
                  href={`/companions/${c.id}/edit`}
                  className="flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors"
                  title="Edit Companion"
                >
                  <Pencil size={18} />
                </Link>
            
                <DeleteCompanionButton companionId={c.id} />
              </div>
          </div>
        ))}
      </div>
    </div>
  );
}