"use client";

import { ArrowDown, Monitor, Server } from "lucide-react";
import HeroDeployCommand from "./HeroDeployCommand";
import DashboardMockup from "./DashboardMockup";

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-black overflow-hidden px-6 md:px-12 flex flex-col justify-between pt-24 pb-12">
      {/* Full Screen Background Video */}
      <video
        src="/Black_hole_accretion_disk_rotation_loop2.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
      />
      {/* Dark overlay with fade-to-black gradient for seamless transition */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-black z-0" />

      {/* Decorative ambient background glows */}
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] rounded-full bg-brand-purple/5 blur-[120px] pointer-events-none animate-ambient-glow" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-brand-cyan/5 blur-[100px] pointer-events-none animate-ambient-glow" />

      {/* Main Grid Content */}
      <div className="mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto relative z-10">
        
        {/* Left Side: Typography and CTAs */}
        <div className="lg:col-span-12 max-w-3xl flex flex-col items-start text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-[10px] font-display font-semibold uppercase tracking-wider text-zinc-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
            <span>NexxCloud Storage Hub</span>
          </div>

          <div className="flex flex-col mb-6">
            <span className="text-sm md:text-base font-display font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">
              WE ARE
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-extrabold uppercase tracking-tight text-white leading-none">
              NEXXCLOUD
            </h1>
          </div>

          <p className="text-zinc-400 font-sans text-sm md:text-base max-w-xl leading-relaxed tracking-wide mb-10">
            A self-hosted private cloud storage gateway with resumable massive uploads, 
            local area network discovery, bulk zip downloads, and a Docker Hub 
            app marketplace running directly on your own hardware.
          </p>

          {/* Futuristic Capsule Buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-10 w-full">
            <a
              href="#self-hosting"
              className="inline-flex items-center p-1 pl-6 pr-1.5 rounded-full bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] group text-xs font-display font-bold uppercase tracking-wider text-zinc-200 hover:text-white"
              id="btn-hero-host"
            >
              <span>Deploy Server</span>
              <span className="ml-4 flex items-center justify-center w-8 h-8 rounded-full bg-white text-black transition-transform group-hover:translate-x-0.5">
                <Server className="w-4 h-4" />
              </span>
            </a>

            <a
              href="#apps"
              className="inline-flex items-center p-1 pl-6 pr-1.5 rounded-full bg-transparent border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all group text-xs font-display font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
              id="btn-hero-apps"
            >
              <span>Downloads</span>
              <span className="ml-4 flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-400 transition-transform group-hover:translate-x-0.5">
                <Monitor className="w-4 h-4" />
              </span>
            </a>
          </div>

          {/* Quick-start CLI block inline */}
          <div className="w-full max-w-lg">
            <HeroDeployCommand />
          </div>
        </div>
      </div>

      {/* Dashboard Mockup */}
      <div className="relative z-10 w-full max-w-6xl mx-auto mt-16 mb-12 hidden lg:block">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-brand-cyan/10 via-transparent to-brand-purple/10 opacity-40 blur-xl pointer-events-none" />
        <DashboardMockup />
        <p className="text-center text-xs text-zinc-500 mt-4">
          Product preview: drive, bulk downloads, LAN access, and installed Docker apps.
        </p>
      </div>

      {/* Footer-row inside Hero: Social links, Scroll Indicator */}
      <div className="mx-auto max-w-7xl w-full flex items-center justify-between border-t border-white/5 pt-8 relative z-10">
        
        {/* Social Icons */}
        <div className="flex items-center gap-6 text-zinc-500 text-xs">
          <a href="#" className="hover:text-white transition-colors" aria-label="Facebook">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a href="#" className="hover:text-white transition-colors" aria-label="Instagram">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </a>
          <a href="#" className="hover:text-white transition-colors" aria-label="X (formerly Twitter)">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>

        {/* Circular Rotating Scroll Down Badge */}
        <div className="relative w-20 h-20 flex items-center justify-center select-none">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_20s_linear_infinite] text-zinc-600">
            <path id="circlePath" d="M 50,50 m -35,0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="none" />
            <text className="text-[7px] font-mono tracking-[0.25em] fill-current">
              <textPath href="#circlePath">
                SCROLL TO EXPLORE • SCROLL TO EXPLORE • 
              </textPath>
            </text>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <ArrowDown className="w-3.5 h-3.5 text-zinc-400 animate-bounce" />
          </div>
        </div>

        {/* Right spacing to balance socials */}
        <div className="hidden sm:block text-zinc-500 font-mono text-[10px] tracking-widest uppercase">
          01 ———
        </div>
      </div>
    </section>
  );
}
