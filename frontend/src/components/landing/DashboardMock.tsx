import { motion } from "framer-motion";
import {
  Activity,
  Cloud,
  Container,
  Download,
  FileText,
  Film,
  Folder,
  Image as ImageIcon,
  Music,
  Network,
  Search,
  Server,
  Upload,
} from "lucide-react";

const categories = [
  { icon: Folder, name: "Folders", meta: "12 folders", color: "text-[var(--brand-cyan)]" },
  { icon: ImageIcon, name: "Photos", meta: "4,201 items", color: "text-[var(--brand-violet)]" },
  { icon: Film, name: "Recordings", meta: "62 items", color: "text-[var(--brand-blue)]" },
  { icon: FileText, name: "Documents", meta: "841 items", color: "text-emerald-300" },
  { icon: Music, name: "Audio", meta: "320 items", color: "text-pink-300" },
];

const uploads = [
  { name: "archive-4k-footage.mov", pct: 96, size: "184.2 GB" },
  { name: "project-backup.zip", pct: 64, size: "42.8 GB" },
  { name: "dataset.parquet", pct: 38, size: "8.4 GB" },
];

const apps = [
  { name: "Jellyfin", image: "jellyfin/jellyfin", status: "Running", cpu: "2.4%", port: "8096" },
  { name: "Ubuntu", image: "library/ubuntu", status: "Live", cpu: "0.1%", port: "2222" },
];

export function DashboardMock() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.9, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl apex-glass apex-shadow-elegant"
      >
        <div className="flex items-center gap-2 border-b border-border/60 bg-black/20 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <div className="ml-2 flex min-w-0 items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-xs text-muted-foreground sm:ml-4">
            <Cloud className="h-3.5 w-3.5" /> nexxcloud.local / drive
          </div>
          <div className="ml-auto hidden items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-xs text-muted-foreground sm:flex">
            <Search className="h-3.5 w-3.5" /> Search files and apps...
          </div>
        </div>

        <div className="grid grid-cols-12">
          <aside className="col-span-3 hidden border-r border-border/60 bg-black/10 p-4 md:block">
            <div className="space-y-1 text-sm">
              {["All files", "Apps", "Installed Apps", "Settings"].map((label, index) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 ${index === 0 ? "bg-white/5 text-foreground" : "text-muted-foreground"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-[var(--brand-cyan)]" : "bg-muted-foreground/40"}`} />
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-border/60 p-3 text-xs">
              <div className="mb-2 flex justify-between text-muted-foreground">
                <span>Storage</span>
                <span>312 / 1024 GB</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-[30%] rounded-full bg-[var(--gradient-brand)]" />
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.04] p-3 text-xs text-cyan-100/80">
              <div className="mb-1 flex items-center gap-2 font-medium text-cyan-100">
                <Network className="h-3.5 w-3.5" /> LAN access
              </div>
              192.168.0.187:3000
            </div>
          </aside>

          <main className="col-span-12 p-5 md:col-span-9">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">My Drive</h3>
                <p className="text-[11px] text-muted-foreground">Files, folders, apps, and live server status in one place.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md bg-[var(--gradient-brand)] px-3 py-1.5 text-xs font-medium text-background">
                <Upload className="h-3.5 w-3.5" /> Upload
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.06 }}
                  className="group rounded-xl border border-border/60 bg-white/[0.02] p-3 transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className={`mb-3 grid h-10 w-10 place-items-center rounded-lg bg-white/5 ${category.color}`}>
                    <category.icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium">{category.name}</div>
                  <div className="text-[11px] text-muted-foreground">{category.meta}</div>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-cyan-200/15 bg-cyan-200/[0.04] px-4 py-3 text-xs">
              <span className="font-medium text-white">4 selected</span>
              <span className="text-muted-foreground">2 folders + 2 files - 2.7 GB</span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 font-medium text-cyan-100">
                <Download className="h-3.5 w-3.5" /> Download ZIP
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-xl border border-border/60 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Uploading huge files</span>
                  <span>Resumable chunks</span>
                </div>
                <div className="space-y-3">
                  {uploads.map((upload) => (
                    <div key={upload.name}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{upload.name}</span>
                        <span className="text-muted-foreground">{upload.size}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${upload.pct}%` }}
                          transition={{ delay: 1, duration: 1.2, ease: "easeOut" }}
                          className="h-full rounded-full bg-[var(--gradient-brand)]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Container className="h-4 w-4 text-[var(--brand-cyan)]" /> Docker apps
                  </div>
                  <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[10px] text-emerald-100">Live</span>
                </div>
                <div className="space-y-2">
                  {apps.map((app) => (
                    <div key={app.name} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-300/10 text-cyan-200">
                          <Server className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{app.name}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{app.image}</div>
                        </div>
                        <div className="ml-auto text-right text-[11px] text-muted-foreground">
                          <div className="text-emerald-200">{app.status}</div>
                          <div>{app.cpu} CPU</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-cyan-100/80">
                        <Activity className="h-3 w-3" /> 192.168.0.187:{app.port}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </motion.div>
    </div>
  );
}
