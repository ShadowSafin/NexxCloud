"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";

type Platform = "windows" | "shell";

const snippets: Record<Platform, string> = {
  windows: "irm https://raw.githubusercontent.com/ShadowSafin/NexxCloud/main/install.ps1 | iex",
  shell: "curl -fsSL https://raw.githubusercontent.com/ShadowSafin/NexxCloud/main/install.sh | sh",
};

export default function DeploymentTerminal() {
  const [activeTab, setActiveTab] = useState<Platform>("windows");

  return (
    <div className="lg:col-span-7 flex flex-col rounded-2xl border border-white/5 bg-zinc-950/60 shadow-2xl overflow-hidden relative min-h-[245px]">
      <div className="absolute inset-0 bg-gradient-to-tr from-brand-cyan/2 via-transparent to-brand-purple/2 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-white/5 bg-zinc-950">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        </div>

        <div role="group" aria-label="Select deployment example" className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-lg border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab("windows")}
            aria-pressed={activeTab === "windows"}
            aria-controls="deployment-snippet"
            className={`px-3 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
              activeTab === "windows" ? "bg-white/5 text-brand-cyan" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            PowerShell
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shell")}
            aria-pressed={activeTab === "shell"}
            aria-controls="deployment-snippet"
            className={`px-3 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
              activeTab === "shell" ? "bg-white/5 text-brand-purple" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Shell
          </button>
        </div>

        <CopyButton
          key={activeTab}
          text={snippets[activeTab]}
          label="Copy code"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-zinc-900/80 text-[11px] font-medium text-zinc-400 hover:text-foreground transition-all duration-300 relative"
          id="btn-host-copy"
        />
      </div>

      <div
        id="deployment-snippet"
        aria-live="polite"
        className="p-6 flex-1 overflow-y-auto max-h-[380px] bg-zinc-950/20 font-mono text-[12px] text-zinc-300 leading-relaxed scrollbar-thin"
      >
        <p className="mb-4 text-[11px] text-zinc-500">
          One command clones NexxCloud, generates strong secrets, builds all five services, and runs safe migrations.
        </p>
        <pre className="whitespace-pre-wrap break-all select-text selection:bg-brand-cyan/20 selection:text-brand-cyan">
          {snippets[activeTab]}
        </pre>
        <p className="mt-6 text-[11px] text-zinc-500">
          Open http://localhost:3000 after the health checks pass.
        </p>
      </div>
    </div>
  );
}
