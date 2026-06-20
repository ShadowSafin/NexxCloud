"use client";

import { useState, useCallback, useRef } from "react";

export interface DragItem {
  id: string;
  type: "file" | "folder";
  name: string;
}

interface DragState {
  isDragging: boolean;
  items: DragItem[];
  dragOverTarget: string | null;
}

/**
 * Hook for drag-and-drop file operations.
 * Handles dragging files/folders between folders.
 */
export function useDragAndDrop(onDrop: (items: DragItem[], targetFolderId: string | null) => void) {
  const [state, setState] = useState<DragState>({
    isDragging: false,
    items: [],
    dragOverTarget: null,
  });
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  const startDrag = useCallback((e: React.DragEvent, items: DragItem[]) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(items));

    // Create ghost image
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.style.cssText = `
      position: absolute;
      top: -1000px;
      background: #191919;
      border: 1px solid #212327;
      border-radius: 8px;
      padding: 8px 12px;
      color: #fff;
      font-size: 13px;
      font-family: Inter, sans-serif;
    `;
    ghost.textContent = items.length === 1 ? items[0].name : `${items.length} items`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);

    setState({ isDragging: true, items, dragOverTarget: null });
  }, []);

  const endDrag = useCallback(() => {
    setState({ isDragging: false, items: [], dragOverTarget: null });
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setState((prev) => ({ ...prev, dragOverTarget: targetId }));
  }, []);

  const onDragLeave = useCallback(() => {
    setState((prev) => ({ ...prev, dragOverTarget: null }));
  }, []);

  const onDropHandler = useCallback(
    (e: React.DragEvent, targetFolderId: string | null) => {
      e.preventDefault();
      try {
        const data = e.dataTransfer.getData("application/json");
        if (data) {
          const items: DragItem[] = JSON.parse(data);
          onDrop(items, targetFolderId);
        }
      } catch {}
      endDrag();
    },
    [onDrop, endDrag]
  );

  return {
    ...state,
    startDrag,
    endDrag,
    onDragOver,
    onDragLeave,
    onDrop: onDropHandler,
  };
}
