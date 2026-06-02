import {
  Activity,
  Container,
  Download,
  FileText,
  Film,
  Folder,
  HardDrive,
  Music,
  Network,
  Search,
  Server,
  Share2,
  Upload,
} from "lucide-react";

const categories = [
  { name: "Folders", size: "12 folders", icon: Folder, accent: "text-brand-cyan bg-brand-cyan/10" },
  { name: "Recordings", size: "62 videos", icon: Film, accent: "text-blue-400 bg-blue-500/10" },
  { name: "Documents", size: "841 files", icon: FileText, accent: "text-emerald-400 bg-emerald-500/10" },
  { name: "Audio", size: "320 tracks", icon: Music, accent: "text-rose-400 bg-rose-500/10" },
];

const apps = [
  { name: "Jellyfin", image: "jellyfin/jellyfin", status: "Running", url: "192.168.0.187:8096" },
  { name: "Ubuntu", image: "library/ubuntu", status: "Live", url: "192.168.0.187:2222" },
];

export default function DashboardMockup() {
  return (
    <div
      id="dashboard-preview"
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/20 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <div className="ml-3 flex min-w-0 items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-xs text-zinc-400">
          <HardDrive className="h-3.5 w-3.5 text-brand-cyan" />
          <span className="truncate">nexxcloud.local / drive</span>
        </div>
        <span className="ml-auto hidden rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-2.5 py-1 text-[10px] font-mono text-brand-cyan sm:block">
          FILES + APPS
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr]">
        <aside className="hidden border-r border-white/10 bg-black/20 p-4 md:flex md:flex-col">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Library</p>
          <div className="space-y-1 text-[13px]">
            {[
              { label: "All files", icon: Folder, active: true },
              { label: "Apps", icon: Container },
              { label: "Installed Apps", icon: Server },
              { label: "Shared", icon: Share2 },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${item.active ? "bg-white/5 text-zinc-200" : "text-zinc-500"}`}
              >
                <item.icon className={`h-4 w-4 ${item.active ? "text-brand-cyan" : ""}`} />
                {item.label}
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-xl border border-white/10 p-3 text-[11px] text-zinc-500">
            <div className="mb-2 flex justify-between">
              <span>Storage</span>
              <span>312 / 1024 GB</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[30%] rounded-full bg-gradient-to-r from-brand-cyan to-brand-purple" />
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-3 text-[11px] text-brand-cyan">
            <div className="mb-1 flex items-center gap-2 font-semibold text-zinc-200">
              <Network className="h-3.5 w-3.5 text-brand-cyan" />
              LAN URL
            </div>
            <span className="font-mono">192.168.0.187:3000</span>
          </div>
        </aside>

        <div className="p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">My Drive</h2>
              <p className="text-[11px] text-zinc-500">Storage, sharing, LAN access, and Docker apps.</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="dashboard-search" className="sr-only">Search preview files and apps</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  id="dashboard-search"
                  placeholder="Search files"
                  readOnly
                  tabIndex={-1}
                  className="w-36 rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-2 text-xs text-zinc-300 outline-none sm:w-44"
                />
              </div>
              <button
                type="button"
                disabled
                aria-label="Upload button shown for product demonstration"
                className="inline-flex items-center gap-1 rounded-lg bg-brand-cyan px-2.5 py-1.5 text-xs font-semibold text-black opacity-80"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {categories.map((item) => (
              <div key={item.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className={`mb-3 inline-flex rounded-lg p-2 ${item.accent}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="text-[13px] font-semibold text-zinc-200">{item.name}</div>
                <div className="text-[11px] text-zinc-500">{item.size}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 px-3 py-2 text-[11px]">
            <span className="font-semibold text-zinc-200">4 selected</span>
            <span className="text-zinc-500">2 folders + 2 files - 2.7 GB</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand-cyan px-2.5 py-1 font-semibold text-black">
              <Download className="h-3 w-3" />
              Download ZIP
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Resumable upload</span>
                <span>184.2 GB</span>
              </div>
              <div className="mb-2 text-[13px] font-semibold text-zinc-200">archive-4k-footage.mov</div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-[76%] rounded-full bg-gradient-to-r from-brand-cyan to-brand-purple" />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-zinc-200">
                <Container className="h-4 w-4 text-brand-cyan" />
                Installed apps
              </div>
              <div className="space-y-2">
                {apps.map((app) => (
                  <div key={app.name} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-brand-cyan" />
                      <span className="text-[12px] font-semibold text-zinc-200">{app.name}</span>
                      <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono text-emerald-300">{app.status}</span>
                    </div>
                    <div className="mt-1 flex justify-between gap-3 text-[10px] text-zinc-500">
                      <span className="truncate">{app.image}</span>
                      <span className="font-mono text-brand-cyan">{app.url}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
