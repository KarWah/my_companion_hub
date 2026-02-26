import { notFound } from "next/navigation";
import { getPublicCompanionById, incrementCompanionViewCount } from "@/app/actions";
import { ArrowLeft, Eye, MessageSquare, User, Heart, Briefcase, Star, MessageCircle, Sparkles, Smile, AlertCircle, Zap } from "lucide-react";
import Link from "next/link";
import { RatingStars } from "@/components/community/RatingStars";
import { CloneCompanionButton } from "@/components/community/CloneCompanionButton";
import { RateCompanionForm } from "@/components/community/RateCompanionForm";

interface CompanionDetailPageProps {
  params: Promise<{ id: string }>;
}

// Helper to parse extended personality JSON
interface ExtendedPersonality {
  speechStyle?: string;
  speechPattern?: string[];
  behaviorTraits?: string[];
  initiationStyle?: string;
  confidenceLevel?: string;
  emotionalTraits?: string[];
  vulnerabilities?: string[];
  quirks?: string[];
  flirtationStyle?: string;
  humorStyle?: string;
  intimacyPace?: string;
}

function parseExtendedPersonality(json: string | null): ExtendedPersonality | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Tag component for consistent styling
function Tag({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "pink" | "purple" | "blue" | "yellow" | "green" }) {
  const variants = {
    default: "bg-slate-700/50 text-slate-300 border-slate-600",
    pink: "bg-pink-600/20 text-pink-300 border-pink-500/30",
    purple: "bg-purple-600/20 text-purple-300 border-purple-500/30",
    blue: "bg-blue-600/20 text-blue-300 border-blue-500/30",
    yellow: "bg-yellow-600/20 text-yellow-300 border-yellow-500/30",
    green: "bg-green-600/20 text-green-300 border-green-500/30",
  };

  return (
    <span className={`px-3 py-1 text-sm rounded-full border ${variants[variant]}`}>
      {children}
    </span>
  );
}

// Section component for personality categories
function PersonalitySection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <h4 className="text-sm font-medium text-slate-400">{title}</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

export default async function CompanionDetailPage({ params }: CompanionDetailPageProps) {
  const { id } = await params;

  const companion = await getPublicCompanionById(id);

  if (!companion) {
    notFound();
  }

  // Increment view count (fire-and-forget)
  incrementCompanionViewCount(id);

  // Parse extended personality
  const extended = parseExtendedPersonality(companion.extendedPersonality);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Community
        </Link>

        <div className="grid lg:grid-cols-[400px,1fr] gap-8">
          {/* Left Column - Image */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-slate-700">
              {companion.headerImageUrl ? (
                <img
                  src={companion.headerImageUrl}
                  alt={companion.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={96} className="text-slate-500" />
                </div>
              )}

              {/* Style Badge */}
              <div className="absolute top-4 left-4">
                <span
                  className={`px-3 py-1.5 text-sm font-medium rounded-full ${
                    companion.style === "anime"
                      ? "bg-purple-600/90 text-purple-100"
                      : "bg-blue-600/90 text-blue-100"
                  }`}
                >
                  {companion.style}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-center">
                <Eye className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                <div className="text-xl font-bold text-white">{companion.viewCount.toLocaleString()}</div>
                <div className="text-xs text-slate-400">Views</div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-center">
                <MessageSquare className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                <div className="text-xl font-bold text-white">{companion.chatCount.toLocaleString()}</div>
                <div className="text-xs text-slate-400">Chats</div>
              </div>
            </div>

            {/* Creator */}
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="text-sm text-slate-400">Created by</div>
              <div className="text-white font-medium">@{companion.creatorUsername}</div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{companion.name}</h1>
              <div className="flex items-center gap-4 text-slate-400">
                <RatingStars rating={companion.averageRating} count={companion.ratingCount} size="lg" />
                {companion.publishedAt && (
                  <span className="text-sm">
                    Published {new Date(companion.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Info Tags */}
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
                <Heart className="w-4 h-4 text-pink-400" />
                <span className="text-white">{companion.relationship}</span>
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <span className="text-white">{companion.occupation}</span>
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-white">{companion.personalityArchetype}</span>
              </span>
            </div>

            {/* Personality Traits - Tag-based display */}
            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 space-y-5">
              <h3 className="text-lg font-semibold text-white">Personality</h3>

              {/* Communication Style */}
              {(extended?.speechStyle || extended?.initiationStyle || extended?.confidenceLevel) && (
                <PersonalitySection title="Communication" icon={MessageCircle}>
                  {extended?.speechStyle && extended.speechStyle !== 'casual' && (
                    <Tag variant="blue">{extended.speechStyle}</Tag>
                  )}
                  {extended?.initiationStyle && extended.initiationStyle !== 'balanced' && (
                    <Tag variant="blue">{extended.initiationStyle}</Tag>
                  )}
                  {extended?.confidenceLevel && extended.confidenceLevel !== 'confident' && (
                    <Tag variant="blue">{extended.confidenceLevel}</Tag>
                  )}
                </PersonalitySection>
              )}

              {/* Behavior Traits */}
              {extended?.behaviorTraits && extended.behaviorTraits.length > 0 && (
                <PersonalitySection title="Behavior" icon={Zap}>
                  {extended.behaviorTraits.map((trait, i) => (
                    <Tag key={i} variant="purple">{trait}</Tag>
                  ))}
                </PersonalitySection>
              )}

              {/* Emotional Traits */}
              {extended?.emotionalTraits && extended.emotionalTraits.length > 0 && (
                <PersonalitySection title="Emotional Traits" icon={Heart}>
                  {extended.emotionalTraits.map((trait, i) => (
                    <Tag key={i} variant="pink">{trait}</Tag>
                  ))}
                </PersonalitySection>
              )}

              {/* Flirtation & Humor */}
              {(extended?.flirtationStyle || extended?.humorStyle) && (
                <PersonalitySection title="Style" icon={Sparkles}>
                  {extended?.flirtationStyle && extended.flirtationStyle !== 'playful' && (
                    <Tag variant="pink">Flirt: {extended.flirtationStyle}</Tag>
                  )}
                  {extended?.humorStyle && extended.humorStyle !== 'playful' && (
                    <Tag variant="yellow">Humor: {extended.humorStyle}</Tag>
                  )}
                  {extended?.intimacyPace && extended.intimacyPace !== 'natural' && (
                    <Tag variant="pink">Pace: {extended.intimacyPace}</Tag>
                  )}
                </PersonalitySection>
              )}

              {/* Quirks */}
              {extended?.quirks && extended.quirks.length > 0 && (
                <PersonalitySection title="Quirks" icon={Smile}>
                  {extended.quirks.map((quirk, i) => (
                    <Tag key={i} variant="yellow">{quirk}</Tag>
                  ))}
                </PersonalitySection>
              )}

              {/* Vulnerabilities */}
              {extended?.vulnerabilities && extended.vulnerabilities.length > 0 && (
                <PersonalitySection title="Vulnerabilities" icon={AlertCircle}>
                  {extended.vulnerabilities.map((v, i) => (
                    <Tag key={i} variant="default">{v}</Tag>
                  ))}
                </PersonalitySection>
              )}
            </div>

            {/* Interests */}
            {companion.hobbies && companion.hobbies.length > 0 && (
              <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {companion.hobbies.map((hobby, index) => (
                    <Tag key={index} variant="green">{hobby}</Tag>
                  ))}
                </div>
              </div>
            )}

            {/* Secret Desires / Fetishes */}
            {companion.fetishes && companion.fetishes.length > 0 && (
              <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-3">Secret Desires</h3>
                <div className="flex flex-wrap gap-2">
                  {companion.fetishes.map((fetish, index) => (
                    <Tag key={index} variant="purple">{fetish}</Tag>
                  ))}
                </div>
              </div>
            )}

            {/* Clone Button */}
            <div className="p-6 bg-gradient-to-r from-pink-900/30 to-purple-900/30 rounded-xl border border-pink-500/30">
              <h3 className="text-lg font-semibold text-white mb-2">Start Chatting</h3>
              <p className="text-slate-400 text-sm mb-4">
                Add {companion.name} to your companions and start a conversation.
              </p>
              <CloneCompanionButton companion={companion} />
            </div>

            {/* Rate Companion */}
            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">Rate this Companion</h3>
              <RateCompanionForm companionId={companion.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
