import { BookOpen } from "lucide-react";
import GithubIcon from "./GithubIcon";

export default function OpenSource() {
  return (
    <section className="defer-render py-24 md:py-32 px-6 md:px-12 bg-zinc-950/20 relative z-10">
      <div className="max-w-4xl mx-auto rounded-2xl border border-white/5 bg-zinc-900/10 p-8 md:p-12 relative overflow-hidden group">
        {/* Ambient background shading */}
        <div className="absolute inset-0 bg-radial-bg opacity-20 pointer-events-none" />
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 bg-brand-cyan/5 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Main textual content */}
          <div className="flex flex-col gap-4 max-w-lg">
            <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs font-semibold tracking-wider">
              <GithubIcon className="w-4 h-4 text-zinc-400" />
              <span>GITHUB REPOSITORY</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-medium tracking-tight text-foreground leading-tight">
              Follow the project.<br />
              Inspect the source.
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed tracking-tight">
              Review the current source, releases, issues, and licensing information
              directly in the project repository before deploying a build.
            </p>

            <div className="flex items-center gap-3 mt-2 text-[12px] font-mono text-zinc-500">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Repository is the source of truth
              </span>
            </div>
          </div>

          {/* Action buttons stack */}
          <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
            <a
              href="https://github.com/ShadowSafin/NexxCloud"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-foreground hover:bg-zinc-200 text-background font-semibold text-[14px] transition-all shadow-lg active:scale-98"
              id="btn-os-star"
            >
              <GithubIcon className="w-4 h-4" />
              <span>View Repository</span>
            </a>
            
            <a
              href="https://github.com/ShadowSafin/NexxCloud"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-foreground font-semibold text-[14px] transition-all active:scale-98"
              id="btn-os-docs"
            >
              <BookOpen className="w-4 h-4 text-zinc-400" />
              <span>Browse Project Files</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
