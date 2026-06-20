"use client";

import { BookOpen, Cpu, ShieldCheck, Monitor, Server, HardDrive, ArrowRight, ArrowDown } from "lucide-react";
import HeroDeployCommand from "./HeroDeployCommand";

export default function SelfHosting() {
  return (
    <section id="self-hosting" className="defer-render py-24 md:py-32 px-6 md:px-12 relative z-10 overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-brand-cyan/5 blur-[120px] pointer-events-none animate-ambient-glow" />

      <div className="max-w-6xl mx-auto flex flex-col gap-32">
        
        {/* ================= PART 1: THEMED ABOUT SECTION ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
          
          {/* Typography and Content with Outline Background */}
          <div className="lg:col-span-6 flex flex-col items-start text-left relative py-12">
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
          
          {/* Futuristic Monochrome Data Core Graphic */}
          <div className="lg:col-span-6 relative flex justify-center items-center pointer-events-none hidden lg:flex">
             {/* Fade edges into the black background */}
             <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_100px_40px_black] z-10" />
             <img src="https://violet-peaceful-nightingale-428.mypinata.cloud/ipfs/bafkreicsqjvbkiaavlqp6br4vm25n46rb55aowsuuzqljmqctxqpjxrw2e" alt="Black Hole" className="w-full h-auto max-w-[500px] object-cover rounded-2xl opacity-80 mix-blend-screen" />
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
              
              <div className="flex flex-col md:flex-row items-center gap-3 w-full py-2">
                
                {/* Client Node */}
                <div className="w-full md:w-1/4 bg-white/[0.02] border border-white/10 rounded-xl p-4 flex flex-col items-center text-center transition-all hover:bg-white/[0.04]">
                  <Monitor className="w-5 h-5 text-zinc-400 mb-2" />
                  <span className="text-xs font-semibold text-zinc-200">Client Apps</span>
                  <span className="text-[9px] font-mono text-zinc-500 mt-1">WebView / Win</span>
                </div>

                {/* Connecting Arrow */}
                <div className="hidden md:flex flex-col items-center">
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="md:hidden flex flex-col items-center my-1">
                  <ArrowDown className="w-4 h-4 text-zinc-600" />
                </div>

                {/* API Gateway Node */}
                <div className="w-full md:w-2/5 bg-white/[0.05] border border-white/20 rounded-xl p-4 flex flex-col items-center text-center relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.03)] transition-all hover:bg-white/[0.08] hover:border-white/30">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  <Server className="w-6 h-6 text-white mb-2" />
                  <span className="text-sm font-semibold text-white">API Gateway</span>
                  <span className="text-[10px] font-mono text-zinc-400 mt-1 mb-3">Port 4000</span>
                  
                  <div className="w-full h-px bg-white/10 my-2" />
                  
                  <span className="text-[10px] font-mono text-zinc-500">PostgreSQL / Redis</span>
                  <span className="text-[8px] text-zinc-600 uppercase tracking-widest mt-1">Signed Media Access</span>
                </div>

                {/* Connecting Arrow */}
                <div className="hidden md:flex flex-col items-center">
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="md:hidden flex flex-col items-center my-1">
                  <ArrowDown className="w-4 h-4 text-zinc-600" />
                </div>

                {/* Workers & Storage Nodes */}
                <div className="w-full md:w-1/3 flex flex-col gap-3">
                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 flex flex-col items-center text-center transition-all hover:bg-white/[0.04]">
                    <Cpu className="w-4 h-4 text-zinc-400 mb-1" />
                    <span className="text-[11px] font-semibold text-zinc-200">Background Worker</span>
                    <span className="text-[8px] font-mono text-zinc-500 mt-1">Thumbnails / Integrity</span>
                  </div>
                  
                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 flex flex-col items-center text-center transition-all hover:bg-white/[0.04]">
                    <HardDrive className="w-4 h-4 text-zinc-400 mb-1" />
                    <span className="text-[11px] font-semibold text-zinc-200">Storage Volume</span>
                    <span className="text-[8px] font-mono text-zinc-500 mt-1">/app/data (Mounted)</span>
                    <span className="text-[8px] text-zinc-600 uppercase tracking-widest mt-1">Blobs</span>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Setup generates secrets, applies migrations, and keeps runtime services observable.</span>
            </div>
          </div>

            <div className="lg:col-span-7 flex flex-col items-center">
              <HeroDeployCommand />
            </div>
        </div>
      </div>
    </section>
  );
}
