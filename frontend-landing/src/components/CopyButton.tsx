"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";

type CopyStatus = "idle" | "copied" | "failed";

interface CopyButtonProps {
  text: string;
  label: string;
  compact?: boolean;
  className?: string;
  id?: string;
}

export default function CopyButton({
  text,
  label,
  compact = false,
  className = "",
  id,
}: CopyButtonProps) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const handleCopy = async () => {
    window.clearTimeout(timeoutRef.current);

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }

    timeoutRef.current = window.setTimeout(() => setStatus("idle"), 2000);
  };

  const feedback =
    status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : label;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      title={feedback}
      aria-label={feedback}
      id={id}
    >
      {status === "copied" ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
      ) : status === "failed" ? (
        <TriangleAlert className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
      ) : (
        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      {compact ? <span className="sr-only" aria-live="polite">{feedback}</span> : (
        <span className={status === "copied" ? "text-emerald-400 font-mono" : "font-mono"} aria-live="polite">
          {feedback}
        </span>
      )}
    </button>
  );
}
