"use client";

import { BookOpen, Cpu, ShieldCheck } from "lucide-react";
import DeploymentTerminal from "./DeploymentTerminal";

export default function SelfHosting() {
  return (
    <section id="self-hosting" className="defer-render py-24 md:py-32 px-6 md:px-12 bg-black relative z-10 overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-brand-cyan/5 blur-[120px] pointer-events-none animate-ambient-glow" />

      <div className="max-w-6xl mx-auto flex flex-col gap-32">
        
        {/* ================= PART 1: THEMED ABOUT SECTION ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
          
          {/* Typography and Content with Outline Background */}
          <div className="lg:col-span-12 flex flex-col items-start text-left relative py-12">
            {/* Outline background text "ABOUT" */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 select-none text-[100px] sm:text-[140px] md:text-[180px] font-display font-extrabold uppercase tracking-[0.15em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.03)] z-0 pointer-events-none">
              ABOUT
            </div>

            <div className="relative z-10 flex flex-col items-start">
              <div className="text-xs font-semibold uppercase tracking-widest text-brand-purple font-display mb-4">
                WHO WE ARE
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-bold uppercase tracking-tight text-white mb-6 leading-tight max-w-xl">
                Providing private cloud storage tailored to your hardware.
              </h2>
              <p className="text-zinc-400 font-sans text-sm md:text-base leading-relaxed tracking-wide mb-8 max-w-xl">
                NexxCloud is an open-source personal cloud hosting ecosystem. We believe that 
                user data belongs on physical hardware that you control. By combining private, 
                content-addressed file storage with a browser-accessible Docker container runtime, 
                NexxCloud turns any server into a secure data fortress and app engine.
              </p>

              {/* Capsule button */}
              <a
                href="https://github.com/ShadowSafin/NexxCloud"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center p-1 pl-6 pr-1.5 rounded-full bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all hover:bg-white/[0.06] group text-xs font-display font-bold uppercase tracking-wider text-zinc-300 hover:text-white"
                id="btn-about-docs"
              >
                <span>Read Docs</span>
                <span className="ml-4 flex items-center justify-center w-8 h-8 rounded-full bg-white text-black transition-transform group-hover:translate-x-0.5">
                  <BookOpen className="w-4 h-4" />
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* ================= PART 2: ORIGINAL DEPLOYMENT WORKSPACE ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Architecture details and Topology Flow */}
          <div className="lg:col-span-5 flex flex-col gap-6 relative z-10">
            <div className="text-xs font-semibold uppercase tracking-widest text-brand-purple font-display">
              Docker and native deployment
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold uppercase tracking-tight text-white leading-tight">
              One stack. Your storage and apps.
            </h2>
            <p className="text-zinc-400 font-sans text-sm leading-relaxed tracking-wide">
              Compose starts the web app, API, PostgreSQL metadata store, Redis queue
              transport, and background workers with persistent storage and health checks.
              The native Windows server app packages a local runtime with LAN URLs, live logs,
              backups, and controls for users who prefer a desktop host.
            </p>

            {/* Core Architecture SVG diagram */}
            <div className="rounded-2xl border border-white/5 bg-zinc-950/40 p-5 mt-4 glass-card">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-brand-purple" />
                <span>Data flow topology</span>
              </div>
              
              <svg viewBox="0 0 400 180" className="w-full h-auto text-zinc-300">
                {/* Clients Block */}
                <rect x="10" y="65" width="80" height="40" rx="6" fill="#0c0c0e" stroke="#1f1f23" strokeWidth="1" />
                <text x="50" y="89" fill="#f4f4f5" fontSize="10" textAnchor="middle" fontWeight="600">Client Apps</text>
                <text x="50" y="99" fill="#ec4899" fontSize="8" textAnchor="middle" fontFamily="monospace">WebView/Win</text>

                {/* Arrow 1 */}
                <line x1="90" y1="85" x2="135" y2="85" stroke="#1f1f23" strokeWidth="1.5" strokeDasharray="3" />
                <polygon points="135,82 142,85 135,88" fill="#1f1f23" />
                
                {/* Backend API Container */}
                <rect x="145" y="45" width="90" height="80" rx="6" fill="#0c0c0e" stroke="#a855f7" strokeWidth="1.5" />
                <text x="190" y="65" fill="#f4f4f5" fontSize="10" textAnchor="middle" fontWeight="600">API Gateway</text>
                <text x="190" y="78" fill="#c084fc" fontSize="8" textAnchor="middle" fontFamily="monospace">Port 4000</text>
                
                {/* Database & Redis indicators inside Backend */}
                <line x1="155" y1="90" x2="225" y2="90" stroke="#1f1f23" />
                <text x="190" y="103" fill="#9ca3af" fontSize="8" textAnchor="middle" fontFamily="monospace">PostgreSQL / Redis</text>
                <text x="190" y="114" fill="#a855f7" fontSize="7" textAnchor="middle">Signed media access</text>

                {/* Arrow 2 */}
                <line x1="235" y1="85" x2="285" y2="85" stroke="#1f1f23" strokeWidth="1.5" strokeDasharray="3" />
                <polygon points="285,82 292,85 285,88" fill="#1f1f23" />

                {/* Worker Container */}
                <rect x="295" y="25" width="95" height="50" rx="6" fill="#0c0c0e" stroke="#1f1f23" strokeWidth="1" />
                <text x="342" y="46" fill="#f4f4f5" fontSize="9" textAnchor="middle" fontWeight="600">Background Worker</text>
                <text x="342" y="58" fill="#9ca3af" fontSize="7" textAnchor="middle" fontFamily="monospace">Thumbnails / Apps / Integrity</text>

                {/* Storage Mounted Container */}
                <rect x="295" y="95" width="95" height="55" rx="6" fill="#0c0c0e" stroke="#1f1f23" strokeWidth="1" />
                <text x="342" y="117" fill="#f4f4f5" fontSize="9" textAnchor="middle" fontWeight="600">Storage Volume</text>
                <text x="342" y="129" fill="#ec4899" fontSize="7" textAnchor="middle" fontFamily="monospace">/app/data (Mounted)</text>
                <text x="342" y="139" fill="#9ca3af" fontSize="7" textAnchor="middle">Content-Addressed Blobs</text>

                {/* Worker connection line */}
                <path d="M 235,65 Q 265,65 295,50" fill="none" stroke="#1f1f23" strokeWidth="1" />
              </svg>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Setup generates secrets, applies migrations, and keeps runtime services observable.</span>
            </div>
          </div>

          <DeploymentTerminal />
        </div>
      </div>
    </section>
  );
}
