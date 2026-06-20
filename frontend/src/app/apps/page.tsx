"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Container,
  Download,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { appsApi, DockerStatus, MarketplaceImage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const DISCLAIMER_KEY = "nexxcloud-dockerhub-marketplace-disclaimer";

function formatCount(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value || 0);
}

function riskClass(risk: MarketplaceImage["risk"]) {
  if (risk === "low") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (risk === "medium") return "border-yellow-400/30 bg-yellow-500/10 text-yellow-100";
  return "border-red-400/30 bg-red-500/10 text-red-100";
}

const accentPalettes = [
  ["#22d3ee", "#8b5cf6"],
  ["#34d399", "#06b6d4"],
  ["#f59e0b", "#ef4444"],
  ["#a78bfa", "#ec4899"],
  ["#60a5fa", "#22d3ee"],
  ["#fb7185", "#f97316"],
];

function accentForImage(image: MarketplaceImage) {
  const seed = image.image.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return accentPalettes[seed % accentPalettes.length];
}

function prettyName(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function AppLogo({ image, colors }: { image: MarketplaceImage; colors: string[] }) {
  const [failed, setFailed] = useState(false);
  const title = prettyName(image.name);
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [image.logoUrl]);

  return (
    <div
      className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] border border-white/15 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
      style={{
        background:
          `linear-gradient(135deg, ${colors[0]}32, ${colors[1]}22), radial-gradient(circle at 30% 18%, rgba(255,255,255,0.26), transparent 42%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{ background: `radial-gradient(circle at 60% 85%, ${colors[0]}55, transparent 58%)` }}
      />
      {image.logoUrl && !failed ? (
        <img
          src={image.logoUrl}
          alt={`${title} logo`}
          className="relative z-10 h-10 max-h-11 w-12 object-contain brightness-110 contrast-110 drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <Container className="absolute h-12 w-12 text-white/[0.08]" />
          <span className="relative z-10 text-lg font-black tracking-tight text-white drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]">
            {initials || "NC"}
          </span>
        </>
      )}
      <div
        className="absolute inset-x-2 bottom-1 h-px opacity-70 blur-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${colors[0]}, transparent)` }}
      />
    </div>
  );
}

function AppsHeader({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  return (
    <div className="h-14 border-b border-white/[0.06] bg-black/25 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-20 safe-pt">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all md:hidden text-white/70 hover:text-white"
          aria-label="Toggle menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-cyan-300" />
          <span className="text-sm text-white/90 font-medium">Docker Hub Apps</span>
        </div>
      </div>
      <Link
        href="/apps/installed"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] text-xs text-white/70 hover:text-white transition-all"
      >
        Installed Apps
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function DisclaimerModal({ onClose }: { onClose: (dontShowAgain: boolean) => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/[0.08] bg-[#0b0818]/95 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10">
              <Container className="h-6 w-6 text-cyan-200" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Docker Hub Marketplace</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Community images need trust checks</h2>
            </div>
          </div>
          <button onClick={() => onClose(false)} className="text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-3 text-sm leading-6 text-white/65">
          <p>Docker Hub contains community-created images. Many are excellent, but some may be outdated, abandoned, misconfigured, undocumented, broken, or incompatible with your setup.</p>
          <p>NexxCloud cannot guarantee that every Docker Hub image will work correctly. Use trusted publishers whenever possible and review warnings before installing.</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={() => onClose(true)}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            Continue and don't show again
          </button>
          <button
            onClick={() => onClose(false)}
            className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function DockerStatusBanner({ status }: { status: DockerStatus | null }) {
  if (!status) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/50">
        Detecting Docker Engine...
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        status.available ? "border-emerald-400/20 bg-emerald-500/5" : "border-yellow-400/25 bg-yellow-500/5"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("h-3 w-3 rounded-full", status.available ? "bg-emerald-400" : "bg-yellow-300")} />
          <div>
            <p className="text-sm font-semibold text-white">
              {status.available ? "Docker Engine ready" : "Docker Engine needs setup"}
            </p>
            <p className="text-xs text-white/45">
              {status.dockerVersion || "Docker CLI not detected"} {status.composeVersion ? `- Compose ${status.composeVersion}` : ""}
            </p>
          </div>
        </div>
        {!status.available && (
          <p className="max-w-lg text-xs leading-5 text-yellow-100/70">
            {status.guidance[0]}
          </p>
        )}
      </div>
    </div>
  );
}

function ImageCard({ image }: { image: MarketplaceImage }) {
  const colors = accentForImage(image);
  const displayName = prettyName(image.name);
  const publisher = image.namespace === "library" ? "Docker Official Images" : image.namespace;
  const category = image.categories[0] || (image.official ? "Official Image" : "Community Image");

  return (
    <Link
      href={`/apps/${encodeURIComponent(image.namespace)}/${encodeURIComponent(image.repository)}`}
      className="group relative min-h-[292px] overflow-hidden rounded-[2rem] border border-white/[0.07] bg-[#090713]/80 p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:bg-white/[0.045] hover:shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
    >
      <div
        className="absolute -right-14 -top-16 h-44 w-44 rounded-full opacity-35 blur-3xl transition-all duration-500 group-hover:opacity-60"
        style={{ background: colors[0] }}
      />
      <div
        className="absolute -bottom-20 left-8 h-48 w-48 rounded-full opacity-20 blur-3xl transition-all duration-500 group-hover:opacity-35"
        style={{ background: colors[1] }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),transparent_38%,rgba(255,255,255,0.025))] opacity-70" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <AppLogo image={image} colors={colors} />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-white">{displayName}</h3>
            <p className="mt-0.5 truncate text-xs text-white/45">{image.image}</p>
            <p className="mt-1 truncate text-[11px] text-white/35">{publisher}</p>
          </div>
        </div>
        <div className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]", riskClass(image.risk))}>
          {image.confidence}%
        </div>
      </div>

      <p className="relative mt-5 line-clamp-3 min-h-[66px] text-[15px] leading-6 text-white/68">
        {image.description}
      </p>

      <div className="relative mt-4 flex flex-wrap gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] text-white/70"
          style={{ borderColor: `${colors[0]}55`, background: `${colors[0]}16` }}
        >
          {category}
        </span>
        {image.official && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Official
          </span>
        )}
        {image.popular && (
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
            <Sparkles className="h-3 w-3" />
            Popular
          </span>
        )}
        {!image.official && !image.verified && (
          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2.5 py-1 text-[11px] text-yellow-100">
            <AlertTriangle className="h-3 w-3" />
            Community
          </span>
        )}
      </div>

      <div className="relative mt-5 grid grid-cols-[1fr_1fr_auto] items-center gap-3 border-t border-white/[0.07] pt-4 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Pulls</p>
          <p className="mt-0.5 font-semibold text-white/70">{formatCount(image.pullCount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Stars</p>
          <p className="mt-0.5 font-semibold text-white/70">{formatCount(image.starCount)}</p>
        </div>
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition group-hover:scale-105 group-hover:text-white"
          aria-label={`Open ${displayName} details`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

export default function AppsMarketplacePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "official" | "verified" | "popular" | "recent">("all");
  const [images, setImages] = useState<MarketplaceImage[]>([]);
  const [sections, setSections] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && hasHydrated && !authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, hasHydrated, authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    setShowDisclaimer(localStorage.getItem(DISCLAIMER_KEY) !== "hidden");
    appsApi.dockerStatus().then((res) => setStatus(res.data.data)).catch(() => setStatus(null));
  }, [mounted, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    appsApi.marketplace({ search: submittedSearch, filter, pageSize: 24 })
      .then((res) => {
        const data = res.data.data;
        setImages(data.results || []);
        setSections(data.sections || null);
      })
      .catch((err) => setError(err.response?.data?.error || "Docker Hub search failed"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, submittedSearch, filter]);

  const heroImages = useMemo(() => {
    if (submittedSearch) return images;
    return sections?.popularImages || images;
  }, [images, sections, submittedSearch]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setSubmittedSearch(search.trim());
  };

  const closeDisclaimer = (dontShowAgain: boolean) => {
    if (dontShowAgain) localStorage.setItem(DISCLAIMER_KEY, "hidden");
    setShowDisclaimer(false);
  };

  if (!mounted || !hasHydrated || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#04020a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AppShell>
      <AppsHeader />
      <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.14),transparent_30%)]" />
            <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">Your Files. Your Apps. Your Server.</p>
                <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Install Docker Hub images without leaving NexxCloud.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
                  Search Docker Hub, review trust signals, inspect image metadata, and install containers with a beginner-friendly flow.
                </p>
              </div>
              <DockerStatusBanner status={status} />
            </div>
          </section>

          <form onSubmit={handleSearch} className="flex flex-col gap-3 rounded-3xl border border-white/[0.06] bg-black/20 p-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Docker Hub: jellyfin, immich, postgres, nginx..."
                className="h-12 w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-300/40"
              />
            </div>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as typeof filter)}
              className="h-12 rounded-2xl border border-white/[0.06] bg-[#0d0a19] px-4 text-sm text-white/80 outline-none"
            >
              <option value="all">All Images</option>
              <option value="official">Official Images</option>
              <option value="verified">Verified Publishers</option>
              <option value="popular">Popular</option>
              <option value="recent">Recently Updated</option>
            </select>
            <button className="h-12 rounded-2xl bg-cyan-400 px-6 text-sm font-semibold text-[#061018] transition hover:bg-cyan-300">
              Search
            </button>
          </form>

          {error && (
            <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}

          {!submittedSearch && sections && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <h2 className="mt-3 text-sm font-semibold text-white">App Images</h2>
                <p className="mt-1 text-xs leading-5 text-white/45">Filtered to hide runtimes, databases, queues, proxies, and raw infrastructure images.</p>
              </div>
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5">
                <Download className="h-5 w-5 text-cyan-300" />
                <h2 className="mt-3 text-sm font-semibold text-white">Popular Apps</h2>
                <p className="mt-1 text-xs leading-5 text-white/45">Ranked from live pull and star counts returned by Docker Hub.</p>
              </div>
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5">
                <Sparkles className="h-5 w-5 text-purple-300" />
                <h2 className="mt-3 text-sm font-semibold text-white">Recently Updated</h2>
                <p className="mt-1 text-xs leading-5 text-white/45">Fresh app-style images, refreshed dynamically from Docker Hub.</p>
              </div>
            </div>
          )}

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/35">
                  {submittedSearch ? "Search Results" : "Docker Hub Marketplace"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {submittedSearch ? `Results for "${submittedSearch}"` : "Popular app images"}
                </h2>
              </div>
              {loading && <span className="text-xs text-white/40">Loading Docker Hub...</span>}
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="h-64 animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.025]" />
                ))}
              </div>
            ) : heroImages.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {heroImages.map((image: MarketplaceImage) => (
                  <ImageCard key={`${image.namespace}/${image.repository}`} image={image} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-10 text-center">
                <Container className="mx-auto h-10 w-10 text-white/25" />
                <h3 className="mt-4 text-lg font-semibold text-white">No Docker Hub images found</h3>
                <p className="mt-2 text-sm text-white/45">Try a repository name like nginx, postgres, jellyfin, vaultwarden, or redis.</p>
              </div>
            )}
          </section>
        </div>
      </main>
      {showDisclaimer && <DisclaimerModal onClose={closeDisclaimer} />}
    </AppShell>
  );
}
