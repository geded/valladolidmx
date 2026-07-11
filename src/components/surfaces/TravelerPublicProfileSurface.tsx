/**
 * TravelerPublicProfileSurface — Superficie pública `/viajero/:handle`.
 * V1 minimalista (E5.3): identidad básica + bio. Sin favoritos ni planes.
 */
import { Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import type { PublicTravelerProfile } from "@/lib/traveler/traveler-public.functions";
import type { PublicReviewerStats } from "@/lib/reviews/reviewer-stats.functions";
import { ReviewerBadge } from "@/components/traveler/ReviewerBadge";

function initials(name: string | null, handle: string): string {
  const src = (name ?? handle).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return handle.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function TravelerPublicProfileSurface({
  profile,
  reviewerStats,
}: {
  profile: PublicTravelerProfile;
  reviewerStats?: PublicReviewerStats;
}) {
  const displayName = profile.display_name?.trim() || profile.handle;
  return (
    <PublicShell
      eyebrow="Viajero"
      title={displayName}
      description={`@${profile.handle}`}
      crumbs={[
        { label: "Viajeros", to: "/oriente-maya" as never },
        { label: `@${profile.handle}` },
      ]}
    >
      <section className="mx-auto grid max-w-2xl gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              width={128}
              height={128}
              className="h-32 w-32 rounded-full border border-border object-cover shadow-sm"
              loading="eager"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full border border-border bg-muted text-3xl font-medium text-muted-foreground">
              {initials(profile.display_name, profile.handle)}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{displayName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">@{profile.handle}</p>
          </div>
          {profile.bio ? (
            <p className="max-w-lg text-pretty text-sm leading-relaxed text-foreground/80">
              {profile.bio}
            </p>
          ) : null}
          {reviewerStats && reviewerStats.isReviewerVerified ? (
            <ReviewerBadge
              verifiedCount={reviewerStats.verifiedCount}
              isReviewerVerified={reviewerStats.isReviewerVerified}
              size="md"
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {profile.home_country ? (
            <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
              Desde {profile.home_country}
            </span>
          ) : null}
          {profile.languages.map((lang) => (
            <span
              key={lang}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground uppercase tracking-wide"
            >
              {lang}
            </span>
          ))}
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Pronto podrás ver los planes de viaje, favoritos y recomendaciones
            que este viajero decida compartir.
          </p>
          <Link
            to="/arma-tu-viaje"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Arma tu propio viaje →
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}