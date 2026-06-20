"use client";

import { useEffect, useCallback } from "react";

interface KeyboardShortcutHandlers {
  onDelete?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onSelectAll?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "Delete" && handlers.onDelete) {
        e.preventDefault();
        handlers.onDelete();
      }
      if (e.key === "Enter" && handlers.onEnter) {
        e.preventDefault();
        handlers.onEnter();
      }
      if (e.key === "Escape" && handlers.onEscape) {
        e.preventDefault();
        handlers.onEscape();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "a" && handlers.onSelectAll) {
        e.preventDefault();
        handlers.onSelectAll();
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
