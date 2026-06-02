import { ArrowRight, Container, Monitor, Server } from "lucide-react";
import DashboardMockup from "./DashboardMockup";
import HeroDeployCommand from "./HeroDeployCommand";
import HeroVideoBackdrop from "./HeroVideoBackdrop";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden px-6 md:px-12 flex flex-col items-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[850px] overflow-hidden">
        <HeroVideoBackdrop />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,3,0.45)_0%,rgba(3,3,3,0.68)_45%,#030303_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_42%_at_50%_28%,transparent_0%,rgba(3,3,3,0.48)_72%,rgba(3,3,3,0.9)_100%)]" />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none radial-bg z-0" />
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-brand-cyan/5 blur-[120px] pointer-events-none animate-ambient-glow" />
      <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] rounded-full bg-brand-purple/5 blur-[100px] pointer-events-none animate-ambient-glow" />

      <div className="relative z-10 w-full max-w-4xl text-center flex flex-col items-center mb-16">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass border border-white/5 text-[11px] font-medium tracking-tight mb-8 text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
          <span>Self-hosted cloud storage and Docker apps</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-[80px] font-medium leading-[1.05] tracking-tighter text-foreground mb-6 max-w-3xl">
          Self-hosted cloud storage.<br />
          Your hardware.<br />
          Your apps.
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed tracking-tight mb-10 px-4">
          NexxCloud is private file storage for your own server with resumable
          huge uploads, LAN access, bulk downloads, live server logs, and
          Docker Hub apps you can install from the browser.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-10 w-full max-w-3xl justify-center">
          <a
            href="#self-hosting"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl bg-foreground hover:bg-zinc-200 text-background font-semibold text-[14px] transition-all shadow-lg shadow-white/5 active:scale-98 group"
            id="btn-hero-host"
          >
            <Server className="w-4 h-4" />
            <span>Deploy NexxCloud</span>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-black transition-colors" />
          </a>
          <a
            href="#apps"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-foreground font-semibold text-[14px] transition-all shadow-md active:scale-98"
            id="btn-hero-apps"
          >
            <Monitor className="w-4 h-4 text-zinc-400" />
            <span>Get Downloads</span>
          </a>
          <a
            href="#features"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl border border-brand-cyan/10 hover:border-brand-cyan/25 bg-brand-cyan/5 hover:bg-brand-cyan/10 text-zinc-300 hover:text-foreground font-semibold text-[14px] transition-all shadow-md active:scale-98"
            id="btn-hero-features"
          >
            <Container className="w-4 h-4 text-brand-cyan" />
            <span>See Apps</span>
          </a>
        </div>

        <HeroDeployCommand />
        <p className="text-[11px] text-zinc-500 mt-3 font-mono">
          One-command Docker deployment, native Windows server, desktop client, and Android APK.
        </p>
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-brand-cyan/10 via-transparent to-brand-purple/10 opacity-40 blur-xl pointer-events-none" />
        <DashboardMockup />
        <p className="text-center text-xs text-zinc-500 mt-4">
          Product preview: drive, bulk downloads, LAN access, and installed Docker apps.
        </p>
      </div>
    </section>
  );
}
