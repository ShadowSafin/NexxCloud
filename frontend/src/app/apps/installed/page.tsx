"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Container,
  ExternalLink,
  Loader2,
  Menu,
  Play,
  RefreshCw,
  RotateCw,
  Square,
  Terminal,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { appsApi, InstalledApp } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

function InstalledHeader({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
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
          Apps
        </Link>
      </div>
      <Link href="/apps" className="text-xs text-cyan-200/80 hover:text-cyan-100">
        Browse Docker Hub
      </Link>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "running") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  if (status === "error" || status === "restarting") return "border-red-400/25 bg-red-500/10 text-red-100";
  if (status === "installing") return "border-yellow-400/25 bg-yellow-500/10 text-yellow-100";
  return "border-white/[0.08] bg-white/[0.03] text-white/55";
}

function parseCpuPercent(value?: string | null) {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCpuCores(value?: string | null) {
  const percent = parseCpuPercent(value);
  if (percent == null) return "Unknown";
  if (percent < 100) return `${percent.toFixed(2)}%`;
  return `${(percent / 100).toFixed(1)} cores`;
}

type RuntimePortMapping = NonNullable<NonNullable<InstalledApp["runtime"]>["portMappings"]>[number];

function browserHostUrls(mapping: RuntimePortMapping) {
  if (typeof window === "undefined" || mapping.protocol !== "tcp") return [];
  const host = window.location.hostname;
  if (!host || host === "0.0.0.0" || host === "::") return [];
  const scheme = mapping.containerPort === 443 ? "https" : "http";
  return [`${scheme}://${host}:${mapping.hostPort}`];
}

function connectionRows(app: InstalledApp) {
  return (app.runtime?.portMappings || []).map((mapping) => ({
    ...mapping,
    urls: [...new Set([...browserHostUrls(mapping), ...(mapping.urls || [])])],
  }));
}

const BRAND_LOGOS: Record<string, string> = {
  amazonlinux: "amazonaws/ff9900",
  elasticsearch: "elasticsearch/005571",
  grafana: "grafana/f46800",
  influxdb: "influxdb/22adf6",
  jellyfin: "jellyfin/00a4dc",
  mariadb: "mariadb/003545",
  mongo: "mongodb/47a248",
  mongodb: "mongodb/47a248",
  mysql: "mysql/4479a1",
  nextcloud: "nextcloud/0082c9",
  nginx: "nginx/009639",
  node: "nodedotjs/5fa04e",
  php: "php/777bb4",
  postgres: "postgresql/4169e1",
  postgresql: "postgresql/4169e1",
  python: "python/3776ab",
  rabbitmq: "rabbitmq/ff6600",
  redis: "redis/dc382d",
  ruby: "ruby/cc342d",
  sonarqube: "sonarqube/4e9bcd",
  ubuntu: "ubuntu/e95420",
};

function inferredBrandLogo(app: InstalledApp) {
  const imageName = (app.image || app.slug || app.name || "")
    .replace(/^docker\.io\//, "")
    .split(":")[0]
    .split("/")
    .pop()
    ?.toLowerCase();
  const simpleIcon = imageName ? BRAND_LOGOS[imageName] : null;
  return simpleIcon ? `https://cdn.simpleicons.org/${simpleIcon}` : null;
}

function appLogoUrl(app: InstalledApp) {
  return app.icon || app.metadata?.marketplace?.logoUrl || inferredBrandLogo(app);
}

function InstalledAppLogo({ app }: { app: InstalledApp }) {
  const [failed, setFailed] = useState(false);
  const logo = appLogoUrl(app);

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/15 bg-cyan-500/10 text-cyan-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.2),transparent_38%),radial-gradient(circle_at_70%_90%,rgba(34,211,238,0.38),transparent_58%)]" />
      {logo && !failed ? (
        <img
          src={logo}
          alt={`${app.name} logo`}
          className="relative z-10 h-7 w-8 object-contain brightness-110 contrast-110 drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Container className="relative z-10 h-6 w-6" />
      )}
    </div>
  );
}

function LogsModal({ app, logs, onClose }: { app: InstalledApp; logs: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4">
      <div className="flex h-[78vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#080612] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-cyan-200" />
            <div>
              <h2 className="text-sm font-semibold text-white">{app.name} logs</h2>
              <p className="text-xs text-white/40">{app.composeProject}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:text-white">
            Close
          </button>
        </div>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap bg-black/40 p-4 font-mono text-xs leading-5 text-cyan-50/75">
          {logs || "No logs returned."}
        </pre>
      </div>
    </div>
  );
}

export default function InstalledAppsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logsApp, setLogsApp] = useState<InstalledApp | null>(null);
  const [logs, setLogs] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && hasHydrated && !authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, hasHydrated, authLoading, isAuthenticated, router]);

  const loadInstalled = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await appsApi.installed();
      setApps(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not load installed apps");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadInstalled();
    }
  }, [isAuthenticated]);

  const runAction = async (app: InstalledApp, action: "start" | "stop" | "restart" | "update" | "remove") => {
    setBusyId(app.id);
    setError(null);
    try {
      await appsApi.action(app.id, action);
      await loadInstalled();
    } catch (err: any) {
      setError(err.response?.data?.error || `${action} failed`);
    } finally {
      setBusyId(null);
    }
  };

  const openLogs = async (app: InstalledApp) => {
    setBusyId(app.id);
    setError(null);
    try {
      const response = await appsApi.logs(app.id, 700);
      setLogs(response.data.data.logs);
      setLogsApp(app);
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not load logs");
    } finally {
      setBusyId(null);
    }
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
      <InstalledHeader />
      <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.12),transparent_30%)]" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">Installed Apps</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Your server apps</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
                  Start, stop, update, open, remove, and inspect Docker Hub apps managed by NexxCloud.
                </p>
              </div>
              <button
                onClick={loadInstalled}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-72 animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.025]" />
              ))}
            </div>
          ) : apps.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-12 text-center">
              <Container className="mx-auto h-12 w-12 text-white/25" />
              <h2 className="mt-4 text-xl font-semibold text-white">No apps installed yet</h2>
              <p className="mt-2 text-sm text-white/45">Search Docker Hub and install your first managed app.</p>
              <Link
                href="/apps"
                className="mt-6 inline-flex rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#061018] hover:bg-cyan-300"
              >
                Browse Docker Hub
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {apps.map((app) => {
                const busy = busyId === app.id;
                const stats = app.runtime?.stats?.[0];
                const connections = connectionRows(app);
                const openUrl = connections[0]?.urls[0] || app.appUrl;
                return (
                  <article
                    key={app.id}
                    className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.04]"
                  >
                    <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-cyan-500/10 blur-3xl opacity-50" />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <InstalledAppLogo app={app} />
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold text-white">{app.name}</h2>
                          <p className="truncate text-xs text-white/40">{app.image}</p>
                        </div>
                      </div>
                      <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize", statusClass(app.status))}>
                        {app.status}
                      </span>
                    </div>

                    {app.lastError && (
                      <p className="relative mt-4 flex gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-xs leading-5 text-red-100/80">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {app.lastError}
                      </p>
                    )}

                    <div className="relative mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/35">CPU</p>
                        <p className="mt-1 text-sm font-semibold text-white">{formatCpuCores(stats?.cpu)}</p>
                        {stats?.cpu && <p className="mt-1 text-[10px] text-white/35">{stats.cpu} raw</p>}
                      </div>
                      <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/35">RAM</p>
                        <p className="mt-1 text-sm font-semibold text-white">{stats?.memory || "Unknown"}</p>
                      </div>
                    </div>

                    <div className="relative mt-4 rounded-2xl border border-white/[0.06] bg-black/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-white/35">Network access</p>
                      {connections.length === 0 ? (
                        <p className="mt-1 text-xs text-white/40">No published host ports</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {connections.slice(0, 2).map((mapping) => (
                            <div key={`${mapping.hostIp}-${mapping.hostPort}-${mapping.containerPort}-${mapping.protocol}`} className="min-w-0">
                              <p className="text-[11px] text-white/40">
                                {mapping.hostPort} → {mapping.containerPort}/{mapping.protocol}
                              </p>
                              {mapping.urls[0] ? (
                                <a
                                  href={mapping.urls[0]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 block truncate font-mono text-xs text-cyan-100 hover:text-cyan-50"
                                >
                                  {mapping.urls[0]}
                                </a>
                              ) : (
                                <p className="mt-1 font-mono text-xs text-white/45">
                                  {mapping.hostIp}:{mapping.hostPort}
                                </p>
                              )}
                            </div>
                          ))}
                          {connections.length > 2 && (
                            <p className="text-[11px] text-white/35">+{connections.length - 2} more in Monitor</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/apps/installing/${app.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/20"
                      >
                        <Activity className="h-3.5 w-3.5" />
                        Monitor
                      </Link>
                      <button
                        onClick={() => openUrl && window.open(openUrl, "_blank", "noopener,noreferrer")}
                        disabled={!openUrl}
                        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </button>
                      <button
                        onClick={() => openLogs(app)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/65 hover:text-white disabled:opacity-40"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Terminal className="h-3.5 w-3.5" />}
                        Logs
                      </button>
                      <button
                        onClick={() => runAction(app, app.status === "running" ? "stop" : "start")}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/65 hover:text-white disabled:opacity-40"
                      >
                        {app.status === "running" ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {app.status === "running" ? "Stop" : "Start"}
                      </button>
                      <button
                        onClick={() => runAction(app, "restart")}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/65 hover:text-white disabled:opacity-40"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        Restart
                      </button>
                      <button
                        onClick={() => runAction(app, "update")}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/65 hover:text-white disabled:opacity-40"
                      >
                        <Activity className="h-3.5 w-3.5" />
                        Update
                      </button>
                      <button
                        onClick={() => runAction(app, "remove")}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-100 hover:bg-red-500/20 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      {logsApp && <LogsModal app={logsApp} logs={logs} onClose={() => setLogsApp(null)} />}
    </AppShell>
  );
}
