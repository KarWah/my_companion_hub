import { getActiveCompanion } from "@/app/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { ImageGalleryGrid } from "@/components/image-gallery-grid";
import { paginateMessages, getMessageCount } from "@/lib/pagination";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = await params;
  const companion = await getActiveCompanion(id);

  return {
    title: companion ? `${companion.name}'s Gallery - Companion Hub` : "Gallery",
    description: `View all generated images for ${companion?.name || "companion"}`,
  };
}

export default async function CompanionGalleryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { cursor?: string };
}) {
  const { id } = await params;
  const { cursor } = await searchParams;
  const companion = await getActiveCompanion(id);

  if (!companion) {
    redirect("/gallery");
  }

  // Get paginated messages with images for this companion
  const { items: messagesWithImages, nextCursor, hasMore } = await paginateMessages(
    {
      companionId: companion.id,
      imageUrl: { not: null }
    },
    { cursor, limit: 24 } // 24 images per page (4x6 grid)
  );

  // Get total count for display
  const totalImages = await getMessageCount({
    companionId: companion.id,
    imageUrl: { not: null }
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Gallery
        </Link>
        <h1 className="text-3xl font-bold text-white">{companion.name}'s Gallery</h1>
        <p className="text-slate-400 mt-2">
          {totalImages} image{totalImages !== 1 ? 's' : ''} generated
          {cursor && ` • Page ${Math.floor(messagesWithImages.length / 24) + 1}`}
        </p>
      </div>

      {/* Images Grid */}
      {totalImages === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-slate-400 mb-4">No images generated yet</p>
          <Link
            href={`/?companionId=${companion.id}`}
            className="text-blue-400 hover:text-blue-300"
          >
            Start chatting to generate images
          </Link>
        </div>
      ) : (
        <>
          <ImageGalleryGrid
            messages={messagesWithImages}
            companionName={companion.name}
          />

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-8 text-center">
              <Link
                href={`/gallery/${companion.id}?cursor=${nextCursor}`}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Load More Images
                <ChevronRight size={20} />
              </Link>
              <p className="text-slate-500 text-sm mt-3">
                Showing {messagesWithImages.length} of {totalImages} images
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
