"use client";

import { useState } from "react";
import { Terminal } from "lucide-react";
import CopyButton from "./CopyButton";

type Platform = "windows" | "linux" | "macos";

const commands: Record<Platform, { label: string; command: string }> = {
  windows: {
    label: "Windows",
    command: "irm https://raw.githubusercontent.com/ShadowSafin/NexxCloud/main/install.ps1 | iex",
  },
  linux: {
    label: "Linux",
    command: "curl -fsSL https://raw.githubusercontent.com/ShadowSafin/NexxCloud/main/install.sh | sh",
  },
  macos: {
    label: "macOS",
    command: "curl -fsSL https://raw.githubusercontent.com/ShadowSafin/NexxCloud/main/install.sh | sh",
  },
};

export default function HeroDeployCommand() {
  const [activePlatform, setActivePlatform] = useState<Platform>("windows");
  const selected = commands[activePlatform];

  return (
    <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-white/5 bg-zinc-950/80 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-r from-brand-cyan/5 to-brand-purple/5 pointer-events-none" />
      <div className="relative flex items-center justify-between gap-2 border-b border-white/5 p-3">
        <div
          role="tablist"
          aria-label="Select Docker deployment platform"
          className="grid min-w-0 flex-1 grid-cols-3 rounded-lg border border-white/5 bg-black/25 p-0.5 text-[11px] font-medium sm:flex-none"
        >
          {(Object.keys(commands) as Platform[]).map((platform) => {
            const option = commands[platform];
            const selectedPlatform = activePlatform === platform;

            return (
              <button
                key={platform}
                type="button"
                role="tab"
                id={`hero-deploy-tab-${platform}`}
                aria-selected={selectedPlatform}
                aria-controls="hero-deploy-command"
                onClick={() => setActivePlatform(platform)}
                className={`min-w-0 rounded-md px-2 py-2 transition-colors sm:min-w-[78px] sm:px-3 ${
                  selectedPlatform
                    ? "bg-white/10 text-brand-cyan"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <CopyButton
          text={selected.command}
          label={`Copy ${selected.label} deployment command`}
          compact
          id="btn-hero-copy"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-foreground"
        />
      </div>
      <div
        id="hero-deploy-command"
        role="tabpanel"
        aria-labelledby={`hero-deploy-tab-${activePlatform}`}
        className="relative flex min-h-[60px] items-center gap-2.5 overflow-x-auto px-4 py-3 font-mono text-[10px] text-zinc-300 sm:text-[11px]"
      >
        <Terminal className="h-4 w-4 shrink-0 text-brand-cyan" />
        <span className="shrink-0 font-semibold text-zinc-500">$</span>
        <code className="whitespace-nowrap text-left font-semibold text-zinc-200">{selected.command}</code>
      </div>
    </div>
  );
}
