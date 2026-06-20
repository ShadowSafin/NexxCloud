"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Container,
  ExternalLink,
  Gauge,
  HardDrive,
  Loader2,
  Menu,
  Network,
  Play,
  RefreshCw,
  RotateCw,
  Square,
  Terminal,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { appsApi, InstalledApp } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

type InstallStage =
  | "queued"
  | "pulling"
  | "analyzing"
  | "writing-compose"
  | "starting"
  | "running"
  | "error";

interface InstallProgress {
  stage?: InstallStage;
  percent?: number;
  message?: string;
  logs?: string[];
  updatedAt?: string;
}

const stages: Array<{ key: InstallStage; label: string; description: string }> = [
  { key: "queued", label: "Queued", description: "Workspace created" },
  { key: "pulling", label: "Pulling", description: "Image download" },
  { key: "analyzing", label: "Analyzing", description: "Ports and volumes" },
  { key: "writing-compose", label: "Compose", description: "Managed config" },
  { key: "starting", label: "Starting", description: "Containers booting" },
  { key: "running", label: "Live", description: "Runtime stats" },
];

function InstallHeader({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
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
        <Link href="/apps/installed" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Installed Apps
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
  return "border-white/[0.08] bg-white/[0.03] text-white/60";
}

function progressFromApp(app: InstalledApp | null): InstallProgress {
  if (app?.status === "restarting") {
    return {
      stage: "error",
      percent: 100,
      message: "Container is restarting. This image may need a long-running server command or app-specific configuration.",
    };
  }
  const progress = app?.metadata?.installProgress;
  if (progress && typeof progress === "object") return progress;
  if (app?.status === "running") return { stage: "running", percent: 100, message: "App is running." };
  if (app?.status === "error") return { stage: "error", percent: 100, message: app.lastError || "Installation failed." };
  if (app?.status === "stopped") return { stage: "error", percent: 100, message: "App is stopped." };
  return { stage: "queued", percent: 0, message: "Waiting for installation to start." };
}

function parseCpuPercent(value?: string | null) {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCpuCores(value?: string | null) {
  const percent = parseCpuPercent(value);
  if (percent == null) return "Waiting";
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

function connectionRows(app: InstalledApp | null) {
  return (app?.runtime?.portMappings || []).map((mapping) => ({
    ...mapping,
    urls: [...new Set([...browserHostUrls(mapping), ...(mapping.urls || [])])],
  }));
}

function logoUrl(app: InstalledApp | null) {
  return app?.icon || app?.metadata?.marketplace?.logoUrl || null;
}

function AppLogo({ app }: { app: InstalledApp | null }) {
  const [failed, setFailed] = useState(false);
  const url = logoUrl(app);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.6rem] border border-cyan-300/20 bg-cyan-500/10 shadow-[0_22px_70px_rgba(34,211,238,0.12)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.22),transparent_38%),radial-gradient(circle_at_65%_90%,rgba(34,211,238,0.42),transparent_55%)]" />
      {url && !failed ? (
        <img
          src={url}
          alt={`${app?.name || "Docker app"} logo`}
          className="relative z-10 h-12 w-14 object-contain brightness-110 contrast-110 drop-shadow-[0_12px_22px_rgba(0,0,0,0.45)]"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Container className="relative z-10 h-9 w-9 text-cyan-100" />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub?: string | null;
}) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{label}</p>
        <Icon className="h-4 w-4 text-cyan-200/80" />
      </div>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  );
}

export default function DockerAppInstallPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [app, setApp] = useState<InstalledApp | null>(null);
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && hasHydrated && !authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, hasHydrated, authLoading, isAuthenticated, router]);

  const progress = useMemo(() => progressFromApp(app), [app]);
  const percent = Math.max(0, Math.min(progress.percent ?? 0, 100));
  const currentStageIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.key === progress.stage)
  );
  const primaryStats = app?.runtime?.stats?.[0] || null;
  const containers = app?.runtime?.containers || [];
  const connections = connectionRows(app);
  const appUrl = connections[0]?.urls[0] || app?.runtime?.appUrl || app?.appUrl;

  const loadApp = useCallback(async (quiet = false) => {
    if (!params?.id) return;
    if (!quiet) setLoading(true);
    try {
      const response = await appsApi.installedById(params.id);
      setApp(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not load app install state");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [params?.id]);

  const loadLogs = useCallback(async () => {
    if (!params?.id) return;
    try {
      const response = await appsApi.logs(params.id, 500);
      setLogs(response.data.data.logs || "");
    } catch {
      setLogs("");
    }
  }, [params?.id]);

  useEffect(() => {
    if (!isAuthenticated || !params?.id) return;
    loadApp(false);
    loadLogs();
    const appTimer = window.setInterval(() => loadApp(true), 1500);
    const logsTimer = window.setInterval(loadLogs, 2500);
    return () => {
      window.clearInterval(appTimer);
      window.clearInterval(logsTimer);
    };
  }, [isAuthenticated, params?.id, loadApp, loadLogs]);

  const runAction = async (action: "start" | "stop" | "restart" | "update") => {
    if (!app) return;
    setBusy(true);
    setError(null);
    try {
      await appsApi.action(app.id, action);
      await loadApp(true);
      await loadLogs();
    } catch (err: any) {
      setError(err.response?.data?.error || `${action} failed`);
    } finally {
      setBusy(false);
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

  return (
    <AppShell>
      <InstallHeader />
      <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}

          <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.14),transparent_32%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_360px]">
              <div>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <AppLogo app={app} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">Docker App Installation</p>
                      {app && (
                        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize", statusClass(app.status))}>
                          {app.status}
                        </span>
                      )}
                    </div>
                    <h1 className="mt-2 truncate text-3xl font-semibold text-white sm:text-5xl">{app?.name || "Installing app"}</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
                      {progress.message || app?.description || "NexxCloud is preparing the Docker app."}
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between text-xs text-white/45">
                    <span>{progress.stage === "error" ? "Install failed" : "Install progress"}</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full border border-white/[0.06] bg-white/[0.04]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        progress.stage === "error"
                          ? "bg-red-400"
                          : "bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-300"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {stages.map((stage, index) => {
                    const done = progress.stage === "error" ? false : index < currentStageIndex || progress.stage === "running";
                    const active = progress.stage === stage.key;
                    return (
                      <div
                        key={stage.key}
                        className={cn(
                          "rounded-2xl border p-3 transition-all",
                          done && "border-emerald-400/20 bg-emerald-500/10",
                          active && "border-cyan-300/30 bg-cyan-500/10",
                          !done && !active && "border-white/[0.06] bg-black/20"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-white">{stage.label}</p>
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                          ) : active ? (
                            <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-white/20" />
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-white/40">{stage.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-3xl border border-white/[0.06] bg-black/25 p-5">
                <h2 className="text-lg font-semibold text-white">Runtime controls</h2>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  This panel stays live after installation, so you can watch the app settle in.
                </p>
                <div className="mt-5 space-y-3">
                  <button
                    onClick={() => appUrl && window.open(appUrl, "_blank", "noopener,noreferrer")}
                    disabled={!appUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#061018] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open App
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => runAction(app?.status === "running" ? "stop" : "start")}
                      disabled={!app || busy || app.status === "installing"}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                    >
                      {app?.status === "running" ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {app?.status === "running" ? "Stop" : "Start"}
                    </button>
                    <button
                      onClick={() => runAction("restart")}
                      disabled={!app || busy || app.status === "installing"}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                    >
                      <RotateCw className={cn("h-4 w-4", busy && "animate-spin")} />
                      Restart
                    </button>
                  </div>
                  <button
                    onClick={() => runAction("update")}
                    disabled={!app || busy || app.status === "installing"}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                  >
                    <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
                    Pull Update
                  </button>
                </div>
              </aside>
            </div>
          </section>

          {app?.lastError && (
            <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{app.lastError}</span>
              </div>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <section className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={Gauge}
                  label="CPU"
                  value={formatCpuCores(primaryStats?.cpu)}
                  sub={primaryStats?.cpu ? `${primaryStats.cpu} raw Docker CPU` : "No sample yet"}
                />
                <StatCard icon={Activity} label="Memory" value={primaryStats?.memory || "Waiting"} sub={primaryStats?.memoryPercent || "No sample yet"} />
                <StatCard icon={Network} label="Network" value={primaryStats?.network || "Waiting"} sub="Ingress and egress" />
                <StatCard icon={HardDrive} label="Disk IO" value={primaryStats?.block || "Waiting"} sub="Read and write" />
              </div>

              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Connect from another device</h2>
                    <p className="mt-1 text-xs text-white/40">
                      Use these host IP and port URLs from phones, TVs, or other computers on the same network.
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                    {connections.length} port{connections.length === 1 ? "" : "s"}
                  </span>
                </div>

                {connections.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-yellow-400/15 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100/80">
                    No host ports are published for this container yet. Add or expose a web port during install to connect from other devices.
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {connections.map((mapping) => (
                      <div
                        key={`${mapping.hostIp}-${mapping.hostPort}-${mapping.containerPort}-${mapping.protocol}`}
                        className="rounded-2xl border border-white/[0.06] bg-black/20 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              Host port {mapping.hostPort} → container {mapping.containerPort}/{mapping.protocol}
                            </p>
                            <p className="mt-1 text-xs text-white/40">Docker bind: {mapping.hostIp}</p>
                          </div>
                          <span className="w-fit rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/55">
                            {mapping.protocol.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {mapping.urls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-100 hover:bg-cyan-500/20"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{url}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Containers</h2>
                    <p className="mt-1 text-xs text-white/40">Refreshed every 1.5 seconds while this page is open.</p>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                    {containers.length} active
                  </span>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.06]">
                  {containers.length === 0 ? (
                    <div className="p-6 text-sm text-white/45">Containers will appear here once Compose starts the app.</div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full min-w-[680px] text-left text-sm">
                        <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-white/35">
                          <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Image</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Started</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                          {containers.map((container) => (
                            <tr key={container.id} className="text-white/70">
                              <td className="px-4 py-3 font-medium text-white">{container.name}</td>
                              <td className="px-4 py-3 text-white/50">{container.image || app?.image}</td>
                              <td className="px-4 py-3 capitalize">{container.status}</td>
                              <td className="px-4 py-3 text-white/45">
                                {container.startedAt ? new Date(container.startedAt).toLocaleString() : "Not started"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside className="rounded-3xl border border-white/[0.06] bg-white/[0.025] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-cyan-200" />
                  <h2 className="text-lg font-semibold text-white">Live logs</h2>
                </div>
                <button
                  onClick={() => {
                    loadApp(true);
                    loadLogs();
                  }}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/65 hover:text-white"
                >
                  Refresh
                </button>
              </div>
              <pre className="mt-4 h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/[0.06] bg-black/40 p-4 font-mono text-xs leading-5 text-cyan-50/75">
                {logs || (progress.logs || []).join("\n") || "Waiting for Docker output..."}
              </pre>
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
