import { Cpu, ShieldCheck } from "lucide-react";
import DeploymentTerminal from "./DeploymentTerminal";

export default function SelfHosting() {
  return (
    <section id="self-hosting" className="defer-render py-24 md:py-32 px-6 md:px-12 bg-[#030303] relative z-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Architecture details and copy */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand-purple">
            Docker and native deployment
          </div>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight leading-[1.1] text-foreground">
            One stack. Your storage and apps.
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed tracking-tight">
            Compose starts the web app, API, PostgreSQL metadata store, Redis queue
            transport, and background workers with persistent storage and health checks.
            The native Windows server app packages a local runtime with LAN URLs, live logs,
            backups, and controls for users who prefer a desktop host.
          </p>

          {/* Core Architecture SVG diagram */}
          <div className="rounded-2xl border border-white/5 bg-zinc-950/40 p-5 mt-4">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-brand-purple" />
              <span>Data flow topology</span>
            </div>
            
            <svg viewBox="0 0 400 180" className="w-full h-auto text-zinc-300">
              {/* Clients Block */}
              <rect x="10" y="65" width="80" height="40" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
              <text x="50" y="89" fill="#f4f4f5" fontSize="10" textAnchor="middle" fontWeight="600">Client Apps</text>
              <text x="50" y="99" fill="#06b6d4" fontSize="8" textAnchor="middle" fontFamily="monospace">WebView/Win</text>

              {/* Arrow 1 */}
              <line x1="90" y1="85" x2="135" y2="85" stroke="#3f3f46" strokeWidth="1.5" strokeDasharray="3" />
              <polygon points="135,82 142,85 135,88" fill="#3f3f46" />
              
              {/* Backend API Container */}
              <rect x="145" y="45" width="90" height="80" rx="6" fill="#18181b" stroke="#8b5cf6" strokeWidth="1.5" />
              <text x="190" y="65" fill="#f4f4f5" fontSize="10" textAnchor="middle" fontWeight="600">API Gateway</text>
              <text x="190" y="78" fill="#a78bfa" fontSize="8" textAnchor="middle" fontFamily="monospace">Port 4000</text>
              
              {/* Database & Redis indicators inside Backend */}
              <line x1="155" y1="90" x2="225" y2="90" stroke="#27272a" />
              <text x="190" y="103" fill="#9ca3af" fontSize="8" textAnchor="middle" fontFamily="monospace">PostgreSQL / Redis</text>
                  <text x="190" y="114" fill="#10b981" fontSize="7" textAnchor="middle">Signed media access</text>

              {/* Arrow 2 */}
              <line x1="235" y1="85" x2="285" y2="85" stroke="#3f3f46" strokeWidth="1.5" strokeDasharray="3" />
              <polygon points="285,82 292,85 285,88" fill="#3f3f46" />

              {/* Worker Container */}
              <rect x="295" y="25" width="95" height="50" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
              <text x="342" y="46" fill="#f4f4f5" fontSize="9" textAnchor="middle" fontWeight="600">Background Worker</text>
              <text x="342" y="58" fill="#9ca3af" fontSize="7" textAnchor="middle" fontFamily="monospace">Thumbnails / Apps / Integrity</text>

              {/* Storage Mounted Container */}
              <rect x="295" y="95" width="95" height="55" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
              <text x="342" y="117" fill="#f4f4f5" fontSize="9" textAnchor="middle" fontWeight="600">Storage Volume</text>
              <text x="342" y="129" fill="#06b6d4" fontSize="7" textAnchor="middle" fontFamily="monospace">/app/data (Mounted)</text>
              <text x="342" y="139" fill="#9ca3af" fontSize="7" textAnchor="middle">Content-Addressed Blobs</text>

              {/* Worker connection line */}
              <path d="M 235,65 Q 265,65 295,50" fill="none" stroke="#27272a" strokeWidth="1" />
            </svg>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Setup generates secrets, applies migrations, and keeps runtime services observable.</span>
          </div>
        </div>

        <DeploymentTerminal />
      </div>
    </section>
  );
}
