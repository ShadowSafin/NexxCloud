"use client";

import { useEffect } from "react";

export interface ShortcutMap {
  [key: string]: (e: KeyboardEvent) => void;
}

/**
 * Register global keyboard shortcuts.
 * Keys are in the format "mod+c", "shift+delete", "f2", etc.
 * "mod" maps to Cmd on Mac and Ctrl on Windows/Linux.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, deps: any[] = []) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        // Only allow Escape in inputs
        if (e.key !== "Escape") return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      const parts: string[] = [];

      if (isMod) parts.push("mod");
      if (e.shiftKey && e.key !== "Shift") parts.push("shift");
      if (e.altKey && e.key !== "Alt") parts.push("alt");

      const key = e.key.toLowerCase();
      if (!["shift", "control", "meta", "alt"].includes(key)) {
        parts.push(key);
      }

      const combo = parts.join("+");

      if (shortcuts[combo]) {
        e.preventDefault();
        e.stopPropagation();
        shortcuts[combo](e);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, deps);
}

/**
 * Format a shortcut string for display.
 * Converts "mod+c" to "⌘C" on Mac or "Ctrl+C" on other platforms.
 */
export function formatShortcut(shortcut: string): string {
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");

  return shortcut
    .split("+")
    .map((part) => {
      switch (part) {
        case "mod": return isMac ? "⌘" : "Ctrl";
        case "shift": return isMac ? "⇧" : "Shift";
        case "alt": return isMac ? "⌥" : "Alt";
        case "delete": return isMac ? "⌫" : "Del";
        case "enter": return "↵";
        case "escape": return "Esc";
        case " ": return "Space";
        default: return part.toUpperCase();
      }
    })
    .join(isMac ? "" : "+");
}
