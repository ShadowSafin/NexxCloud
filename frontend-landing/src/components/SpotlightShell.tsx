import type { ReactNode } from "react";

interface SpotlightShellProps {
  children: ReactNode;
}

export default function SpotlightShell({ children }: SpotlightShellProps) {
  return (
    <div
      className="relative min-h-screen bg-[#030303] text-[#F4F4F5] flex flex-col overflow-hidden radial-spotlight"
    >
      {children}
    </div>
  );
}
