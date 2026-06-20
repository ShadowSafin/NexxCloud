import GithubIcon from "./GithubIcon";
import ScrollTopButton from "./ScrollTopButton";

export default function Footer() {
  return (
    <footer className="defer-render border-t border-white/5 bg-zinc-950/40 py-12 px-6 md:px-12 relative z-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Branding & Logo */}
        <div className="flex items-center gap-2 font-semibold">
          <div className="w-6 h-6 overflow-hidden rounded-md border border-white/10">
            <span aria-hidden="true" className="block h-full w-full bg-[url('/icon.png')] bg-cover" />
          </div>
          <span className="text-[13px] tracking-tight">
            Nexx<span className="text-zinc-400 font-normal">Cloud</span>
          </span>
          <span className="text-[10px] text-zinc-600 border border-white/5 bg-white/5 px-1.5 py-0.5 rounded font-mono ml-2">
            Self-Hosted
          </span>
        </div>

        {/* Links Grid */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[12px] font-medium text-zinc-500">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#self-hosting" className="hover:text-foreground transition-colors">Deployment</a>
          <a href="#apps" className="hover:text-foreground transition-colors">Downloads</a>
          <a href="https://github.com/ShadowSafin/NexxCloud" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">
            <GithubIcon className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </div>

        {/* System copyright and Scroll to Top */}
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-zinc-600 font-mono">
            (c) {new Date().getFullYear()} NexxCloud. All rights reserved.
          </span>
          <ScrollTopButton />
        </div>

      </div>
    </footer>
  );
}
