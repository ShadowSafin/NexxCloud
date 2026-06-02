import {
  Activity,
  Archive,
  Container,
  Fingerprint,
  FolderTree,
  Laptop,
  Network,
  Server,
  ShieldCheck,
  Smartphone,
  Terminal,
  UploadCloud,
} from "lucide-react";

export default function Features() {
  const featureList = [
    {
      title: "Content-Addressed Storage",
      description: "Files reference immutable SHA-256 storage blobs, so duplicate binaries can share safe physical storage.",
      icon: Fingerprint,
      accent: "text-blue-400 bg-blue-500/10",
    },
    {
      title: "Resumable Huge Uploads",
      description: "Large transfers upload in bounded chunks, retry safely, and merge through workers before final storage.",
      icon: UploadCloud,
      accent: "text-emerald-400 bg-emerald-500/10",
    },
    {
      title: "Bulk Folder Downloads",
      description: "Select files and folders together, see the total size, and download a clean ZIP archive.",
      icon: Archive,
      accent: "text-amber-400 bg-amber-500/10",
    },
    {
      title: "Docker Hub Apps",
      description: "Search Docker Hub, inspect metadata, install images, and manage Compose-backed apps from NexxCloud.",
      icon: Container,
      accent: "text-cyan-400 bg-cyan-500/10",
    },
    {
      title: "Realtime App Stats",
      description: "Installed apps show CPU, memory, network, disk I/O, container status, exposed ports, and live logs.",
      icon: Activity,
      accent: "text-purple-400 bg-purple-500/10",
    },
    {
      title: "LAN Access URLs",
      description: "NexxCloud surfaces usable local IPs and app ports so other devices can connect on your network.",
      icon: Network,
      accent: "text-teal-400 bg-teal-500/10",
    },
    {
      title: "Native Server Host",
      description: "The Windows server host packages a local SQLite runtime, tray controls, backups, and fixed live logs.",
      icon: Server,
      accent: "text-indigo-400 bg-indigo-500/10",
    },
    {
      title: "Desktop and Android Clients",
      description: "Windows and Android wrappers connect to the same LAN-hosted NexxCloud interface.",
      icon: Laptop,
      accent: "text-pink-400 bg-pink-500/10",
    },
    {
      title: "Secure Media Delivery",
      description: "Short-lived signed URLs stream previews and downloads without exposing access JWTs in media requests.",
      icon: ShieldCheck,
      accent: "text-rose-400 bg-rose-500/10",
    },
    {
      title: "Folder-Aware Drive",
      description: "Folders, trash, restore, search, favorites, versions, and sharing all live in the main drive UI.",
      icon: FolderTree,
      accent: "text-sky-400 bg-sky-500/10",
    },
    {
      title: "Mobile Upload Flow",
      description: "The Android wrapper supports LAN reconnect handling and native sharing paths into the web interface.",
      icon: Smartphone,
      accent: "text-lime-400 bg-lime-500/10",
    },
    {
      title: "Open Runtime",
      description: "TypeScript services, Docker deployment scripts, Prisma schema, and release builds stay visible in source.",
      icon: Terminal,
      accent: "text-zinc-300 bg-zinc-500/10",
    },
  ];

  return (
    <section id="features" className="defer-render relative z-10 bg-zinc-950/20 px-6 py-24 md:px-12 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-cyan">
            Core capabilities
          </div>
          <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-5xl">
            Storage, sharing, and apps on your server.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed tracking-tight text-zinc-400 md:text-base">
            NexxCloud combines private file storage with a local app runtime, LAN access, and native clients.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featureList.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/10 p-6 transition-all duration-500 hover:border-white/10 hover:bg-zinc-900/30"
              >
                <div className="pointer-events-none absolute inset-0 bg-radial-bg opacity-0 transition-opacity duration-700 group-hover:opacity-40" />
                <div className={`relative z-10 shrink-0 rounded-xl p-3 ${feature.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="relative z-10 flex flex-col gap-2">
                  <h3 className="text-[15px] font-semibold tracking-tight text-zinc-200 transition-colors group-hover:text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed tracking-tight text-zinc-400 transition-colors group-hover:text-zinc-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
