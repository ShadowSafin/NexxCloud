"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Container,
  ExternalLink,
  Loader2,
  Menu,
  Play,
  Plus,
  ShieldAlert,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { appsApi, MarketplaceImageDetails } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

function formatCount(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value || 0);
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "Unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function riskClass(risk: MarketplaceImageDetails["risk"]) {
  if (risk === "low") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
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

function accentForImage(image: MarketplaceImageDetails) {
  const seed = image.image.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return accentPalettes[seed % accentPalettes.length];
}

function prettyName(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DetailLogo({ image }: { image: MarketplaceImageDetails }) {
  const [failed, setFailed] = useState(false);
  const colors = accentForImage(image);
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
      className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.6rem] border border-white/15 shadow-[0_22px_60px_rgba(0,0,0,0.42)]"
      style={{
        background:
          `linear-gradient(135deg, ${colors[0]}34, ${colors[1]}22), radial-gradient(circle at 30% 18%, rgba(255,255,255,0.26), transparent 42%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{ background: `radial-gradient(circle at 60% 85%, ${colors[0]}55, transparent 58%)` }}
      />
      {image.logoUrl && !failed ? (
        <img
          src={image.logoUrl}
          alt={`${title} logo`}
          className="relative z-10 h-12 max-h-14 w-14 object-contain brightness-110 contrast-110 drop-shadow-[0_12px_22px_rgba(0,0,0,0.45)]"
          loading="eager"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <Container className="absolute h-14 w-14 text-white/[0.08]" />
          <span className="relative z-10 text-xl font-black tracking-tight text-white drop-shadow-[0_12px_22px_rgba(0,0,0,0.45)]">
            {initials || "NC"}
          </span>
        </>
      )}
      <div
        className="absolute inset-x-3 bottom-1 h-px opacity-75 blur-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${colors[0]}, transparent)` }}
      />
    </div>
  );
}

function DetailsHeader({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
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
        <Link href="/apps" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Docker Hub
        </Link>
      </div>
      <Link href="/apps/installed" className="text-xs text-white/50 hover:text-white">
        Installed Apps
      </Link>
    </div>
  );
}

function InstallWarning({
  open,
  installing,
  onCancel,
  onContinue,
}: {
  open: boolean;
  installing: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4">
      <div className="w-full max-w-lg rounded-3xl border border-yellow-400/20 bg-[#0b0818]/95 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/25 bg-yellow-500/10">
              <ShieldAlert className="h-6 w-6 text-yellow-100" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-yellow-100/70">Docker Hub Image</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Install only images you trust</h2>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/40 hover:text-white" disabled={installing}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 space-y-3 text-sm leading-6 text-white/65">
          <p>This image comes directly from Docker Hub. NexxCloud does not verify every image available there.</p>
          <p>Some images may fail to start, require additional setup, contain bugs, be outdated, or not work with your system.</p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={installing}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            disabled={installing}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {installing && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue Installation
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DockerHubDetailsPage() {
  const params = useParams<{ namespace: string; repository: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [details, setDetails] = useState<MarketplaceImageDetails | null>(null);
  const [tag, setTag] = useState("latest");
  const [appName, setAppName] = useState("");
  const [hostPort, setHostPort] = useState("");
  const [containerPort, setContainerPort] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && hasHydrated && !authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, hasHydrated, authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !params?.namespace || !params?.repository) return;
    setLoading(true);
    appsApi.marketplaceDetails(params.namespace, params.repository)
      .then((res) => {
        const data = res.data.data;
        setDetails(data);
        setTag(data.latestTag || "latest");
        setAppName(data.name);
      })
      .catch((err) => setError(err.response?.data?.error || "Could not load Docker Hub image"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, params?.namespace, params?.repository]);

  const selectedTag = useMemo(
    () => details?.tags.find((item) => item.name === tag),
    [details, tag]
  );

  const analyze = async (pull = false) => {
    if (!details) return;
    setAnalyzing(true);
    setError(null);
    try {
      const response = await appsApi.analyze({ image: details.image, tag, pull });
      setAnalysis(response.data.data);
      const suggested = response.data.data.suggestedPorts?.[0];
      if (suggested && !containerPort) {
        setContainerPort(String(suggested.containerPort));
        setHostPort(suggested.hostPort ? String(suggested.hostPort) : "");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Image analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const submitInstall = (event: FormEvent) => {
    event.preventDefault();
    setShowWarning(true);
  };

  const continueInstall = async () => {
    if (!details) return;
    setInstalling(true);
    setError(null);
    try {
      const ports = containerPort
        ? [{
            containerPort: Number(containerPort),
            hostPort: hostPort ? Number(hostPort) : null,
            protocol: "tcp" as const,
          }]
        : undefined;
      const response = await appsApi.install({
        image: details.image,
        tag,
        name: appName,
        ports,
        restartPolicy: "unless-stopped",
      });
      router.push(`/apps/installing/${response.data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Install failed");
    } finally {
      setInstalling(false);
      setShowWarning(false);
    }
  };

  if (!mounted || !hasHydrated || authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#04020a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!details) {
    return (
      <AppShell>
        <DetailsHeader />
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div>
            <AlertTriangle className="mx-auto h-10 w-10 text-yellow-200" />
            <h1 className="mt-4 text-xl font-semibold text-white">Image not found</h1>
            <p className="mt-2 text-sm text-white/45">{error || "Docker Hub did not return this repository."}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <DetailsHeader />
      <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}

          <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.12),transparent_30%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="flex items-center gap-5">
                  <DetailLogo image={details} />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                      {details.namespace === "library" ? "Docker Official Image" : `${details.namespace} image`}
                    </p>
                    <h1 className="mt-1 truncate text-3xl font-semibold text-white sm:text-4xl">{details.image}</h1>
                  </div>
                </div>

                <p className="mt-5 max-w-3xl text-sm leading-6 text-white/65">{details.description}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {details.official && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Official Image
                    </span>
                  )}
                  {details.popular && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                      <Sparkles className="h-3.5 w-3.5" />
                      Popular Image
                    </span>
                  )}
                  <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs", riskClass(details.risk))}>
                    {details.confidence}% confidence
                  </span>
                </div>
              </div>

              <form onSubmit={submitInstall} className="rounded-3xl border border-white/[0.08] bg-black/25 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Install Image</h2>
                    <p className="mt-1 text-xs text-white/45">NexxCloud will pull, inspect, and create a managed Compose app.</p>
                  </div>
                  <Play className="h-5 w-5 text-cyan-200" />
                </div>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-xs text-white/45">App name</span>
                    <input
                      value={appName}
                      onChange={(event) => setAppName(event.target.value)}
                      className="mt-2 h-11 w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 text-sm text-white outline-none focus:border-cyan-300/40"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs text-white/45">Tag</span>
                    <select
                      value={tag}
                      onChange={(event) => setTag(event.target.value)}
                      className="mt-2 h-11 w-full rounded-2xl border border-white/[0.06] bg-[#0d0a19] px-4 text-sm text-white outline-none"
                    >
                      {details.tags.map((item) => (
                        <option key={item.name} value={item.name}>{item.name}</option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs text-white/45">Host port optional</span>
                      <input
                        value={hostPort}
                        onChange={(event) => setHostPort(event.target.value.replace(/\D/g, ""))}
                        placeholder="auto"
                        className="mt-2 h-11 w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 text-sm text-white outline-none focus:border-cyan-300/40"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-white/45">Container port optional</span>
                      <input
                        value={containerPort}
                        onChange={(event) => setContainerPort(event.target.value.replace(/\D/g, ""))}
                        placeholder="auto"
                        className="mt-2 h-11 w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 text-sm text-white outline-none focus:border-cyan-300/40"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs leading-5 text-white/45">
                    Storage mapper groundwork is preserved in the installer metadata. Direct NexxCloud folder mounts require a materialized storage bridge because drive folders are metadata over content-addressed blobs.
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => analyze(false)}
                    disabled={analyzing}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70 hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                    Analyze
                  </button>
                  <button
                    type="submit"
                    disabled={installing}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#061018] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {installing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Install
                  </button>
                </div>
              </form>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-6">
              <h2 className="text-lg font-semibold text-white">Docker Hub metadata</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs text-white/40">Pulls</p>
                  <p className="mt-1 text-xl font-semibold text-white">{formatCount(details.pullCount)}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs text-white/40">Stars</p>
                  <p className="mt-1 text-xl font-semibold text-white">{formatCount(details.starCount)}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs text-white/40">Storage Size</p>
                  <p className="mt-1 text-xl font-semibold text-white">{formatBytes(details.storageSize)}</p>
                </div>
              </div>

              {analysis && (
                <div className="mt-6 rounded-2xl border border-cyan-400/15 bg-cyan-500/5 p-4">
                  <h3 className="text-sm font-semibold text-cyan-100">Image analysis</h3>
                  <div className="mt-3 grid gap-3 text-xs text-white/55 sm:grid-cols-2">
                    <p>Exposed ports: {analysis.exposedPorts?.length ? analysis.exposedPorts.map((p: any) => `${p.containerPort}/${p.protocol}`).join(", ") : "Not detected yet"}</p>
                    <p>Volumes: {analysis.volumes?.length ? analysis.volumes.map((v: any) => v.containerPath).join(", ") : "None detected"}</p>
                    <p>Healthcheck: {analysis.healthcheck ? "Yes" : "No"}</p>
                    <p>User: {analysis.user || "root/default"}</p>
                  </div>
                  {[...(analysis.warnings || []), ...(analysis.securityWarnings || [])].length > 0 && (
                    <div className="mt-4 space-y-2">
                      {[...(analysis.warnings || []), ...(analysis.securityWarnings || [])].map((warning: string) => (
                        <p key={warning} className="flex gap-2 text-xs text-yellow-100/75">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5">
                <h2 className="text-sm font-semibold text-white">Selected tag</h2>
                <p className="mt-2 text-2xl font-semibold text-white">{tag}</p>
                <p className="mt-1 text-xs text-white/45">{selectedTag?.lastUpdated ? `Updated ${new Date(selectedTag.lastUpdated).toLocaleDateString()}` : "Update date unknown"}</p>
                <p className="mt-2 text-xs text-white/45">{formatBytes(selectedTag?.size || null)}</p>
              </div>

              <a
                href={details.dockerHubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5 text-sm text-white/70 hover:border-cyan-300/25 hover:text-white"
              >
                Open on Docker Hub
                <ExternalLink className="h-4 w-4" />
              </a>
            </aside>
          </div>
        </div>
      </main>
      <InstallWarning
        open={showWarning}
        installing={installing}
        onCancel={() => setShowWarning(false)}
        onContinue={continueInstall}
      />
    </AppShell>
  );
}
