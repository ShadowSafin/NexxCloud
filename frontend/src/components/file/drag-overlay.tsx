"use client";

import { useState, useEffect } from "react";
import { FileItem, useFileStore, FolderItem } from "@/store/fileStore";
import { cn, formatFileSize } from "@/lib/utils";
import { File, Folder, Copy, Move } from "lucide-react";

interface DragOverlayProps {
  isDragging: boolean;
  dragItems: { id: string; type: "file" | "folder"; name: string }[];
  isDraggingOver: boolean;
  targetFolderId: string | null;
  dragOperation: "copy" | "move" | null;
}

export function DragOverlay({
  isDragging,
  dragItems,
  isDraggingOver,
  targetFolderId,
  dragOperation
}: DragOverlayProps) {
  const store = useFileStore();
  
  if (!isDragging) return null;

  const count = dragItems.length;
  const isSingle = count === 1;
  const itemName = isSingle ? dragItems[0].name : `${count} items`;

  return (
    <>
      {/* Dragging preview - follows cursor */}
      <div className="fixed pointer-events-none z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="bg-canvas-card border border-accent-sunset shadow-xl rounded-sm px-4 py-3 flex items-center gap-3 min-w-[200px]">
          {dragOperation === "copy" ? (
            <Copy className="w-5 h-5 text-accent-sunset" />
          ) : dragOperation === "move" ? (
            <Move className="w-5 h-5 text-accent-sunset" />
          ) : dragItems[0]?.type === "folder" ? (
            <Folder className="w-5 h-5 text-accent-sunset" />
          ) : (
            <File className="w-5 h-5 text-accent-sunset" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ink truncate font-medium">{itemName}</p>
            <p className="text-xs text-body-mid">
              {dragOperation === "copy" ? "Copying..." : dragOperation === "move" ? "Moving..." : "Dragging..."}
            </p>
          </div>
        </div>
      </div>

      {/* Drop target highlight */}
      {isDraggingOver && (
        <div className="fixed inset-0 bg-accent-sunset/5 pointer-events-none z-40">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-canvas-card border-2 border-dashed border-accent-sunset rounded-lg p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-sunset/10 flex items-center justify-center">
                {dragOperation === "copy" ? (
                  <Copy className="w-8 h-8 text-accent-sunset" />
                ) : (
                  <Move className="w-8 h-8 text-accent-sunset" />
                )}
              </div>
              <p className="text-lg text-ink font-medium">
                {dragOperation === "copy" ? "Copy to here" : "Move to here"}
              </p>
              <p className="text-sm text-body-mid mt-1">
                {isSingle ? dragItems[0].name : `${count} items`}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook to manage drag state
export function useDragAndDrop() {
  const store = useFileStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragItems, setDragItems] = useState<{ id: string; type: "file" | "folder"; name: string }[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [dragOperation, setDragOperation] = useState<"copy" | "move" | null>(null);

  const handleDragStart = (e: React.DragEvent, items: { id: string; type: "file" | "folder"; name: string }[]) => {
    setDragItems(items);
    setIsDragging(true);
    setDragOperation(e.ctrlKey || e.metaKey ? "copy" : "move");
    e.dataTransfer.effectAllowed = e.ctrlKey || e.metaKey ? "copy" : "move";
    e.dataTransfer.setData("application/json", JSON.stringify(items));
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setIsDraggingOver(true);
    setTargetFolderId(folderId);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
    setTargetFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    setIsDragging(false);
    setIsDraggingOver(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      // Handle the actual move/copy through the store/API
      // This would be implemented in the parent component
    } catch {}
    
    setDragItems([]);
    setTargetFolderId(null);
    setDragOperation(null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsDraggingOver(false);
    setDragItems([]);
    setTargetFolderId(null);
    setDragOperation(null);
  };

  return {
    isDragging,
    dragItems,
    isDraggingOver,
    targetFolderId,
    dragOperation,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}