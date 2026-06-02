import { Activity, Download, Monitor, QrCode, Server, Smartphone, Terminal, Wifi } from "lucide-react";

const repositoryUrl = "https://github.com/ShadowSafin/NexxCloud";
const releaseDownloadUrl = `${repositoryUrl}/releases/latest/download`;

export default function AppsSection() {
  return (
    <section id="apps" className="defer-render relative z-10 bg-zinc-950/20 px-6 py-24 md:px-12 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-cyan">
            Downloads and native apps
          </div>
          <h2 className="text-3xl font-medium tracking-tight text-foreground md:text-5xl">
            Run the server. Connect every device.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed tracking-tight text-zinc-400 md:text-base">
            Download the Windows server app, Windows desktop client, and Android APK. The server app includes LAN URLs, live logs, backup controls, and the bundled web interface.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2">
          <div className="group relative flex flex-col justify-between gap-8 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/10 p-8 transition-all duration-500 hover:border-white/10">
            <div className="pointer-events-none absolute inset-0 bg-radial-bg opacity-0 transition-opacity duration-700 group-hover:opacity-40" />

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-brand-cyan">
                <Monitor className="h-4 w-4" />
                <span>WINDOWS</span>
              </div>
              <h3 className="text-xl font-medium tracking-tight text-foreground md:text-2xl">
                Native server host and desktop client
              </h3>
              <p className="text-sm leading-relaxed tracking-tight text-zinc-400">
                The server app bundles NexxCloud with a local runtime, tray controls, LAN dashboard links, fixed live logs, and data-folder utilities. The desktop client connects to an existing server in a native window.
              </p>

              <div className="mx-auto mt-4 w-full max-w-md rounded-xl border border-white/5 bg-zinc-950/80 p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3 text-[11px] font-mono text-zinc-500">
                  <div className="flex items-center gap-1.5 font-sans font-semibold text-zinc-300">
                    <Server className="h-3.5 w-3.5 text-brand-cyan" />
                    <span>NexxCloud Server</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-0.5 w-2.5 bg-zinc-700" />
                    <span className="inline-block h-2 w-2 border border-zinc-700" />
                    <span className="flex h-2 w-2 items-center justify-center text-[8px] text-zinc-700">x</span>
                  </div>
                </div>

                <div className="mb-3 rounded-lg border border-white/5 bg-zinc-900/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[12px] font-bold text-zinc-300">Server online</span>
                    </div>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                      Healthy
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="rounded border border-white/5 bg-black/20 p-2 text-zinc-500">
                      DASHBOARD
                      <div className="mt-1 text-brand-cyan">localhost:3000</div>
                    </div>
                    <div className="rounded border border-white/5 bg-black/20 p-2 text-zinc-500">
                      LAN
                      <div className="mt-1 text-brand-cyan">192.168.0.187</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/5 bg-black/30 p-3">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-zinc-300">
                    <Terminal className="h-3.5 w-3.5 text-brand-cyan" />
                    Live logs
                  </div>
                  <div className="space-y-1 font-mono text-[10px] text-zinc-500">
                    <p>[backend] Storage health check: OK</p>
                    <p>[frontend] Ready on 0.0.0.0:3000</p>
                    <p>[server] LAN URLs published</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-2 flex flex-wrap items-center gap-3 border-t border-white/5 pt-6">
              <a
                href={`${releaseDownloadUrl}/NexxCloud.Desktop.Setup.exe`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-brand-cyan px-5 py-2.5 text-[13px] font-medium text-zinc-950 transition-all hover:bg-cyan-400"
              >
                <Download className="h-4 w-4" />
                <span>Desktop Client</span>
              </a>

              <a
                href={`${releaseDownloadUrl}/NexxCloud.Server.Setup.exe`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-brand-cyan px-5 py-2.5 text-[13px] font-medium text-zinc-950 transition-all hover:bg-cyan-400"
              >
                <Download className="h-4 w-4" />
                <span>Desktop Server</span>
              </a>
            </div>
          </div>

          <div className="group relative flex flex-col justify-between gap-8 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/10 p-8 transition-all duration-500 hover:border-white/10">
            <div className="pointer-events-none absolute inset-0 bg-radial-bg opacity-0 transition-opacity duration-700 group-hover:opacity-40" />

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-brand-purple">
                <Smartphone className="h-4 w-4" />
                <span>ANDROID AND LAN</span>
              </div>
              <h3 className="text-xl font-medium tracking-tight text-foreground md:text-2xl">
                Mobile wrapper and LAN access
              </h3>
              <p className="text-sm leading-relaxed tracking-tight text-zinc-400">
                The Android shell opens your LAN-hosted NexxCloud interface with reconnect handling. Network settings and installed apps expose the URLs you need from other devices.
              </p>

              <div className="mx-auto mt-4 flex w-full max-w-md items-center justify-center gap-5">
                <div className="flex h-[320px] w-[180px] flex-col justify-between overflow-hidden rounded-[30px] border-4 border-zinc-800 bg-[#030303] p-3 shadow-2xl">
                  <div className="mt-1 flex items-center justify-between px-1 font-mono text-[7px] text-zinc-500">
                    <span>NexxCloud</span>
                    <div className="flex items-center gap-1">
                      <Wifi className="h-2 w-2 text-brand-cyan" />
                      <span>LAN</span>
                    </div>
                  </div>

                  <div className="my-auto flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/20 to-brand-purple/20 shadow-lg">
                      <QrCode className="h-6 w-6 text-brand-cyan" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-300">Connect to server</span>
                      <span className="mt-0.5 text-[7px] tracking-tight text-zinc-500">Scan or enter LAN URL</span>
                    </div>
                    <div className="w-full max-w-[120px] rounded border border-white/5 bg-zinc-900 px-2 py-1.5 text-center font-mono text-[7px] text-zinc-400">
                      192.168.0.187:3000
                    </div>
                    <div className="w-full max-w-[120px] rounded bg-brand-cyan py-1 text-[8px] font-bold text-black shadow-md">
                      Connect
                    </div>
                  </div>

                  <div className="flex items-center justify-around border-t border-white/5 pt-2 font-mono text-[6px] font-semibold uppercase text-zinc-600">
                    <span className="text-brand-cyan">Files</span>
                    <span>Apps</span>
                    <span>Share</span>
                  </div>
                </div>

                <div className="hidden flex-1 space-y-3 md:block">
                  {[
                    { label: "Jellyfin", value: "192.168.0.187:8096" },
                    { label: "Ubuntu", value: "192.168.0.187:2222" },
                    { label: "Dashboard", value: "192.168.0.187:3000" },
                  ].map((row) => (
                    <div key={row.label} className="rounded-xl border border-white/5 bg-zinc-950/50 p-3">
                      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-zinc-300">
                        <Activity className="h-3.5 w-3.5 text-brand-cyan" />
                        {row.label}
                      </div>
                      <div className="font-mono text-[11px] text-brand-cyan">{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-2 flex flex-wrap items-center gap-3 border-t border-white/5 pt-6">
              <a
                href={`${releaseDownloadUrl}/NexxCloud-release.apk`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-brand-purple px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-violet-500"
              >
                <Download className="h-4 w-4" />
                <span>Download APK</span>
              </a>

              <span className="rounded-full bg-brand-purple/15 px-2.5 py-1 font-mono text-[10px] font-medium text-brand-purple">
                LAN READY
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
