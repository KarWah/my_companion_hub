import prisma from "@/lib/prisma";
import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery - Companion Hub",
  description: "View all your companion galleries",
};

export default async function GalleryPage() {
  const user = await getAuthenticatedUser();

  // Optimized query with aggregation (single query instead of N+1)
  const companionsWithCounts = await prisma.companion.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          messages: {
            where: {
              imageUrl: { not: null }
            }
          }
        }
      }
    }
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Gallery</h1>

      {companionsWithCounts.length === 0 ? (
        <div className="text-center py-16">
          <ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No companions yet</p>
          <Link
            href="/companions/new"
            className="inline-block mt-4 text-blue-400 hover:text-blue-300"
          >
            Create your first companion
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {companionsWithCounts.map((companion) => (
            <Link
              key={companion.id}
              href={`/gallery/${companion.id}`}
              className="group"
            >
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500 transition-all">
                {/* Header Image */}
                <div className="aspect-[3/4] bg-slate-950 relative overflow-hidden">
                  {companion.headerImage ? (
                    <img
                      src={companion.headerImage}
                      alt={companion.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-slate-700" />
                    </div>
                  )}

                  {/* Image Count Badge */}
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <ImageIcon size={16} className="text-blue-400" />
                    <span className="text-white font-medium">{companion._count.messages}</span>
                  </div>
                </div>

                {/* Companion Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-1 truncate">
                    {companion.name}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {companion.description.substring(0, 100)}...
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
