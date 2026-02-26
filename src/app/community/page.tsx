import { getPublicCompanions } from "@/app/actions";
import { CommunityFilters } from "@/components/community/CommunityFilters";
import { CompanionFeedCard } from "@/components/community/CompanionFeedCard";
import type { DiscoveryFilters } from "@/types";

interface CommunityPageProps {
  searchParams: Promise<{
    style?: string;
    personality?: string;
    relationship?: string;
    occupation?: string;
    hobby?: string;
    sort?: string;
    page?: string;
    search?: string;
  }>;
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const params = await searchParams;

  // Build filters from search params
  const filters: DiscoveryFilters = {
    style: params.style as 'anime' | 'realistic' | undefined,
    personalityArchetype: params.personality || undefined,
    relationships: params.relationship ? [params.relationship] : undefined,
    occupations: params.occupation ? [params.occupation] : undefined,
    hobbies: params.hobby ? [params.hobby] : undefined,
    search: params.search || undefined,
    sortBy: (params.sort as 'newest' | 'popular' | 'rating') || 'newest',
    page: params.page ? parseInt(params.page) : 1,
    limit: 20,
  };

  const { companions, total } = await getPublicCompanions(filters);
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Community</h1>
        <p className="text-slate-400">
          Discover companions created by the community
        </p>
      </div>

      {/* Filters */}
      <CommunityFilters currentFilters={params} />

      {/* Results count */}
      <div className="mb-6 text-sm text-slate-400">
        {total} companion{total !== 1 ? 's' : ''} found
      </div>

      {/* Companion Grid */}
      {companions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {companions.map((companion) => (
            <CompanionFeedCard key={companion.id} companion={companion} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <span className="text-4xl">🔍</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No companions found</h3>
          <p className="text-slate-400">
            Try adjusting your filters or check back later for new companions.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <a
              key={page}
              href={`/community?${new URLSearchParams({
                ...params,
                page: page.toString(),
              }).toString()}`}
              className={`px-4 py-2 rounded-lg transition-colors ${
                page === filters.page
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {page}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
