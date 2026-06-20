"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Hook for desktop-grade multi-select behavior.
 * Supports click, Ctrl+click (toggle), Shift+click (range).
 */
export function useMultiSelect<T extends { id: string }>(
  items: T[],
  onSelectionChange?: (selectedIds: Set<string>) => void
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      const isMod = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      setSelectedIds((prev) => {
        let next: Set<string>;

        if (isShift && lastClickedRef.current) {
          // Range select
          const lastIdx = items.findIndex((i) => i.id === lastClickedRef.current);
          const currentIdx = items.findIndex((i) => i.id === id);
          if (lastIdx !== -1 && currentIdx !== -1) {
            const start = Math.min(lastIdx, currentIdx);
            const end = Math.max(lastIdx, currentIdx);
            const rangeIds = items.slice(start, end + 1).map((i) => i.id);
            next = new Set([...Array.from(prev), ...rangeIds]);
          } else {
            next = new Set([id]);
          }
        } else if (isMod) {
          // Toggle single
          next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        } else {
          // Single select
          next = new Set([id]);
        }

        lastClickedRef.current = id;
        onSelectionChange?.(next);
        return next;
      });
    },
    [items, onSelectionChange]
  );

  const selectAll = useCallback(() => {
    const allIds = new Set(items.map((i) => i.id));
    setSelectedIds(allIds);
    onSelectionChange?.(allIds);
  }, [items, onSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    onSelectionChange?.(new Set());
  }, [onSelectionChange]);

  const toggleSelect = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        onSelectionChange?.(next);
        return next;
      });
    },
    [onSelectionChange]
  );

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return {
    selectedIds,
    handleClick,
    selectAll,
    clearSelection,
    toggleSelect,
    isSelected,
    selectedCount: selectedIds.size,
  };
}
